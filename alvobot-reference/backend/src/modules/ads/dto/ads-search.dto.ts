/**
 * Ads Search DTOs
 * Request/Response DTOs for the unified ads search endpoint
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsDateString,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import {
  AdsPlatform,
  AdsLevel,
  AdsPeriod,
  AdsOrderBy,
} from "../types/unified-ad-object";

// ============================================
// Field Groups for Projection
// ============================================

/**
 * Predefined field groups for common use cases
 * This enables projection pushdown - only fetch fields needed for the view
 */
export const FIELD_GROUPS = {
  // Minimal fields for ID lookups
  minimal: ["id", "name", "platform", "level", "status", "connectionId"],

  // Standard table view fields
  tableView: [
    "id",
    "name",
    "platform",
    "level",
    "status",
    "effectiveStatus",
    "connectionId",
    "connectionName",
    "accountId",
    "accountName",
    "budget",
    "budgetType",
    "budgetId",
    "isABO",
    "objective",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "cost",
    "conversions",
    "cpa",
    "roas",
    "reach",
    "frequency",
    "landingPageViews",
    // Platform-specific IDs for actions (Google: customerId/loginCustomerId, Meta: adAccountId)
    "customerId",
    "loginCustomerId",
    "adAccountId",
  ],

  // Extended view with Meta-specific metrics + quality rankings
  extendedView: [
    "id",
    "name",
    "platform",
    "level",
    "status",
    "effectiveStatus",
    "connectionId",
    "connectionName",
    "accountId",
    "accountName",
    "budget",
    "budgetType",
    "isABO",
    "objective",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "cost",
    "conversions",
    "cpa",
    "roas",
    "reach",
    "frequency",
    "landingPageViews",
    "qualityRanking",
    "engagementRateRanking",
    "conversionRateRanking",
  ],

  // Expand view with hierarchy info
  expandView: [
    "id",
    "name",
    "platform",
    "level",
    "status",
    "effectiveStatus",
    "connectionId",
    "connectionName",
    "accountId",
    "accountName",
    "budget",
    "budgetType",
    "isABO",
    "objective",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "cost",
    "conversions",
    "cpa",
    "roas",
    "reach",
    "frequency",
    "landingPageViews",
    "parentId",
    "parentName",
    "campaignId",
    "campaignName",
    "adSetId",
    "adSetName",
    "learningStageInfo",
    "issuesInfo",
  ],

  // Action fields for pause/enable/budget
  actionFields: [
    "id",
    "platform",
    "level",
    "status",
    "connectionId",
    "customerId",
    "loginCustomerId",
    "budgetId",
    "accountId",
  ],

  // All fields (no projection)
  full: ["*"],
} as const;

export type FieldGroup = keyof typeof FIELD_GROUPS;

// ============================================
// Metric Filter DTO
// ============================================

export type FilterOperator = "gt" | "lt" | "eq" | "between";

export type FilterableMetric =
  | "impressions"
  | "clicks"
  | "conversions"
  | "cost"
  | "cpc"
  | "cpa"
  | "ctr"
  | "conversionRate"
  | "roas";

export class MetricFilterDto {
  @IsString()
  id: string;

  @IsIn([
    "impressions",
    "clicks",
    "conversions",
    "cost",
    "cpc",
    "cpa",
    "ctr",
    "conversionRate",
    "roas",
  ])
  metric: FilterableMetric;

  @IsIn(["gt", "lt", "eq", "between"])
  operator: FilterOperator;

  @IsNumber()
  @Type(() => Number)
  value: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  value2?: number;
}

// ============================================
// Source DTO
// ============================================

export class AdsSourceDto {
  @IsEnum(["google", "meta"])
  platform: AdsPlatform;

  @IsString()
  connectionId: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  loginCustomerId?: string;

  @IsOptional()
  @IsString()
  adAccountId?: string;
}

// ============================================
// Search Request DTO
// ============================================

export class AdsSearchRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdsSourceDto)
  sources: AdsSourceDto[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(["campaign", "adset", "ad"])
  level: AdsLevel;

  @IsOptional()
  @IsEnum(["ENABLED", "PAUSED", "REMOVED", "all"])
  status?: "ENABLED" | "PAUSED" | "REMOVED" | "all";

  @IsOptional()
  @IsString()
  nameContains?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsEnum([
    "cost",
    "impressions",
    "clicks",
    "conversions",
    "ctr",
    "cpa",
    "roas",
    "name",
    "budget",
    "cpc",
    "reach",
    "frequency",
  ])
  orderBy?: AdsOrderBy;

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  forceRefresh?: boolean;

  /**
   * Field selection for projection pushdown
   * Can be:
   * - Array of specific field names: ['id', 'name', 'status', 'cost']
   * - A field group name: 'tableView', 'expandView', 'minimal'
   * - Omitted to get all fields (default behavior)
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  /**
   * Use a predefined field group instead of specifying fields
   * Takes precedence over `fields` if both are provided
   */
  @IsOptional()
  @IsIn([
    "minimal",
    "tableView",
    "extendedView",
    "expandView",
    "actionFields",
    "full",
  ])
  fieldGroup?: FieldGroup;

  /**
   * Advanced metric filters (e.g., impressions > 1000, cost < 100)
   * Applied server-side before pagination
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricFilterDto)
  metricFilters?: MetricFilterDto[];

  /**
   * When true, only returns campaigns created by AlvoBot.
   * Backend resolves the campaign IDs from Supabase (campaign_templates + ad_campaign_templates).
   * Applied server-side before pagination so totals and summary are correct.
   */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  alvobotOnly?: boolean;

  /**
   * Workspace ID for scoping AlvoBot campaign lookup.
   * Required when alvobotOnly is true.
   */
  @IsOptional()
  @IsString()
  workspaceId?: string;

  /**
   * Filter by specific ad account IDs (e.g., Meta ad account IDs).
   * Applied server-side before pagination so totals and pagination are correct.
   * This prevents the client-side account filtering mismatch with server pagination.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accountIds?: string[];
}

// ============================================
// Period Helper - Maps period string to date range
// ============================================

export function getDateRangeFromPeriod(period: AdsPeriod): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let startDate: Date;
  let endDate: Date = today;

  switch (period) {
    case "today":
      startDate = today;
      break;
    case "yesterday":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      endDate = new Date(startDate);
      break;
    case "last_7d":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case "last_30d":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      break;
    case "this_month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "last_month":
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
