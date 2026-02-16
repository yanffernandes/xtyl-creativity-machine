// ============================================
// Constants (replacing enums for erasableSyntaxOnly compatibility)
// ============================================

export const AnalyticsMetricField = {
  ACTIVE_USERS: 'activeUsers',
  NEW_USERS: 'newUsers',
  TOTAL_USERS: 'totalUsers',
  SESSIONS: 'sessions',
  ENGAGED_SESSIONS: 'engagedSessions',
  PAGE_VIEWS: 'screenPageViews',
  PAGES_PER_SESSION: 'screenPageViewsPerSession',
  BOUNCE_RATE: 'bounceRate',
  ENGAGEMENT_RATE: 'engagementRate',
  AVG_SESSION_DURATION: 'averageSessionDuration',
  USER_ENGAGEMENT_DURATION: 'userEngagementDuration',
  EVENT_COUNT: 'eventCount',
  CONVERSIONS: 'conversions',
  TOTAL_REVENUE: 'totalRevenue',
  TRANSACTIONS: 'transactions',
  SESSION_CONVERSION_RATE: 'sessionConversionRate',
} as const

export type AnalyticsMetricField = typeof AnalyticsMetricField[keyof typeof AnalyticsMetricField]

export const AnalyticsGroupBy = {
  PAGE_PATH: 'pagePath',
  PAGE_TITLE: 'pageTitle',
  LANDING_PAGE: 'landingPage',
  DATE: 'date',
  DATE_HOUR: 'dateHour',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  COUNTRY: 'country',
  CITY: 'city',
  REGION: 'region',
  DEVICE_CATEGORY: 'deviceCategory',
  BROWSER: 'browser',
  OPERATING_SYSTEM: 'operatingSystem',
  SOURCE_MEDIUM: 'sessionSourceMedium',
  SOURCE: 'sessionSource',
  MEDIUM: 'sessionMedium',
  CAMPAIGN: 'sessionCampaign',
} as const

export type AnalyticsGroupBy = typeof AnalyticsGroupBy[keyof typeof AnalyticsGroupBy]

export const AnalyticsFieldGroup = {
  SUMMARY: 'summary',
  TABLE_VIEW: 'tableView',
  FULL: 'full',
} as const

export type AnalyticsFieldGroup = typeof AnalyticsFieldGroup[keyof typeof AnalyticsFieldGroup]

// ============================================
// Data Interfaces
// ============================================

export interface AnalyticsSource {
  connectionId: string
  propertyId: string
}

export interface AnalyticsMetrics {
  activeUsers: number
  newUsers: number
  totalUsers: number
  sessions: number
  engagedSessions: number
  pageViews: number
  pagesPerSession: number
  bounceRate: number
  engagementRate: number
  avgSessionDuration: number
  userEngagementDuration: number
  eventCount: number
  conversions?: number
  totalRevenue?: number
  transactions?: number
  sessionConversionRate?: number
}

export interface AnalyticsRow {
  id: string
  connectionId: string
  propertyId: string
  key: string
  label: string
  domain?: string
  country?: string
  countryCode?: string
  deviceCategory?: string
  sourceMedium?: string
  metrics: AnalyticsMetrics
  childCount?: number
  aggregatedSources?: AnalyticsSource[]
}

export interface AnalyticsSummary {
  activeUsers: number
  newUsers: number
  totalUsers: number
  sessions: number
  engagedSessions: number
  pageViews: number
  pagesPerSession: number
  bounceRate: number
  engagementRate: number
  avgSessionDuration: number
  conversions?: number
  totalRevenue?: number
  transactions?: number
}

