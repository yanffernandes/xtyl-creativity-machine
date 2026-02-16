import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  Inject,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { AdManagerOAuthService } from "./ad-manager-oauth.service";
import {
  SiteAnalysisRequestDto,
  SiteAnalysisResponseDto,
  SiteData,
  MetricsData,
  ConsolidatedMetricsRequestDto,
  ConsolidatedMetricsResponseDto,
  ConsolidatedMetricsData,
  LandUriMetrics,
  GroupByOption,
  SummaryRequestDto,
  SummaryResponseDto,
  SummaryMetrics,
} from "../dto/site-analysis.dto";
import {
  ExpandRequestDto,
  DateData,
  UriData,
  HierarchicalExpandRequestDto,
  HierarchicalExpandResponseDto,
  HierarchicalItem,
} from "../dto/expand.dto";
import { SubGroupByOption } from "../dto/site-analysis.dto";
import { RevenueCacheService } from "../../../common/cache";

interface RawReportRow {
  TOP_PRIVATE_DOMAIN?: string; // Domain dimension - top private domain (e.g., example.com)
  KEY_VALUES_NAME?: string; // Key-value dimension (e.g., land_uri=/path)
  DATE?: string;
  COUNTRY_NAME?: string; // Country name (e.g., "Brazil", "United States")
  COUNTRY_CODE?: string; // Country code (e.g., "BR", "US")
  // Ad Exchange metrics (most commonly available)
  AD_EXCHANGE_IMPRESSIONS?: number;
  AD_EXCHANGE_CLICKS?: number;
  AD_EXCHANGE_REVENUE?: number; // In micros
  // Additional Ad Exchange metrics
  AD_EXCHANGE_TOTAL_REQUESTS?: number;
  AD_EXCHANGE_RESPONSES_SERVED?: number;
  AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS?: number;
  AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS?: number;
}

interface ReportDefinition {
  reportDefinition: {
    dimensions: string[];
    metrics: string[];
    dateRange: {
      fixed?: {
        startDate: { year: number; month: number; day: number };
        endDate: { year: number; month: number; day: number };
      };
    };
    reportType: string;
  };
}

interface FetchRowsResponse {
  rows?: Array<{
    dimensionValues: Array<{
      stringValue?: string;
      intValue?: string;
      value?: string; // Legacy fallback
    }>;
    metricValueGroups: Array<{
      primaryValues: Array<{
        intValue?: string;
        doubleValue?: number;
        integerValue?: string; // Legacy fallback
        micros?: string; // Legacy fallback
      }>;
    }>;
  }>;
  totalRowCount?: number;
  nextPageToken?: string;
}

@Injectable()
export class AdManagerReportService {
  private readonly logger = new Logger(AdManagerReportService.name);

  // Ad Manager API Base URL
  private readonly AD_MANAGER_API_BASE = "https://admanager.googleapis.com/v1";

  constructor(
    private readonly oauthService: AdManagerOAuthService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly revenueCacheService: RevenueCacheService,
  ) {}

  /**
   * Extract slug (path without query params) from a key-value or URL
   * Handles formats like:
   * - "land_uri=/path?param=value" -> "/path"
   * - "/path?param=value" -> "/path"
   * - "https://example.com/path?param=value" -> "/path"
   */
  private extractSlug(keyValueOrUrl: string): string {
    let path = keyValueOrUrl;

    // Handle key-value format (land_uri=/path)
    if (path.includes("=")) {
      const parts = path.split("=");
      path = parts.slice(1).join("="); // Get everything after first =
    }

    // Handle full URL format
    if (path.startsWith("http://") || path.startsWith("https://")) {
      try {
        const url = new URL(path);
        path = url.pathname;
      } catch {
        // If URL parsing fails, continue with original path
      }
    }

    // Remove query params
    const queryIndex = path.indexOf("?");
    if (queryIndex !== -1) {
      path = path.substring(0, queryIndex);
    }

    // Remove fragment
    const hashIndex = path.indexOf("#");
    if (hashIndex !== -1) {
      path = path.substring(0, hashIndex);
    }

    return path || "/";
  }

  /**
   * Generate cache key for site analysis
   */
  private getCacheKey(
    connectionId: string,
    networkId: string,
    startDate: string,
    endDate: string,
    groupBy: string,
  ): string {
    return `ad-manager:site-analysis:${connectionId}:${networkId}:${startDate}:${endDate}:${groupBy}`;
  }

  /**
   * Generate cache key for expand data
   */
  private getExpandCacheKey(
    connectionId: string,
    networkId: string,
    site: string,
    startDate: string,
    endDate: string,
    level: string,
    parentDate?: string,
  ): string {
    const dateKey = parentDate ? `:${parentDate}` : "";
    return `ad-manager:expand:${connectionId}:${networkId}:${site}:${startDate}:${endDate}:${level}${dateKey}`;
  }

  /**
   * Calculate derived metrics
   * Simplified to only essential metrics used in the frontend UI
   */
  private calculateMetrics(
    revenue: number,
    impressions: number,
    clicks: number,
  ): MetricsData {
    return {
      revenue: revenue / 1000000, // Convert from micros
      rps: 0, // Not used in frontend - removed TOTAL_REQUESTS metric
      ecpm: impressions > 0 ? (revenue / 1000000 / impressions) * 1000 : 0,
      pmr: 0, // Not used in frontend - removed TOTAL_REQUESTS metric
      viewability: 0, // Not used in frontend - removed VIEWABLE/MEASURABLE metrics
      cpc: clicks > 0 ? revenue / 1000000 / clicks : 0,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      clicks,
      impressions,
      requests: 0, // Not used in frontend
      fillRate: 0, // Not used in frontend
      viewableImpressions: 0,
      measurableImpressions: 0,
      unfilledImpressions: 0,
    };
  }

