// Ad Manager Network
export interface AdManagerNetwork {
  id: string;
  name: string;
  currencyCode: string;
  is_active?: boolean; // Whether this network is enabled for monitoring
}

// Metrics Data (shared across all levels)
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
}

// Site Metrics (Level 0)
export interface SiteData {
  site: string; // Key-value (e.g., land_uri=/path)
  domain: string; // Top private domain (e.g., example.com)
  country?: string; // Country name (e.g., "Brazil", "United States")
  countryCode?: string; // Country code (e.g., "BR", "US")
  childCount: number;
  metrics: MetricsData;
  children?: DateData[];
  expanded?: boolean; // UI state only
  // Currency conversion tracking
  originalCurrencyCode?: string; // Original currency before conversion to USD (e.g., "BRL", "EUR")
  originalRevenue?: number; // Original revenue amount before conversion
  exchangeRate?: number; // Exchange rate used for conversion
  // Connection info for optimized expand queries (only query sources that have data for this row)
  source?: RevenueSource; // Single source type (for non-aggregated rows)
  connectionId?: string; // Single connection ID (for non-aggregated rows)
  networkId?: string; // Ad Manager network ID (for non-aggregated rows)
  accountId?: string; // AdSense account ID (for non-aggregated rows)
  // Aggregated connection info (for rows aggregated from multiple sources)
  aggregatedConnections?: Array<{
    connectionId: string;
    networkId?: string;
    accountId?: string;
    source: RevenueSource;
  }>;
}

// Date Metrics (Level 1)
export interface DateData {
  date: string;
  childCount: number;
  metrics: MetricsData;
  children?: UriData[];
  expanded?: boolean; // UI state only
}

// URI Metrics (Level 2)
export interface UriData {
  requestUri: string;
  metrics: MetricsData;
}

// Filter types
export type PeriodFilterValue = 'today' | 'yesterday' | '7d' | '30d' | 'custom';
export type GroupBy = 'site' | 'request_uri';
export type SortField = keyof MetricsData | 'site' | 'domain' | 'country' | 'date' | 'requestUri';
export type SortOrder = 'asc' | 'desc';

// ============================================
// Hierarchical Grouping Types
// ============================================

// Primary grouping options (level 0)
// url = slug only (path without query params)
// url_full = full URL with query params
export type PrimaryGroupBy = 'domain' | 'url' | 'url_full' | 'date_day' | 'date_week' | 'date_month' | 'country';

// Sub-grouping options (level 1 - when expanded)
export type SubGroupBy = 'none' | 'total' | 'date_day' | 'date_week' | 'date_month' | 'url' | 'url_full' | 'domain' | 'country';

// Valid sub-grouping options per primary grouping
export const VALID_SUB_GROUPINGS: Record<PrimaryGroupBy, SubGroupBy[]> = {
  domain: ['total', 'date_month', 'date_week', 'date_day', 'url', 'url_full', 'country'],
  url: ['total', 'date_month', 'date_week', 'date_day', 'country'],
  url_full: ['total', 'date_month', 'date_week', 'date_day', 'country'],
  date_day: ['domain', 'url', 'url_full', 'country'],
  date_week: ['domain', 'url', 'url_full', 'date_day', 'country'],
  date_month: ['domain', 'url', 'url_full', 'date_week', 'date_day', 'country'],
  country: ['total', 'domain', 'date_month', 'date_week', 'date_day', 'url', 'url_full'],
};

// Labels for grouping options (Portuguese)
export const GROUP_BY_LABELS: Record<PrimaryGroupBy | SubGroupBy, string> = {
  domain: 'Domínio',
  url: 'URL (Slug)',
  url_full: 'URL (Completa)',
  date_day: 'Dia',
  date_week: 'Semana',
  date_month: 'Mês',
  country: 'País',
  none: 'Nenhum',
  total: 'Total',
};

/**
 * Metrics data structure for hierarchical items.
 * May include either 'ecpm' (frontend display) or 'rpm' (backend response).
 */
