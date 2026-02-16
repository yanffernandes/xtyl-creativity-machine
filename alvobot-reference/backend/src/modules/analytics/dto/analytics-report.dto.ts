import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

// ============================================
// Enums
// ============================================

/**
 * GA4 Metrics available for reporting
 */
export enum AnalyticsMetricField {
  // Traffic metrics
  ACTIVE_USERS = "activeUsers",
  NEW_USERS = "newUsers",
  TOTAL_USERS = "totalUsers",
  SESSIONS = "sessions",
  ENGAGED_SESSIONS = "engagedSessions",
  PAGE_VIEWS = "screenPageViews",
  PAGES_PER_SESSION = "screenPageViewsPerSession",

  // Behavior metrics
  BOUNCE_RATE = "bounceRate",
  ENGAGEMENT_RATE = "engagementRate",
  AVG_SESSION_DURATION = "averageSessionDuration",
  USER_ENGAGEMENT_DURATION = "userEngagementDuration",
  EVENT_COUNT = "eventCount",

  // E-commerce metrics (optional)
  CONVERSIONS = "conversions",
  TOTAL_REVENUE = "totalRevenue",
  TRANSACTIONS = "transactions",
  SESSION_CONVERSION_RATE = "sessionConversionRate",
}

/**
 * GA4 Dimensions for grouping data
 */
export enum AnalyticsGroupBy {
  // Page dimensions
  PAGE_PATH = "pagePath",
  PAGE_TITLE = "pageTitle",
  LANDING_PAGE = "landingPage",

  // Date dimensions
  DATE = "date",
  DATE_HOUR = "dateHour",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",

  // Geographic dimensions
  COUNTRY = "country",
  CITY = "city",
  REGION = "region",

  // Technology dimensions
  DEVICE_CATEGORY = "deviceCategory",
  BROWSER = "browser",
  OPERATING_SYSTEM = "operatingSystem",

  // Acquisition dimensions
  SOURCE_MEDIUM = "sessionSourceMedium",
  SOURCE = "sessionSource",
  MEDIUM = "sessionMedium",
  CAMPAIGN = "sessionCampaign",
}

/**
 * Field groups for selective metric fetching
 */
export enum AnalyticsFieldGroup {
  SUMMARY = "summary", // Basic: activeUsers, sessions, pageViews
  TABLE_VIEW = "tableView", // Common: all traffic + behavior metrics
  FULL = "full", // All metrics including e-commerce
}

// ============================================
// DTOs
// ============================================

export class AnalyticsSourceDto {
  @IsString()
  connectionId: string;

  @IsString()
  propertyId: string; // e.g., "properties/123456789"
}

export class AnalyticsReportRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyticsSourceDto)
  sources: AnalyticsSourceDto[];

  @IsString()
  startDate: string; // YYYY-MM-DD

  @IsString()
  endDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsEnum(AnalyticsGroupBy)
  groupBy?: AnalyticsGroupBy;

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
  @IsBoolean()
  forceRefresh?: boolean;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsEnum(AnalyticsFieldGroup)
  fieldGroup?: AnalyticsFieldGroup;

  @IsOptional()
  @IsArray()
  @IsEnum(AnalyticsMetricField, { each: true })
  metrics?: AnalyticsMetricField[];
}

export class AnalyticsExpandRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyticsSourceDto)
  sources: AnalyticsSourceDto[];

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsEnum(AnalyticsGroupBy)
  primaryGroupBy: AnalyticsGroupBy;

  @IsEnum(AnalyticsGroupBy)
  subGroupBy: AnalyticsGroupBy;

  @IsString()
  parentKey: string;

  @IsOptional()
  @IsString()
  parentDomain?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc";

  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

export class ActivePropertiesRequestDto {
  @IsArray()
  @IsString({ each: true })
  connectionIds: string[];
}

// ============================================
// Response Interfaces
// ============================================

export interface AnalyticsMetrics {
  activeUsers: number;
  newUsers: number;
  totalUsers: number;
  sessions: number;
  engagedSessions: number;
  pageViews: number;
  pagesPerSession: number;
  bounceRate: number;
  engagementRate: number;
  avgSessionDuration: number;
  userEngagementDuration: number;
  eventCount: number;
  // E-commerce (optional)
  conversions?: number;
  totalRevenue?: number;
  transactions?: number;
  sessionConversionRate?: number;
}

