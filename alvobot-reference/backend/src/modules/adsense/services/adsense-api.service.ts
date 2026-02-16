import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  Inject,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { AdSenseOAuthService } from "./adsense-oauth.service";
import {
  GroupByOption,
  PrimaryGroupBy,
  SubGroupBy,
  HierarchicalAdSenseItem,
  HierarchicalAdSenseExpandResponse,
  AdSenseSummaryResponseDto,
  AdSenseSummaryMetrics,
} from "../dto/adsense-report.dto";
import { RevenueCacheService } from "../../../common/cache";

export interface AdSenseReportRow {
  site: string; // The grouping key (domain, date, url - for frontend compatibility)
  domain?: string; // The actual domain (for date groupings)
  date?: string;
  requestUri?: string; // URL channel (for frontend compatibility)
  pageUrl?: string; // Full URL with query params/UTM (PAGE_URL dimension)
  country?: string; // Country name (COUNTRY_NAME dimension)
  countryCode?: string; // Country code (COUNTRY_CODE dimension)
  metrics: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    rpm: number;
  };
}

export interface AdSenseReportResponse {
  rows: AdSenseReportRow[];
  totals: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    rpm: number;
  };
  metadata: {
    accountId: string;
    currencyCode: string;
    dateRange: {
      start: string;
      end: string;
    };
    cachedAt?: string;
  };
}

interface ReportParams {
  connectionId: string;
  accountId: string;
  startDate: string;
  endDate: string;
  dimensions?: ("DATE" | "DOMAIN_NAME" | "URL_CHANNEL_NAME")[];
  groupBy?: GroupByOption;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

@Injectable()
export class AdSenseApiService {
  private readonly logger = new Logger(AdSenseApiService.name);

  // AdSense API Base URL
  private readonly ADSENSE_API_BASE = "https://adsense.googleapis.com/v2";

  // Report metrics to request (valid AdSense API v2 metrics)
  private readonly REPORT_METRICS = [
    "ESTIMATED_EARNINGS",
    "IMPRESSIONS",
    "CLICKS",
    "IMPRESSIONS_CTR", // CTR based on impressions
    "COST_PER_CLICK",
    "IMPRESSIONS_RPM", // RPM based on impressions
  ];

  constructor(
    private readonly adSenseOAuthService: AdSenseOAuthService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly revenueCacheService: RevenueCacheService,
  ) {}

  /**
   * Extract slug (path without query params) from a URL
   * Handles formats like:
   * - "https://example.com/path?param=value" -> "/path"
   * - "/path?param=value" -> "/path"
   */
  private extractSlug(url: string): string {
    let path = url;

    // Handle full URL format
    if (path.startsWith("http://") || path.startsWith("https://")) {
      try {
        const urlObj = new URL(path);
        path = urlObj.pathname;
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
   * Get week number for a date (ISO week)
   */
  private getWeekKey(dateStr: string): string {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
    );
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
   * Generate AdSense report
   */
  async generateReport(
    params: ReportParams,
    userId: string,
  ): Promise<AdSenseReportResponse> {
    const {
      connectionId,
      accountId,
      startDate,
      endDate,
      groupBy = "domain",
      sortBy,
      sortOrder,
    } = params;

    // Determine dimensions based on groupBy
    // For URL-based grouping, we need PAGE_URL dimension (not URL_CHANNEL_NAME)
    // Always include COUNTRY_CODE for country breakdown capability
    // Note: AdSense API has limitations on dimension combinations - some can't be combined
    let dimensions: (
      | "DATE"
      | "DOMAIN_NAME"
      | "URL_CHANNEL_NAME"
      | "PAGE_URL"
      | "COUNTRY_CODE"
      | "COUNTRY_NAME"
    )[];
    switch (groupBy) {
      case "country":
        // Group by country - include domain for drill-down
        dimensions = ["COUNTRY_CODE", "COUNTRY_NAME", "DOMAIN_NAME"];
        break;
      case "date_day":
      case "date_week":
      case "date_month":
        // Include country for filtering capability
        dimensions = ["DATE", "DOMAIN_NAME", "COUNTRY_CODE"];
        break;
      case "url":
      case "url_full":
        // Both use PAGE_URL - the difference is in how we aggregate (slug vs full)
        // PAGE_URL already includes full URL with UTM params
        dimensions = ["PAGE_URL"];
        break;
      case "domain":
      default:
        // Include country for filtering capability
        dimensions = ["DOMAIN_NAME", "COUNTRY_CODE"];
        break;
    }

    // Get connection with valid token
    const connection =
      await this.adSenseOAuthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );

    // Check cache first
    const cacheKey = `adsense:report:${connectionId}:${accountId}:${startDate}:${endDate}:${groupBy}`;
    const cachedData =
      await this.cacheManager.get<AdSenseReportResponse>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for AdSense report: ${cacheKey}`);
      return cachedData;
    }

    try {
      // Build report URL with query parameters
      const reportParams = new URLSearchParams();

      // Date range
      const [startYear, startMonth, startDay] = startDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

      reportParams.append("dateRange", "CUSTOM");
      reportParams.append("startDate.year", startYear.toString());
      reportParams.append("startDate.month", startMonth.toString());
      reportParams.append("startDate.day", startDay.toString());
      reportParams.append("endDate.year", endYear.toString());
      reportParams.append("endDate.month", endMonth.toString());
      reportParams.append("endDate.day", endDay.toString());

      // Add dimensions
      dimensions.forEach((dim) => reportParams.append("dimensions", dim));

      // Add metrics
      this.REPORT_METRICS.forEach((metric) =>
        reportParams.append("metrics", metric),
      );

      const url = `${this.ADSENSE_API_BASE}/accounts/${accountId}/reports:generate?${reportParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error("AdSense report API error:", errorData);
        throw new BadRequestException(
          errorData.error?.message || "Failed to generate AdSense report",
        );
      }

      const data = await response.json();

      // Parse the response with groupBy processing
      const reportResponse = this.parseReportResponse(
        data,
        dimensions,
        startDate,
        endDate,
        accountId,
        groupBy,
      );

      // Sort if requested
      if (sortBy && reportResponse.rows.length > 0) {
        const multiplier = sortOrder === "asc" ? 1 : -1;
        reportResponse.rows.sort((a, b) => {
          // Handle sorting by metrics
          const aVal =
            sortBy === "site"
              ? a.site
              : ((a.metrics as Record<string, number>)[sortBy] ?? 0);
          const bVal =
            sortBy === "site"
              ? b.site
              : ((b.metrics as Record<string, number>)[sortBy] ?? 0);
          if (typeof aVal === "number" && typeof bVal === "number") {
            return (aVal - bVal) * multiplier;
          }
          return String(aVal).localeCompare(String(bVal)) * multiplier;
        });
      }

      // Cache the result
      await this.cacheManager.set(cacheKey, reportResponse, 5 * 60 * 1000); // 5 minutes

      return reportResponse;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error("Error generating AdSense report:", error);
      throw new InternalServerErrorException(
        "Failed to generate AdSense report",
      );
    }
  }

  /**
   * Get summary metrics (aggregated totals only, no dimensions)
   * This is optimized for initial page load - fetches minimal data
   */
  async getSummary(
    params: {
      connectionId: string;
      accountId: string;
      startDate: string;
      endDate: string;
      forceRefresh?: boolean;
    },
    userId: string,
  ): Promise<AdSenseSummaryResponseDto> {
    const {
      connectionId,
      accountId,
      startDate,
      endDate,
      forceRefresh = false,
    } = params;

    // Build cache key using RevenueCacheService
    const cacheKey = this.revenueCacheService.buildSummaryKey(
      "adsense",
      connectionId,
      accountId,
      startDate,
      endDate,
    );

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached =
        await this.revenueCacheService.get<AdSenseSummaryResponseDto>(cacheKey);
      if (cached) {
        this.logger.log(`Summary cache hit for ${cacheKey}`);
        return cached;
      }
    }

    // Get connection with valid token
    const connection =
      await this.adSenseOAuthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );

