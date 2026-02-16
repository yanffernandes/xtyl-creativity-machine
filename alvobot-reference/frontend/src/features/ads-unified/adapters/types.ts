/**
 * Platform Adapter Types
 *
 * This file contains adapter-specific types that extend the base unified types.
 * The core interfaces (PlatformAdapter, UnifiedCampaign, etc.) are in ../types/index.ts
 */

import type { AdsPlatform, UnifiedCampaignStatus } from '../types'

// ============================================
// Adapter Configuration
// ============================================

export interface AdapterConfig {
  platform: AdsPlatform
  apiBaseUrl: string
  enabled: boolean
}

// ============================================
// Google Ads Specific Types (for normalization)
// ============================================

export interface GoogleCampaignMetricsRaw {
  id: string
  name: string
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  channelType: string
  budget: number
  budgetId: string
  maxBid?: number
  biddingStrategyType?: string
  targetCpa?: number
  targetRoas?: number
  impressions: number
  clicks: number
  ctr: number
  cost: number
  conversions: number
  conversionsValue: number
  cpa: number
  roas: number
  budgetSpentPercent: number
  runtimeHours?: number
  alerts?: string[]
  customerId?: string
  loginCustomerId?: string
  connectionId?: string
  connectionName?: string
}

export interface GoogleAutomationRuleRaw {
  id: string
  name: string
  description?: string
  is_active: boolean
  action_type: string
  last_run_at?: string
  created_at: string
  connection_id: string
  user_id: string
  workspace_id?: string
}

export interface GoogleActionLogRaw {
  id: string
  campaign_id: string
  campaign_name: string
  source: 'manual' | 'automation'
  action_type: string
  status: 'success' | 'failed' | 'skipped'
  executed_at: string
  error_message?: string
  action_details?: {
    previous_value?: number
    new_value?: number
  }
  connection_id: string
}

// ============================================
// Meta Ads Specific Types (for normalization)
// ============================================

export interface MetaCampaignMetricsRaw {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  effective_status: string
  objective: string
  daily_budget?: string
  lifetime_budget?: string
  spend: string
  impressions: string
  clicks: string
  reach: string
  frequency: string
  conversions?: number
  cpm: string
  cpc: string
  ctr: string
  page_id?: string
  connection_id?: string
  connection_name?: string
}

export interface MetaActionLogRaw {
  id: string
  meta_campaign_id: string
  meta_campaign_name: string
  source: 'manual' | 'automation'
  action_type: string
  status: 'success' | 'failed' | 'skipped'
  executed_at: string
  error_message?: string
  action_details?: Record<string, unknown>
  connection_id: string
}

// ============================================
// Status Mapping Utilities
// ============================================

export function normalizeGoogleStatus(status: string): UnifiedCampaignStatus {
  switch (status) {
    case 'ENABLED':
      return 'ENABLED'
    case 'PAUSED':
      return 'PAUSED'
    case 'REMOVED':
      return 'REMOVED'
    default:
      return 'DRAFT'
  }
}

export function normalizeMetaStatus(status: string): UnifiedCampaignStatus {
  switch (status) {
    case 'ACTIVE':
      return 'ENABLED'
    case 'PAUSED':
      return 'PAUSED'
    case 'DELETED':
    case 'ARCHIVED':
      return 'REMOVED'
    default:
      return 'DRAFT'
  }
}

// ============================================
// Adapter Error Types
// ============================================

export class AdapterError extends Error {
  platform: AdsPlatform
  code: string
  originalError?: unknown

  constructor(
    message: string,
    platform: AdsPlatform,
    code: string,
    originalError?: unknown
  ) {
    super(message)
    this.name = 'AdapterError'
    this.platform = platform
    this.code = code
    this.originalError = originalError
  }
}

export class AdapterNotAvailableError extends AdapterError {
  constructor(platform: AdsPlatform) {
    super(`${platform} adapter is not available`, platform, 'ADAPTER_NOT_AVAILABLE')
  }
}

export class AdapterApiError extends AdapterError {
  constructor(platform: AdsPlatform, message: string, originalError?: unknown) {
    super(message, platform, 'API_ERROR', originalError)
  }
}
