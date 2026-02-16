import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SearchConsoleOAuthService } from "./services/search-console-oauth.service";
import { SearchConsoleRepository } from "./search-console.repository";
import { SearchConsoleQuota } from "./search-console.quota";
import { SearchConsoleLogger } from "./search-console.logger";
import { SearchConsoleErrorCodes } from "./search-console.errors";
import { getSearchConsoleConfig } from "../../config/search-console.config";

const SEARCH_CONSOLE_INSPECTION_URL =
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const INDEXING_API_URL =
  "https://indexing.googleapis.com/v3/urlNotifications:publish";

@Injectable()
export class SearchConsoleService {
  private readonly logger = new Logger(SearchConsoleService.name);

  constructor(
    private readonly oauthService: SearchConsoleOAuthService,
    private readonly repo: SearchConsoleRepository,
    private readonly quota: SearchConsoleQuota,
    private readonly logService: SearchConsoleLogger,
    private readonly configService: ConfigService,
  ) {}

  private getConfig() {
    return getSearchConsoleConfig(this.configService);
  }

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private async getValidConnection(connectionId: string, userId: string) {
    return this.oauthService.getConnectionWithValidToken(connectionId, userId);
  }

  private async resolveSiteUrl(
    connection: any,
    url: string,
    propertyId?: string,
  ): Promise<string | null> {
    if (propertyId) {
      const property = await this.repo.getPropertyById(propertyId);
      return property?.site_url || null;
    }

    const metadataSites = (connection?.metadata?.sites || [])
      .map((site: any) => site?.siteUrl)
      .filter(Boolean);

    const dbSites = await this.repo.listPropertiesByConnection(connection.id);
    const activeDbSites = dbSites.filter((site) => site.is_active);

    const siteUrls = [
      ...metadataSites,
      ...activeDbSites.map((site) => site.site_url),
      ...dbSites.map((site) => site.site_url),
    ].filter(Boolean);

    const uniqueSites = Array.from(new Set(siteUrls));
    return this.matchSiteUrl(url, uniqueSites);
  }

  private matchSiteUrl(url: string, siteUrls: string[]): string | null {
    if (!siteUrls.length) return null;

    const parsed = this.safeParseUrl(url);
    const hostname = parsed?.hostname || "";

    const ordered = [...siteUrls].sort((a, b) => b.length - a.length);
    for (const siteUrl of ordered) {
      if (siteUrl.startsWith("sc-domain:")) {
        const domain = siteUrl.replace("sc-domain:", "").toLowerCase();
        if (hostname === domain || hostname.endsWith(`.${domain}`)) {
          return siteUrl;
        }
        continue;
      }

      if (url.startsWith(siteUrl)) return siteUrl;
    }

    return null;
  }

  private safeParseUrl(url: string): URL | null {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  }

  async inspectUrl(params: {
    userId: string;
    workspaceId: string;
    connectionId: string;
    url: string;
    propertyId?: string;
    forceRefresh?: boolean;
    correlationId?: string;
  }) {
    const { userId, workspaceId, connectionId, url, propertyId, forceRefresh } =
      params;
    const cached = await this.repo.getStatusByUrl(workspaceId, url);
    if (cached && cached.last_inspected_at && !forceRefresh) {
      const last = new Date(cached.last_inspected_at).getTime();
      if (Date.now() - last < 24 * 60 * 60 * 1000) {
        return cached;
      }
    }

    const connection = await this.getValidConnection(connectionId, userId);
    const siteUrl = await this.resolveSiteUrl(connection, url, propertyId);
    if (!siteUrl) {
      throw new BadRequestException(
        SearchConsoleErrorCodes.PROPERTY_NOT_VERIFIED,
      );
    }

    const config = this.getConfig();
    const date = this.getTodayDate();
    const quota = await this.quota.getOrCreateDailyQuota(connectionId, date, {
      publishQuota: config.indexingQuotaDaily,
      inspectionQuota: config.inspectionQuotaDaily,
    });
    if ((quota.inspection_quota_used || 0) >= quota.inspection_quota_limit) {
      throw new BadRequestException(SearchConsoleErrorCodes.QUOTA_EXCEEDED);
    }

    const response = await fetch(SEARCH_CONSOLE_INSPECTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inspectionUrl: url, siteUrl }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      await this.logService.log(
        connectionId,
        "inspect",
        "error",
        "Inspect failed",
        {
          correlationId: params.correlationId,
          payload,
        },
      );
      throw new BadRequestException(
        payload.error?.message || "inspection_failed",
      );
    }

