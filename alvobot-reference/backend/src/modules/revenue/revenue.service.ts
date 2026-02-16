import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { AdManagerOAuthService } from "../ad-manager/services/ad-manager-oauth.service";
import { AdSenseOAuthService } from "../adsense/services/adsense-oauth.service";
import { RevenueCacheService } from "../../common/cache";
import {
  initializeExchangeRates,
  convertToUSD,
  getExchangeRateToUSD,
  getExchangeRateDebugInfo,
} from "../../common/utils/exchange-rates";
import {
  RevenueReportRequestDto,
  RevenueExpandRequestDto,
  RevenueReportResponseDto,
  RevenueExpandResponseDto,
  RevenueRow,
  RevenueSummary,
  RevenueMetrics,
  RevenueGroupBy,
  RevenueSourceDto,
  ActiveNetworksResponseDto,
  FailedSourceDto,
  RevenueMetricField,
  RevenueFieldGroup,
  FIELD_GROUP_METRICS,
  PaginationMeta,
} from "./dto/revenue-report.dto";

// Raw row from Ad Manager API
interface AdManagerRawRow {
  TOP_PRIVATE_DOMAIN?: string;
  KEY_VALUES_NAME?: string;
  URL_NAME?: string; // Direct URL dimension (no key-value duplication)
  DATE?: string;
  COUNTRY_NAME?: string;
  COUNTRY_CODE?: string;
  AD_EXCHANGE_IMPRESSIONS?: number;
  AD_EXCHANGE_CLICKS?: number;
  AD_EXCHANGE_REVENUE?: number;
  AD_EXCHANGE_TOTAL_REQUESTS?: number;
  AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS?: number;
  AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS?: number;
}

// Raw row from AdSense API
interface AdSenseRawRow {
  DOMAIN_NAME?: string;
  DATE?: string;
  COUNTRY_CODE?: string;
  COUNTRY_NAME?: string;
  PAGE_URL?: string;
  ESTIMATED_EARNINGS?: number;
  IMPRESSIONS?: number;
  CLICKS?: number;
  PAGE_VIEWS?: number;
  AD_REQUESTS?: number;
  ACTIVE_VIEW_VIEWABILITY?: number;
}

interface FetchRowsResponse {
  rows?: Array<{
    dimensionValues: Array<{
      stringValue?: string;
      intValue?: string;
      value?: string;
    }>;
    metricValueGroups: Array<{
      primaryValues: Array<{
        intValue?: string;
        doubleValue?: number;
        integerValue?: string;
        micros?: string;
      }>;
    }>;
  }>;
  totalRowCount?: number;
  nextPageToken?: string;
}

@Injectable()
export class RevenueService implements OnModuleInit {
  private readonly logger = new Logger(RevenueService.name);
  private readonly AD_MANAGER_API_BASE = "https://admanager.googleapis.com/v1";
  private readonly ADSENSE_API_BASE = "https://adsense.googleapis.com/v2";
  private readonly REQUEST_TIMEOUT_MS = 30000; // 30 seconds timeout

  constructor(
    private readonly adManagerOAuthService: AdManagerOAuthService,
    private readonly adSenseOAuthService: AdSenseOAuthService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly revenueCacheService: RevenueCacheService,
  ) {}