export interface AnalyticsRow {
  id: string;
  connectionId: string;
  propertyId: string;
  key: string; // Grouping dimension value
  label: string; // Human-readable label
  domain?: string;
  country?: string;
  countryCode?: string;
  deviceCategory?: string;
  sourceMedium?: string;
  metrics: AnalyticsMetrics;
  childCount?: number;
  aggregatedSources?: Array<{
    connectionId: string;
    propertyId: string;
  }>;
}

export interface AnalyticsSummary {
  activeUsers: number;
  newUsers: number;
  totalUsers: number;
  sessions: number;
  engagedSessions: number;
  pageViews: number;
  pagesPerSession: number;
  bounceRate: number;
  engagementRate: number;
  avgSessionDuration: number;
  // E-commerce totals
  conversions?: number;
  totalRevenue?: number;
  transactions?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface FailedSourceDto {
  connectionId: string;
  propertyId: string;
  name: string;
  error: string;
  retryable: boolean;
}

export interface AnalyticsReportResponse {
  rows: AnalyticsRow[];
  summary: AnalyticsSummary;
  pagination?: PaginationMeta;
  metadata: {
    groupBy: string;
    dateRange: { start: string; end: string };
    sourcesQueried: number;
    sourcesSucceeded: number;
    sourcesFailed: number;
    cachedAt: string | null;
    requestedMetrics?: string[];
  };
  failedSources?: FailedSourceDto[];
}

export interface HierarchicalItem {
  key: string;
  label: string;
  groupType: AnalyticsGroupBy;
  childCount?: number;
  country?: string;
  countryCode?: string;
  deviceCategory?: string;
  sourceMedium?: string;
  metrics: AnalyticsMetrics;
  children?: HierarchicalItem[];
  isOptimistic?: boolean;
}

export interface AnalyticsExpandResponse {
  items: HierarchicalItem[];
  metadata: {
    primaryGroupBy: string;
    subGroupBy: string;
    parentKey: string;
  };
}

export interface ActivePropertyDto {
  id: string;
  propertyId: string;
  displayName: string;
  connectionId: string;
  accountId?: string;
  accountName?: string;
  timeZone?: string;
  currencyCode?: string;
  isActive: boolean;
}

export interface ActivePropertiesResponse {
  success: boolean;
  properties: ActivePropertyDto[];
}

// ============================================
// Valid Sub-Groupings Map
// ============================================

export const VALID_SUB_GROUPINGS: Record<AnalyticsGroupBy, AnalyticsGroupBy[]> =
  {
    [AnalyticsGroupBy.PAGE_PATH]: [
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.COUNTRY,
      AnalyticsGroupBy.DEVICE_CATEGORY,
      AnalyticsGroupBy.SOURCE_MEDIUM,
    ],
    [AnalyticsGroupBy.PAGE_TITLE]: [
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.COUNTRY,
      AnalyticsGroupBy.DEVICE_CATEGORY,
    ],
    [AnalyticsGroupBy.LANDING_PAGE]: [
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.COUNTRY,
      AnalyticsGroupBy.SOURCE_MEDIUM,
    ],
    [AnalyticsGroupBy.DATE]: [
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.COUNTRY,
      AnalyticsGroupBy.DEVICE_CATEGORY,
      AnalyticsGroupBy.SOURCE_MEDIUM,
    ],
    [AnalyticsGroupBy.DATE_HOUR]: [
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.COUNTRY,
    ],
    [AnalyticsGroupBy.WEEK]: [
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.COUNTRY,
    ],
    [AnalyticsGroupBy.MONTH]: [
      AnalyticsGroupBy.WEEK,
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.COUNTRY,
    ],
    [AnalyticsGroupBy.YEAR]: [
      AnalyticsGroupBy.MONTH,
      AnalyticsGroupBy.WEEK,
      AnalyticsGroupBy.COUNTRY,
    ],
    [AnalyticsGroupBy.COUNTRY]: [
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.CITY,
    ],
    [AnalyticsGroupBy.CITY]: [
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
    ],
    [AnalyticsGroupBy.REGION]: [
      AnalyticsGroupBy.CITY,
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
    ],
    [AnalyticsGroupBy.DEVICE_CATEGORY]: [
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.BROWSER,
      AnalyticsGroupBy.OPERATING_SYSTEM,
    ],
    [AnalyticsGroupBy.BROWSER]: [
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.OPERATING_SYSTEM,
    ],
    [AnalyticsGroupBy.OPERATING_SYSTEM]: [
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.BROWSER,
    ],
    [AnalyticsGroupBy.SOURCE_MEDIUM]: [
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
      AnalyticsGroupBy.LANDING_PAGE,
      AnalyticsGroupBy.CAMPAIGN,
    ],
    [AnalyticsGroupBy.SOURCE]: [
      AnalyticsGroupBy.MEDIUM,
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
    ],
    [AnalyticsGroupBy.MEDIUM]: [
      AnalyticsGroupBy.SOURCE,
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
    ],
    [AnalyticsGroupBy.CAMPAIGN]: [
      AnalyticsGroupBy.SOURCE_MEDIUM,
      AnalyticsGroupBy.PAGE_PATH,
      AnalyticsGroupBy.DATE,
    ],
  };

// ============================================
// Metrics by Field Group
// ============================================

export const METRICS_BY_FIELD_GROUP: Record<
  AnalyticsFieldGroup,
  AnalyticsMetricField[]
> = {
  [AnalyticsFieldGroup.SUMMARY]: [
    AnalyticsMetricField.ACTIVE_USERS,
    AnalyticsMetricField.SESSIONS,
    AnalyticsMetricField.PAGE_VIEWS,
  ],
  [AnalyticsFieldGroup.TABLE_VIEW]: [
    AnalyticsMetricField.ACTIVE_USERS,
    AnalyticsMetricField.NEW_USERS,
    AnalyticsMetricField.SESSIONS,
    AnalyticsMetricField.ENGAGED_SESSIONS,
    AnalyticsMetricField.PAGE_VIEWS,
    AnalyticsMetricField.PAGES_PER_SESSION,
    AnalyticsMetricField.BOUNCE_RATE,
    AnalyticsMetricField.ENGAGEMENT_RATE,
    AnalyticsMetricField.AVG_SESSION_DURATION,
    AnalyticsMetricField.EVENT_COUNT,
  ],
  [AnalyticsFieldGroup.FULL]: [
    AnalyticsMetricField.ACTIVE_USERS,
    AnalyticsMetricField.NEW_USERS,
    AnalyticsMetricField.TOTAL_USERS,
    AnalyticsMetricField.SESSIONS,
    AnalyticsMetricField.ENGAGED_SESSIONS,
    AnalyticsMetricField.PAGE_VIEWS,
    AnalyticsMetricField.PAGES_PER_SESSION,
    AnalyticsMetricField.BOUNCE_RATE,
    AnalyticsMetricField.ENGAGEMENT_RATE,
    AnalyticsMetricField.AVG_SESSION_DURATION,
    AnalyticsMetricField.USER_ENGAGEMENT_DURATION,
    AnalyticsMetricField.EVENT_COUNT,
    AnalyticsMetricField.CONVERSIONS,
    AnalyticsMetricField.TOTAL_REVENUE,
    AnalyticsMetricField.TRANSACTIONS,
    AnalyticsMetricField.SESSION_CONVERSION_RATE,
  ],
};

// ============================================
// Dimension Labels (Portuguese)
// ============================================

export const GROUP_BY_LABELS: Record<AnalyticsGroupBy, string> = {
  [AnalyticsGroupBy.PAGE_PATH]: "Página",
  [AnalyticsGroupBy.PAGE_TITLE]: "Título da Página",
  [AnalyticsGroupBy.LANDING_PAGE]: "Landing Page",
  [AnalyticsGroupBy.DATE]: "Data",
  [AnalyticsGroupBy.DATE_HOUR]: "Data/Hora",
  [AnalyticsGroupBy.WEEK]: "Semana",
  [AnalyticsGroupBy.MONTH]: "Mês",
  [AnalyticsGroupBy.YEAR]: "Ano",
  [AnalyticsGroupBy.COUNTRY]: "País",
  [AnalyticsGroupBy.CITY]: "Cidade",
  [AnalyticsGroupBy.REGION]: "Região",
  [AnalyticsGroupBy.DEVICE_CATEGORY]: "Dispositivo",
  [AnalyticsGroupBy.BROWSER]: "Navegador",
  [AnalyticsGroupBy.OPERATING_SYSTEM]: "Sistema Operacional",
  [AnalyticsGroupBy.SOURCE_MEDIUM]: "Origem/Mídia",
  [AnalyticsGroupBy.SOURCE]: "Origem",
  [AnalyticsGroupBy.MEDIUM]: "Mídia",
  [AnalyticsGroupBy.CAMPAIGN]: "Campanha",
};