  /**
   * Fetch site analysis data
   */
  async getSiteAnalysis(
    dto: SiteAnalysisRequestDto,
    userId: string,
  ): Promise<SiteAnalysisResponseDto> {
    const {
      connectionId,
      networkId,
      startDate,
      endDate,
      groupBy = "domain",
      forceRefresh,
    } = dto;

    // Check cache first
    const cacheKey = this.getCacheKey(
      connectionId,
      networkId,
      startDate,
      endDate,
      groupBy,
    );

    if (!forceRefresh) {
      const cached =
        await this.cacheManager.get<SiteAnalysisResponseDto>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for ${cacheKey}`);
        return cached;
      }
    }

    // Get connection with valid token
    const connection = await this.oauthService.getConnectionWithValidToken(
      connectionId,
      userId,
    );
    const accessToken = connection.access_token;
    const networks = connection.metadata?.networks || [];
    const network = networks.find((n: { id: string }) => n.id === networkId);
    const currencyCode = network?.currencyCode || "USD";

    // Build and execute report
    const reportData = await this.runReport(
      accessToken,
      networkId,
      startDate,
      endDate,
      groupBy,
    );

    // Process report data based on groupBy option
    const siteMetrics = this.processSiteData(reportData, groupBy);

    // Apply sorting
    const sortBy = dto.sortBy || "revenue";
    const sortOrder = dto.sortOrder || "desc";
    siteMetrics.sort((a, b) => {
      const aVal = sortBy === "site" ? a.site : (a.metrics as any)[sortBy] || 0;
      const bVal = sortBy === "site" ? b.site : (b.metrics as any)[sortBy] || 0;

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    // Apply filtering
    let filteredData = siteMetrics;
    if (dto.filters?.site) {
      filteredData = filteredData.filter((s) =>
        s.site.toLowerCase().includes(dto.filters!.site!.toLowerCase()),
      );
    }

    // Apply pagination
    const page = dto.pagination?.page || 1;
    const pageSize = dto.pagination?.pageSize || 50;
    const startIndex = (page - 1) * pageSize;
    const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

    const response: SiteAnalysisResponseDto = {
      data: paginatedData,
      pagination: {
        total: filteredData.length,
        page,
        pageSize,
        totalPages: Math.ceil(filteredData.length / pageSize),
      },
      metadata: {
        networkId,
        currencyCode,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        cachedAt: new Date().toISOString(),
      },
    };

    // Cache the response
    await this.cacheManager.set(cacheKey, response, 15 * 60 * 1000); // 15 minutes

    return response;
  }

  /**
   * Get summary metrics (aggregated totals only, no dimensions)
   * This is optimized for initial page load - fetches minimal data
   */
  async getSummary(
    dto: SummaryRequestDto,
    userId: string,
  ): Promise<SummaryResponseDto> {
    const { connectionId, networkId, startDate, endDate, forceRefresh } = dto;

    // Build cache key using RevenueCacheService
    const cacheKey = this.revenueCacheService.buildSummaryKey(
      "ad_manager",
      connectionId,
      networkId,
      startDate,
      endDate,
    );

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached =
        await this.revenueCacheService.get<SummaryResponseDto>(cacheKey);
      if (cached) {
        this.logger.log(`Summary cache hit for ${cacheKey}`);
        return cached;
      }
    }

    // Get connection with valid token
    const connection = await this.oauthService.getConnectionWithValidToken(
      connectionId,
      userId,
    );
    const accessToken = connection.access_token;
    const networks = connection.metadata?.networks || [];
    const network = networks.find((n: { id: string }) => n.id === networkId);
    const currencyCode = network?.currencyCode || "USD";

    // Run summary report (no dimensions - just aggregated totals)
    const summaryData = await this.runSummaryReport(
      accessToken,
      networkId,
      startDate,
      endDate,
    );

    // Calculate TTL based on date range
    const ttl = this.revenueCacheService.calculateTTL(startDate, endDate);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl);

    const response: SummaryResponseDto = {
      metrics: summaryData,
      metadata: {
        networkId,
        currencyCode,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        cachedAt: now.toISOString(),
        cacheExpiresAt: expiresAt.toISOString(),
        cacheTTL: ttl,
      },
    };

    // Cache with intelligent TTL
    await this.revenueCacheService.set(cacheKey, response, startDate, endDate);

    return response;
  }

  /**
   * Run a summary report (aggregated totals only, no dimensions)
   * This is much faster than a full report as it doesn't need to group by anything
   */
  private async runSummaryReport(
    accessToken: string,
    networkId: string,
    startDate: string,
    endDate: string,
  ): Promise<SummaryMetrics> {
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

    // Essential metrics only - removed unused metrics (TOTAL_REQUESTS, VIEWABLE/MEASURABLE_IMPRESSIONS)
    // to reduce API response size and improve query performance
    const metrics = [
      "AD_EXCHANGE_IMPRESSIONS",
      "AD_EXCHANGE_CLICKS",
      "AD_EXCHANGE_REVENUE",
    ];

    try {
      this.logger.log(
        `Creating summary report for network ${networkId} from ${startDate} to ${endDate}`,
      );

      // Step 1: Create the report (no dimensions = aggregated totals)
      const reportDefinition = {
        reportDefinition: {
          dimensions: [], // No dimensions for summary
          metrics,
          dateRange: {
            fixed: {
              startDate: { year: startYear, month: startMonth, day: startDay },
              endDate: { year: endYear, month: endMonth, day: endDay },
            },
          },
          reportType: "HISTORICAL",
        },
      };

      const createResponse = await this.withRetry(async () => {
        const response = await fetch(
          `${this.AD_MANAGER_API_BASE}/networks/${networkId}/reports`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(reportDefinition),
          },
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          this.logger.error("Failed to create summary report:", error);
          throw new InternalServerErrorException(
            error.error?.message ||
              "Failed to create Ad Manager summary report",
          );
        }

        return response.json();
      });

      const reportName = createResponse.name;
      if (!reportName) {
        throw new InternalServerErrorException(
          "Summary report created but no name returned",
        );
      }

      this.logger.log(`Summary report created: ${reportName}`);

      // Step 2: Run the report
      const runResponse = await this.withRetry(async () => {
        const response = await fetch(
          `${this.AD_MANAGER_API_BASE}/${reportName}:run`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          },
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          this.logger.error("Failed to run summary report:", error);
          throw new InternalServerErrorException(
            error.error?.message || "Failed to run Ad Manager summary report",
          );
        }

        return response.json();
      });

      const operationName = runResponse.name;
      if (!operationName) {
        throw new InternalServerErrorException(
          "Summary report run started but no operation name returned",
        );
      }

      this.logger.log(`Summary report job started: ${operationName}`);

      // Step 3: Poll for completion
      let isDone = false;
      let pollAttempts = 0;
      const maxPollAttempts = 30; // Max 2.5 minutes for summary report
      let resultName: string | null = null;

      while (!isDone && pollAttempts < maxPollAttempts) {
        await this.sleep(5000);
        pollAttempts++;

        const statusResponse = await fetch(
          `${this.AD_MANAGER_API_BASE}/${operationName}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!statusResponse.ok) {
          const error = await statusResponse.json().catch(() => ({}));
          this.logger.error("Failed to check summary report status:", error);
          throw new InternalServerErrorException(
            "Failed to check summary report status",
          );
        }

        const status = await statusResponse.json();

        if (status.error) {
          this.logger.error("Summary report job failed:", status.error);
          throw new InternalServerErrorException(
            status.error.message || "Ad Manager summary report job failed",
          );
        }

        if (status.done) {
          isDone = true;
          resultName =
            status.response?.reportResult ||
            status.result?.name ||
            status.response?.name ||
            `${reportName}/results`;
          this.logger.log(
            `Summary report completed after ${pollAttempts} polls`,
          );
        }
      }

      if (!isDone) {
        throw new InternalServerErrorException(
          "Summary report timed out waiting for completion",
        );
      }

      // Step 4: Fetch results (single row for summary)
      const fetchUrl = new URL(
        `${this.AD_MANAGER_API_BASE}/${resultName}:fetchRows`,
      );
      fetchUrl.searchParams.set("pageSize", "10"); // Should be just 1 row

      const fetchResponse = await this.withRetry(async () => {
        const response = await fetch(fetchUrl.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(
            `Failed to fetch summary results (HTTP ${response.status}): ${errorText}`,
          );
          throw new InternalServerErrorException(
            `Failed to fetch summary results (HTTP ${response.status})`,
          );
        }

        return response.json() as Promise<FetchRowsResponse>;
      });

      // Process the single summary row
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalRevenue = 0;
      let totalRequests = 0;
      let totalViewableImpressions = 0;
      let totalMeasurableImpressions = 0;

      if (fetchResponse.rows && fetchResponse.rows.length > 0) {
        for (const row of fetchResponse.rows) {
          if (
            row.metricValueGroups &&
            row.metricValueGroups[0]?.primaryValues
          ) {
            const values = row.metricValueGroups[0].primaryValues;
            totalImpressions += this.parseMetricValue(values[0]);
            totalClicks += this.parseMetricValue(values[1]);
            totalRevenue += this.parseRevenueValue(values[2]);
            totalRequests += this.parseMetricValue(values[3]);
            totalViewableImpressions += this.parseMetricValue(values[4]);
            totalMeasurableImpressions += this.parseMetricValue(values[5]);
          }
        }
      }

      // Convert revenue from micros to dollars
      const revenueInDollars = totalRevenue / 1000000;

