/**
 * Unified Ad Object Types
 * Unified data structures for campaigns, ad sets, and ads from Google and Meta
 */

// ============================================
// Enums
// ============================================

export type AdsPlatform = "google" | "meta";

export type AdsLevel = "campaign" | "adset" | "ad";

export type UnifiedStatus = "ENABLED" | "PAUSED" | "REMOVED";

export type AdsPeriod =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_30d"
  | "this_month"
  | "last_month"
  | "custom";

export type AdsOrderBy =
  | "cost"
  | "impressions"
  | "clicks"
  | "conversions"
  | "ctr"
  | "cpa"
  | "roas"
  | "name"
  | "budget"
  | "cpc"
  | "reach"
  | "frequency";

// ============================================
// Source Definition
// ============================================

export interface AdsSource {
  platform: AdsPlatform;
  connectionId: string;
  // Google-specific
  customerId?: string;
  loginCustomerId?: string;
  // Meta-specific
  adAccountId?: string;
}

// ============================================
// Unified Ad Object
// ============================================

export interface UnifiedAdObject {
  // Identity
  id: string;
  name: string;
  platform: AdsPlatform;
  level: AdsLevel;

  // Status
  status: UnifiedStatus;
  effectiveStatus?: string;

  // Hierarchy references
  parentId?: string;
  parentName?: string;
  campaignId?: string;
  campaignName?: string;
  adSetId?: string;
  adSetName?: string;

  // Budget (campaign/adset level)
  budget?: number;
  budgetType?: "daily" | "lifetime";
  isABO?: boolean;

  // Common metrics
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cost: number;
  conversions: number;
  cpa: number;
  roas?: number;

  // Meta-specific metrics
  reach?: number;
  frequency?: number;
  landingPageViews?: number;

  // Connection info
  connectionId: string;
  connectionName: string;
  accountId: string;
  accountName: string;

  // Objective (campaign level)
  objective?: string;

  // Quality metrics
  qualityRanking?: string;
  engagementRateRanking?: string;
  conversionRateRanking?: string;

  // Bidding info (Google)
  biddingStrategyType?: string;
  targetCpa?: number;
  targetRoas?: number;
  maxCpc?: number;

  // Creative info (ad level)
  thumbnailUrl?: string;
  previewUrl?: string;
  creativeId?: string;

  // Timestamps
  createdTime?: string;
  updatedTime?: string;
  startTime?: string;
  endTime?: string;

  // Google-specific identifiers (for actions)
  customerId?: string;
  loginCustomerId?: string;
  budgetId?: string;

  // Alerts (Google)
  alerts?: string[];

  // Special categories (Meta)
  specialAdCategories?: string[];
  bidStrategy?: string;

  // Learning info (Meta ad set)
  learningStageInfo?: {
    status: string;
    learningPhaseExitInfo?: {
      type: string;
      countNeeded?: number;
    };
  };

  // Issues (Meta ad set)
  issuesInfo?: Array<{
    level: string;
    errorType: string;
    errorCode?: number;
    errorSummary: string;
    errorMessage: string;
  }>;

  // Targeting (Meta ad set)
  targeting?: {
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    geoLocations?: string[];
    interests?: string[];
    behaviors?: string[];
  };

  // Creative details (ad level)
  creative?: {
    // Common fields
    title?: string;
    body?: string;
    callToAction?: string;
    linkUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
    urlTags?: string;

    // Google RSA/ETA/DSA fields
    headlines?: string[];
    descriptions?: string[];
    finalUrl?: string;
    finalUrls?: string[];
    finalMobileUrls?: string[];
    displayUrl?: string;
    path1?: string;
    path2?: string;
    type?: string;
    addedByGoogleAds?: boolean;
    devicePreference?: string;

    // Tracking & UTM fields (Google)
    trackingUrlTemplate?: string;
    finalUrlSuffix?: string;
    urlCustomParameters?: Array<{ key: string; value: string }>;
    // Inherited from ad group/campaign if ad doesn't have its own
    adGroupTrackingUrlTemplate?: string;
    adGroupFinalUrlSuffix?: string;
    campaignTrackingUrlTemplate?: string;
    campaignFinalUrlSuffix?: string;
    campaignUrlCustomParameters?: Array<{ key: string; value: string }>;

    // Call Ad (Google)
    callAd?: {
      countryCode?: string;
      phoneNumber?: string;
      businessName?: string;
      headline1?: string;
      headline2?: string;
      description1?: string;
      description2?: string;
      callTracked?: boolean;
      disableCallConversion?: boolean;
      path1?: string;
      path2?: string;
    };

    // Image Ad (Google)
    imageAd?: {
      pixelWidth?: number;
      pixelHeight?: number;
      imageUrl?: string;
      previewPixelWidth?: number;
      previewPixelHeight?: number;
      previewImageUrl?: string;
      mimeType?: string;
      name?: string;
    };

    // Responsive Display Ad (Google)
    responsiveDisplayAd?: {
      headlines?: string[];
      longHeadline?: string;
      descriptions?: string[];
      businessName?: string;
      mainColor?: string;
      accentColor?: string;
      allowFlexibleColor?: boolean;
      callToActionText?: string;
      pricePrefix?: string;
      promoText?: string;
      formatSetting?: string;
    };
  };

  // Failed delivery checks (Meta ad)
  failedDeliveryChecks?: Array<{
    checkName: string;
    summary: string;
    description: string;
  }>;

  // Ad review feedback (Meta ad)
  adReviewFeedback?: {
    globalStatus?: string;
    placementSpecificReviews?: Array<{
      placement: string;
      status: string;
    }>;
  };

  // Raw platform data (for actions that need original format)
  platformData?: unknown;
}

// ============================================
// Summary Stats
// ============================================

export interface AdsSummary {
  totalItems: number;
  activeItems: number;
  pausedItems: number;
  removedItems: number;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  totalConversions: number;
  avgCtr: number;
  avgCpa: number;
  avgRoas?: number;
  totalReach?: number;
}

// ============================================
// Pagination
// ============================================

export interface AdsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================
// Failed Source
// ============================================

export interface FailedSource {
  platform: AdsPlatform;
  connectionId: string;
  accountId?: string;
  error: string;
  retryable: boolean;
}

// ============================================
// Search Response
// ============================================

export interface AdsSearchResponse {
  success: boolean;
  items: UnifiedAdObject[];
  summary: AdsSummary;
  pagination: AdsPagination;
  metadata: {
    level: AdsLevel;
    dateRange: { start: string; end: string };
    sourcesQueried: number;
    sourcesSucceeded: number;
    cachedAt: string | null;
  };
  failedSources?: FailedSource[];
}

// ============================================
// Expand Response
// ============================================

export interface AdsExpandResponse {
  success: boolean;
  items: UnifiedAdObject[];
  metadata: {
    parentLevel: AdsLevel;
    parentId: string;
    childLevel: AdsLevel;
  };
  error?: string;
}

// ============================================
// Action Response
// ============================================

export interface AdsActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  objectId?: string;
  previousStatus?: string;
  newStatus?: UnifiedStatus;
  previousBudget?: number;
  newBudget?: number;
  actionLogId?: string;
}
