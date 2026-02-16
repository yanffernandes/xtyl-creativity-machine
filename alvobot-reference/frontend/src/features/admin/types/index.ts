// Admin Types for AlvoBot Admin System

export interface AdminRole {
  id: string
  public_name: string
  permissions: AdminPermissions
  description: string
  level: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface AdminPermissions {
  all?: boolean
  users?: {
    view?: boolean
    create?: boolean
    edit?: boolean
    delete?: boolean
    impersonate?: boolean
  }
  workspaces?: {
    view?: boolean
    create?: boolean
    edit?: boolean
    delete?: boolean
  }
  subscriptions?: {
    view?: boolean
    create?: boolean
    edit?: boolean
    delete?: boolean
    refund?: boolean
  }
  settings?: {
    view?: boolean
    edit?: boolean
  }
  admins?: {
    view?: boolean
    create?: boolean
    edit?: boolean
    delete?: boolean
  }
  reports?: {
    view?: boolean
    export?: boolean
  }
}

export interface Admin {
  user_id: string
  role: string
  notes: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  // Joined fields
  role_name?: string
  role_level?: number
  permissions?: AdminPermissions
  email?: string
  full_name?: string
  last_sign_in_at?: string
}

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  created_at: string
  banned_until: string | null
  deleted_at: string | null
  // Subscription info
  current_plan_id: number | null
  current_plan_name: string | null
  subscription_start: string | null
  subscription_end: string | null
  subscription_status: 'active' | 'inactive'
  // Stats
  projects_count: number
  articles_count: number
  // Admin status
  is_admin: boolean
  admin_role: string | null
}

export interface AdminDashboardStats {
  total_users: number
  new_users_30d: number
  active_users_7d: number
  active_subscriptions: number
  revenue_30d: number
  total_projects: number
  total_articles: number
  articles_30d: number
  activities_24h: number
}

export interface AdminAuditLog {
  id: string
  admin_id: string
  action: string
  resource_type: string
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
  // Joined
  admin_email?: string
  admin_name?: string
}