    try {
      // Build report URL - NO dimensions for summary (aggregated totals)
      const reportParams = new URLSearchParams();

      // Date range
      const [startYear, startMonth, startDay] = startDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

      reportParams.append("dateRange", "CUSTOM");
      reportParams.append("startDate.year", startYear.toString());
      reportParams.append("startDate.month", startMonth.toString());
      reportParams.append("startDate.day", startDay.toString());
      reportParams.append("endDate.year", endYear.toString());
      reportParams.append("endDate.month", endMonth.toString());
      reportParams.append("endDate.day", endDay.toString());

      // NO dimensions - just metrics for aggregated totals
      this.REPORT_METRICS.forEach((metric) =>
        reportParams.append("metrics", metric),
      );

      const url = `${this.ADSENSE_API_BASE}/accounts/${accountId}/reports:generate?${reportParams.toString()}`;

      this.logger.log(
        `Generating AdSense summary report for account ${accountId}`,
      );

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error("AdSense summary report API error:", errorData);
        throw new BadRequestException(
          errorData.error?.message ||
            "Failed to generate AdSense summary report",
        );
      }

      const data = await response.json();

      // Parse summary metrics
      const summaryMetrics = this.parseSummaryResponse(data);

      // Get currency from response
      let currencyCode = "USD";
      const headers = data.headers || [];
      const rows = data.rows || [];
      if (rows.length > 0) {
        const earningsIndex = headers.findIndex(
          (h: any) => h.name === "ESTIMATED_EARNINGS",
        );
        if (
          earningsIndex >= 0 &&
          rows[0].cells?.[earningsIndex]?.currencyCode
        ) {
          currencyCode = rows[0].cells[earningsIndex].currencyCode;
        }
      }

      // Calculate TTL based on date range
      const ttl = this.revenueCacheService.calculateTTL(startDate, endDate);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ttl);

      const summaryResponse: AdSenseSummaryResponseDto = {
        metrics: summaryMetrics,
        metadata: {
          accountId,
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
      await this.revenueCacheService.set(
        cacheKey,
        summaryResponse,
        startDate,
        endDate,
      );

      this.logger.log(
        `AdSense summary report completed: revenue=${summaryMetrics.revenue.toFixed(2)}, impressions=${summaryMetrics.impressions}`,
      );

      return summaryResponse;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error("Error generating AdSense summary report:", error);
      throw new InternalServerErrorException(
        "Failed to generate AdSense summary report",
      );
    }
  }

  /**
   * Parse AdSense API response into summary metrics (no dimensions)
   */
  private parseSummaryResponse(data: any): AdSenseSummaryMetrics {
    const headers = data.headers || [];
    const rows = data.rows || [];

    // Map header names to indices
    const headerMap: Record<string, number> = {};
    headers.forEach((header: any, index: number) => {
      headerMap[header.name] = index;
    });

    // Aggregate all rows (should be just 1 for summary without dimensions)
    let totalRevenue = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    for (const row of rows) {
      const cells = row.cells || [];

      if (headerMap["ESTIMATED_EARNINGS"] !== undefined) {
        totalRevenue += parseFloat(
          cells[headerMap["ESTIMATED_EARNINGS"]]?.value || "0",
        );
      }
      if (headerMap["IMPRESSIONS"] !== undefined) {
        totalImpressions += parseInt(
          cells[headerMap["IMPRESSIONS"]]?.value || "0",
          10,
        );
      }
      if (headerMap["CLICKS"] !== undefined) {
        totalClicks += parseInt(cells[headerMap["CLICKS"]]?.value || "0", 10);
      }
    }

    // Calculate derived metrics
    const ctr =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalRevenue / totalClicks : 0;
    const rpm =
      totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;

    return {
      revenue: totalRevenue,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr,
      cpc,
      rpm,
    };
  }

