// Search Console Dashboard Types

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

export type SearchConsolePrimaryGroupBy =
  | 'query'
  | 'page'
  | 'country'
  | 'device'
  | 'date_day'
  | 'date_week'
  | 'date_month'
  | 'searchAppearance';

export type SearchConsoleSubGroupBy =
  | 'query'
  | 'page'
  | 'country'
  | 'device'
  | 'date_day';

export const VALID_SUB_GROUPINGS: Record<SearchConsolePrimaryGroupBy, SearchConsoleSubGroupBy[]> = {
  query: ['page', 'country', 'device', 'date_day'],
  page: ['query', 'country', 'device', 'date_day'],
  country: ['query', 'page', 'device', 'date_day'],
  device: ['query', 'page', 'country', 'date_day'],
  date_day: ['query', 'page', 'country', 'device'],
  date_week: ['query', 'page', 'country', 'device'],
  date_month: ['query', 'page', 'country', 'device'],
  searchAppearance: ['query', 'page', 'country', 'device', 'date_day'],
};

export const GROUP_BY_LABELS: Record<SearchConsolePrimaryGroupBy, string> = {
  query: 'Palavras-chave',
  page: 'Páginas',
  country: 'Países',
  device: 'Dispositivos',
  date_day: 'Dias',
  date_week: 'Semanas',
  date_month: 'Meses',
  searchAppearance: 'Tipo de resultado',
};

export const SUB_GROUP_BY_LABELS: Record<SearchConsoleSubGroupBy, string> = {
  query: 'Palavras-chave',
  page: 'Páginas',
  country: 'Países',
  device: 'Dispositivos',
  date_day: 'Dias',
};

export interface SearchConsoleProperty {
  id: string;
  siteUrl: string;
  propertyType: 'DOMAIN' | 'URL_PREFIX';
  connectionId: string;
  connectionName: string;
  isActive: boolean;
}

export type SearchType = 'web' | 'image' | 'video' | 'news' | 'discover' | 'googleNews';
export type DeviceType = 'DESKTOP' | 'MOBILE' | 'TABLET';

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  web: 'Web',
  image: 'Imagens',
  video: 'Vídeos',
  news: 'Notícias',
  discover: 'Discover',
  googleNews: 'Google News',
};

export const DEVICE_LABELS: Record<DeviceType, string> = {
  DESKTOP: 'Desktop',
  MOBILE: 'Mobile',
  TABLET: 'Tablet',
};

export interface ColumnVisibility {
  key: boolean;
  property: boolean;
  clicks: boolean;
  impressions: boolean;
  ctr: boolean;
  position: boolean;
}

export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  key: true,
  property: true,
  clicks: true,
  impressions: true,
  ctr: true,
  position: true,
};

export interface SearchConsoleSource {
  connectionId: string;
  siteUrl: string;
}
