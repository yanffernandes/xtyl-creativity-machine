/**
 * Meta Campaign Metrics DTOs
 * T039: DTOs for Meta dashboard campaign metrics
 *
 * These DTOs define the request/response structures for the Meta dashboard API,
 * following the same patterns as Google Ads dashboard.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

// ============================================
// Enums
// ============================================

export enum MetaDashboardPeriod {
  TODAY = "today",
  YESTERDAY = "yesterday",
  LAST_7D = "last_7d",
  LAST_30D = "last_30d",
  THIS_MONTH = "this_month",
  LAST_MONTH = "last_month",
  CUSTOM = "custom",
}

export enum MetaCampaignStatusFilter {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  ALL = "all",
}

export enum MetaCampaignStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  DELETED = "DELETED",
  ARCHIVED = "ARCHIVED",
}

// ============================================
// Request DTOs
// ============================================

export class GetMetaCampaignsQueryDto {
  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  adAccountId?: string;

  @IsOptional()
  @IsEnum(MetaDashboardPeriod)
  period?: MetaDashboardPeriod;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsEnum(MetaCampaignStatusFilter)
  status?: MetaCampaignStatusFilter;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc";

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  forceRefresh?: boolean;

  /** Page number for pagination (1-indexed) */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  /** Number of items per page (default: 20, max: 50) */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class MetaCampaignActionDto {
  @IsString()
  connectionId: string;

  @IsOptional()
  @IsString()
  adAccountId?: string;
}

export class MetaUpdateBudgetDto {
  @IsString()
  connectionId: string;

  @IsString()
  adAccountId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  newBudget: number;

  @IsOptional()
  @IsString()
  budgetId?: string;
}

// ============================================
// Response Types
// ============================================

export interface MetaCampaignMetrics {
  id: string;
  name: string;
  status: MetaCampaignStatus;
  /** Effective status considering parent campaign status */
  effectiveStatus?: string;
  objective: string;
  dailyBudget: number;
  lifetimeBudget: number;
  budgetType: "daily" | "lifetime";
  /** True when budget is set at Ad Set level (ABO) instead of Campaign level (CBO) */
  isABO: boolean;
  /** Bid strategy (LOWEST_COST_WITHOUT_CAP, COST_CAP, LOWEST_COST_WITH_BID_CAP, LOWEST_COST_WITH_MIN_ROAS) */
  bidStrategy?: string;
  /** Special ad categories (HOUSING, EMPLOYMENT, CREDIT, etc) */
  specialAdCategories?: string[];
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  reach: number;
  frequency: number;
  conversions: number;
  cpa: number;
  roas: number;
  /** Quality ranking (BELOW_AVERAGE_10, BELOW_AVERAGE_20, BELOW_AVERAGE_35, AVERAGE, ABOVE_AVERAGE) */
  qualityRanking?: string;
  /** Engagement rate ranking */
  engagementRateRanking?: string;
  /** Conversion rate ranking */
  conversionRateRanking?: string;
  /** Landing page views */
  landingPageViews?: number;
  startTime?: string;
  stopTime?: string;
  createdTime: string;
  updatedTime: string;
}

export interface MetaDashboardCampaign extends MetaCampaignMetrics {
  connectionId: string;
  connectionName: string;
  adAccountId: string;
  adAccountName: string;
}

export interface MetaDashboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface MetaDashboardResponse {
  success: boolean;
  campaigns: MetaDashboardCampaign[];
  totals: {
    totalCampaigns: number;
    activeCampaigns: number;
    pausedCampaigns: number;
    totalImpressions: number;
    totalClicks: number;
    totalSpend: number;
    totalConversions: number;
    avgCtr: number;
    avgCpa: number;
  };
  /** Pagination info - only present when using paginated requests */
  pagination?: MetaDashboardPagination;
  error?: string;
}

export interface MetaCampaignActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  campaignId?: string;
  newStatus?: MetaCampaignStatus;
}

