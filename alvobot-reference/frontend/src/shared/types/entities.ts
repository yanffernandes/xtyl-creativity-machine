// Entity types matching Supabase database schema

export interface Admin {
  id: number
  user_id: string
  role: string
  notes?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface AdminRole {
  id: string
  public_name: string
  permissions: Record<string, boolean>
  description: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface Project {
  id: number
  user_id: string
  name: string
  domain?: string
  login?: string
  pass?: string
  status: boolean
  log?: Record<string, unknown>
  created_at: string
  updated_at?: string
  is_deleted: boolean
  default_language?: string
  token?: string
  wp_version?: string
  plugins?: Array<Record<string, unknown>>
  niche_selected?: string
  is_approved_on_adsense: boolean
  adsense_status?: string
  error?: string
  // WordPress connection fields (004-meus-blogs)
  connection_status?: 'connected' | 'error' | 'not_configured' | 'testing'
  last_connection_test?: string
  connection_error_message?: string
  articles_count?: number
  last_sync_at?: string
  // PageSpeed Insights fields
  pagespeed_mobile_score?: number | null
  pagespeed_desktop_score?: number | null
  pagespeed_last_check?: string | null
  pagespeed_check_error?: string | null
}

export interface ArticleImage {
  url: string
  alt?: string
  caption?: string
}

export interface Article {
  id: number
  user_id?: string
  project_id?: number
  title?: string
  content?: string
  credits_used?: number
  status?: 'draft' | 'published' | 'scheduled' | 'archived'
  excerpt?: string
  images?: ArticleImage[]
  slug?: string
  words?: number
  wpPost_id?: number
  wpFeaturedMedia_id?: number
  wpCategories_id?: number
  keyword_snapshot?: Record<string, unknown>
  keyword_used?: string
  date?: string
  created_at: string
  updated_at?: string
  input_tokens?: number
  output_tokens?: number
  model_used?: string
  is_approval_article: boolean
  imagePrompt?: string
  keyword_inclusion_exclusion?: {
    include?: string[]
    exclude?: string[]
  }
  language?: string
  url_added: boolean
  wpFeaturedMedia_url?: string
}

export type TaskStatus = 'to_do' | 'in_progress' | 'done' | 'blocked'

export interface Task {
  id: string
  project_id?: number
  task_template_id?: number
  category_id?: number
  name: string
  description?: string
  sort_order: number
  status: TaskStatus
  user_id?: string
  started_at?: string
  completed_at?: string
  estimated_time?: number
  actual_time?: number
  completion_percentage: number
  notes?: string
  created_at: string
  updated_at: string
  tags?: string[]
}

export interface TaskCategory {
  id: number
  name: string
  description?: string
  order: number
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface Keyword {
  id: number
  word: string
  search_volume?: number
  cpc_min?: number
  cpc_max?: number
  visibility: 'private' | 'public'
  created_at: string
  updated_at?: string
  competition?: 'low' | 'medium' | 'high'
  language?: string
  country?: string
}

export interface Connection {
  id: string
  user_id?: string
  workspace_id?: string
  connection_name?: string
  plataform_name?: string
  platform_user_id?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  metadata?: Record<string, unknown>
  is_active: boolean
  /** True when token refresh has permanently failed and user must reconnect */
  needs_reconnect?: boolean
  /** Last error message from token refresh attempt */
  last_refresh_error?: string
  /** Timestamp of last token refresh attempt */
  last_refresh_attempt?: string
  last_used_at?: string
  created_at: string
  updated_at?: string
  deleted_at?: string
  meta_app_id?: string
}

export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
}

export interface Flow {
  id: string
  user_id: string
  name: string
  description?: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  status: 'draft' | 'active' | 'paused'
  trigger_type: 'manual' | 'scheduled' | 'webhook'
  trigger_config?: Record<string, unknown>
  created_at: string
  updated_at?: string
  last_run_at?: string
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface RunLog {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
}

export interface Run {
  id: string
  flow_id?: string
  user_id: string
  status: RunStatus
  started_at: string
  completed_at?: string
  duration_ms?: number
  input_data?: Record<string, unknown>
  output_data?: Record<string, unknown>
  error?: string
  logs?: RunLog[]
  created_at: string
}
