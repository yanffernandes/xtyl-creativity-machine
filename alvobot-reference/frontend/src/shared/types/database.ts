// Database entity types for new tables
// These correspond to the migrations in database/migrations/001_create_missing_tables.sql

// ============================================
// Notification Types
// ============================================

export type NotificationType =
  | 'article_published'
  | 'article_failed'
  | 'task_due'
  | 'task_overdue'
  | 'workspace_invite'
  | 'workspace_joined'
  | 'credit_low'
  | 'credit_depleted'
  | 'flow_completed'
  | 'flow_failed'
  | 'system'
  // Connection notification types
  | 'token_expiring'
  | 'token_expired'
  | 'connection_error'
  | 'connection_success'
  // PageSpeed notification types
  | 'pagespeed_poor_performance'
  | 'pagespeed_degraded'
  | 'pagespeed_cwv_failed'
  | 'pagespeed_improved'

export interface Notification {
  id: number
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export interface NotificationListResponse {
  data: Notification[]
  total: number
  unread_count: number
}

// ============================================
// User Settings Types
// ============================================

export type Theme = 'light' | 'dark'

export interface UserSettings {
  id: number
  user_id: string
  email_notifications: boolean
  push_notifications: boolean
  weekly_digest: boolean
  language: string
  timezone: string
  theme: Theme
  dashboard_layout: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface UserSettingsUpdate {
  email_notifications?: boolean
  push_notifications?: boolean
  weekly_digest?: boolean
  language?: string
  timezone?: string
  theme?: Theme
  dashboard_layout?: Record<string, unknown>
}

// ============================================
// User Credits Types
// ============================================

export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise'

export interface UserCredits {
  id: number
  user_id: string
  total_credits: number
  used_credits: number
  plan_type: PlanType
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

// Computed property helper
export function getAvailableCredits(credits: UserCredits): number {
  return credits.total_credits - credits.used_credits
}

// ============================================
// Credit Transaction Types
// ============================================

export type CreditOperation =
  | 'signup_bonus'
  | 'subscription_renewal'
  | 'manual_add'
  | 'article_generation'
  | 'keyword_mining'
  | 'ai_title_generation'
  | 'refund'

export interface CreditTransaction {
  id: number
  user_id: string
  amount: number // Positive = add, Negative = consume
  operation: CreditOperation
  reference_type: string | null
  reference_id: number | null
  balance_after: number
  created_at: string
}

export interface CreditTransactionListResponse {
  data: CreditTransaction[]
  total: number
}

export interface ConsumeCreditsRequest {
  amount: number
  operation: CreditOperation
  reference_type?: string
  reference_id?: number
}

// ============================================
// Activity Log Types
// ============================================

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'published'
  | 'scheduled'
  | 'imported'
  | 'exported'
  | 'invited'
  | 'joined'
  | 'left'
  | 'started'
  | 'completed'
  | 'failed'

export type EntityType =
  | 'article'
  | 'project'
  | 'task'
  | 'keyword'
  | 'flow'
  | 'trigger'
  | 'workspace'
  | 'member'

export interface ActivityLog {
  id: number
  user_id: string
  workspace_id: number | null
  action: ActivityAction
  entity_type: EntityType
  entity_id: number | null
  entity_name: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ActivityLogListResponse {
  data: ActivityLog[]
  total: number
}
