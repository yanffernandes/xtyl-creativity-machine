import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PageSpeedRepository } from "./pagespeed.repository";
import { PageSpeedQuota } from "./pagespeed.quota";
import type {
  PageSpeedApiResponse,
  PageSpeedCheckResult,
  PageSpeedHistoryRecord,
} from "./types/pagespeed-api.types";

const PAGESPEED_API_URL =
  "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed";

@Injectable()
export class PageSpeedService {
  private readonly logger = new Logger(PageSpeedService.name);

  constructor(
    private readonly repo: PageSpeedRepository,
    private readonly quota: PageSpeedQuota,
    private readonly configService: ConfigService,
  ) {}

  private getApiKey(): string | undefined {
    return this.configService.get<string>("PAGESPEED_API_KEY");
  }

  private normalizeUrl(domain: string): string {
    let url = domain.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    // Remove trailing slash
    return url.replace(/\/$/, "");
  }

  private scoreToPercent(score: number | null | undefined): number | null {
    if (score === null || score === undefined) return null;
    return Math.round(score * 100);
  }

  private mapAssessment(category: string | undefined): string | null {
    if (!category) return null;
    switch (category) {
      case "FAST":
        return "good";
      case "AVERAGE":
        return "needs_improvement";
      case "SLOW":
        return "poor";
      default:
        return category.toLowerCase();
    }
  }

  async checkPageSpeed(params: {
    projectId: number;
    workspaceId: string;
    domain: string;
    strategy: "mobile" | "desktop";
    forceCheck?: boolean;
  }): Promise<PageSpeedCheckResult> {
    const { projectId, workspaceId, domain, strategy, forceCheck } = params;

    // Check if recently checked (within last 6 hours)
    if (!forceCheck) {
      const latest = await this.repo.getLatestByProject(projectId, strategy);
      if (latest?.checked_at) {
        const lastCheck = new Date(latest.checked_at).getTime();
        const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
        if (lastCheck > sixHoursAgo) {
          this.logger.debug(
            `Skipping ${domain} (${strategy}) - checked ${((Date.now() - lastCheck) / 3600000).toFixed(1)}h ago`,
          );
          return this.mapHistoryToResult(latest, projectId);
        }
      }
    }

    // Check quota
    const today = new Date().toISOString().slice(0, 10);
    const canProceed = await this.quota.checkAndIncrement(workspaceId, today);
    if (!canProceed) {
      throw new BadRequestException("PAGESPEED_QUOTA_EXCEEDED");
    }

    const url = this.normalizeUrl(domain);
    const apiKey = this.getApiKey();

    const searchParams = new URLSearchParams({
      url,
      strategy,
    });

    // Add categories
    searchParams.append("category", "performance");
    searchParams.append("category", "accessibility");
    searchParams.append("category", "best-practices");
    searchParams.append("category", "seo");

    if (apiKey) {
      searchParams.set("key", apiKey);
    }

    const apiUrl = `${PAGESPEED_API_URL}?${searchParams.toString()}`;

    try {
      this.logger.log(`Checking PageSpeed for ${url} (${strategy})`);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg =
          errorData.error?.message || `API error: ${response.status}`;

        this.logger.warn(`PageSpeed API error for ${url}: ${errorMsg}`);

        await this.repo.updateProjectError(projectId, errorMsg);
        await this.repo.insertHistory({
          project_id: projectId,
          workspace_id: workspaceId,
          checked_at: new Date().toISOString(),
          strategy,
          url_checked: url,
          performance_score: null,
          accessibility_score: null,
          best_practices_score: null,
          seo_score: null,
          lcp_ms: null,
          fid_ms: null,
          cls: null,
          fcp_ms: null,
          ttfb_ms: null,
          si_ms: null,
          tbt_ms: null,
          lcp_assessment: null,
          fid_assessment: null,
          cls_assessment: null,
          raw_response: null,
          error_message: errorMsg,
        });

        return this.createErrorResult(projectId, strategy, url, errorMsg);
      }

      const data: PageSpeedApiResponse = await response.json();
      const result = this.parseApiResponse(data, projectId, strategy, url);

      // Save to history
      await this.repo.insertHistory({
        project_id: projectId,
        workspace_id: workspaceId,
        checked_at: new Date().toISOString(),
        strategy,
        url_checked: url,
        performance_score: result.performanceScore,
        accessibility_score: result.accessibilityScore,
        best_practices_score: result.bestPracticesScore,
        seo_score: result.seoScore,
        lcp_ms: result.lcpMs,
        fid_ms: result.fidMs,
        cls: result.cls,
        fcp_ms: result.fcpMs,
        ttfb_ms: result.ttfbMs,
        si_ms: result.siMs,
        tbt_ms: result.tbtMs,
        lcp_assessment: result.lcpAssessment,
        fid_assessment: result.fidAssessment,
        cls_assessment: result.clsAssessment,
        raw_response: data as unknown as Record<string, unknown>,
        error_message: null,
      });

      this.logger.log(
        `PageSpeed check complete for ${url} (${strategy}): performance=${result.performanceScore}`,
      );

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`PageSpeed check failed for ${url}: ${errorMsg}`);

