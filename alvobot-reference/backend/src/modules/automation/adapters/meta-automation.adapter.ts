import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PlatformAutomationAdapter,
  PlatformEntity,
  ActionResult,
  ConnectionHealth,
  ActionConfig,
} from './platform-adapter.interface';
import {
  EntityLevel,
  AttributionConfig,
  FilterGroup,
  type BudgetChangeParams,
  type SetBudgetParams,
  type NameActionParams,
} from '../dto';
import { MetaDashboardService } from '../../meta/services/meta-dashboard.service';
import { ConnectionsService } from '../../connections/connections.service';
import { CircuitBreakerService } from '../../connections/circuit-breaker.service';

// ============================================================================
// Constants
// ============================================================================

const META_GRAPH_API_VERSION = 'v21.0';
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;

/** Conversion action types to count as conversions */
const CONVERSION_ACTION_TYPES = [
  'purchase',
  'lead',
  'complete_registration',
  'offsite_conversion.fb_pixel_purchase',
  'offsite_conversion.fb_pixel_lead',
  'offsite_conversion.fb_pixel_complete_registration',
  'omni_purchase',
  'onsite_conversion.messaging_first_reply',
];

// ============================================================================
// Helper interfaces for Meta API responses
// ============================================================================

interface MetaApiCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  budget_remaining?: string;
  created_time?: string;
  start_time?: string;
  stop_time?: string;
}

interface MetaApiAdSet {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  bid_amount?: string;
  optimization_goal?: string;
  created_time?: string;
  targeting?: Record<string, unknown>;
}

interface MetaApiAd {
  id: string;
  name: string;
  status: string;
  adset_id?: string;
  campaign_id?: string;
  created_time?: string;
}

interface MetaApiInsight {
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  campaign_name?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  spend?: string;
  reach?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

interface MetaApiPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
}

interface MetaApiResponse<T> {
  data?: T[];
  paging?: MetaApiPaging;
  error?: { message: string; type: string; code: number };
}

interface DateRange {
  startDate: string;
  endDate: string;
}

// ============================================================================
// Adapter
// ============================================================================

/**
 * Meta Ads platform adapter for the unified automation engine.
 * Translates generic automation operations into Meta Marketing API calls.
 *
 * Fetches entities directly from the Meta Graph API using the connection's
 * access_token (no userId needed — runs as cron with service_role).
 */
@Injectable()
export class MetaAutomationAdapter implements PlatformAutomationAdapter {
  private readonly logger = new Logger(MetaAutomationAdapter.name);
  private readonly supabase: SupabaseClient;
  readonly platform = 'meta' as const;

