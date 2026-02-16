export type IndexingStatus =
  | 'indexed'
  | 'in_progress'
  | 'not_indexed'
  | 'error'
  | 'not_checked'

export interface Sitemap {
  id: string
  project_id: number
  workspace_id: string
  url: string
  sitemap_type: 'auto' | 'manual' | 'index'
  is_primary: boolean
  is_enabled: boolean
  last_synced_at: string | null
  last_sync_error: string | null
  urls_count: number
  created_at: string
  updated_at: string
}

export interface SitemapUrl {
  id: string
  sitemap_id: string
  url: string
  path: string
  lastmod: string | null
  article_id: number | null
  verdict?: string | null
  last_inspected_at?: string | null
  last_submitted_at?: string | null
  indexed_at?: string | null
  indexing_status?: IndexingStatus
}

export interface IndexingStats {
  total_urls: number
  indexed: number
  indexed_percent: number
  in_progress: number
  in_progress_percent: number
  not_indexed: number
  not_indexed_percent: number
  error: number
  error_percent: number
  not_checked: number
  not_checked_percent: number
}

export interface QuotaInfo {
  publish_quota_used: number
  publish_quota_limit: number
  inspection_quota_used: number
  inspection_quota_limit: number
}