      // Calculate derived metrics
      const ctr =
        totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc = totalClicks > 0 ? revenueInDollars / totalClicks : 0;
      const rpm =
        totalImpressions > 0 ? (revenueInDollars / totalImpressions) * 1000 : 0;
      const viewability =
        totalMeasurableImpressions > 0
          ? (totalViewableImpressions / totalMeasurableImpressions) * 100
          : 0;
      const fillRate =
        totalRequests > 0 ? (totalImpressions / totalRequests) * 100 : 0;

      this.logger.log(
        `Summary report completed: revenue=${revenueInDollars.toFixed(2)}, impressions=${totalImpressions}`,
      );

      return {
        revenue: revenueInDollars,
        impressions: totalImpressions,
        clicks: totalClicks,
        requests: totalRequests,
        ctr,
        cpc,
        rpm,
        viewability,
        fillRate,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error("Summary report execution error:", error);
      throw new InternalServerErrorException(
        "Failed to execute Ad Manager summary report",
      );
    }
  }

  /**
   * Sleep helper for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate number of days between two dates
   */
  private calculateDaysDiff(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  }

  /**
   * Exponential backoff retry wrapper
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 5,
    initialDelay = 3000, // Increased from 1000ms to 3000ms
  ): Promise<T> {
    let delay = initialDelay;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        const isRateLimit =
          error.status === 429 ||
          error.message?.includes("QUOTA_EXCEEDED") ||
          error.message?.includes("rate limit") ||
          error.message?.includes("Too many requests");

        if (isRateLimit && i < maxRetries - 1) {
          this.logger.warn(
            `Rate limited by Google Ad Manager API, retrying in ${delay}ms (attempt ${i + 1}/${maxRetries})`,
          );
          await this.sleep(delay);
          delay *= 2; // Exponential backoff: 3s, 6s, 12s, 24s, 48s
        } else if (isRateLimit) {
          // On final retry attempt, throw a more helpful error
          throw new InternalServerErrorException(
            "Google Ad Manager API rate limit exceeded. Please wait a few minutes before trying again. The data is cached for 15 minutes to reduce API calls.",
          );
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Run a report using the Ad Manager API
   * Workflow: Create Report → Run Report → Poll Status → Fetch Results
   */
  private async runReport(
    accessToken: string,
    networkId: string,
    startDate: string,
    endDate: string,
    groupBy: string,
  ): Promise<RawReportRow[]> {
    // Build dimensions based on groupBy
    // TOP_PRIVATE_DOMAIN is the domain (e.g., example.com)
    // KEY_VALUES_NAME is used for custom key-value targeting (e.g., land_uri)
    // DATE provides daily breakdown
    // COUNTRY_NAME and COUNTRY_CODE provide country-level breakdown
    const dimensions =
      groupBy === "country"
        ? ["COUNTRY_NAME", "COUNTRY_CODE", "TOP_PRIVATE_DOMAIN", "DATE"]
        : [
            "TOP_PRIVATE_DOMAIN",
            "KEY_VALUES_NAME",
            "DATE",
            "COUNTRY_NAME",
            "COUNTRY_CODE",
          ];

    // Essential metrics only - removed unused metrics (TOTAL_REQUESTS, RESPONSES_SERVED,
    // VIEWABLE/MEASURABLE_IMPRESSIONS) to reduce API response size and improve query performance
    const metrics = [
      "AD_EXCHANGE_IMPRESSIONS",
      "AD_EXCHANGE_CLICKS",
      "AD_EXCHANGE_REVENUE",
    ];

    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

    try {
      // Timing: start total timer
      const totalStartTime = Date.now();
      const timings: Record<string, number> = {};

      this.logger.log(
        `[TIMING] Creating report for network ${networkId} from ${startDate} to ${endDate}`,
      );

      // Step 1: Create the report
      const step1Start = Date.now();
      const reportDefinition: ReportDefinition = {
        reportDefinition: {
          dimensions,
          metrics,
          dateRange: {
            fixed: {
              startDate: { year: startYear, month: startMonth, day: startDay },
              endDate: { year: endYear, month: endMonth, day: endDay },
            },
          },
          reportType: "HISTORICAL",
        },
      };

      const createResponse = await this.withRetry(async () => {
        const response = await fetch(
          `${this.AD_MANAGER_API_BASE}/networks/${networkId}/reports`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(reportDefinition),
          },
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          this.logger.error("Failed to create report:", error);
          throw new InternalServerErrorException(
            error.error?.message || "Failed to create Ad Manager report",
          );
        }

        return response.json();
      });

      const reportName = createResponse.name;
      if (!reportName) {
        throw new InternalServerErrorException(
          "Report created but no name returned",
        );
      }

      timings.step1_create = Date.now() - step1Start;
      this.logger.log(
        `[TIMING] Report created: ${reportName} (${timings.step1_create}ms)`,
      );

      // Step 2: Run the report
      const step2Start = Date.now();
      const runResponse = await this.withRetry(async () => {
        const response = await fetch(
          `${this.AD_MANAGER_API_BASE}/${reportName}:run`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          },
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          this.logger.error("Failed to run report:", error);
          throw new InternalServerErrorException(
            error.error?.message || "Failed to run Ad Manager report",
          );
        }

        return response.json();
      });

      const operationName = runResponse.name;
      if (!operationName) {
        throw new InternalServerErrorException(
          "Report run started but no operation name returned",
        );
      }

      timings.step2_run = Date.now() - step2Start;
      this.logger.log(
        `[TIMING] Report job started: ${operationName} (${timings.step2_run}ms)`,
      );

      // Step 3: Poll for completion
      const step3Start = Date.now();
      let isDone = false;
      let pollAttempts = 0;
      const maxPollAttempts = 60; // Max 5 minutes (60 * 5 seconds)
      let resultName: string | null = null;

      while (!isDone && pollAttempts < maxPollAttempts) {
        await this.sleep(5000); // Wait 5 seconds between polls
        pollAttempts++;

        const statusResponse = await fetch(
          `${this.AD_MANAGER_API_BASE}/${operationName}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (!statusResponse.ok) {
          const error = await statusResponse.json().catch(() => ({}));
          this.logger.error("Failed to check report status:", error);
          throw new InternalServerErrorException(
            "Failed to check report status",
          );
        }

        const status = await statusResponse.json();
        this.logger.log(`Operation status response: ${JSON.stringify(status)}`);

        if (status.error) {
          this.logger.error("Report job failed:", status.error);
          throw new InternalServerErrorException(
            status.error.message || "Ad Manager report job failed",
          );
        }

        if (status.done) {
          isDone = true;
          // The result name should be in the response - check different possible structures
          resultName =
            status.response?.reportResult ||
            status.result?.name ||
            status.response?.name ||
            `${reportName}/results`;
          timings.step3_poll = Date.now() - step3Start;
          this.logger.log(
            `[TIMING] Report completed after ${pollAttempts} polls (${timings.step3_poll}ms), resultName: ${resultName}`,
          );
        } else {
          this.logger.debug(
            `Report still running (poll ${pollAttempts}/${maxPollAttempts})`,
          );
        }
      }

      if (!isDone) {
        throw new InternalServerErrorException(
          "Report timed out waiting for completion",
        );
      }

      // Step 4: Fetch results (GET request with query params)
      const step4Start = Date.now();
      const rows: RawReportRow[] = [];
      let nextPageToken: string | undefined;
      let pageCount = 0;

      do {
        const fetchUrl = new URL(
          `${this.AD_MANAGER_API_BASE}/${resultName}:fetchRows`,
        );
        fetchUrl.searchParams.set("pageSize", "1000");
        if (nextPageToken) {
          fetchUrl.searchParams.set("pageToken", nextPageToken);
        }

        this.logger.log(`Fetching results from: ${fetchUrl.toString()}`);

        const fetchResponse = await this.withRetry(async () => {
          const response = await fetch(fetchUrl.toString(), {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            this.logger.error(
              `Failed to fetch report results (HTTP ${response.status}): ${errorText}`,
            );
            let errorObj = {};
            try {
              errorObj = JSON.parse(errorText);
            } catch {
              // Not JSON
            }
            throw new InternalServerErrorException(
              (errorObj as any).error?.message ||
                `Failed to fetch report results (HTTP ${response.status})`,
            );
          }

          return response.json() as Promise<FetchRowsResponse>;
        });

        // Log the first row structure for debugging
        if (fetchResponse.rows && fetchResponse.rows.length > 0) {
          this.logger.log(
            `First row structure: ${JSON.stringify(fetchResponse.rows[0])}`,
          );
        }

        // Process rows from response
        if (fetchResponse.rows) {
          for (const row of fetchResponse.rows) {
            const rawRow: RawReportRow = {};

            // Map dimension values based on dimensions array order
            // For country groupBy: COUNTRY_NAME, COUNTRY_CODE, TOP_PRIVATE_DOMAIN, DATE
            // For other groupBy: TOP_PRIVATE_DOMAIN, KEY_VALUES_NAME, DATE, COUNTRY_NAME, COUNTRY_CODE
            if (row.dimensionValues && row.dimensionValues.length >= 4) {
              if (groupBy === "country") {
                // Country grouping: COUNTRY_NAME, COUNTRY_CODE, TOP_PRIVATE_DOMAIN, DATE
                rawRow.COUNTRY_NAME =
                  row.dimensionValues[0]?.stringValue ||
                  row.dimensionValues[0]?.value ||
                  "";
                rawRow.COUNTRY_CODE =
                  row.dimensionValues[1]?.stringValue ||
                  row.dimensionValues[1]?.value ||
                  "";
                rawRow.TOP_PRIVATE_DOMAIN =
                  row.dimensionValues[2]?.stringValue ||
                  row.dimensionValues[2]?.value ||
                  "";
                const dateInt =
                  row.dimensionValues[3]?.intValue ||
                  row.dimensionValues[3]?.value ||
                  "";
                if (dateInt && dateInt.length === 8) {
                  rawRow.DATE = `${dateInt.slice(0, 4)}-${dateInt.slice(4, 6)}-${dateInt.slice(6, 8)}`;
                } else {
                  rawRow.DATE = dateInt;
                }
              } else {
                // Standard: TOP_PRIVATE_DOMAIN, KEY_VALUES_NAME, DATE, COUNTRY_NAME, COUNTRY_CODE
                rawRow.TOP_PRIVATE_DOMAIN =
                  row.dimensionValues[0]?.stringValue ||
                  row.dimensionValues[0]?.value ||
                  "";
                rawRow.KEY_VALUES_NAME =
                  row.dimensionValues[1]?.stringValue ||
                  row.dimensionValues[1]?.value ||
                  "";
                const dateInt =
                  row.dimensionValues[2]?.intValue ||
                  row.dimensionValues[2]?.value ||
                  "";
                if (dateInt && dateInt.length === 8) {
                  rawRow.DATE = `${dateInt.slice(0, 4)}-${dateInt.slice(4, 6)}-${dateInt.slice(6, 8)}`;
                } else {
                  rawRow.DATE = dateInt;
                }
                // Country dimensions (optional - may not be present in all responses)
                if (row.dimensionValues.length >= 5) {
                  rawRow.COUNTRY_NAME =
                    row.dimensionValues[3]?.stringValue ||
                    row.dimensionValues[3]?.value ||
                    "";
                  rawRow.COUNTRY_CODE =
                    row.dimensionValues[4]?.stringValue ||
                    row.dimensionValues[4]?.value ||
                    "";
                }
              }
            }

            // Map metric values - order matches the metrics array
            // Order: AD_EXCHANGE_IMPRESSIONS, AD_EXCHANGE_CLICKS, AD_EXCHANGE_REVENUE
            if (
              row.metricValueGroups &&
              row.metricValueGroups[0]?.primaryValues
            ) {
              const values = row.metricValueGroups[0].primaryValues;

              rawRow.AD_EXCHANGE_IMPRESSIONS = this.parseMetricValue(values[0]);
              rawRow.AD_EXCHANGE_CLICKS = this.parseMetricValue(values[1]);
              // Revenue comes as doubleValue already in dollars, convert to micros for consistency
              rawRow.AD_EXCHANGE_REVENUE = this.parseRevenueValue(values[2]);
            }

            rows.push(rawRow);
          }
        }

        nextPageToken = fetchResponse.nextPageToken;
        pageCount++;
        this.logger.debug(
          `Fetched ${fetchResponse.rows?.length || 0} rows, total: ${rows.length} (page ${pageCount})`,
        );
      } while (nextPageToken);

      timings.step4_fetch = Date.now() - step4Start;
      const totalTime = Date.now() - totalStartTime;

      // Log timing summary
      this.logger.log(
        `[TIMING] ═══════════════════════════════════════════════════════`,
      );
      this.logger.log(
        `[TIMING] Report completed: ${rows.length} rows, ${pageCount} pages`,
      );
      this.logger.log(
        `[TIMING] Date range: ${startDate} to ${endDate} (${this.calculateDaysDiff(startDate, endDate)} days)`,
      );
      this.logger.log(`[TIMING] Step 1 (Create): ${timings.step1_create}ms`);
      this.logger.log(`[TIMING] Step 2 (Run):    ${timings.step2_run}ms`);
      this.logger.log(`[TIMING] Step 3 (Poll):   ${timings.step3_poll}ms`);
      this.logger.log(`[TIMING] Step 4 (Fetch):  ${timings.step4_fetch}ms`);
      this.logger.log(
        `[TIMING] TOTAL:           ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`,
      );
      this.logger.log(
        `[TIMING] ═══════════════════════════════════════════════════════`,
      );

      return rows;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error("Report execution error:", error);
      throw new InternalServerErrorException(
        "Failed to execute Ad Manager report",
      );
    }
  }

  /**
   * Parse metric value from API response (for integers like impressions, clicks)
   */
  private parseMetricValue(
    value:
      | { intValue?: string; integerValue?: string; doubleValue?: number }
      | undefined,
  ): number {
    if (!value) return 0;

    // API v1 uses intValue
    if (value.intValue) {
      return parseInt(value.intValue, 10);
    }

    // Legacy integerValue
    if (value.integerValue) {
      return parseInt(value.integerValue, 10);
    }

    // Double value (convert to int)
    if (value.doubleValue !== undefined) {
      return Math.round(value.doubleValue);
    }

    return 0;
  }

  /**
   * Parse revenue value from API response (comes as doubleValue in dollars)
   * Convert to micros (millionths) for consistency with internal calculations
   */
  private parseRevenueValue(
    value:
      | { doubleValue?: number; intValue?: string; micros?: string }
      | undefined,
  ): number {
    if (!value) return 0;

    // API v1 returns revenue as doubleValue in dollars
    if (value.doubleValue !== undefined) {
      // Convert dollars to micros (multiply by 1,000,000)
      return Math.round(value.doubleValue * 1000000);
    }

    // Legacy micros format
    if (value.micros) {
      return parseInt(value.micros, 10);
    }

    // Integer value
    if (value.intValue) {
      return parseInt(value.intValue, 10);
    }

    return 0;
  }

  /**
   * Get week number for a date (ISO week)
   */
  private getWeekKey(dateStr: string): string {
    const date = new Date(dateStr);
    // Get the first day of the year
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    // Calculate the number of days since the start of the year
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
    );
    // Calculate week number
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
  }

  /**
   * Get month key for a date
   */
  private getMonthKey(dateStr: string): string {
    return dateStr.substring(0, 7); // YYYY-MM
  }

  /**
   * Clean domain value by removing known prefixes that are not actual domains.
   * Ad Manager sometimes returns key-value prefixes like "null_", "broadcast_", "chatbot_"
   * in the TOP_PRIVATE_DOMAIN field, which are not real domain names.
   */
  private cleanDomain(rawDomain: string): string {
    if (!rawDomain) return "";

    // Known prefixes that are not domains (these come from key-value targeting)
    const invalidPrefixes = [
      "null_",
      "broadcast_",
      "chatbot_",
      "experiment_",
      "control_",
      "test_",
    ];

    // Check if the value starts with a known invalid prefix
    for (const prefix of invalidPrefixes) {
      if (rawDomain.toLowerCase().startsWith(prefix.toLowerCase())) {
        // Return empty - this is not a real domain
        return "";
      }
    }

    // Check if it looks like a domain (contains a dot and no special characters)
    // Valid domains: example.com, sub.example.com
    // Invalid: just_a_prefix, some_random_value
    if (!rawDomain.includes(".") && rawDomain.includes("_")) {
      // Likely a key-value prefix, not a domain
      return "";
    }

    return rawDomain;
  }

  /**
   * Clean and extract URL path from key-value targeting string.
   * Ad Manager returns key-value pairs in various formats:
   * - land_uri=/path
   * - request_uri=/path
   * - utm_source_land_uri=/path
   * - null_/path (prefix_/path format)
   * - broadcast_/path
   * - /path (direct path)
   *
   * This method extracts just the URL path.
   */
  private cleanKeyValue(rawKeyValue: string): string {
    if (!rawKeyValue) return "";

    // Try to extract URL from known patterns

    // Pattern: land_uri=/path or request_uri=/path or utm_source_land_uri=/path
    if (rawKeyValue.toLowerCase().includes("land_uri=")) {
      const match = rawKeyValue.match(/land_uri=([^\s,]+)/i);
      if (match) return match[1];
    }
    if (rawKeyValue.toLowerCase().includes("request_uri=")) {
      const match = rawKeyValue.match(/request_uri=([^\s,]+)/i);
      if (match) return match[1];
    }

    // Direct path
    if (rawKeyValue.startsWith("/")) {
      return rawKeyValue;
    }

    // Pattern: prefix_/path (e.g., null_/path, broadcast_/path)
    // Extract everything starting from the first "/"
    if (rawKeyValue.includes("/")) {
      const slashIndex = rawKeyValue.indexOf("/");
      return rawKeyValue.substring(slashIndex);
    }

    // No recognizable URL pattern - return as-is but remove known prefixes
    const invalidPrefixes = [
      "null_",
      "broadcast_",
      "chatbot_",
      "experiment_",
      "control_",
      "test_",
    ];
    for (const prefix of invalidPrefixes) {
      if (rawKeyValue.toLowerCase().startsWith(prefix.toLowerCase())) {
        return rawKeyValue.substring(prefix.length) || rawKeyValue;
      }
    }

    return rawKeyValue;
  }

  /**
   * Process raw report data into site-level aggregates based on groupBy option
   */
  private processSiteData(
    rows: RawReportRow[],
    groupBy: GroupByOption = "domain",
  ): SiteData[] {
    const dataMap = new Map<
      string,
      {
        site: string;
        domain: string;
        country?: string;
        countryCode?: string;
        childCount: number;
        children: Set<string>;
        revenue: number;
        impressions: number;
        clicks: number;
        requests: number;
        viewableImpressions: number;
        measurableImpressions: number;
      }
    >();

    for (const row of rows) {
      const rawDomain = row.TOP_PRIVATE_DOMAIN || "";
      const domain = this.cleanDomain(rawDomain);
      const rawKeyValue = row.KEY_VALUES_NAME || "";
      const keyValue = this.cleanKeyValue(rawKeyValue);
      const date = row.DATE || "";
      const countryName = row.COUNTRY_NAME || "";
      const countryCode = row.COUNTRY_CODE || "";

      // For URL grouping, skip entries that don't look like URLs
      if (groupBy === "url" || groupBy === "url_full") {
        if (!keyValue.includes("/")) {
          continue;
        }
      }

      // Determine the grouping key and display values based on groupBy option
      let mapKey: string;
      let site: string;
      let displayDomain: string;
      let displayCountry: string | undefined;
      let displayCountryCode: string | undefined;
      let childKey: string;

      switch (groupBy) {
        case "domain":
          // Group by domain only (aggregate all key-values for the same domain)
          mapKey = domain;
          site = domain || "Unknown";
          displayDomain = domain || "Unknown";
          childKey = keyValue || date; // Count unique key-values as children
          break;

        case "country":
          // Group by country
          mapKey = countryCode || countryName || "Unknown";
          site = countryName || "Unknown";
          displayDomain = domain || "Unknown";
          displayCountry = countryName;
          displayCountryCode = countryCode;
          childKey = `${domain}|||${date}`; // Count unique domain+date combinations
          break;

        case "date_day":
          // Group by date (daily)
          // Key includes domain to keep domains separate (like AdSense)
          mapKey = `${date}|||${domain}`;
          site = date || "Unknown";
          displayDomain = domain || "Unknown";
          childKey = `${domain}|||${keyValue}`; // Count unique domain+keyValue combinations
          break;

        case "date_week":
          // Group by week
          // Key includes domain to keep domains separate (like AdSense)
          const weekKey = date ? this.getWeekKey(date) : "Unknown";
          mapKey = `${weekKey}|||${domain}`;
          site = weekKey;
          displayDomain = domain || "Unknown";
          childKey = date; // Count unique dates in the week
          break;

        case "date_month":
          // Group by month
          // Key includes domain to keep domains separate (like AdSense)
          const monthKey = date ? this.getMonthKey(date) : "Unknown";
          mapKey = `${monthKey}|||${domain}`;
          site = monthKey;
          displayDomain = domain || "Unknown";
          childKey = date; // Count unique dates in the month
          break;

        case "url": {
          // Group by URL slug only (path without query params)
          const slug = this.extractSlug(keyValue);
          mapKey = slug;
          site = slug || "/";
          displayDomain = domain || "Unknown";
          childKey = date; // Count unique dates as children
          break;
        }

        case "url_full":
          // Group by full URL (path with query params, already cleaned)
          mapKey = keyValue;
          site = keyValue || "/";
          displayDomain = domain || "Unknown";
          childKey = date; // Count unique dates as children
          break;

        default:
          // Default to domain behavior
          mapKey = domain;
          site = domain || "Unknown";
          displayDomain = domain || "Unknown";
          childKey = keyValue || date;
      }

      if (!dataMap.has(mapKey)) {
        dataMap.set(mapKey, {
          site,
          domain: displayDomain,
          country: displayCountry,
          countryCode: displayCountryCode,
          childCount: 0,
          children: new Set(),
          revenue: 0,
          impressions: 0,
          clicks: 0,
          requests: 0,
          viewableImpressions: 0,
          measurableImpressions: 0,
        });
      }

      const data = dataMap.get(mapKey)!;
      if (childKey) data.children.add(childKey);
      data.revenue += row.AD_EXCHANGE_REVENUE || 0;
      data.impressions += row.AD_EXCHANGE_IMPRESSIONS || 0;
      data.clicks += row.AD_EXCHANGE_CLICKS || 0;
      // Use real requests from API, fallback to impressions if not available
      data.requests +=
        row.AD_EXCHANGE_TOTAL_REQUESTS || row.AD_EXCHANGE_IMPRESSIONS || 0;
      // Use real viewability metrics from API
      data.viewableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS || 0;
      data.measurableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS || 0;
    }

    // Convert to SiteData array
    return Array.from(dataMap.values()).map((data) => ({
      site: data.site,
      domain: data.domain,
      country: data.country,
      countryCode: data.countryCode,
      childCount: data.children.size,
      metrics: this.calculateMetrics(
        data.revenue,
        data.impressions,
        data.clicks,
      ),
    }));
  }

  /**
   * Expand site to dates or dates to URIs
   */
  async expandLevel(
    dto: ExpandRequestDto,
    userId: string,
  ): Promise<{ items: DateData[] | UriData[] }> {
    const {
      connectionId,
      networkId,
      startDate,
      endDate,
      level,
      parentSite,
      parentDate,
      forceRefresh,
    } = dto;

    // Check cache
    const cacheKey = this.getExpandCacheKey(
      connectionId,
      networkId,
      parentSite,
      startDate,
      endDate,
      level,
      parentDate,
    );

    if (!forceRefresh) {
      const cached = await this.cacheManager.get<{
        items: DateData[] | UriData[];
      }>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for expand ${cacheKey}`);
        return cached;
      }
    }

    // Get connection with valid token
    const connection = await this.oauthService.getConnectionWithValidToken(
      connectionId,
      userId,
    );
    const accessToken = connection.access_token;

    // Fetch expanded data
    // For now, using mock data - replace with actual API calls
    const reportData = await this.runReport(
      accessToken,
      networkId,
      level === "uri" && parentDate ? parentDate : startDate,
      level === "uri" && parentDate ? parentDate : endDate,
      level === "uri" ? "request_uri" : "site",
    );

    let items: DateData[] | UriData[];

    if (level === "date") {
      // Group by date for the specific site
      items = this.processDateData(reportData, parentSite);
    } else {
      // Group by URI for the specific site and date
      items = this.processUriData(reportData, parentSite, parentDate!);
    }

    // Apply sorting
    const sortBy = dto.sortBy || (level === "date" ? "date" : "revenue");
    const sortOrder = dto.sortOrder || "desc";

    items.sort((a, b) => {
      const aVal =
        level === "date"
          ? sortBy === "date"
            ? (a as DateData).date
            : ((a as DateData).metrics as any)[sortBy] || 0
          : sortBy === "requestUri"
            ? (a as UriData).requestUri
            : ((a as UriData).metrics as any)[sortBy] || 0;
      const bVal =
        level === "date"
          ? sortBy === "date"
            ? (b as DateData).date
            : ((b as DateData).metrics as any)[sortBy] || 0
          : sortBy === "requestUri"
            ? (b as UriData).requestUri
            : ((b as UriData).metrics as any)[sortBy] || 0;

      if (typeof aVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    const response = { items };

    // Cache the response
    await this.cacheManager.set(cacheKey, response, 15 * 60 * 1000);

    return response;
  }

  /**
   * Process report data into date-level data for a site
   * @param site - The key-value (e.g., land_uri=/path)
   */
  private processDateData(rows: RawReportRow[], site: string): DateData[] {
    const dateMap = new Map<
      string,
      {
        uris: Set<string>;
        revenue: number;
        impressions: number;
        clicks: number;
        requests: number;
        viewableImpressions: number;
        measurableImpressions: number;
      }
    >();

    for (const row of rows) {
      // Match by key-value (site field now contains only keyValue)
      const keyValue = row.KEY_VALUES_NAME || "Unknown";
      if (keyValue !== site) continue;

      const date = row.DATE || "";
      if (!date) continue;

      if (!dateMap.has(date)) {
        dateMap.set(date, {
          uris: new Set(),
          revenue: 0,
          impressions: 0,
          clicks: 0,
          requests: 0,
          viewableImpressions: 0,
          measurableImpressions: 0,
        });
      }

      const data = dateMap.get(date)!;
      if (row.KEY_VALUES_NAME) {
        data.uris.add(row.KEY_VALUES_NAME);
      }
      data.revenue += row.AD_EXCHANGE_REVENUE || 0;
      data.impressions += row.AD_EXCHANGE_IMPRESSIONS || 0;
      data.clicks += row.AD_EXCHANGE_CLICKS || 0;
      // Use real requests from API, fallback to impressions
      data.requests +=
        row.AD_EXCHANGE_TOTAL_REQUESTS || row.AD_EXCHANGE_IMPRESSIONS || 0;
      data.viewableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS || 0;
      data.measurableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS || 0;
    }

    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      childCount: Math.max(data.uris.size, 1), // At least 1 if we have data
      metrics: this.calculateMetrics(
        data.revenue,
        data.impressions,
        data.clicks,
      ),
    }));
  }

  /**
   * Process report data into URI-level data for a site and date
   * @param site - The key-value (e.g., land_uri=/path)
   */
  private processUriData(
    rows: RawReportRow[],
    site: string,
    date: string,
  ): UriData[] {
    const uriMap = new Map<
      string,
      {
        revenue: number;
        impressions: number;
        clicks: number;
        requests: number;
        viewableImpressions: number;
        measurableImpressions: number;
      }
    >();

    for (const row of rows) {
      // Match by key-value (site field now contains only keyValue)
      const keyValue = row.KEY_VALUES_NAME || "Unknown";
      if (keyValue !== site) continue;
      if (row.DATE !== date) continue;

      const uri = row.KEY_VALUES_NAME || "/";

      if (!uriMap.has(uri)) {
        uriMap.set(uri, {
          revenue: 0,
          impressions: 0,
          clicks: 0,
          requests: 0,
          viewableImpressions: 0,
          measurableImpressions: 0,
        });
      }

      const data = uriMap.get(uri)!;
      data.revenue += row.AD_EXCHANGE_REVENUE || 0;
      data.impressions += row.AD_EXCHANGE_IMPRESSIONS || 0;
      data.clicks += row.AD_EXCHANGE_CLICKS || 0;
      // Use real requests from API, fallback to impressions
      data.requests +=
        row.AD_EXCHANGE_TOTAL_REQUESTS || row.AD_EXCHANGE_IMPRESSIONS || 0;
      data.viewableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS || 0;
      data.measurableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS || 0;
    }

    return Array.from(uriMap.entries()).map(([requestUri, data]) => ({
      requestUri,
      metrics: this.calculateMetrics(
        data.revenue,
        data.impressions,
        data.clicks,
      ),
    }));
  }

  /**
   * Invalidate cache for a network
   */
  async invalidateCache(
    connectionId: string,
    networkId: string,
  ): Promise<void> {
    // Note: In a real implementation, you'd need to iterate through cache keys
    // For now, we log the invalidation request
    this.logger.log(
      `Cache invalidation requested for connection ${connectionId}, network ${networkId}`,
    );

    // With the cache manager, we can't easily delete by pattern
    // A more sophisticated approach would use Redis with SCAN/DEL
  }

  /**
   * Generate cache key for consolidated metrics
   */
  private getConsolidatedCacheKey(
    connectionId: string,
    networkId: string,
    startDate: string,
    endDate: string,
    landUriFilter?: string,
  ): string {
    const filterKey = landUriFilter ? `:${landUriFilter}` : "";
    return `ad-manager:consolidated:${connectionId}:${networkId}:${startDate}:${endDate}${filterKey}`;
  }

  /**
   * Get consolidated metrics for land_uri data
   * Used by Google Ads dashboard to display Ad Manager revenue data
   */
  async getConsolidatedMetrics(
    dto: ConsolidatedMetricsRequestDto,
    userId: string,
  ): Promise<ConsolidatedMetricsResponseDto> {
    const {
      connectionId,
      networkId,
      startDate,
      endDate,
      landUriFilter,
      forceRefresh,
    } = dto;

    // Check cache first
    const cacheKey = this.getConsolidatedCacheKey(
      connectionId,
      networkId,
      startDate,
      endDate,
      landUriFilter,
    );

    if (!forceRefresh) {
      const cached =
        await this.cacheManager.get<ConsolidatedMetricsResponseDto>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for consolidated metrics: ${cacheKey}`);
        return cached;
      }
    }

    // Get connection with valid token
    const connection = await this.oauthService.getConnectionWithValidToken(
      connectionId,
      userId,
    );
    const accessToken = connection.access_token;
    // Run report to get all data
    const reportData = await this.runReport(
      accessToken,
      networkId,
      startDate,
      endDate,
      "site",
    );

    // Filter and aggregate data
    const { totals, byLandUri } = this.aggregateConsolidatedMetrics(
      reportData,
      landUriFilter,
    );

    const response: ConsolidatedMetricsResponseDto = {
      data: totals,
      byLandUri,
      metadata: {
        networkId,
        currencyCode: "USD", // Ad Manager always returns USD
        dateRange: {
          start: startDate,
          end: endDate,
        },
        landUriFilter,
        cachedAt: new Date().toISOString(),
      },
    };

    // Cache the response
    await this.cacheManager.set(cacheKey, response, 15 * 60 * 1000); // 15 minutes

    return response;
  }

  /**
   * Aggregate raw report data into consolidated metrics
   * Returns both totals and breakdown by land_uri
   */
  private aggregateConsolidatedMetrics(
    rows: RawReportRow[],
    landUriFilter?: string,
  ): { totals: ConsolidatedMetricsData; byLandUri: LandUriMetrics[] } {
    let totalRevenue = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let matchedRows = 0;

    // Group metrics by land_uri
    const landUriMap = new Map<
      string,
      { revenue: number; impressions: number; clicks: number }
    >();

    for (const row of rows) {
      const keyValue = row.KEY_VALUES_NAME || "";

      // Extract land_uri value from key-value string
      // Format is typically: "land_uri=/en/some-page" or just the path
      let landUri = "";
      if (keyValue.toLowerCase().includes("land_uri=")) {
        // Extract the path after "land_uri="
        const match = keyValue.match(/land_uri=([^\s,]+)/i);
        landUri = match ? match[1] : keyValue;
      } else if (keyValue.startsWith("/")) {
        // Already a path
        landUri = keyValue;
      } else {
        // Use the full key-value as-is
        landUri = keyValue;
      }

      // Filter by land_uri if specified
      if (landUriFilter) {
        const matchesFilter = landUri
          .toLowerCase()
          .includes(landUriFilter.toLowerCase());
        if (!matchesFilter) {
          continue;
        }
      }

      // Only process land_uri entries (skip other key-values like "experiment=control")
      if (!landUri.includes("/")) {
        continue;
      }

      const revenue = row.AD_EXCHANGE_REVENUE || 0;
      const impressions = row.AD_EXCHANGE_IMPRESSIONS || 0;
      const clicks = row.AD_EXCHANGE_CLICKS || 0;

      totalRevenue += revenue;
      totalImpressions += impressions;
      totalClicks += clicks;
      matchedRows++;

      // Aggregate by land_uri (sum across dates)
      const existing = landUriMap.get(landUri) || {
        revenue: 0,
        impressions: 0,
        clicks: 0,
      };
      landUriMap.set(landUri, {
        revenue: existing.revenue + revenue,
        impressions: existing.impressions + impressions,
        clicks: existing.clicks + clicks,
      });
    }

    // Convert revenue from micros to dollars for totals
    const totalRevenueInDollars = totalRevenue / 1000000;

    // Calculate derived metrics for totals
    const ecpm =
      totalImpressions > 0
        ? (totalRevenueInDollars / totalImpressions) * 1000
        : 0;
    const ctr =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Build byLandUri array with calculated metrics
    const byLandUri: LandUriMetrics[] = Array.from(landUriMap.entries())
      .map(([landUri, metrics]) => {
        const revenueInDollars = metrics.revenue / 1000000;
        return {
          landUri,
          revenue: revenueInDollars,
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          ecpm:
            metrics.impressions > 0
              ? (revenueInDollars / metrics.impressions) * 1000
              : 0,
          ctr:
            metrics.impressions > 0
              ? (metrics.clicks / metrics.impressions) * 100
              : 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue); // Sort by revenue descending

    return {
      totals: {
        totalRevenue: totalRevenueInDollars,
        totalImpressions,
        totalClicks,
        ecpm,
        ctr,
        matchedRows,
      },
      byLandUri,
    };
  }

  /**
   * Generate cache key for hierarchical expand
   */
  private getHierarchicalExpandCacheKey(
    connectionId: string,
    networkId: string,
    startDate: string,
    endDate: string,
    primaryGroupBy: string,
    subGroupBy: string,
    parentKey: string,
  ): string {
    return `ad-manager:hierarchical-expand:${connectionId}:${networkId}:${startDate}:${endDate}:${primaryGroupBy}:${subGroupBy}:${parentKey}`;
  }

  /**
   * Expand a parent item with hierarchical sub-grouping
   * This allows flexible drill-down like: URL -> by Week, or Domain -> by Month
   */
  async expandHierarchical(
    dto: HierarchicalExpandRequestDto,
    userId: string,
  ): Promise<HierarchicalExpandResponseDto> {
    const {
      connectionId,
      networkId,
      startDate,
      endDate,
      primaryGroupBy,
      subGroupBy,
      parentKey: rawParentKey,
      sortBy = "revenue",
      sortOrder = "desc",
      forceRefresh,
    } = dto;

    this.logger.log(
      `expandHierarchical called with: primaryGroupBy=${primaryGroupBy}, subGroupBy=${subGroupBy}, parentKey=${rawParentKey}`,
    );

    try {
      // Extract actual key from unified format (source|||key or just key)
      // Frontend may send "www.example.com|||www.example.com" for unified rows
      const parentKey = rawParentKey.includes("|||")
        ? rawParentKey.split("|||").pop() || rawParentKey
        : rawParentKey;

      // If subGroupBy is 'none' or 'total', return empty items (no expansion)
      if (subGroupBy === "none" || subGroupBy === "total") {
        return {
          items: [],
          metadata: { primaryGroupBy, subGroupBy, parentKey },
        };
      }

      // Check cache
      const cacheKey = this.getHierarchicalExpandCacheKey(
        connectionId,
        networkId,
        startDate,
        endDate,
        primaryGroupBy,
        subGroupBy,
        parentKey,
      );

      if (!forceRefresh) {
        const cached =
          await this.cacheManager.get<HierarchicalExpandResponseDto>(cacheKey);
        if (cached) {
          this.logger.log(`Cache hit for hierarchical expand: ${cacheKey}`);
          return cached;
        }
      }

      // Get connection with valid token
      this.logger.log(
        `Getting connection with valid token for ${connectionId}`,
      );
      const connection = await this.oauthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );
      const accessToken = connection.access_token;
      this.logger.log(`Got valid token, fetching report data`);

      // Fetch all raw data for the date range
      const reportData = await this.runReport(
        accessToken,
        networkId,
        startDate,
        endDate,
        "site", // Always fetch with full dimensions
      );
      this.logger.log(`Got ${reportData.length} rows from runReport`);

      // Process the hierarchical expansion
      this.logger.log(
        `Processing hierarchical expand with parentKey=${parentKey}, primaryGroupBy=${primaryGroupBy}, subGroupBy=${subGroupBy}`,
      );
      const items = this.processHierarchicalExpand(
        reportData,
        primaryGroupBy,
        subGroupBy,
        parentKey,
      );
      this.logger.log(
        `processHierarchicalExpand returned ${items.length} items`,
      );

      // Sort items
      items.sort((a, b) => {
        const getMetricValue = (metrics: MetricsData, key: string): number => {
          const metricsRecord = metrics as unknown as Record<string, number>;
          return metricsRecord[key] ?? 0;
        };

        const aVal =
          sortBy === "label" ? a.label : getMetricValue(a.metrics, sortBy);
        const bVal =
          sortBy === "label" ? b.label : getMetricValue(b.metrics, sortBy);

        if (typeof aVal === "string") {
          return sortOrder === "asc"
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal);
        }
        return sortOrder === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });

      const response: HierarchicalExpandResponseDto = {
        items,
        metadata: { primaryGroupBy, subGroupBy, parentKey },
      };

      // Cache the response
      await this.cacheManager.set(cacheKey, response, 15 * 60 * 1000);

      return response;
    } catch (error) {
      this.logger.error(
        `expandHierarchical error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Process raw report data for hierarchical expansion
   */
  private processHierarchicalExpand(
    rows: RawReportRow[],
    primaryGroupBy: string,
    subGroupBy: SubGroupByOption,
    parentKey: string,
  ): HierarchicalItem[] {
    // First, filter rows that belong to the parent item
    const filteredRows = rows.filter((row) => {
      const rawDomain = row.TOP_PRIVATE_DOMAIN || "";
      const domain = this.cleanDomain(rawDomain);
      const rawKeyValue = row.KEY_VALUES_NAME || "";
      const keyValue = this.cleanKeyValue(rawKeyValue);
      const date = row.DATE || "";

      switch (primaryGroupBy) {
        case "domain":
          // Parent is domain only (aggregate all key-values for the same domain)
          return domain === parentKey;
        case "url": {
          // Parent is the URL slug (path without query params)
          const slug = this.extractSlug(keyValue);
          return slug === parentKey;
        }
        case "url_full":
          // Parent is the full URL (already cleaned)
          return keyValue === parentKey;
        case "date_day":
          // Parent key format: "date|||domain" (composite key)
          // Extract date and domain from parentKey
          if (parentKey.includes("|||")) {
            const [parentDate, parentDomain] = parentKey.split("|||");
            return date === parentDate && domain === parentDomain;
          }
          // Fallback for old format (date only)
          return date === parentKey;
        case "date_week":
          // Parent key format: "weekKey|||domain" (composite key)
          const weekKey = date ? this.getWeekKey(date) : "";
          if (parentKey.includes("|||")) {
            const [parentWeek, parentDomain] = parentKey.split("|||");
            return weekKey === parentWeek && domain === parentDomain;
          }
          // Fallback for old format (week only)
          return weekKey === parentKey;
        case "date_month":
          // Parent key format: "monthKey|||domain" (composite key)
          const monthKey = date ? this.getMonthKey(date) : "";
          if (parentKey.includes("|||")) {
            const [parentMonth, parentDomain] = parentKey.split("|||");
            return monthKey === parentMonth && domain === parentDomain;
          }
          // Fallback for old format (month only)
          return monthKey === parentKey;
        case "country":
          // Parent is country code
          const countryCode = row.COUNTRY_CODE || "";
          return countryCode === parentKey;
        default:
          return false;
      }
    });

    // Now group the filtered rows by subGroupBy
    const groupedData = new Map<
      string,
      {
        key: string;
        label: string;
        childCount: number;
        children: Set<string>;
        country?: string;
        countryCode?: string;
        revenue: number;
        impressions: number;
        clicks: number;
        requests: number;
        viewableImpressions: number;
        measurableImpressions: number;
      }
    >();

    for (const row of filteredRows) {
      const rawDomain = row.TOP_PRIVATE_DOMAIN || "";
      const domain = this.cleanDomain(rawDomain);
      const rawKeyValue = row.KEY_VALUES_NAME || "";
      const keyValue = this.cleanKeyValue(rawKeyValue);
      const date = row.DATE || "";

      // For URL groupings, skip entries that don't look like URLs
      if (subGroupBy === "url" || subGroupBy === "url_full") {
        if (!keyValue.includes("/")) {
          continue;
        }
      }

      let groupKey: string;
      let groupLabel: string;
      let childKey: string;

      switch (subGroupBy) {
        case "date_day":
          groupKey = date;
          groupLabel = this.formatDateLabel(date);
          childKey = `${domain}|||${keyValue}`;
          break;
        case "date_week":
          groupKey = date ? this.getWeekKey(date) : "Unknown";
          groupLabel = this.formatWeekLabel(groupKey);
          childKey = date;
          break;
        case "date_month":
          groupKey = date ? this.getMonthKey(date) : "Unknown";
          groupLabel = this.formatMonthLabel(groupKey);
          childKey = date;
          break;
        case "url": {
          // URL slug only (path without query params)
          const slug = this.extractSlug(keyValue);
          groupKey = slug;
          groupLabel = slug || "/";
          childKey = date;
          break;
        }
        case "url_full":
          // Full URL with query params (already cleaned)
          groupKey = keyValue;
          groupLabel = keyValue || "/";
          childKey = date;
          break;
        case "domain":
          groupKey = domain;
          groupLabel = domain || "Unknown";
          childKey = `${keyValue}|||${date}`;
          break;
        case "country": {
          // Group by country code
          const rowCountryCode = row.COUNTRY_CODE || "";
          const rowCountryName =
            row.COUNTRY_NAME || rowCountryCode || "Unknown";
          groupKey = rowCountryCode || "Unknown";
          groupLabel = rowCountryName;
          childKey = `${domain}|||${date}`;
          break;
        }
        default:
          continue;
      }

      if (!groupedData.has(groupKey)) {
        // For country subGroupBy, store country info
        const countryInfo =
          subGroupBy === "country"
            ? {
                country: row.COUNTRY_NAME || groupKey,
                countryCode: row.COUNTRY_CODE || groupKey,
              }
            : {};

        groupedData.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          childCount: 0,
          children: new Set(),
          ...countryInfo,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          requests: 0,
          viewableImpressions: 0,
          measurableImpressions: 0,
        });
      }

      const data = groupedData.get(groupKey)!;
      if (childKey) data.children.add(childKey);
      data.revenue += row.AD_EXCHANGE_REVENUE || 0;
      data.impressions += row.AD_EXCHANGE_IMPRESSIONS || 0;
      data.clicks += row.AD_EXCHANGE_CLICKS || 0;
      data.requests +=
        row.AD_EXCHANGE_TOTAL_REQUESTS || row.AD_EXCHANGE_IMPRESSIONS || 0;
    }

    // Convert to HierarchicalItem array
    return Array.from(groupedData.values()).map((data) => ({
      key: data.key,
      label: data.label,
      groupType: subGroupBy,
      childCount: data.children.size,
      ...(data.country && { country: data.country }),
      ...(data.countryCode && { countryCode: data.countryCode }),
      metrics: this.calculateMetrics(
        data.revenue,
        data.impressions,
        data.clicks,
      ),
    }));
  }

  /**
   * Format date label for display (e.g., "25/01/2026")
   */
  private formatDateLabel(dateStr: string): string {
    if (!dateStr || dateStr.length !== 10) return dateStr;
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  /**
   * Format week label for display (e.g., "Semana 4, 2026")
   */
  private formatWeekLabel(weekKey: string): string {
    if (!weekKey || !weekKey.includes("-W")) return weekKey;
    const [year, week] = weekKey.split("-W");
    return `Semana ${parseInt(week, 10)}, ${year}`;
  }

  /**
   * Format month label for display (e.g., "Janeiro 2026")
   */
  private formatMonthLabel(monthKey: string): string {
    if (!monthKey || monthKey.length !== 7) return monthKey;
    const [year, month] = monthKey.split("-");
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex] || month} ${year}`;
  }
}