export interface MetaBudgetUpdateResponse {
  success: boolean;
  message?: string;
  error?: string;
  campaignId?: string;
  oldBudget?: number;
  newBudget?: number;
}

// ============================================
// Action Log Types
// ============================================

export interface MetaActionLogEntry {
  id: string;
  connectionId: string;
  adAccountId: string;
  campaignId: string;
  campaignName: string;
  actionType: "pause" | "enable" | "budget_update" | "bid_update";
  source: "manual" | "automation";
  status: "success" | "failed" | "pending";
  oldValue?: string;
  newValue?: string;
  errorMessage?: string;
  createdAt: string;
  userId: string;
}

export interface MetaActionLogFilters {
  connectionId?: string;
  adAccountId?: string;
  campaignId?: string;
  actionType?: MetaActionLogEntry["actionType"];
  source?: MetaActionLogEntry["source"];
  status?: MetaActionLogEntry["status"];
  startDate?: string;
  endDate?: string;
}

// ============================================
// Campaign Hierarchy Types (Ad Sets and Ads)
// ============================================

export interface MetaAdMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  cpa: number;
  /** Quality ranking (BELOW_AVERAGE_10, BELOW_AVERAGE_20, BELOW_AVERAGE_35, AVERAGE, ABOVE_AVERAGE) */
  qualityRanking?: string;
  /** Engagement rate ranking */
  engagementRateRanking?: string;
  /** Conversion rate ranking */
  conversionRateRanking?: string;
  /** Landing page views */
  landingPageViews?: number;
}

export interface MetaAd {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  creativeId?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  effectiveStatus?: string;
  /** Configured status by user (vs effective_status which considers parent states) */
  configuredStatus?: string;
  /** Failed delivery checks - reasons why ad isn't delivering */
  failedDeliveryChecks?: Array<{
    checkName: string;
    summary: string;
    description: string;
  }>;
  /** Ad review feedback - issues from ad review process */
  adReviewFeedback?: {
    globalStatus?: string;
    placementSpecificReviews?: Array<{
      placement: string;
      status: string;
    }>;
  };
  metrics: MetaAdMetrics;
  // Creative details
  creative?: {
    title?: string;
    body?: string;
    callToAction?: string;
    linkUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
    /** UTM tags configured on the creative */
    urlTags?: string;
  };
}

/** Learning stage info for ad sets */
export interface MetaLearningStageInfo {
  /** Learning phase status (LEARNING, LEARNING_LIMITED, SUCCESS, etc) */
  status: string;
  /** Number of conversions needed to exit learning */
  learningPhaseExitInfo?: {
    type: string;
    countNeeded?: number;
  };
}

/** Issues preventing delivery */
export interface MetaAdSetIssue {
  level: string;
  errorType: string;
  errorCode?: number;
  errorSummary: string;
  errorMessage: string;
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "DELETED" | "ARCHIVED";
  /** Effective status considering campaign status */
  effectiveStatus?: string;
  optimizationGoal?: string;
  billingEvent?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  bidAmount?: number;
  /** Destination type (WEBSITE, APP, MESSENGER, INSTAGRAM_DIRECT) */
  destinationType?: string;
  /** Learning stage info - shows if ML is still learning */
  learningStageInfo?: MetaLearningStageInfo;
  /** Issues preventing delivery */
  issuesInfo?: MetaAdSetIssue[];
  /** Start time */
  startTime?: string;
  /** End time */
  endTime?: string;
  targeting?: {
    ageMin?: number;
    ageMax?: number;
    genders?: number[];
    geoLocations?: string[];
    interests?: string[];
    behaviors?: string[];
  };
  metrics: MetaAdMetrics;
  ads: MetaAd[];
}

export interface MetaCampaignHierarchyResponse {
  success: boolean;
  adSets?: MetaAdSet[];
  error?: string;
}

export class GetMetaCampaignHierarchyDto {
  @IsString()
  connectionId: string;

  @IsOptional()
  @IsString()
  adAccountId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
