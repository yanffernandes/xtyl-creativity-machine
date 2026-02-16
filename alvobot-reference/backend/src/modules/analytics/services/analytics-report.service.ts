import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import axios, { AxiosError } from "axios";
import { AnalyticsOAuthService } from "./analytics-oauth.service";
import {
  AnalyticsSourceDto,
  AnalyticsReportRequestDto,
  AnalyticsExpandRequestDto,
  AnalyticsReportResponse,
  AnalyticsExpandResponse,
  AnalyticsRow,
  AnalyticsSummary,
  AnalyticsMetrics,
  HierarchicalItem,
  FailedSourceDto,
  ActivePropertiesResponse,
  ActivePropertyDto,
  AnalyticsGroupBy,
  AnalyticsMetricField,
  AnalyticsFieldGroup,
  METRICS_BY_FIELD_GROUP,
} from "../dto/analytics-report.dto";

// ============================================
// Constants
// ============================================

const GA4_DATA_API_BASE = "https://analyticsdata.googleapis.com/v1beta";
const BATCH_SIZE = 3;
const MAX_RETRY_ROUNDS = 2;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 30000;

// Cache TTLs
const CACHE_TTL_HISTORICAL = 7 * 24 * 60 * 60 * 1000; // 7 days for historical data
const CACHE_TTL_CURRENT = 15 * 60 * 1000; // 15 minutes for current data
const CACHE_TTL_EXPAND = 30 * 60 * 1000; // 30 minutes for expand results

// ============================================
// Helper Types
// ============================================

interface GA4ReportRequest {
  dateRanges: Array<{ startDate: string; endDate: string }>;
  dimensions: Array<{ name: string }>;
  metrics: Array<{ name: string }>;
  dimensionFilter?: {
    filter?: {
      fieldName: string;
      stringFilter: {
        matchType: string;
        value: string;
        caseSensitive: boolean;
      };
    };
  };
  orderBys?: Array<{
    metric?: { metricName: string };
    dimension?: { dimensionName: string };
    desc?: boolean;
  }>;
  limit?: number;
  offset?: number;
}

interface GA4ReportResponse {
  dimensionHeaders?: Array<{ name: string }>;
  metricHeaders?: Array<{ name: string; type: string }>;
  rows?: Array<{
    dimensionValues: Array<{ value: string }>;
    metricValues: Array<{ value: string }>;
  }>;
  rowCount?: number;
  metadata?: {
    currencyCode?: string;
    timeZone?: string;
  };
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface ProcessedRow {
  key: string;
  label: string;
  domain?: string;
  country?: string;
  countryCode?: string;
  deviceCategory?: string;
  sourceMedium?: string;
  metrics: AnalyticsMetrics;
  childCount: number;
}

// ============================================
// Service
// ============================================

@Injectable()
export class AnalyticsReportService {
  private readonly logger = new Logger(AnalyticsReportService.name);
  private supabase: SupabaseClient;
  private cache = new Map<string, CacheEntry<unknown>>();

