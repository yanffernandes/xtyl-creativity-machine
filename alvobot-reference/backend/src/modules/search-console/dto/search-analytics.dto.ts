import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

export class SearchAnalyticsSourceDto {
  @IsString()
  connectionId: string;

  @IsString()
  siteUrl: string;
}

export enum SearchConsolePrimaryGroupBy {
  QUERY = "query",
  PAGE = "page",
  COUNTRY = "country",
  DEVICE = "device",
  DATE_DAY = "date_day",
  DATE_WEEK = "date_week",
  DATE_MONTH = "date_month",
  SEARCH_APPEARANCE = "searchAppearance",
}

export enum SearchConsoleSearchType {
  WEB = "web",
  IMAGE = "image",
  VIDEO = "video",
  NEWS = "news",
  DISCOVER = "discover",
  GOOGLE_NEWS = "googleNews",
}

export enum SearchConsoleDevice {
  DESKTOP = "DESKTOP",
  MOBILE = "MOBILE",
  TABLET = "TABLET",
}

export class SearchAnalyticsReportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SearchAnalyticsSourceDto)
  sources: SearchAnalyticsSourceDto[];

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsEnum(SearchConsolePrimaryGroupBy)
  groupBy: SearchConsolePrimaryGroupBy;

  @IsOptional()
  @IsEnum(SearchConsoleSearchType)
  searchType?: SearchConsoleSearchType;

  @IsOptional()
  @IsEnum(SearchConsoleDevice)
  device?: SearchConsoleDevice;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc";

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

export class SearchAnalyticsExpandDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SearchAnalyticsSourceDto)
  sources: SearchAnalyticsSourceDto[];

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsString()
  primaryGroupBy: string;

  @IsString()
  subGroupBy: string;

  @IsString()
  parentKey: string;

  @IsOptional()
  @IsString()
  parentSiteUrl?: string;

  @IsOptional()
  @IsEnum(SearchConsoleSearchType)
  searchType?: SearchConsoleSearchType;

  @IsOptional()
  @IsEnum(SearchConsoleDevice)
  device?: SearchConsoleDevice;
}

// Response types
export interface SearchConsoleMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleRow extends SearchConsoleMetrics {
  key: string;
  displayName?: string;
  siteUrl: string;
  connectionId: string;
  sources?: Array<{ connectionId: string; siteUrl: string }>;
}

export interface SearchConsoleSummary extends SearchConsoleMetrics {
  totalRows: number;
}

export interface SearchConsoleReportResponse {
  rows: SearchConsoleRow[];
  summary: SearchConsoleSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  cachedAt?: string;
  failedSources?: Array<{ siteUrl: string; error: string }>;
}

export interface SearchConsoleExpandResponse {
  items: SearchConsoleRow[];
  parentKey: string;
}
