/**
 * Meta Ads Platform Adapter
 * T045: Updated adapter to call real Meta Dashboard API endpoints
 *
 * This adapter handles communication with the Meta Dashboard backend
 * for campaign management in the unified ads dashboard.
 */

import { api } from '@/shared/utils/api'
import { AdapterApiError } from './types'
import type {
  PlatformAdapter,
  PlatformFeatures,
  UnifiedCampaign,
  UnifiedAutomationRule,
  UnifiedActionLog,
  FetchCampaignsParams,
  FetchCampaignsResult,
  FetchHistoryParams,
  DashboardPeriod,
} from '../types'

// ============================================
// API Response Types
// ============================================

interface MetaCampaignResponse {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string
  dailyBudget: number
  lifetimeBudget: number
  budgetType: 'daily' | 'lifetime'
  /** True when budget is set at Ad Set level (ABO) instead of Campaign level (CBO) */
  isABO: boolean
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  spend: number
  reach: number
  frequency: number
  conversions: number
  cpa: number
  roas: number
  startTime?: string
  stopTime?: string
  createdTime: string
  updatedTime: string
  connectionId: string
  connectionName: string
  adAccountId: string
  adAccountName: string
}

interface MetaDashboardPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

interface MetaDashboardApiResponse {
  success: boolean
  campaigns: MetaCampaignResponse[]
  totals: {
    totalCampaigns: number
    activeCampaigns: number
    pausedCampaigns: number
    totalImpressions: number
    totalClicks: number
    totalSpend: number
    totalConversions: number
    avgCtr: number
    avgCpa: number
  }
  pagination?: MetaDashboardPagination
  error?: string
}

interface MetaActionLogResponse {
  id: string
  connectionId: string
  adAccountId: string
  campaignId: string
  campaignName: string
  actionType: 'pause' | 'enable' | 'budget_update' | 'bid_update'
  source: 'manual' | 'automation'
  status: 'success' | 'failed' | 'pending'
  oldValue?: string
  newValue?: string
  errorMessage?: string
  createdAt: string
  userId: string
}

interface MetaHistoryApiResponse {
  actions: MetaActionLogResponse[]
  total: number
}

// ============================================
// Meta Ads Adapter Class
// ============================================

class MetaAdsAdapterImpl implements PlatformAdapter {
  platform = 'meta' as const

  // Meta features - now enabled after Phase 6 implementation
  features: PlatformFeatures = {
    hasPerformance: true,
    hasAutomations: false, // Meta automations planned for future phase
    hasHistory: true,
    hasBidManagement: false, // Meta uses different bid model
  }

  /**
   * Map period string to API parameter
   */
  private mapPeriod(period: DashboardPeriod): string {
    const periodMap: Record<DashboardPeriod, string> = {
      today: 'today',
      yesterday: 'yesterday',
      last_7d: 'last_7d',
      last_30d: 'last_30d',
      custom: 'custom',
    }
    return periodMap[period] || 'last_7d'
  }

