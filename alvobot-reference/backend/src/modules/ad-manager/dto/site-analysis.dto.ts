import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

// Request DTOs

class SiteAnalysisFiltersDto {
  @IsOptional()
  @IsString()
  site?: string;

  @IsOptional()
  @IsString()
  requestUri?: string;
}

class PaginationDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  pageSize?: number = 50;
}

// GroupBy options matching frontend
// url = slug only (path without query params)
// url_full = full URL with query params
export type GroupByOption =
  | "domain"
  | "date_day"
  | "date_week"
  | "date_month"
  | "url"
  | "url_full"
  | "country";

// SubGroupBy options for hierarchical expansion
export type SubGroupByOption =
  | "none"
  | "total"
  | "date_day"
  | "date_week"
  | "date_month"
  | "url"
  | "url_full"
  | "domain"
  | "country";

export class SiteAnalysisRequestDto {
  @IsString()
  connectionId: string;

  @IsString()
  networkId: string;

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
  groupBy?: GroupByOption = "domain";

  @IsOptional()
  @ValidateNested()
  @Type(() => SiteAnalysisFiltersDto)
  filters?: SiteAnalysisFiltersDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination?: PaginationDto;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean = false;
}

export class RefreshCacheRequestDto {
  @IsString()
  connectionId: string;

  @IsString()
  networkId: string;
}

// Response DTOs

export interface MetricsData {
  revenue: number;
  rps: number;
  ecpm: number;
  pmr: number;
  viewability: number;
  cpc: number;
  ctr: number;
  clicks: number;
  impressions: number;
  requests: number;
  // New metrics from API
  fillRate: number; // requests > 0 ? (impressions / requests) * 100 : 0
  viewableImpressions: number;
  measurableImpressions: number;
  unfilledImpressions: number;
}

export interface SiteData {
  site: string; // Key-value (e.g., land_uri=/path)
  domain: string; // Top private domain (e.g., example.com)
  country?: string; // Country name (e.g., "Brazil", "United States")
  countryCode?: string; // Country code (e.g., "BR", "US")
  childCount: number;
  metrics: MetricsData;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SiteAnalysisMetadata {
  networkId: string;
  currencyCode: string;
  dateRange: {
    start: string;
    end: string;
  };
  cachedAt: string | null;
}

export interface SiteAnalysisResponseDto {
  data: SiteData[];
  pagination: PaginationInfo;
  metadata: SiteAnalysisMetadata;
}

export interface RefreshCacheResponseDto {
  success: boolean;
  message: string;
}

// Summary Request DTO (for lazy loading - totals only, no dimensions)
export class SummaryRequestDto {
  @IsString()
  connectionId: string;

  @IsString()
  networkId: string;

  @IsString()
  startDate: string; // YYYY-MM-DD

  @IsString()
  endDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean = false;
}

// Summary Response DTO (aggregated totals only)
export interface SummaryMetrics {
  revenue: number; // Total revenue in dollars
  impressions: number;
  clicks: number;
  requests: number;
  ctr: number;
  cpc: number;
  rpm: number;
  viewability: number;
  fillRate: number;
}

export interface SummaryResponseDto {
  metrics: SummaryMetrics;
  metadata: {
    networkId: string;
    currencyCode: string;
    dateRange: {
      start: string;
      end: string;
    };
    cachedAt: string | null;
    cacheExpiresAt: string | null;
    cacheTTL: number; // TTL in milliseconds
  };
}

// Consolidated Metrics DTO (for Google Ads dashboard integration)
export class ConsolidatedMetricsRequestDto {
  @IsString()
  connectionId: string;

  @IsString()
  networkId: string;

  @IsString()
  startDate: string; // YYYY-MM-DD

  @IsString()
  endDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  landUriFilter?: string; // Optional filter to match specific land_uri patterns

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean = false;
}

export interface ConsolidatedMetricsData {
  totalRevenue: number;
  totalImpressions: number;
  totalClicks: number;
  ecpm: number;
  ctr: number;
  matchedRows: number; // Number of rows that matched the filter
}

// Individual land_uri metrics
export interface LandUriMetrics {
  landUri: string; // The land_uri value (e.g., "/en/some-page")
  revenue: number; // In USD (dollars)
  impressions: number;
  clicks: number;
  ecpm: number;
  ctr: number;
}

export interface ConsolidatedMetricsResponseDto {
  data: ConsolidatedMetricsData;
  // Breakdown by land_uri for matching with campaigns
  byLandUri: LandUriMetrics[];
  metadata: {
    networkId: string;
    currencyCode: string; // Always 'USD' for Ad Manager
    dateRange: {
      start: string;
      end: string;
    };
    landUriFilter?: string;
    cachedAt: string | null;
  };
}
