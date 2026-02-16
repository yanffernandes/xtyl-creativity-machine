import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleAdsApiService } from "./google-ads-api.service";
import {
  GoogleConnection,
  isGoogleConnection,
} from "../entities/google-connection.entity";
import {
  DashboardPeriod,
  CampaignMetricsDto,
  CampaignSummaryDto,
  GetCampaignsResponseDto,
  AlertType,
  ConnectionInfo,
} from "../dto/campaign-metrics.dto";
import {
  ActionLog,
  ActionLogType,
  ActionLogStatus,
  CreateActionLogInput,
  ActionLogFilters,
  ActionLogsResponse,
  ActionStats,
} from "../entities/action-log.entity";

// Alert thresholds
const ALERT_THRESHOLDS = {
  LOW_CTR: 0.01, // 1%
  HIGH_CPA: 100, // R$100
  NO_CONVERSIONS_HOURS: 48, // 48 hours
  BUDGET_DEPLETED_PERCENT: 95, // 95%
};

@Injectable()
export class GoogleDashboardService {
  private readonly logger = new Logger(GoogleDashboardService.name);
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private googleAdsApiService: GoogleAdsApiService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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

  /**
   * Get Google connection by ID with validation
   * Supports both user_id and workspace_id for authorization
   */
  private async getConnection(
    connectionId: string,
    userId: string,
  ): Promise<GoogleConnection> {
    // First try to get connection by id and verify user has access via workspace
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .eq("plataform_name", "google")
      .single();

    if (error || !connection) {
      throw new BadRequestException("Google connection not found");
    }

    // Verify user has access to this connection via workspace membership or direct ownership
    if (connection.workspace_id) {
      const { data: membership } = await this.supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", connection.workspace_id)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (!membership && connection.user_id !== userId) {
        throw new BadRequestException("Google connection not found");
      }
    } else if (connection.user_id !== userId) {
      throw new BadRequestException("Google connection not found");
    }

    if (!isGoogleConnection(connection)) {
      throw new BadRequestException("Invalid Google connection");
    }