  /**
   * Map Meta campaign status to unified status
   */
  private mapStatus(status: string): UnifiedCampaign['status'] {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'ENABLED'
      case 'PAUSED':
        return 'PAUSED'
      case 'DELETED':
      case 'ARCHIVED':
        return 'REMOVED'
      default:
        return 'PAUSED'
    }
  }

  /**
   * Map action type to unified action type
   */
  private mapActionType(type: string): UnifiedActionLog['actionType'] {
    switch (type) {
      case 'pause':
        return 'pause'
      case 'enable':
        return 'enable'
      case 'budget_update':
        return 'budget_change'
      case 'bid_update':
        return 'bid_change'
      default:
        return 'pause'
    }
  }

  /**
   * Map action status to unified action status
   */
  private mapActionStatus(status: MetaActionLogResponse['status']): UnifiedActionLog['status'] {
    switch (status) {
      case 'success':
        return 'success'
      case 'failed':
        return 'failed'
      case 'pending':
      default:
        return 'skipped'
    }
  }

  /**
   * Fetch Meta campaigns with metrics
   * GET /meta/dashboard/campaigns
   * Supports pagination for infinite scroll - sorted by spend (desc) by default
   */
  async fetchCampaigns(params: FetchCampaignsParams): Promise<FetchCampaignsResult> {
    try {
      const queryParams = new URLSearchParams()

      if (params.connectionId) {
        queryParams.set('connectionId', params.connectionId)
      }
      if (params.workspaceId) {
        queryParams.set('workspaceId', params.workspaceId)
      }
      if (params.period) {
        queryParams.set('period', this.mapPeriod(params.period))
      }
      if (params.startDate) {
        queryParams.set('startDate', params.startDate)
      }
      if (params.endDate) {
        queryParams.set('endDate', params.endDate)
      }
      if (params.status && params.status !== 'all') {
        const status = params.status === 'active' ? 'ACTIVE' : 'PAUSED'
        queryParams.set('status', status)
      }
      if (params.forceRefresh) {
        queryParams.set('forceRefresh', 'true')
      }
      // Pagination params
      if (params.page) {
        queryParams.set('page', String(params.page))
      }
      if (params.limit) {
        queryParams.set('limit', String(params.limit))
      }
      // Sorting params (default: spend desc)
      queryParams.set('sortBy', params.sortBy || 'spend')
      queryParams.set('sortOrder', params.sortOrder || 'desc')

      const response = await api.get<MetaDashboardApiResponse>(
        `/meta/dashboard/campaigns?${queryParams.toString()}`
      )

      if (!response.success || !response.campaigns) {
        console.warn('[MetaAdsAdapter] No campaigns returned:', response.error)
        return { campaigns: [] }
      }

      // Transform Meta campaigns to unified format
      const campaigns = response.campaigns.map((campaign): UnifiedCampaign => ({
        id: campaign.id,
        platform: 'meta',
        name: campaign.name,
        status: this.mapStatus(campaign.status),
        budget: campaign.dailyBudget > 0 ? campaign.dailyBudget : campaign.lifetimeBudget,
        budgetType: campaign.budgetType,
        isABO: campaign.isABO,
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        ctr: campaign.ctr,
        cost: campaign.spend,
        conversions: campaign.conversions,
        cpa: campaign.cpa,
        connectionId: campaign.connectionId,
        connectionName: campaign.connectionName,
        platformData: campaign,
      }))

      return {
        campaigns,
        pagination: response.pagination,
      }
    } catch (error) {
      throw new AdapterApiError('meta', 'Failed to fetch Meta Ads campaigns', error)
    }
  }

  /**
   * Fetch Meta automations - not available yet
   * Meta automations are planned for a future phase
   */
  async fetchAutomations(_connectionId?: string): Promise<UnifiedAutomationRule[]> {
    void _connectionId
    // Meta automations not yet supported
    return []
  }

  /**
   * Fetch Meta action history
   * GET /meta/dashboard/history/actions
   */
  async fetchHistory(params: FetchHistoryParams): Promise<{
    actions: UnifiedActionLog[]
    pagination: { page: number; totalPages: number; total: number }
  }> {
    try {
      const queryParams = new URLSearchParams()

      if (params.connectionId) {
        queryParams.set('connectionId', params.connectionId)
      }
      if (params.source) {
        queryParams.set('source', params.source)
      }
      if (params.page) {
        queryParams.set('page', String(params.page))
      }
      if (params.limit) {
        queryParams.set('limit', String(params.limit))
      }

      const response = await api.get<MetaHistoryApiResponse>(
        `/meta/dashboard/history/actions?${queryParams.toString()}`
      )

      if (!response.actions) {
        return {
          actions: [],
          pagination: { page: params.page || 1, totalPages: 0, total: 0 },
        }
      }

      const limit = params.limit || 20
      const total = response.total
      const totalPages = Math.ceil(total / limit)

      return {
        actions: response.actions.map((action): UnifiedActionLog => ({
          id: action.id,
          platform: 'meta',
          campaignId: action.campaignId,
          campaignName: action.campaignName || 'Unknown Campaign',
          connectionId: action.connectionId,
          actionType: this.mapActionType(action.actionType),
          source: action.source,
          status: this.mapActionStatus(action.status),
          previousValue: action.oldValue,
          newValue: action.newValue,
          errorMessage: action.errorMessage,
          executedAt: action.createdAt,
          platformData: action,
        })),
        pagination: {
          page: params.page || 1,
          totalPages,
          total,
        },
      }
    } catch (error) {
      throw new AdapterApiError('meta', 'Failed to fetch Meta Ads action history', error)
    }
  }

  /**
   * Pause Meta campaign
   * POST /meta/dashboard/campaigns/:id/pause
   */
  async pauseCampaign(campaignId: string, connectionId: string): Promise<void> {
    try {
      const response = await api.post<{ success: boolean; error?: string }>(`/meta/dashboard/campaigns/${campaignId}/pause`, {
        connectionId,
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to pause campaign')
      }
    } catch (error) {
      throw new AdapterApiError('meta', 'Failed to pause Meta Ads campaign', error)
    }
  }

  /**
   * Enable Meta campaign
   * POST /meta/dashboard/campaigns/:id/enable
   */
  async enableCampaign(campaignId: string, connectionId: string): Promise<void> {
    try {
      const response = await api.post<{ success: boolean; error?: string }>(`/meta/dashboard/campaigns/${campaignId}/enable`, {
        connectionId,
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to enable campaign')
      }
    } catch (error) {
      throw new AdapterApiError('meta', 'Failed to enable Meta Ads campaign', error)
    }
  }

  /**
   * Update Meta campaign budget
   * PATCH /meta/dashboard/campaigns/:id/budget
   */
  async updateBudget(campaignId: string, connectionId: string, budget: number): Promise<void> {
    try {
      const response = await api.patch<{ success: boolean; error?: string }>(`/meta/dashboard/campaigns/${campaignId}/budget`, {
        connectionId,
        newBudget: budget,
      })

      if (!response.success) {
        throw new Error(response.error || 'Failed to update budget')
      }
    } catch (error) {
      throw new AdapterApiError('meta', 'Failed to update Meta Ads campaign budget', error)
    }
  }
}

// Export singleton instance
export const MetaAdsAdapter = new MetaAdsAdapterImpl()

// Export type for factory
export type { MetaAdsAdapterImpl }
