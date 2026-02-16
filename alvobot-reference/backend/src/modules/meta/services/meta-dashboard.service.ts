/**
 * Meta Dashboard Service
 * T038: Service for Meta dashboard operations
 *
 * Handles fetching campaigns, metrics, and campaign actions
 * for the unified ads dashboard.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import pLimit from "p-limit";
import {
  MetaDashboardPeriod,
  MetaCampaignStatus,
  MetaDashboardCampaign,
  MetaDashboardResponse,
  MetaCampaignActionResponse,
  MetaBudgetUpdateResponse,
  MetaActionLogEntry,
  MetaActionLogFilters,
  MetaCampaignHierarchyResponse,
  MetaAdSet,
  MetaAd,
  MetaAdMetrics,
} from "../dto/meta-campaign-metrics.dto";

// ============================================
// Period Calculation Helper
// ============================================

function getDateRangeFromPeriod(period: MetaDashboardPeriod): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let startDate: Date;
  let endDate: Date = today;

  switch (period) {
    case MetaDashboardPeriod.TODAY:
      startDate = today;
      break;
    case MetaDashboardPeriod.YESTERDAY:
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      endDate = new Date(startDate);
      break;
    case MetaDashboardPeriod.LAST_7D:
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case MetaDashboardPeriod.LAST_30D:
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      break;
    case MetaDashboardPeriod.THIS_MONTH:
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case MetaDashboardPeriod.LAST_MONTH:
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    default:
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
  }

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

// ============================================
// Service
// ============================================

@Injectable()
export class MetaDashboardService {
  private readonly logger = new Logger(MetaDashboardService.name);
  private supabase: SupabaseClient;

  // Concurrency control for Meta API
  private readonly MAX_CONCURRENT_REQUESTS = 10;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY_MS = 1000;
  // Per-request timeout to prevent hanging connections (Meta API can be slow)
  private readonly REQUEST_TIMEOUT_MS = 25_000; // 25 seconds

  // Cache TTL: 5 minutes for real-time data
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  // Track cache keys per adAccountId for targeted invalidation
  private readonly cacheKeysByAccount = new Map<string, Set<string>>();

  constructor(
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.supabase = createClient(
      this.configService.get<string>("SUPABASE_URL")!,
      this.configService.get<string>("SUPABASE_SERVICE_KEY")!,
    );
  }

  // ============================================
  // Cache Utilities
  // ============================================

  /**
   * Track a cache key for an ad account (for targeted invalidation)
   */
  private trackCacheKey(adAccountId: string, cacheKey: string): void {
    if (!this.cacheKeysByAccount.has(adAccountId)) {
      this.cacheKeysByAccount.set(adAccountId, new Set());
    }
    this.cacheKeysByAccount.get(adAccountId)!.add(cacheKey);
  }

  /**
   * Invalidate campaign cache for an ad account
   * Called after campaign actions (pause, enable, budget update)
   * Deletes all tracked cache keys for the given ad account
   */
  async invalidateCampaignCache(adAccountId: string): Promise<void> {
    if (!adAccountId) return;

    const trackedKeys = this.cacheKeysByAccount.get(adAccountId);
    if (!trackedKeys || trackedKeys.size === 0) {
      this.logger.log(
        `No tracked cache keys for account ${adAccountId}, nothing to invalidate`,
      );
      return;
    }

    const deletedKeys: string[] = [];

    for (const key of trackedKeys) {
      try {
        await this.cacheManager.del(key);
        deletedKeys.push(key);
      } catch {
        // Key might not exist or already expired, ignore
      }
    }

    // Clear the tracked keys for this account
    this.cacheKeysByAccount.delete(adAccountId);

    this.logger.log(
      `Cache invalidated for Meta account ${adAccountId}: ${deletedKeys.length} keys cleared (${deletedKeys.join(", ")})`,
    );
  }

  // ============================================
  // Retry & Fetch Utilities
  // ============================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch with exponential backoff retry logic
   * Handles Meta API rate limits (429) and transient errors
   */
  private async fetchWithRetry(
    url: string,
    options?: RequestInit,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Apply per-request timeout to prevent hanging connections
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.REQUEST_TIMEOUT_MS,
        );
        const fetchOptions: RequestInit = {
          ...options,
          signal: controller.signal,
        };
        let response: Response;
        try {
          response = await fetch(url, fetchOptions);
        } finally {
          clearTimeout(timeoutId);
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get("Retry-After") || "60",
            10,
          );
          this.logger.warn(
            `Rate limited by Meta API. Waiting ${retryAfter}s (attempt ${attempt}/${this.MAX_RETRIES})`,
          );
          await this.sleep(retryAfter * 1000);
          continue;
        }

        // Handle server errors with retry
        if (response.status >= 500) {
          const delay =
            this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) +
            Math.random() * 1000;
          this.logger.warn(
            `Server error ${response.status}. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${this.MAX_RETRIES})`,
          );
          await this.sleep(delay);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.MAX_RETRIES) {
          const delay =
            this.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) +
            Math.random() * 1000;
          this.logger.warn(
            `Fetch error: ${lastError.message}. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${this.MAX_RETRIES})`,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  /**
   * Process items in parallel with controlled concurrency using pLimit.
   * Unlike batch-based processing (which waits for the entire batch to finish
   * before starting the next), pLimit keeps all slots busy at all times,
   * maximizing throughput.
   */
  private async processInBatches<T, R>(
    items: T[],
    processFn: (item: T) => Promise<R>,
    concurrency: number = this.MAX_CONCURRENT_REQUESTS,
  ): Promise<R[]> {
    const limit = pLimit(concurrency);
    return Promise.all(items.map((item) => limit(() => processFn(item))));
  }

  // ============================================
  // Metrics Mapping (Centralized)
  // ============================================

  /**
   * Map raw Meta API insight data to MetaAdMetrics
   * Centralized to avoid code duplication
   */
  private mapInsightToMetrics(insight: any): MetaAdMetrics {
    return {
      impressions: parseInt(insight?.impressions || "0", 10),
      clicks: parseInt(insight?.clicks || "0", 10),
      ctr: parseFloat(insight?.ctr || "0"),
      spend: parseFloat(insight?.spend || "0"),
      conversions: this.extractConversions(insight?.conversions),
      cpa: this.extractCpa(insight?.cost_per_action_type),
      qualityRanking: insight?.quality_ranking || undefined,
      engagementRateRanking: insight?.engagement_rate_ranking || undefined,
      conversionRateRanking: insight?.conversion_rate_ranking || undefined,
      landingPageViews: this.extractLandingPageViews(insight?.actions),
    };
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): MetaAdMetrics {
    return {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      spend: 0,
      conversions: 0,
      cpa: 0,
      qualityRanking: undefined,
      engagementRateRanking: undefined,
      conversionRateRanking: undefined,
      landingPageViews: 0,
    };
  }

  /**
   * Get campaigns with metrics for a user's Meta ad accounts
   * T040: Campaigns endpoint implementation
   * Supports pagination for infinite scroll - sorted by spend (descending) by default
   */
  async getCampaigns(
    userId: string,
    connectionId?: string,
    period: MetaDashboardPeriod = MetaDashboardPeriod.LAST_7D,
    startDate?: string,
    endDate?: string,
    statusFilter?: "ACTIVE" | "PAUSED" | "all",
    sortBy: string = "spend",
    sortOrder: "asc" | "desc" = "desc",
    forceRefresh?: boolean,
    workspaceId?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<MetaDashboardResponse> {
    // Clamp limit to max 50
    const effectiveLimit = Math.min(limit, 50);
    try {
      this.logger.log(
        `Fetching Meta campaigns for user ${userId}, connection ${connectionId || "all"}`,
      );

      // Calculate date range
      const dateRange =
        period === MetaDashboardPeriod.CUSTOM && startDate && endDate
          ? { startDate, endDate }
          : getDateRangeFromPeriod(period);

      // Get active Meta ad accounts from active connections for the user
      // The meta_ad_accounts table only has Meta connections (by design)
      // We still select plataform_name and metadata to filter by ads type later
      let adAccountsQuery = this.supabase
        .from("meta_ad_accounts")
        .select(
          `
          id,
          account_id,
          account_name,
          connection_id,
          connections!inner (
            id,
            connection_name,
            user_id,
            workspace_id,
            plataform_name,
            metadata,
            is_active,
            deleted_at
          )
        `,
        )
        .eq("is_active", true)
        .eq("connections.is_active", true)
        .is("connections.deleted_at", null);

      if (connectionId) {
        adAccountsQuery = adAccountsQuery.eq("connection_id", connectionId);
      }

      if (workspaceId) {
        adAccountsQuery = adAccountsQuery.eq(
          "connections.workspace_id",
          workspaceId,
        );
      } else if (connectionId) {
        // When connectionId is provided but no workspaceId, resolve workspace from connection
        // This handles the case where a workspace member (not the connection owner) accesses data
        const { data: connData } = await this.supabase
          .from("connections")
          .select("workspace_id, user_id")
          .eq("id", connectionId)
          .single();

        if (connData?.workspace_id) {
          // Verify user is a member of this workspace
          const { data: membership } = await this.supabase
            .from("workspace_members")
            .select("id")
            .eq("workspace_id", connData.workspace_id)
            .eq("user_id", userId)
            .eq("status", "active")
            .single();

          if (membership || connData.user_id === userId) {
            adAccountsQuery = adAccountsQuery.eq(
              "connections.workspace_id",
              connData.workspace_id,
            );
          } else {
            // User has no access to this connection's workspace
            adAccountsQuery = adAccountsQuery.eq(
              "connections.user_id",
              userId,
            );
          }
        } else {
          // Connection has no workspace, fall back to user_id
          adAccountsQuery = adAccountsQuery.eq(
            "connections.user_id",
            userId,
          );
        }
      } else {
        adAccountsQuery = adAccountsQuery.eq("connections.user_id", userId);
      }

      const { data: adAccounts, error: adAccountsError } =
        await adAccountsQuery;

      this.logger.log(
        `Ad accounts query result: ${adAccounts?.length || 0} accounts found, error: ${adAccountsError?.message || "none"}`,
      );

      if (adAccountsError) {
        this.logger.error(
          `Error fetching ad accounts: ${adAccountsError.message}`,
          {
            code: adAccountsError.code,
            details: adAccountsError.details,
            hint: adAccountsError.hint,
          },
        );
        return {
          success: false,
          campaigns: [],
          totals: this.getEmptyTotals(),
          error: `Failed to fetch ad accounts: ${adAccountsError.message}`,
        };
      }

      // Filter to only include Meta Ads connections (type = 'ads' or undefined/null for legacy)
      const adsOnlyAccounts = (adAccounts || []).filter((account) => {
        const conn = account.connections as any;
        const metadataType = conn?.metadata?.type;
        // Include if type is 'ads' or not specified (legacy connections)
        return !metadataType || metadataType === "ads";
      });

      if (adsOnlyAccounts.length === 0) {
        this.logger.log("No active Meta ad accounts found");
        return {
          success: true,
          campaigns: [],
          totals: this.getEmptyTotals(),
        };
      }

      // Fetch campaigns from Meta API for each ad account IN PARALLEL
      const fetchCampaignsForAccount = async (adAccount: any) => {
        try {
          const campaigns = await this.fetchCampaignsFromMetaApi(
            adAccount.connection_id,
            adAccount.account_id,
            userId,
            dateRange.startDate,
            dateRange.endDate,
            forceRefresh,
          );

          // Map to dashboard format
          return campaigns.map((campaign) => ({
            ...campaign,
            connectionId: adAccount.connection_id,
            connectionName:
              (adAccount.connections as any)?.connection_name ||
              "Meta Connection",
            adAccountId: adAccount.account_id,
            adAccountName: adAccount.account_name,
          }));
        } catch (error) {
          this.logger.error(
            `Error fetching campaigns for ad account ${adAccount.account_id}: ${(error as Error).message}`,
          );
          return []; // Return empty array on error, continue with other accounts
        }
      };

      // Process ad accounts in parallel (limited concurrency)
      const campaignResults = await this.processInBatches(
        adsOnlyAccounts,
        fetchCampaignsForAccount,
        3, // Limit to 3 concurrent ad account fetches to avoid rate limits
      );

      const allCampaigns = campaignResults.flat();

      // Apply status filter
      let filteredCampaigns = allCampaigns;
      if (statusFilter && statusFilter !== "all") {
        filteredCampaigns = allCampaigns.filter(
          (c) => c.status === statusFilter,
        );
      }

      // Apply sorting (default: spend descending)
      filteredCampaigns.sort((a, b) => {
        const aVal = (a as any)[sortBy];
        const bVal = (b as any)[sortBy];
        const direction = sortOrder === "desc" ? -1 : 1;
        if (typeof aVal === "string") {
          return aVal.localeCompare(bVal) * direction;
        }
        return ((aVal || 0) - (bVal || 0)) * direction;
      });

      // Calculate totals (on all filtered campaigns, before pagination)
      const totals = this.calculateTotals(filteredCampaigns);

      // Apply pagination
      const totalCampaigns = filteredCampaigns.length;
      const totalPages = Math.ceil(totalCampaigns / effectiveLimit);
      const startIndex = (page - 1) * effectiveLimit;
      const paginatedCampaigns = filteredCampaigns.slice(
        startIndex,
        startIndex + effectiveLimit,
      );

      const result: MetaDashboardResponse = {
        success: true,
        campaigns: paginatedCampaigns,
        totals,
        pagination: {
          page,
          limit: effectiveLimit,
          total: totalCampaigns,
          totalPages,
          hasMore: page < totalPages,
        },
      };

      return result;
    } catch (error) {
      this.logger.error(`Error in getCampaigns: ${(error as Error).message}`);
      return {
        success: false,
        campaigns: [],
        totals: this.getEmptyTotals(),
        error: error.message,
      };
    }
  }

  /**
   * Fetch campaigns from Meta Marketing API with caching
   */
  private async fetchCampaignsFromMetaApi(
    connectionId: string,
    adAccountId: string,
    userId: string,
    startDate: string,
    endDate: string,
    forceRefresh?: boolean,
  ): Promise<MetaDashboardCampaign[]> {
    // Build cache key
    const cacheKey = `meta:campaigns:${adAccountId}:${startDate}:${endDate}`;

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cached =
          await this.cacheManager.get<MetaDashboardCampaign[]>(cacheKey);
        if (cached) {
          this.logger.log(`Cache hit for Meta campaigns: ${cacheKey}`);
          return cached;
        }
      } catch (cacheError) {
        this.logger.warn(`Cache read error: ${(cacheError as Error).message}`);
      }
    } else {
      this.logger.log(
        `Force refresh requested, skipping cache for: ${cacheKey}`,
      );
    }

    // Get access token for the connection
    const { data: connection, error: connError } = await this.supabase
      .from("connections")
      .select("access_token")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      throw new NotFoundException("Connection not found");
    }

    const accessToken = connection.access_token;

    // Meta Marketing API endpoint for campaigns WITH INLINE INSIGHTS
    // This eliminates N+1 queries by fetching insights alongside campaigns
    const campaignFields = [
      "id",
      "name",
      "status",
      "effective_status",
      "objective",
      "daily_budget",
      "lifetime_budget",
      "created_time",
      "updated_time",
      "start_time",
      "stop_time",
      "bid_strategy",
      "special_ad_categories",
    ].join(",");

    const insightsFields = [
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "spend",
      "reach",
      "frequency",
      "conversions",
      "cost_per_action_type",
      "quality_ranking",
      "engagement_rate_ranking",
      "conversion_rate_ranking",
      "actions",
    ].join(",");

    // Build inline insights field with time range
    // Format: insights.time_range({"since":"YYYY-MM-DD","until":"YYYY-MM-DD"}){field1,field2,...}
    const inlineInsights = `insights.time_range({"since":"${startDate}","until":"${endDate}"}){${insightsFields}}`;
    const fields = `${campaignFields},${inlineInsights}`;

    try {
      // Fetch campaigns WITH INLINE INSIGHTS (single request per page)
      // Filter out DELETED and ARCHIVED campaigns at the API level for performance
      const statusFiltering = encodeURIComponent(
        JSON.stringify([
          {
            field: "effective_status",
            operator: "NOT_IN",
            value: ["DELETED", "ARCHIVED"],
          },
        ]),
      );
      const campaigns: any[] = [];
      let campaignsUrl: string | null =
        `https://graph.facebook.com/v21.0/act_${adAccountId}/campaigns?fields=${fields}&filtering=${statusFiltering}&access_token=${accessToken}`;

      let pageCount = 0;
      const startTime = Date.now();

      while (campaignsUrl) {
        pageCount++;
        const campaignsResponse = await this.fetchWithRetry(campaignsUrl);
        const campaignsData = await campaignsResponse.json();

        if (campaignsData.error) {
          this.logger.error(`Meta API error: ${campaignsData.error.message}`);
          throw new BadRequestException(campaignsData.error.message);
        }

        if (campaignsData.data && campaignsData.data.length > 0) {
          campaigns.push(...campaignsData.data);
        }

        campaignsUrl = campaignsData.paging?.next || null;
      }

      const elapsed = Date.now() - startTime;
      this.logger.debug(
        `Fetched ${campaigns.length} campaigns with inline insights for account ${adAccountId} in ${elapsed}ms (${pageCount} API calls)`,
      );

      // Build final campaign list with metrics from inline insights
      const campaignsWithMetrics: MetaDashboardCampaign[] = campaigns.map(
        (campaign) => {
          // Extract inline insights (if available)
          const inlineInsight = campaign.insights?.data?.[0];
          const metrics = inlineInsight
            ? {
                ...this.mapInsightToMetrics(inlineInsight),
                cpc: parseFloat(inlineInsight.cpc || "0"),
                reach: parseInt(inlineInsight.reach || "0", 10),
                frequency: parseFloat(inlineInsight.frequency || "0"),
                roas: 0,
              }
            : {
                ...this.getEmptyMetrics(),
                cpc: 0,
                reach: 0,
                frequency: 0,
                roas: 0,
              };

          // Map status
          const status = this.mapMetaStatus(campaign.status);

          // Calculate budget
          const dailyBudget = campaign.daily_budget
            ? parseFloat(campaign.daily_budget) / 100
            : 0;
          const lifetimeBudget = campaign.lifetime_budget
            ? parseFloat(campaign.lifetime_budget) / 100
            : 0;

          // ABO detection
          const isABO = dailyBudget === 0 && lifetimeBudget === 0;

          return {
            id: campaign.id,
            name: campaign.name,
            status,
            effectiveStatus: campaign.effective_status,
            objective: campaign.objective || "UNKNOWN",
            dailyBudget,
            lifetimeBudget,
            budgetType: dailyBudget > 0 ? "daily" : "lifetime",
            isABO,
            bidStrategy: campaign.bid_strategy || undefined,
            specialAdCategories: campaign.special_ad_categories || [],
            ...metrics,
            startTime: campaign.start_time,
            stopTime: campaign.stop_time,
            createdTime: campaign.created_time,
            updatedTime: campaign.updated_time,
            connectionId: connectionId,
            connectionName: "",
            adAccountId: adAccountId,
            adAccountName: "",
          };
        },
      );

      // Cache the results
      try {
        await this.cacheManager.set(
          cacheKey,
          campaignsWithMetrics,
          this.CACHE_TTL_MS,
        );
        this.trackCacheKey(adAccountId, cacheKey);
        this.logger.log(
          `Cached ${campaignsWithMetrics.length} Meta campaigns for: ${cacheKey}`,
        );
      } catch (cacheError) {
        this.logger.warn(`Cache write error: ${(cacheError as Error).message}`);
      }

      return campaignsWithMetrics;
    } catch (error) {
      this.logger.error(`Meta API fetch error: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get campaigns with filter push-down to Meta API
   * Supports name filter (CONTAIN), status filter (IN), and limit
   *
   * NOTE: Meta's campaigns endpoint doesn't support filtering by insight metrics
   * (impressions, clicks, spend, etc.) - those filters must be applied after fetching.
   * This method pushes name and status filters to reduce data transfer.
   *
   * @param userId - User ID for authorization
   * @param connectionId - Meta connection ID
   * @param adAccountId - Meta Ad Account ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @param options - Filter options
   * @param forceRefresh - Skip cache if true
   */
  async getCampaignsWithFilters(
    userId: string,
    connectionId: string,
    adAccountId: string,
    startDate: string,
    endDate: string,
    options?: {
      metricFilters?: Array<{
        metric:
          | "impressions"
          | "clicks"
          | "conversions"
          | "cost"
          | "cpc"
          | "cpa"
          | "ctr"
          | "conversionRate"
          | "roas";
        operator: "gt" | "lt" | "eq" | "between";
        value: number;
        value2?: number;
      }>;
      nameContains?: string;
      statusFilter?: "ACTIVE" | "PAUSED" | "all";
      /** Filter by campaign objective (e.g., CONVERSIONS, LINK_CLICKS, REACH) - pushed to Meta API */
      objective?: string;
      orderBy?: string;
      sortOrder?: "asc" | "desc";
      limit?: number;
    },
    forceRefresh: boolean = false,
  ): Promise<MetaDashboardCampaign[]> {
    // Build filter-aware cache key
    const filterHash = this.buildFilterHash(options);
    const cacheKey = `meta:campaigns:filters:${adAccountId}:${startDate}:${endDate}:${filterHash}`;

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      try {
        const cached =
          await this.cacheManager.get<MetaDashboardCampaign[]>(cacheKey);
        if (cached) {
          this.logger.log(`Cache hit for filtered Meta campaigns: ${cacheKey}`);
          return cached;
        }
      } catch (cacheError) {
        this.logger.warn(`Cache read error: ${(cacheError as Error).message}`);
      }
    }

    // Get access token for the connection
    const { data: connection, error: connError } = await this.supabase
      .from("connections")
      .select("access_token")
      .eq("id", connectionId)
      .single();

    if (connError || !connection) {
      throw new NotFoundException("Connection not found");
    }

    const accessToken = connection.access_token;

    // Build fields
    const campaignFields = [
      "id",
      "name",
      "status",
      "effective_status",
      "objective",
      "daily_budget",
      "lifetime_budget",
      "created_time",
      "updated_time",
      "start_time",
      "stop_time",
      "bid_strategy",
      "special_ad_categories",
    ].join(",");

    const insightsFields = [
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "spend",
      "reach",
      "frequency",
      "conversions",
      "cost_per_action_type",
      "quality_ranking",
      "engagement_rate_ranking",
      "conversion_rate_ranking",
      "actions",
    ].join(",");

    const inlineInsights = `insights.time_range({"since":"${startDate}","until":"${endDate}"}){${insightsFields}}`;
    const fields = `${campaignFields},${inlineInsights}`;

    // Build filtering array
    const filters: Array<{
      field: string;
      operator: string;
      value: string | string[] | number;
    }> = [
      // Always exclude DELETED and ARCHIVED
      {
        field: "effective_status",
        operator: "NOT_IN",
        value: ["DELETED", "ARCHIVED"],
      },
    ];

    // Add status filter
    if (options?.statusFilter && options.statusFilter !== "all") {
      const statusValue =
        options.statusFilter === "ACTIVE" ? "ACTIVE" : "PAUSED";
      filters.push({ field: "status", operator: "EQUAL", value: statusValue });
    }

    // Add name filter (CONTAIN operator)
    if (options?.nameContains) {
      filters.push({
        field: "name",
        operator: "CONTAIN",
        value: options.nameContains,
      });
    }

    // Add objective filter (push-down to Meta API)
    if (options?.objective) {
      filters.push({
        field: "objective",
        operator: "EQUAL",
        value: options.objective.toUpperCase(),
      });
    }

    // Add metric filters (push-down to Meta API)
    if (options?.metricFilters && options.metricFilters.length > 0) {
      for (const filter of options.metricFilters) {
        const metaField = this.mapMetricToMetaField(filter.metric);
        if (!metaField) continue;

        if (filter.operator === "between" && filter.value2 !== undefined) {
          // Between requires two filters: >= value AND <= value2
          filters.push({
            field: metaField,
            operator: "GREATER_THAN_OR_EQUAL",
            value: filter.value,
          });
          filters.push({
            field: metaField,
            operator: "LESS_THAN_OR_EQUAL",
            value: filter.value2,
          });
        } else {
          filters.push({
            field: metaField,
            operator: this.mapOperatorToMeta(filter.operator),
            value: filter.value,
          });
        }
      }
    }

    const filteringParam = encodeURIComponent(JSON.stringify(filters));

    // Build sort parameter
    const sortParam = options?.orderBy
      ? `&sort=${this.mapMetricToMetaField(options.orderBy)}_${options.sortOrder === "asc" ? "ascending" : "descending"}`
      : "&sort=spend_descending";

    // Build URL with optional limit
    const limitParam = options?.limit ? `&limit=${options.limit}` : "";

    try {
      const campaigns: any[] = [];
      let campaignsUrl: string | null =
        `https://graph.facebook.com/v21.0/act_${adAccountId}/campaigns?fields=${fields}&filtering=${filteringParam}${sortParam}${limitParam}&access_token=${accessToken}`;

      let pageCount = 0;
      const startTime = Date.now();

      while (campaignsUrl) {
        pageCount++;
        const campaignsResponse = await this.fetchWithRetry(campaignsUrl);
        const campaignsData = await campaignsResponse.json();

        if (campaignsData.error) {
          this.logger.error(`Meta API error: ${campaignsData.error.message}`);
          throw new BadRequestException(campaignsData.error.message);
        }

        if (campaignsData.data && campaignsData.data.length > 0) {
          campaigns.push(...campaignsData.data);
        }

        // Stop pagination if we have enough results (when limit is specified)
        if (options?.limit && campaigns.length >= options.limit) {
          break;
        }

        campaignsUrl = campaignsData.paging?.next || null;
      }

      const elapsed = Date.now() - startTime;
      this.logger.debug(
        `Fetched ${campaigns.length} filtered campaigns for account ${adAccountId} in ${elapsed}ms (${pageCount} API calls)`,
      );

      // Build final campaign list with metrics from inline insights
      const campaignsWithMetrics: MetaDashboardCampaign[] = campaigns.map(
        (campaign) => {
          const inlineInsight = campaign.insights?.data?.[0];
          const metrics = inlineInsight
            ? {
                ...this.mapInsightToMetrics(inlineInsight),
                cpc: parseFloat(inlineInsight.cpc || "0"),
                reach: parseInt(inlineInsight.reach || "0", 10),
                frequency: parseFloat(inlineInsight.frequency || "0"),
                roas: 0,
              }
            : {
                ...this.getEmptyMetrics(),
                cpc: 0,
                reach: 0,
                frequency: 0,
                roas: 0,
              };

          const status = this.mapMetaStatus(campaign.status);
          const dailyBudget = campaign.daily_budget
            ? parseFloat(campaign.daily_budget) / 100
            : 0;
          const lifetimeBudget = campaign.lifetime_budget
            ? parseFloat(campaign.lifetime_budget) / 100
            : 0;
          const isABO = dailyBudget === 0 && lifetimeBudget === 0;

          return {
            id: campaign.id,
            name: campaign.name,
            status,
            effectiveStatus: campaign.effective_status,
            objective: campaign.objective || "UNKNOWN",
            dailyBudget,
            lifetimeBudget,
            budgetType: dailyBudget > 0 ? "daily" : "lifetime",
            isABO,
            bidStrategy: campaign.bid_strategy || undefined,
            specialAdCategories: campaign.special_ad_categories || [],
            ...metrics,
            startTime: campaign.start_time,
            stopTime: campaign.stop_time,
            createdTime: campaign.created_time,
            updatedTime: campaign.updated_time,
            connectionId: connectionId,
            connectionName: "",
            adAccountId: adAccountId,
            adAccountName: "",
          };
        },
      );

      // Cache the results (5 minute TTL)
      try {
        await this.cacheManager.set(
          cacheKey,
          campaignsWithMetrics,
          this.CACHE_TTL_MS,
        );
        this.trackCacheKey(adAccountId, cacheKey);
        this.logger.log(
          `Cached ${campaignsWithMetrics.length} filtered Meta campaigns for: ${cacheKey}`,
        );
      } catch (cacheError) {
        this.logger.warn(`Cache write error: ${(cacheError as Error).message}`);
      }

      return campaignsWithMetrics;
    } catch (error) {
      this.logger.error(
        `Meta API fetch error with filters: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Build a hash string from filter options for cache key
   */
  private buildFilterHash(options?: {
    metricFilters?: Array<{
      metric: string;
      operator: string;
      value: number;
      value2?: number;
    }>;
    nameContains?: string;
    statusFilter?: string;
    orderBy?: string;
    sortOrder?: string;
    limit?: number;
  }): string {
    if (!options) return "default";

    const parts: string[] = [];

    if (options.statusFilter && options.statusFilter !== "all") {
      parts.push(`s:${options.statusFilter}`);
    }

    if (options.nameContains) {
      parts.push(`n:${options.nameContains}`);
    }

    if (options.metricFilters && options.metricFilters.length > 0) {
      const filterStr = options.metricFilters
        .map(
          (f) =>
            `${f.metric}:${f.operator}:${f.value}${f.value2 !== undefined ? `:${f.value2}` : ""}`,
        )
        .sort()
        .join("|");
      parts.push(`f:${filterStr}`);
    }

    if (options.orderBy) {
      parts.push(`o:${options.orderBy}:${options.sortOrder || "desc"}`);
    }

    if (options.limit) {
      parts.push(`l:${options.limit}`);
    }

    return parts.length > 0 ? parts.join("_") : "default";
  }

  /**
   * Map metric name to Meta API field name
   */
  private mapMetricToMetaField(metric: string): string | null {
    const metricMap: Record<string, string> = {
      impressions: "impressions",
      clicks: "clicks",
      cost: "spend",
      spend: "spend",
      conversions: "actions",
      ctr: "ctr",
      cpc: "cpc",
      cpm: "cpm",
      cpa: "cost_per_action_type",
      reach: "reach",
      frequency: "frequency",
      conversionRate: "conversion_rate",
      roas: "purchase_roas",
    };
    return metricMap[metric] || null;
  }

  /**
   * Map operator to Meta API operator
   */
  private mapOperatorToMeta(operator: string): string {
    const operatorMap: Record<string, string> = {
      gt: "GREATER_THAN",
      lt: "LESS_THAN",
      eq: "EQUAL",
      gte: "GREATER_THAN_OR_EQUAL",
      lte: "LESS_THAN_OR_EQUAL",
    };
    return operatorMap[operator] || "EQUAL";
  }

  /**
   * Pause a campaign
   * T041: Pause endpoint implementation
   */
  async pauseCampaign(
    userId: string,
    connectionId: string,
    campaignId: string,
    adAccountId?: string,
    name?: string,
  ): Promise<MetaCampaignActionResponse> {
    try {
      this.logger.log(`Pausing Meta campaign ${campaignId}`);

      // Verify user has access to this connection
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      // Call Meta API to pause campaign
      const url = `https://graph.facebook.com/v21.0/${campaignId}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "PAUSED",
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new BadRequestException(data.error.message);
      }

      // Use provided name or fetch from API as fallback
      const campaignName =
        name || (await this.getCampaignName(campaignId, accessToken));

      // Log the action
      await this.logAction({
        connectionId,
        adAccountId: adAccountId || "",
        campaignId,
        campaignName,
        actionType: "pause",
        source: "manual",
        status: "success",
        oldValue: "ACTIVE",
        newValue: "PAUSED",
        userId,
      });

      // Invalidate cache so next search returns fresh data
      if (adAccountId) {
        await this.invalidateCampaignCache(adAccountId);
      }

      return {
        success: true,
        message: "Campaign paused successfully",
        campaignId,
        newStatus: MetaCampaignStatus.PAUSED,
      };
    } catch (error) {
      this.logger.error(`Error pausing campaign: ${error.message}`);
      return {
        success: false,
        error: error.message,
        campaignId,
      };
    }
  }

  /**
   * Enable a campaign
   * T042: Enable endpoint implementation
   */
  async enableCampaign(
    userId: string,
    connectionId: string,
    campaignId: string,
    adAccountId?: string,
    name?: string,
  ): Promise<MetaCampaignActionResponse> {
    try {
      this.logger.log(`Enabling Meta campaign ${campaignId}`);

      // Verify user has access to this connection
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      // Call Meta API to enable campaign
      const url = `https://graph.facebook.com/v21.0/${campaignId}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "ACTIVE",
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new BadRequestException(data.error.message);
      }

      // Use provided name or fetch from API as fallback
      const campaignName =
        name || (await this.getCampaignName(campaignId, accessToken));

      // Log the action
      await this.logAction({
        connectionId,
        adAccountId: adAccountId || "",
        campaignId,
        campaignName,
        actionType: "enable",
        source: "manual",
        status: "success",
        oldValue: "PAUSED",
        newValue: "ACTIVE",
        userId,
      });

      // Invalidate cache so next search returns fresh data
      if (adAccountId) {
        await this.invalidateCampaignCache(adAccountId);
      }

      return {
        success: true,
        message: "Campaign enabled successfully",
        campaignId,
        newStatus: MetaCampaignStatus.ACTIVE,
      };
    } catch (error) {
      this.logger.error(`Error enabling campaign: ${error.message}`);
      return {
        success: false,
        error: error.message,
        campaignId,
      };
    }
  }

  /**
   * Update campaign budget
   * T043: Budget endpoint implementation
   */
  async updateBudget(
    userId: string,
    connectionId: string,
    campaignId: string,
    newBudget: number,
    adAccountId?: string,
  ): Promise<MetaBudgetUpdateResponse> {
    try {
      this.logger.log(
        `Updating budget for Meta campaign ${campaignId} to ${newBudget}`,
      );

      // Verify user has access to this connection
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      // Get current budget and name for logging
      const campaignUrl = `https://graph.facebook.com/v21.0/${campaignId}?fields=name,daily_budget,lifetime_budget&access_token=${accessToken}`;
      const campaignResponse = await fetch(campaignUrl);
      const campaignData = await campaignResponse.json();

      const campaignName = campaignData.name || "Unknown Campaign";
      const oldBudget = campaignData.daily_budget
        ? parseFloat(campaignData.daily_budget) / 100
        : campaignData.lifetime_budget
          ? parseFloat(campaignData.lifetime_budget) / 100
          : 0;

      // Update budget (convert to cents for Meta API)
      const budgetInCents = Math.round(newBudget * 100);
      const url = `https://graph.facebook.com/v21.0/${campaignId}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          daily_budget: budgetInCents,
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new BadRequestException(data.error.message);
      }

      // Log the action
      await this.logAction({
        connectionId,
        adAccountId: adAccountId || "",
        campaignId,
        campaignName,
        actionType: "budget_update",
        source: "manual",
        status: "success",
        oldValue: String(oldBudget),
        newValue: String(newBudget),
        userId,
      });

      // Invalidate cache so next search returns fresh data
      if (adAccountId) {
        await this.invalidateCampaignCache(adAccountId);
      }

      return {
        success: true,
        message: "Budget updated successfully",
        campaignId,
        oldBudget,
        newBudget,
      };
    } catch (error) {
      this.logger.error(`Error updating budget: ${error.message}`);
      return {
        success: false,
        error: error.message,
        campaignId,
      };
    }
  }

  /**
   * Get action history for Meta campaigns
   * Supports filtering by workspace (shows all logs from workspace connections)
   * or by connectionId (verifies access first)
   */
  async getActionHistory(
    userId: string,
    filters: MetaActionLogFilters,
    page: number = 1,
    limit: number = 20,
    workspaceId?: string,
  ): Promise<{ actions: MetaActionLogEntry[]; total: number }> {
    try {
      // If connectionId is provided, verify user has access
      if (filters.connectionId) {
        try {
          await this.verifyConnectionAccess(userId, filters.connectionId);
        } catch {
          this.logger.warn(
            `User ${userId} denied access to connection ${filters.connectionId} for action history`,
          );
          return { actions: [], total: 0 };
        }
      }

      // Get list of connection IDs the user has access to
      let accessibleConnectionIds: string[] = [];

      if (workspaceId) {
        // Verify user is a member of the workspace
        const { data: membership } = await this.supabase
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          this.logger.warn(
            `User ${userId} is not a member of workspace ${workspaceId}`,
          );
          return { actions: [], total: 0 };
        }

        // Get all connection IDs from the workspace
        const { data: connections } = await this.supabase
          .from("connections")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("plataform_name", "meta");

        accessibleConnectionIds = (connections || []).map((c) => c.id);
      } else if (!filters.connectionId) {
        // No workspace and no specific connection - get user's own connections + workspace connections
        const { data: ownConnections } = await this.supabase
          .from("connections")
          .select("id")
          .eq("user_id", userId)
          .eq("plataform_name", "meta");

        // Also get connections from workspaces where user is a member
        const { data: workspaceMemberships } = await this.supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", userId)
          .eq("status", "active");

        const workspaceIds = (workspaceMemberships || []).map(
          (m) => m.workspace_id,
        );

        let workspaceConnections: { id: string }[] = [];
        if (workspaceIds.length > 0) {
          const { data: wsConns } = await this.supabase
            .from("connections")
            .select("id")
            .in("workspace_id", workspaceIds)
            .eq("plataform_name", "meta");
          workspaceConnections = wsConns || [];
        }

        accessibleConnectionIds = [
          ...(ownConnections || []).map((c) => c.id),
          ...workspaceConnections.map((c) => c.id),
        ];
      }

      let query = this.supabase
        .from("meta_action_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply connection filter
      if (filters.connectionId) {
        query = query.eq("connection_id", filters.connectionId);
      } else if (accessibleConnectionIds.length > 0) {
        query = query.in("connection_id", accessibleConnectionIds);
      } else {
        // No accessible connections - return empty
        return { actions: [], total: 0 };
      }

      // Apply other filters
      if (filters.adAccountId) {
        query = query.eq("ad_account_id", filters.adAccountId);
      }
      if (filters.campaignId) {
        query = query.eq("campaign_id", filters.campaignId);
      }
      if (filters.actionType) {
        query = query.eq("action_type", filters.actionType);
      }
      if (filters.source) {
        query = query.eq("source", filters.source);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        this.logger.error(`Error fetching action history: ${error.message}`);
        return { actions: [], total: 0 };
      }

      // Map snake_case columns from Supabase to camelCase expected by frontend
      const mappedActions: MetaActionLogEntry[] = (data || []).map(
        (row: any) => ({
          id: row.id,
          connectionId: row.connection_id,
          adAccountId: row.ad_account_id,
          campaignId: row.campaign_id,
          campaignName: row.campaign_name || "Unknown Campaign",
          actionType: row.action_type,
          source: row.source,
          status: row.status,
          oldValue: row.old_value,
          newValue: row.new_value,
          errorMessage: row.error_message,
          createdAt: row.created_at,
          userId: row.user_id,
        }),
      );

      return {
        actions: mappedActions,
        total: count || 0,
      };
    } catch (error) {
      this.logger.error(`Error in getActionHistory: ${error.message}`);
      return { actions: [], total: 0 };
    }
  }

  /**
   * Get campaign ad sets (first level of expansion)
   * Returns only ad sets for a campaign - ads are fetched separately via getAdSetAds
   *
   * This is called when the user expands a campaign row to see its ad sets.
   * Only 1 API call is made to fetch ad sets with their metrics.
   */
  async getCampaignHierarchy(
    userId: string,
    connectionId: string,
    campaignId: string,
    adAccountId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<MetaCampaignHierarchyResponse> {
    try {
      this.logger.log(
        `Fetching ad sets for Meta campaign ${campaignId}, connection ${connectionId}`,
      );

      // Verify user has access to this connection
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      // Calculate date range if not provided
      const dateRange =
        startDate && endDate
          ? { startDate, endDate }
          : getDateRangeFromPeriod(MetaDashboardPeriod.LAST_7D);

      const timeRange = `{"since":"${dateRange.startDate}","until":"${dateRange.endDate}"}`;

      // Fetch ad sets with insights in a single call
      const adSetsFields = [
        "id",
        "name",
        "status",
        "effective_status",
        "optimization_goal",
        "billing_event",
        "daily_budget",
        "lifetime_budget",
        "bid_amount",
        "targeting",
        "destination_type",
        "learning_stage_info",
        "issues_info",
        "start_time",
        "end_time",
        // Include insights inline to avoid separate API calls
        `insights.time_range(${timeRange}){impressions,clicks,ctr,spend,conversions,cost_per_action_type,quality_ranking,engagement_rate_ranking,conversion_rate_ranking,actions}`,
      ].join(",");

      const adSetsUrl = `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=${adSetsFields}&access_token=${accessToken}`;

      this.logger.debug(
        `Fetching ad sets with inline insights for campaign ${campaignId}`,
      );
      const adSetsResponse = await this.fetchWithRetry(adSetsUrl);
      const adSetsData = await adSetsResponse.json();

      if (adSetsData.error) {
        this.logger.error(
          `Meta API error fetching ad sets: ${adSetsData.error.message}`,
        );
        return {
          success: false,
          error: adSetsData.error.message,
        };
      }

      const rawAdSets = adSetsData.data || [];
      this.logger.debug(
        `Found ${rawAdSets.length} ad sets for campaign ${campaignId}`,
      );

      // Process ad sets (without ads - ads are fetched separately)
      const adSets: MetaAdSet[] = rawAdSets.map((adSetRaw: any) => {
        // Extract metrics from inline insights
        const adSetInsight = adSetRaw.insights?.data?.[0];
        const adSetMetrics = adSetInsight
          ? this.mapInsightToMetrics(adSetInsight)
          : this.getEmptyMetrics();

        // Parse targeting
        const targeting = adSetRaw.targeting;
        const parsedTargeting = targeting
          ? {
              ageMin: targeting.age_min,
              ageMax: targeting.age_max,
              genders: targeting.genders,
              geoLocations: targeting.geo_locations?.countries,
              interests: targeting.interests?.map((i: any) => i.name),
              behaviors: targeting.behaviors?.map((b: any) => b.name),
            }
          : undefined;

        // Parse learning stage info
        const learningStageInfo = adSetRaw.learning_stage_info
          ? {
              status: adSetRaw.learning_stage_info.status,
              learningPhaseExitInfo: adSetRaw.learning_stage_info
                .learning_phase_exit_info
                ? {
                    type: adSetRaw.learning_stage_info.learning_phase_exit_info
                      .type,
                    countNeeded:
                      adSetRaw.learning_stage_info.learning_phase_exit_info
                        .count_needed,
                  }
                : undefined,
            }
          : undefined;

        // Parse issues info
        const issuesInfo = adSetRaw.issues_info?.map((issue: any) => ({
          level: issue.level,
          errorType: issue.error_type,
          errorCode: issue.error_code,
          errorSummary: issue.error_summary,
          errorMessage: issue.error_message,
        }));

        return {
          id: adSetRaw.id,
          name: adSetRaw.name,
          status: adSetRaw.status,
          effectiveStatus: adSetRaw.effective_status,
          optimizationGoal: adSetRaw.optimization_goal,
          billingEvent: adSetRaw.billing_event,
          dailyBudget: adSetRaw.daily_budget
            ? parseFloat(adSetRaw.daily_budget) / 100
            : undefined,
          lifetimeBudget: adSetRaw.lifetime_budget
            ? parseFloat(adSetRaw.lifetime_budget) / 100
            : undefined,
          bidAmount: adSetRaw.bid_amount
            ? parseFloat(adSetRaw.bid_amount) / 100
            : undefined,
          destinationType: adSetRaw.destination_type,
          learningStageInfo,
          issuesInfo,
          startTime: adSetRaw.start_time,
          endTime: adSetRaw.end_time,
          targeting: parsedTargeting,
          metrics: adSetMetrics,
          ads: [], // Empty - ads are fetched separately via getAdSetAds
        };
      });

      // Sort ad sets by spend (highest first)
      adSets.sort((a, b) => (b.metrics?.spend || 0) - (a.metrics?.spend || 0));

      this.logger.log(
        `Successfully fetched ${adSets.length} ad sets for campaign ${campaignId} (1 API call)`,
      );

      return {
        success: true,
        adSets,
      };
    } catch (error) {
      this.logger.error(`Error fetching campaign hierarchy: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get ads for a specific ad set (second level of expansion)
   * Returns only ads for an ad set - called when user expands an ad set row.
   *
   * This is called when the user expands an ad set row to see its ads.
   * Only 1 API call is made to fetch ads with their metrics.
   */
  async getAdSetAds(
    userId: string,
    connectionId: string,
    adSetId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ success: boolean; ads?: MetaAd[]; error?: string }> {
    try {
      this.logger.log(
        `Fetching ads for Meta ad set ${adSetId}, connection ${connectionId}`,
      );

      // Verify user has access to this connection
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      // Calculate date range if not provided
      const dateRange =
        startDate && endDate
          ? { startDate, endDate }
          : getDateRangeFromPeriod(MetaDashboardPeriod.LAST_7D);

      const timeRange = `{"since":"${dateRange.startDate}","until":"${dateRange.endDate}"}`;

      // Fetch ads for this specific ad set with insights in a single call
      const adsFields = [
        "id",
        "name",
        "status",
        "effective_status",
        "configured_status",
        "creative{id,title,body,call_to_action_type,link_url,thumbnail_url,image_url,video_id,url_tags}",
        "preview_shareable_link",
        "failed_delivery_checks",
        "ad_review_feedback",
        // Include insights inline
        `insights.time_range(${timeRange}){impressions,clicks,ctr,spend,conversions,cost_per_action_type,quality_ranking,engagement_rate_ranking,conversion_rate_ranking,actions}`,
      ].join(",");

      const adsUrl = `https://graph.facebook.com/v21.0/${adSetId}/ads?fields=${adsFields}&access_token=${accessToken}`;

      this.logger.debug(
        `Fetching ads with inline insights for ad set ${adSetId}`,
      );
      const adsResponse = await this.fetchWithRetry(adsUrl);
      const adsData = await adsResponse.json();

      if (adsData.error) {
        this.logger.error(
          `Meta API error fetching ads: ${adsData.error.message}`,
        );
        return {
          success: false,
          error: adsData.error.message,
        };
      }

      const rawAds = adsData.data || [];
      this.logger.debug(`Found ${rawAds.length} ads for ad set ${adSetId}`);

      // Process ads
      const ads: MetaAd[] = rawAds.map((adRaw: any) => {
        // Extract metrics from inline insights
        const adInsight = adRaw.insights?.data?.[0];
        const adMetrics = adInsight
          ? this.mapInsightToMetrics(adInsight)
          : this.getEmptyMetrics();

        const creative = adRaw.creative;

        // Parse failed delivery checks
        const failedDeliveryChecks = adRaw.failed_delivery_checks?.map(
          (check: any) => ({
            checkName: check.check_name,
            summary: check.summary,
            description: check.description,
          }),
        );

        // Parse ad review feedback
        const adReviewFeedback = adRaw.ad_review_feedback
          ? {
              globalStatus: adRaw.ad_review_feedback.global?.status,
              placementSpecificReviews:
                adRaw.ad_review_feedback.placement_specific_reviews?.map(
                  (review: any) => ({
                    placement: review.placement,
                    status: review.status,
                  }),
                ),
            }
          : undefined;

        return {
          id: adRaw.id,
          name: adRaw.name,
          status: adRaw.status,
          effectiveStatus: adRaw.effective_status,
          configuredStatus: adRaw.configured_status,
          failedDeliveryChecks,
          adReviewFeedback,
          creativeId: creative?.id,
          previewUrl: adRaw.preview_shareable_link,
          thumbnailUrl: creative?.thumbnail_url,
          metrics: adMetrics,
          creative: creative
            ? {
                title: creative.title,
                body: creative.body,
                callToAction: creative.call_to_action_type,
                linkUrl: creative.link_url,
                imageUrl: creative.image_url,
                urlTags: creative.url_tags,
              }
            : undefined,
        };
      });

      // Sort ads by spend (highest first)
      ads.sort((a, b) => (b.metrics?.spend || 0) - (a.metrics?.spend || 0));

      this.logger.log(
        `Successfully fetched ${ads.length} ads for ad set ${adSetId} (1 API call)`,
      );

      return {
        success: true,
        ads,
      };
    } catch (error) {
      this.logger.error(`Error fetching ad set ads: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async verifyConnectionAccess(
    userId: string,
    connectionId: string,
  ): Promise<void> {
    // First, fetch the connection to check its workspace_id and user_id
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("id, user_id, workspace_id")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      throw new NotFoundException("Connection not found or access denied");
    }

    // If connection belongs to a workspace, check if user is a member
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      // Allow access if user is workspace member OR direct owner
      if (!membership && connection.user_id !== userId) {
        throw new NotFoundException("Connection not found or access denied");
      }
    } else if (connection.user_id !== userId) {
      // Personal connection - must be owner
      throw new NotFoundException("Connection not found or access denied");
    }
  }

  private async getAccessToken(connectionId: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("connections")
      .select("access_token")
      .eq("id", connectionId)
      .single();

    if (error || !data) {
      throw new NotFoundException("Connection not found");
    }

    return data.access_token;
  }

  /**
   * Fetch campaign name from Meta API
   * Used for logging actions with the campaign name
   */
  private async getCampaignName(
    campaignId: string,
    accessToken: string,
  ): Promise<string> {
    try {
      const url = `https://graph.facebook.com/v21.0/${campaignId}?fields=name&access_token=${accessToken}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        this.logger.warn(
          `Failed to fetch campaign name for ${campaignId}: ${data.error.message}`,
        );
        return "Unknown Campaign";
      }

      return data.name || "Unknown Campaign";
    } catch (error) {
      this.logger.warn(`Error fetching campaign name: ${error.message}`);
      return "Unknown Campaign";
    }
  }

  private async logAction(
    entry: Omit<MetaActionLogEntry, "id" | "createdAt">,
  ): Promise<void> {
    try {
      await this.supabase.from("meta_action_logs").insert({
        connection_id: entry.connectionId,
        ad_account_id: entry.adAccountId,
        campaign_id: entry.campaignId,
        campaign_name: entry.campaignName,
        action_type: entry.actionType,
        source: entry.source,
        status: entry.status,
        old_value: entry.oldValue,
        new_value: entry.newValue,
        error_message: entry.errorMessage,
        user_id: entry.userId,
      });
    } catch (error) {
      this.logger.error(`Failed to log action: ${error.message}`);
    }
  }

  private mapMetaStatus(status: string): MetaCampaignStatus {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return MetaCampaignStatus.ACTIVE;
      case "PAUSED":
        return MetaCampaignStatus.PAUSED;
      case "DELETED":
        return MetaCampaignStatus.DELETED;
      case "ARCHIVED":
        return MetaCampaignStatus.ARCHIVED;
      default:
        return MetaCampaignStatus.PAUSED;
    }
  }

  private extractConversions(conversions: any): number {
    if (!conversions || !Array.isArray(conversions)) return 0;
    return conversions.reduce(
      (sum: number, c: any) => sum + parseInt(c.value || "0", 10),
      0,
    );
  }

  private extractCpa(costPerAction: any): number {
    if (!costPerAction || !Array.isArray(costPerAction)) return 0;
    const purchase = costPerAction.find(
      (c: any) =>
        c.action_type === "purchase" || c.action_type === "omni_purchase",
    );
    return purchase ? parseFloat(purchase.value || "0") : 0;
  }

  /**
   * Extract landing page views from actions array
   */
  private extractLandingPageViews(actions: any): number {
    if (!actions || !Array.isArray(actions)) return 0;
    const landingPageView = actions.find(
      (a: any) => a.action_type === "landing_page_view",
    );
    return landingPageView ? parseInt(landingPageView.value || "0", 10) : 0;
  }

  private calculateTotals(campaigns: MetaDashboardCampaign[]) {
    const totals = {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(
        (c) => c.status === MetaCampaignStatus.ACTIVE,
      ).length,
      pausedCampaigns: campaigns.filter(
        (c) => c.status === MetaCampaignStatus.PAUSED,
      ).length,
      totalImpressions: 0,
      totalClicks: 0,
      totalSpend: 0,
      totalConversions: 0,
      avgCtr: 0,
      avgCpa: 0,
    };

    for (const campaign of campaigns) {
      totals.totalImpressions += campaign.impressions;
      totals.totalClicks += campaign.clicks;
      totals.totalSpend += campaign.spend;
      totals.totalConversions += campaign.conversions;
    }

    if (totals.totalImpressions > 0) {
      totals.avgCtr = (totals.totalClicks / totals.totalImpressions) * 100;
    }

    if (totals.totalConversions > 0) {
      totals.avgCpa = totals.totalSpend / totals.totalConversions;
    }

    return totals;
  }

  private getEmptyTotals() {
    return {
      totalCampaigns: 0,
      activeCampaigns: 0,
      pausedCampaigns: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalSpend: 0,
      totalConversions: 0,
      avgCtr: 0,
      avgCpa: 0,
    };
  }

  /**
   * Get active Meta ad accounts for a user/workspace
   * Returns accounts independently of whether they have campaigns
   */
  async getAdAccounts(
    userId: string,
    workspaceId?: string,
  ): Promise<{
    success: boolean;
    accounts: Array<{
      id: string;
      accountId: string;
      accountName: string;
      connectionId: string;
      connectionName: string;
    }>;
    error?: string;
  }> {
    this.logger.log(
      `Fetching Meta ad accounts for user ${userId}, workspace ${workspaceId || "none"}`,
    );

    try {
      // Build query for active Meta ad accounts from active connections
      let query = this.supabase
        .from("meta_ad_accounts")
        .select(
          `
          id,
          account_id,
          account_name,
          connection_id,
          connections!inner (
            id,
            connection_name,
            user_id,
            workspace_id,
            plataform_name,
            metadata,
            is_active,
            deleted_at
          )
        `,
        )
        .eq("is_active", true)
        .eq("connections.is_active", true)
        .is("connections.deleted_at", null);

      if (workspaceId) {
        query = query.eq("connections.workspace_id", workspaceId);
      } else {
        query = query.eq("connections.user_id", userId);
      }

      const { data: adAccounts, error } = await query;

      if (error) {
        this.logger.error(`Error fetching ad accounts: ${error.message}`);
        return {
          success: false,
          accounts: [],
          error: `Failed to fetch ad accounts: ${error.message}`,
        };
      }

      // Filter to only include Meta Ads connections (type = 'ads' or undefined/null for legacy)
      const adsOnlyAccounts = (adAccounts || []).filter((account) => {
        const conn = account.connections as any;
        const metadataType = conn?.metadata?.type;
        return !metadataType || metadataType === "ads";
      });

      // Map to response format
      const accounts = adsOnlyAccounts.map((account) => ({
        id: account.id,
        accountId: account.account_id,
        accountName: account.account_name,
        connectionId: account.connection_id,
        connectionName:
          (account.connections as any)?.connection_name || "Meta Ads",
      }));

      this.logger.log(`Found ${accounts.length} active Meta ad accounts`);

      return {
        success: true,
        accounts,
      };
    } catch (error) {
      this.logger.error(`Unexpected error fetching ad accounts: ${error}`);
      return {
        success: false,
        accounts: [],
        error: "Unexpected error fetching ad accounts",
      };
    }
  }

  /**
   * Pause an ad set
   */
  async pauseAdSet(
    userId: string,
    connectionId: string,
    adSetId: string,
    adAccountId?: string,
  ): Promise<MetaCampaignActionResponse> {
    try {
      this.logger.log(`Pausing Meta ad set ${adSetId}`);

      // Verify user has access to this connection
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      // Call Meta API to pause ad set
      const url = `https://graph.facebook.com/v21.0/${adSetId}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "PAUSED",
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new BadRequestException(data.error.message);
      }

      // Invalidate cache so next search returns fresh data
      if (adAccountId) {
        await this.invalidateCampaignCache(adAccountId);
      }

      return {
        success: true,
        message: "Ad set paused successfully",
        campaignId: adSetId,
        newStatus: MetaCampaignStatus.PAUSED,
      };
    } catch (error) {
      this.logger.error(`Error pausing ad set: ${error.message}`);
      return {
        success: false,
        error: error.message,
        campaignId: adSetId,
      };
    }
  }

  /**
   * Enable an ad set
   */
  async enableAdSet(
    userId: string,
    connectionId: string,
    adSetId: string,
    adAccountId?: string,
  ): Promise<MetaCampaignActionResponse> {
    try {
      this.logger.log(`Enabling Meta ad set ${adSetId}`);

      // Verify user has access to this connection
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      // Call Meta API to enable ad set
      const url = `https://graph.facebook.com/v21.0/${adSetId}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "ACTIVE",
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new BadRequestException(data.error.message);
      }

      // Invalidate cache so next search returns fresh data
      if (adAccountId) {
        await this.invalidateCampaignCache(adAccountId);
      }

      return {
        success: true,
        message: "Ad set enabled successfully",
        campaignId: adSetId,
        newStatus: MetaCampaignStatus.ACTIVE,
      };
    } catch (error) {
      this.logger.error(`Error enabling ad set: ${error.message}`);
      return {
        success: false,
        error: error.message,
        campaignId: adSetId,
      };
    }
  }

  /**
   * Pause an ad
   */
  async pauseAd(
    userId: string,
    connectionId: string,
    adId: string,
    adAccountId?: string,
  ): Promise<MetaCampaignActionResponse> {
    try {
      this.logger.log(`Pausing Meta ad ${adId}`);

      // Verify user has access to this connection
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      // Call Meta API to pause ad
      const url = `https://graph.facebook.com/v21.0/${adId}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "PAUSED",
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new BadRequestException(data.error.message);
      }

      // Invalidate cache so next search returns fresh data
      if (adAccountId) {
        await this.invalidateCampaignCache(adAccountId);
      }

      return {
        success: true,
        message: "Ad paused successfully",
        campaignId: adId,
        newStatus: MetaCampaignStatus.PAUSED,
      };
    } catch (error) {
      this.logger.error(`Error pausing ad: ${error.message}`);
      return {
        success: false,
        error: error.message,
        campaignId: adId,
      };
    }
  }

  /**
   * Enable an ad
   */
  async enableAd(
    userId: string,
    connectionId: string,
    adId: string,
    adAccountId?: string,
  ): Promise<MetaCampaignActionResponse> {
    try {
      this.logger.log(`Enabling Meta ad ${adId}`);

      // Verify user has access to this connection
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      // Call Meta API to enable ad
      const url = `https://graph.facebook.com/v21.0/${adId}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "ACTIVE",
          access_token: accessToken,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new BadRequestException(data.error.message);
      }

      // Invalidate cache so next search returns fresh data
      if (adAccountId) {
        await this.invalidateCampaignCache(adAccountId);
      }

      return {
        success: true,
        message: "Ad enabled successfully",
        campaignId: adId,
        newStatus: MetaCampaignStatus.ACTIVE,
      };
    } catch (error) {
      this.logger.error(`Error enabling ad: ${error.message}`);
      return {
        success: false,
        error: error.message,
        campaignId: adId,
      };
    }
  }

  /**
   * Get full creative details for an ad
   * Fetches high-resolution images, video data, and all creative fields
   */
  async getAdCreativeDetails(
    userId: string,
    connectionId: string,
    adId: string,
  ): Promise<any> {
    try {
      // Verify user has access to this connection (checks both direct ownership and workspace membership)
      await this.verifyConnectionAccess(userId, connectionId);

      // Get access token
      const accessToken = await this.getAccessToken(connectionId);

      if (!accessToken) {
        this.logger.warn(`No access token in connection: ${connectionId}`);
        throw new NotFoundException("Access token not found in connection");
      }

      // Fetch full creative details from Meta API
      // Using all fields from the n8n example
      const fields = [
        "creative{",
        "  name,",
        "  status,",
        "  body,",
        "  title,",
        "  link_url,",
        "  call_to_action_type,",
        "  image_url,",
        "  video_id,",
        "  url_tags,",
        "  instagram_permalink_url,",
        "  effective_object_story_id,",
        "  image_hash,",
        "  object_url,",
        "  object_type,",
        "  thumbnail_url,",
        "  object_story_spec{",
        "    video_data{",
        "      video_id,",
        "      image_url,",
        "      call_to_action,",
        "      title,",
        "      page_welcome_message",
        "    },",
        "    link_data{",
        "      call_to_action,",
        "      link,",
        "      message,",
        "      name,",
        "      description,",
        "      page_welcome_message",
        "    }",
        "  }",
        "}",
      ].join("\n");

      const url = `https://graph.facebook.com/v23.0/${adId}?fields=${encodeURIComponent(fields)}&access_token=${accessToken}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new BadRequestException(`Meta API error: ${response.statusText}`);
      }

      const data = await response.json();

      // If image_hash is present, construct high-resolution image URL
      if (data.creative?.image_hash) {
        const imageHash = data.creative.image_hash;
        // High-resolution image URL using image hash
        data.creative.highResImageUrl = `https://graph.facebook.com/v23.0/${imageHash}?fields=url_128,url_256,url_512,url_1024&access_token=${accessToken}`;

        // Fetch image URLs
        try {
          const imageResponse = await fetch(data.creative.highResImageUrl);
          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            data.creative.imageUrls = {
              url_128: imageData.url_128,
              url_256: imageData.url_256,
              url_512: imageData.url_512,
              url_1024: imageData.url_1024,
            };
          }
        } catch (imageError) {
          this.logger.warn(
            `Failed to fetch high-res image URLs: ${imageError.message}`,
          );
        }
      }

      // If video_id is present, construct video embed URL
      if (data.creative?.video_id) {
        data.creative.videoEmbedUrl = `https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Ffacebook%2Fvideos%2F${data.creative.video_id}%2F`;
      }

      // Also check object_story_spec.video_data
      if (data.creative?.object_story_spec?.video_data?.video_id) {
        const videoId = data.creative.object_story_spec.video_data.video_id;
        data.creative.object_story_spec.video_data.videoEmbedUrl = `https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Ffacebook%2Fvideos%2F${videoId}%2F`;
      }

      /**
       * IMPORTANT: The Facebook embed plugin often crops/zooms the video.
       * To avoid any cropping on the frontend, fetch a direct MP4 source from the video object.
       */
      const resolvedVideoId: string | undefined =
        data.creative?.video_id ||
        data.creative?.object_story_spec?.video_data?.video_id;

      if (resolvedVideoId) {
        try {
          const videoInfoUrl = `https://graph.facebook.com/v23.0/${resolvedVideoId}?fields=source,format,picture,height,width&access_token=${accessToken}`;
          const videoInfoResponse = await fetch(videoInfoUrl);

          let videoSourceUrl: string | undefined;
          let videoWidth: number | undefined;
          let videoHeight: number | undefined;
          // NOTE: videoInfo.picture is often low-res. We'll try /thumbnails for a better one.
          let videoPictureUrl: string | undefined;

          if (videoInfoResponse.ok) {
            const videoInfo: any = await videoInfoResponse.json();

            const formats: any[] = Array.isArray(videoInfo.format)
              ? videoInfo.format
              : [];

            const bestFormat = formats.reduce((best: any, current: any) => {
              const bestScore =
                (best?.width || 0) * (best?.height || 0) || best?.height || 0;
              const currentScore =
                (current?.width || 0) * (current?.height || 0) ||
                current?.height ||
                0;
              return currentScore > bestScore ? current : best;
            }, null);

            videoSourceUrl = bestFormat?.source || videoInfo.source;
            videoWidth = bestFormat?.width || videoInfo.width;
            videoHeight = bestFormat?.height || videoInfo.height;
            videoPictureUrl = videoInfo.picture;
          } else {
            this.logger.warn(
              `Failed to fetch video info (${resolvedVideoId}): ${videoInfoResponse.status} ${videoInfoResponse.statusText}`,
            );
          }

          // Fetch best available video thumbnail (highest resolution) - try even if videoInfo failed
          try {
            const thumbsUrl = `https://graph.facebook.com/v23.0/${resolvedVideoId}/thumbnails?access_token=${accessToken}`;
            const thumbsResp = await fetch(thumbsUrl);
            if (thumbsResp.ok) {
              const thumbsJson: any = await thumbsResp.json();
              const thumbs: any[] = Array.isArray(thumbsJson?.data)
                ? thumbsJson.data
                : [];
              const bestThumb = thumbs.reduce((best: any, cur: any) => {
                const bestScore = (best?.width || 0) * (best?.height || 0) || 0;
                const curScore = (cur?.width || 0) * (cur?.height || 0) || 0;
                return curScore > bestScore ? cur : best;
              }, null);

              // Meta returns different key names depending on object
              const thumbUri: string | undefined =
                bestThumb?.uri || bestThumb?.url || bestThumb?.src;

              if (thumbUri) videoPictureUrl = thumbUri;
            } else {
              this.logger.warn(
                `Failed to fetch video thumbnails (${resolvedVideoId}): ${thumbsResp.status} ${thumbsResp.statusText}`,
              );
            }
          } catch (thumbErr) {
            this.logger.warn(
              `Failed to fetch video thumbnails: ${thumbErr.message}`,
            );
          }

          // Instagram fallback (often provides a much higher-res image than Meta's 64x64 thumbnail_url)
          try {
            const permalink: string | undefined =
              data.creative?.instagram_permalink_url;
            if (permalink) {
              const u = new URL(permalink);
              // Normalize to `www` to avoid inconsistent hosts breaking image loads in some browsers
              if (u.hostname === "instagram.com") {
                u.hostname = "www.instagram.com";
              }
              const basePath = u.pathname.endsWith("/")
                ? u.pathname.slice(0, -1)
                : u.pathname;
              const instagramMediaUrlLarge = `${u.origin}${basePath}/media/?size=l`;
              data.creative.instagramMediaUrlLarge = instagramMediaUrlLarge;

              // Use IG media as last resort when we couldn't get a better picture
              if (!videoPictureUrl) {
                videoPictureUrl = instagramMediaUrlLarge;
              }
            }
          } catch (igErr) {
            this.logger.warn(
              `Failed to build Instagram media URL: ${igErr.message}`,
            );
          }

          if (videoSourceUrl) {
            data.creative.videoSourceUrl = videoSourceUrl;
            data.creative.videoWidth = videoWidth;
            data.creative.videoHeight = videoHeight;
          }

          if (videoPictureUrl) {
            data.creative.videoPictureUrl = videoPictureUrl;
          }

          // Mirror into object_story_spec.video_data if present (keeps frontend logic simple)
          if (data.creative?.object_story_spec?.video_data) {
            if (videoSourceUrl) {
              data.creative.object_story_spec.video_data.videoSourceUrl =
                videoSourceUrl;
              data.creative.object_story_spec.video_data.videoWidth =
                videoWidth;
              data.creative.object_story_spec.video_data.videoHeight =
                videoHeight;
            }
            if (videoPictureUrl) {
              data.creative.object_story_spec.video_data.videoPictureUrl =
                videoPictureUrl;
            }
          }
        } catch (videoError) {
          this.logger.warn(
            `Failed to fetch video source URL: ${videoError.message}`,
          );
        }
      }

      return {
        success: true,
        data: data.creative || {},
      };
    } catch (error) {
      this.logger.error(`Error fetching creative details: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Backfill missing campaign names in action logs
   * Finds all records with NULL or "Unknown Campaign" campaign_name
   * and updates them by fetching the actual name from Meta API
   */
  async backfillCampaignNames(
    userId: string,
    workspaceId?: string,
  ): Promise<{
    success: boolean;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    this.logger.log(
      `Starting backfill of campaign names for user ${userId}, workspace ${workspaceId || "none"}`,
    );

    const errors: string[] = [];
    let updated = 0;
    let failed = 0;

    try {
      // Get all user's connections (to verify access and get tokens)
      let connectionsQuery = this.supabase
        .from("connections")
        .select("id, access_token, refresh_token")
        .eq("provider", "meta")
        .eq("is_active", true);

      if (workspaceId) {
        connectionsQuery = connectionsQuery.eq("workspace_id", workspaceId);
      } else {
        connectionsQuery = connectionsQuery.eq("user_id", userId);
      }

      const { data: connections, error: connError } = await connectionsQuery;

      if (connError || !connections?.length) {
        return {
          success: false,
          updated: 0,
          failed: 0,
          errors: ["No Meta connections found"],
        };
      }

      const connectionIds = connections.map((c) => c.id);

      // Find all action logs with missing campaign names
      const { data: logsToUpdate, error: logsError } = await this.supabase
        .from("meta_action_logs")
        .select("id, campaign_id, connection_id")
        .in("connection_id", connectionIds)
        .or("campaign_name.is.null,campaign_name.eq.,campaign_name.eq.Unknown Campaign");

      if (logsError) {
        return {
          success: false,
          updated: 0,
          failed: 0,
          errors: [`Failed to fetch logs: ${logsError.message}`],
        };
      }

      if (!logsToUpdate?.length) {
        this.logger.log("No action logs need backfilling");
        return {
          success: true,
          updated: 0,
          failed: 0,
          errors: [],
        };
      }

      this.logger.log(`Found ${logsToUpdate.length} action logs to backfill`);

      // Group by connection_id + campaign_id to avoid duplicate API calls
      const campaignMap = new Map<
        string,
        { connectionId: string; campaignId: string; logIds: string[] }
      >();

      for (const log of logsToUpdate) {
        const key = `${log.connection_id}:${log.campaign_id}`;
        if (!campaignMap.has(key)) {
          campaignMap.set(key, {
            connectionId: log.connection_id,
            campaignId: log.campaign_id,
            logIds: [],
          });
        }
        campaignMap.get(key)!.logIds.push(log.id);
      }

      this.logger.log(
        `Grouped into ${campaignMap.size} unique campaigns to fetch`,
      );

      // First, try to get names from our database (campaign_templates)
      // This is more efficient than calling Meta API
      const campaignIds = [...campaignMap.values()].map((c) => c.campaignId);
      const { data: templates } = await this.supabase
        .from("campaign_templates")
        .select("published_campaign_id, name")
        .in("published_campaign_id", campaignIds);

      // Create a map of campaignId -> name from templates
      const templateNameMap = new Map<string, string>();
      if (templates?.length) {
        for (const t of templates) {
          if (t.published_campaign_id && t.name) {
            templateNameMap.set(t.published_campaign_id, t.name);
          }
        }
        this.logger.log(
          `Found ${templateNameMap.size} campaign names in campaign_templates`,
        );
      }

      // Process each unique campaign
      for (const [key, { connectionId, campaignId, logIds }] of campaignMap) {
        try {
          // First try to get from our database
          let campaignName = templateNameMap.get(campaignId);

          // If not found in database, try Meta API as fallback
          if (!campaignName) {
            this.logger.log(
              `Campaign ${campaignId} not in database, trying Meta API`,
            );
            const accessToken = await this.getAccessToken(connectionId);
            campaignName = await this.getCampaignName(campaignId, accessToken);

            // Small delay to avoid rate limiting (only when using API)
            await new Promise((resolve) => setTimeout(resolve, 200));
          }

          if (campaignName && campaignName !== "Unknown Campaign") {
            // Update all logs with this campaign
            const { error: updateError } = await this.supabase
              .from("meta_action_logs")
              .update({ campaign_name: campaignName })
              .in("id", logIds);

            if (updateError) {
              errors.push(`Failed to update logs for ${key}: ${updateError.message}`);
              failed += logIds.length;
            } else {
              updated += logIds.length;
              this.logger.log(
                `Updated ${logIds.length} logs with campaign name "${campaignName}"`,
              );
            }
          } else {
            // Could not fetch name
            failed += logIds.length;
            errors.push(`Could not fetch name for campaign ${campaignId}`);
          }
        } catch (error) {
          failed += logIds.length;
          errors.push(`Error processing ${key}: ${error.message}`);
        }
      }

      this.logger.log(
        `Backfill complete: ${updated} updated, ${failed} failed`,
      );

      return {
        success: true,
        updated,
        failed,
        errors,
      };
    } catch (error) {
      this.logger.error(`Backfill failed: ${error.message}`);
      return {
        success: false,
        updated,
        failed,
        errors: [...errors, error.message],
      };
    }
  }
}