  /**
   * Parse AdSense API response into typed rows
   * Returns data in a format compatible with the frontend (similar to Ad Manager)
   */
  private parseReportResponse(
    data: any,
    dimensions: string[],
    startDate: string,
    endDate: string,
    accountId: string,
    groupBy: GroupByOption = "domain",
  ): AdSenseReportResponse {
    const headers = data.headers || [];

    // Get currency from first row or default to USD
    let currencyCode = "USD";

    // Map header names to indices
    const headerMap: Record<string, number> = {};
    headers.forEach((header: any, index: number) => {
      headerMap[header.name] = index;
    });

    // First pass: collect raw rows
    const rawRows: Array<{
      domain: string;
      date: string;
      url: string;
      countryCode: string;
      countryName: string;
      revenue: number;
      impressions: number;
      clicks: number;
      ctr: number;
      cpc: number;
      rpm: number;
    }> = [];

    (data.rows || []).forEach((row: any) => {
      const cells = row.cells || [];

      // Parse metrics
      let revenue = 0;
      let impressions = 0;
      let clicks = 0;
      let ctr = 0;
      let cpc = 0;
      let rpm = 0;

      if (headerMap["ESTIMATED_EARNINGS"] !== undefined) {
        const earningsCell = cells[headerMap["ESTIMATED_EARNINGS"]];
        revenue = parseFloat(earningsCell?.value || "0");
        if (earningsCell?.currencyCode) {
          currencyCode = earningsCell.currencyCode;
        }
      }
      if (headerMap["IMPRESSIONS"] !== undefined) {
        impressions = parseInt(
          cells[headerMap["IMPRESSIONS"]]?.value || "0",
          10,
        );
      }
      if (headerMap["CLICKS"] !== undefined) {
        clicks = parseInt(cells[headerMap["CLICKS"]]?.value || "0", 10);
      }
      if (headerMap["IMPRESSIONS_CTR"] !== undefined) {
        ctr = parseFloat(cells[headerMap["IMPRESSIONS_CTR"]]?.value || "0");
      }
      if (headerMap["COST_PER_CLICK"] !== undefined) {
        cpc = parseFloat(cells[headerMap["COST_PER_CLICK"]]?.value || "0");
      }
      if (headerMap["IMPRESSIONS_RPM"] !== undefined) {
        rpm = parseFloat(cells[headerMap["IMPRESSIONS_RPM"]]?.value || "0");
      }

      // Parse dimensions
      const domain =
        headerMap["DOMAIN_NAME"] !== undefined
          ? cells[headerMap["DOMAIN_NAME"]]?.value || ""
          : "";
      const date =
        headerMap["DATE"] !== undefined
          ? cells[headerMap["DATE"]]?.value || ""
          : "";
      // URL can come from either URL_CHANNEL_NAME or PAGE_URL
      let url = "";
      if (headerMap["PAGE_URL"] !== undefined) {
        url = cells[headerMap["PAGE_URL"]]?.value || "";
      } else if (headerMap["URL_CHANNEL_NAME"] !== undefined) {
        url = cells[headerMap["URL_CHANNEL_NAME"]]?.value || "";
      }
      // Country dimensions
      const countryCode =
        headerMap["COUNTRY_CODE"] !== undefined
          ? cells[headerMap["COUNTRY_CODE"]]?.value || ""
          : "";
      const countryName =
        headerMap["COUNTRY_NAME"] !== undefined
          ? cells[headerMap["COUNTRY_NAME"]]?.value || ""
          : "";

      rawRows.push({
        domain,
        date,
        url,
        countryCode,
        countryName,
        revenue,
        impressions,
        clicks,
        ctr,
        cpc,
        rpm,
      });
    });

    // Second pass: aggregate based on groupBy
    // For date groupings, we keep each domain separate (key = date + domain)
    // This allows the frontend to either show per-domain or aggregate
    const aggregatedMap = new Map<
      string,
      {
        site: string;
        domain?: string; // The actual domain for date groupings
        date?: string;
        requestUri?: string;
        pageUrl?: string; // Full URL with UTM params
        country?: string;
        countryCode?: string;
        revenue: number;
        impressions: number;
        clicks: number;
      }
    >();

    for (const row of rawRows) {
      let key: string;
      let site: string;
      let domain: string | undefined;
      let date: string | undefined;
      let requestUri: string | undefined;
      let pageUrl: string | undefined;
      let country: string | undefined;
      let countryCode: string | undefined;

      switch (groupBy) {
        case "country":
          // Group by country
          key = row.countryCode || row.countryName || "Unknown";
          site = row.countryName || row.countryCode || "Unknown";
          country = row.countryName;
          countryCode = row.countryCode;
          domain = row.domain || "Unknown";
          break;
        case "date_day":
          // Key includes domain to keep domains separate
          // Frontend can aggregate if needed
          key = `${row.date}|||${row.domain}`;
          // Format: DD/MM/YYYY to match Ad Manager
          site = this.formatDateLabel(row.date) || "Unknown";
          domain = row.domain || "Unknown";
          date = row.date;
          countryCode = row.countryCode;
          break;
        case "date_week":
          const weekKey = row.date ? this.getWeekKey(row.date) : "Unknown";
          // Key includes domain to keep domains separate
          key = `${weekKey}|||${row.domain}`;
          // Format: "Semana N, YYYY" to match Ad Manager
          site = this.formatWeekLabel(weekKey);
          domain = row.domain || "Unknown";
          countryCode = row.countryCode;
          break;
        case "date_month":
          const monthKey = row.date ? this.getMonthKey(row.date) : "Unknown";
          // Key includes domain to keep domains separate
          key = `${monthKey}|||${row.domain}`;
          // Format: "Mês YYYY" to match Ad Manager
          site = this.formatMonthLabel(monthKey);
          domain = row.domain || "Unknown";
          countryCode = row.countryCode;
          break;
        case "url":
          // Extract slug only (path without query params)
          const slug = this.extractSlug(row.url);
          key = slug;
          site = slug || "Unknown";
          requestUri = slug;
          pageUrl = row.url; // Keep full URL for reference
          break;
        case "url_full":
          // Keep full URL with query params (includes UTM!)
          key = row.url;
          site = row.url || "Unknown";
          requestUri = row.url;
          pageUrl = row.url;
          break;
        case "domain":
        default:
          key = row.domain;
          site = row.domain || "Unknown";
          domain = row.domain;
          countryCode = row.countryCode;
          break;
      }

      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          site,
          domain,
          date,
          requestUri,
          pageUrl,
          country,
          countryCode,
          revenue: 0,
          impressions: 0,
          clicks: 0,
        });
      }

      const agg = aggregatedMap.get(key)!;
      agg.revenue += row.revenue;
      agg.impressions += row.impressions;
      agg.clicks += row.clicks;
    }

    // Convert to rows with calculated metrics
    const rows: AdSenseReportRow[] = Array.from(aggregatedMap.values()).map(
      (agg) => ({
        site: agg.site,
        domain: agg.domain,
        date: agg.date,
        requestUri: agg.requestUri,
        pageUrl: agg.pageUrl,
        country: agg.country,
        countryCode: agg.countryCode,
        metrics: {
          revenue: agg.revenue,
          impressions: agg.impressions,
          clicks: agg.clicks,
          ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
          cpc: agg.clicks > 0 ? agg.revenue / agg.clicks : 0,
          rpm: agg.impressions > 0 ? (agg.revenue / agg.impressions) * 1000 : 0,
        },
      }),
    );

    // Calculate totals
    const totals = rows.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.metrics.revenue,
        impressions: acc.impressions + row.metrics.impressions,
        clicks: acc.clicks + row.metrics.clicks,
        ctr: 0,
        cpc: 0,
        rpm: 0,
      }),
      { revenue: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, rpm: 0 },
    );

    // Calculate averages for rates
    if (totals.impressions > 0) {
      totals.ctr = (totals.clicks / totals.impressions) * 100;
      totals.rpm = (totals.revenue / totals.impressions) * 1000;
    }
    if (totals.clicks > 0) {
      totals.cpc = totals.revenue / totals.clicks;
    }

    return {
      rows,
      totals,
      metadata: {
        accountId,
        currencyCode,
        dateRange: {
          start: startDate,
          end: endDate,
        },
      },
    };
  }

  /**
   * Expand report - get dates for a site or URLs for a date
   */
  async expandReport(
    params: {
      connectionId: string;
      accountId: string;
      startDate: string;
      endDate: string;
      level: "date" | "url";
      parentSite: string;
      parentDate?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    },
    userId: string,
  ): Promise<{ items: any[] }> {
    const {
      connectionId,
      accountId,
      startDate,
      endDate,
      level,
      parentSite,
      parentDate,
      sortBy,
      sortOrder,
    } = params;

    // Get connection with valid token
    const connection =
      await this.adSenseOAuthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );

    // Build cache key
    const cacheKey = `adsense:expand:${connectionId}:${accountId}:${parentSite}:${startDate}:${endDate}:${level}${parentDate ? `:${parentDate}` : ""}`;
    const cachedData = await this.cacheManager.get<{ items: any[] }>(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for AdSense expand: ${cacheKey}`);
      return cachedData;
    }

    try {
      // Build report URL with query parameters
      const reportParams = new URLSearchParams();

      // Date range - for URL level with parentDate, use single day
      const effectiveStartDate =
        level === "url" && parentDate ? parentDate : startDate;
      const effectiveEndDate =
        level === "url" && parentDate ? parentDate : endDate;

      const [startYear, startMonth, startDay] = effectiveStartDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = effectiveEndDate
        .split("-")
        .map(Number);

      reportParams.append("dateRange", "CUSTOM");
      reportParams.append("startDate.year", startYear.toString());
      reportParams.append("startDate.month", startMonth.toString());
      reportParams.append("startDate.day", startDay.toString());
      reportParams.append("endDate.year", endYear.toString());
      reportParams.append("endDate.month", endMonth.toString());
      reportParams.append("endDate.day", endDay.toString());

      // Add dimensions based on level
      // Note: AdSense API has limitations on dimension combinations
      // DOMAIN_NAME + DATE works for date expansion
      // For URL expansion, we use PAGE_URL only (filtered by site in a separate step)
      if (level === "date") {
        // Expanding site to dates: DATE only (filtered by domain)
        reportParams.append("dimensions", "DATE");
      } else {
        // Expanding date to URLs: PAGE_URL only
        // Note: We can't combine DOMAIN_NAME with PAGE_URL in AdSense API
        reportParams.append("dimensions", "PAGE_URL");
      }

      // Add metrics
      this.REPORT_METRICS.forEach((metric) =>
        reportParams.append("metrics", metric),
      );

      // Add filter for the parent site
      // Note: DOMAIN_NAME filter works with DATE dimension, but not with PAGE_URL
      // For URL level, we'll filter results post-query by checking if URL contains the domain
      if (level === "date") {
        reportParams.append("filters", `DOMAIN_NAME==${parentSite}`);
      }
      // For URL level, we don't add a domain filter - we filter post-query

      const url = `${this.ADSENSE_API_BASE}/accounts/${accountId}/reports:generate?${reportParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error("AdSense expand API error:", errorData);
        throw new BadRequestException(
          errorData.error?.message || "Failed to expand AdSense report",
        );
      }

      const data = await response.json();

      // Parse the response
      let items = this.parseExpandResponse(data, level);

      // For URL level, filter results to only include URLs from the parent site
      if (level === "url" && parentSite) {
        items = items.filter((item) => {
          const url = item.requestUri || "";
          // Check if URL contains the parent site domain
          // Handle both full URLs (https://site.com/path) and partial URLs
          try {
            const urlObj = new URL(
              url.startsWith("http") ? url : `https://${url}`,
            );
            const urlHost = urlObj.hostname.replace(/^www\./, "");
            const parentHost = parentSite.replace(/^www\./, "");
            return urlHost === parentHost || urlHost.endsWith(`.${parentHost}`);
          } catch {
            // Fallback: simple string matching
            return url.toLowerCase().includes(parentSite.toLowerCase());
          }
        });
      }

      // Sort if requested
      if (sortBy && items.length > 0) {
        const multiplier = sortOrder === "asc" ? 1 : -1;
        items.sort((a, b) => {
          const aVal =
            sortBy === "date" || sortBy === "url"
              ? a.date || a.url || ""
              : ((a.metrics as Record<string, number>)[sortBy] ?? 0);
          const bVal =
            sortBy === "date" || sortBy === "url"
              ? b.date || b.url || ""
              : ((b.metrics as Record<string, number>)[sortBy] ?? 0);
          if (typeof aVal === "number" && typeof bVal === "number") {
            return (aVal - bVal) * multiplier;
          }
          return String(aVal).localeCompare(String(bVal)) * multiplier;
        });
      }

      const result = { items };

      // Cache the result
      await this.cacheManager.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error("Error expanding AdSense report:", error);
      throw new InternalServerErrorException("Failed to expand AdSense report");
    }
  }

  /**
   * Parse expand response into date or URL items
   */
  private parseExpandResponse(data: any, level: "date" | "url"): any[] {
    const headers = data.headers || [];
    const items: any[] = [];

    // Map header names to indices
    const headerMap: Record<string, number> = {};
    headers.forEach((header: any, index: number) => {
      headerMap[header.name] = index;
    });

    // Parse rows
    (data.rows || []).forEach((row: any) => {
      const cells = row.cells || [];

      // Parse metrics
      let revenue = 0;
      let impressions = 0;
      let clicks = 0;
      let ctr = 0;
      let cpc = 0;
      let rpm = 0;

      if (headerMap["ESTIMATED_EARNINGS"] !== undefined) {
        revenue = parseFloat(
          cells[headerMap["ESTIMATED_EARNINGS"]]?.value || "0",
        );
      }
      if (headerMap["IMPRESSIONS"] !== undefined) {
        impressions = parseInt(
          cells[headerMap["IMPRESSIONS"]]?.value || "0",
          10,
        );
      }
      if (headerMap["CLICKS"] !== undefined) {
        clicks = parseInt(cells[headerMap["CLICKS"]]?.value || "0", 10);
      }
      if (headerMap["IMPRESSIONS_CTR"] !== undefined) {
        ctr = parseFloat(cells[headerMap["IMPRESSIONS_CTR"]]?.value || "0");
      }
      if (headerMap["COST_PER_CLICK"] !== undefined) {
        cpc = parseFloat(cells[headerMap["COST_PER_CLICK"]]?.value || "0");
      }
      if (headerMap["IMPRESSIONS_RPM"] !== undefined) {
        rpm = parseFloat(cells[headerMap["IMPRESSIONS_RPM"]]?.value || "0");
      }

      const metrics = { revenue, impressions, clicks, ctr, cpc, rpm };

      if (level === "date") {
        // Parse date
        const date =
          headerMap["DATE"] !== undefined
            ? cells[headerMap["DATE"]]?.value
            : "";

        items.push({
          date,
          childCount: 0, // AdSense doesn't provide URL count per date
          metrics,
        });
      } else {
        // Parse URL - support both PAGE_URL and URL_CHANNEL_NAME headers
        let url = "";
        if (headerMap["PAGE_URL"] !== undefined) {
          url = cells[headerMap["PAGE_URL"]]?.value || "";
        } else if (headerMap["URL_CHANNEL_NAME"] !== undefined) {
          url = cells[headerMap["URL_CHANNEL_NAME"]]?.value || "";
        }

        items.push({
          requestUri: url || "/",
          metrics,
        });
      }
    });

    return items;
  }

  /**
   * Hierarchical expand - flexible drill-down with any sub-grouping
   * Similar to Ad Manager's expandHierarchical
   */
  async expandHierarchical(
    params: {
      connectionId: string;
      accountId: string;
      startDate: string;
      endDate: string;
      primaryGroupBy: PrimaryGroupBy;
      subGroupBy: SubGroupBy;
      parentKey: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      forceRefresh?: boolean;
    },
    userId: string,
  ): Promise<HierarchicalAdSenseExpandResponse> {
    const {
      connectionId,
      accountId,
      startDate,
      endDate,
      primaryGroupBy,
      subGroupBy,
      parentKey: rawParentKey,
      sortBy,
      sortOrder = "desc",
      forceRefresh = false,
    } = params;

    // Extract actual key from unified format (source|||key or just key)
    // Frontend may send "www.example.com|||www.example.com" for unified rows
    const parentKey = rawParentKey.includes("|||")
      ? rawParentKey.split("|||").pop() || rawParentKey
      : rawParentKey;

    // Build cache key
    const cacheKey = `adsense:hierarchical:${connectionId}:${accountId}:${startDate}:${endDate}:${primaryGroupBy}:${subGroupBy}:${parentKey}`;

    if (!forceRefresh) {
      const cachedData =
        await this.cacheManager.get<HierarchicalAdSenseExpandResponse>(
          cacheKey,
        );
      if (cachedData) {
        this.logger.log(
          `Cache hit for AdSense hierarchical expand: ${cacheKey}`,
        );
        return cachedData;
      }
    }

    // Get connection with valid token
    const connection =
      await this.adSenseOAuthService.getConnectionWithValidToken(
        connectionId,
        userId,
      );

    try {
      // Build report URL with query parameters
      const reportParams = new URLSearchParams();

      // Date range - determine effective dates based on parentKey if it's a date
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;

      // If primaryGroupBy is a date type, parentKey is the date/week/month key
      if (primaryGroupBy.startsWith("date_")) {
        // For date groupings, we need to filter by the parent date period
        if (primaryGroupBy === "date_day") {
          // Validate parentKey is a valid date format (YYYY-MM-DD)
          const dateMatch = parentKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (!dateMatch) {
            this.logger.warn(
              `Invalid date format for parentKey: ${parentKey}, using original date range`,
            );
          } else {
            effectiveStartDate = parentKey;
            effectiveEndDate = parentKey;
            this.logger.log(
              `Expanding date_day: ${parentKey}, subGroupBy: ${subGroupBy}`,
            );
          }
        } else if (primaryGroupBy === "date_week") {
          // parentKey format: YYYY-Wnn
          const weekDates = this.getWeekDateRange(parentKey);
          effectiveStartDate = weekDates.start;
          effectiveEndDate = weekDates.end;
        } else if (primaryGroupBy === "date_month") {
          // parentKey format: YYYY-MM
          const monthDates = this.getMonthDateRange(parentKey);
          effectiveStartDate = monthDates.start;
          effectiveEndDate = monthDates.end;
        }
      }

      this.logger.log(
        `AdSense hierarchical expand - effective date range: ${effectiveStartDate} to ${effectiveEndDate}`,
      );
      this.logger.log(
        `AdSense hierarchical expand - dimensions will be based on subGroupBy: ${subGroupBy}`,
      );

      const [startYear, startMonth, startDay] = effectiveStartDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = effectiveEndDate
        .split("-")
        .map(Number);

      reportParams.append("dateRange", "CUSTOM");
      reportParams.append("startDate.year", startYear.toString());
      reportParams.append("startDate.month", startMonth.toString());
      reportParams.append("startDate.day", startDay.toString());
      reportParams.append("endDate.year", endYear.toString());
      reportParams.append("endDate.month", endMonth.toString());
      reportParams.append("endDate.day", endDay.toString());

      // Determine dimensions based on subGroupBy
      const dimensions: string[] = [];
      let filterDomain: string | null = null;

      if (subGroupBy === "none" || subGroupBy === "total") {
        // No sub-grouping needed - just aggregate
        // Still need a dimension for the API, use DOMAIN_NAME
        dimensions.push("DOMAIN_NAME");
      } else if (
        subGroupBy === "date_day" ||
        subGroupBy === "date_week" ||
        subGroupBy === "date_month"
      ) {
        dimensions.push("DATE");
        // If primary is domain, filter by domain
        if (primaryGroupBy === "domain") {
          filterDomain = parentKey;
        }
      } else if (subGroupBy === "url" || subGroupBy === "url_full") {
        // Both url (slug) and url_full use PAGE_URL dimension
        // The difference is how we aggregate: by slug or full URL
        dimensions.push("PAGE_URL");
        // If primary is domain, filter by domain (post-query)
        if (primaryGroupBy === "domain") {
          filterDomain = parentKey;
        }
      } else if (subGroupBy === "domain") {
        dimensions.push("DOMAIN_NAME");
      } else if (subGroupBy === "country") {
        dimensions.push("COUNTRY_CODE");
        dimensions.push("COUNTRY_NAME");
        // If primary is domain, filter by domain (post-query)
        if (primaryGroupBy === "domain") {
          filterDomain = parentKey;
        }
      }

      // For country primaryGroupBy, add country dimensions to filter by parent country
      let filterCountryCode: string | null = null;
      if (primaryGroupBy === "country") {
        // Parent key is the country code
        filterCountryCode = parentKey;
        // Add COUNTRY_CODE dimension if not already added for proper filtering
        if (!dimensions.includes("COUNTRY_CODE")) {
          dimensions.push("COUNTRY_CODE");
        }
      }

      // Add dimensions
      dimensions.forEach((dim) => reportParams.append("dimensions", dim));

      // Add metrics
      this.REPORT_METRICS.forEach((metric) =>
        reportParams.append("metrics", metric),
      );

      // Add domain filter if needed (for DATE dimension, filter works)
      if (
        filterDomain &&
        (subGroupBy === "date_day" ||
          subGroupBy === "date_week" ||
          subGroupBy === "date_month")
      ) {
        reportParams.append("filters", `DOMAIN_NAME==${filterDomain}`);
      }

      const url = `${this.ADSENSE_API_BASE}/accounts/${accountId}/reports:generate?${reportParams.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.error("AdSense hierarchical expand API error:", errorData);
        throw new BadRequestException(
          errorData.error?.message || "Failed to expand AdSense report",
        );
      }

      const data = await response.json();

      // Parse response into hierarchical items
      const items = this.parseHierarchicalResponse(
        data,
        subGroupBy,
        filterDomain,
        filterCountryCode,
      );

      // Sort items
      if (sortBy && items.length > 0) {
        const multiplier = sortOrder === "asc" ? 1 : -1;
        items.sort((a, b) => {
          const aVal =
            sortBy === "key" || sortBy === "label"
              ? a[sortBy as "key" | "label"]
              : ((a.metrics as Record<string, number>)[sortBy] ?? 0);
          const bVal =
            sortBy === "key" || sortBy === "label"
              ? b[sortBy as "key" | "label"]
              : ((b.metrics as Record<string, number>)[sortBy] ?? 0);
          if (typeof aVal === "number" && typeof bVal === "number") {
            return (aVal - bVal) * multiplier;
          }
          return String(aVal).localeCompare(String(bVal)) * multiplier;
        });
      }

      this.logger.log(
        `AdSense hierarchical expand - returning ${items.length} items for parentKey: ${parentKey}`,
      );
      if (items.length > 0) {
        this.logger.log(
          `AdSense hierarchical expand - first item: key=${items[0].key}, label=${items[0].label}, groupType=${items[0].groupType}`,
        );
      }

      const result: HierarchicalAdSenseExpandResponse = {
        items,
        metadata: {
          primaryGroupBy,
          subGroupBy,
          parentKey,
        },
      };

      // Cache the result
      await this.cacheManager.set(cacheKey, result, 5 * 60 * 1000); // 5 minutes

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error("Error in AdSense hierarchical expand:", error);
      throw new InternalServerErrorException("Failed to expand AdSense report");
    }
  }

  /**
   * Parse hierarchical response into items
   */
  private parseHierarchicalResponse(
    data: any,
    subGroupBy: SubGroupBy,
    filterDomain: string | null,
    filterCountryCode: string | null = null,
  ): HierarchicalAdSenseItem[] {
    const headers = data.headers || [];
    const items: HierarchicalAdSenseItem[] = [];

    // Map header names to indices
    const headerMap: Record<string, number> = {};
    headers.forEach((header: any, index: number) => {
      headerMap[header.name] = index;
    });

    // Aggregation map for date groupings
    const aggregatedMap = new Map<
      string,
      {
        key: string;
        label: string;
        groupType: string;
        country?: string;
        countryCode?: string;
        revenue: number;
        impressions: number;
        clicks: number;
      }
    >();

    // Parse rows
    (data.rows || []).forEach((row: any) => {
      const cells = row.cells || [];

      // Parse metrics
      let revenue = 0;
      let impressions = 0;
      let clicks = 0;

      if (headerMap["ESTIMATED_EARNINGS"] !== undefined) {
        revenue = parseFloat(
          cells[headerMap["ESTIMATED_EARNINGS"]]?.value || "0",
        );
      }
      if (headerMap["IMPRESSIONS"] !== undefined) {
        impressions = parseInt(
          cells[headerMap["IMPRESSIONS"]]?.value || "0",
          10,
        );
      }
      if (headerMap["CLICKS"] !== undefined) {
        clicks = parseInt(cells[headerMap["CLICKS"]]?.value || "0", 10);
      }

      // Filter by country code if needed (for country primaryGroupBy)
      if (filterCountryCode) {
        const rowCountryCode =
          headerMap["COUNTRY_CODE"] !== undefined
            ? cells[headerMap["COUNTRY_CODE"]]?.value || ""
            : "";
        if (rowCountryCode !== filterCountryCode) {
          return; // Skip this row - doesn't match parent country
        }
      }

      // Determine key and label based on subGroupBy
      let key = "";
      let label = "";
      let groupType = subGroupBy;

      if (subGroupBy === "date_day") {
        const date =
          headerMap["DATE"] !== undefined
            ? cells[headerMap["DATE"]]?.value || ""
            : "";
        key = date;
        // Format label to match Ad Manager: "25/01/2026" (DD/MM/YYYY)
        label = this.formatDateLabel(date);
        groupType = "date_day";
      } else if (subGroupBy === "date_week") {
        const date =
          headerMap["DATE"] !== undefined
            ? cells[headerMap["DATE"]]?.value || ""
            : "";
        const weekKey = date ? this.getWeekKey(date) : "Unknown";
        key = weekKey;
        // Format label to match Ad Manager: "Semana 4, 2026"
        label = this.formatWeekLabel(weekKey);
        groupType = "date_week";
      } else if (subGroupBy === "date_month") {
        const date =
          headerMap["DATE"] !== undefined
            ? cells[headerMap["DATE"]]?.value || ""
            : "";
        const monthKey = date ? this.getMonthKey(date) : "Unknown";
        key = monthKey;
        // Format label to match Ad Manager: "Janeiro 2026"
        label = this.formatMonthLabel(monthKey);
        groupType = "date_month";
      } else if (subGroupBy === "url") {
        // URL slug only (path without query params)
        let url = "";
        if (headerMap["PAGE_URL"] !== undefined) {
          url = cells[headerMap["PAGE_URL"]]?.value || "";
        }

        // Filter by domain if needed
        if (filterDomain && url) {
          try {
            const urlObj = new URL(
              url.startsWith("http") ? url : `https://${url}`,
            );
            const urlHost = urlObj.hostname.replace(/^www\./, "");
            const parentHost = filterDomain.replace(/^www\./, "");
            if (urlHost !== parentHost && !urlHost.endsWith(`.${parentHost}`)) {
              return; // Skip this row
            }
          } catch {
            if (!url.toLowerCase().includes(filterDomain.toLowerCase())) {
              return; // Skip this row
            }
          }
        }

        // Extract slug (path without query params)
        const slug = this.extractSlug(url);
        key = slug || "/";
        label = slug || "/";
        groupType = "url";
      } else if (subGroupBy === "url_full") {
        // Full URL with query params
        let url = "";
        if (headerMap["PAGE_URL"] !== undefined) {
          url = cells[headerMap["PAGE_URL"]]?.value || "";
        }

        // Filter by domain if needed
        if (filterDomain && url) {
          try {
            const urlObj = new URL(
              url.startsWith("http") ? url : `https://${url}`,
            );
            const urlHost = urlObj.hostname.replace(/^www\./, "");
            const parentHost = filterDomain.replace(/^www\./, "");
            if (urlHost !== parentHost && !urlHost.endsWith(`.${parentHost}`)) {
              return; // Skip this row
            }
          } catch {
            if (!url.toLowerCase().includes(filterDomain.toLowerCase())) {
              return; // Skip this row
            }
          }
        }

        // Use "/" as fallback to match Ad Manager
        key = url || "/";
        label = url || "/";
        groupType = "url_full";
      } else if (subGroupBy === "domain") {
        const domain =
          headerMap["DOMAIN_NAME"] !== undefined
            ? cells[headerMap["DOMAIN_NAME"]]?.value || ""
            : "";
        key = domain || "Unknown";
        label = domain || "Unknown";
        groupType = "domain";
      } else if (subGroupBy === "country") {
        const countryCode =
          headerMap["COUNTRY_CODE"] !== undefined
            ? cells[headerMap["COUNTRY_CODE"]]?.value || ""
            : "";
        const countryName =
          headerMap["COUNTRY_NAME"] !== undefined
            ? cells[headerMap["COUNTRY_NAME"]]?.value || ""
            : "";
        key = countryCode || "Unknown";
        label = countryName || countryCode || "Unknown";
        groupType = "country";
      } else if (subGroupBy === "none" || subGroupBy === "total") {
        // Aggregate all into one item
        key = "total";
        label = "Total";
        groupType = "total";
      }

      // For country grouping, extract country info
      let rowCountryCode: string | undefined;
      let rowCountryName: string | undefined;
      if (subGroupBy === "country") {
        rowCountryCode =
          headerMap["COUNTRY_CODE"] !== undefined
            ? cells[headerMap["COUNTRY_CODE"]]?.value || ""
            : "";
        rowCountryName =
          headerMap["COUNTRY_NAME"] !== undefined
            ? cells[headerMap["COUNTRY_NAME"]]?.value || ""
            : "";
      }

      // Aggregate
      if (!aggregatedMap.has(key)) {
        aggregatedMap.set(key, {
          key,
          label,
          groupType,
          ...(rowCountryCode && { countryCode: rowCountryCode }),
          ...(rowCountryName && { country: rowCountryName }),
          revenue: 0,
          impressions: 0,
          clicks: 0,
        });
      }

      const agg = aggregatedMap.get(key)!;
      agg.revenue += revenue;
      agg.impressions += impressions;
      agg.clicks += clicks;
    });

    // Convert to items with calculated metrics
    for (const agg of aggregatedMap.values()) {
      items.push({
        key: agg.key,
        label: agg.label,
        groupType: agg.groupType,
        childCount: 0, // AdSense doesn't provide child counts
        ...(agg.country && { country: agg.country }),
        ...(agg.countryCode && { countryCode: agg.countryCode }),
        metrics: {
          revenue: agg.revenue,
          impressions: agg.impressions,
          clicks: agg.clicks,
          ctr: agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0,
          cpc: agg.clicks > 0 ? agg.revenue / agg.clicks : 0,
          rpm: agg.impressions > 0 ? (agg.revenue / agg.impressions) * 1000 : 0,
        },
      });
    }

    return items;
  }

  /**
   * Format date label for display (e.g., "25/01/2026")
   * Must match Ad Manager's formatDateLabel for consistency
   * Converts YYYY-MM-DD to DD/MM/YYYY format
   */
  private formatDateLabel(dateStr: string): string {
    if (!dateStr || dateStr.length !== 10) return dateStr;
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  /**
   * Format week label for display (e.g., "Semana 4, 2026")
   * Must match Ad Manager's formatWeekLabel for consistency
   */
  private formatWeekLabel(weekKey: string): string {
    if (!weekKey || !weekKey.includes("-W")) return weekKey;
    const [year, week] = weekKey.split("-W");
    return `Semana ${parseInt(week, 10)}, ${year}`;
  }

  /**
   * Format month label for display (e.g., "Janeiro 2026")
   * Must match Ad Manager's formatMonthLabel for consistency
   */
  private formatMonthLabel(monthKey: string): string {
    if (!monthKey || !monthKey.includes("-")) return monthKey;
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

  /**
   * Get date range for a week key (YYYY-Wnn)
   */
  private getWeekDateRange(weekKey: string): { start: string; end: string } {
    const [yearStr, weekStr] = weekKey.split("-W");
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekStr, 10);

    // Get first day of the year
    const jan1 = new Date(year, 0, 1);
    // Find the first Monday
    const dayOfWeek = jan1.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToMonday);

    // Calculate start of the target week
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);

    // End of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      start: weekStart.toISOString().split("T")[0],
      end: weekEnd.toISOString().split("T")[0],
    };
  }

  /**
   * Get date range for a month key (YYYY-MM)
   */
  private getMonthDateRange(monthKey: string): { start: string; end: string } {
    const [yearStr, monthStr] = monthKey.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of month

    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  }

  /**
   * Invalidate cache for a specific account
   */
  async invalidateCache(
    connectionId: string,
    accountId: string,
  ): Promise<void> {
    // Note: cache-manager doesn't support pattern-based deletion
    // For now, we rely on TTL expiration
    this.logger.log(`Cache invalidation requested for account ${accountId}`);
  }
}
