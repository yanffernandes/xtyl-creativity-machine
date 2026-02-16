import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsEnum,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";

// ============================================================================
// FIELD SELECTION (Projection Pushdown)
// ============================================================================

/**
 * Available metrics that can be requested.
 * Used for projection pushdown to reduce payload size.
 */
export enum RevenueMetricField {
  REVENUE = "revenue",
  IMPRESSIONS = "impressions",
  CLICKS = "clicks",
  REQUESTS = "requests",
  CTR = "ctr",
  CPC = "cpc",
  RPM = "rpm",
  RPS = "rps",
  PMR = "pmr",
  VIEWABILITY = "viewability",
  FILL_RATE = "fillRate",
}

/**
 * Predefined field groups for common use cases.
 * Reduces the need to specify individual fields.
 */
export enum RevenueFieldGroup {
  /** Only essential metrics: revenue, impressions, clicks */
  SUMMARY = "summary",
  /** Default table view: revenue, impressions, clicks, ctr, rpm, cpc */
  TABLE_VIEW = "tableView",
  /** All available metrics */
  FULL = "full",
}

/**
 * Mapping of field groups to their metric sets.
 */
export const FIELD_GROUP_METRICS: Record<
  RevenueFieldGroup,
  RevenueMetricField[]
> = {
  [RevenueFieldGroup.SUMMARY]: [
    RevenueMetricField.REVENUE,
    RevenueMetricField.IMPRESSIONS,
    RevenueMetricField.CLICKS,
  ],
  [RevenueFieldGroup.TABLE_VIEW]: [
    RevenueMetricField.REVENUE,
    RevenueMetricField.IMPRESSIONS,
    RevenueMetricField.CLICKS,
    RevenueMetricField.CTR,
    RevenueMetricField.RPM,
    RevenueMetricField.CPC,
  ],
  [RevenueFieldGroup.FULL]: Object.values(RevenueMetricField),
};

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Pagination metadata returned with paginated responses.
 */
export interface PaginationMeta {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items (across all pages) */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPrevPage: boolean;
}

// Source definition for the request
export class RevenueSourceDto {
  @IsIn(["ad_manager", "adsense"])
  type: "ad_manager" | "adsense";

  @IsString()
  connectionId: string;

  @IsOptional()
  @IsString()
  networkId?: string; // Required for ad_manager

  @IsOptional()
  @IsString()
  accountId?: string; // Required for adsense
}

// GroupBy options - determines which dimension to query
export type RevenueGroupBy =
  | "domain" // TOP_PRIVATE_DOMAIN only
  | "date_day" // DATE only
  | "date_week" // DATE (aggregated to weeks)
  | "date_month" // DATE (aggregated to months)
  | "url" // KEY_VALUES_NAME (slug only)
  | "url_full" // KEY_VALUES_NAME (full path)
  | "country"; // COUNTRY_CODE + COUNTRY_NAME

// Request DTO for unified revenue report
export class RevenueReportRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RevenueSourceDto)
  sources: RevenueSourceDto[];

  @IsString()
  startDate: string; // YYYY-MM-DD

  @IsString()
  endDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsIn([
    "domain",
    "date_day",
    "date_week",
    "date_month",
    "url",
    "url_full",
    "country",
  ])
  groupBy?: RevenueGroupBy = "domain";

  @IsOptional()
  @IsString()
  sortBy?: string = "revenue";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean = false;

  // ============================================================================
  // PAGINATION PARAMETERS
  // ============================================================================

  /**
   * Page number (1-indexed).
   * If not provided, returns all results (no pagination).
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  /**
   * Number of items per page.
   * Only applies when `page` is provided.
   * @default 50
   * @max 200
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  // ============================================================================
  // FIELD SELECTION PARAMETERS
  // ============================================================================

  /**
   * Predefined field group for common use cases.
   * Use this for quick selection of metric sets.
   * Ignored if `metrics` is provided.
   * @default "tableView"
   */
  @IsOptional()
  @IsEnum(RevenueFieldGroup)
  fieldGroup?: RevenueFieldGroup;

  /**
   * Custom list of metrics to return.
   * Takes precedence over `fieldGroup`.
   * Use for fine-grained control over response payload.
   */
  @IsOptional()
  @IsArray()
  @IsEnum(RevenueMetricField, { each: true })
  @ArrayMinSize(1)
  metrics?: RevenueMetricField[];
}