  constructor(
    @Inject(forwardRef(() => MetaDashboardService))
    private readonly metaDashboardService: MetaDashboardService,
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
    @Inject(forwardRef(() => CircuitBreakerService))
    private readonly circuitBreakerService: CircuitBreakerService,
    @Inject(forwardRef(() => ConfigService))
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_KEY')!,
    );
  }

  // ==========================================================================
  // PlatformAutomationAdapter — fetchEntities
  // ==========================================================================

  async fetchEntities(
    connectionId: string,
    adAccountIds: string[],
    level: EntityLevel,
    _filters: FilterGroup[],
    periods: string[],
    _attribution?: AttributionConfig,
    _googleCampaignType?: string,
  ): Promise<PlatformEntity[]> {
    // 1. Get connection & access token
    const connection =
      await this.connectionsService.getConnectionById(connectionId);
    if (!connection || !connection.access_token || !connection.is_active) {
      this.logger.warn(
        `Connection ${connectionId} is invalid or missing access token`,
      );
      return [];
    }

    // 2. Resolve ad account IDs: use provided list or auto-fetch from DB
    let resolvedAccountIds = adAccountIds;
    if (!resolvedAccountIds || resolvedAccountIds.length === 0) {
      resolvedAccountIds =
        await this.getActiveAdAccountIds(connectionId);
      this.logger.log(
        `No ad_account_ids provided, auto-resolved ${resolvedAccountIds.length} active account(s) from connection ${connectionId}`,
      );
    }

    this.logger.log(
      `Fetching Meta entities: level=${level}, accounts=${resolvedAccountIds.length}, periods=${periods.join(',')}`,
    );

    if (resolvedAccountIds.length === 0) {
      this.logger.warn(
        `Connection ${connectionId} has no active ad accounts`,
      );
      return [];
    }

    const accessToken = connection.access_token;
    const primaryPeriod = periods[0] || 'last_7d';
    const dateRange = this.periodToDateRange(primaryPeriod);

    const allEntities: PlatformEntity[] = [];

    for (const adAccountId of resolvedAccountIds) {
      try {
        let entities: PlatformEntity[];

        switch (level) {
          case 'campaign':
            entities = await this.fetchCampaigns(
              connectionId,
              adAccountId,
              accessToken,
              dateRange,
              primaryPeriod,
            );
            break;
          case 'adset':
            entities = await this.fetchAdSets(
              connectionId,
              adAccountId,
              accessToken,
              dateRange,
              primaryPeriod,
            );
            break;
          case 'ad':
            entities = await this.fetchAds(
              connectionId,
              adAccountId,
              accessToken,
              dateRange,
              primaryPeriod,
            );
            break;
          default:
            this.logger.warn(`Unsupported entity level for Meta: ${level}`);
            entities = [];
        }

        allEntities.push(...entities);
      } catch (error) {
        this.logger.error(
          `Error fetching ${level} entities for account ${adAccountId}: ${(error as Error).message}`,
        );
        this.circuitBreakerService.recordFailure(
          connectionId,
          error as Error,
        );
      }
    }

    this.logger.log(
      `Fetched ${allEntities.length} total Meta ${level} entities`,
    );
    return allEntities;
  }

  // ==========================================================================
  // PlatformAutomationAdapter — executeAction
  // ==========================================================================

  async executeAction(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult> {
    this.logger.log(
      `Executing action ${action.action} on Meta ${entity.level} ${entity.id}`,
    );

    try {
      switch (action.action) {
        case 'pause':
          return await this.executePause(connectionId, entity, userId);

        case 'start':
          return await this.executeStart(connectionId, entity, userId);

        case 'increase_budget':
          return await this.executeIncreaseBudget(
            connectionId,
            entity,
            action.params as unknown as BudgetChangeParams,
            userId,
          );

        case 'decrease_budget':
          return await this.executeDecreaseBudget(
            connectionId,
            entity,
            action.params as unknown as BudgetChangeParams,
            userId,
          );

        case 'set_budget':
          return await this.executeSetBudget(
            connectionId,
            entity,
            action.params as unknown as SetBudgetParams,
            userId,
          );

        case 'add_to_name':
          return await this.executeAddToName(
            connectionId,
            entity,
            action.params as unknown as NameActionParams,
          );

        case 'remove_from_name':
          return await this.executeRemoveFromName(
            connectionId,
            entity,
            action.params as unknown as NameActionParams,
          );

        case 'replace_in_name':
          return await this.executeReplaceInName(
            connectionId,
            entity,
            action.params as unknown as NameActionParams,
          );

        case 'duplicate':
          return {
            success: false,
            action: action.action,
            error: 'Duplicate action is not yet implemented for Meta',
          };

        case 'increase_bid':
        case 'decrease_bid':
        case 'set_bid':
        case 'set_bid_strategy':
          return {
            success: false,
            action: action.action,
            error: `Bid action "${action.action}" is not fully supported for Meta campaigns`,
          };

        case 'scale_budget_by_target':
          return {
            success: false,
            action: action.action,
            error:
              'Scale budget by target is not yet implemented for Meta',
          };

        case 'extend_end_date':
          return {
            success: false,
            action: action.action,
            error: 'Extend end date is not yet implemented for Meta',
          };

        case 'notify':
          // Notify is handled at the engine level, not the adapter level
          return {
            success: true,
            action: action.action,
          };

        default:
          return {
            success: false,
            action: action.action,
            error: `Unknown action type: ${action.action}`,
          };
      }
    } catch (error) {
      this.logger.error(
        `Error executing action ${action.action} on ${entity.id}: ${(error as Error).message}`,
      );
      return {
        success: false,
        action: action.action,
        error: (error as Error).message,
      };
    }
  }

  // ==========================================================================
  // PlatformAutomationAdapter — checkConnection
  // ==========================================================================

  async checkConnection(connectionId: string): Promise<ConnectionHealth> {
    try {
      const connection =
        await this.connectionsService.getConnectionById(connectionId);

      if (!connection) {
        return {
          isHealthy: false,
          connectionId,
          lastError: 'Connection not found',
        };
      }

      if (!connection.is_active) {
        return {
          isHealthy: false,
          connectionId,
          lastError: 'Connection is inactive',
        };
      }

      if (connection.needs_reconnect) {
        return {
          isHealthy: false,
          connectionId,
          lastError:
            connection.last_refresh_error ||
            'Connection needs reconnection',
        };
      }

      if (!connection.access_token) {
        return {
          isHealthy: false,
          connectionId,
          lastError: 'No access token available',
        };
      }

      if (!this.circuitBreakerService.canRequest(connectionId)) {
        return {
          isHealthy: false,
          connectionId,
          lastError: 'Circuit breaker is open — too many recent failures',
        };
      }

      return {
        isHealthy: true,
        connectionId,
      };
    } catch (error) {
      return {
        isHealthy: false,
        connectionId,
        lastError: `Health check failed: ${(error as Error).message}`,
      };
    }
  }

  // ==========================================================================
  // PlatformAutomationAdapter — getMetricValue
  // ==========================================================================

  getMetricValue(
    entity: PlatformEntity,
    metric: string,
    period: string,
  ): number {
    // Try period-qualified key first, then bare metric name, then 0
    return (
      entity.metrics[`${metric}_${period}`] ??
      entity.metrics[metric] ??
      0
    );
  }

  // ==========================================================================
  // Private — Entity Fetching
  // ==========================================================================

  private async fetchCampaigns(
    connectionId: string,
    adAccountId: string,
    accessToken: string,
    dateRange: DateRange,
    period: string,
  ): Promise<PlatformEntity[]> {
    // Ensure adAccountId has the "act_" prefix
    const accountPath = adAccountId.startsWith('act_')
      ? adAccountId
      : `act_${adAccountId}`;

    // Fetch campaigns
    const campaignFields = [
      'id',
      'name',
      'status',
      'objective',
      'daily_budget',
      'lifetime_budget',
      'bid_strategy',
      'budget_remaining',
      'created_time',
      'start_time',
      'stop_time',
    ].join(',');

    const filtering = encodeURIComponent(
      JSON.stringify([
        {
          field: 'effective_status',
          operator: 'IN',
          value: ['ACTIVE', 'PAUSED'],
        },
      ]),
    );

    const campaignsUrl = `${META_GRAPH_API_BASE}/${accountPath}/campaigns?fields=${campaignFields}&filtering=${filtering}&access_token=${accessToken}&limit=500`;
    const campaigns = await this.fetchAllPages<MetaApiCampaign>(campaignsUrl);

    // Fetch insights at campaign level
    const insightsFields = [
      'campaign_id',
      'campaign_name',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'spend',
      'actions',
      'cost_per_action_type',
      'action_values',
      'reach',
      'frequency',
    ].join(',');

    const timeRange = encodeURIComponent(
      JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      }),
    );

    const insightsUrl = `${META_GRAPH_API_BASE}/${accountPath}/insights?fields=${insightsFields}&level=campaign&time_range=${timeRange}&access_token=${accessToken}&limit=500`;
    const insights = await this.fetchAllPages<MetaApiInsight>(insightsUrl);

    // Build insights map by campaign_id
    const insightsMap = new Map<string, MetaApiInsight>();
    for (const insight of insights) {
      if (insight.campaign_id) {
        insightsMap.set(insight.campaign_id, insight);
      }
    }

    // Record success after successful API calls
    this.circuitBreakerService.recordSuccess(connectionId);

    // Normalize to PlatformEntity[]
    return campaigns.map((campaign) => {
      const insight = insightsMap.get(campaign.id);
      const metrics = this.buildMetrics(insight, period);

      const dailyBudget = campaign.daily_budget
        ? parseFloat(campaign.daily_budget) / 100
        : undefined;
      const lifetimeBudget = campaign.lifetime_budget
        ? parseFloat(campaign.lifetime_budget) / 100
        : undefined;

      return {
        id: campaign.id,
        name: campaign.name,
        platform: 'meta' as const,
        level: 'campaign' as EntityLevel,
        status: campaign.status,
        metrics,
        budget: dailyBudget ?? lifetimeBudget,
        budgetType: dailyBudget != null ? 'daily' : 'lifetime',
        bidStrategy: campaign.bid_strategy,
        createdTime: campaign.created_time,
        connectionId,
        adAccountId,
        rawData: { campaign, insight },
      };
    });
  }

  private async fetchAdSets(
    connectionId: string,
    adAccountId: string,
    accessToken: string,
    dateRange: DateRange,
    period: string,
  ): Promise<PlatformEntity[]> {
    const accountPath = adAccountId.startsWith('act_')
      ? adAccountId
      : `act_${adAccountId}`;

    // Fetch ad sets
    const adSetFields = [
      'id',
      'name',
      'status',
      'campaign_id',
      'daily_budget',
      'lifetime_budget',
      'bid_strategy',
      'bid_amount',
      'optimization_goal',
      'created_time',
      'targeting',
    ].join(',');

    const filtering = encodeURIComponent(
      JSON.stringify([
        {
          field: 'effective_status',
          operator: 'IN',
          value: ['ACTIVE', 'PAUSED'],
        },
      ]),
    );

    const adSetsUrl = `${META_GRAPH_API_BASE}/${accountPath}/adsets?fields=${adSetFields}&filtering=${filtering}&access_token=${accessToken}&limit=500`;
    const adSets = await this.fetchAllPages<MetaApiAdSet>(adSetsUrl);

    // Fetch insights at adset level
    const insightsFields = [
      'adset_id',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'spend',
      'actions',
      'cost_per_action_type',
      'action_values',
      'reach',
      'frequency',
    ].join(',');

    const timeRange = encodeURIComponent(
      JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      }),
    );

    const insightsUrl = `${META_GRAPH_API_BASE}/${accountPath}/insights?fields=${insightsFields}&level=adset&time_range=${timeRange}&access_token=${accessToken}&limit=500`;
    const insights = await this.fetchAllPages<MetaApiInsight>(insightsUrl);

    const insightsMap = new Map<string, MetaApiInsight>();
    for (const insight of insights) {
      if (insight.adset_id) {
        insightsMap.set(insight.adset_id, insight);
      }
    }

    this.circuitBreakerService.recordSuccess(connectionId);

    // Also fetch parent campaigns for parentData
    const campaignIds = [...new Set(adSets.map((a) => a.campaign_id))];
    const campaignsMap = new Map<string, Record<string, unknown>>();
    for (const campaignId of campaignIds) {
      try {
        const url = `${META_GRAPH_API_BASE}/${campaignId}?fields=id,name,status,objective,daily_budget,lifetime_budget&access_token=${accessToken}`;
        const response = await this.fetchWithRetry(url);
        const data = (await response.json()) as Record<string, unknown>;
        if (!data.error) {
          campaignsMap.set(campaignId, data);
        }
      } catch {
        // Non-critical — skip
      }
    }

    return adSets.map((adSet) => {
      const insight = insightsMap.get(adSet.id);
      const metrics = this.buildMetrics(insight, period);

      const dailyBudget = adSet.daily_budget
        ? parseFloat(adSet.daily_budget) / 100
        : undefined;
      const lifetimeBudget = adSet.lifetime_budget
        ? parseFloat(adSet.lifetime_budget) / 100
        : undefined;

      return {
        id: adSet.id,
        name: adSet.name,
        platform: 'meta' as const,
        level: 'adset' as EntityLevel,
        status: adSet.status,
        metrics,
        budget: dailyBudget ?? lifetimeBudget,
        budgetType: dailyBudget != null ? 'daily' : 'lifetime',
        bid: adSet.bid_amount
          ? parseFloat(adSet.bid_amount) / 100
          : undefined,
        bidStrategy: adSet.bid_strategy,
        createdTime: adSet.created_time,
        connectionId,
        adAccountId,
        parentData: {
          campaign: campaignsMap.get(adSet.campaign_id),
        },
        rawData: { adSet, insight },
      };
    });
  }

  private async fetchAds(
    connectionId: string,
    adAccountId: string,
    accessToken: string,
    dateRange: DateRange,
    period: string,
  ): Promise<PlatformEntity[]> {
    const accountPath = adAccountId.startsWith('act_')
      ? adAccountId
      : `act_${adAccountId}`;

    // Fetch ads
    const adFields = [
      'id',
      'name',
      'status',
      'adset_id',
      'campaign_id',
      'created_time',
    ].join(',');

    const filtering = encodeURIComponent(
      JSON.stringify([
        {
          field: 'effective_status',
          operator: 'IN',
          value: ['ACTIVE', 'PAUSED'],
        },
      ]),
    );

    const adsUrl = `${META_GRAPH_API_BASE}/${accountPath}/ads?fields=${adFields}&filtering=${filtering}&access_token=${accessToken}&limit=500`;
    const ads = await this.fetchAllPages<MetaApiAd>(adsUrl);

    // Fetch insights at ad level
    const insightsFields = [
      'ad_id',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'spend',
      'actions',
      'cost_per_action_type',
      'action_values',
      'reach',
      'frequency',
    ].join(',');

    const timeRange = encodeURIComponent(
      JSON.stringify({
        since: dateRange.startDate,
        until: dateRange.endDate,
      }),
    );

    const insightsUrl = `${META_GRAPH_API_BASE}/${accountPath}/insights?fields=${insightsFields}&level=ad&time_range=${timeRange}&access_token=${accessToken}&limit=500`;
    const insights = await this.fetchAllPages<MetaApiInsight>(insightsUrl);

    const insightsMap = new Map<string, MetaApiInsight>();
    for (const insight of insights) {
      if (insight.ad_id) {
        insightsMap.set(insight.ad_id, insight);
      }
    }

    this.circuitBreakerService.recordSuccess(connectionId);

    return ads.map((ad) => {
      const insight = insightsMap.get(ad.id);
      const metrics = this.buildMetrics(insight, period);

      return {
        id: ad.id,
        name: ad.name,
        platform: 'meta' as const,
        level: 'ad' as EntityLevel,
        status: ad.status,
        metrics,
        connectionId,
        adAccountId,
        createdTime: ad.created_time,
        rawData: { ad, insight },
      };
    });
  }

  // ==========================================================================
  // Private — Action Execution
  // ==========================================================================

  private async executePause(
    connectionId: string,
    entity: PlatformEntity,
    userId: string,
  ): Promise<ActionResult> {
    const previousStatus = entity.status;

    switch (entity.level) {
      case 'campaign': {
        const result = await this.metaDashboardService.pauseCampaign(
          userId,
          connectionId,
          entity.id,
          entity.adAccountId,
          entity.name,
        );
        return {
          success: result.success,
          action: 'pause',
          previousValue: previousStatus,
          newValue: 'PAUSED',
          error: result.error,
        };
      }
      case 'adset': {
        const result = await this.metaDashboardService.pauseAdSet(
          userId,
          connectionId,
          entity.id,
          entity.adAccountId,
        );
        return {
          success: result.success,
          action: 'pause',
          previousValue: previousStatus,
          newValue: 'PAUSED',
          error: result.error,
        };
      }
      case 'ad': {
        const result = await this.metaDashboardService.pauseAd(
          userId,
          connectionId,
          entity.id,
          entity.adAccountId,
        );
        return {
          success: result.success,
          action: 'pause',
          previousValue: previousStatus,
          newValue: 'PAUSED',
          error: result.error,
        };
      }
      default:
        return {
          success: false,
          action: 'pause',
          error: `Pause not supported for entity level: ${entity.level}`,
        };
    }
  }

  private async executeStart(
    connectionId: string,
    entity: PlatformEntity,
    userId: string,
  ): Promise<ActionResult> {
    const previousStatus = entity.status;

    switch (entity.level) {
      case 'campaign': {
        const result = await this.metaDashboardService.enableCampaign(
          userId,
          connectionId,
          entity.id,
          entity.adAccountId,
          entity.name,
        );
        return {
          success: result.success,
          action: 'start',
          previousValue: previousStatus,
          newValue: 'ACTIVE',
          error: result.error,
        };
      }
      case 'adset': {
        const result = await this.metaDashboardService.enableAdSet(
          userId,
          connectionId,
          entity.id,
          entity.adAccountId,
        );
        return {
          success: result.success,
          action: 'start',
          previousValue: previousStatus,
          newValue: 'ACTIVE',
          error: result.error,
        };
      }
      case 'ad': {
        const result = await this.metaDashboardService.enableAd(
          userId,
          connectionId,
          entity.id,
          entity.adAccountId,
        );
        return {
          success: result.success,
          action: 'start',
          previousValue: previousStatus,
          newValue: 'ACTIVE',
          error: result.error,
        };
      }
      default:
        return {
          success: false,
          action: 'start',
          error: `Start not supported for entity level: ${entity.level}`,
        };
    }
  }

  private async executeIncreaseBudget(
    connectionId: string,
    entity: PlatformEntity,
    params: BudgetChangeParams,
    userId: string,
  ): Promise<ActionResult> {
    const currentBudget = entity.budget;
    if (currentBudget == null || currentBudget <= 0) {
      return {
        success: false,
        action: 'increase_budget',
        error: 'Entity has no budget set (may be ABO or budget at a different level)',
      };
    }

    let newBudget: number;
    if (params.changeType === 'percentage') {
      newBudget = currentBudget * (1 + params.changeValue / 100);
    } else {
      newBudget = currentBudget + params.changeValue;
    }

    // Apply guards
    if (params.minBudget != null) {
      newBudget = Math.max(newBudget, params.minBudget);
    }
    if (params.maxBudget != null) {
      newBudget = Math.min(newBudget, params.maxBudget);
    }

    newBudget = Math.round(newBudget * 100) / 100;

    const result = await this.metaDashboardService.updateBudget(
      userId,
      connectionId,
      entity.id,
      newBudget,
      entity.adAccountId,
    );

    return {
      success: result.success,
      action: 'increase_budget',
      previousValue: currentBudget,
      newValue: newBudget,
      error: result.error,
    };
  }

  private async executeDecreaseBudget(
    connectionId: string,
    entity: PlatformEntity,
    params: BudgetChangeParams,
    userId: string,
  ): Promise<ActionResult> {
    const currentBudget = entity.budget;
    if (currentBudget == null || currentBudget <= 0) {
      return {
        success: false,
        action: 'decrease_budget',
        error: 'Entity has no budget set (may be ABO or budget at a different level)',
      };
    }

    let newBudget: number;
    if (params.changeType === 'percentage') {
      newBudget = currentBudget * (1 - params.changeValue / 100);
    } else {
      newBudget = currentBudget - params.changeValue;
    }

    // Apply guards
    if (params.minBudget != null) {
      newBudget = Math.max(newBudget, params.minBudget);
    }
    if (params.maxBudget != null) {
      newBudget = Math.min(newBudget, params.maxBudget);
    }

    // Never go below 0
    newBudget = Math.max(0, Math.round(newBudget * 100) / 100);

    const result = await this.metaDashboardService.updateBudget(
      userId,
      connectionId,
      entity.id,
      newBudget,
      entity.adAccountId,
    );

    return {
      success: result.success,
      action: 'decrease_budget',
      previousValue: currentBudget,
      newValue: newBudget,
      error: result.error,
    };
  }

  private async executeSetBudget(
    connectionId: string,
    entity: PlatformEntity,
    params: SetBudgetParams,
    userId: string,
  ): Promise<ActionResult> {
    const currentBudget = entity.budget;
    const newBudget = Math.round(params.budgetValue * 100) / 100;

    const result = await this.metaDashboardService.updateBudget(
      userId,
      connectionId,
      entity.id,
      newBudget,
      entity.adAccountId,
    );

    return {
      success: result.success,
      action: 'set_budget',
      previousValue: currentBudget,
      newValue: newBudget,
      error: result.error,
    };
  }

  private async executeAddToName(
    connectionId: string,
    entity: PlatformEntity,
    params: NameActionParams,
  ): Promise<ActionResult> {
    const connection =
      await this.connectionsService.getConnectionById(connectionId);
    if (!connection?.access_token) {
      return {
        success: false,
        action: 'add_to_name',
        error: 'No access token available',
      };
    }

    const oldName = entity.name;
    const newName =
      params.position === 'prefix'
        ? `${params.text}${oldName}`
        : `${oldName}${params.text}`;

    return this.updateEntityName(
      entity.id,
      newName,
      oldName,
      connection.access_token,
      'add_to_name',
    );
  }

  private async executeRemoveFromName(
    connectionId: string,
    entity: PlatformEntity,
    params: NameActionParams,
  ): Promise<ActionResult> {
    const connection =
      await this.connectionsService.getConnectionById(connectionId);
    if (!connection?.access_token) {
      return {
        success: false,
        action: 'remove_from_name',
        error: 'No access token available',
      };
    }

    const oldName = entity.name;
    const newName = oldName.replace(params.text, '');

    return this.updateEntityName(
      entity.id,
      newName,
      oldName,
      connection.access_token,
      'remove_from_name',
    );
  }

  private async executeReplaceInName(
    connectionId: string,
    entity: PlatformEntity,
    params: NameActionParams,
  ): Promise<ActionResult> {
    const connection =
      await this.connectionsService.getConnectionById(connectionId);
    if (!connection?.access_token) {
      return {
        success: false,
        action: 'replace_in_name',
        error: 'No access token available',
      };
    }

    const oldName = entity.name;
    const find = params.find || params.text;
    const replaceWith = params.replace || '';
    const newName = oldName.replace(find, replaceWith);

    return this.updateEntityName(
      entity.id,
      newName,
      oldName,
      connection.access_token,
      'replace_in_name',
    );
  }

  private async updateEntityName(
    entityId: string,
    newName: string,
    oldName: string,
    accessToken: string,
    actionType: 'add_to_name' | 'remove_from_name' | 'replace_in_name',
  ): Promise<ActionResult> {
    try {
      const url = `${META_GRAPH_API_BASE}/${entityId}`;
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          access_token: accessToken,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: { message: string };
      };

      if (data.error) {
        return {
          success: false,
          action: actionType,
          previousValue: oldName,
          error: data.error.message,
        };
      }

      return {
        success: true,
        action: actionType,
        previousValue: oldName,
        newValue: newName,
      };
    } catch (error) {
      return {
        success: false,
        action: actionType,
        previousValue: oldName,
        error: (error as Error).message,
      };
    }
  }

  // ==========================================================================
  // Private — Metrics Building
  // ==========================================================================

  private buildMetrics(
    insight: MetaApiInsight | undefined,
    period: string,
  ): Record<string, number> {
    if (!insight) {
      return {};
    }

    const metrics: Record<string, number> = {};

    // Core metrics
    const spend = parseFloat(insight.spend || '0') || 0;
    const impressions = parseInt(insight.impressions || '0', 10) || 0;
    const clicks = parseInt(insight.clicks || '0', 10) || 0;
    const ctr = parseFloat(insight.ctr || '0') || 0;
    const cpc = parseFloat(insight.cpc || '0') || 0;
    const cpm = parseFloat(insight.cpm || '0') || 0;
    const reach = parseInt(insight.reach || '0', 10) || 0;
    const frequency = parseFloat(insight.frequency || '0') || 0;

    // Extract conversions from actions array
    const conversions = this.extractConversions(insight.actions);
    const conversionsValue = this.extractConversionsValue(
      insight.action_values,
    );
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = spend > 0 ? conversionsValue / spend : 0;

    // Store with bare key
    metrics.spend = spend;
    metrics.impressions = impressions;
    metrics.clicks = clicks;
    metrics.ctr = ctr;
    metrics.cpc = cpc;
    metrics.cpm = cpm;
    metrics.reach = reach;
    metrics.frequency = frequency;
    metrics.conversions = conversions;
    metrics.conversions_value = conversionsValue;
    metrics.cpa = cpa;
    metrics.roas = roas;

    // Store with period-qualified key
    metrics[`spend_${period}`] = spend;
    metrics[`impressions_${period}`] = impressions;
    metrics[`clicks_${period}`] = clicks;
    metrics[`ctr_${period}`] = ctr;
    metrics[`cpc_${period}`] = cpc;
    metrics[`cpm_${period}`] = cpm;
    metrics[`reach_${period}`] = reach;
    metrics[`frequency_${period}`] = frequency;
    metrics[`conversions_${period}`] = conversions;
    metrics[`conversions_value_${period}`] = conversionsValue;
    metrics[`cpa_${period}`] = cpa;
    metrics[`roas_${period}`] = roas;

    return metrics;
  }

  private extractConversions(
    actions: Array<{ action_type: string; value: string }> | undefined,
  ): number {
    if (!actions || !Array.isArray(actions)) return 0;

    let total = 0;
    for (const action of actions) {
      if (CONVERSION_ACTION_TYPES.includes(action.action_type)) {
        total += parseInt(action.value || '0', 10);
      }
    }
    return total;
  }

  private extractConversionsValue(
    actionValues:
      | Array<{ action_type: string; value: string }>
      | undefined,
  ): number {
    if (!actionValues || !Array.isArray(actionValues)) return 0;

    let total = 0;
    for (const action of actionValues) {
      if (CONVERSION_ACTION_TYPES.includes(action.action_type)) {
        total += parseFloat(action.value || '0');
      }
    }
    return total;
  }

  // ==========================================================================
  // Private — HTTP Helpers
  // ==========================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch with exponential backoff retry logic.
   * Handles Meta API rate limits (429) and transient server errors.
   */
  private async fetchWithRetry(
    url: string,
    options?: RequestInit,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS,
        );

        let response: Response;
        try {
          response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(
            response.headers.get('Retry-After') || '60',
            10,
          );
          this.logger.warn(
            `Meta API rate limited. Waiting ${retryAfter}s (attempt ${attempt}/${MAX_RETRIES})`,
          );
          await this.sleep(retryAfter * 1000);
          continue;
        }

        // Handle server errors with retry
        if (response.status >= 500) {
          const delay =
            BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) +
            Math.random() * 1000;
          this.logger.warn(
            `Meta API server error ${response.status}. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${MAX_RETRIES})`,
          );
          await this.sleep(delay);
          continue;
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < MAX_RETRIES) {
          const delay =
            BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) +
            Math.random() * 1000;
          this.logger.warn(
            `Fetch error: ${lastError.message}. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${MAX_RETRIES})`,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Fetch all pages from a Meta API endpoint using cursor-based pagination.
   */
  private async fetchAllPages<T>(initialUrl: string): Promise<T[]> {
    const allItems: T[] = [];
    let url: string | null = initialUrl;

    while (url) {
      const response = await this.fetchWithRetry(url);
      const data = (await response.json()) as MetaApiResponse<T>;

      if (data.error) {
        this.logger.error(`Meta API error: ${data.error.message}`);
        throw new Error(`Meta API error: ${data.error.message}`);
      }

      if (data.data && data.data.length > 0) {
        allItems.push(...data.data);
      }

      url = data.paging?.next || null;
    }

    return allItems;
  }

  // ==========================================================================
  // Private — Period → Date Range Conversion
  // ==========================================================================

  /**
   * Auto-resolve active ad account IDs from meta_ad_accounts table.
   * Used when the rule doesn't specify explicit ad_account_ids.
   */
  private async getActiveAdAccountIds(
    connectionId: string,
  ): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('connection_id', connectionId)
        .eq('is_active', true);

      if (error) {
        this.logger.warn(
          `Failed to fetch ad accounts for connection ${connectionId}: ${error.message}`,
        );
        return [];
      }

      return (data || []).map((row) => row.account_id);
    } catch (err) {
      this.logger.warn(
        `Exception fetching ad accounts for connection ${connectionId}: ${(err as Error).message}`,
      );
      return [];
    }
  }

  private periodToDateRange(period: string): DateRange {
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const fmt = (d: Date): string => d.toISOString().split('T')[0];

    const daysAgo = (n: number): Date => {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return d;
    };

    const yesterday = daysAgo(1);

    switch (period) {
      case 'today':
        return { startDate: fmt(today), endDate: fmt(today) };

      case 'yesterday':
        return { startDate: fmt(yesterday), endDate: fmt(yesterday) };

      case 'last_2d':
        return { startDate: fmt(daysAgo(2)), endDate: fmt(yesterday) };

      case 'last_3d':
        return { startDate: fmt(daysAgo(3)), endDate: fmt(yesterday) };

      case 'last_3d_with_today':
        return { startDate: fmt(daysAgo(3)), endDate: fmt(today) };

      case 'last_7d':
        return { startDate: fmt(daysAgo(7)), endDate: fmt(yesterday) };

      case 'last_7d_with_today':
        return { startDate: fmt(daysAgo(7)), endDate: fmt(today) };

      case 'last_14d':
        return { startDate: fmt(daysAgo(14)), endDate: fmt(yesterday) };

      case 'last_14d_with_today':
        return { startDate: fmt(daysAgo(14)), endDate: fmt(today) };

      case 'last_30d':
        return { startDate: fmt(daysAgo(30)), endDate: fmt(yesterday) };

      case 'last_30d_with_today':
        return { startDate: fmt(daysAgo(30)), endDate: fmt(today) };

      case 'this_week_mon': {
        const dayOfWeek = today.getDay(); // 0=Sun
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday offset
        return { startDate: fmt(daysAgo(diff)), endDate: fmt(today) };
      }

      case 'this_week_sun': {
        const dayOfWeek = today.getDay();
        return { startDate: fmt(daysAgo(dayOfWeek)), endDate: fmt(today) };
      }

      case 'last_week': {
        const dayOfWeek = today.getDay();
        const lastSunday = daysAgo(dayOfWeek);
        const lastMonday = new Date(lastSunday);
        lastMonday.setDate(lastMonday.getDate() - 6);
        return { startDate: fmt(lastMonday), endDate: fmt(lastSunday) };
      }

      case 'this_month': {
        const firstOfMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          1,
        );
        return { startDate: fmt(firstOfMonth), endDate: fmt(today) };
      }

      case 'last_month': {
        const firstOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        const lastDayOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          0,
        );
        return {
          startDate: fmt(firstOfLastMonth),
          endDate: fmt(lastDayOfLastMonth),
        };
      }

      case 'lifetime':
        return { startDate: '2020-01-01', endDate: fmt(today) };

      // Hourly periods — approximate with today's date
      case 'current_hour':
      case 'previous_hour':
      case 'last_2_hours':
      case 'last_3_hours':
      case 'last_6_hours':
      case 'last_12_hours':
      case 'last_24_hours':
        // Meta insights API minimum granularity is daily.
        // For hourly periods, use today's data as approximation.
        return { startDate: fmt(today), endDate: fmt(today) };

      default:
        this.logger.warn(
          `Unknown period "${period}", defaulting to last_7d`,
        );
        return { startDate: fmt(daysAgo(7)), endDate: fmt(yesterday) };
    }
  }
}