    return connection as GoogleConnection;
  }

  /**
   * Get all Google connections for a workspace
   * Returns connections that the user has access to via workspace membership
   */
  private async getWorkspaceConnections(
    workspaceId: string,
    userId: string,
  ): Promise<Array<GoogleConnection & { connection_name: string }>> {
    // First verify user is a member of the workspace
    const { data: membership } = await this.supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!membership) {
      throw new BadRequestException("User is not a member of this workspace");
    }

    // Get all Google connections for this workspace
    const { data: connections, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("plataform_name", "google")
      .is("deleted_at", null);

    if (error) {
      this.logger.error(
        `Failed to fetch workspace connections: ${error.message}`,
      );
      throw new BadRequestException("Failed to fetch connections");
    }

    // Filter to valid Google Ads connections only
    // Exclude Ad Manager, AdSense, Search Console, etc.
    const validConnections: Array<
      GoogleConnection & { connection_name: string }
    > = [];
    for (const conn of connections || []) {
      if (isGoogleConnection(conn)) {
        // Only include connections with type 'ads' or no type (legacy)
        const metadataType = (conn.metadata as { type?: string })?.type;
        if (!metadataType || metadataType === "ads") {
          validConnections.push({
            ...(conn as GoogleConnection),
            connection_name: conn.connection_name || "Google Ads",
          });
        }
      }
    }

    return validConnections;
  }

  /**
   * Get customer account info for a specific Google campaign ID
   * This looks up the campaign template by platform_ids.campaignId
   */
  private async getCustomerForCampaign(
    googleCampaignId: string,
    connectionId: string,
    _userId: string,
  ): Promise<{ customerId: string; loginCustomerId?: string } | null> {
    // Search for the campaign template that has this Google campaign ID
    // Filter by connection_id which already ensures workspace access
    const { data: campaigns, error } = await this.supabase
      .from("ad_campaign_templates")
      .select("campaign_data, platform_ids")
      .eq("connection_id", connectionId);

    if (error || !campaigns) {
      this.logger.error(`Failed to find campaign template: ${error?.message}`);
      return null;
    }

    // Find the campaign with matching Google campaign ID
    for (const campaign of campaigns) {
      const platformIds = campaign.platform_ids as { campaignId?: string };
      if (platformIds?.campaignId === googleCampaignId) {
        const campaignData = campaign.campaign_data as any;
        const account = campaignData?.account;

        if (account?.customerId) {
          return {
            customerId: String(account.customerId).replace(/-/g, ""),
            loginCustomerId: account.loginCustomerId
              ? String(account.loginCustomerId).replace(/-/g, "")
              : undefined,
          };
        }
      }
    }

    return null;
  }

  /**
   * Get unique customer IDs from published campaigns for a connection
   * This extracts customer_id from campaign_data.account.customerId
   */
  private async getCustomerIdsFromCampaigns(
    connectionId: string,
    _userId: string,
  ): Promise<Array<{ customerId: string; loginCustomerId?: string }>> {
    // Filter by connection_id which already ensures workspace access via getConnection
    const { data: campaigns, error } = await this.supabase
      .from("ad_campaign_templates")
      .select("campaign_data")
      .eq("connection_id", connectionId)
      .in("status", ["published", "paused"]);

    if (error) {
      this.logger.error(`Failed to fetch campaigns: ${error.message}`);
      return [];
    }

    // Extract unique customer IDs from campaign data
    const customerMap = new Map<
      string,
      { customerId: string; loginCustomerId?: string }
    >();

    for (const campaign of campaigns || []) {
      const campaignData = campaign.campaign_data as any;
      const account = campaignData?.account;

      if (account?.customerId) {
        const customerId = String(account.customerId).replace(/-/g, "");
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customerId,
            loginCustomerId: account.loginCustomerId
              ? String(account.loginCustomerId).replace(/-/g, "")
              : undefined,
          });
        }
      }
    }

    return Array.from(customerMap.values());
  }

  /**
   * Get all accessible customer IDs from Google Ads API
   * This is used as fallback when no campaigns exist in the database
   * to still allow users to see their existing Google Ads campaigns
   */
  private async getAccessibleCustomerIds(
    connection: GoogleConnection,
  ): Promise<Array<{ customerId: string; loginCustomerId?: string }>> {
    try {
      this.logger.log(
        `Fetching accessible customers from API for connection ${connection.id}`,
      );
      const customers =
        await this.googleAdsApiService.listAccessibleCustomers(connection);

      // Filter out manager accounts (MCCs) - we want to query actual ad accounts
      // Manager accounts don't have campaigns directly, only their sub-accounts do
      const nonManagerCustomers = customers.filter((c) => !c.is_manager);

      this.logger.log(
        `Found ${nonManagerCustomers.length} non-manager accounts from API`,
      );

      return nonManagerCustomers.map((c) => ({
        customerId: String(c.customer_id).replace(/-/g, ""),
        loginCustomerId: undefined, // Direct accounts don't need loginCustomerId
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(
        `Failed to fetch accessible customers from API: ${errorMsg}`,
      );
      return [];
    }
  }

  /**
   * Get enabled Google Ads accounts from the database (google_ads_accounts table)
   * These are accounts the user has explicitly enabled for monitoring
   */
  private async getEnabledAccountsFromDatabase(
    connectionId: string,
  ): Promise<Array<{ customerId: string; loginCustomerId?: string }>> {
    const { data: accounts, error } = await this.supabase
      .from("google_ads_accounts")
      .select("customer_id, login_customer_id, is_manager")
      .eq("connection_id", connectionId)
      .eq("is_active", true);

    if (error) {
      this.logger.error(
        `Failed to fetch enabled accounts from database: ${error.message}`,
      );
      return [];
    }

    if (!accounts || accounts.length === 0) {
      return [];
    }

    // Filter out manager accounts - we want to query actual ad accounts
    const nonManagerAccounts = accounts.filter((a) => !a.is_manager);

    this.logger.log(
      `Found ${nonManagerAccounts.length} enabled non-manager accounts from database`,
    );

    return nonManagerAccounts.map((a) => ({
      customerId: String(a.customer_id).replace(/-/g, ""),
      loginCustomerId: a.login_customer_id
        ? String(a.login_customer_id).replace(/-/g, "")
        : undefined,
    }));
  }

  /**
   * Get campaign metrics with caching - supports both single connection and workspace-wide queries
   * T016-T018: Campaign fetching with period filtering and caching
   *
   * If workspaceId is provided, fetches campaigns from ALL Google connections in the workspace.
   * If connectionId is provided, fetches campaigns from that single connection.
   *
   * This method now automatically discovers customer IDs from published campaigns
   * and fetches metrics from all accounts that have campaigns.
   */
  async getCampaigns(
    userId: string,
    connectionId?: string,
    period: DashboardPeriod = DashboardPeriod.LAST_7D,
    startDate?: string,
    endDate?: string,
    statusFilter?: "ENABLED" | "PAUSED" | "all",
    sortBy?: string,
    sortOrder: "asc" | "desc" = "desc",
    forceRefresh: boolean = false,
    workspaceId?: string,
  ): Promise<GetCampaignsResponseDto> {
    // If workspaceId is provided, fetch from all connections
    if (workspaceId) {
      return this.getCampaignsFromWorkspace(
        userId,
        workspaceId,
        period,
        startDate,
        endDate,
        statusFilter,
        sortBy,
        sortOrder,
        forceRefresh,
      );
    }

    // Single connection mode (original behavior)
    if (!connectionId) {
      throw new BadRequestException(
        "Either connectionId or workspaceId must be provided",
      );
    }

    // Build cache key
    const cacheKey = `dashboard:campaigns:${connectionId}:${period}:${startDate || ""}:${endDate || ""}`;

    // Try to get from cache (skip if forceRefresh)
    if (!forceRefresh) {
      const cached =
        await this.cacheManager.get<GetCampaignsResponseDto>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for campaigns: ${cacheKey}`);
        return this.filterAndSortCampaigns(
          cached,
          statusFilter,
          sortBy,
          sortOrder,
        );
      }
    } else {
      this.logger.log(
        `Force refresh requested, skipping cache for: ${cacheKey}`,
      );
    }

    // Fetch the connection
    const connection = await this.getConnection(connectionId, userId);

    // Priority order for getting customer accounts:
    // 1. Enabled accounts from google_ads_accounts table (user has explicitly enabled these)
    // 2. Customer IDs from published campaigns (campaigns created through the app)
    // 3. Accessible accounts from API (fallback for new connections)

    // First, try to get enabled accounts from database
    let customerAccounts =
      await this.getEnabledAccountsFromDatabase(connectionId);

    if (customerAccounts.length > 0) {
      this.logger.log(
        `Using ${customerAccounts.length} enabled accounts from database for connection ${connectionId}`,
      );
    } else {
      // No enabled accounts - fall back to campaigns or API
      this.logger.log(
        `No enabled accounts found for connection ${connectionId}, checking campaigns`,
      );

      // Try campaigns from app
      customerAccounts = await this.getCustomerIdsFromCampaigns(
        connectionId,
        userId,
      );

      if (customerAccounts.length === 0) {
        // No campaigns either - try API as last resort
        this.logger.log(
          `No published campaigns found, fetching accessible accounts from API`,
        );
        customerAccounts = await this.getAccessibleCustomerIds(connection);
      }

      if (customerAccounts.length === 0) {
        // No accounts accessible - return empty result
        this.logger.log(
          `No accessible accounts found for connection ${connectionId}`,
        );
        const emptyResponse: GetCampaignsResponseDto = {
          campaigns: [],
          summary: {
            totalCampaigns: 0,
            activeCampaigns: 0,
            totalImpressions: 0,
            totalClicks: 0,
            totalCost: 0,
            totalConversions: 0,
            avgCtr: 0,
            avgCpa: 0,
          },
          connections: [
            {
              id: connectionId,
              name: (connection as any).connection_name || "Google Ads",
              customerIds: [],
            },
          ],
          fetchedAt: new Date().toISOString(),
        };
        return emptyResponse;
      }
    }

    this.logger.log(
      `Found ${customerAccounts.length} unique customer accounts`,
    );

    // Map DashboardPeriod enum to API period string
    const apiPeriod = this.mapPeriodToApiPeriod(period);

    // Fetch metrics from all customer accounts IN PARALLEL
    const allCampaigns: CampaignMetricsDto[] = [];
    const errors: string[] = [];

    const accountResults = await Promise.allSettled(
      customerAccounts.map(async (account) => {
        this.logger.log(`Fetching metrics for customer ${account.customerId}`);

        const result = await this.googleAdsApiService.getCampaignMetrics(
          connection,
          apiPeriod,
          startDate,
          endDate,
          account.customerId,
          account.loginCustomerId,
        );

        if (result.success && result.campaigns) {
          // Add alerts, customer info, and connection info to campaigns
          return result.campaigns.map((campaign) => ({
            ...campaign,
            alerts: this.detectAlerts(campaign),
            customerId: account.customerId,
            loginCustomerId: account.loginCustomerId,
            connectionId: connectionId,
            connectionName: (connection as any).connection_name || "Google Ads",
          }));
        } else if (result.error) {
          this.logger.warn(
            `Failed to fetch metrics for customer ${account.customerId}: ${result.error}`,
          );
          throw new Error(result.error);
        }
        return [];
      }),
    );

    for (const result of accountResults) {
      if (result.status === "fulfilled" && result.value) {
        allCampaigns.push(...result.value);
      } else if (result.status === "rejected") {
        const errorMsg =
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown error";
        this.logger.error(`Error fetching metrics: ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // If all requests failed, throw an error
    if (allCampaigns.length === 0 && errors.length > 0) {
      throw new BadRequestException(`Failed to fetch campaigns: ${errors[0]}`);
    }

    // Calculate summary from all campaigns
    const summary: CampaignSummaryDto = {
      totalCampaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter((c) => c.status === "ENABLED")
        .length,
      totalImpressions: allCampaigns.reduce((sum, c) => sum + c.impressions, 0),
      totalClicks: allCampaigns.reduce((sum, c) => sum + c.clicks, 0),
      totalCost: allCampaigns.reduce((sum, c) => sum + c.cost, 0),
      totalConversions: allCampaigns.reduce((sum, c) => sum + c.conversions, 0),
      avgCtr: 0,
      avgCpa: 0,
    };

    // Calculate averages
    if (summary.totalImpressions > 0) {
      summary.avgCtr = summary.totalClicks / summary.totalImpressions;
    }
    if (summary.totalConversions > 0) {
      summary.avgCpa = summary.totalCost / summary.totalConversions;
    }

    // Build connections info
    const connectionsInfo: ConnectionInfo[] = [
      {
        id: connectionId,
        name: (connection as any).connection_name || "Google Ads",
        customerIds: customerAccounts.map((a) => a.customerId),
      },
    ];

    const response: GetCampaignsResponseDto = {
      campaigns: allCampaigns,
      summary,
      connections: connectionsInfo,
      fetchedAt: new Date().toISOString(),
    };

    // Cache the response
    await this.cacheManager.set(cacheKey, response);
    this.logger.log(`Cached campaigns for: ${cacheKey}`);

    return this.filterAndSortCampaigns(
      response,
      statusFilter,
      sortBy,
      sortOrder,
    );
  }

  /**
   * Get campaigns from all Google connections in a workspace
   * Consolidates campaigns from multiple connections into a single response
   */
  private async getCampaignsFromWorkspace(
    userId: string,
    workspaceId: string,
    period: DashboardPeriod,
    startDate?: string,
    endDate?: string,
    statusFilter?: "ENABLED" | "PAUSED" | "all",
    sortBy?: string,
    sortOrder: "asc" | "desc" = "desc",
    forceRefresh: boolean = false,
  ): Promise<GetCampaignsResponseDto> {
    // Build cache key for workspace
    const cacheKey = `dashboard:campaigns:workspace:${workspaceId}:${period}:${startDate || ""}:${endDate || ""}`;

    // Try to get from cache (skip if forceRefresh)
    if (!forceRefresh) {
      const cached =
        await this.cacheManager.get<GetCampaignsResponseDto>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for workspace campaigns: ${cacheKey}`);
        return this.filterAndSortCampaigns(
          cached,
          statusFilter,
          sortBy,
          sortOrder,
        );
      }
    } else {
      this.logger.log(
        `Force refresh requested, skipping cache for workspace: ${cacheKey}`,
      );
    }

    // Get all Google connections for this workspace
    const connections = await this.getWorkspaceConnections(workspaceId, userId);

    if (connections.length === 0) {
      this.logger.log(
        `No Google connections found for workspace ${workspaceId}`,
      );
      return {
        campaigns: [],
        summary: {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalImpressions: 0,
          totalClicks: 0,
          totalCost: 0,
          totalConversions: 0,
          avgCtr: 0,
          avgCpa: 0,
        },
        connections: [],
        fetchedAt: new Date().toISOString(),
      };
    }

    this.logger.log(
      `Found ${connections.length} Google connections for workspace ${workspaceId}`,
    );

    // Map DashboardPeriod enum to API period string
    const apiPeriod = this.mapPeriodToApiPeriod(period);

    // Fetch metrics from all connections in parallel
    const allCampaigns: CampaignMetricsDto[] = [];
    const connectionsInfo: ConnectionInfo[] = [];
    const errors: string[] = [];

    await Promise.all(
      connections.map(async (connection) => {
        try {
          // Priority order for getting customer accounts:
          // 1. Enabled accounts from google_ads_accounts table (user has explicitly enabled these)
          // 2. Customer IDs from published campaigns (campaigns created through the app)
          // 3. Accessible accounts from API (fallback for new connections)

          // First, try to get enabled accounts from database
          let customerAccounts = await this.getEnabledAccountsFromDatabase(
            connection.id,
          );

          if (customerAccounts.length > 0) {
            this.logger.log(
              `[Workspace] Using ${customerAccounts.length} enabled accounts for connection ${connection.id}`,
            );
          } else {
            // No enabled accounts - fall back to campaigns or API
            customerAccounts = await this.getCustomerIdsFromCampaigns(
              connection.id,
              userId,
            );

            if (customerAccounts.length === 0) {
              this.logger.log(
                `[Workspace] No campaigns for connection ${connection.id}, fetching from API`,
              );
              customerAccounts =
                await this.getAccessibleCustomerIds(connection);
            }
          }

          if (customerAccounts.length === 0) {
            this.logger.log(
              `[Workspace] No accessible accounts for connection ${connection.id}`,
            );
            connectionsInfo.push({
              id: connection.id,
              name: connection.connection_name,
              customerIds: [],
            });
            return;
          }

          // Add connection info
          connectionsInfo.push({
            id: connection.id,
            name: connection.connection_name,
            customerIds: customerAccounts.map((a) => a.customerId),
          });

          // Fetch metrics for each customer account IN PARALLEL
          const wsAccountResults = await Promise.allSettled(
            customerAccounts.map(async (account) => {
              this.logger.log(
                `[Workspace] Fetching metrics for customer ${account.customerId} (connection: ${connection.id})`,
              );

              const result = await this.googleAdsApiService.getCampaignMetrics(
                connection,
                apiPeriod,
                startDate,
                endDate,
                account.customerId,
                account.loginCustomerId,
              );

              if (result.success && result.campaigns) {
                return result.campaigns.map((campaign) => ({
                  ...campaign,
                  alerts: this.detectAlerts(campaign),
                  customerId: account.customerId,
                  loginCustomerId: account.loginCustomerId,
                  connectionId: connection.id,
                  connectionName: connection.connection_name,
                }));
              } else if (result.error) {
                this.logger.warn(
                  `[Workspace] Failed to fetch metrics for customer ${account.customerId}: ${result.error}`,
                );
                throw new Error(result.error);
              }
              return [];
            }),
          );

          for (const wsResult of wsAccountResults) {
            if (wsResult.status === "fulfilled" && wsResult.value) {
              allCampaigns.push(...wsResult.value);
            } else if (wsResult.status === "rejected") {
              const errorMsg =
                wsResult.reason instanceof Error
                  ? wsResult.reason.message
                  : "Unknown error";
              this.logger.error(
                `[Workspace] Error fetching metrics: ${errorMsg}`,
              );
              errors.push(errorMsg);
            }
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
          this.logger.error(
            `[Workspace] Error processing connection ${connection.id}: ${errorMsg}`,
          );
          errors.push(errorMsg);
        }
      }),
    );

    // Calculate summary from all campaigns
    const summary: CampaignSummaryDto = {
      totalCampaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter((c) => c.status === "ENABLED")
        .length,
      totalImpressions: allCampaigns.reduce((sum, c) => sum + c.impressions, 0),
      totalClicks: allCampaigns.reduce((sum, c) => sum + c.clicks, 0),
      totalCost: allCampaigns.reduce((sum, c) => sum + c.cost, 0),
      totalConversions: allCampaigns.reduce((sum, c) => sum + c.conversions, 0),
      avgCtr: 0,
      avgCpa: 0,
    };

    // Calculate averages
    if (summary.totalImpressions > 0) {
      summary.avgCtr = summary.totalClicks / summary.totalImpressions;
    }
    if (summary.totalConversions > 0) {
      summary.avgCpa = summary.totalCost / summary.totalConversions;
    }

    const response: GetCampaignsResponseDto = {
      campaigns: allCampaigns,
      summary,
      connections: connectionsInfo,
      fetchedAt: new Date().toISOString(),
    };

    // Cache the response
    await this.cacheManager.set(cacheKey, response);
    this.logger.log(`Cached workspace campaigns for: ${cacheKey}`);

    return this.filterAndSortCampaigns(
      response,
      statusFilter,
      sortBy,
      sortOrder,
    );
  }

  /**
   * Filter and sort campaigns based on query params
   */
  private filterAndSortCampaigns(
    response: GetCampaignsResponseDto,
    statusFilter?: "ENABLED" | "PAUSED" | "all",
    sortBy?: string,
    sortOrder: "asc" | "desc" = "desc",
  ): GetCampaignsResponseDto {
    let campaigns = [...response.campaigns];

    // Filter by status
    if (statusFilter && statusFilter !== "all") {
      campaigns = campaigns.filter((c) => c.status === statusFilter);
    }

    // Sort
    if (sortBy) {
      campaigns.sort((a, b) => {
        const aVal = (a as any)[sortBy] ?? 0;
        const bVal = (b as any)[sortBy] ?? 0;
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return {
      ...response,
      campaigns,
    };
  }

  /**
   * Get campaigns with filter push-down to GAQL
   * This method builds GAQL queries with WHERE clauses for filtering at the API level
   *
   * @param userId - User ID for authorization
   * @param connectionId - Google connection ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @param options - Filter, sort, and pagination options
   * @param forceRefresh - Skip cache if true
   */
  async getCampaignsWithFilters(
    userId: string,
    connectionId: string,
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
      statusFilter?: "ENABLED" | "PAUSED" | "all";
      orderBy?:
        | "cost"
        | "impressions"
        | "clicks"
        | "conversions"
        | "ctr"
        | "cpa"
        | "roas"
        | "name";
      sortOrder?: "asc" | "desc";
      limit?: number;
    },
    forceRefresh: boolean = false,
  ): Promise<GetCampaignsResponseDto> {
    // Build filter-aware cache key
    const filterHash = this.buildFilterHash(options);
    const cacheKey = `dashboard:campaigns:filters:${connectionId}:${startDate}:${endDate}:${filterHash}`;

    // Try to get from cache (skip if forceRefresh)
    if (!forceRefresh) {
      const cached =
        await this.cacheManager.get<GetCampaignsResponseDto>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for filtered campaigns: ${cacheKey}`);
        return cached;
      }
    }

    // Fetch the connection
    const connection = await this.getConnection(connectionId, userId);

    // Get enabled accounts from database
    let customerAccounts =
      await this.getEnabledAccountsFromDatabase(connectionId);

    if (customerAccounts.length === 0) {
      // No enabled accounts - fall back to campaigns or API
      customerAccounts = await this.getCustomerIdsFromCampaigns(
        connectionId,
        userId,
      );

      if (customerAccounts.length === 0) {
        customerAccounts = await this.getAccessibleCustomerIds(connection);
      }

      if (customerAccounts.length === 0) {
        // No accounts accessible - return empty result
        const emptyResponse: GetCampaignsResponseDto = {
          campaigns: [],
          summary: {
            totalCampaigns: 0,
            activeCampaigns: 0,
            totalImpressions: 0,
            totalClicks: 0,
            totalCost: 0,
            totalConversions: 0,
            avgCtr: 0,
            avgCpa: 0,
          },
          connections: [
            {
              id: connectionId,
              name: (connection as any).connection_name || "Google Ads",
              customerIds: [],
            },
          ],
          fetchedAt: new Date().toISOString(),
        };
        return emptyResponse;
      }
    }

    this.logger.log(
      `Fetching campaigns with filters for ${customerAccounts.length} accounts`,
    );

    // Fetch metrics from all customer accounts with filters IN PARALLEL
    // Google Ads API supports ~10 requests/second per customer ID,
    // and different customer accounts are independent resources
    const allCampaigns: CampaignMetricsDto[] = [];
    const errors: string[] = [];

    const accountResults = await Promise.allSettled(
      customerAccounts.map(async (account) => {
        this.logger.log(
          `Fetching filtered metrics for customer ${account.customerId}`,
        );

        const result =
          await this.googleAdsApiService.getCampaignMetricsWithFilters(
            connection,
            startDate,
            endDate,
            account.customerId,
            account.loginCustomerId,
            options,
          );

        if (result.success && result.campaigns) {
          // Add alerts, customer info, and connection info to campaigns
          return result.campaigns.map((campaign) => ({
            ...campaign,
            alerts: this.detectAlerts(campaign),
            customerId: account.customerId,
            loginCustomerId: account.loginCustomerId,
            connectionId: connectionId,
            connectionName: (connection as any).connection_name || "Google Ads",
          }));
        } else if (result.error) {
          this.logger.warn(
            `Failed to fetch filtered metrics for customer ${account.customerId}: ${result.error}`,
          );
          throw new Error(result.error);
        }
        return [];
      }),
    );

    for (const result of accountResults) {
      if (result.status === "fulfilled" && result.value) {
        allCampaigns.push(...result.value);
      } else if (result.status === "rejected") {
        const errorMsg =
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown error";
        this.logger.error(`Error fetching filtered metrics: ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // If all requests failed, throw an error
    if (allCampaigns.length === 0 && errors.length > 0) {
      throw new BadRequestException(
        `Failed to fetch filtered campaigns: ${errors[0]}`,
      );
    }

    // Calculate summary from all campaigns (already filtered by GAQL)
    const summary: CampaignSummaryDto = {
      totalCampaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter((c) => c.status === "ENABLED")
        .length,
      totalImpressions: allCampaigns.reduce((sum, c) => sum + c.impressions, 0),
      totalClicks: allCampaigns.reduce((sum, c) => sum + c.clicks, 0),
      totalCost: allCampaigns.reduce((sum, c) => sum + c.cost, 0),
      totalConversions: allCampaigns.reduce((sum, c) => sum + c.conversions, 0),
      avgCtr: 0,
      avgCpa: 0,
    };

    // Calculate averages
    if (summary.totalImpressions > 0) {
      summary.avgCtr = summary.totalClicks / summary.totalImpressions;
    }
    if (summary.totalConversions > 0) {
      summary.avgCpa = summary.totalCost / summary.totalConversions;
    }

    // Build connections info
    const connectionsInfo: ConnectionInfo[] = [
      {
        id: connectionId,
        name: (connection as any).connection_name || "Google Ads",
        customerIds: customerAccounts.map((a) => a.customerId),
      },
    ];

    const response: GetCampaignsResponseDto = {
      campaigns: allCampaigns,
      summary,
      connections: connectionsInfo,
      fetchedAt: new Date().toISOString(),
    };

    // Cache the response (5 minute TTL for filtered results)
    await this.cacheManager.set(cacheKey, response, 5 * 60 * 1000);
    this.logger.log(`Cached filtered campaigns for: ${cacheKey}`);

    return response;
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
   * Map DashboardPeriod enum to API period string
   */
  private mapPeriodToApiPeriod(
    period: DashboardPeriod,
  ): "today" | "yesterday" | "last_7d" | "last_30d" | "custom" {
    switch (period) {
      case DashboardPeriod.TODAY:
        return "today";
      case DashboardPeriod.YESTERDAY:
        return "yesterday";
      case DashboardPeriod.LAST_7D:
        return "last_7d";
      case DashboardPeriod.LAST_30D:
        return "last_30d";
      case DashboardPeriod.CUSTOM:
        return "custom";
      default:
        return "last_7d";
    }
  }

  /**
   * Detect performance alerts for a campaign
   * T079-T080: Alert detection logic
   */
  private detectAlerts(campaign: {
    ctr: number;
    cpa: number;
    conversions: number;
    budgetSpentPercent: number;
    impressions: number;
  }): AlertType[] {
    const alerts: AlertType[] = [];

    // Low CTR alert (if has impressions but CTR < 1%)
    if (campaign.impressions > 100 && campaign.ctr < ALERT_THRESHOLDS.LOW_CTR) {
      alerts.push("low_ctr");
    }

    // High CPA alert (if has conversions but CPA > threshold)
    if (campaign.conversions > 0 && campaign.cpa > ALERT_THRESHOLDS.HIGH_CPA) {
      alerts.push("high_cpa");
    }

    // No conversions alert (campaign with spend but no conversions)
    // This is a simplified check - in production would check runtime hours
    if (campaign.impressions > 1000 && campaign.conversions === 0) {
      alerts.push("no_conversions");
    }

    // Budget depleted alert
    if (
      campaign.budgetSpentPercent >= ALERT_THRESHOLDS.BUDGET_DEPLETED_PERCENT
    ) {
      alerts.push("budget_depleted");
    }

    return alerts;
  }

  /**
   * Pause a campaign
   * T029: Pause campaign method
   */
  async pauseCampaign(
    userId: string,
    connectionId: string,
    campaignId: string,
  ): Promise<{
    success: boolean;
    previousStatus?: string;
    actionLogId?: string;
    error?: string;
  }> {
    const connection = await this.getConnection(connectionId, userId);

    // Get customer ID from campaign template
    const customerAccount = await this.getCustomerForCampaign(
      campaignId,
      connectionId,
      userId,
    );
    const customerId = customerAccount?.customerId;

    const result = await this.googleAdsApiService.pauseCampaign(
      connection,
      campaignId,
      customerId,
    );

    if (result.success) {
      // Log the action
      const actionLog = await this.logAction({
        user_id: userId,
        connection_id: connectionId,
        source: "manual",
        google_campaign_id: campaignId,
        action_type: "pause",
        action_details: {
          previousValue: result.previousStatus === "ENABLED" ? 1 : 0,
        },
        status: "success",
      });

      // Invalidate cache
      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousStatus: result.previousStatus,
        actionLogId: actionLog.id,
      };
    }

    // Log failed action
    await this.logAction({
      user_id: userId,
      connection_id: connectionId,
      source: "manual",
      google_campaign_id: campaignId,
      action_type: "pause",
      status: "failed",
      error_message: result.error,
    });

    return { success: false, error: result.error };
  }

  /**
   * Enable a campaign
   * T030: Enable campaign method
   */
  async enableCampaign(
    userId: string,
    connectionId: string,
    campaignId: string,
  ): Promise<{
    success: boolean;
    previousStatus?: string;
    actionLogId?: string;
    error?: string;
  }> {
    const connection = await this.getConnection(connectionId, userId);

    // Get customer ID from campaign template
    const customerAccount = await this.getCustomerForCampaign(
      campaignId,
      connectionId,
      userId,
    );
    const customerId = customerAccount?.customerId;

    const result = await this.googleAdsApiService.enableCampaign(
      connection,
      campaignId,
      customerId,
    );

    if (result.success) {
      // Log the action
      const actionLog = await this.logAction({
        user_id: userId,
        connection_id: connectionId,
        source: "manual",
        google_campaign_id: campaignId,
        action_type: "enable",
        action_details: {
          previousValue: result.previousStatus === "PAUSED" ? 0 : 1,
        },
        status: "success",
      });

      // Invalidate cache
      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousStatus: result.previousStatus,
        actionLogId: actionLog.id,
      };
    }

    // Log failed action
    await this.logAction({
      user_id: userId,
      connection_id: connectionId,
      source: "manual",
      google_campaign_id: campaignId,
      action_type: "enable",
      status: "failed",
      error_message: result.error,
    });

    return { success: false, error: result.error };
  }

  /**
   * Update campaign budget
   * T031: Update budget method
   */
  async updateBudget(
    userId: string,
    connectionId: string,
    campaignId: string,
    budgetId: string,
    newBudget: number,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    success: boolean;
    previousBudget?: number;
    newBudget?: number;
    actionLogId?: string;
    error?: string;
  }> {
    this.logger.log(
      `updateBudget: START - userId=${userId}, connectionId=${connectionId}, campaignId=${campaignId}, budgetId=${budgetId}, newBudget=${newBudget}, customerId=${customerId}, loginCustomerId=${loginCustomerId}`,
    );

    let connection;
    try {
      connection = await this.getConnection(connectionId, userId);
      this.logger.log(`updateBudget: got connection, id=${connection?.id}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`updateBudget: failed to get connection: ${errorMsg}`);
      return { success: false, error: `Failed to get connection: ${errorMsg}` };
    }

    // Use provided customerId first, then try to get from campaign template, then fallback to connection metadata
    let finalCustomerId = customerId;
    let finalLoginCustomerId = loginCustomerId;

    if (!finalCustomerId) {
      const customerAccount = await this.getCustomerForCampaign(
        campaignId,
        connectionId,
        userId,
      );
      finalCustomerId = customerAccount?.customerId;
      finalLoginCustomerId =
        finalLoginCustomerId || customerAccount?.loginCustomerId;
      this.logger.log(
        `updateBudget: looked up customerAccount=${JSON.stringify(customerAccount)}`,
      );
    }

    // Final fallback to connection metadata
    finalCustomerId = finalCustomerId || connection.metadata?.customer_id;

    this.logger.log(
      `updateBudget: finalCustomerId=${finalCustomerId}, finalLoginCustomerId=${finalLoginCustomerId}`,
    );

    if (!finalCustomerId) {
      this.logger.error(
        `updateBudget: No customer ID found for campaign ${campaignId}`,
      );
      return { success: false, error: "No customer ID found for campaign" };
    }

    this.logger.log(
      `updateBudget: calling googleAdsApiService.updateCampaignBudget...`,
    );
    let result;
    try {
      result = await this.googleAdsApiService.updateCampaignBudget(
        connection,
        campaignId,
        budgetId,
        newBudget,
        finalCustomerId,
        finalLoginCustomerId,
      );
      this.logger.log(`updateBudget: API result: ${JSON.stringify(result)}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`updateBudget: API call threw error: ${errorMsg}`);
      return { success: false, error: `API call failed: ${errorMsg}` };
    }

    if (result.success) {
      // Log the action
      const actionLog = await this.logAction({
        user_id: userId,
        connection_id: connectionId,
        source: "manual",
        google_campaign_id: campaignId,
        action_type: "update_budget",
        action_details: {
          previousValue: result.previousBudget,
          newValue: result.newBudget,
          changeAmount: (result.newBudget || 0) - (result.previousBudget || 0),
        },
        status: "success",
      });

      // Invalidate cache
      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousBudget: result.previousBudget,
        newBudget: result.newBudget,
        actionLogId: actionLog.id,
      };
    }

    // Log failed action
    await this.logAction({
      user_id: userId,
      connection_id: connectionId,
      source: "manual",
      google_campaign_id: campaignId,
      action_type: "update_budget",
      status: "failed",
      error_message: result.error,
    });

    return { success: false, error: result.error };
  }

  /**
   * Update CPC bid for a campaign (updates all ad groups)
   */
  async updateBid(
    userId: string,
    connectionId: string,
    campaignId: string,
    newBid: number,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    success: boolean;
    previousBid?: number;
    newBid?: number;
    actionLogId?: string;
    error?: string;
  }> {
    this.logger.log(
      `updateBid: START - userId=${userId}, connectionId=${connectionId}, campaignId=${campaignId}, newBid=${newBid}, customerId=${customerId}, loginCustomerId=${loginCustomerId}`,
    );

    let connection;
    try {
      connection = await this.getConnection(connectionId, userId);
      this.logger.log(`updateBid: got connection, id=${connection?.id}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`updateBid: failed to get connection: ${errorMsg}`);
      return { success: false, error: `Failed to get connection: ${errorMsg}` };
    }

    // Use provided customerId first, then try to get from campaign template, then fallback to connection metadata
    let finalCustomerId = customerId;
    let finalLoginCustomerId = loginCustomerId;

    if (!finalCustomerId) {
      const customerAccount = await this.getCustomerForCampaign(
        campaignId,
        connectionId,
        userId,
      );
      finalCustomerId = customerAccount?.customerId;
      finalLoginCustomerId =
        finalLoginCustomerId || customerAccount?.loginCustomerId;
      this.logger.log(
        `updateBid: looked up customerAccount=${JSON.stringify(customerAccount)}`,
      );
    }

    // Final fallback to connection metadata
    finalCustomerId = finalCustomerId || connection.metadata?.customer_id;

    this.logger.log(
      `updateBid: finalCustomerId=${finalCustomerId}, finalLoginCustomerId=${finalLoginCustomerId}`,
    );

    if (!finalCustomerId) {
      this.logger.error(
        `updateBid: No customer ID found for campaign ${campaignId}`,
      );
      return { success: false, error: "No customer ID found for campaign" };
    }

    this.logger.log(
      `updateBid: calling googleAdsApiService.updateCampaignBid...`,
    );
    let result;
    try {
      result = await this.googleAdsApiService.updateCampaignBid(
        connection,
        campaignId,
        newBid,
        finalCustomerId,
        finalLoginCustomerId,
      );
      this.logger.log(`updateBid: API result: ${JSON.stringify(result)}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`updateBid: API call threw error: ${errorMsg}`);
      return { success: false, error: `API call failed: ${errorMsg}` };
    }

    if (result.success) {
      // Log the action
      const actionLog = await this.logAction({
        user_id: userId,
        connection_id: connectionId,
        source: "manual",
        google_campaign_id: campaignId,
        action_type: "update_bid",
        action_details: {
          previousValue: result.previousBid,
          newValue: result.newBid,
          changeAmount: (result.newBid || 0) - (result.previousBid || 0),
        },
        status: "success",
      });

      // Invalidate cache
      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousBid: result.previousBid,
        newBid: result.newBid,
        actionLogId: actionLog.id,
      };
    }

    // Log failed action
    await this.logAction({
      user_id: userId,
      connection_id: connectionId,
      source: "manual",
      google_campaign_id: campaignId,
      action_type: "update_bid",
      status: "failed",
      error_message: result.error,
    });

    return { success: false, error: result.error };
  }

  /**
   * Update Target CPA for a campaign
   * Only works for campaigns using TARGET_CPA or MAXIMIZE_CONVERSIONS strategies
   */
  async updateTargetCpa(
    userId: string,
    connectionId: string,
    campaignId: string,
    newTargetCpa: number,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    success: boolean;
    previousValue?: number;
    newValue?: number;
    actionLogId?: string;
    error?: string;
  }> {
    this.logger.log(
      `updateTargetCpa: START - userId=${userId}, connectionId=${connectionId}, campaignId=${campaignId}, newTargetCpa=${newTargetCpa}`,
    );

    let connection;
    try {
      connection = await this.getConnection(connectionId, userId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `updateTargetCpa: failed to get connection: ${errorMsg}`,
      );
      return { success: false, error: `Failed to get connection: ${errorMsg}` };
    }

    // Resolve customer ID
    let finalCustomerId = customerId;
    let finalLoginCustomerId = loginCustomerId;

    if (!finalCustomerId) {
      const customerAccount = await this.getCustomerForCampaign(
        campaignId,
        connectionId,
        userId,
      );
      finalCustomerId = customerAccount?.customerId;
      finalLoginCustomerId =
        finalLoginCustomerId || customerAccount?.loginCustomerId;
    }

    finalCustomerId = finalCustomerId || connection.metadata?.customer_id;

    if (!finalCustomerId) {
      return { success: false, error: "No customer ID found for campaign" };
    }

    const result = await this.googleAdsApiService.updateCampaignTargetCpa(
      connection,
      campaignId,
      newTargetCpa,
      finalCustomerId,
      finalLoginCustomerId,
    );

    if (result.success) {
      const actionLog = await this.logAction({
        user_id: userId,
        connection_id: connectionId,
        source: "manual",
        google_campaign_id: campaignId,
        action_type: "increase_target_cpa", // Will be overridden by automation if needed
        action_details: {
          previousValue: result.previousValue,
          newValue: result.newValue,
          changeAmount: (result.newValue || 0) - (result.previousValue || 0),
        },
        status: "success",
      });

      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousValue: result.previousValue,
        newValue: result.newValue,
        actionLogId: actionLog.id,
      };
    }

    await this.logAction({
      user_id: userId,
      connection_id: connectionId,
      source: "manual",
      google_campaign_id: campaignId,
      action_type: "increase_target_cpa",
      status: "failed",
      error_message: result.error,
    });

    return { success: false, error: result.error };
  }

  /**
   * Update Target ROAS for a campaign
   * Only works for campaigns using TARGET_ROAS or MAXIMIZE_CONVERSION_VALUE strategies
   */
  async updateTargetRoas(
    userId: string,
    connectionId: string,
    campaignId: string,
    newTargetRoas: number,
    customerId?: string,
    loginCustomerId?: string,
  ): Promise<{
    success: boolean;
    previousValue?: number;
    newValue?: number;
    actionLogId?: string;
    error?: string;
  }> {
    this.logger.log(
      `updateTargetRoas: START - userId=${userId}, connectionId=${connectionId}, campaignId=${campaignId}, newTargetRoas=${newTargetRoas}`,
    );

    let connection;
    try {
      connection = await this.getConnection(connectionId, userId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `updateTargetRoas: failed to get connection: ${errorMsg}`,
      );
      return { success: false, error: `Failed to get connection: ${errorMsg}` };
    }

    // Resolve customer ID
    let finalCustomerId = customerId;
    let finalLoginCustomerId = loginCustomerId;

    if (!finalCustomerId) {
      const customerAccount = await this.getCustomerForCampaign(
        campaignId,
        connectionId,
        userId,
      );
      finalCustomerId = customerAccount?.customerId;
      finalLoginCustomerId =
        finalLoginCustomerId || customerAccount?.loginCustomerId;
    }

    finalCustomerId = finalCustomerId || connection.metadata?.customer_id;

    if (!finalCustomerId) {
      return { success: false, error: "No customer ID found for campaign" };
    }

    const result = await this.googleAdsApiService.updateCampaignTargetRoas(
      connection,
      campaignId,
      newTargetRoas,
      finalCustomerId,
      finalLoginCustomerId,
    );

    if (result.success) {
      const actionLog = await this.logAction({
        user_id: userId,
        connection_id: connectionId,
        source: "manual",
        google_campaign_id: campaignId,
        action_type: "increase_target_roas", // Will be overridden by automation if needed
        action_details: {
          previousValue: result.previousValue,
          newValue: result.newValue,
          changeAmount: (result.newValue || 0) - (result.previousValue || 0),
        },
        status: "success",
      });

      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousValue: result.previousValue,
        newValue: result.newValue,
        actionLogId: actionLog.id,
      };
    }

    await this.logAction({
      user_id: userId,
      connection_id: connectionId,
      source: "manual",
      google_campaign_id: campaignId,
      action_type: "increase_target_roas",
      status: "failed",
      error_message: result.error,
    });

    return { success: false, error: result.error };
  }

  /**
   * Log an action to google_ads_action_logs
   * T033: Log action method
   */
  async logAction(input: CreateActionLogInput): Promise<ActionLog> {
    const { data, error } = await this.supabase
      .from("google_ads_action_logs")
      .insert({
        user_id: input.user_id,
        connection_id: input.connection_id,
        source: input.source,
        automation_rule_id: input.automation_rule_id,
        google_campaign_id: input.google_campaign_id,
        google_campaign_name: input.google_campaign_name,
        action_type: input.action_type,
        action_details: input.action_details,
        status: input.status,
        error_message: input.error_message,
        metrics_snapshot: input.metrics_snapshot,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to log action: ${error.message}`);
      throw new Error("Failed to log action");
    }

    return data as ActionLog;
  }

  /**
   * Get action history with pagination and filters
   * T068: Get action history method
   */
  async getActionHistory(
    userId: string,
    filters: ActionLogFilters,
    page: number = 1,
    limit: number = 20,
  ): Promise<ActionLogsResponse> {
    let query = this.supabase
      .from("google_ads_action_logs")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("executed_at", { ascending: false });

    // Apply filters
    if (filters.connection_id) {
      query = query.eq("connection_id", filters.connection_id);
    }
    if (filters.source && filters.source !== "all") {
      query = query.eq("source", filters.source);
    }
    if (filters.google_campaign_id) {
      query = query.eq("google_campaign_id", filters.google_campaign_id);
    }
    if (filters.action_type) {
      query = query.eq("action_type", filters.action_type);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.start_date) {
      query = query.gte("executed_at", filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte("executed_at", filters.end_date);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      this.logger.error(`Failed to get action history: ${error.message}`);
      throw new Error("Failed to get action history");
    }

    return {
      actions: data as ActionLog[],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }

  /**
   * Get action statistics
   * T069: Get action stats method
   */
  async getActionStats(
    userId: string,
    connectionId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ActionStats> {
    let query = this.supabase
      .from("google_ads_action_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("connection_id", connectionId);

    if (startDate) {
      query = query.gte("executed_at", startDate);
    }
    if (endDate) {
      query = query.lte("executed_at", endDate);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to get action stats: ${error.message}`);
      throw new Error("Failed to get action stats");
    }

    const actions = data as ActionLog[];

    // Calculate stats
    const totalActions = actions.length;
    const manualActions = actions.filter((a) => a.source === "manual").length;
    const automatedActions = actions.filter(
      (a) => a.source === "automation",
    ).length;
    const successfulActions = actions.filter(
      (a) => a.status === "success",
    ).length;
    const successRate = totalActions > 0 ? successfulActions / totalActions : 0;

    // Count by action type
    const byActionType: Record<ActionLogType, number> = {
      pause: 0,
      enable: 0,
      update_budget: 0,
      update_bid: 0,
      duplicate: 0,
      increase_bid: 0,
      decrease_bid: 0,
      increase_target_cpa: 0,
      decrease_target_cpa: 0,
      increase_target_roas: 0,
      decrease_target_roas: 0,
    };
    actions.forEach((a) => {
      if (byActionType[a.action_type] !== undefined) {
        byActionType[a.action_type]++;
      }
    });

    // Count by status
    const byStatus: Record<ActionLogStatus, number> = {
      success: 0,
      failed: 0,
      skipped: 0,
    };
    actions.forEach((a) => {
      if (byStatus[a.status] !== undefined) {
        byStatus[a.status]++;
      }
    });

    // Group by automation rule
    const automationMap = new Map<
      string,
      { executions: number; successes: number }
    >();
    actions
      .filter((a) => a.source === "automation" && a.automation_rule_id)
      .forEach((a) => {
        const ruleId = a.automation_rule_id!;
        const existing = automationMap.get(ruleId) || {
          executions: 0,
          successes: 0,
        };
        existing.executions++;
        if (a.status === "success") {
          existing.successes++;
        }
        automationMap.set(ruleId, existing);
      });

    const automationBreakdown = Array.from(automationMap.entries()).map(
      ([ruleId, stats]) => ({
        ruleId,
        ruleName: ruleId, // Would need to join with rules table for actual name
        executions: stats.executions,
        successRate:
          stats.executions > 0 ? stats.successes / stats.executions : 0,
      }),
    );

    return {
      totalActions,
      manualActions,
      automatedActions,
      successRate,
      byActionType,
      byStatus,
      automationBreakdown,
    };
  }

  /**
   * Get detailed campaign information
   * Includes budget, bidding strategy, network settings, metrics, and counts
   */
  async getCampaignDetails(
    userId: string,
    connectionId: string,
    campaignId: string,
    customerId?: string,
    loginCustomerId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const connection = await this.getConnection(connectionId, userId);

    // If customerId not provided, try to get it from the campaign
    let effectiveCustomerId = customerId;
    let effectiveLoginCustomerId = loginCustomerId;

    if (!effectiveCustomerId) {
      const customerAccount = await this.getCustomerForCampaign(
        campaignId,
        connectionId,
        userId,
      );
      effectiveCustomerId = customerAccount?.customerId;
      effectiveLoginCustomerId =
        effectiveLoginCustomerId || customerAccount?.loginCustomerId;
    }

    return this.googleAdsApiService.getCampaignDetails(
      connection,
      campaignId,
      effectiveCustomerId,
      effectiveLoginCustomerId,
      startDate,
      endDate,
    );
  }

  /**
   * Get campaign hierarchy (ad groups with ads) for expandable row functionality
   */
  async getCampaignHierarchy(
    userId: string,
    connectionId: string,
    campaignId: string,
    customerId?: string,
    loginCustomerId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const connection = await this.getConnection(connectionId, userId);

    // Resolve customerId and loginCustomerId
    let effectiveCustomerId = customerId;
    let effectiveLoginCustomerId = loginCustomerId;

    // If customerId not provided OR loginCustomerId not provided, look up from campaign
    if (!effectiveCustomerId || !effectiveLoginCustomerId) {
      const customerAccount = await this.getCustomerForCampaign(
        campaignId,
        connectionId,
        userId,
      );
      effectiveCustomerId = effectiveCustomerId || customerAccount?.customerId;
      effectiveLoginCustomerId =
        effectiveLoginCustomerId || customerAccount?.loginCustomerId;
    }

    return this.googleAdsApiService.getCampaignHierarchy(
      connection,
      campaignId,
      effectiveCustomerId,
      effectiveLoginCustomerId,
      startDate,
      endDate,
    );
  }

  /**
   * Get ads for a specific ad group (on-demand loading for expand functionality)
   */
  async getAdGroupAds(
    userId: string,
    connectionId: string,
    adGroupId: string,
    customerId?: string,
    loginCustomerId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const connection = await this.getConnection(connectionId, userId);

    // Resolve customerId and loginCustomerId
    let effectiveCustomerId = customerId;
    let effectiveLoginCustomerId = loginCustomerId;

    // If customerId not provided OR loginCustomerId not provided, look up from accounts
    if (!effectiveCustomerId || !effectiveLoginCustomerId) {
      const query = this.supabase
        .from("google_ads_accounts")
        .select("customer_id, login_customer_id")
        .eq("connection_id", connectionId)
        .eq("is_active", true);

      // If we have customerId, filter by it to get the matching loginCustomerId
      if (effectiveCustomerId) {
        query.eq("customer_id", effectiveCustomerId);
      }

      const accounts = await query.limit(1);

      if (accounts.data && accounts.data.length > 0) {
        effectiveCustomerId =
          effectiveCustomerId || accounts.data[0].customer_id;
        effectiveLoginCustomerId =
          effectiveLoginCustomerId || accounts.data[0].login_customer_id;
      }
    }

    return this.googleAdsApiService.getAdGroupAds(
      connection,
      adGroupId,
      effectiveCustomerId,
      effectiveLoginCustomerId,
      startDate,
      endDate,
    );
  }

  /**
   * Invalidate campaign cache for a connection
   */
  private async invalidateCampaignCache(connectionId: string): Promise<void> {
    // Clear cached entries for this connection for all period types
    const periods = ["today", "yesterday", "last_7d", "last_30d", "custom"];
    const deletedKeys: string[] = [];

    for (const period of periods) {
      const cacheKey = `dashboard:campaigns:${connectionId}:${period}::`;
      try {
        await this.cacheManager.del(cacheKey);
        deletedKeys.push(cacheKey);
      } catch {
        // Key might not exist, ignore
      }
    }

    this.logger.log(
      `Cache invalidated for connection ${connectionId}: ${deletedKeys.length} keys cleared`,
    );
  }

  /**
   * Pause an ad group
   */
  async pauseAdGroup(
    userId: string,
    connectionId: string,
    adGroupId: string,
  ): Promise<{
    success: boolean;
    previousStatus?: string;
    error?: string;
  }> {
    const connection = await this.getConnection(connectionId, userId);

    const result = await this.googleAdsApiService.pauseAdGroup(
      connection,
      adGroupId,
    );

    if (result.success) {
      // Invalidate cache
      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousStatus: result.previousStatus,
      };
    }

    return { success: false, error: result.error };
  }

  /**
   * Enable an ad group
   */
  async enableAdGroup(
    userId: string,
    connectionId: string,
    adGroupId: string,
  ): Promise<{
    success: boolean;
    previousStatus?: string;
    error?: string;
  }> {
    const connection = await this.getConnection(connectionId, userId);

    const result = await this.googleAdsApiService.enableAdGroup(
      connection,
      adGroupId,
    );

    if (result.success) {
      // Invalidate cache
      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousStatus: result.previousStatus,
      };
    }

    return { success: false, error: result.error };
  }

  /**
   * Pause an ad
   */
  async pauseAd(
    userId: string,
    connectionId: string,
    adId: string,
  ): Promise<{
    success: boolean;
    previousStatus?: string;
    error?: string;
  }> {
    const connection = await this.getConnection(connectionId, userId);

    const result = await this.googleAdsApiService.pauseAd(connection, adId);

    if (result.success) {
      // Invalidate cache
      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousStatus: result.previousStatus,
      };
    }

    return { success: false, error: result.error };
  }

  /**
   * Enable an ad
   */
  async enableAd(
    userId: string,
    connectionId: string,
    adId: string,
  ): Promise<{
    success: boolean;
    previousStatus?: string;
    error?: string;
  }> {
    const connection = await this.getConnection(connectionId, userId);

    const result = await this.googleAdsApiService.enableAd(connection, adId);

    if (result.success) {
      // Invalidate cache
      await this.invalidateCampaignCache(connectionId);

      return {
        success: true,
        previousStatus: result.previousStatus,
      };
    }

    return { success: false, error: result.error };
  }
}