export interface HierarchicalMetrics {
  revenue: number;
  impressions: number;
  clicks: number;
  requests: number;
  ctr: number;
  cpc: number;
  rpm: number;
  rps: number;
  pmr: number;
  viewability: number;
  fillRate?: number;
  ecpm?: number; // Alias for rpm in display context
}

// Hierarchical data structure for expanded items
export interface HierarchicalItem {
  key: string; // Unique identifier (domain, url, date, etc)
  label: string; // Display label
  groupType: PrimaryGroupBy | SubGroupBy; // Type of this item
  childCount?: number;
  country?: string; // Country name (when groupType is 'country')
  countryCode?: string; // Country code (e.g., "BR", "US")
  // Currency conversion tracking (for expanded child rows)
  originalCurrencyCode?: string; // Original currency before conversion to USD (e.g., "EUR")
  originalRevenue?: number; // Original revenue amount before conversion
  exchangeRate?: number; // Exchange rate used for conversion (1 originalCurrency = X USD)
  metrics: HierarchicalMetrics;
  children?: HierarchicalItem[];
  /**
   * Flag indicating this is optimistic placeholder data (used for optimistic updates).
   * When true, the UI should show a loading state for this item.
   */
  isOptimistic?: boolean;
}

// ============================================
// Pagination (Updated for On-Demand Fetching)
// ============================================

/** Legacy pagination interface - kept for backwards compatibility */
export interface Pagination {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Server-side pagination metadata returned from the unified revenue API.
 * Summary is always calculated for ALL data (not just current page).
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

// ============================================
// Field Selection (Projection Pushdown)
// ============================================

/**
 * Available metrics that can be requested.
 * Use for fine-grained control over response payload.
 */
export type RevenueMetricField =
  | 'revenue'
  | 'impressions'
  | 'clicks'
  | 'requests'
  | 'ctr'
  | 'cpc'
  | 'rpm'
  | 'rps'
  | 'pmr'
  | 'viewability'
  | 'fillRate';

/**
 * Predefined field groups for common use cases.
 * - summary: Only essential metrics (revenue, impressions, clicks)
 * - tableView: Default table view (revenue, impressions, clicks, ctr, rpm, cpc)
 * - full: All available metrics
 */
export type RevenueFieldGroup = 'summary' | 'tableView' | 'full';

/**
 * Mapping of field groups to their metrics.
 * Useful for deriving which metrics are included in a field group.
 */
export const FIELD_GROUP_METRICS: Record<RevenueFieldGroup, RevenueMetricField[]> = {
  summary: ['revenue', 'impressions', 'clicks'],
  tableView: ['revenue', 'impressions', 'clicks', 'ctr', 'rpm', 'cpc'],
  full: ['revenue', 'impressions', 'clicks', 'requests', 'ctr', 'cpc', 'rpm', 'rps', 'pmr', 'viewability', 'fillRate'],
};

// API Request types
export interface SiteAnalysisRequest {
  connectionId: string;
  networkId: string;
  startDate: string;
  endDate: string;
  groupBy?: GroupBy;
  filters?: {
    site?: string;
    requestUri?: string;
  };
  pagination?: {
    page?: number;
    pageSize?: number;
  };
  sortBy?: string;
  sortOrder?: SortOrder;
  forceRefresh?: boolean;
}

export interface ExpandRequest {
  connectionId: string;
  networkId: string;
  startDate: string;
  endDate: string;
  level: 'date' | 'uri';
  parentSite: string;
  parentDate?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  forceRefresh?: boolean;
}

export interface RefreshRequest {
  connectionId: string;
  networkId: string;
}

// API Response types
export interface SiteAnalysisResponse {
  data: SiteData[];
  pagination: Pagination;
  metadata: {
    networkId: string;
    currencyCode: string;
    dateRange: {
      start: string;
      end: string;
    };
    cachedAt?: string;
  };
}

export interface ExpandDateResponse {
  items: DateData[];
}

export interface ExpandUriResponse {
  items: UriData[];
}

export type ExpandResponse = ExpandDateResponse | ExpandUriResponse;

export interface RefreshResponse {
  success: boolean;
  message: string;
}

// Networks response
export interface GetNetworksResponse {
  networks: AdManagerNetwork[];
}

// OAuth types
export interface InitiateOAuthRequest {
  connectionName: string;
  workspaceId: string;
  reconnectConnectionId?: string;
}

export interface InitiateOAuthResponse {
  authorizationUrl: string;
}

export interface ConfigStatusResponse {
  configured: boolean;
  missingFields?: string[];
}

export interface RefreshTokenResponse {
  success: boolean;
  expiresAt: string;
}

// UI State types
export interface DashboardFilters {
  networkId: string | null;
  period: PeriodFilterValue;
  startDate: string | null;
  endDate: string | null;
  groupBy: GroupBy;
  search: string;
}

export interface ExpandedRows {
  sites: Set<string>;
  dates: Map<string, Set<string>>; // site -> dates
}

// ============================================
// AdSense Types (Feature 028)
// ============================================

export interface AdSenseAccount {
  id: string;
  name: string;
  displayName: string;
  currencyCode: string;
  reportingTimeZone: string;
}

export interface AdSenseReportRow {
  site: string;
  domain?: string; // The actual domain (for date groupings, each domain is a separate row)
  date?: string;
  requestUri?: string;
  metrics: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    rpm: number;
    requests: number;
    rps: number;
    pmr: number;
    viewability: number;
  };
}

