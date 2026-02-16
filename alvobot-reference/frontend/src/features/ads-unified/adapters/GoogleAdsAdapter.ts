/**
 * Google Ads Platform Adapter
 *
 * Wraps existing Google Ads dashboard hooks and normalizes data
 * to the unified format for the ads-unified dashboard.
 */

import { api } from '@/shared/utils/api'
import {
  normalizeGoogleStatus,
  AdapterApiError,
  type GoogleCampaignMetricsRaw,
  type GoogleAutomationRuleRaw,
  type GoogleActionLogRaw,
} from './types'
import type {
  PlatformAdapter,
  PlatformFeatures,
  UnifiedCampaign,
  UnifiedAutomationRule,
  UnifiedActionLog,
  FetchCampaignsParams,
  FetchCampaignsResult,
  FetchHistoryParams,
  ActionSource,
  ActionStatus,
  ActionType,
} from '../types'

// ============================================
// Google Ads API Response Types (from existing dashboard)
// ============================================

interface GetCampaignsResponse {
  campaigns: GoogleCampaignMetricsRaw[]
  summary: {
    totalCampaigns: number
    activeCampaigns: number
    totalImpressions: number
    totalClicks: number
    totalCost: number
    totalConversions: number
    avgCtr: number
    avgCpa: number
  }
  connections: Array<{
    connectionId: string
    connectionName: string
    customerId: string
  }>
  fetchedAt: string
}

interface GetActionHistoryResponse {
  actions: GoogleActionLogRaw[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================
// Normalization Functions
// ============================================

function normalizeGoogleCampaign(campaign: GoogleCampaignMetricsRaw): UnifiedCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    platform: 'google',
    status: normalizeGoogleStatus(campaign.status),
    budget: campaign.budget,
    budgetType: 'daily', // Google Ads campaigns typically use daily budgets
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    ctr: campaign.ctr,
    cost: campaign.cost,
    conversions: campaign.conversions,
    cpa: campaign.cpa,
    roas: campaign.roas,
    connectionId: campaign.connectionId || '',
    connectionName: campaign.connectionName || '',
    platformData: campaign,
  }
}

function normalizeGoogleAutomation(rule: GoogleAutomationRuleRaw): UnifiedAutomationRule {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    platform: 'google',
    isActive: rule.is_active,
    actionType: rule.action_type,
    lastRunAt: rule.last_run_at,
    createdAt: rule.created_at,
    platformData: rule,
  }
}

function normalizeGoogleActionLog(action: GoogleActionLogRaw): UnifiedActionLog {
  return {
    id: action.id,
    platform: 'google',
    campaignId: action.campaign_id,
    campaignName: action.campaign_name,
    connectionId: action.connection_id,
    actionType: action.action_type as ActionType,
    status: action.status as ActionStatus,
    source: action.source as ActionSource,
    executedAt: action.executed_at,
    errorMessage: action.error_message,
    details: action.action_details
      ? {
          previousValue: action.action_details.previous_value,
          newValue: action.action_details.new_value,
        }
      : undefined,
    platformData: action,
  }
}

// ============================================
// Google Ads Adapter Class
// ============================================

class GoogleAdsAdapterImpl implements PlatformAdapter {
  platform = 'google' as const

  features: PlatformFeatures = {
    hasPerformance: true,
    hasAutomations: true,
    hasHistory: true,
    hasBidManagement: true,
  }

  async fetchCampaigns(params: FetchCampaignsParams): Promise<FetchCampaignsResult> {
    try {
      const queryParams = new URLSearchParams()

      if (params.workspaceId) {
        queryParams.append('workspaceId', params.workspaceId)
      }
      if (params.connectionId) {
        queryParams.append('connectionId', params.connectionId)
      }
      if (params.period) {
        queryParams.append('period', params.period)
      }
      if (params.startDate) {
        queryParams.append('startDate', params.startDate)
      }
      if (params.endDate) {
        queryParams.append('endDate', params.endDate)
      }
      if (params.status && params.status !== 'all') {
        const status = params.status === 'active' ? 'ENABLED' : 'PAUSED'
        queryParams.append('status', status)
      }

      const response = await api.get<GetCampaignsResponse>(
        `/google/dashboard/campaigns?${queryParams.toString()}`
      )

      // Google Ads doesn't have pagination yet, return all campaigns
      return {
        campaigns: response.campaigns.map(normalizeGoogleCampaign),
      }
    } catch (error) {
      throw new AdapterApiError('google', 'Failed to fetch Google Ads campaigns', error)
    }
  }

  async fetchAutomations(connectionId?: string): Promise<UnifiedAutomationRule[]> {
    try {
      const queryParams = new URLSearchParams()

      if (connectionId) {
        queryParams.append('connectionId', connectionId)
      }

      const response = await api.get<GoogleAutomationRuleRaw[]>(
        `/google/automations/rules?${queryParams.toString()}`
      )

      return response.map(normalizeGoogleAutomation)
    } catch (error) {
      throw new AdapterApiError('google', 'Failed to fetch Google Ads automation rules', error)
    }
  }

  async fetchHistory(params: FetchHistoryParams): Promise<{
    actions: UnifiedActionLog[]
    pagination: { page: number; totalPages: number; total: number }
  }> {
    try {
      const queryParams = new URLSearchParams()

      if (params.connectionId) {
        queryParams.append('connectionId', params.connectionId)
      }
      if (params.source && params.source !== 'manual' && params.source !== 'automation') {
        queryParams.append('source', 'all')
      } else if (params.source) {
        queryParams.append('source', params.source)
      }
      if (params.status) {
        queryParams.append('status', params.status)
      }
      if (params.startDate) {
        queryParams.append('startDate', params.startDate)
      }
      if (params.endDate) {
        queryParams.append('endDate', params.endDate)
      }
      if (params.page) {
        queryParams.append('page', String(params.page))
      }
      if (params.limit) {
        queryParams.append('limit', String(params.limit))
      }

      const response = await api.get<GetActionHistoryResponse>(
        `/google/dashboard/history/actions?${queryParams.toString()}`
      )

      return {
        actions: response.actions.map(normalizeGoogleActionLog),
        pagination: {
          page: response.pagination.page,
          totalPages: response.pagination.totalPages,
          total: response.pagination.total,
        },
      }
    } catch (error) {
      throw new AdapterApiError('google', 'Failed to fetch Google Ads action history', error)
    }
  }

  async pauseCampaign(campaignId: string, connectionId: string): Promise<void> {
    try {
      await api.post(`/google/dashboard/campaigns/${campaignId}/pause`, {
        connectionId,
      })
    } catch (error) {
      throw new AdapterApiError('google', 'Failed to pause Google Ads campaign', error)
    }
  }

  async enableCampaign(campaignId: string, connectionId: string): Promise<void> {
    try {
      await api.post(`/google/dashboard/campaigns/${campaignId}/enable`, {
        connectionId,
      })
    } catch (error) {
      throw new AdapterApiError('google', 'Failed to enable Google Ads campaign', error)
    }
  }

  async updateBudget(campaignId: string, connectionId: string, budget: number): Promise<void> {
    try {
      await api.patch(`/google/dashboard/campaigns/${campaignId}/budget`, {
        connectionId,
        budget,
      })
    } catch (error) {
      throw new AdapterApiError('google', 'Failed to update Google Ads campaign budget', error)
    }
  }
}

// Export singleton instance
export const GoogleAdsAdapter = new GoogleAdsAdapterImpl()

// Export type for factory
export type { GoogleAdsAdapterImpl }