      await this.repo.updateProjectError(projectId, errorMsg);

      return this.createErrorResult(projectId, strategy, url, errorMsg);
    }
  }

  private parseApiResponse(
    data: PageSpeedApiResponse,
    projectId: number,
    strategy: "mobile" | "desktop",
    url: string,
  ): PageSpeedCheckResult {
    const { lighthouseResult, loadingExperience } = data;
    const { categories, audits } = lighthouseResult;

    return {
      projectId,
      strategy,
      urlChecked: url,
      performanceScore: this.scoreToPercent(categories.performance?.score),
      accessibilityScore: this.scoreToPercent(categories.accessibility?.score),
      bestPracticesScore: this.scoreToPercent(
        categories["best-practices"]?.score,
      ),
      seoScore: this.scoreToPercent(categories.seo?.score),
      lcpMs: audits["largest-contentful-paint"]?.numericValue
        ? Math.round(audits["largest-contentful-paint"].numericValue)
        : null,
      fidMs:
        loadingExperience?.metrics?.FIRST_INPUT_DELAY_MS?.percentile ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      fcpMs: audits["first-contentful-paint"]?.numericValue
        ? Math.round(audits["first-contentful-paint"].numericValue)
        : null,
      ttfbMs: audits["server-response-time"]?.numericValue
        ? Math.round(audits["server-response-time"].numericValue)
        : null,
      siMs: audits["speed-index"]?.numericValue
        ? Math.round(audits["speed-index"].numericValue)
        : null,
      tbtMs: audits["total-blocking-time"]?.numericValue
        ? Math.round(audits["total-blocking-time"].numericValue)
        : null,
      lcpAssessment: this.mapAssessment(
        loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.category,
      ),
      fidAssessment: this.mapAssessment(
        loadingExperience?.metrics?.FIRST_INPUT_DELAY_MS?.category,
      ),
      clsAssessment: this.mapAssessment(
        loadingExperience?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category,
      ),
    };
  }

  private mapHistoryToResult(
    history: PageSpeedHistoryRecord,
    projectId: number,
  ): PageSpeedCheckResult {
    return {
      projectId,
      strategy: history.strategy,
      urlChecked: history.url_checked,
      performanceScore: history.performance_score,
      accessibilityScore: history.accessibility_score,
      bestPracticesScore: history.best_practices_score,
      seoScore: history.seo_score,
      lcpMs: history.lcp_ms,
      fidMs: history.fid_ms,
      cls: history.cls,
      fcpMs: history.fcp_ms,
      ttfbMs: history.ttfb_ms,
      siMs: history.si_ms,
      tbtMs: history.tbt_ms,
      lcpAssessment: history.lcp_assessment,
      fidAssessment: history.fid_assessment,
      clsAssessment: history.cls_assessment,
    };
  }

  private createErrorResult(
    projectId: number,
    strategy: "mobile" | "desktop",
    url: string,
    error: string,
  ): PageSpeedCheckResult {
    return {
      projectId,
      strategy,
      urlChecked: url,
      performanceScore: null,
      accessibilityScore: null,
      bestPracticesScore: null,
      seoScore: null,
      lcpMs: null,
      fidMs: null,
      cls: null,
      fcpMs: null,
      ttfbMs: null,
      siMs: null,
      tbtMs: null,
      lcpAssessment: null,
      fidAssessment: null,
      clsAssessment: null,
      error,
    };
  }

  async checkBothStrategies(params: {
    projectId: number;
    workspaceId: string;
    domain: string;
    forceCheck?: boolean;
  }): Promise<{ mobile: PageSpeedCheckResult; desktop: PageSpeedCheckResult }> {
    const [mobile, desktop] = await Promise.all([
      this.checkPageSpeed({ ...params, strategy: "mobile" }),
      this.checkPageSpeed({ ...params, strategy: "desktop" }),
    ]);

    // Update project summary scores
    await this.repo.updateProjectScores(
      params.projectId,
      mobile.performanceScore,
      desktop.performanceScore,
    );

    return { mobile, desktop };
  }

  /**
   * Check PageSpeed for a URL without saving to history.
   * Used for on-demand article speed tests.
   */
  async checkUrlOnly(params: { url: string; workspaceId: string }): Promise<{
    mobile: Omit<PageSpeedCheckResult, "projectId">;
    desktop: Omit<PageSpeedCheckResult, "projectId">;
  }> {
    const { url, workspaceId } = params;

    // Check quota (still need to track API usage)
    const today = new Date().toISOString().slice(0, 10);

    // We need 2 requests (mobile + desktop)
    const canProceedFirst = await this.quota.checkAndIncrement(
      workspaceId,
      today,
    );
    if (!canProceedFirst) {
      throw new BadRequestException("PAGESPEED_QUOTA_EXCEEDED");
    }

    const canProceedSecond = await this.quota.checkAndIncrement(
      workspaceId,
      today,
    );
    if (!canProceedSecond) {
      throw new BadRequestException("PAGESPEED_QUOTA_EXCEEDED");
    }

    const normalizedUrl = this.normalizeUrl(url);
    const apiKey = this.getApiKey();

    const checkStrategy = async (
      strategy: "mobile" | "desktop",
    ): Promise<Omit<PageSpeedCheckResult, "projectId">> => {
      const searchParams = new URLSearchParams({
        url: normalizedUrl,
        strategy,
      });

      searchParams.append("category", "performance");
      searchParams.append("category", "accessibility");
      searchParams.append("category", "best-practices");
      searchParams.append("category", "seo");

      if (apiKey) {
        searchParams.set("key", apiKey);
      }

      const apiUrl = `${PAGESPEED_API_URL}?${searchParams.toString()}`;

      try {
        this.logger.log(
          `Checking PageSpeed (URL only) for ${normalizedUrl} (${strategy})`,
        );

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg =
            errorData.error?.message || `API error: ${response.status}`;

          this.logger.warn(
            `PageSpeed API error for ${normalizedUrl}: ${errorMsg}`,
          );

          return {
            strategy,
            urlChecked: normalizedUrl,
            performanceScore: null,
            accessibilityScore: null,
            bestPracticesScore: null,
            seoScore: null,
            lcpMs: null,
            fidMs: null,
            cls: null,
            fcpMs: null,
            ttfbMs: null,
            siMs: null,
            tbtMs: null,
            lcpAssessment: null,
            fidAssessment: null,
            clsAssessment: null,
            error: errorMsg,
          };
        }

        const data: PageSpeedApiResponse = await response.json();
        const { lighthouseResult, loadingExperience } = data;
        const { categories, audits } = lighthouseResult;

        this.logger.log(
          `PageSpeed check (URL only) complete for ${normalizedUrl} (${strategy}): performance=${this.scoreToPercent(categories.performance?.score)}`,
        );

        return {
          strategy,
          urlChecked: normalizedUrl,
          performanceScore: this.scoreToPercent(categories.performance?.score),
          accessibilityScore: this.scoreToPercent(
            categories.accessibility?.score,
          ),
          bestPracticesScore: this.scoreToPercent(
            categories["best-practices"]?.score,
          ),
          seoScore: this.scoreToPercent(categories.seo?.score),
          lcpMs: audits["largest-contentful-paint"]?.numericValue
            ? Math.round(audits["largest-contentful-paint"].numericValue)
            : null,
          fidMs:
            loadingExperience?.metrics?.FIRST_INPUT_DELAY_MS?.percentile ??
            null,
          cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
          fcpMs: audits["first-contentful-paint"]?.numericValue
            ? Math.round(audits["first-contentful-paint"].numericValue)
            : null,
          ttfbMs: audits["server-response-time"]?.numericValue
            ? Math.round(audits["server-response-time"].numericValue)
            : null,
          siMs: audits["speed-index"]?.numericValue
            ? Math.round(audits["speed-index"].numericValue)
            : null,
          tbtMs: audits["total-blocking-time"]?.numericValue
            ? Math.round(audits["total-blocking-time"].numericValue)
            : null,
          lcpAssessment: this.mapAssessment(
            loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.category,
          ),
          fidAssessment: this.mapAssessment(
            loadingExperience?.metrics?.FIRST_INPUT_DELAY_MS?.category,
          ),
          clsAssessment: this.mapAssessment(
            loadingExperience?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category,
          ),
        };
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.error(
          `PageSpeed check (URL only) failed for ${normalizedUrl}: ${errorMsg}`,
        );

        return {
          strategy,
          urlChecked: normalizedUrl,
          performanceScore: null,
          accessibilityScore: null,
          bestPracticesScore: null,
          seoScore: null,
          lcpMs: null,
          fidMs: null,
          cls: null,
          fcpMs: null,
          ttfbMs: null,
          siMs: null,
          tbtMs: null,
          lcpAssessment: null,
          fidAssessment: null,
          clsAssessment: null,
          error: errorMsg,
        };
      }
    };

    const [mobile, desktop] = await Promise.all([
      checkStrategy("mobile"),
      checkStrategy("desktop"),
    ]);

    return { mobile, desktop };
  }

  async getHistory(
    projectId: number,
    options?: {
      strategy?: "mobile" | "desktop";
      limit?: number;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<PageSpeedHistoryRecord[]> {
    return this.repo.getHistoryByProject(projectId, options || {});
  }

  async getLatest(
    projectId: number,
    strategy?: "mobile" | "desktop",
  ): Promise<PageSpeedHistoryRecord | null> {
    return this.repo.getLatestByProject(projectId, strategy);
  }
}
