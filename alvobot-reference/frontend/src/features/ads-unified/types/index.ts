// ============================================
// Automation Engine Types
// ============================================

export * from './automation'

// ============================================
// Unified Ads Types
// ============================================

export type AdsPlatform = 'google' | 'meta'

export type UnifiedCampaignStatus = 'ENABLED' | 'PAUSED' | 'REMOVED' | 'DRAFT' | 'FAILED'

export type CampaignStatusFilter = 'all' | 'active' | 'paused'

export type DashboardTab = 'performance' | 'automations' | 'history' | 'drafts'

export type DashboardPeriod = 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'custom'

// ============================================
// Unified Campaign (normalized across platforms)
// ============================================

export interface UnifiedCampaign {
  id: string
  name: string
  platform: AdsPlatform
  status: UnifiedCampaignStatus
  budget: number
  budgetType: 'daily' | 'lifetime'
  /** True when budget is set at Ad Set level (ABO) instead of Campaign level (CBO) - Meta only */
  isABO?: boolean
  // Common metrics
  impressions: number
  clicks: number
  ctr: number
  cost: number
  conversions: number
  cpa: number
  roas?: number
  // Connection info
  connectionId: string
  connectionName: string
  // Platform-specific raw data
  platformData: unknown
}

// ============================================
// Unified Metrics (aggregated summary)
// ============================================

export interface UnifiedMetrics {
  totalCampaigns: number
  activeCampaigns: number
  pausedCampaigns: number
  totalImpressions: number
  totalClicks: number
  totalCost: number
  totalConversions: number
  avgCtr: number
  avgCpa: number
  avgRoas?: number
}

// ============================================
// Unified Automation Rule
// ============================================

export interface UnifiedAutomationRule {
  id: string
  name: string
  description?: string
  platform: AdsPlatform
  isActive: boolean
  actionType: string
  lastRunAt?: string
  createdAt: string
  // Platform-specific raw data
  platformData: unknown
}

// ============================================
// Unified Action Log
// ============================================

export type ActionSource = 'manual' | 'automation'
export type ActionStatus = 'success' | 'failed' | 'skipped'

export type ActionType = 'pause' | 'enable' | 'budget_change' | 'bid_change'

export interface UnifiedActionLog {
  id: string
  platform: AdsPlatform
  campaignId: string
  campaignName: string
  connectionId: string
  actionType: ActionType
  status: ActionStatus
  source: ActionSource
  executedAt: string
  previousValue?: string
  newValue?: string
  errorMessage?: string
  details?: {
    previousValue?: number
    newValue?: number
  }
  // Platform-specific raw data
  platformData?: unknown
}

// ============================================
// Platform Adapter Interface
// ============================================

export interface FetchCampaignsParams {
  connectionId?: string
  workspaceId?: string
  period: DashboardPeriod
  startDate?: string
  endDate?: string
  status?: CampaignStatusFilter
  /** Page number for pagination (1-indexed) */
  page?: number
  /** Items per page (default: 20, max: 50) */
  limit?: number
  /** Sort field (default: spend) */
  sortBy?: string
  /** Sort order (default: desc) */
  sortOrder?: 'asc' | 'desc'
  /** Force refresh from API (bypass cache) */
  forceRefresh?: boolean
}

export interface CampaignsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface FetchCampaignsResult {
  campaigns: UnifiedCampaign[]
  pagination?: CampaignsPagination
}

export interface FetchHistoryParams {
  connectionId?: string
  source?: ActionSource
  status?: ActionStatus
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface PlatformFeatures {
  hasPerformance: boolean
  hasAutomations: boolean
  hasHistory: boolean
  hasBidManagement: boolean
}

export interface PlatformAdapter {
  platform: AdsPlatform
  features: PlatformFeatures

  // Fetch campaigns with metrics (supports pagination)
  fetchCampaigns(params: FetchCampaignsParams): Promise<FetchCampaignsResult>