  async onModuleInit() {
    // Initialize exchange rates without blocking server startup.
    // This avoids boot hangs if external rate providers or Supabase are slow/unreachable.
    initializeExchangeRates()
      .then(() => this.logger.log("Exchange rates initialized"))
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Exchange rates init failed: ${message}`);
      });
  }

  /**
   * Get active Ad Manager networks for multiple connections (batch)
   * Centralized endpoint for revenue dashboard - avoids N+1 queries
   */
  async getActiveNetworks(
    connectionIds: string[],
    userId: string,
  ): Promise<ActiveNetworksResponseDto> {
    return this.adManagerOAuthService.getNetworksListBatch(
      connectionIds,
      userId,
    );
  }

  /**
   * Get unified revenue report from multiple sources
   * Uses optimized queries with minimal dimensions based on groupBy
   */
  async getReport(
    dto: RevenueReportRequestDto,
    userId: string,
  ): Promise<RevenueReportResponseDto> {
    const requestStartTime = Date.now();
    const requestId = `REQ-${Date.now().toString(36)}`;

    this.logger.log(
      `[${requestId}] ========== REVENUE REPORT START ==========`,
    );
    this.logger.log(
      `[${requestId}] Sources: ${dto.sources.length}, DateRange: ${dto.startDate} to ${dto.endDate}, GroupBy: ${dto.groupBy || "domain"}`,
    );

    const {
      sources,
      startDate,
      endDate,
      groupBy = "domain",
      sortBy = "revenue",
      sortOrder = "desc",
      search,
      forceRefresh,
      // Pagination parameters
      page,
      limit = 50,
      // Field selection parameters
      fieldGroup,
      metrics,
    } = dto;

    // Resolve requested metrics for field projection
    const requestedMetrics = this.resolveRequestedMetrics(fieldGroup, metrics);

    // Validate sources
    for (const source of sources) {
      if (source.type === "ad_manager" && !source.networkId) {
        throw new BadRequestException(
          "networkId is required for ad_manager source",
        );
      }
      if (source.type === "adsense" && !source.accountId) {
        throw new BadRequestException(
          "accountId is required for adsense source",
        );
      }
    }

    // Build cache key
    const sourceKeys = sources
      .map((s) =>
        s.type === "ad_manager"
          ? `am:${s.connectionId}:${s.networkId}`
          : `as:${s.connectionId}:${s.accountId}`,
      )
      .sort()
      .join("|");
    const cacheKey = `revenue:report:${sourceKeys}:${startDate}:${endDate}:${groupBy}`;

    // Check cache
    if (!forceRefresh) {
      const cacheCheckStart = Date.now();
      const cached =
        await this.revenueCacheService.get<RevenueReportResponseDto>(cacheKey);
      const cacheCheckTime = Date.now() - cacheCheckStart;
      if (cached) {
        const totalTime = Date.now() - requestStartTime;
        this.logger.log(
          `[${requestId}] CACHE HIT in ${cacheCheckTime}ms | Total: ${totalTime}ms`,
        );
        return cached;
      }
      this.logger.log(
        `[${requestId}] Cache miss (checked in ${cacheCheckTime}ms)`,
      );
    }

    // Fetch data from all sources with intelligent retry system
    // Process in batches of 3 to avoid Google API rate limiting
    // Failed sources are retried up to 2 times with exponential backoff
    const BATCH_SIZE = 3;
    const MAX_RETRY_ROUNDS = 2;
    const RETRY_DELAY_MS = 2000; // Base delay between retry rounds
    const fetchStartTime = Date.now();

    this.logger.log(
      `[${requestId}] Starting fetch for ${sources.length} sources in batches of ${BATCH_SIZE}`,
    );

    // Track results by source index
    const finalResults: Map<
      number,
      { rows: RevenueRow[]; currencies: string[] }
    > = new Map();
    const failedSources: Map<
      number,
      { source: RevenueSourceDto; error: any; retryCount: number }
    > = new Map();

    // Initialize all sources as pending
    let pendingSources: Array<{ index: number; source: RevenueSourceDto }> =
      sources.map((source, index) => ({ index, source }));

    // Retry loop
    for (
      let retryRound = 0;
      retryRound <= MAX_RETRY_ROUNDS && pendingSources.length > 0;
      retryRound++
    ) {
      const isRetry = retryRound > 0;

      if (isRetry) {
        // Exponential backoff between retry rounds
        const delay = RETRY_DELAY_MS * Math.pow(2, retryRound - 1);
        this.logger.log(
          `[${requestId}] Retry round ${retryRound}/${MAX_RETRY_ROUNDS}: ${pendingSources.length} sources, waiting ${delay}ms`,
        );
        await this.sleep(delay);
      }

      const roundStartTime = Date.now();
      const newlyFailed: typeof pendingSources = [];

      // Process in batches
      for (let i = 0; i < pendingSources.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(pendingSources.length / BATCH_SIZE);
        const batch = pendingSources.slice(i, i + BATCH_SIZE);

        this.logger.log(
          `[${requestId}] ${isRetry ? `[RETRY ${retryRound}] ` : ""}Batch ${batchNum}/${totalBatches}: ${batch.map((s) => `${s.source.type}:${s.source.networkId || s.source.accountId}`).join(", ")}`,
        );

        const batchResults = await Promise.allSettled(
          batch.map(({ index, source }) =>
            this.fetchSourceData(
              source,
              startDate,
              endDate,
              groupBy,
              userId,
              requestId,
              index,
            ),
          ),
        );

        // Process batch results
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const { index, source } = batch[j];

          if (result.status === "fulfilled") {
            finalResults.set(index, result.value);
            failedSources.delete(index); // Clear any previous failure
          } else {
            const prevFailure = failedSources.get(index);
            const retryCount = (prevFailure?.retryCount || 0) + 1;

            // Check if error is retryable
            const isRetryable = this.isRetryableError(result.reason);

            if (isRetryable && retryRound < MAX_RETRY_ROUNDS) {
              newlyFailed.push({ index, source });
              failedSources.set(index, {
                source,
                error: result.reason,
                retryCount,
              });
              this.logger.warn(
                `[${requestId}] Source ${index} (${source.type}:${source.networkId || source.accountId}) failed (attempt ${retryCount}), will retry: ${result.reason?.message || result.reason}`,
              );
            } else {
              failedSources.set(index, {
                source,
                error: result.reason,
                retryCount,
              });
              this.logger.error(
                `[${requestId}] Source ${index} (${source.type}:${source.networkId || source.accountId}) failed permanently after ${retryCount} attempt(s): ${result.reason?.message || result.reason}`,
              );
            }
          }
        }
      }

      const roundTime = Date.now() - roundStartTime;
      this.logger.log(
        `[${requestId}] ${isRetry ? `[RETRY ${retryRound}] ` : ""}Round completed in ${roundTime}ms | Success: ${finalResults.size}, Pending retry: ${newlyFailed.length}, Failed: ${failedSources.size - newlyFailed.length}`,
      );

      // Update pending sources for next retry round
      pendingSources = newlyFailed;
    }

    const fetchTotalTime = Date.now() - fetchStartTime;
    this.logger.log(
      `[${requestId}] All sources fetched in ${fetchTotalTime}ms (${(fetchTotalTime / 1000).toFixed(1)}s) | Success: ${finalResults.size}/${sources.length}`,
    );

    // Collect successful results
    const allRows: RevenueRow[] = [];
    const currencies = new Set<string>();

    for (let i = 0; i < sources.length; i++) {
      const result = finalResults.get(i);
      const source = sources[i];

      if (result) {
        const sourceRevenue = result.rows.reduce(
          (sum, row) => sum + row.metrics.revenue,
          0,
        );
        this.logger.log(
          `Source ${i} (${source.type}:${source.networkId || source.accountId}) returned ${result.rows.length} rows, total revenue: $${sourceRevenue.toFixed(2)}`,
        );
        allRows.push(...result.rows);
        result.currencies.forEach((c) => currencies.add(c));
      }
    }

    // Build failed sources list for user notification
    const failedSourcesList: FailedSourceDto[] = Array.from(
      failedSources.values(),
    ).map(({ source, error }) => ({
      type: source.type,
      connectionId: source.connectionId,
      networkId: source.networkId,
      accountId: source.accountId,
      name:
        source.type === "ad_manager"
          ? `Ad Manager (${source.networkId?.slice(0, 8) || "?"})`
          : `AdSense (${source.accountId?.slice(0, 8) || "?"})`,
      error: this.getUserFriendlyError(error),
      retryable: this.isRetryableError(error),
    }));

    this.logger.log(
      `Total rows collected: ${allRows.length}, Total revenue before aggregation: $${allRows.reduce((sum, row) => sum + row.metrics.revenue, 0).toFixed(2)}`,
    );

    // Convert currencies to USD if any non-USD currency is present
    const currencyArray = Array.from(currencies);
    const hasMultipleCurrencies = currencyArray.length > 1;
    const hasNonUsdCurrency = currencyArray.some((c) => c !== "USD");
    let normalizedRows = allRows;

    if (hasNonUsdCurrency) {
      // Log currency conversion debug info
      const debugInfo = getExchangeRateDebugInfo();
      this.logger.log(
        `[CURRENCY DEBUG] Non-USD currencies detected: ${currencyArray.join(", ")}. ` +
          `Exchange rates source: ${debugInfo.source}, ` +
          `cache age: ${debugInfo.cacheAge !== null ? debugInfo.cacheAge + " min" : "N/A"}, ` +
          `available rates: ${debugInfo.ratesCount}`,
      );

      // Log sample rates for the currencies we're converting
      for (const currency of currencyArray) {
        if (currency !== "USD") {
          const rate = getExchangeRateToUSD(currency);
          this.logger.log(
            `[CURRENCY DEBUG] Rate for ${currency} → USD: ${rate.toFixed(6)} (1 ${currency} = ${rate.toFixed(4)} USD)`,
          );
        }
      }

      normalizedRows = this.normalizeToUSD(allRows);
    } else {
      this.logger.log(
        `[CURRENCY DEBUG] Only USD currency detected, no conversion needed`,
      );
    }

    // Aggregate rows by key (combine same keys from different sources)
    const aggregatedRows = this.aggregateRows(normalizedRows, groupBy);

    this.logger.log(
      `After aggregation: ${aggregatedRows.length} rows, Total revenue: $${aggregatedRows.reduce((sum, row) => sum + row.metrics.revenue, 0).toFixed(2)}`,
    );

    // Apply search filter
    let filteredRows = aggregatedRows;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRows = aggregatedRows.filter(
        (row) =>
          row.key.toLowerCase().includes(searchLower) ||
          row.label.toLowerCase().includes(searchLower) ||
          (row.domain && row.domain.toLowerCase().includes(searchLower)),
      );
    }

    // Sort rows
    const sortedRows = this.sortRows(filteredRows, sortBy, sortOrder);

    // Calculate summary
    const summary = this.calculateSummary(
      sortedRows,
      hasMultipleCurrencies,
      currencyArray,
    );

    const totalRequestTime = Date.now() - requestStartTime;
    this.logger.log(
      `[${requestId}] Final summary: revenue=$${summary.revenue.toFixed(2)}, impressions=${summary.impressions}, sources=${sources.length}`,
    );
    this.logger.log(
      `[${requestId}] ========== REVENUE REPORT END | Total: ${totalRequestTime}ms (${(totalRequestTime / 1000).toFixed(1)}s) ==========`,
    );

    // Debug: Check if originalRevenue/exchangeRate are present in rows
    const rowsWithConversion = sortedRows.filter(
      (r) => r.originalRevenue !== undefined,
    );
    if (rowsWithConversion.length > 0) {
      const sample = rowsWithConversion[0];
      this.logger.log(
        `[CURRENCY DEBUG] Rows with conversion info: ${rowsWithConversion.length}/${sortedRows.length}. ` +
          `Sample: originalRevenue=${sample.originalRevenue}, exchangeRate=${sample.exchangeRate}, ` +
          `originalCurrency=${sample.originalCurrencyCode}`,
      );
    } else {
      this.logger.log(
        `[CURRENCY DEBUG] No rows have originalRevenue/exchangeRate set`,
      );
    }

    // =========================================================================
    // PAGINATION
    // Apply pagination AFTER sorting but BEFORE field projection
    // Summary is calculated on ALL rows (before pagination)
    // =========================================================================
    let paginatedRows = sortedRows;
    let pagination: PaginationMeta | undefined;

    if (page !== undefined) {
      const totalItems = sortedRows.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      paginatedRows = sortedRows.slice(startIndex, endIndex);

      pagination = {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      this.logger.log(
        `[${requestId}] Pagination: page ${page}/${totalPages}, showing ${paginatedRows.length}/${totalItems} rows`,
      );
    }

    // =========================================================================
    // FIELD PROJECTION
    // Apply field projection to reduce response payload size
    // =========================================================================
    const projectedRows = this.projectMetricsForRows(
      paginatedRows,
      requestedMetrics,
    );

    this.logger.log(
      `[${requestId}] Field projection: returning ${requestedMetrics.length} metrics (${requestedMetrics.join(", ")})`,
    );

    const response: RevenueReportResponseDto = {
      rows: projectedRows,
      summary,
      metadata: {
        groupBy,
        dateRange: { start: startDate, end: endDate },
        sourcesQueried: sources.length,
        sourcesSucceeded: finalResults.size,
        sourcesFailed: failedSourcesList.length,
        cachedAt: new Date().toISOString(),
        requestedMetrics,
      },
      // Include pagination only when page is specified
      ...(pagination && { pagination }),
      // Include failed sources only if there are any (Nielsen's visibility of system status)
      ...(failedSourcesList.length > 0 && { failedSources: failedSourcesList }),
    };

    // Cache the response (only if we have at least some data)
    // Note: Cache the FULL response (before pagination) for better cache hit rate
    // Alternative strategy: cache per-page, but this uses more cache space
    if (sortedRows.length > 0) {
      await this.revenueCacheService.set(
        cacheKey,
        response,
        startDate,
        endDate,
      );
    }

    return response;
  }

  /**
   * Expand a parent item with hierarchical sub-grouping
   */
  async expand(
    dto: RevenueExpandRequestDto,
    userId: string,
  ): Promise<RevenueExpandResponseDto> {
    const {
      sources,
      startDate,
      endDate,
      primaryGroupBy,
      subGroupBy,
      parentKey,
      parentDomain,
      sortBy = "revenue",
      sortOrder = "desc",
      forceRefresh,
    } = dto;

    // If subGroupBy is 'none' or 'total', return empty
    if (subGroupBy === "none" || subGroupBy === "total") {
      return {
        items: [],
        metadata: { primaryGroupBy, subGroupBy, parentKey },
      };
    }

    // Build cache key
    const sourceKeys = sources
      .map((s) =>
        s.type === "ad_manager"
          ? `am:${s.connectionId}:${s.networkId}`
          : `as:${s.connectionId}:${s.accountId}`,
      )
      .sort()
      .join("|");
    const cacheKey = `revenue:expand:${sourceKeys}:${startDate}:${endDate}:${primaryGroupBy}:${subGroupBy}:${parentKey}`;

    // Check cache
    if (!forceRefresh) {
      const cached =
        await this.revenueCacheService.get<RevenueExpandResponseDto>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for expand ${cacheKey}`);
        return cached;
      }
    }

    // Fetch expanded data from all sources with controlled concurrency
    // Process in batches of 3 to avoid Google API rate limiting
    // Rate limit protection is handled by withRetry() with exponential backoff + jitter
    const BATCH_SIZE = 3;

    this.logger.log(
      `[EXPAND DEBUG] Starting expand fetch: sources=${sources.length}, ` +
        `primaryGroupBy=${primaryGroupBy}, subGroupBy=${subGroupBy}, parentKey=${parentKey}`,
    );

    const results: PromiseSettledResult<RevenueExpandResponseDto["items"]>[] =
      [];

    for (let i = 0; i < sources.length; i += BATCH_SIZE) {
      const batch = sources.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map((source) =>
          this.fetchExpandData(
            source,
            startDate,
            endDate,
            primaryGroupBy,
            subGroupBy,
            parentKey,
            parentDomain,
            userId,
          ),
        ),
      );

      results.push(...batchResults);
    }

    // Debug: Log batch results status
    const fulfilledCount = results.filter(
      (r) => r.status === "fulfilled",
    ).length;
    const rejectedCount = results.filter((r) => r.status === "rejected").length;
    this.logger.log(
      `[EXPAND DEBUG] Batch results: ${fulfilledCount} fulfilled, ${rejectedCount} rejected of ${results.length} total`,
    );

    // Log rejected reasons
    for (const result of results) {
      if (result.status === "rejected") {
        this.logger.error(`[EXPAND DEBUG] Rejected reason: ${result.reason}`);
      }
    }

    // Merge results
    const itemsMap = new Map<string, RevenueExpandResponseDto["items"][0]>();

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const item of result.value) {
          const existing = itemsMap.get(item.key);
          if (existing) {
            // Aggregate metrics
            existing.metrics = this.aggregateMetrics(
              existing.metrics,
              item.metrics,
            );
            existing.childCount += item.childCount;
          } else {
            itemsMap.set(item.key, { ...item });
          }
        }
      }
    }

    // Convert to array and sort
    const items = Array.from(itemsMap.values());
    items.sort((a, b) => {
      if (sortBy === "label" || sortBy === "key") {
        return sortOrder === "asc"
          ? a.label.localeCompare(b.label)
          : b.label.localeCompare(a.label);
      }
      const aVal = (a.metrics as any)[sortBy] ?? 0;
      const bVal = (b.metrics as any)[sortBy] ?? 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    const response: RevenueExpandResponseDto = {
      items,
      metadata: { primaryGroupBy, subGroupBy, parentKey },
    };

    // Cache
    await this.revenueCacheService.set(cacheKey, response, startDate, endDate);

    return response;
  }

  /**
   * Fetch data from a single source with optimized dimensions
   */
  private async fetchSourceData(
    source: RevenueSourceDto,
    startDate: string,
    endDate: string,
    groupBy: RevenueGroupBy,
    userId: string,
    requestId?: string,
    sourceIndex?: number,
  ): Promise<{ rows: RevenueRow[]; currencies: string[] }> {
    const sourceId = `${source.type}:${source.networkId || source.accountId}`;
    const logPrefix = requestId
      ? `[${requestId}][Source ${sourceIndex}]`
      : `[Source]`;
    const sourceStartTime = Date.now();

    this.logger.log(`${logPrefix} Starting fetch for ${sourceId}`);

    try {
      let result: { rows: RevenueRow[]; currencies: string[] };

      if (source.type === "ad_manager") {
        result = await this.fetchAdManagerData(
          source,
          startDate,
          endDate,
          groupBy,
          userId,
          requestId,
          sourceIndex,
        );
      } else {
        result = await this.fetchAdSenseData(
          source,
          startDate,
          endDate,
          groupBy,
          userId,
          requestId,
          sourceIndex,
        );
      }

      const sourceTime = Date.now() - sourceStartTime;
      this.logger.log(
        `${logPrefix} ${sourceId} completed in ${sourceTime}ms | Rows: ${result.rows.length}`,
      );

      return result;
    } catch (error: any) {
      const sourceTime = Date.now() - sourceStartTime;
      this.logger.error(
        `${logPrefix} ${sourceId} FAILED after ${sourceTime}ms: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Fetch Ad Manager data with optimized dimensions
   */
  private async fetchAdManagerData(
    source: RevenueSourceDto,
    startDate: string,
    endDate: string,
    groupBy: RevenueGroupBy,
    userId: string,
    requestId?: string,
    sourceIndex?: number,
  ): Promise<{ rows: RevenueRow[]; currencies: string[] }> {
    const logPrefix = requestId ? `[${requestId}][AM-${sourceIndex}]` : `[AM]`;

    // Get connection with valid token
    const tokenStartTime = Date.now();
    const connection =
      await this.adManagerOAuthService.getConnectionWithValidToken(
        source.connectionId,
        userId,
      );
    const tokenTime = Date.now() - tokenStartTime;
    this.logger.log(`${logPrefix} Token refresh/validation: ${tokenTime}ms`);

    const accessToken = connection.access_token;
    const networks = connection.metadata?.networks || [];
    const network = networks.find(
      (n: { id: string }) => n.id === source.networkId,
    );
    const currencyCode = network?.currencyCode || "USD";

    // Build optimized dimensions based on groupBy
    const dimensions = this.getAdManagerDimensions(groupBy);

    // Metrics always the same
    const metrics = [
      "AD_EXCHANGE_IMPRESSIONS",
      "AD_EXCHANGE_CLICKS",
      "AD_EXCHANGE_REVENUE",
      "AD_EXCHANGE_TOTAL_REQUESTS",
      "AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS",
      "AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS",
    ];

    // Run report
    const reportStartTime = Date.now();
    const rawRows = await this.runAdManagerReport(
      accessToken,
      source.networkId!,
      startDate,
      endDate,
      dimensions,
      metrics,
      requestId,
      sourceIndex,
    );
    const reportTime = Date.now() - reportStartTime;
    this.logger.log(
      `${logPrefix} API report completed: ${reportTime}ms | Raw rows: ${rawRows.length}`,
    );

    // Process rows
    const processStartTime = Date.now();
    const rows = this.processAdManagerRows(
      rawRows,
      source,
      groupBy,
      currencyCode,
    );
    const processTime = Date.now() - processStartTime;
    this.logger.log(
      `${logPrefix} Processing completed: ${processTime}ms | Final rows: ${rows.length}`,
    );

    return { rows, currencies: [currencyCode] };
  }

  /**
   * Fetch AdSense data with optimized dimensions
   */
  private async fetchAdSenseData(
    source: RevenueSourceDto,
    startDate: string,
    endDate: string,
    groupBy: RevenueGroupBy,
    userId: string,
    requestId?: string,
    sourceIndex?: number,
  ): Promise<{ rows: RevenueRow[]; currencies: string[] }> {
    const logPrefix = requestId ? `[${requestId}][AS-${sourceIndex}]` : `[AS]`;

    // Get connection with valid token
    const tokenStartTime = Date.now();
    const connection =
      await this.adSenseOAuthService.getConnectionWithValidToken(
        source.connectionId,
        userId,
      );
    const tokenTime = Date.now() - tokenStartTime;
    this.logger.log(`${logPrefix} Token refresh/validation: ${tokenTime}ms`);

    const accessToken = connection.access_token;

    // Get currency from account metadata
    const accounts = connection.metadata?.accounts || [];
    const account = accounts.find(
      (a: { id: string }) => a.id === source.accountId,
    );
    const currencyCode = account?.currencyCode || "USD";

    // Build optimized dimensions based on groupBy
    const dimensions = this.getAdSenseDimensions(groupBy);

    // Metrics
    const metrics = [
      "ESTIMATED_EARNINGS",
      "IMPRESSIONS",
      "CLICKS",
      "PAGE_VIEWS",
      "AD_REQUESTS",
      "ACTIVE_VIEW_VIEWABILITY",
    ];

    // Run report
    const reportStartTime = Date.now();
    const rawRows = await this.runAdSenseReport(
      accessToken,
      source.accountId!,
      startDate,
      endDate,
      dimensions,
      metrics,
      requestId,
      sourceIndex,
    );
    const reportTime = Date.now() - reportStartTime;
    this.logger.log(
      `${logPrefix} API report completed: ${reportTime}ms | Raw rows: ${rawRows.length}`,
    );

    // Process rows
    const processStartTime = Date.now();
    const rows = this.processAdSenseRows(
      rawRows,
      source,
      groupBy,
      currencyCode,
    );
    const processTime = Date.now() - processStartTime;
    this.logger.log(
      `${logPrefix} Processing completed: ${processTime}ms | Final rows: ${rows.length}`,
    );

    return { rows, currencies: [currencyCode] };
  }

  /**
   * Get Ad Manager dimensions based on groupBy
   * This is the key optimization - only request what we need
   *
   * NOTE: KEY_VALUES_NAME can return multiple rows for the same page when
   * different key-values exist (e.g., different UTM parameters). The aggregation
   * in processAdManagerRows handles this by grouping by the extracted slug/URL.
   */
  private getAdManagerDimensions(groupBy: RevenueGroupBy): string[] {
    switch (groupBy) {
      case "domain":
        return ["TOP_PRIVATE_DOMAIN"];
      case "date_day":
      case "date_week":
      case "date_month":
        // Include domain for per-domain date breakdown
        return ["DATE", "TOP_PRIVATE_DOMAIN"];
      case "url":
      case "url_full":
        // KEY_VALUES_NAME provides land_uri/request_uri data
        // Multiple rows for same URL are aggregated in processAdManagerRows
        return ["KEY_VALUES_NAME", "TOP_PRIVATE_DOMAIN"];
      case "country":
        return ["COUNTRY_CODE", "COUNTRY_NAME", "TOP_PRIVATE_DOMAIN"];
      default:
        return ["TOP_PRIVATE_DOMAIN"];
    }
  }

  /**
   * Get AdSense dimensions based on groupBy
   */
  private getAdSenseDimensions(groupBy: RevenueGroupBy): string[] {
    // Always include PAGE_URL to extract reliable domain (DOMAIN_NAME can return partial values like "blog")
    switch (groupBy) {
      case "domain":
        // Include PAGE_URL to extract full domain from URL when DOMAIN_NAME is unreliable
        return ["PAGE_URL", "DOMAIN_NAME"];
      case "date_day":
      case "date_week":
      case "date_month":
        return ["DATE", "PAGE_URL", "DOMAIN_NAME"];
      case "url":
      case "url_full":
        return ["PAGE_URL", "DOMAIN_NAME"];
      case "country":
        return ["COUNTRY_CODE", "COUNTRY_NAME", "PAGE_URL", "DOMAIN_NAME"];
      default:
        return ["PAGE_URL", "DOMAIN_NAME"];
    }
  }

  /**
   * Run Ad Manager report with specified dimensions
   */
  private async runAdManagerReport(
    accessToken: string,
    networkId: string,
    startDate: string,
    endDate: string,
    dimensions: string[],
    metrics: string[],
    requestId?: string,
    sourceIndex?: number,
  ): Promise<AdManagerRawRow[]> {
    const logPrefix = requestId ? `[${requestId}][AM-${sourceIndex}]` : `[AM]`;
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

    try {
      this.logger.log(
        `${logPrefix} Creating report | Dimensions: ${dimensions.join(", ")} | Date: ${startDate} to ${endDate}`,
      );

      // Step 1: Create report
      const reportDefinition = {
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

      const createUrl = `${this.AD_MANAGER_API_BASE}/networks/${networkId}/reports`;
      const createBody = JSON.stringify(reportDefinition);

      // Log CURL equivalent
      this.logger.debug(
        `${logPrefix} CURL: curl -X POST "${createUrl}" ` +
          `-H "Authorization: Bearer ${accessToken.slice(0, 20)}..." ` +
          `-H "Content-Type: application/json" ` +
          `-d '${createBody}'`,
      );

      const createStartTime = Date.now();
      const createResponse = await this.withRetry(async () => {
        const response = await this.fetchWithTimeout(createUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: createBody,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          this.logger.error(
            `${logPrefix} CREATE REPORT FAILED: ${response.status} | Response: ${JSON.stringify(error)}`,
          );
          throw new InternalServerErrorException(
            error.error?.message || "Failed to create Ad Manager report",
          );
        }

        return response.json();
      });
      const createTime = Date.now() - createStartTime;
      this.logger.log(`${logPrefix} Step 1 - Create report: ${createTime}ms`);

      const reportName = createResponse.name;

      // Step 2: Run report
      const runUrl = `${this.AD_MANAGER_API_BASE}/${reportName}:run`;
      const runStartTime = Date.now();

      const runResponse = await this.withRetry(async () => {
        const response = await this.fetchWithTimeout(runUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          this.logger.error(
            `${logPrefix} RUN REPORT FAILED: ${response.status} | Response: ${JSON.stringify(error)}`,
          );
          throw new InternalServerErrorException(
            error.error?.message || "Failed to run Ad Manager report",
          );
        }

        return response.json();
      });
      const runTime = Date.now() - runStartTime;
      this.logger.log(`${logPrefix} Step 2 - Run report: ${runTime}ms`);

      const operationName = runResponse.name;

      // Step 3: Poll for completion with adaptive intervals
      // Start with short intervals (most reports complete quickly) and increase if needed
      let isDone = false;
      let pollAttempts = 0;
      const maxPollAttempts = 30;
      let resultName: string | null = null;
      const pollStartTime = Date.now();

      // Adaptive polling intervals: 500ms, 1s, 1s, 2s, 2s, 3s, 3s, then 5s...
      const getPollingInterval = (attempt: number): number => {
        if (attempt === 0) return 500; // First check after 500ms
        if (attempt <= 2) return 1000; // Next 2 checks every 1s
        if (attempt <= 4) return 2000; // Next 2 checks every 2s
        if (attempt <= 6) return 3000; // Next 2 checks every 3s
        return 5000; // After that, every 5s
      };

      while (!isDone && pollAttempts < maxPollAttempts) {
        const interval = getPollingInterval(pollAttempts);
        await this.sleep(interval);
        pollAttempts++;

        const statusResponse = await this.fetchWithTimeout(
          `${this.AD_MANAGER_API_BASE}/${operationName}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        const status = await statusResponse.json();

        if (status.error) {
          this.logger.error(
            `${logPrefix} POLL FAILED at attempt ${pollAttempts}: ${JSON.stringify(status.error)}`,
          );
          throw new InternalServerErrorException(
            status.error.message || "Report failed",
          );
        }

        if (status.done) {
          isDone = true;
          resultName = status.response?.reportResult || `${reportName}/results`;
          const pollTime = Date.now() - pollStartTime;
          this.logger.log(
            `${logPrefix} Step 3 - Poll completed: ${pollTime}ms (${pollAttempts} attempts)`,
          );
        } else {
          this.logger.debug(
            `${logPrefix} Poll attempt ${pollAttempts}: not ready yet (waited ${interval}ms)`,
          );
        }
      }

      if (!isDone) {
        const pollTime = Date.now() - pollStartTime;
        this.logger.error(
          `${logPrefix} POLL TIMEOUT after ${pollTime}ms (${pollAttempts} attempts)`,
        );
        throw new InternalServerErrorException("Report timed out");
      }

      // Step 4: Fetch results
      const rows: AdManagerRawRow[] = [];
      let nextPageToken: string | undefined;
      let pageCount = 0;
      const fetchStartTime = Date.now();

      do {
        pageCount++;
        const fetchUrl = new URL(
          `${this.AD_MANAGER_API_BASE}/${resultName}:fetchRows`,
        );
        fetchUrl.searchParams.set("pageSize", "1000");
        if (nextPageToken) {
          fetchUrl.searchParams.set("pageToken", nextPageToken);
        }

        const pageStartTime = Date.now();
        const fetchResponse = await this.withRetry(async () => {
          const response = await this.fetchWithTimeout(fetchUrl.toString(), {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!response.ok) {
            this.logger.error(
              `${logPrefix} FETCH PAGE ${pageCount} FAILED: ${response.status}`,
            );
            throw new InternalServerErrorException("Failed to fetch results");
          }

          return response.json() as Promise<FetchRowsResponse>;
        });
        const pageTime = Date.now() - pageStartTime;

        if (fetchResponse.rows) {
          this.logger.debug(
            `${logPrefix} Page ${pageCount}: ${fetchResponse.rows.length} rows in ${pageTime}ms`,
          );

          for (const row of fetchResponse.rows) {
            const rawRow: AdManagerRawRow = {};

            // Map dimensions based on what was requested
            if (row.dimensionValues) {
              dimensions.forEach((dim, idx) => {
                const val = row.dimensionValues[idx];
                if (dim === "DATE") {
                  const dateInt = val?.intValue || val?.value || "";
                  if (dateInt && dateInt.length === 8) {
                    rawRow.DATE = `${dateInt.slice(0, 4)}-${dateInt.slice(4, 6)}-${dateInt.slice(6, 8)}`;
                  } else {
                    rawRow.DATE = dateInt;
                  }
                } else {
                  (rawRow as any)[dim] = val?.stringValue || val?.value || "";
                }
              });
            }

            // Map metrics
            if (row.metricValueGroups?.[0]?.primaryValues) {
              const values = row.metricValueGroups[0].primaryValues;
              rawRow.AD_EXCHANGE_IMPRESSIONS = this.parseMetricValue(values[0]);
              rawRow.AD_EXCHANGE_CLICKS = this.parseMetricValue(values[1]);
              rawRow.AD_EXCHANGE_REVENUE = this.parseRevenueValue(values[2]);
              rawRow.AD_EXCHANGE_TOTAL_REQUESTS = this.parseMetricValue(
                values[3],
              );
              rawRow.AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS =
                this.parseMetricValue(values[4]);
              rawRow.AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS =
                this.parseMetricValue(values[5]);
            }

            rows.push(rawRow);
          }
        }

        nextPageToken = fetchResponse.nextPageToken;
      } while (nextPageToken);

      const fetchTotalTime = Date.now() - fetchStartTime;
      this.logger.log(
        `${logPrefix} Step 4 - Fetch results: ${fetchTotalTime}ms (${pageCount} pages, ${rows.length} total rows)`,
      );

      return rows;
    } catch (error: any) {
      this.logger.error(
        `${logPrefix} Ad Manager report FAILED: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Run AdSense report with specified dimensions
   */
  private async runAdSenseReport(
    accessToken: string,
    accountId: string,
    startDate: string,
    endDate: string,
    dimensions: string[],
    metrics: string[],
    requestId?: string,
    sourceIndex?: number,
  ): Promise<AdSenseRawRow[]> {
    const logPrefix = requestId ? `[${requestId}][AS-${sourceIndex}]` : `[AS]`;

    try {
      this.logger.log(
        `${logPrefix} Creating report | Dimensions: ${dimensions.join(", ")} | Date: ${startDate} to ${endDate}`,
      );

      // AdSense uses a simpler REST API
      // Account ID must be prefixed with "accounts/" for the v2 API
      const url = new URL(
        `${this.ADSENSE_API_BASE}/accounts/${accountId}/reports:generate`,
      );
      url.searchParams.set("dateRange", "CUSTOM");
      url.searchParams.set("startDate.year", startDate.split("-")[0]);
      url.searchParams.set("startDate.month", startDate.split("-")[1]);
      url.searchParams.set("startDate.day", startDate.split("-")[2]);
      url.searchParams.set("endDate.year", endDate.split("-")[0]);
      url.searchParams.set("endDate.month", endDate.split("-")[1]);
      url.searchParams.set("endDate.day", endDate.split("-")[2]);

      dimensions.forEach((dim) => url.searchParams.append("dimensions", dim));
      metrics.forEach((metric) => url.searchParams.append("metrics", metric));

      // Log CURL equivalent
      this.logger.debug(
        `${logPrefix} CURL: curl -X GET "${url.toString()}" ` +
          `-H "Authorization: Bearer ${accessToken.slice(0, 20)}..."`,
      );

      const apiStartTime = Date.now();
      const response = await this.withRetry(async () => {
        const res = await this.fetchWithTimeout(url.toString(), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          const errorMessage =
            error.error?.message ||
            `HTTP ${res.status}: Failed to generate AdSense report`;
          this.logger.error(
            `${logPrefix} API FAILED: ${res.status} | Response: ${JSON.stringify(error)}`,
          );
          throw new InternalServerErrorException(errorMessage);
        }

        return res.json();
      });
      const apiTime = Date.now() - apiStartTime;

      // Process AdSense response format
      const rows: AdSenseRawRow[] = [];

      if (response.rows) {
        for (const row of response.rows) {
          const rawRow: AdSenseRawRow = {};

          // Map dimension values
          if (row.cells) {
            dimensions.forEach((dim, idx) => {
              (rawRow as any)[dim] = row.cells[idx]?.value || "";
            });

            // Map metric values (after dimensions)
            const metricsOffset = dimensions.length;
            rawRow.ESTIMATED_EARNINGS = parseFloat(
              row.cells[metricsOffset]?.value || "0",
            );
            rawRow.IMPRESSIONS = parseInt(
              row.cells[metricsOffset + 1]?.value || "0",
              10,
            );
            rawRow.CLICKS = parseInt(
              row.cells[metricsOffset + 2]?.value || "0",
              10,
            );
            rawRow.PAGE_VIEWS = parseInt(
              row.cells[metricsOffset + 3]?.value || "0",
              10,
            );
            rawRow.AD_REQUESTS = parseInt(
              row.cells[metricsOffset + 4]?.value || "0",
              10,
            );
            rawRow.ACTIVE_VIEW_VIEWABILITY = parseFloat(
              row.cells[metricsOffset + 5]?.value || "0",
            );
          }

          rows.push(rawRow);
        }
      }

      this.logger.log(
        `${logPrefix} API completed: ${apiTime}ms | ${rows.length} rows`,
      );
      return rows;
    } catch (error: any) {
      this.logger.error(`${logPrefix} AdSense report FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process Ad Manager raw rows into RevenueRows
   */
  private processAdManagerRows(
    rawRows: AdManagerRawRow[],
    source: RevenueSourceDto,
    groupBy: RevenueGroupBy,
    currencyCode: string,
  ): RevenueRow[] {
    const dataMap = new Map<
      string,
      {
        key: string;
        label: string;
        domain: string;
        country?: string;
        countryCode?: string;
        revenue: number;
        impressions: number;
        clicks: number;
        requests: number;
        viewableImpressions: number;
        measurableImpressions: number;
        childCount: number;
        children: Set<string>;
      }
    >();

    const isUrlGrouping = groupBy === "url" || groupBy === "url_full";

    // Debug: Count raw rows and track aggregation
    let rawUrlRowCount = 0;
    let skippedRowCount = 0;

    for (const row of rawRows) {
      const domain = this.cleanDomain(row.TOP_PRIVATE_DOMAIN || "");
      const keyValue = this.cleanKeyValue(row.KEY_VALUES_NAME || "");
      const date = row.DATE || "";

      // Skip invalid entries for URL grouping
      if (isUrlGrouping && !keyValue.includes("/")) {
        skippedRowCount++;
        continue;
      }

      if (isUrlGrouping) {
        rawUrlRowCount++;
      }

      // Determine grouping key and label
      let mapKey: string;
      let label: string;
      let childKey: string;

      switch (groupBy) {
        case "domain":
          mapKey = domain || "Unknown";
          label = domain || "Unknown";
          childKey = keyValue || date;
          break;
        case "date_day":
          mapKey = `${date}|||${domain}`;
          label = this.formatDateLabel(date);
          childKey = keyValue;
          break;
        case "date_week":
          const weekKey = date ? this.getWeekKey(date) : "Unknown";
          mapKey = `${weekKey}|||${domain}`;
          label = this.formatWeekLabel(weekKey);
          childKey = date;
          break;
        case "date_month":
          const monthKey = date ? this.getMonthKey(date) : "Unknown";
          mapKey = `${monthKey}|||${domain}`;
          label = this.formatMonthLabel(monthKey);
          childKey = date;
          break;
        case "url":
          const slug = this.extractSlug(keyValue);
          // Include domain in key to keep rows separate per domain
          mapKey = `${slug}|||${domain}`;
          label = slug || "/";
          childKey = date;
          break;
        case "url_full":
          const fullUrl = this.extractFullUrl(keyValue);
          // Include domain in key to keep rows separate per domain
          mapKey = `${fullUrl}|||${domain}`;
          label = fullUrl || "/";
          childKey = date;
          break;
        case "country":
          mapKey = row.COUNTRY_CODE || "Unknown";
          label = row.COUNTRY_NAME || row.COUNTRY_CODE || "Unknown";
          childKey = `${domain}|||${date}`;
          break;
        default:
          mapKey = domain || "Unknown";
          label = domain || "Unknown";
          childKey = keyValue || date;
      }

      if (!dataMap.has(mapKey)) {
        dataMap.set(mapKey, {
          key: mapKey,
          label,
          domain,
          country: row.COUNTRY_NAME,
          countryCode: row.COUNTRY_CODE,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          requests: 0,
          viewableImpressions: 0,
          measurableImpressions: 0,
          childCount: 0,
          children: new Set(),
        });
      }

      const data = dataMap.get(mapKey)!;
      if (childKey) data.children.add(childKey);
      data.revenue += row.AD_EXCHANGE_REVENUE || 0;
      data.impressions += row.AD_EXCHANGE_IMPRESSIONS || 0;
      data.clicks += row.AD_EXCHANGE_CLICKS || 0;
      data.requests += row.AD_EXCHANGE_TOTAL_REQUESTS || 0;
      data.viewableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS || 0;
      data.measurableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS || 0;
    }

    // Debug: Log aggregation stats for URL groupings
    if (isUrlGrouping) {
      const aggregatedCount = dataMap.size;
      const totalRevenue =
        Array.from(dataMap.values()).reduce((sum, d) => sum + d.revenue, 0) /
        1000000;
      this.logger.log(
        `[AM URL AGGREGATION] Raw rows: ${rawRows.length}, Valid URL rows: ${rawUrlRowCount}, ` +
          `Skipped: ${skippedRowCount}, Aggregated to: ${aggregatedCount} rows, Total revenue: $${totalRevenue.toFixed(2)}`,
      );
      // Log sample of aggregation (first 3 with revenue > $1)
      const samples = Array.from(dataMap.entries())
        .filter(([, d]) => d.revenue > 1000000)
        .slice(0, 3);
      for (const [key, d] of samples) {
        this.logger.log(
          `  - "${key}": ${d.children.size} unique children, $${(d.revenue / 1000000).toFixed(2)}`,
        );
      }
    }

    // Convert to RevenueRow array
    return Array.from(dataMap.values()).map((data) => {
      const revenueInDollars = data.revenue / 1000000; // Convert from micros
      return {
        id: `am-${source.connectionId}-${source.networkId}-${data.key}`,
        source: "ad_manager" as const,
        connectionId: source.connectionId,
        networkId: source.networkId,
        key: data.key,
        label: data.label,
        domain: data.domain,
        country: data.country,
        countryCode: data.countryCode,
        originalCurrencyCode: currencyCode, // Track original currency for conversion
        metrics: this.calculateMetrics(
          revenueInDollars,
          data.impressions,
          data.clicks,
          data.requests,
          data.viewableImpressions,
          data.measurableImpressions,
        ),
        childCount: data.children.size,
      };
    });
  }

  /**
   * Process AdSense raw rows into RevenueRows
   */
  private processAdSenseRows(
    rawRows: AdSenseRawRow[],
    source: RevenueSourceDto,
    groupBy: RevenueGroupBy,
    currencyCode: string,
  ): RevenueRow[] {
    const dataMap = new Map<
      string,
      {
        key: string;
        label: string;
        domain: string;
        country?: string;
        countryCode?: string;
        revenue: number;
        impressions: number;
        clicks: number;
        requests: number;
        viewability: number;
        childCount: number;
        children: Set<string>;
      }
    >();

    for (const row of rawRows) {
      const pageUrl = row.PAGE_URL || "";
      // Extract domain from PAGE_URL (more reliable than DOMAIN_NAME which can be partial)
      // DOMAIN_NAME sometimes returns just "blog" instead of the full domain
      const domain =
        this.extractDomainFromUrl(pageUrl) || row.DOMAIN_NAME || "";
      const date = row.DATE || "";

      // Determine grouping key and label
      let mapKey: string;
      let label: string;
      let childKey: string;

      switch (groupBy) {
        case "domain":
          mapKey = domain || "Unknown";
          label = domain || "Unknown";
          childKey = pageUrl || date;
          break;
        case "date_day":
          mapKey = `${date}|||${domain}`;
          label = this.formatDateLabel(date);
          childKey = pageUrl;
          break;
        case "date_week":
          const weekKey = date ? this.getWeekKey(date) : "Unknown";
          mapKey = `${weekKey}|||${domain}`;
          label = this.formatWeekLabel(weekKey);
          childKey = date;
          break;
        case "date_month":
          const monthKey = date ? this.getMonthKey(date) : "Unknown";
          mapKey = `${monthKey}|||${domain}`;
          label = this.formatMonthLabel(monthKey);
          childKey = date;
          break;
        case "url":
          const slug = this.extractSlugFromUrl(pageUrl);
          // Include domain in key to keep rows separate per domain
          mapKey = `${slug}|||${domain}`;
          label = slug || "/";
          childKey = date;
          break;
        case "url_full":
          // Include domain in key to keep rows separate per domain
          mapKey = `${pageUrl}|||${domain}`;
          label = pageUrl || "/";
          childKey = date;
          break;
        case "country":
          mapKey = row.COUNTRY_CODE || "Unknown";
          label = row.COUNTRY_NAME || row.COUNTRY_CODE || "Unknown";
          childKey = `${domain}|||${date}`;
          break;
        default:
          mapKey = domain || "Unknown";
          label = domain || "Unknown";
          childKey = pageUrl || date;
      }

      if (!dataMap.has(mapKey)) {
        dataMap.set(mapKey, {
          key: mapKey,
          label,
          domain,
          country: row.COUNTRY_NAME,
          countryCode: row.COUNTRY_CODE,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          requests: 0,
          viewability: 0,
          childCount: 0,
          children: new Set(),
        });
      }

      const data = dataMap.get(mapKey)!;
      if (childKey) data.children.add(childKey);
      data.revenue += row.ESTIMATED_EARNINGS || 0;
      data.impressions += row.IMPRESSIONS || 0;
      data.clicks += row.CLICKS || 0;
      data.requests += row.AD_REQUESTS || row.IMPRESSIONS || 0;
      data.viewability += row.ACTIVE_VIEW_VIEWABILITY || 0;
    }

    // Convert to RevenueRow array
    return Array.from(dataMap.values()).map((data) => ({
      id: `as-${source.connectionId}-${source.accountId}-${data.key}`,
      source: "adsense" as const,
      connectionId: source.connectionId,
      accountId: source.accountId,
      key: data.key,
      label: data.label,
      domain: data.domain,
      country: data.country,
      countryCode: data.countryCode,
      originalCurrencyCode: currencyCode, // Track original currency for conversion
      metrics: {
        revenue: data.revenue,
        impressions: data.impressions,
        clicks: data.clicks,
        requests: data.requests,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        cpc: data.clicks > 0 ? data.revenue / data.clicks : 0,
        rpm:
          data.impressions > 0 ? (data.revenue / data.impressions) * 1000 : 0,
        rps: data.requests > 0 ? (data.revenue / data.requests) * 1000 : 0,
        pmr: data.requests > 0 ? (data.impressions / data.requests) * 100 : 0,
        viewability: data.viewability,
        fillRate:
          data.requests > 0 ? (data.impressions / data.requests) * 100 : 0,
      },
      childCount: data.children.size,
    }));
  }

  /**
   * Fetch expanded data from a single source
   */
  private async fetchExpandData(
    source: RevenueSourceDto,
    startDate: string,
    endDate: string,
    primaryGroupBy: RevenueGroupBy,
    subGroupBy: string,
    parentKey: string,
    parentDomain: string | undefined,
    userId: string,
  ): Promise<RevenueExpandResponseDto["items"]> {
    // For now, delegate to existing expand logic
    // This can be optimized later to only fetch needed dimensions

    if (source.type === "ad_manager") {
      // Use existing Ad Manager expand
      const connection =
        await this.adManagerOAuthService.getConnectionWithValidToken(
          source.connectionId,
          userId,
        );

      // Get currency code from network metadata
      const networks = connection.metadata?.networks || [];
      const network = networks.find(
        (n: { id: string }) => n.id === source.networkId,
      );
      const currencyCode = network?.currencyCode || "USD";

      // Fetch with both primary and sub dimensions
      const dimensions = this.getExpandDimensions(
        primaryGroupBy,
        subGroupBy as any,
      );
      this.logger.log(
        `[EXPAND DEBUG] Fetching Ad Manager expand for networkId=${source.networkId}, ` +
          `dimensions=[${dimensions.join(", ")}], dateRange=${startDate} to ${endDate}`,
      );

      const rawRows = await this.runAdManagerReport(
        connection.access_token,
        source.networkId!,
        startDate,
        endDate,
        dimensions,
        [
          "AD_EXCHANGE_IMPRESSIONS",
          "AD_EXCHANGE_CLICKS",
          "AD_EXCHANGE_REVENUE",
          "AD_EXCHANGE_TOTAL_REQUESTS",
          "AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS",
          "AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS",
        ],
      );

      this.logger.log(
        `[EXPAND DEBUG] Ad Manager API returned ${rawRows.length} raw rows for networkId=${source.networkId}`,
      );

      return this.processExpandRows(
        rawRows,
        primaryGroupBy,
        subGroupBy as any,
        parentKey,
        parentDomain,
        currencyCode,
      );
    } else {
      // Use existing AdSense expand
      const connection =
        await this.adSenseOAuthService.getConnectionWithValidToken(
          source.connectionId,
          userId,
        );

      // Get currency code from account metadata
      const accounts = connection.metadata?.accounts || [];
      const account = accounts.find(
        (a: { id: string }) => a.id === source.accountId,
      );
      const currencyCode = account?.currencyCode || "USD";

      const dimensions = this.getAdSenseExpandDimensions(
        primaryGroupBy,
        subGroupBy as any,
      );
      const rawRows = await this.runAdSenseReport(
        connection.access_token,
        source.accountId!,
        startDate,
        endDate,
        dimensions,
        [
          "ESTIMATED_EARNINGS",
          "IMPRESSIONS",
          "CLICKS",
          "PAGE_VIEWS",
          "AD_REQUESTS",
          "ACTIVE_VIEW_VIEWABILITY",
        ],
      );

      return this.processAdSenseExpandRows(
        rawRows,
        primaryGroupBy,
        subGroupBy as any,
        parentKey,
        parentDomain,
        currencyCode,
      );
    }
  }

  /**
   * Get dimensions needed for expand
   */
  private getExpandDimensions(
    primaryGroupBy: RevenueGroupBy,
    subGroupBy: RevenueGroupBy,
  ): string[] {
    const dims = new Set<string>();

    // Primary dimension
    switch (primaryGroupBy) {
      case "domain":
        dims.add("TOP_PRIVATE_DOMAIN");
        break;
      case "date_day":
      case "date_week":
      case "date_month":
        dims.add("DATE");
        dims.add("TOP_PRIVATE_DOMAIN");
        break;
      case "url":
      case "url_full":
        // Use KEY_VALUES_NAME for expand (URL_NAME may not have data in all accounts)
        dims.add("KEY_VALUES_NAME");
        dims.add("TOP_PRIVATE_DOMAIN");
        break;
      case "country":
        dims.add("COUNTRY_CODE");
        dims.add("COUNTRY_NAME");
        dims.add("TOP_PRIVATE_DOMAIN");
        break;
    }

    // Sub dimension
    switch (subGroupBy) {
      case "date_day":
      case "date_week":
      case "date_month":
        dims.add("DATE");
        break;
      case "url":
      case "url_full":
        // Use KEY_VALUES_NAME for expand (URL_NAME may not have data in all accounts)
        dims.add("KEY_VALUES_NAME");
        break;
      case "domain":
        dims.add("TOP_PRIVATE_DOMAIN");
        break;
      case "country":
        dims.add("COUNTRY_CODE");
        dims.add("COUNTRY_NAME");
        break;
    }

    return Array.from(dims);
  }

  /**
   * Get AdSense dimensions for expand
   */
  private getAdSenseExpandDimensions(
    primaryGroupBy: RevenueGroupBy,
    subGroupBy: RevenueGroupBy,
  ): string[] {
    const dims = new Set<string>();

    // Primary
    switch (primaryGroupBy) {
      case "domain":
        dims.add("DOMAIN_NAME");
        break;
      case "date_day":
      case "date_week":
      case "date_month":
        dims.add("DATE");
        dims.add("DOMAIN_NAME");
        break;
      case "url":
      case "url_full":
        dims.add("PAGE_URL");
        dims.add("DOMAIN_NAME");
        break;
      case "country":
        dims.add("COUNTRY_CODE");
        dims.add("COUNTRY_NAME");
        dims.add("DOMAIN_NAME");
        break;
    }

    // Sub
    switch (subGroupBy) {
      case "date_day":
      case "date_week":
      case "date_month":
        dims.add("DATE");
        break;
      case "url":
      case "url_full":
        dims.add("PAGE_URL");
        break;
      case "domain":
        dims.add("DOMAIN_NAME");
        break;
      case "country":
        dims.add("COUNTRY_CODE");
        dims.add("COUNTRY_NAME");
        break;
    }

    return Array.from(dims);
  }

  /**
   * Process expand rows from Ad Manager
   */
  private processExpandRows(
    rawRows: AdManagerRawRow[],
    primaryGroupBy: RevenueGroupBy,
    subGroupBy: RevenueGroupBy,
    parentKey: string,
    parentDomain?: string,
    currencyCode: string = "USD",
  ): RevenueExpandResponseDto["items"] {
    // Debug: Log raw data received for expand
    this.logger.log(
      `[EXPAND DEBUG] Raw rows: ${rawRows.length}, primaryGroupBy: ${primaryGroupBy}, ` +
        `subGroupBy: ${subGroupBy}, parentKey: "${parentKey}", parentDomain: "${parentDomain}"`,
    );

    // Debug: Sample raw row to see what dimensions we received
    if (rawRows.length > 0) {
      const sample = rawRows[0];
      this.logger.log(
        `[EXPAND DEBUG] Sample row: TOP_PRIVATE_DOMAIN="${sample.TOP_PRIVATE_DOMAIN}", ` +
          `KEY_VALUES_NAME="${sample.KEY_VALUES_NAME}", DATE="${sample.DATE}", ` +
          `COUNTRY_CODE="${sample.COUNTRY_CODE}"`,
      );
    }

    // Debug: Count unique domains in raw data
    const uniqueDomains = new Set(
      rawRows.map((r) => this.cleanDomain(r.TOP_PRIVATE_DOMAIN || "")),
    );
    this.logger.log(
      `[EXPAND DEBUG] Unique domains in raw data: ${uniqueDomains.size} - [${Array.from(uniqueDomains).slice(0, 5).join(", ")}${uniqueDomains.size > 5 ? "..." : ""}]`,
    );

    // Filter rows that belong to parent
    const filteredRows = rawRows.filter((row) => {
      const domain = this.cleanDomain(row.TOP_PRIVATE_DOMAIN || "");
      const keyValue = this.cleanKeyValue(row.KEY_VALUES_NAME || "");
      const date = row.DATE || "";

      // Extract actual parent key (remove source prefix if present)
      const actualParentKey = parentKey.includes("|||")
        ? parentKey.split("|||")[0]
        : parentKey;

      switch (primaryGroupBy) {
        case "domain":
          return domain === actualParentKey;
        case "date_day":
          return (
            date === actualParentKey &&
            (!parentDomain || domain === parentDomain)
          );
        case "date_week":
          return (
            this.getWeekKey(date) === actualParentKey &&
            (!parentDomain || domain === parentDomain)
          );
        case "date_month":
          return (
            this.getMonthKey(date) === actualParentKey &&
            (!parentDomain || domain === parentDomain)
          );
        case "url":
          return this.extractSlug(keyValue) === actualParentKey;
        case "url_full":
          return this.extractFullUrl(keyValue) === actualParentKey;
        case "country":
          return row.COUNTRY_CODE === actualParentKey;
        default:
          return false;
      }
    });

    // Debug: Log filter results
    this.logger.log(
      `[EXPAND DEBUG] Filtered rows: ${filteredRows.length}/${rawRows.length} matched parentKey="${parentKey}"`,
    );

    // If filtered is empty but we have raw rows, log what domains exist vs what we're looking for
    if (
      filteredRows.length === 0 &&
      rawRows.length > 0 &&
      primaryGroupBy === "domain"
    ) {
      const actualParentKey = parentKey.includes("|||")
        ? parentKey.split("|||")[0]
        : parentKey;
      const domainsInData = Array.from(uniqueDomains);
      this.logger.warn(
        `[EXPAND DEBUG] Domain filter found NO matches! ` +
          `Looking for: "${actualParentKey}" | Available: [${domainsInData.join(", ")}]`,
      );
    }

    // Group by subGroupBy
    const groupedData = new Map<
      string,
      {
        key: string;
        label: string;
        country?: string;
        countryCode?: string;
        revenue: number;
        impressions: number;
        clicks: number;
        requests: number;
        viewableImpressions: number;
        measurableImpressions: number;
        children: Set<string>;
      }
    >();

    for (const row of filteredRows) {
      const domain = this.cleanDomain(row.TOP_PRIVATE_DOMAIN || "");
      const keyValue = this.cleanKeyValue(row.KEY_VALUES_NAME || "");
      const date = row.DATE || "";

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
        case "url":
          const slug = this.extractSlug(keyValue);
          if (!keyValue.includes("/")) continue;
          groupKey = slug;
          groupLabel = slug || "/";
          childKey = date;
          break;
        case "url_full":
          if (!keyValue.includes("/")) continue;
          const expandFullUrl = this.extractFullUrl(keyValue);
          groupKey = expandFullUrl;
          groupLabel = expandFullUrl || "/";
          childKey = date;
          break;
        case "domain":
          groupKey = domain;
          groupLabel = domain || "Unknown";
          childKey = `${keyValue}|||${date}`;
          break;
        case "country":
          groupKey = row.COUNTRY_CODE || "Unknown";
          groupLabel = row.COUNTRY_NAME || row.COUNTRY_CODE || "Unknown";
          childKey = `${domain}|||${date}`;
          break;
        default:
          continue;
      }

      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          country: subGroupBy === "country" ? row.COUNTRY_NAME : undefined,
          countryCode: subGroupBy === "country" ? row.COUNTRY_CODE : undefined,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          requests: 0,
          viewableImpressions: 0,
          measurableImpressions: 0,
          children: new Set(),
        });
      }

      const data = groupedData.get(groupKey)!;
      if (childKey) data.children.add(childKey);
      data.revenue += row.AD_EXCHANGE_REVENUE || 0;
      data.impressions += row.AD_EXCHANGE_IMPRESSIONS || 0;
      data.clicks += row.AD_EXCHANGE_CLICKS || 0;
      data.requests += row.AD_EXCHANGE_TOTAL_REQUESTS || 0;
      data.viewableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_VIEWABLE_IMPRESSIONS || 0;
      data.measurableImpressions +=
        row.AD_EXCHANGE_ACTIVE_VIEW_MEASURABLE_IMPRESSIONS || 0;
    }

    // Get exchange rate for currency conversion info
    const exchangeRate =
      currencyCode !== "USD" ? getExchangeRateToUSD(currencyCode) : undefined;

    return Array.from(groupedData.values()).map((data) => {
      const revenueInDollars = data.revenue / 1000000;

      // Apply currency conversion if not USD
      const convertedRevenue =
        currencyCode !== "USD"
          ? convertToUSD(revenueInDollars, currencyCode)
          : revenueInDollars;

      const metrics = this.calculateMetrics(
        convertedRevenue,
        data.impressions,
        data.clicks,
        data.requests,
        data.viewableImpressions,
        data.measurableImpressions,
      );

      // Also convert monetary metrics (cpc, rpm, rps)
      if (currencyCode !== "USD") {
        metrics.cpc = convertToUSD(metrics.cpc, currencyCode);
        metrics.rpm = convertToUSD(metrics.rpm, currencyCode);
        metrics.rps = convertToUSD(metrics.rps, currencyCode);
      }

      return {
        key: data.key,
        label: data.label,
        groupType: subGroupBy,
        childCount: data.children.size,
        country: data.country,
        countryCode: data.countryCode,
        // Currency conversion info (for tooltip display)
        originalCurrencyCode: currencyCode !== "USD" ? currencyCode : undefined,
        originalRevenue: currencyCode !== "USD" ? revenueInDollars : undefined,
        exchangeRate,
        metrics,
      };
    });
  }

  /**
   * Process expand rows from AdSense
   */
  private processAdSenseExpandRows(
    rawRows: AdSenseRawRow[],
    primaryGroupBy: RevenueGroupBy,
    subGroupBy: RevenueGroupBy,
    parentKey: string,
    parentDomain?: string,
    currencyCode: string = "USD",
  ): RevenueExpandResponseDto["items"] {
    // Similar to Ad Manager but with AdSense fields
    const filteredRows = rawRows.filter((row) => {
      const pageUrl = row.PAGE_URL || "";
      // Extract domain from PAGE_URL (more reliable than DOMAIN_NAME)
      const domain =
        this.extractDomainFromUrl(pageUrl) || row.DOMAIN_NAME || "";
      const date = row.DATE || "";

      const actualParentKey = parentKey.includes("|||")
        ? parentKey.split("|||")[0]
        : parentKey;

      switch (primaryGroupBy) {
        case "domain":
          return domain === actualParentKey;
        case "date_day":
          return (
            date === actualParentKey &&
            (!parentDomain || domain === parentDomain)
          );
        case "date_week":
          return (
            this.getWeekKey(date) === actualParentKey &&
            (!parentDomain || domain === parentDomain)
          );
        case "date_month":
          return (
            this.getMonthKey(date) === actualParentKey &&
            (!parentDomain || domain === parentDomain)
          );
        case "url":
          return this.extractSlugFromUrl(pageUrl) === actualParentKey;
        case "url_full":
          return pageUrl === actualParentKey;
        case "country":
          return row.COUNTRY_CODE === actualParentKey;
        default:
          return false;
      }
    });

    const groupedData = new Map<
      string,
      {
        key: string;
        label: string;
        country?: string;
        countryCode?: string;
        revenue: number;
        impressions: number;
        clicks: number;
        requests: number;
        viewability: number;
        children: Set<string>;
      }
    >();

    for (const row of filteredRows) {
      const pageUrl = row.PAGE_URL || "";
      // Extract domain from PAGE_URL (more reliable than DOMAIN_NAME which can be partial like "blog")
      const domain =
        this.extractDomainFromUrl(pageUrl) || row.DOMAIN_NAME || "";
      const date = row.DATE || "";

      let groupKey: string;
      let groupLabel: string;
      let childKey: string;

      switch (subGroupBy) {
        case "date_day":
          groupKey = date;
          groupLabel = this.formatDateLabel(date);
          childKey = `${domain}|||${pageUrl}`;
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
        case "url":
          const slug = this.extractSlugFromUrl(pageUrl);
          groupKey = slug;
          groupLabel = slug || "/";
          childKey = date;
          break;
        case "url_full":
          groupKey = pageUrl;
          groupLabel = pageUrl || "/";
          childKey = date;
          break;
        case "domain":
          groupKey = domain;
          groupLabel = domain || "Unknown";
          childKey = `${pageUrl}|||${date}`;
          break;
        case "country":
          groupKey = row.COUNTRY_CODE || "Unknown";
          groupLabel = row.COUNTRY_NAME || row.COUNTRY_CODE || "Unknown";
          childKey = `${domain}|||${date}`;
          break;
        default:
          continue;
      }

      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          country: subGroupBy === "country" ? row.COUNTRY_NAME : undefined,
          countryCode: subGroupBy === "country" ? row.COUNTRY_CODE : undefined,
          revenue: 0,
          impressions: 0,
          clicks: 0,
          requests: 0,
          viewability: 0,
          children: new Set(),
        });
      }

      const data = groupedData.get(groupKey)!;
      if (childKey) data.children.add(childKey);
      data.revenue += row.ESTIMATED_EARNINGS || 0;
      data.impressions += row.IMPRESSIONS || 0;
      data.clicks += row.CLICKS || 0;
      data.requests += row.AD_REQUESTS || row.IMPRESSIONS || 0;
      data.viewability += row.ACTIVE_VIEW_VIEWABILITY || 0;
    }

    // Get exchange rate for currency conversion info
    const exchangeRate =
      currencyCode !== "USD" ? getExchangeRateToUSD(currencyCode) : undefined;

    return Array.from(groupedData.values()).map((data) => {
      const originalRevenue = data.revenue;

      // Apply currency conversion if not USD
      const convertedRevenue =
        currencyCode !== "USD"
          ? convertToUSD(data.revenue, currencyCode)
          : data.revenue;

      // Calculate metrics with converted revenue
      const ctr =
        data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      const cpc = data.clicks > 0 ? convertedRevenue / data.clicks : 0;
      const rpm =
        data.impressions > 0 ? (convertedRevenue / data.impressions) * 1000 : 0;
      const rps =
        data.requests > 0 ? (convertedRevenue / data.requests) * 1000 : 0;
      const pmr =
        data.requests > 0 ? (data.impressions / data.requests) * 100 : 0;
      const fillRate =
        data.requests > 0 ? (data.impressions / data.requests) * 100 : 0;

      return {
        key: data.key,
        label: data.label,
        groupType: subGroupBy,
        childCount: data.children.size,
        country: data.country,
        countryCode: data.countryCode,
        // Currency conversion info (for tooltip display)
        originalCurrencyCode: currencyCode !== "USD" ? currencyCode : undefined,
        originalRevenue: currencyCode !== "USD" ? originalRevenue : undefined,
        exchangeRate,
        metrics: {
          revenue: convertedRevenue,
          impressions: data.impressions,
          clicks: data.clicks,
          requests: data.requests,
          ctr,
          cpc,
          rpm,
          rps,
          pmr,
          viewability: data.viewability,
          fillRate,
        },
      };
    });
  }

  // ==================== Helper methods ====================

  private calculateMetrics(
    revenue: number,
    impressions: number,
    clicks: number,
    requests: number,
    viewableImpressions: number,
    measurableImpressions: number,
  ): RevenueMetrics {
    return {
      revenue,
      impressions,
      clicks,
      requests,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? revenue / clicks : 0,
      rpm: impressions > 0 ? (revenue / impressions) * 1000 : 0,
      rps: requests > 0 ? (revenue / requests) * 1000 : 0,
      pmr: requests > 0 ? (impressions / requests) * 100 : 0,
      viewability:
        measurableImpressions > 0
          ? (viewableImpressions / measurableImpressions) * 100
          : 0,
      fillRate: requests > 0 ? (impressions / requests) * 100 : 0,
    };
  }

  private aggregateMetrics(
    a: RevenueMetrics,
    b: RevenueMetrics,
  ): RevenueMetrics {
    const revenue = a.revenue + b.revenue;
    const impressions = a.impressions + b.impressions;
    const clicks = a.clicks + b.clicks;
    const requests = a.requests + b.requests;

    return {
      revenue,
      impressions,
      clicks,
      requests,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? revenue / clicks : 0,
      rpm: impressions > 0 ? (revenue / impressions) * 1000 : 0,
      rps: requests > 0 ? (revenue / requests) * 1000 : 0,
      pmr: requests > 0 ? (impressions / requests) * 100 : 0,
      viewability: 0, // Would need weighted average
      fillRate: requests > 0 ? (impressions / requests) * 100 : 0,
    };
  }

  private aggregateRows(
    rows: RevenueRow[],
    _groupBy: RevenueGroupBy,
  ): RevenueRow[] {
    const grouped = new Map<string, RevenueRow>();

    for (const row of rows) {
      const existing = grouped.get(row.key);
      if (existing) {
        // Aggregate metrics
        existing.metrics = this.aggregateMetrics(existing.metrics, row.metrics);
        existing.childCount =
          (existing.childCount || 0) + (row.childCount || 0);

        // Aggregate originalRevenue if both have currency conversion info
        if (
          row.originalRevenue !== undefined &&
          row.exchangeRate !== undefined
        ) {
          if (existing.originalRevenue !== undefined) {
            existing.originalRevenue += row.originalRevenue;
          } else {
            existing.originalRevenue = row.originalRevenue;
            existing.exchangeRate = row.exchangeRate;
          }
        }

        // Track aggregated sources
        if (!existing.aggregatedSources) {
          existing.aggregatedSources = [
            {
              source: existing.source,
              connectionId: existing.connectionId,
              networkId: existing.networkId,
              accountId: existing.accountId,
            },
          ];
        }
        existing.aggregatedSources.push({
          source: row.source,
          connectionId: row.connectionId,
          networkId: row.networkId,
          accountId: row.accountId,
        });
      } else {
        grouped.set(row.key, { ...row });
      }
    }

    return Array.from(grouped.values());
  }

  private sortRows(
    rows: RevenueRow[],
    sortBy: string,
    sortOrder: "asc" | "desc",
  ): RevenueRow[] {
    return [...rows].sort((a, b) => {
      if (sortBy === "key" || sortBy === "label" || sortBy === "domain") {
        const aVal = sortBy === "domain" ? a.domain || a.label : a.label;
        const bVal = sortBy === "domain" ? b.domain || b.label : b.label;
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const aVal = (a.metrics as any)[sortBy] ?? 0;
      const bVal = (b.metrics as any)[sortBy] ?? 0;
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });
  }

  private calculateSummary(
    rows: RevenueRow[],
    hasMultipleCurrencies: boolean,
    currencies: string[],
  ): RevenueSummary {
    let totalRevenue = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalRequests = 0;

    for (const row of rows) {
      totalRevenue += row.metrics.revenue;
      totalImpressions += row.metrics.impressions;
      totalClicks += row.metrics.clicks;
      totalRequests += row.metrics.requests;
    }

    return {
      revenue: totalRevenue,
      impressions: totalImpressions,
      clicks: totalClicks,
      requests: totalRequests,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      cpc: totalClicks > 0 ? totalRevenue / totalClicks : 0,
      rpm: totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0,
      currency: hasMultipleCurrencies ? "USD" : currencies[0] || "USD",
      hasMultipleCurrencies,
      currencies,
      conversionMessage: hasMultipleCurrencies
        ? `Valores convertidos para USD (moedas originais: ${currencies.join(", ")})`
        : undefined,
    };
  }

  // ===========================================================================
  // FIELD SELECTION / PROJECTION PUSHDOWN
  // ===========================================================================

  /**
   * Resolve which metrics to return based on fieldGroup or explicit metrics list.
   * Priority: explicit metrics > fieldGroup > default (tableView)
   */
  private resolveRequestedMetrics(
    fieldGroup?: RevenueFieldGroup,
    metrics?: RevenueMetricField[],
  ): RevenueMetricField[] {
    // Priority 1: Explicit metrics list
    if (metrics && metrics.length > 0) {
      return metrics;
    }

    // Priority 2: Field group
    if (fieldGroup) {
      return FIELD_GROUP_METRICS[fieldGroup];
    }

    // Default: tableView (most common use case)
    return FIELD_GROUP_METRICS[RevenueFieldGroup.TABLE_VIEW];
  }

  /**
   * Project metrics for a single row, returning only requested metrics.
   * This reduces response payload size.
   */
  private projectMetrics(
    originalMetrics: RevenueMetrics,
    requestedMetrics: RevenueMetricField[],
  ): Partial<RevenueMetrics> {
    // If requesting all metrics, return original (skip projection overhead)
    if (requestedMetrics.length === Object.values(RevenueMetricField).length) {
      return originalMetrics;
    }

    const projected: Partial<RevenueMetrics> = {};

    for (const metric of requestedMetrics) {
      switch (metric) {
        case RevenueMetricField.REVENUE:
          projected.revenue = originalMetrics.revenue;
          break;
        case RevenueMetricField.IMPRESSIONS:
          projected.impressions = originalMetrics.impressions;
          break;
        case RevenueMetricField.CLICKS:
          projected.clicks = originalMetrics.clicks;
          break;
        case RevenueMetricField.REQUESTS:
          projected.requests = originalMetrics.requests;
          break;
        case RevenueMetricField.CTR:
          projected.ctr = originalMetrics.ctr;
          break;
        case RevenueMetricField.CPC:
          projected.cpc = originalMetrics.cpc;
          break;
        case RevenueMetricField.RPM:
          projected.rpm = originalMetrics.rpm;
          break;
        case RevenueMetricField.RPS:
          projected.rps = originalMetrics.rps;
          break;
        case RevenueMetricField.PMR:
          projected.pmr = originalMetrics.pmr;
          break;
        case RevenueMetricField.VIEWABILITY:
          projected.viewability = originalMetrics.viewability;
          break;
        case RevenueMetricField.FILL_RATE:
          projected.fillRate = originalMetrics.fillRate;
          break;
      }
    }

    return projected;
  }

  /**
   * Apply field projection to an array of rows.
   */
  private projectMetricsForRows(
    rows: RevenueRow[],
    requestedMetrics: RevenueMetricField[],
  ): RevenueRow[] {
    // If requesting all metrics, return original rows (skip projection overhead)
    if (requestedMetrics.length === Object.values(RevenueMetricField).length) {
      return rows;
    }

    return rows.map((row) => ({
      ...row,
      metrics: this.projectMetrics(
        row.metrics,
        requestedMetrics,
      ) as RevenueMetrics,
    }));
  }

  /**
   * Normalize all revenue rows to USD using live exchange rates
   * Converts revenue, cpc, rpm, and rps metrics from original currency to USD
   */
  private normalizeToUSD(rows: RevenueRow[]): RevenueRow[] {
    // Track conversion statistics for debugging
    const conversionStats: Record<
      string,
      {
        count: number;
        totalOriginal: number;
        totalConverted: number;
        rate: number;
      }
    > = {};

    const normalizedRows = rows.map((row) => {
      const currency = row.originalCurrencyCode || "USD";

      // If already USD, no conversion needed
      if (currency === "USD") {
        return row;
      }

      // Get exchange rate for this currency
      const rate = getExchangeRateToUSD(currency);
      const originalRevenue = row.metrics.revenue;
      const convertedRevenue = convertToUSD(originalRevenue, currency);

      // Track stats
      if (!conversionStats[currency]) {
        conversionStats[currency] = {
          count: 0,
          totalOriginal: 0,
          totalConverted: 0,
          rate,
        };
      }
      conversionStats[currency].count++;
      conversionStats[currency].totalOriginal += originalRevenue;
      conversionStats[currency].totalConverted += convertedRevenue;

      // Convert monetary metrics: revenue, cpc, rpm, rps
      // Include original values for tooltip display in frontend
      return {
        ...row,
        originalRevenue: originalRevenue, // Store original for tooltip
        exchangeRate: rate, // Store rate for tooltip
        metrics: {
          ...row.metrics,
          revenue: convertedRevenue,
          cpc: convertToUSD(row.metrics.cpc, currency),
          rpm: convertToUSD(row.metrics.rpm, currency),
          rps: convertToUSD(row.metrics.rps, currency),
        },
      };
    });

    // Log conversion summary
    const currenciesConverted = Object.keys(conversionStats);
    if (currenciesConverted.length > 0) {
      this.logger.log(`[CURRENCY DEBUG] Conversion summary:`);
      for (const currency of currenciesConverted) {
        const stats = conversionStats[currency];
        this.logger.log(
          `  ${currency} → USD: ${stats.count} rows, ` +
            `${stats.totalOriginal.toFixed(2)} ${currency} → ${stats.totalConverted.toFixed(2)} USD ` +
            `(rate: ${stats.rate.toFixed(6)})`,
        );
      }

      const totalOriginal = Object.values(conversionStats).reduce(
        (sum, s) => sum + s.totalOriginal,
        0,
      );
      const totalConverted = Object.values(conversionStats).reduce(
        (sum, s) => sum + s.totalConverted,
        0,
      );
      this.logger.log(
        `  TOTAL: ${totalOriginal.toFixed(2)} (original) → ${totalConverted.toFixed(2)} USD`,
      );
    }

    return normalizedRows;
  }

  // String helpers
  private cleanDomain(raw: string): string {
    if (!raw) return "";
    const invalidPrefixes = [
      "null_",
      "broadcast_",
      "chatbot_",
      "experiment_",
      "control_",
      "test_",
    ];
    for (const prefix of invalidPrefixes) {
      if (raw.toLowerCase().startsWith(prefix.toLowerCase())) return "";
    }
    if (!raw.includes(".") && raw.includes("_")) return "";
    return raw;
  }

  /**
   * Extract URL from KEY_VALUES_NAME, using ONLY land_uri= to avoid revenue duplication.
   *
   * IMPORTANT: Ad Manager returns multiple rows per impression when multiple key-values exist.
   * For example, the same impression might have:
   *   - land_uri=/page (landing page URL)
   *   - request_uri=/page (request URL)
   *   - experiment=control (A/B test)
   *
   * Each of these is a separate row with the SAME revenue. If we accept both land_uri= and
   * request_uri=, we would count the same revenue multiple times.
   *
   * Solution: Only accept land_uri= (landing page) to ensure each impression is counted once.
   * Other key-values (request_uri=, experiment=, etc.) are skipped and return empty string.
   */
  private cleanKeyValue(raw: string): string {
    if (!raw) return "";

    // ONLY accept land_uri= to avoid revenue duplication
    // request_uri= and other key-values for the same impression would duplicate revenue
    if (raw.toLowerCase().includes("land_uri=")) {
      const match = raw.match(/land_uri=([^\s,]+)/i);
      if (match) return match[1];
    }

    // DO NOT accept request_uri= or other URL-containing key-values
    // They represent the same impression as land_uri= and would duplicate revenue

    // Accept direct paths that don't have a key= prefix (legacy data)
    if (raw.startsWith("/")) return raw;

    // For other key-values that don't match our criteria, return empty string
    // This will cause them to be filtered out by the "!keyValue.includes('/')" check
    return "";
  }

  private extractSlug(keyValue: string): string {
    let path = keyValue;

    // Remove key-value prefix (e.g., "land_uri=/path" -> "/path")
    if (path.includes("=")) {
      const parts = path.split("=");
      path = parts.slice(1).join("=");
    }

    // Remove UTM/tracking prefixes like "captura_", "facebook_", "broad_", etc.
    // These are Ad Manager key-value prefixes that precede the actual URL path
    // Pattern: word followed by underscore, then the path starting with /
    // Examples: "captura_/how-to-..." -> "/how-to-..."
    //           "facebook_/tips-for-..." -> "/tips-for-..."
    //           "broad_/top-credit-..." -> "/top-credit-..."
    const prefixMatch = path.match(/^[a-zA-Z0-9]+_(\/.*)$/);
    if (prefixMatch) {
      path = prefixMatch[1];
    }

    // Handle full URLs
    if (path.startsWith("http://") || path.startsWith("https://")) {
      try {
        const url = new URL(path);
        path = url.pathname;
      } catch {
        // Invalid URL, keep original path
      }
    }

    // Remove query string and hash
    const queryIdx = path.indexOf("?");
    if (queryIdx !== -1) path = path.substring(0, queryIdx);
    const hashIdx = path.indexOf("#");
    if (hashIdx !== -1) path = path.substring(0, hashIdx);

    return path || "/";
  }

  private extractSlugFromUrl(url: string): string {
    if (!url) return "/";
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.pathname || "/";
    } catch {
      return url.split("?")[0] || "/";
    }
  }

  /**
   * Extract full URL path with UTM/tracking prefixes preserved.
   * Only removes the key-value prefix (e.g., "land_uri=") but keeps tracking identifiers.
   * Use this for url_full grouping where users want to see UTM sources.
   *
   * Examples:
   *   "land_uri=captura_/how-to-..." -> "captura_/how-to-..."
   *   "land_uri=/simple-path" -> "/simple-path"
   *   "utm_source=facebook_/tips" -> "facebook_/tips"
   */
  private extractFullUrl(keyValue: string): string {
    let path = keyValue;

    // Remove key-value prefix (e.g., "land_uri=/path" -> "/path" or "captura_/path")
    if (path.includes("=")) {
      const parts = path.split("=");
      path = parts.slice(1).join("=");
    }

    // Keep UTM/tracking prefixes (unlike extractSlug which removes them)
    // This allows users to see the full path with tracking identifiers

    return path || "/";
  }

  /**
   * Extract domain (hostname) from a full URL.
   * Used for AdSense where PAGE_URL contains the full URL including domain.
   *
   * Examples:
   *   "https://www.hipnose.com.br/blog/dieta" -> "www.hipnose.com.br"
   *   "http://example.com/page" -> "example.com"
   *   "/just-a-path" -> "" (no domain)
   */
  private extractDomainFromUrl(url: string): string {
    if (!url) return "";

    try {
      // If URL doesn't start with http, try adding protocol
      const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
      const parsed = new URL(urlWithProtocol);
      return parsed.hostname || "";
    } catch {
      // If URL parsing fails, try to extract domain manually
      // Handle cases like "www.example.com/path"
      const match = url.match(/^(?:https?:\/\/)?([^/]+)/);
      if (match && match[1] && match[1].includes(".")) {
        return match[1];
      }
      return "";
    }
  }

  private getWeekKey(dateStr: string): string {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor(
      (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
    );
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
  }

  private getMonthKey(dateStr: string): string {
    return dateStr.substring(0, 7);
  }

  private formatDateLabel(dateStr: string): string {
    if (!dateStr || dateStr.length !== 10) return dateStr;
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  }

  private formatWeekLabel(weekKey: string): string {
    if (!weekKey || !weekKey.includes("-W")) return weekKey;
    const [year, week] = weekKey.split("-W");
    return `Semana ${parseInt(week, 10)}, ${year}`;
  }

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

  private parseMetricValue(
    value:
      | { intValue?: string; integerValue?: string; doubleValue?: number }
      | undefined,
  ): number {
    if (!value) return 0;
    if (value.intValue) return parseInt(value.intValue, 10);
    if (value.integerValue) return parseInt(value.integerValue, 10);
    if (value.doubleValue !== undefined) return Math.round(value.doubleValue);
    return 0;
  }

  private parseRevenueValue(
    value:
      | { doubleValue?: number; intValue?: string; micros?: string }
      | undefined,
  ): number {
    if (!value) return 0;
    if (value.doubleValue !== undefined)
      return Math.round(value.doubleValue * 1000000);
    if (value.micros) return parseInt(value.micros, 10);
    if (value.intValue) return parseInt(value.intValue, 10);
    return 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch with timeout to prevent indefinite hangs
   */
  private async fetchWithTimeout(
    url: string | URL,
    options: RequestInit = {},
    timeoutMs = this.REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error: any) {
      if (error.name === "AbortError") {
        const timeoutError = new Error(`Request timeout after ${timeoutMs}ms`);
        (timeoutError as any).code = "ETIMEDOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Retry with exponential backoff + jitter for rate-limited requests
   * Jitter prevents thundering herd when multiple requests retry simultaneously
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 5,
    initialDelay = 3000,
  ): Promise<T> {
    let baseDelay = initialDelay;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isRateLimit =
          error.status === 429 ||
          error.message?.includes("QUOTA_EXCEEDED") ||
          error.message?.includes("rate limit");

        const isTransient =
          error.status === 503 ||
          error.status === 502 ||
          error.code === "ECONNRESET" ||
          error.code === "ETIMEDOUT";

        if ((isRateLimit || isTransient) && i < maxRetries - 1) {
          // Add jitter: delay ± 30% to prevent thundering herd
          const jitter = baseDelay * (0.7 + Math.random() * 0.6);
          const delayWithJitter = Math.round(jitter);

          this.logger.warn(
            `${isRateLimit ? "Rate limited" : "Transient error"}, retrying in ${delayWithJitter}ms (attempt ${i + 1}/${maxRetries})`,
          );
          await this.sleep(delayWithJitter);
          baseDelay *= 2; // Exponential backoff
        } else if (isRateLimit) {
          throw new InternalServerErrorException(
            "API rate limit exceeded. Please wait a few minutes.",
          );
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if an error is retryable (transient errors that might succeed on retry)
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // HTTP status codes that are retryable
    const retryableStatuses = [429, 500, 502, 503, 504];
    if (retryableStatuses.includes(error.status)) return true;

    // Network errors
    const retryableCodes = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",
    ];
    if (retryableCodes.includes(error.code)) return true;

    // Error messages that indicate transient issues
    const message = error.message?.toLowerCase() || "";
    if (
      message.includes("rate limit") ||
      message.includes("quota exceeded") ||
      message.includes("timeout") ||
      message.includes("temporarily unavailable") ||
      message.includes("service unavailable") ||
      message.includes("internal error")
    ) {
      return true;
    }

    return false;
  }

  /**
   * Convert technical error to user-friendly message (Nielsen's error messages)
   * Messages should be clear, specific, and suggest solutions
   */
  private getUserFriendlyError(error: any): string {
    if (!error) return "Erro desconhecido";

    const message = error.message?.toLowerCase() || "";
    const status = error.status;

    // Rate limiting
    if (
      status === 429 ||
      message.includes("rate limit") ||
      message.includes("quota")
    ) {
      return "Limite de requisições excedido. Tente novamente em alguns minutos.";
    }

    // Timeout
    if (error.code === "ETIMEDOUT" || message.includes("timeout")) {
      return "A conexão demorou muito para responder. Verifique sua internet.";
    }

    // Network errors
    if (error.code === "ECONNRESET" || error.code === "ECONNREFUSED") {
      return "Falha na conexão. Verifique sua internet e tente novamente.";
    }

    // Server errors
    if (status >= 500 && status < 600) {
      return "O servidor do Google está temporariamente indisponível. Tente novamente em alguns minutos.";
    }

    // Authentication errors
    if (
      status === 401 ||
      status === 403 ||
      message.includes("unauthorized") ||
      message.includes("forbidden")
    ) {
      return "Credenciais inválidas ou expiradas. Reconecte sua conta nas Conexões.";
    }

    // Not found
    if (status === 404 || message.includes("not found")) {
      return "Conta ou rede não encontrada. Verifique suas configurações.";
    }

    // Generic error with original message (truncated)
    const originalMessage = error.message || "Erro ao carregar dados";
    return originalMessage.length > 100
      ? originalMessage.slice(0, 100) + "..."
      : originalMessage;
  }
}
