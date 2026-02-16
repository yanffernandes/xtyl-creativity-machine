import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsIn,
  IsUUID,
  IsBoolean,
} from "class-validator";

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

export class InitiateAdSenseOAuthDto {
  @IsString()
  connectionName: string;

  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsString()
  reconnectConnectionId?: string;
}

export class GetAdSenseAccountsDto {
  @IsUUID()
  connectionId: string;
}

export class GenerateAdSenseReportDto {
  @IsUUID()
  connectionId: string;

  @IsString()
  accountId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dimensions?: ("DATE" | "DOMAIN_NAME" | "URL_CHANNEL_NAME")[];

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
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

export class RefreshAdSenseCacheDto {
  @IsUUID()
  connectionId: string;

  @IsString()
  accountId: string;
}

export class ExpandAdSenseReportDto {
  @IsUUID()
  connectionId: string;

  @IsString()
  accountId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsIn(["date", "url"])
  level: "date" | "url";

  @IsString()
  parentSite: string;

  @IsOptional()
  @IsString()
  parentDate?: string; // Required if level = 'url'

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

// Unified Expand DTO - supports both legacy and hierarchical formats
export class UnifiedAdSenseExpandDto {
  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  // Legacy fields
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  parentSite?: string;

  @IsOptional()
  @IsString()
  parentDate?: string;

  // Hierarchical fields
  @IsOptional()
  @IsString()
  primaryGroupBy?: string;

  @IsOptional()
  @IsString()
  subGroupBy?: string;

  @IsOptional()
  @IsString()
  parentKey?: string;

  // Common fields
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

// Hierarchical types
// url = slug only (path without query params)
// url_full = full URL with query params
export type PrimaryGroupBy =
  | "domain"
  | "url"
  | "url_full"
  | "date_day"
  | "date_week"
  | "date_month"
  | "country";
export type SubGroupBy =
  | "none"
  | "total"
  | "date_day"
  | "date_week"
  | "date_month"
  | "url"
  | "url_full"
  | "domain"
  | "country";

export interface HierarchicalAdSenseItem {
  key: string;
  label: string;
  groupType: string;
  childCount: number;
  country?: string;
  countryCode?: string;
  pageUrl?: string; // Full URL with UTM params (AdSense PAGE_URL dimension)
  metrics: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    rpm: number;
  };
}

export interface HierarchicalAdSenseExpandResponse {
  items: HierarchicalAdSenseItem[];
  metadata: {
    primaryGroupBy: string;
    subGroupBy: string;
    parentKey: string;
  };
}

// Response interfaces for expand
export interface AdSenseExpandDateData {
  date: string;
  metrics: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    rpm: number;
  };
}

export interface AdSenseExpandUrlData {
  url: string;
  metrics: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    rpm: number;
  };
}

// Summary Request DTO (for lazy loading - totals only, no dimensions)
export class AdSenseSummaryRequestDto {
  @IsUUID()
  connectionId: string;

  @IsString()
  accountId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean = false;
}

// Summary Response DTO (aggregated totals only)
export interface AdSenseSummaryMetrics {
  revenue: number; // Total revenue in account currency
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  rpm: number;
}

export interface AdSenseSummaryResponseDto {
  metrics: AdSenseSummaryMetrics;
  metadata: {
    accountId: string;
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