  // Fetch automation rules
  fetchAutomations(connectionId?: string): Promise<UnifiedAutomationRule[]>

  // Fetch action history
  fetchHistory(params: FetchHistoryParams): Promise<{
    actions: UnifiedActionLog[]
    pagination: { page: number; totalPages: number; total: number }
  }>

  // Campaign actions
  pauseCampaign(campaignId: string, connectionId: string): Promise<void>
  enableCampaign(campaignId: string, connectionId: string): Promise<void>
  updateBudget(campaignId: string, connectionId: string, budget: number): Promise<void>
}

// ============================================
// Store Types
// ============================================

export interface UnifiedAdsFilters {
  platforms: AdsPlatform[]
  period: DashboardPeriod
  startDate?: string
  endDate?: string
  connectionIds: string[]
  search: string
}

// ============================================
// Unified Ads Search API Types (New Backend)
// ============================================

export type AdsLevel = 'campaign' | 'adset' | 'ad'

export type UnifiedStatus = 'ENABLED' | 'PAUSED' | 'REMOVED'

export type AdsOrderBy =
  | 'cost'
  | 'impressions'
  | 'clicks'
  | 'conversions'
  | 'ctr'
  | 'cpa'
  | 'roas'
  | 'name'
  | 'budget'
  | 'cpc'
  | 'reach'
  | 'frequency'

/**
 * Field groups for projection pushdown
 * Used to request only specific fields from the API
 */
export type FieldGroup = 'minimal' | 'tableView' | 'extendedView' | 'expandView' | 'actionFields' | 'full'

/**
 * Source definition for unified search
 */
export interface AdsSource {
  platform: AdsPlatform
  connectionId: string
  customerId?: string        // Google
  loginCustomerId?: string   // Google
  adAccountId?: string       // Meta
}

/**
 * Unified ad object - normalized from Google and Meta
 */
export interface UnifiedAdObject {
  // Identity
  id: string
  name: string
  platform: AdsPlatform
  level: AdsLevel

  // Status
  status: UnifiedStatus
  effectiveStatus?: string

  // Hierarchy
  parentId?: string
  parentName?: string
  campaignId?: string
  campaignName?: string
  adSetId?: string
  adSetName?: string

  // Budget
  budget?: number
  budgetType?: 'daily' | 'lifetime'
  isABO?: boolean

  // Common metrics
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  cost: number
  conversions: number
  cpa: number
  roas?: number

  // Meta-specific metrics
  reach?: number
  frequency?: number
  landingPageViews?: number

  // Connection info
  connectionId: string
  connectionName: string
  accountId: string
  accountName: string

  // Objective
  objective?: string

  // Quality metrics
  qualityRanking?: string
  engagementRateRanking?: string
  conversionRateRanking?: string

  // Bidding info (Google)
  biddingStrategyType?: string
  targetCpa?: number
  targetRoas?: number
  maxCpc?: number

  // Creative info (ad level)
  thumbnailUrl?: string
  previewUrl?: string
  creativeId?: string

  // Timestamps
  createdTime?: string
  updatedTime?: string
  startTime?: string
  endTime?: string

  // Google-specific identifiers
  customerId?: string
  loginCustomerId?: string
  budgetId?: string

  // Alerts (Google)
  alerts?: string[]

  // Special categories (Meta)
  specialAdCategories?: string[]
  bidStrategy?: string

  // Learning info (Meta ad set)
  learningStageInfo?: {
    status: string
    learningPhaseExitInfo?: {
      type: string
      countNeeded?: number
    }
  }

  // Issues (Meta ad set)
  issuesInfo?: Array<{
    level: string
    errorType: string
    errorCode?: number
    errorSummary: string
    errorMessage: string
  }>

  // Targeting (Meta ad set)
  targeting?: {
    ageMin?: number
    ageMax?: number
    genders?: number[]
    geoLocations?: string[]
    interests?: string[]
    behaviors?: string[]
  }