// Request DTO for hierarchical expand
export class RevenueExpandRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RevenueSourceDto)
  sources: RevenueSourceDto[];

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsIn([
    "domain",
    "date_day",
    "date_week",
    "date_month",
    "url",
    "url_full",
    "country",
  ])
  primaryGroupBy: RevenueGroupBy;

  @IsIn([
    "none",
    "total",
    "date_day",
    "date_week",
    "date_month",
    "url",
    "url_full",
    "domain",
    "country",
  ])
  subGroupBy: string;

  @IsString()
  parentKey: string;

  @IsOptional()
  @IsString()
  parentDomain?: string; // For date groupings that need domain context

  @IsOptional()
  @IsString()
  sortBy?: string = "revenue";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean = false;
}

// Response types
export interface RevenueMetrics {
  revenue: number;
  impressions: number;
  clicks: number;
  requests: number;
  ctr: number;
  cpc: number;
  rpm: number; // eCPM
  rps: number; // Revenue per 1000 requests
  pmr: number; // Page match rate
  viewability: number;
  fillRate: number;
}

export interface RevenueRow {
  // Identifiers
  id: string; // Unique row ID (source-connection-key)
  source: "ad_manager" | "adsense";
  connectionId: string;
  networkId?: string;
  accountId?: string;

  // Grouping key (varies by groupBy)
  key: string; // The grouping value (domain, date, url, country code)
  label: string; // Human-readable label

  // Additional context
  domain?: string; // Always included when available
  country?: string;
  countryCode?: string;

  // Currency info (for multi-currency normalization)
  originalCurrencyCode?: string; // Original currency before conversion to USD
  originalRevenue?: number; // Original revenue amount before conversion
  exchangeRate?: number; // Exchange rate used for conversion (1 originalCurrency = X USD)

  // Metrics
  metrics: RevenueMetrics;

  // For aggregated rows (multiple sources combined)
  childCount?: number;
  aggregatedSources?: Array<{
    source: "ad_manager" | "adsense";
    connectionId: string;
    networkId?: string;
    accountId?: string;
  }>;
}

export interface RevenueSummary {
  revenue: number;
  impressions: number;
  clicks: number;
  requests: number;
  ctr: number;
  cpc: number;
  rpm: number;
  currency: string;
  hasMultipleCurrencies: boolean;
  currencies: string[];
  conversionMessage?: string;
}

// Failed source info for user feedback (Nielsen's Error Prevention & Recovery)
export interface FailedSourceDto {
  type: "ad_manager" | "adsense";
  connectionId: string;
  networkId?: string;
  accountId?: string;
  name: string; // Human-readable name for display
  error: string; // User-friendly error message
  retryable: boolean; // Whether the error is transient and might succeed on retry
}

export interface RevenueReportResponseDto {
  rows: RevenueRow[];
  summary: RevenueSummary;
  metadata: {
    groupBy: RevenueGroupBy;
    dateRange: {
      start: string;
      end: string;
    };
    sourcesQueried: number;
    sourcesSucceeded: number;
    sourcesFailed: number;
    cachedAt: string | null;
    /** Metrics that were requested (for debugging/transparency) */
    requestedMetrics?: RevenueMetricField[];
  };
  /**
   * Pagination info (only present when page parameter is provided).
   * Summary is always for ALL data, not just the current page.
   */
  pagination?: PaginationMeta;
  // Failed sources for user notification (empty if all succeeded)
  failedSources?: FailedSourceDto[];
}

export interface RevenueExpandResponseDto {
  items: Array<{
    key: string;
    label: string;
    groupType: string;
    childCount: number;
    country?: string;
    countryCode?: string;
    // Currency conversion info (for multi-currency normalization)
    originalCurrencyCode?: string;
    originalRevenue?: number;
    exchangeRate?: number;
    metrics: RevenueMetrics;
  }>;
  metadata: {
    primaryGroupBy: string;
    subGroupBy: string;
    parentKey: string;
  };
}

// Request DTO for fetching active networks (batch)
export class ActiveNetworksRequestDto {
  @IsArray()
  @IsString({ each: true })
  connectionIds: string[];
}

// Response for active networks
export interface ActiveNetworkDto {
  id: string;
  name: string;
  currencyCode: string;
  connectionId: string;
}

export interface ActiveNetworksResponseDto {
  success: boolean;
  networks: ActiveNetworkDto[];
}
