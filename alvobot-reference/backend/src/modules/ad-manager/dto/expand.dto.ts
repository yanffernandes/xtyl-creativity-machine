import { IsString, IsOptional, IsBoolean, IsIn } from "class-validator";
import { MetricsData, SubGroupByOption } from "./site-analysis.dto";

// Legacy Request DTO (for backwards compatibility)
export class ExpandRequestDto {
  @IsString()
  connectionId: string;

  @IsString()
  networkId: string;

  @IsString()
  startDate: string; // YYYY-MM-DD

  @IsString()
  endDate: string; // YYYY-MM-DD

  @IsIn(["date", "uri"])
  level: "date" | "uri";

  @IsString()
  parentSite: string;

  @IsOptional()
  @IsString()
  parentDate?: string; // Required if level = 'uri'

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

// Hierarchical Expand Request DTO (new flexible grouping)
export class HierarchicalExpandRequestDto {
  @IsString()
  connectionId: string;

  @IsString()
  networkId: string;

  @IsString()
  startDate: string; // YYYY-MM-DD

  @IsString()
  endDate: string; // YYYY-MM-DD

  @IsIn([
    "domain",
    "url",
    "url_full",
    "date_day",
    "date_week",
    "date_month",
    "country",
  ])
  primaryGroupBy:
    | "domain"
    | "url"
    | "url_full"
    | "date_day"
    | "date_week"
    | "date_month"
    | "country";

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
  subGroupBy: SubGroupByOption;

  @IsString()
  parentKey: string; // The key of the parent item to expand

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

// Unified Expand Request DTO - accepts both legacy and hierarchical formats
// All fields are optional at DTO level; controller validates the combination
export class UnifiedExpandRequestDto {
  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsString()
  networkId?: string;

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

// Response DTOs

export interface DateData {
  date: string; // YYYY-MM-DD
  childCount: number;
  metrics: MetricsData;
}

export interface UriData {
  requestUri: string;
  metrics: MetricsData;
}

export interface ExpandDateResponseDto {
  items: DateData[];
}

export interface ExpandUriResponseDto {
  items: UriData[];
}

export type ExpandResponseDto = ExpandDateResponseDto | ExpandUriResponseDto;

// Hierarchical Item (used in hierarchical expand response)
export interface HierarchicalItem {
  key: string; // Unique identifier (domain, url, date, etc)
  label: string; // Display label
  groupType: string; // Type of this item (domain, url, date_day, etc)
  childCount: number;
  country?: string; // Country name (when groupType is 'country')
  countryCode?: string; // Country code (e.g., "BR", "US")
  metrics: MetricsData;
}

export interface HierarchicalExpandResponseDto {
  items: HierarchicalItem[];
  metadata: {
    primaryGroupBy: string;
    subGroupBy: string;
    parentKey: string;
  };
}