    await this.quota.incrementInspection(connectionId, date, 1);

    const verdict =
      payload?.inspectionResult?.indexStatusResult?.verdict?.toLowerCase() ||
      "unknown";

    const nowIso = new Date().toISOString();
    const isIndexed = verdict === "pass" || verdict === "indexed";
    const indexedAt =
      isIndexed && !cached?.indexed_at ? nowIso : cached?.indexed_at || null;

    const result = await this.repo.upsertStatus({
      workspace_id: workspaceId,
      connection_id: connectionId,
      url,
      property_id: propertyId || null,
      verdict,
      coverage_state:
        payload?.inspectionResult?.indexStatusResult?.coverageState || null,
      last_inspected_at: nowIso,
      last_inspection_result: payload,
      indexed_at: indexedAt,
      updated_at: nowIso,
    });

    await this.logService.log(
      connectionId,
      "inspect",
      "success",
      "Inspect ok",
      {
        correlationId: params.correlationId,
      },
    );
    return result;
  }

  async inspectUrlsBatch(params: {
    userId: string;
    workspaceId: string;
    connectionId: string;
    urls: string[];
    propertyId?: string;
    forceRefresh?: boolean;
    correlationId?: string;
  }) {
    const concurrency = 10;
    const results: Record<string, any> = {};
    let index = 0;

    const workers = Array.from({
      length: Math.min(concurrency, params.urls.length),
    }).map(async () => {
      while (index < params.urls.length) {
        const currentIndex = index++;
        const url = params.urls[currentIndex];
        try {
          results[url] = await this.inspectUrl({
            ...params,
            url,
          });
        } catch (error) {
          results[url] = {
            verdict: "error",
            last_error: error?.message || "error",
          };
        }
      }
    });

    await Promise.all(workers);
    return results;
  }

  async requestIndexing(params: {
    userId: string;
    workspaceId: string;
    connectionId: string;
    url: string;
    articleId?: number;
    requestType?: "URL_UPDATED" | "URL_DELETED";
    correlationId?: string;
  }) {
    const { userId, workspaceId, connectionId, url, articleId, requestType } =
      params;
    await this.getValidConnection(connectionId, userId);

    const config = this.getConfig();
    const date = this.getTodayDate();
    const quota = await this.quota.getOrCreateDailyQuota(connectionId, date, {
      publishQuota: config.indexingQuotaDaily,
      inspectionQuota: config.inspectionQuotaDaily,
    });
    if ((quota.publish_quota_used || 0) >= quota.publish_quota_limit) {
      return this.repo.createIndexingRequest({
        connection_id: connectionId,
        workspace_id: workspaceId,
        article_id: articleId,
        url,
        request_type: requestType || "URL_UPDATED",
        status: "blocked",
        blocked_reason: SearchConsoleErrorCodes.QUOTA_EXCEEDED,
        requested_at: new Date().toISOString(),
      });
    }

    const duplicate = await this.repo.hasDuplicateRequest(
      connectionId,
      url,
      date,
    );
    if (duplicate) {
      return this.repo.createIndexingRequest({
        connection_id: connectionId,
        workspace_id: workspaceId,
        article_id: articleId,
        url,
        request_type: requestType || "URL_UPDATED",
        status: "blocked",
        blocked_reason: "duplicate_request",
        requested_at: new Date().toISOString(),
      });
    }

    const request = await this.repo.createIndexingRequest({
      connection_id: connectionId,
      workspace_id: workspaceId,
      article_id: articleId || null,
      url,
      request_type: requestType || "URL_UPDATED",
      status: "queued",
      requested_at: new Date().toISOString(),
    });

    await this.updateSubmissionStatus({
      workspaceId,
      connectionId,
      url,
      articleId,
    });

    setTimeout(() => {
      this.processQueue(connectionId, userId, params.correlationId).catch(
        (error) =>
          this.logger.warn(
            `Queue processing failed: ${error?.message || error}`,
          ),
      );
    }, 0);

    return request;
  }

  async requestIndexingBatch(params: {
    userId: string;
    workspaceId: string;
    connectionId: string;
    items: Array<{ url: string; articleId?: number }>;
    correlationId?: string;
  }) {
    const { userId, workspaceId, connectionId, items } = params;
    const results = [];
    for (const item of items) {
      results.push(
        await this.requestIndexing({
          userId,
          workspaceId,
          connectionId,
          url: item.url,
          articleId: item.articleId,
          correlationId: params.correlationId,
        }),
      );
    }
    return results;
  }

  async processQueue(
    connectionId: string,
    userId: string,
    correlationId?: string,
  ) {
    const connection = await this.getValidConnection(connectionId, userId);
    const queued = await this.repo.listQueuedRequests(connectionId, 50);
    if (!queued.length) return [];

    const config = this.getConfig();
    const date = this.getTodayDate();
    const quota = await this.quota.getOrCreateDailyQuota(connectionId, date, {
      publishQuota: config.indexingQuotaDaily,
      inspectionQuota: config.inspectionQuotaDaily,
    });

    const processed = [];
    for (const req of queued) {
      if ((quota.publish_quota_used || 0) >= quota.publish_quota_limit) {
        await this.repo.updateIndexingRequest(req.id, {
          status: "blocked",
          blocked_reason: SearchConsoleErrorCodes.QUOTA_EXCEEDED,
          processed_at: new Date().toISOString(),
        });
        continue;
      }

      const response = await fetch(INDEXING_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: req.url,
          type: req.request_type || "URL_UPDATED",
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        await this.repo.updateIndexingRequest(req.id, {
          status: "failed",
          response_payload: payload,
          processed_at: new Date().toISOString(),
        });
        await this.logService.log(
          connectionId,
          "index",
          "error",
          "Indexing failed",
          {
            correlationId,
            payload,
          },
        );
        continue;
      }

      await this.quota.incrementPublish(connectionId, date, 1);
      await this.repo.updateIndexingRequest(req.id, {
        status: "succeeded",
        response_payload: payload,
        processed_at: new Date().toISOString(),
      });
      await this.logService.log(connectionId, "index", "success", "Indexed", {
        correlationId,
      });
      processed.push(req.id);
    }

    return processed;
  }

  async getQuota(connectionId: string) {
    const date = this.getTodayDate();
    const config = this.getConfig();
    return this.quota.getOrCreateDailyQuota(connectionId, date, {
      publishQuota: config.indexingQuotaDaily,
      inspectionQuota: config.inspectionQuotaDaily,
    });
  }

  async autoRun(connectionId: string, userId: string, workspaceId: string) {
    const statuses = await this.repo.listNonIndexedStatus(
      workspaceId,
      50,
      connectionId,
    );
    if (!statuses.length) return { queued: 0 };

    const items = statuses.map((status) => ({
      url: status.url,
      articleId: status.article_id || undefined,
    }));

    await this.requestIndexingBatch({
      userId,
      workspaceId,
      connectionId,
      items,
    });

    return { queued: items.length };
  }

  private async updateSubmissionStatus(params: {
    workspaceId: string;
    connectionId: string;
    url: string;
    articleId?: number;
  }) {
    const nowIso = new Date().toISOString();
    const existing = await this.repo.getStatusByUrl(
      params.workspaceId,
      params.url,
    );

    let projectId: string | null = existing?.project_id || null;
    if (params.articleId) {
      const article = await this.repo.getArticleById(params.articleId);
      projectId = article?.project_id || projectId;
    }

    const nextSubmissionCount = (existing?.submission_count || 0) + 1;
    const shouldUpdateVerdict =
      !existing || !["pass", "indexed"].includes(existing.verdict);

    const payload: Record<string, unknown> = {
      workspace_id: params.workspaceId,
      connection_id: params.connectionId,
      project_id: projectId,
      article_id: params.articleId || existing?.article_id || null,
      url: params.url,
      last_submitted_at: nowIso,
      first_submitted_at: existing?.first_submitted_at || nowIso,
      submission_count: nextSubmissionCount,
      source: existing?.source || "manual",
      updated_at: nowIso,
    };

    if (shouldUpdateVerdict) {
      payload.verdict = "pending";
    }

    if (existing) {
      return this.repo.updateStatusByUrl(
        params.workspaceId,
        params.url,
        payload,
      );
    }

    return this.repo.insertStatus({
      ...payload,
      verdict: payload.verdict || "pending",
      created_at: nowIso,
    });
  }
}