export interface MagicLink {
  id: string
  admin_id: string
  target_user_id: string
  token: string
  reason: string | null
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface SystemSetting {
  id: string
  value: unknown
  description: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Plan {
  id: number
  name: string
  description: string | null
  monthly_credits: number
  price: number
  project_limit: number
  created_at: string
  updated_at: string | null
}

export interface Transaction {
  id: number
  plan_id: number | null
  user_id: string
  buyer_paid: number
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'refunded'
  timestamp_approved: string | null
  duration: number
  payment_method: string | null
  created_at: string
  // Joined
  user_email?: string
  user_name?: string
  plan_name?: string
}

// Filters and pagination
export interface AdminUsersFilter {
  search?: string
  subscription_status?: 'all' | 'active' | 'inactive'
  is_admin?: boolean | null
  sort_by?: 'created_at' | 'last_sign_in_at' | 'email'
  sort_order?: 'asc' | 'desc'
  page?: number
  per_page?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// Create/Update DTOs
export interface CreateUserDto {
  email: string
  password: string
  full_name?: string
  phone?: string
}

export interface CreateUserResponse {
  id: string
  email: string
}

export interface UpdateUserDto {
  full_name?: string
  phone?: string
  banned_until?: string | null
}

export interface CreateAdminDto {
  user_id: string
  role: string
  notes?: string
}

export interface CreateTransactionDto {
  user_id: string
  plan_id: number
  duration: number
  buyer_paid: number
  payment_method?: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  max_projects: number
  max_members: number
  max_articles_per_month: number
  owner_user_id: string
  owner_email?: string
  owner_name?: string
  created_at: string
  updated_at: string
  deleted_at?: string
  members_count: number
  projects_count: number
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'admin' | 'member'
  status: 'pending' | 'accepted'
  permissions: Record<string, unknown>
  invited_by?: string
  invited_at: string
  accepted_at?: string
  created_at: string
  // Joined fields
  email?: string
  full_name?: string
}

export interface WorkspaceProject {
  id: number
  name: string
  domain: string
  workspace_id: string | null
  user_id: string
  status: boolean
  created_at: string
  // Joined fields
  owner_email?: string
}

export interface CreateWorkspaceDto {
  name: string
  slug: string
  description?: string
  owner_user_id: string
  max_projects?: number
  max_members?: number
}

export interface AddWorkspaceMemberDto {
  workspace_id: string
  user_email: string
  role?: 'admin' | 'member'
}

export interface MoveProjectDto {
  project_id: number
  target_workspace_id: string | null
}

export interface UpdatePlanDto {
  name?: string
  description?: string
  price?: number
  monthly_credits?: number
  project_limit?: number
}

export interface CreatePlanDto {
  name: string
  description?: string | null
  price: number
  monthly_credits: number
  project_limit: number
}

// AI Provider Types
export type AIProvider = 'openai' | 'openrouter' | 'google'

export interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
  }
  architecture: {
    input_modalities: string[]
    output_modalities: string[]
  }
}

export interface OpenRouterModelsResponse {
  models: OpenRouterModel[]
  cached: boolean
}

export interface ValidateKeyResponse {
  valid: boolean
  configured: boolean
}

// System Prompts
export interface PromptVariable {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number'
  default: string
}

export interface SystemPrompt {
  id: string
  key: string
  name: string
  description: string | null
  category: string
  system_prompt: string
  user_prompt_template: string
  provider: AIProvider | null
  provider_model: string | null
  model: string | null
  temperature: number | null
  max_tokens: number | null
  is_active: boolean
  version: number
  variables: PromptVariable[] | null
  created_at: string
  updated_at: string
}

export interface SystemPromptFilters {
  search?: string
  category?: string
  is_active?: boolean
}

export interface CreateSystemPromptDto {
  key: string
  name: string
  description?: string
  category: string
  system_prompt: string
  user_prompt_template: string
  provider?: AIProvider
  provider_model?: string
  model?: string
  temperature?: number
  max_tokens?: number
  is_active?: boolean
  variables?: PromptVariable[]
}

export interface UpdateSystemPromptDto extends Partial<CreateSystemPromptDto> {
  id: string
}

// Test Prompt
export interface TestPromptDto {
  system_prompt: string
  user_prompt_template: string
  variables: Record<string, string>
  provider?: AIProvider
  model: string
  temperature: number
  max_tokens: number
}

export interface TestPromptResponse {
  output: string
  processingTime: number
  provider: AIProvider
  model: string
  tokensUsed?: {
    prompt: number
    completion: number
    total: number
  }
}

// Platform Settings
export interface PlatformSettings {
  id: string
  key: string
  value: unknown
  description?: string
  updated_at?: string
  updated_by?: string
}

export interface DefaultImageModelConfig {
  provider: AIProvider
  model: string
  updated_at?: string
}

// ==================== EXTRA CREDITS (Feature 032) ====================

export interface AddCreditsDto {
  user_id: string
  amount: number
  description: string
  expires_at?: string | null
}

export interface CreditsDashboardMetrics {
  total_distributed: number
  total_consumed: number
  total_available: number
  total_expired: number
  users_with_credits: number
}

export interface AdminCreditTransaction {
  id: number
  user_id: string
  user_email: string
  user_name: string | null
  transaction_type: 'credit' | 'debit'
  amount: number
  description: string
  expires_at: string | null
  created_at: string
  added_by_admin_id: string | null
  admin_name: string | null
  remaining_amount: number
  source_type: 'plan' | 'extra'
}

export interface AdminUserCreditsInfo {
  user_id: string
  user_email: string
  user_name: string | null
  extra_credits_available: number
  total_credits_received: number
  total_credits_consumed: number
  packages_count: number
  last_credit_added: string | null
}
