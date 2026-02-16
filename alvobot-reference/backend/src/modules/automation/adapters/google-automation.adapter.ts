import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
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
  BudgetChangeParams,
  SetBudgetParams,
  BidChangeParams,
  SetBidParams,
  BidStrategyParams,
} from '../dto';
import { FilterGroup } from '../dto/filter.dto';
import { GoogleAdsApiService } from '../../google/services/google-ads-api.service';
import { GoogleDashboardService } from '../../google/services/google-dashboard.service';
import { ConnectionsService } from '../../connections/connections.service';
import { CircuitBreakerService } from '../../connections/circuit-breaker.service';
import {
  GoogleConnection,
  GoogleConnectionMetadata,
} from '../../google/entities/google-connection.entity';

// ============================================================================
// CHANNEL TYPE MAPPING
// ============================================================================

const CHANNEL_TYPE_MAP: Record<string, string> = {
  SEARCH: 'search',
  DISPLAY: 'display',
  SHOPPING: 'shopping',
  PERFORMANCE_MAX: 'performance_max',
  VIDEO: 'video',
  DEMAND_GEN: 'demand_gen',
  MULTI_CHANNEL: 'app',
};

// ============================================================================
// PERIOD HELPERS
// ============================================================================

interface DateRange {
  startDate: string;
  endDate: string;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysAgo(n: number): Date {
  const d = getToday();
  d.setDate(d.getDate() - n);
  return d;
}

function mondayOfCurrentWeek(): Date {
  const d = getToday();
  const day = d.getDay(); // 0=Sun, 1=Mon, …
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function sundayOfCurrentWeek(): Date {
  const d = getToday();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function periodToDateRange(period: string): DateRange {
  const t = getToday();
  const yesterday = daysAgo(1);

  switch (period) {
    case 'today':
      return { startDate: formatDate(t), endDate: formatDate(t) };
    case 'yesterday':
      return { startDate: formatDate(yesterday), endDate: formatDate(yesterday) };
    case 'last_2d':
      return { startDate: formatDate(daysAgo(2)), endDate: formatDate(yesterday) };
    case 'last_3d':
      return { startDate: formatDate(daysAgo(3)), endDate: formatDate(yesterday) };
    case 'last_3d_with_today':
      return { startDate: formatDate(daysAgo(3)), endDate: formatDate(t) };
    case 'last_7d':
      return { startDate: formatDate(daysAgo(7)), endDate: formatDate(yesterday) };
    case 'last_7d_with_today':
      return { startDate: formatDate(daysAgo(7)), endDate: formatDate(t) };
    case 'last_14d':
      return { startDate: formatDate(daysAgo(14)), endDate: formatDate(yesterday) };
    case 'last_30d':
      return { startDate: formatDate(daysAgo(30)), endDate: formatDate(yesterday) };
    case 'last_30d_with_today':
      return { startDate: formatDate(daysAgo(30)), endDate: formatDate(t) };
    case 'this_week_mon': {
      return { startDate: formatDate(mondayOfCurrentWeek()), endDate: formatDate(t) };
    }
    case 'this_week_sun': {
      return { startDate: formatDate(sundayOfCurrentWeek()), endDate: formatDate(t) };
    }
    case 'last_week': {
      const thisMon = mondayOfCurrentWeek();
      const lastMon = new Date(thisMon);
      lastMon.setDate(lastMon.getDate() - 7);
      const lastSun = new Date(thisMon);
      lastSun.setDate(lastSun.getDate() - 1);
      return { startDate: formatDate(lastMon), endDate: formatDate(lastSun) };
    }
    case 'this_month': {
      const firstDay = new Date(t.getFullYear(), t.getMonth(), 1);
      return { startDate: formatDate(firstDay), endDate: formatDate(t) };
    }
    case 'last_month': {
      const firstDayLast = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      const lastDayLast = new Date(t.getFullYear(), t.getMonth(), 0);
      return { startDate: formatDate(firstDayLast), endDate: formatDate(lastDayLast) };
    }
    case 'lifetime':
      return { startDate: '2020-01-01', endDate: formatDate(t) };
    default:
      return { startDate: formatDate(daysAgo(7)), endDate: formatDate(yesterday) };
  }
}

type GoogleApiPeriod = 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'custom';

function mapToGoogleApiPeriod(period: string): {
  apiPeriod: GoogleApiPeriod;
  startDate?: string;
  endDate?: string;
} {
  switch (period) {
    case 'today':
      return { apiPeriod: 'today' };
    case 'yesterday':
      return { apiPeriod: 'yesterday' };
    case 'last_7d':
    case 'last_7d_with_today':
      return { apiPeriod: 'last_7d' };
    case 'last_30d':
    case 'last_30d_with_today':
      return { apiPeriod: 'last_30d' };
    default: {
      const range = periodToDateRange(period);
      return { apiPeriod: 'custom', startDate: range.startDate, endDate: range.endDate };
    }
  }
}

// ============================================================================
// GOOGLE CAMPAIGN RESPONSE SHAPE (from GoogleAdsApiService)
// ============================================================================

interface GoogleCampaignResult {
  id: string;
  name: string;
  status: string;
  channelType: string;
  budget: number;
  budgetId: string;
  maxBid?: number;
  biddingStrategyType?: string;
  targetCpa?: number;
  targetRoas?: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  cpa: number;
  roas: number;
  budgetSpentPercent: number;
}

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

/**
 * Google Ads platform adapter for the unified automation engine.
 * Translates generic automation operations into Google Ads API calls.
 */
@Injectable()
export class GoogleAutomationAdapter implements PlatformAutomationAdapter {
  private readonly logger = new Logger(GoogleAutomationAdapter.name);
  readonly platform = 'google' as const;

  constructor(
    @Inject(forwardRef(() => GoogleAdsApiService))
    private readonly googleAdsApiService: GoogleAdsApiService,
    @Inject(forwardRef(() => GoogleDashboardService))
    private readonly googleDashboardService: GoogleDashboardService,
    @Inject(forwardRef(() => ConnectionsService))
    private readonly connectionsService: ConnectionsService,
    @Inject(forwardRef(() => CircuitBreakerService))
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  // ==========================================================================
  // fetchEntities
  // ==========================================================================

  async fetchEntities(
    connectionId: string,
    adAccountIds: string[],
    level: EntityLevel,
    _filters: FilterGroup[],
    periods: string[],
    _attribution?: AttributionConfig,
    googleCampaignType?: string,
  ): Promise<PlatformEntity[]> {
    if (level !== 'campaign') {
      this.logger.warn(
        `fetchEntities: level "${level}" is not yet supported for Google. Returning empty.`,
      );
      return [];
    }

    const connection = await this.getGoogleConnection(connectionId);
    if (!connection) {
      this.logger.error(`fetchEntities: connection ${connectionId} not found or not Google`);
      return [];
    }

    const customerIds =
      adAccountIds.length > 0 ? adAccountIds : this.getDefaultCustomerIds(connection);

    if (customerIds.length === 0) {
      this.logger.warn(`fetchEntities: no customer IDs for connection ${connectionId}`);
      return [];
    }

    const primaryPeriod = periods[0] ?? 'last_7d';
    const { apiPeriod, startDate, endDate } = mapToGoogleApiPeriod(primaryPeriod);

    const results = await Promise.allSettled(
      customerIds.map((customerId) =>
        this.fetchCampaignsForCustomer(
          connection,
          customerId,
          apiPeriod,
          startDate,
          endDate,
          connectionId,
          primaryPeriod,
          googleCampaignType,
        ),
      ),
    );

    const entities: PlatformEntity[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        entities.push(...result.value);
      } else {
        const errorMsg =
          result.reason instanceof Error ? result.reason.message : String(result.reason);
        this.logger.error(`fetchEntities: error fetching campaigns — ${errorMsg}`);
      }
    }

    this.logger.log(
      `fetchEntities: fetched ${entities.length} campaigns for connection ${connectionId}`,
    );
    return entities;
  }

  // ==========================================================================
  // executeAction
  // ==========================================================================

  async executeAction(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult> {
    try {
      switch (action.action) {
        case 'pause':
          return await this.executePause(connectionId, entity, userId);
        case 'start':
          return await this.executeStart(connectionId, entity, userId);
        case 'increase_budget':
          return await this.executeIncreaseBudget(connectionId, entity, action, userId);
        case 'decrease_budget':
          return await this.executeDecreaseBudget(connectionId, entity, action, userId);
        case 'set_budget':
          return await this.executeSetBudget(connectionId, entity, action, userId);
        case 'increase_bid':
          return await this.executeIncreaseBid(connectionId, entity, action, userId);
        case 'decrease_bid':
          return await this.executeDecreaseBid(connectionId, entity, action, userId);
        case 'set_bid':
          return await this.executeSetBid(connectionId, entity, action, userId);
        case 'set_bid_strategy':
          return await this.executeSetBidStrategy(connectionId, entity, action, userId);
        case 'notify':
          return { success: true, action: action.action, requiresNotification: true };
        case 'add_to_name':
        case 'remove_from_name':
        case 'replace_in_name':
          return {
            success: false,
            action: action.action,
            error: `Action "${action.action}" is not supported for Google Ads campaigns`,
          };
        case 'duplicate':
          return {
            success: false,
            action: action.action,
            error: 'Campaign duplication is not supported for Google Ads',
          };
        case 'extend_end_date':
          return {
            success: false,
            action: action.action,
            error: 'extend_end_date is not yet implemented for Google Ads',
          };
        case 'scale_budget_by_target':
          return {
            success: false,
            action: action.action,
            error: 'scale_budget_by_target is not yet implemented for Google Ads',
          };
        default:
          return {
            success: false,
            action: action.action,
            error: `Unknown action type: ${action.action}`,
          };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `executeAction: ${action.action} failed on entity ${entity.id} — ${errorMsg}`,
      );
      return { success: false, action: action.action, error: errorMsg };
    }
  }

  // ==========================================================================
  // checkConnection
  // ==========================================================================

  async checkConnection(connectionId: string): Promise<ConnectionHealth> {
    const connection = await this.connectionsService.getConnectionById(connectionId);

    if (!connection) {
      return { isHealthy: false, connectionId, lastError: 'Connection not found' };
    }

    if (!connection.is_active) {
      return { isHealthy: false, connectionId, lastError: 'Connection is inactive' };
    }

    if (connection.needs_reconnect) {
      return {
        isHealthy: false,
        connectionId,
        lastError: connection.last_refresh_error ?? 'Connection requires reconnection',
      };
    }

    if (!this.circuitBreakerService.canRequest(connectionId)) {
      return {
        isHealthy: false,
        connectionId,
        lastError: 'Circuit breaker is open — too many recent failures',
      };
    }

    return { isHealthy: true, connectionId };
  }

  // ==========================================================================
  // getMetricValue
  // ==========================================================================

  getMetricValue(entity: PlatformEntity, metric: string, period: string): number {
    const periodKey = `${metric}_${period}`;
    return entity.metrics[periodKey] ?? entity.metrics[metric] ?? 0;
  }

  // ==========================================================================
  // PRIVATE — Connection helpers
  // ==========================================================================

  private async getGoogleConnection(connectionId: string): Promise<GoogleConnection | null> {
    const connection = await this.connectionsService.getConnectionById(connectionId);
    if (!connection) return null;

    if (connection.plataform_name !== 'google') {
      this.logger.warn(
        `getGoogleConnection: connection ${connectionId} is platform "${connection.plataform_name}", expected "google"`,
      );
      return null;
    }

    return connection as unknown as GoogleConnection;
  }

  private getDefaultCustomerIds(connection: GoogleConnection): string[] {
    const metadata = connection.metadata as GoogleConnectionMetadata;
    if (metadata?.customer_id) {
      return [metadata.customer_id.replace(/-/g, '')];
    }
    return [];
  }

  private getLoginCustomerId(connection: GoogleConnection): string | undefined {
    const metadata = connection.metadata as GoogleConnectionMetadata;
    return metadata?.login_customer_id?.replace(/-/g, '') ?? undefined;
  }

  // ==========================================================================
  // PRIVATE — fetchEntities helpers
  // ==========================================================================

  private async fetchCampaignsForCustomer(
    connection: GoogleConnection,
    customerId: string,
    apiPeriod: GoogleApiPeriod,
    startDate: string | undefined,
    endDate: string | undefined,
    connectionId: string,
    period: string,
    googleCampaignType?: string,
  ): Promise<PlatformEntity[]> {
    const loginCustomerId = this.getLoginCustomerId(connection);

    const result = await this.googleAdsApiService.getCampaignMetrics(
      connection,
      apiPeriod,
      startDate,
      endDate,
      customerId.replace(/-/g, ''),
      loginCustomerId,
    );

    if (!result.success || !result.campaigns) {
      if (result.error) {
        this.logger.warn(
          `fetchCampaignsForCustomer: failed for customer ${customerId} — ${result.error}`,
        );
      }
      return [];
    }

    let campaigns = result.campaigns;

    // Filter by campaign type if specified
    if (googleCampaignType) {
      campaigns = campaigns.filter((c) => {
        const normalizedType = CHANNEL_TYPE_MAP[c.channelType] ?? c.channelType?.toLowerCase();
        return normalizedType === googleCampaignType;
      });
    }

    return campaigns.map((campaign) =>
      this.normalizeCampaign(campaign, connectionId, customerId, loginCustomerId, period),
    );
  }

  private normalizeCampaign(
    campaign: GoogleCampaignResult,
    connectionId: string,
    customerId: string,
    loginCustomerId: string | undefined,
    period: string,
  ): PlatformEntity {
    const cpc = campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0;

    // Build metrics map with both bare keys and period-suffixed keys
    const metricsMap: Record<string, number> = {
      // Bare metric keys (fallback)
      spend: campaign.cost,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      ctr: campaign.ctr,
      cpc,
      cpa: campaign.cpa,
      roas: campaign.roas,
      conversions: campaign.conversions,
      conversions_value: campaign.conversionsValue,
      budget_spent_percent: campaign.budgetSpentPercent,
      cost: campaign.cost,

      // Period-suffixed keys
      [`spend_${period}`]: campaign.cost,
      [`impressions_${period}`]: campaign.impressions,
      [`clicks_${period}`]: campaign.clicks,
      [`ctr_${period}`]: campaign.ctr,
      [`cpc_${period}`]: cpc,
      [`cpa_${period}`]: campaign.cpa,
      [`roas_${period}`]: campaign.roas,
      [`conversions_${period}`]: campaign.conversions,
      [`conversions_value_${period}`]: campaign.conversionsValue,
      [`budget_spent_percent_${period}`]: campaign.budgetSpentPercent,
      [`cost_${period}`]: campaign.cost,
    };

    return {
      id: campaign.id,
      name: campaign.name,
      platform: 'google',
      level: 'campaign',
      status: campaign.status,
      metrics: metricsMap,
      budget: campaign.budget,
      budgetType: 'daily',
      budgetId: campaign.budgetId,
      bid: campaign.maxBid,
      bidStrategy: campaign.biddingStrategyType,
      connectionId,
      adAccountId: customerId,
      loginCustomerId,
      rawData: campaign,
    };
  }

  // ==========================================================================
  // PRIVATE — Action executors
  // ==========================================================================

  private async executePause(
    connectionId: string,
    entity: PlatformEntity,
    userId: string,
  ): Promise<ActionResult> {
    if (entity.level === 'campaign') {
      const result = await this.googleDashboardService.pauseCampaign(
        userId,
        connectionId,
        entity.id,
      );
      return {
        success: result.success,
        action: 'pause',
        previousValue: result.previousStatus ?? entity.status,
        newValue: result.success ? 'PAUSED' : undefined,
        error: result.error,
      };
    }

    if (entity.level === 'ad_group') {
      const result = await this.googleDashboardService.pauseAdGroup(
        userId,
        connectionId,
        entity.id,
      );
      return {
        success: result.success,
        action: 'pause',
        previousValue: result.previousStatus ?? entity.status,
        newValue: result.success ? 'PAUSED' : undefined,
        error: result.error,
      };
    }

    if (entity.level === 'ad') {
      const result = await this.googleDashboardService.pauseAd(
        userId,
        connectionId,
        entity.id,
      );
      return {
        success: result.success,
        action: 'pause',
        previousValue: result.previousStatus ?? entity.status,
        newValue: result.success ? 'PAUSED' : undefined,
        error: result.error,
      };
    }

    return {
      success: false,
      action: 'pause',
      error: `Pause is not supported for entity level "${entity.level}"`,
    };
  }

  private async executeStart(
    connectionId: string,
    entity: PlatformEntity,
    userId: string,
  ): Promise<ActionResult> {
    if (entity.level === 'campaign') {
      const result = await this.googleDashboardService.enableCampaign(
        userId,
        connectionId,
        entity.id,
      );
      return {
        success: result.success,
        action: 'start',
        previousValue: result.previousStatus ?? entity.status,
        newValue: result.success ? 'ENABLED' : undefined,
        error: result.error,
      };
    }

    if (entity.level === 'ad_group') {
      const result = await this.googleDashboardService.enableAdGroup(
        userId,
        connectionId,
        entity.id,
      );
      return {
        success: result.success,
        action: 'start',
        previousValue: result.previousStatus ?? entity.status,
        newValue: result.success ? 'ENABLED' : undefined,
        error: result.error,
      };
    }

    if (entity.level === 'ad') {
      const result = await this.googleDashboardService.enableAd(
        userId,
        connectionId,
        entity.id,
      );
      return {
        success: result.success,
        action: 'start',
        previousValue: result.previousStatus ?? entity.status,
        newValue: result.success ? 'ENABLED' : undefined,
        error: result.error,
      };
    }

    return {
      success: false,
      action: 'start',
      error: `Start is not supported for entity level "${entity.level}"`,
    };
  }

  private async executeIncreaseBudget(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult> {
    const params = action.params as unknown as BudgetChangeParams;
    const currentBudget = entity.budget ?? 0;

    let newBudget: number;
    if (params.changeType === 'percentage') {
      newBudget = currentBudget * (1 + params.changeValue / 100);
    } else {
      newBudget = currentBudget + params.changeValue;
    }

    newBudget = this.applyBudgetGuards(newBudget, params.minBudget, params.maxBudget);

    if (!entity.budgetId) {
      return {
        success: false,
        action: 'increase_budget',
        error: 'No budget ID found on entity — cannot update budget',
      };
    }

    const result = await this.googleDashboardService.updateBudget(
      userId,
      connectionId,
      entity.id,
      entity.budgetId,
      newBudget,
      entity.adAccountId,
      entity.loginCustomerId,
    );

    return {
      success: result.success,
      action: 'increase_budget',
      previousValue: result.previousBudget ?? currentBudget,
      newValue: result.newBudget ?? newBudget,
      error: result.error,
    };
  }

  private async executeDecreaseBudget(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult> {
    const params = action.params as unknown as BudgetChangeParams;
    const currentBudget = entity.budget ?? 0;

    let newBudget: number;
    if (params.changeType === 'percentage') {
      newBudget = currentBudget * (1 - params.changeValue / 100);
    } else {
      newBudget = currentBudget - params.changeValue;
    }

    newBudget = this.applyBudgetGuards(newBudget, params.minBudget, params.maxBudget);

    if (!entity.budgetId) {
      return {
        success: false,
        action: 'decrease_budget',
        error: 'No budget ID found on entity — cannot update budget',
      };
    }

    const result = await this.googleDashboardService.updateBudget(
      userId,
      connectionId,
      entity.id,
      entity.budgetId,
      newBudget,
      entity.adAccountId,
      entity.loginCustomerId,
    );

    return {
      success: result.success,
      action: 'decrease_budget',
      previousValue: result.previousBudget ?? currentBudget,
      newValue: result.newBudget ?? newBudget,
      error: result.error,
    };
  }

  private async executeSetBudget(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult> {
    const params = action.params as unknown as SetBudgetParams;

    if (!entity.budgetId) {
      return {
        success: false,
        action: 'set_budget',
        error: 'No budget ID found on entity — cannot update budget',
      };
    }

    const result = await this.googleDashboardService.updateBudget(
      userId,
      connectionId,
      entity.id,
      entity.budgetId,
      params.budgetValue,
      entity.adAccountId,
      entity.loginCustomerId,
    );

    return {
      success: result.success,
      action: 'set_budget',
      previousValue: result.previousBudget ?? entity.budget,
      newValue: result.newBudget ?? params.budgetValue,
      error: result.error,
    };
  }

  private async executeIncreaseBid(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult> {
    const params = action.params as unknown as BidChangeParams;
    const currentBid = entity.bid ?? 0;

    let newBid: number;
    if (params.changeType === 'percentage') {
      newBid = currentBid * (1 + params.changeValue / 100);
    } else {
      newBid = currentBid + params.changeValue;
    }

    newBid = this.applyBidGuards(newBid, params.minBid, params.maxBid);

    const result = await this.googleDashboardService.updateBid(
      userId,
      connectionId,
      entity.id,
      newBid,
      entity.adAccountId,
      entity.loginCustomerId,
    );

    return {
      success: result.success,
      action: 'increase_bid',
      previousValue: result.previousBid ?? currentBid,
      newValue: result.newBid ?? newBid,
      error: result.error,
    };
  }

  private async executeDecreaseBid(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult> {
    const params = action.params as unknown as BidChangeParams;
    const currentBid = entity.bid ?? 0;

    let newBid: number;
    if (params.changeType === 'percentage') {
      newBid = currentBid * (1 - params.changeValue / 100);
    } else {
      newBid = currentBid - params.changeValue;
    }

    newBid = this.applyBidGuards(newBid, params.minBid, params.maxBid);

    const result = await this.googleDashboardService.updateBid(
      userId,
      connectionId,
      entity.id,
      newBid,
      entity.adAccountId,
      entity.loginCustomerId,
    );

    return {
      success: result.success,
      action: 'decrease_bid',
      previousValue: result.previousBid ?? currentBid,
      newValue: result.newBid ?? newBid,
      error: result.error,
    };
  }

  private async executeSetBid(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult> {
    const params = action.params as unknown as SetBidParams;

    const result = await this.googleDashboardService.updateBid(
      userId,
      connectionId,
      entity.id,
      params.bidValue,
      entity.adAccountId,
      entity.loginCustomerId,
    );

    return {
      success: result.success,
      action: 'set_bid',
      previousValue: result.previousBid ?? entity.bid,
      newValue: result.newBid ?? params.bidValue,
      error: result.error,
    };
  }

  private async executeSetBidStrategy(
    connectionId: string,
    entity: PlatformEntity,
    action: ActionConfig,
    userId: string,
  ): Promise<ActionResult> {
    const params = action.params as unknown as BidStrategyParams;

    if (params.targetCpa !== undefined) {
      const result = await this.googleDashboardService.updateTargetCpa(
        userId,
        connectionId,
        entity.id,
        params.targetCpa,
        entity.adAccountId,
        entity.loginCustomerId,
      );
      return {
        success: result.success,
        action: 'set_bid_strategy',
        previousValue: result.previousValue,
        newValue: result.newValue ?? params.targetCpa,
        error: result.error,
      };
    }

    if (params.targetRoas !== undefined) {
      const result = await this.googleDashboardService.updateTargetRoas(
        userId,
        connectionId,
        entity.id,
        params.targetRoas,
        entity.adAccountId,
        entity.loginCustomerId,
      );
      return {
        success: result.success,
        action: 'set_bid_strategy',
        previousValue: result.previousValue,
        newValue: result.newValue ?? params.targetRoas,
        error: result.error,
      };
    }

    return {
      success: false,
      action: 'set_bid_strategy',
      error: 'set_bid_strategy requires either targetCpa or targetRoas in params',
    };
  }

  // ==========================================================================
  // PRIVATE — Guard helpers
  // ==========================================================================

  private applyBudgetGuards(
    budget: number,
    minBudget?: number,
    maxBudget?: number,
  ): number {
    let result = Math.max(budget, 0);
    if (minBudget !== undefined) {
      result = Math.max(result, minBudget);
    }
    if (maxBudget !== undefined) {
      result = Math.min(result, maxBudget);
    }
    // Round to 2 decimal places
    return Math.round(result * 100) / 100;
  }

  private applyBidGuards(bid: number, minBid?: number, maxBid?: number): number {
    let result = Math.max(bid, 0);
    if (minBid !== undefined) {
      result = Math.max(result, minBid);
    }
    if (maxBid !== undefined) {
      result = Math.min(result, maxBid);
    }
    return Math.round(result * 100) / 100;
  }
}