export interface AdSenseReportParams {
  connectionId: string;
  accountId: string;
  startDate: string;
  endDate: string;
  dimensions?: Array<'DATE' | 'DOMAIN_NAME' | 'URL'>;
  metrics?: string[];
  forceRefresh?: boolean;
}

export interface AdSenseReportResponse {
  rows: AdSenseReportRow[];
  totals: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    rpm: number;
  };
  metadata: {
    accountId: string;
    currencyCode: string;
    dateRange: {
      start: string;
      end: string;
    };
    cachedAt?: string;
  };
}

// ============================================
// Unified Revenue Types (Feature 028)
// ============================================

export type RevenueSource = 'ad_manager' | 'adsense';

export interface UnifiedRevenueRow {
  id: string; // Unique ID for React key
  source: RevenueSource;
  site: string; // The grouping key (domain, date, url, etc.)
  domain?: string; // The actual domain (when groupBy is date, this is the domain for that row)
  country?: string; // Country name (e.g., "Brazil", "United States")
  countryCode?: string; // Country code (e.g., "BR", "US")
  date?: string;
  requestUri?: string;
  currencyCode: string;
  originalCurrencyCode?: string; // Original currency before conversion to USD
  originalRevenue?: number; // Original revenue amount before conversion
  exchangeRate?: number; // Exchange rate used for conversion (1 originalCurrency = X USD)
  metrics: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    rpm: number;
    requests: number;
    rps: number;
    pmr: number;
    viewability: number;
  };
  // Connection metadata for hierarchical expand
  connectionId: string;
  networkId?: string; // For Ad Manager
  accountId?: string; // For AdSense
  // Aggregation metadata
  aggregatedDomains?: string[]; // List of domains when aggregated
  aggregatedCount?: number; // Number of sources aggregated
  // All connections that contributed to this aggregated row (for expand to query all)
  aggregatedConnections?: Array<{
    connectionId: string;
    networkId?: string;
    accountId?: string;
    source: RevenueSource;
  }>;
}

export interface UnifiedRevenueSummary {
  revenue: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  rpm: number;
  currency?: string;
  hasMultipleCurrencies: boolean;
  currencies: string[];
  conversionMessage?: string; // Message about currency conversion
}

// Failed source info for user notification (follows Nielsen's heuristics)
export interface FailedSource {
  type: RevenueSource;
  connectionId: string;
  networkId?: string;
  accountId?: string;
  name: string; // Human-readable name for display
  error: string; // User-friendly error message
  retryable: boolean; // Whether the error is transient and might succeed on retry
}

export interface UnifiedRevenueFilters extends DashboardFilters {
  source: RevenueSource | 'all';
  adsenseAccountId?: string | null;
}