  // Creative details (ad level)
  creative?: {
    // Common fields
    title?: string
    body?: string
    callToAction?: string
    linkUrl?: string
    imageUrl?: string
    videoUrl?: string
    urlTags?: string

    // Google RSA/ETA/DSA fields
    headlines?: string[]
    descriptions?: string[]
    finalUrl?: string
    finalUrls?: string[]
    finalMobileUrls?: string[]
    displayUrl?: string
    path1?: string
    path2?: string
    type?: string
    addedByGoogleAds?: boolean
    devicePreference?: string

    // Tracking & UTM fields (Google)
    trackingUrlTemplate?: string
    finalUrlSuffix?: string
    urlCustomParameters?: Array<{ key: string; value: string }>
    // Inherited from ad group/campaign if ad doesn't have its own
    adGroupTrackingUrlTemplate?: string
    adGroupFinalUrlSuffix?: string
    campaignTrackingUrlTemplate?: string
    campaignFinalUrlSuffix?: string
    campaignUrlCustomParameters?: Array<{ key: string; value: string }>

    // Call Ad (Google)
    callAd?: {
      countryCode?: string
      phoneNumber?: string
      businessName?: string
      headline1?: string
      headline2?: string
      description1?: string
      description2?: string
      callTracked?: boolean
      disableCallConversion?: boolean
      path1?: string
      path2?: string
    }

    // Image Ad (Google)
    imageAd?: {
      pixelWidth?: number
      pixelHeight?: number
      imageUrl?: string
      previewPixelWidth?: number
      previewPixelHeight?: number
      previewImageUrl?: string
      mimeType?: string
      name?: string
    }

    // Responsive Display Ad (Google)
    responsiveDisplayAd?: {
      headlines?: string[]
      longHeadline?: string
      descriptions?: string[]
      businessName?: string
      mainColor?: string
      accentColor?: string
      allowFlexibleColor?: boolean
      callToActionText?: string
      pricePrefix?: string
      promoText?: string
      formatSetting?: string
    }
  }

  // Failed delivery checks (Meta ad)
  failedDeliveryChecks?: Array<{
    checkName: string
    summary: string
    description: string
  }>

  // Ad review feedback (Meta ad)
  adReviewFeedback?: {
    globalStatus?: string
    placementSpecificReviews?: Array<{
      placement: string
      status: string
    }>
  }

  // Raw platform data
  platformData?: unknown
}

/**
 * Summary statistics for search results
 */
export interface AdsSummary {
  totalItems: number
  activeItems: number
  pausedItems: number
  removedItems: number
  totalImpressions: number
  totalClicks: number
  totalCost: number
  totalConversions: number
  avgCtr: number
  avgCpa: number
  avgRoas?: number
  totalReach?: number
}

/**
 * Pagination info for search results
 */
export interface AdsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

/**
 * Failed source info
 */
export interface FailedSource {
  platform: AdsPlatform
  connectionId: string
  accountId?: string
  error: string
  retryable: boolean
}

/**
 * Search response from POST /ads/search
 */
export interface AdsSearchResponse {
  success: boolean
  items: UnifiedAdObject[]
  summary: AdsSummary
  pagination: AdsPagination
  metadata: {
    level: AdsLevel
    dateRange: { start: string; end: string }
    sourcesQueried: number
    sourcesSucceeded: number
    cachedAt: string | null
  }
  failedSources?: FailedSource[]
}

/**
 * Expand response from POST /ads/expand
 */
export interface AdsExpandResponse {
  success: boolean
  items: UnifiedAdObject[]
  metadata: {
    parentLevel: AdsLevel
    parentId: string
    childLevel: AdsLevel
  }
  error?: string
}

/**
 * Action response from POST /ads/actions/*
 */
export interface AdsActionResponse {
  success: boolean
  message?: string
  error?: string
  objectId?: string
  previousStatus?: string
  newStatus?: UnifiedStatus
  previousBudget?: number
  newBudget?: number
  actionLogId?: string
}