export interface PaginationMeta {
  page: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface FailedSource {
  connectionId: string
  propertyId: string
  name: string
  error: string
  retryable: boolean
}

export interface AnalyticsReportResponse {
  rows: AnalyticsRow[]
  summary: AnalyticsSummary
  pagination?: PaginationMeta
  metadata: {
    groupBy: string
    dateRange: { start: string; end: string }
    sourcesQueried: number
    sourcesSucceeded: number
    sourcesFailed: number
    cachedAt: string | null
    requestedMetrics?: string[]
  }
  failedSources?: FailedSource[]
}

export interface HierarchicalItem {
  key: string
  label: string
  groupType: typeof AnalyticsGroupBy[keyof typeof AnalyticsGroupBy]
  childCount?: number
  country?: string
  countryCode?: string
  deviceCategory?: string
  sourceMedium?: string
  metrics: AnalyticsMetrics
  children?: HierarchicalItem[]
  isOptimistic?: boolean
}

export interface AnalyticsExpandResponse {
  items: HierarchicalItem[]
  metadata: {
    primaryGroupBy: string
    subGroupBy: string
    parentKey: string
  }
}

export interface ActiveProperty {
  id: string
  propertyId: string
  displayName: string
  connectionId: string
  accountId?: string
  accountName?: string
  timeZone?: string
  currencyCode?: string
  isActive: boolean
}

export interface ActivePropertiesResponse {
  success: boolean
  properties: ActiveProperty[]
}

// ============================================
// Request Interfaces
// ============================================

export interface AnalyticsReportRequest {
  sources: AnalyticsSource[]
  startDate: string
  endDate: string
  groupBy?: typeof AnalyticsGroupBy[keyof typeof AnalyticsGroupBy]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  forceRefresh?: boolean
  page?: number
  limit?: number
  fieldGroup?: typeof AnalyticsFieldGroup[keyof typeof AnalyticsFieldGroup]
  metrics?: Array<typeof AnalyticsMetricField[keyof typeof AnalyticsMetricField]>
}

export interface AnalyticsExpandRequest {
  sources: AnalyticsSource[]
  startDate: string
  endDate: string
  primaryGroupBy: typeof AnalyticsGroupBy[keyof typeof AnalyticsGroupBy]
  subGroupBy: typeof AnalyticsGroupBy[keyof typeof AnalyticsGroupBy]
  parentKey: string
  parentDomain?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  forceRefresh?: boolean
}

// ============================================
// UI State Interfaces
// ============================================

export interface ColumnVisibility {
  domain: boolean
  key: boolean
  activeUsers: boolean
  newUsers: boolean
  sessions: boolean
  engagedSessions: boolean
  pageViews: boolean
  pagesPerSession: boolean
  bounceRate: boolean
  engagementRate: boolean
  avgSessionDuration: boolean
  eventCount: boolean
  conversions: boolean
  totalRevenue: boolean
}

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  domain: true,
  key: true,
  activeUsers: true,
  newUsers: true,
  sessions: true,
  engagedSessions: false,
  pageViews: true,
  pagesPerSession: true,
  totalRevenue: true,
  bounceRate: true,
  engagementRate: true,
  avgSessionDuration: true,
  eventCount: false,
  conversions: false,
}

export interface ProgressInfo {
  current: number
  total: number
  isProgressing: boolean
}

// ============================================
// Constants
// ============================================

export const GROUP_BY_LABELS: Record<AnalyticsGroupBy, string> = {
  [AnalyticsGroupBy.PAGE_PATH]: 'Página',
  [AnalyticsGroupBy.PAGE_TITLE]: 'Título da Página',
  [AnalyticsGroupBy.LANDING_PAGE]: 'Landing Page',
  [AnalyticsGroupBy.DATE]: 'Data',
  [AnalyticsGroupBy.DATE_HOUR]: 'Data/Hora',
  [AnalyticsGroupBy.WEEK]: 'Semana',
  [AnalyticsGroupBy.MONTH]: 'Mês',
  [AnalyticsGroupBy.YEAR]: 'Ano',
  [AnalyticsGroupBy.COUNTRY]: 'País',
  [AnalyticsGroupBy.CITY]: 'Cidade',
  [AnalyticsGroupBy.REGION]: 'Região',
  [AnalyticsGroupBy.DEVICE_CATEGORY]: 'Dispositivo',
  [AnalyticsGroupBy.BROWSER]: 'Navegador',
  [AnalyticsGroupBy.OPERATING_SYSTEM]: 'Sistema Operacional',
  [AnalyticsGroupBy.SOURCE_MEDIUM]: 'Origem/Mídia',
  [AnalyticsGroupBy.SOURCE]: 'Origem',
  [AnalyticsGroupBy.MEDIUM]: 'Mídia',
  [AnalyticsGroupBy.CAMPAIGN]: 'Campanha',
}

export const VALID_SUB_GROUPINGS: Record<AnalyticsGroupBy, AnalyticsGroupBy[]> = {
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
  [AnalyticsGroupBy.DATE_HOUR]: [AnalyticsGroupBy.PAGE_PATH, AnalyticsGroupBy.COUNTRY],
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
  [AnalyticsGroupBy.CITY]: [AnalyticsGroupBy.PAGE_PATH, AnalyticsGroupBy.DATE],
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
}

export const METRIC_LABELS: Record<keyof AnalyticsMetrics, string> = {
  activeUsers: 'Usuários Ativos',
  newUsers: 'Novos Usuários',
  totalUsers: 'Total de Usuários',
  sessions: 'Sessões',
  engagedSessions: 'Sessões Engajadas',
  pageViews: 'Visualizações',
  pagesPerSession: 'Páginas/Sessão',
  bounceRate: 'Taxa de Rejeição',
  engagementRate: 'Taxa de Engajamento',
  avgSessionDuration: 'Duração Média',
  userEngagementDuration: 'Tempo de Engajamento',
  eventCount: 'Eventos',
  conversions: 'Conversões',
  totalRevenue: 'Receita',
  transactions: 'Transações',
  sessionConversionRate: 'Taxa de Conversão',
}