  constructor(
    private readonly analyticsOAuthService: AnalyticsOAuthService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Get active properties from multiple connections (batch)
   */
  async getActiveProperties(
    connectionIds: string[],
  ): Promise<ActivePropertiesResponse> {
    this.logger.log(
      `[ACTIVE PROPERTIES] Fetching for ${connectionIds.length} connections`,
    );

    const { data: properties, error } = await this.supabase
      .from("analytics_properties")
      .select("*")
      .in("connection_id", connectionIds)
      .eq("is_active", true)
      .order("display_name", { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch active properties: ${error.message}`);
      return { success: false, properties: [] };
    }

    const mappedProperties: ActivePropertyDto[] = (properties || []).map(
      (p) => ({
        id: p.id,
        propertyId: p.property_id,
        displayName: p.display_name,
        connectionId: p.connection_id,
        accountId: p.account_id,
        accountName: p.account_name,
        timeZone: p.time_zone,
        currencyCode: p.currency_code,
        isActive: p.is_active,
      }),
    );

    return {
      success: true,
      properties: mappedProperties,
    };
  }

  /**
   * Get unified analytics report from multiple properties
   */
  async getReport(
    dto: AnalyticsReportRequestDto,
  ): Promise<AnalyticsReportResponse> {
    const requestId = `REQ-${Date.now().toString(36)}`;
    this.logger.log(
      `[${requestId}] ========== ANALYTICS REPORT START ==========`,
    );
    this.logger.log(
      `[${requestId}] Sources: ${dto.sources.length}, DateRange: ${dto.startDate} to ${dto.endDate}, GroupBy: ${dto.groupBy || "pagePath"}`,
    );

    const startTime = Date.now();

    // Determine metrics to fetch
    const metricsToFetch = this.getMetricsToFetch(dto.fieldGroup, dto.metrics);
    const groupBy = dto.groupBy || AnalyticsGroupBy.PAGE_PATH;

    // Check cache
    const cacheKey = this.buildCacheKey("report", dto);
    if (!dto.forceRefresh) {
      const cached = this.getFromCache<AnalyticsReportResponse>(cacheKey);
      if (cached) {
        this.logger.log(`[${requestId}] Cache hit`);
        return cached;
      }
    }

    // Process sources in batches with retry
    const allRows: ProcessedRow[] = [];
    const failedSources: FailedSourceDto[] = [];
    let sourcesSucceeded = 0;
    let pendingSources = [...dto.sources];

    for (
      let round = 0;
      round <= MAX_RETRY_ROUNDS && pendingSources.length > 0;
      round++
    ) {
      if (round > 0) {
        const delay = RETRY_DELAY_MS * Math.pow(2, round - 1);
        this.logger.log(
          `[${requestId}] Retry round ${round}, waiting ${delay}ms`,
        );
        await this.sleep(delay);
      }

      const retryQueue: AnalyticsSourceDto[] = [];

      // Process in batches
      for (let i = 0; i < pendingSources.length; i += BATCH_SIZE) {
        const batch = pendingSources.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(pendingSources.length / BATCH_SIZE);

        this.logger.log(
          `[${requestId}] Batch ${batchNum}/${totalBatches}: ${batch.map((s) => s.propertyId).join(", ")}`,
        );

        const results = await Promise.allSettled(
          batch.map((source) =>
            this.fetchPropertyReport(
              source,
              dto.startDate,
              dto.endDate,
              groupBy,
              metricsToFetch,
              dto.search,
            ),
          ),
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const source = batch[j];

          if (result.status === "fulfilled") {
            allRows.push(...result.value);
            sourcesSucceeded++;
          } else {
            const error = result.reason;
            const isRetryable = this.isRetryableError(error);

            if (isRetryable && round < MAX_RETRY_ROUNDS) {
              retryQueue.push(source);
            } else {
              failedSources.push({
                connectionId: source.connectionId,
                propertyId: source.propertyId,
                name: `Analytics (${source.propertyId.split("/").pop()})`,
                error: error.message || "Unknown error",
                retryable: false,
              });
            }
          }
        }
      }

      pendingSources = retryQueue;
    }

    // Aggregate rows by grouping key
    const aggregatedRows = this.aggregateRows(allRows, groupBy);

    // Calculate summary
    const summary = this.calculateSummary(aggregatedRows);

    // Apply sorting
    const sortedRows = this.sortRows(
      aggregatedRows,
      dto.sortBy || "activeUsers",
      dto.sortOrder || "desc",
    );

    // Apply pagination
    const { paginatedRows, pagination } = this.paginateRows(
      sortedRows,
      dto.page,
      dto.limit,
    );

    // Build final rows
    const finalRows: AnalyticsRow[] = paginatedRows.map((row, index) => ({
      id: `analytics-${index}-${row.key}`,
      connectionId: "", // Aggregated
      propertyId: "", // Aggregated
      key: row.key,
      label: row.label,
      domain: row.domain,
      country: row.country,
      countryCode: row.countryCode,
      deviceCategory: row.deviceCategory,
      sourceMedium: row.sourceMedium,
      metrics: row.metrics,
      childCount: row.childCount,
    }));

    const response: AnalyticsReportResponse = {
      rows: finalRows,
      summary,
      pagination,
      metadata: {
        groupBy,
        dateRange: { start: dto.startDate, end: dto.endDate },
        sourcesQueried: dto.sources.length,
        sourcesSucceeded,
        sourcesFailed: failedSources.length,
        cachedAt: null,
        requestedMetrics: metricsToFetch,
      },
      failedSources: failedSources.length > 0 ? failedSources : undefined,
    };

    // Cache the response
    const cacheTtl = this.getCacheTtl(dto.endDate);
    this.setCache(cacheKey, response, cacheTtl);
    response.metadata.cachedAt = new Date().toISOString();

    const elapsed = Date.now() - startTime;
    this.logger.log(
      `[${requestId}] ========== ANALYTICS REPORT END | Total: ${elapsed}ms ==========`,
    );

    return response;
  }

  /**
   * Expand a row to show sub-grouped data
   */
  async expandRow(
    dto: AnalyticsExpandRequestDto,
  ): Promise<AnalyticsExpandResponse> {
    const requestId = `EXP-${Date.now().toString(36)}`;
    this.logger.log(
      `[${requestId}] Expanding ${dto.primaryGroupBy} → ${dto.subGroupBy} for key: ${dto.parentKey}`,
    );

    // Check cache
    const cacheKey = this.buildCacheKey("expand", dto);
    if (!dto.forceRefresh) {
      const cached = this.getFromCache<AnalyticsExpandResponse>(cacheKey);
      if (cached) {
        this.logger.log(`[${requestId}] Cache hit`);
        return cached;
      }
    }

    const allItems: HierarchicalItem[] = [];
    const metricsToFetch =
      METRICS_BY_FIELD_GROUP[AnalyticsFieldGroup.TABLE_VIEW];

    // Fetch data for each source
    const results = await Promise.allSettled(
      dto.sources.map((source) =>
        this.fetchExpandData(
          source,
          dto.startDate,
          dto.endDate,
          dto.primaryGroupBy,
          dto.subGroupBy,
          dto.parentKey,
          metricsToFetch,
        ),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    // Aggregate items by key
    const aggregatedItems = this.aggregateHierarchicalItems(
      allItems,
      dto.subGroupBy,
    );

    // Sort items
    const sortedItems = this.sortHierarchicalItems(
      aggregatedItems,
      dto.sortBy || "activeUsers",
      dto.sortOrder || "desc",
    );

    const response: AnalyticsExpandResponse = {
      items: sortedItems,
      metadata: {
        primaryGroupBy: dto.primaryGroupBy,
        subGroupBy: dto.subGroupBy,
        parentKey: dto.parentKey,
      },
    };

    // Cache
    this.setCache(cacheKey, response, CACHE_TTL_EXPAND);

    return response;
  }

  // ============================================
  // Private Methods - Data Fetching
  // ============================================

  /**
   * Get connection with valid access token using service role (bypasses ownership check).
   * This is used internally for batch report fetching where we already validated
   * access through the active properties endpoint.
   */
  private async getConnectionWithToken(
    connectionId: string,
  ): Promise<{ access_token: string; connection: any }> {
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // Check if token needs refresh
    const tokenExpiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at)
      : null;
    const isExpired =
      tokenExpiresAt && tokenExpiresAt < new Date(Date.now() + 5 * 60 * 1000);

    if (isExpired && connection.refresh_token) {
      this.logger.log(
        `[DEBUG] Token expired for connection ${connectionId}, refreshing...`,
      );
      // Use the OAuth service to refresh the token
      const { accessToken, expiresAt } =
        await this.analyticsOAuthService.refreshAccessToken(connectionId);
      return {
        access_token: accessToken,
        connection: {
          ...connection,
          access_token: accessToken,
          token_expires_at: expiresAt,
        },
      };
    }

    return { access_token: connection.access_token, connection };
  }

  private async fetchPropertyReport(
    source: AnalyticsSourceDto,
    startDate: string,
    endDate: string,
    groupBy: AnalyticsGroupBy,
    metrics: string[],
    search?: string,
  ): Promise<ProcessedRow[]> {
    this.logger.log(
      `[DEBUG] fetchPropertyReport - source: ${JSON.stringify(source)}, dates: ${startDate} to ${endDate}, groupBy: ${groupBy}`,
    );

    // Get connection with valid token using service role (bypasses ownership check)
    const { access_token: accessToken } = await this.getConnectionWithToken(
      source.connectionId,
    );

    this.logger.log(
      `[DEBUG] fetchPropertyReport - connection retrieved, has access_token: ${!!accessToken}`,
    );

    const propertyId = source.propertyId.replace("properties/", "");
    this.logger.log(
      `[DEBUG] fetchPropertyReport - propertyId (cleaned): ${propertyId}`,
    );

    // Build GA4 Data API request
    const requestBody: GA4ReportRequest = {
      dateRanges: [{ startDate, endDate }],
      dimensions: this.getDimensionsForGroupBy(groupBy),
      metrics: metrics.map((m) => ({ name: m })),
      limit: 10000, // GA4 max per request
    };

    // Add search filter if provided
    if (search) {
      requestBody.dimensionFilter = {
        filter: {
          fieldName: this.getPrimaryDimension(groupBy),
          stringFilter: {
            matchType: "CONTAINS",
            value: search,
            caseSensitive: false,
          },
        },
      };
    }

    try {
      const apiUrl = `${GA4_DATA_API_BASE}/properties/${propertyId}:runReport`;
      this.logger.log(
        `[DEBUG] fetchPropertyReport - calling GA4 API: ${apiUrl}`,
      );
      this.logger.log(
        `[DEBUG] fetchPropertyReport - requestBody: ${JSON.stringify(requestBody)}`,
      );

      const response = await axios.post<GA4ReportResponse>(
        apiUrl,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: REQUEST_TIMEOUT_MS,
        },
      );

      this.logger.log(
        `[DEBUG] fetchPropertyReport - GA4 API response received, rowCount: ${response.data.rowCount}, rows: ${response.data.rows?.length || 0}`,
      );
      return this.processGA4Response(response.data, groupBy, source);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const responseData = axiosError.response?.data;
        const message =
          (responseData as { error?: { message?: string } })?.error?.message ||
          axiosError.message;

        this.logger.error(
          `GA4 API error for property ${propertyId}: ${status} - ${message}`,
        );
        this.logger.error(
          `[DEBUG] GA4 API full error response: ${JSON.stringify(responseData)}`,
        );

        throw new Error(`GA4 API error: ${message}`);
      }
      this.logger.error(`[DEBUG] Non-Axios error: ${error}`);
      throw error;
    }
  }

  private async fetchExpandData(
    source: AnalyticsSourceDto,
    startDate: string,
    endDate: string,
    primaryGroupBy: AnalyticsGroupBy,
    subGroupBy: AnalyticsGroupBy,
    parentKey: string,
    metrics: string[],
  ): Promise<HierarchicalItem[]> {
    // Get connection with valid token using service role (bypasses ownership check)
    const { access_token: accessToken } = await this.getConnectionWithToken(
      source.connectionId,
    );
    const propertyId = source.propertyId.replace("properties/", "");

    // Build request with filter for parent key
    const requestBody: GA4ReportRequest = {
      dateRanges: [{ startDate, endDate }],
      dimensions: this.getDimensionsForGroupBy(subGroupBy),
      metrics: metrics.map((m) => ({ name: m })),
      dimensionFilter: {
        filter: {
          fieldName: this.getPrimaryDimension(primaryGroupBy),
          stringFilter: {
            matchType: "EXACT",
            value: parentKey,
            caseSensitive: true,
          },
        },
      },
      limit: 1000,
    };

    try {
      const response = await axios.post<GA4ReportResponse>(
        `${GA4_DATA_API_BASE}/properties/${propertyId}:runReport`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: REQUEST_TIMEOUT_MS,
        },
      );

      return this.processGA4ResponseAsHierarchical(response.data, subGroupBy);
    } catch (error) {
      this.logger.error(`Expand fetch error: ${error}`);
      return [];
    }
  }

  // ============================================
  // Private Methods - Data Processing
  // ============================================

  private processGA4Response(
    data: GA4ReportResponse,
    groupBy: AnalyticsGroupBy,
    _source: AnalyticsSourceDto,
  ): ProcessedRow[] {
    if (!data.rows || data.rows.length === 0) {
      return [];
    }

    const dimensionHeaders = data.dimensionHeaders || [];
    const metricHeaders = data.metricHeaders || [];

    return data.rows.map((row) => {
      // Extract dimension values
      const dimensionValues: Record<string, string> = {};
      dimensionHeaders.forEach((header, index) => {
        dimensionValues[header.name] = row.dimensionValues[index]?.value || "";
      });

      // Extract metric values
      const metricValues: Record<string, number> = {};
      metricHeaders.forEach((header, index) => {
        const value = row.metricValues[index]?.value;
        metricValues[header.name] = value ? parseFloat(value) : 0;
      });

      // Build key and label based on groupBy
      const { key, label } = this.extractKeyAndLabel(dimensionValues, groupBy);

      // Extract additional context
      const domain = this.extractDomain(dimensionValues, groupBy);
      const country = dimensionValues["country"];
      const countryCode = dimensionValues["countryCode"];
      const deviceCategory = dimensionValues["deviceCategory"];
      const sourceMedium = dimensionValues["sessionSourceMedium"];

      // Build metrics object
      const metrics = this.buildMetricsObject(metricValues);

      return {
        key,
        label,
        domain,
        country,
        countryCode,
        deviceCategory,
        sourceMedium,
        metrics,
        childCount: 1, // Will be aggregated later
      };
    });
  }

  private processGA4ResponseAsHierarchical(
    data: GA4ReportResponse,
    groupBy: AnalyticsGroupBy,
  ): HierarchicalItem[] {
    if (!data.rows || data.rows.length === 0) {
      return [];
    }

    const dimensionHeaders = data.dimensionHeaders || [];
    const metricHeaders = data.metricHeaders || [];

    return data.rows.map((row) => {
      const dimensionValues: Record<string, string> = {};
      dimensionHeaders.forEach((header, index) => {
        dimensionValues[header.name] = row.dimensionValues[index]?.value || "";
      });

      const metricValues: Record<string, number> = {};
      metricHeaders.forEach((header, index) => {
        const value = row.metricValues[index]?.value;
        metricValues[header.name] = value ? parseFloat(value) : 0;
      });

      const { key, label } = this.extractKeyAndLabel(dimensionValues, groupBy);
      const metrics = this.buildMetricsObject(metricValues);

      return {
        key,
        label,
        groupType: groupBy,
        country: dimensionValues["country"],
        countryCode: dimensionValues["countryCode"],
        deviceCategory: dimensionValues["deviceCategory"],
        sourceMedium: dimensionValues["sessionSourceMedium"],
        metrics,
        childCount: 1,
      };
    });
  }

  private extractKeyAndLabel(
    dimensions: Record<string, string>,
    groupBy: AnalyticsGroupBy,
  ): { key: string; label: string } {
    const primaryDimension = this.getPrimaryDimension(groupBy);
    const value = dimensions[primaryDimension] || "(not set)";

    let label = value;

    // Format labels based on dimension type
    switch (groupBy) {
      case AnalyticsGroupBy.DATE:
        // Format YYYYMMDD to readable date
        label = this.formatDate(value);
        break;
      case AnalyticsGroupBy.WEEK:
        label = `Semana ${value}`;
        break;
      case AnalyticsGroupBy.MONTH:
        label = this.formatMonth(value);
        break;
      case AnalyticsGroupBy.COUNTRY:
        // Country name is already readable
        break;
      case AnalyticsGroupBy.PAGE_PATH:
      case AnalyticsGroupBy.LANDING_PAGE:
        // Clean up paths
        label = value === "/" ? "Página inicial" : value;
        break;
    }

    return { key: value, label };
  }

  private extractDomain(
    dimensions: Record<string, string>,
    _groupBy: AnalyticsGroupBy,
  ): string | undefined {
    // GA4 doesn't have a direct domain dimension, but we can extract from hostname if available
    const hostname = dimensions["hostname"];
    if (hostname) {
      return hostname;
    }

    // For page-based groupings, try to extract domain from full URL if available
    const pageLocation = dimensions["pageLocation"];
    if (pageLocation) {
      try {
        const url = new URL(pageLocation);
        return url.hostname;
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  private buildMetricsObject(values: Record<string, number>): AnalyticsMetrics {
    return {
      activeUsers: values["activeUsers"] || 0,
      newUsers: values["newUsers"] || 0,
      totalUsers: values["totalUsers"] || 0,
      sessions: values["sessions"] || 0,
      engagedSessions: values["engagedSessions"] || 0,
      pageViews: values["screenPageViews"] || 0,
      pagesPerSession: values["screenPageViewsPerSession"] || 0,
      bounceRate: (values["bounceRate"] || 0) * 100, // Convert to percentage
      engagementRate: (values["engagementRate"] || 0) * 100, // Convert to percentage
      avgSessionDuration: values["averageSessionDuration"] || 0,
      userEngagementDuration: values["userEngagementDuration"] || 0,
      eventCount: values["eventCount"] || 0,
      conversions: values["conversions"],
      totalRevenue: values["totalRevenue"],
      transactions: values["transactions"],
      sessionConversionRate: values["sessionConversionRate"]
        ? values["sessionConversionRate"] * 100
        : undefined,
    };
  }

  // ============================================
  // Private Methods - Aggregation
  // ============================================

  private aggregateRows(
    rows: ProcessedRow[],
    _groupBy: AnalyticsGroupBy,
  ): ProcessedRow[] {
    const aggregated = new Map<string, ProcessedRow>();

    for (const row of rows) {
      const existing = aggregated.get(row.key);

      if (existing) {
        existing.metrics = this.aggregateMetrics(existing.metrics, row.metrics);
        existing.childCount += row.childCount;
      } else {
        aggregated.set(row.key, { ...row });
      }
    }

    return Array.from(aggregated.values());
  }

  private aggregateHierarchicalItems(
    items: HierarchicalItem[],
    _groupBy: AnalyticsGroupBy,
  ): HierarchicalItem[] {
    const aggregated = new Map<string, HierarchicalItem>();

    for (const item of items) {
      const existing = aggregated.get(item.key);

      if (existing) {
        existing.metrics = this.aggregateMetrics(
          existing.metrics,
          item.metrics,
        );
        existing.childCount =
          (existing.childCount || 0) + (item.childCount || 0);
      } else {
        aggregated.set(item.key, { ...item });
      }
    }

    return Array.from(aggregated.values());
  }

  private aggregateMetrics(
    a: AnalyticsMetrics,
    b: AnalyticsMetrics,
  ): AnalyticsMetrics {
    const totalSessions = a.sessions + b.sessions;
    const totalPageViews = a.pageViews + b.pageViews;
    const totalEngagedSessions = a.engagedSessions + b.engagedSessions;

    return {
      activeUsers: a.activeUsers + b.activeUsers,
      newUsers: a.newUsers + b.newUsers,
      totalUsers: a.totalUsers + b.totalUsers,
      sessions: totalSessions,
      engagedSessions: totalEngagedSessions,
      pageViews: totalPageViews,
      pagesPerSession: totalSessions > 0 ? totalPageViews / totalSessions : 0,
      bounceRate:
        totalSessions > 0
          ? ((totalSessions - totalEngagedSessions) / totalSessions) * 100
          : 0,
      engagementRate:
        totalSessions > 0 ? (totalEngagedSessions / totalSessions) * 100 : 0,
      avgSessionDuration:
        totalSessions > 0
          ? (a.avgSessionDuration * a.sessions +
              b.avgSessionDuration * b.sessions) /
            totalSessions
          : 0,
      userEngagementDuration:
        a.userEngagementDuration + b.userEngagementDuration,
      eventCount: a.eventCount + b.eventCount,
      conversions:
        a.conversions !== undefined || b.conversions !== undefined
          ? (a.conversions || 0) + (b.conversions || 0)
          : undefined,
      totalRevenue:
        a.totalRevenue !== undefined || b.totalRevenue !== undefined
          ? (a.totalRevenue || 0) + (b.totalRevenue || 0)
          : undefined,
      transactions:
        a.transactions !== undefined || b.transactions !== undefined
          ? (a.transactions || 0) + (b.transactions || 0)
          : undefined,
      sessionConversionRate: undefined, // Recalculate if needed
    };
  }

  private calculateSummary(rows: ProcessedRow[]): AnalyticsSummary {
    const initial: AnalyticsSummary = {
      activeUsers: 0,
      newUsers: 0,
      totalUsers: 0,
      sessions: 0,
      engagedSessions: 0,
      pageViews: 0,
      pagesPerSession: 0,
      bounceRate: 0,
      engagementRate: 0,
      avgSessionDuration: 0,
      conversions: 0,
      totalRevenue: 0,
      transactions: 0,
    };

    const totals = rows.reduce((acc, row) => {
      acc.activeUsers += row.metrics.activeUsers;
      acc.newUsers += row.metrics.newUsers;
      acc.totalUsers += row.metrics.totalUsers;
      acc.sessions += row.metrics.sessions;
      acc.engagedSessions += row.metrics.engagedSessions;
      acc.pageViews += row.metrics.pageViews;
      acc.avgSessionDuration +=
        row.metrics.avgSessionDuration * row.metrics.sessions;

      if (row.metrics.conversions !== undefined) {
        acc.conversions = (acc.conversions || 0) + row.metrics.conversions;
      }
      if (row.metrics.totalRevenue !== undefined) {
        acc.totalRevenue = (acc.totalRevenue || 0) + row.metrics.totalRevenue;
      }
      if (row.metrics.transactions !== undefined) {
        acc.transactions = (acc.transactions || 0) + row.metrics.transactions;
      }

      return acc;
    }, initial);

    // Calculate derived metrics
    totals.pagesPerSession =
      totals.sessions > 0 ? totals.pageViews / totals.sessions : 0;
    totals.bounceRate =
      totals.sessions > 0
        ? ((totals.sessions - totals.engagedSessions) / totals.sessions) * 100
        : 0;
    totals.engagementRate =
      totals.sessions > 0
        ? (totals.engagedSessions / totals.sessions) * 100
        : 0;
    totals.avgSessionDuration =
      totals.sessions > 0 ? totals.avgSessionDuration / totals.sessions : 0;

    return totals;
  }

  // ============================================
  // Private Methods - Sorting & Pagination
  // ============================================

  private sortRows(
    rows: ProcessedRow[],
    sortBy: string,
    sortOrder: "asc" | "desc",
  ): ProcessedRow[] {
    const multiplier = sortOrder === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortBy in a.metrics) {
        aVal = a.metrics[sortBy as keyof AnalyticsMetrics] as number;
        bVal = b.metrics[sortBy as keyof AnalyticsMetrics] as number;
      } else if (sortBy === "key" || sortBy === "label") {
        aVal = a[sortBy];
        bVal = b[sortBy];
      } else {
        aVal = a.metrics.activeUsers;
        bVal = b.metrics.activeUsers;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * multiplier;
      }

      return ((aVal as number) - (bVal as number)) * multiplier;
    });
  }

  private sortHierarchicalItems(
    items: HierarchicalItem[],
    sortBy: string,
    sortOrder: "asc" | "desc",
  ): HierarchicalItem[] {
    const multiplier = sortOrder === "asc" ? 1 : -1;

    return [...items].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortBy in a.metrics) {
        aVal = (a.metrics[sortBy as keyof AnalyticsMetrics] as number) || 0;
        bVal = (b.metrics[sortBy as keyof AnalyticsMetrics] as number) || 0;
      } else {
        aVal = a.metrics.activeUsers;
        bVal = b.metrics.activeUsers;
      }

      return (aVal - bVal) * multiplier;
    });
  }

  private paginateRows(
    rows: ProcessedRow[],
    page?: number,
    limit?: number,
  ): {
    paginatedRows: ProcessedRow[];
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  } {
    if (!page || !limit) {
      return { paginatedRows: rows };
    }

    const totalItems = rows.length;
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;
    const paginatedRows = rows.slice(offset, offset + limit);

    return {
      paginatedRows,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ============================================
  // Private Methods - Helpers
  // ============================================

  private getMetricsToFetch(
    fieldGroup?: AnalyticsFieldGroup,
    metrics?: AnalyticsMetricField[],
  ): string[] {
    if (metrics && metrics.length > 0) {
      return metrics;
    }

    const group = fieldGroup || AnalyticsFieldGroup.TABLE_VIEW;
    return METRICS_BY_FIELD_GROUP[group];
  }

  private getDimensionsForGroupBy(
    groupBy: AnalyticsGroupBy,
  ): Array<{ name: string }> {
    const dimensions: string[] = [];

    // Primary dimension
    dimensions.push(this.getPrimaryDimension(groupBy));

    // Add hostname for page-based groupings to extract domain
    if (
      [
        AnalyticsGroupBy.PAGE_PATH,
        AnalyticsGroupBy.PAGE_TITLE,
        AnalyticsGroupBy.LANDING_PAGE,
      ].includes(groupBy)
    ) {
      dimensions.push("hostname");
    }

    return dimensions.map((name) => ({ name }));
  }

  private getPrimaryDimension(groupBy: AnalyticsGroupBy): string {
    const dimensionMap: Record<AnalyticsGroupBy, string> = {
      [AnalyticsGroupBy.PAGE_PATH]: "pagePath",
      [AnalyticsGroupBy.PAGE_TITLE]: "pageTitle",
      [AnalyticsGroupBy.LANDING_PAGE]: "landingPage",
      [AnalyticsGroupBy.DATE]: "date",
      [AnalyticsGroupBy.DATE_HOUR]: "dateHour",
      [AnalyticsGroupBy.WEEK]: "week",
      [AnalyticsGroupBy.MONTH]: "month",
      [AnalyticsGroupBy.YEAR]: "year",
      [AnalyticsGroupBy.COUNTRY]: "country",
      [AnalyticsGroupBy.CITY]: "city",
      [AnalyticsGroupBy.REGION]: "region",
      [AnalyticsGroupBy.DEVICE_CATEGORY]: "deviceCategory",
      [AnalyticsGroupBy.BROWSER]: "browser",
      [AnalyticsGroupBy.OPERATING_SYSTEM]: "operatingSystem",
      [AnalyticsGroupBy.SOURCE_MEDIUM]: "sessionSourceMedium",
      [AnalyticsGroupBy.SOURCE]: "sessionSource",
      [AnalyticsGroupBy.MEDIUM]: "sessionMedium",
      [AnalyticsGroupBy.CAMPAIGN]: "sessionCampaign",
    };

    return dimensionMap[groupBy] || "pagePath";
  }

  private formatDate(yyyymmdd: string): string {
    if (yyyymmdd.length !== 8) return yyyymmdd;

    const year = yyyymmdd.slice(0, 4);
    const month = yyyymmdd.slice(4, 6);
    const day = yyyymmdd.slice(6, 8);

    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  private formatMonth(yyyymm: string): string {
    if (yyyymm.length !== 6) return yyyymm;

    const year = yyyymm.slice(0, 4);
    const month = yyyymm.slice(4, 6);

    const date = new Date(`${year}-${month}-01`);
    return date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }

  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Retry on 429 (rate limit) and 5xx errors
      return status === 429 || (status !== undefined && status >= 500);
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // Private Methods - Caching
  // ============================================

  private buildCacheKey(
    type: "report" | "expand",
    dto: AnalyticsReportRequestDto | AnalyticsExpandRequestDto,
  ): string {
    const sources = dto.sources
      .map((s) => `${s.connectionId}:${s.propertyId}`)
      .sort()
      .join("|");

    if (type === "report") {
      const reportDto = dto as AnalyticsReportRequestDto;
      return `analytics:${type}:${sources}:${reportDto.startDate}:${reportDto.endDate}:${reportDto.groupBy || "pagePath"}:${reportDto.search || ""}`;
    } else {
      const expandDto = dto as AnalyticsExpandRequestDto;
      return `analytics:${type}:${sources}:${expandDto.startDate}:${expandDto.endDate}:${expandDto.primaryGroupBy}:${expandDto.subGroupBy}:${expandDto.parentKey}`;
    }
  }

  private getCacheTtl(endDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    // If end date is before today, use longer TTL for historical data
    if (end < today) {
      return CACHE_TTL_HISTORICAL;
    }

    return CACHE_TTL_CURRENT;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
}
