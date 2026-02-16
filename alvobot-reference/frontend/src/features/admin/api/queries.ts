import { useQuery } from '@tanstack/react-query'
import type { MenuVisibilityConfig } from '@/shared/types/menu'
import { supabase } from '@/shared/utils/supabase'
import type {
  AdminDashboardStats,
  AdminUser,
  AdminUsersFilter,
  AdminAuditLog,
  Plan,
  Transaction,
  SystemSetting,
  Admin,
  AdminRole,
  Workspace,
  WorkspaceMember,
  WorkspaceProject,
  SystemPrompt,
  SystemPromptFilters,
  OpenRouterModelsResponse,
  ValidateKeyResponse,
  DefaultImageModelConfig,
  CreditsDashboardMetrics,
  AdminCreditTransaction,
  AdminUserCreditsInfo,
} from '../types'

export const adminQueryKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminQueryKeys.all, 'dashboard'] as const,
  users: (filters?: AdminUsersFilter) => [...adminQueryKeys.all, 'users', filters] as const,
  user: (id: string) => [...adminQueryKeys.all, 'user', id] as const,
  admins: () => [...adminQueryKeys.all, 'admins'] as const,
  adminRoles: () => [...adminQueryKeys.all, 'admin-roles'] as const,
  audit: (page?: number) => [...adminQueryKeys.all, 'audit', page] as const,
  plans: () => [...adminQueryKeys.all, 'plans'] as const,
  transactions: (filters?: object) => [...adminQueryKeys.all, 'transactions', filters] as const,
  settings: () => [...adminQueryKeys.all, 'settings'] as const,
  workspaces: (filters?: object) => [...adminQueryKeys.all, 'workspaces', filters] as const,
  systemPrompts: (filters?: SystemPromptFilters) => [...adminQueryKeys.all, 'system-prompts', filters] as const,
  menuVisibility: () => [...adminQueryKeys.all, 'menu-visibility'] as const,
  menuVisibilityList: () => [...adminQueryKeys.menuVisibility(), 'list'] as const,
}

// Dashboard Stats
export function useAdminDashboardStats() {
  return useQuery({
    queryKey: adminQueryKeys.dashboard(),
    queryFn: async (): Promise<AdminDashboardStats> => {
      const { data, error } = await supabase
        .from('admin_dashboard_stats')
        .select('*')
        .single()

      if (error) throw error
      return data as AdminDashboardStats
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

// Users List
export function useAdminUsers(filters?: AdminUsersFilter) {
  return useQuery({
    queryKey: adminQueryKeys.users(filters),
    queryFn: async (): Promise<AdminUser[]> => {
      let query = supabase
        .from('admin_users_list')
        .select('*')

      // Apply filters
      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%`)
      }

      if (filters?.subscription_status && filters.subscription_status !== 'all') {
        query = query.eq('subscription_status', filters.subscription_status)
      }

      if (filters?.is_admin !== undefined && filters.is_admin !== null) {
        query = query.eq('is_admin', filters.is_admin)
      }

      // Apply sorting
      const sortBy = filters?.sort_by || 'created_at'
      const sortOrder = filters?.sort_order || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      const page = filters?.page || 1
      const perPage = filters?.per_page || 20
      const start = (page - 1) * perPage
      const end = start + perPage - 1
      query = query.range(start, end)

      const { data, error } = await query

      if (error) throw error
      return data as AdminUser[]
    },
    staleTime: 1000 * 30, // 30 seconds
  })
}

// Single User
export function useAdminUser(userId: string) {
  return useQuery({
    queryKey: adminQueryKeys.user(userId),
    queryFn: async (): Promise<AdminUser | null> => {
      const { data, error } = await supabase
        .from('admin_users_list')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data as AdminUser
    },
    enabled: !!userId,
  })
}

// Admin Users
export function useAdmins() {
  return useQuery({
    queryKey: adminQueryKeys.admins(),
    queryFn: async (): Promise<Admin[]> => {
      const { data, error } = await supabase
        .from('admin_users_view')
        .select('*')
        .order('role_level', { ascending: false })

      if (error) throw error
      return data as Admin[]
    },
  })
}

// Admin Roles
export function useAdminRoles() {
  return useQuery({
    queryKey: adminQueryKeys.adminRoles(),
    queryFn: async (): Promise<AdminRole[]> => {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('status', 'active')
        .order('level', { ascending: false })

      if (error) throw error
      return data as AdminRole[]
    },
  })
}

// Audit Log
export function useAdminAuditLog(page = 1, perPage = 50) {
  return useQuery({
    queryKey: adminQueryKeys.audit(page),
    queryFn: async (): Promise<AdminAuditLog[]> => {
      const start = (page - 1) * perPage
      const end = start + perPage - 1

      const { data, error } = await supabase
        .from('admin_audit_log')
        .select(`
          *,
          admin:admins!admin_id(
            user_id,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .range(start, end)

      if (error) throw error
      return data as AdminAuditLog[]
    },
  })
}

// Plans
export function useAdminPlans() {
  return useQuery({
    queryKey: adminQueryKeys.plans(),
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true })

      if (error) throw error
      return data as Plan[]
    },
  })
}

// Transactions
export function useAdminTransactions(filters?: {
  userId?: string
  status?: string
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: adminQueryKeys.transactions(filters),
    queryFn: async (): Promise<Transaction[]> => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          plan:plans(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((tx) => ({
        ...tx,
        plan_name: tx.plan?.name,
      })) as Transaction[]
    },
  })
}

// System Settings
export function useSystemSettings() {
  return useQuery({
    queryKey: adminQueryKeys.settings(),
    queryFn: async (): Promise<SystemSetting[]> => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('id')

      if (error) throw error
      return data as SystemSetting[]
    },
  })
}

// Users count for stats
export function useUsersCount() {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('admin_users_list')
        .select('*', { count: 'exact', head: true })

      if (error) throw error
      return count || 0
    },
  })
}

// Workspaces
export function useAdminWorkspaces(filters?: { search?: string }) {
  return useQuery({
    queryKey: adminQueryKeys.workspaces(filters),
    queryFn: async (): Promise<Workspace[]> => {
      // First, get workspaces
      let query = supabase
        .from('workspaces')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`)
      }

      const { data, error } = await query

      if (error) throw error

      if (!data || data.length === 0) return []

      // Get unique owner IDs
      const ownerIds = [...new Set(data.map((ws) => ws.owner_user_id))]

      // Fetch owner info from admin_users_list view
      const { data: owners } = await supabase
        .from('admin_users_list')
        .select('id, email, full_name')
        .in('id', ownerIds)

      const ownerMap = new Map(owners?.map((o) => [o.id, o]) || [])

      // Get projects count and members count for each workspace
      const workspacesWithCounts = await Promise.all(
        data.map(async (ws) => {
          const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', ws.id)
            .eq('is_deleted', false)

          const { count: membersCount } = await supabase
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', ws.id)

          const owner = ownerMap.get(ws.owner_user_id)

          return {
            ...ws,
            owner_email: owner?.email,
            owner_name: owner?.full_name,
            projects_count: count || 0,
            members_count: membersCount || 0,
          }
        })
      )

      return workspacesWithCounts as Workspace[]
    },
    staleTime: 1000 * 30,
  })
}

// Workspace Members
export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: [...adminQueryKeys.workspaces(), 'members', workspaceId] as const,
    queryFn: async (): Promise<WorkspaceMember[]> => {
      if (!workspaceId) return []

      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) return []

      // Get user info from admin_users_list
      const userIds = data.map((m) => m.user_id)
      const { data: users } = await supabase
        .from('admin_users_list')
        .select('id, email, full_name')
        .in('id', userIds)

      const userMap = new Map(users?.map((u) => [u.id, u]) || [])

      return data.map((m) => {
        const user = userMap.get(m.user_id)
        return {
          ...m,
          email: user?.email,
          full_name: user?.full_name,
        }
      }) as WorkspaceMember[]
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 30,
  })
}

// Workspace Projects
export function useWorkspaceProjects(workspaceId: string | null) {
  return useQuery({
    queryKey: [...adminQueryKeys.workspaces(), 'projects', workspaceId] as const,
    queryFn: async (): Promise<WorkspaceProject[]> => {
      if (!workspaceId) return []

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, domain, workspace_id, user_id, status, created_at')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) return []

      // Get owner info from admin_users_list
      const userIds = [...new Set(data.map((p) => p.user_id))]
      const { data: users } = await supabase
        .from('admin_users_list')
        .select('id, email')
        .in('id', userIds)

      const userMap = new Map(users?.map((u) => [u.id, u]) || [])

      return data.map((p) => ({
        ...p,
        owner_email: userMap.get(p.user_id)?.email,
      })) as WorkspaceProject[]
    },
    enabled: !!workspaceId,
    staleTime: 1000 * 30,
  })
}

// All Projects (for moving between workspaces)
export function useAllProjects(filters?: { search?: string; noWorkspace?: boolean }) {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'all-projects', filters] as const,
    queryFn: async (): Promise<WorkspaceProject[]> => {
      let query = supabase
        .from('projects')
        .select('id, name, domain, workspace_id, user_id, status, created_at')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100)

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,domain.ilike.%${filters.search}%`)
      }

      if (filters?.noWorkspace) {
        query = query.is('workspace_id', null)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || data.length === 0) return []

      // Get owner info from admin_users_list
      const userIds = [...new Set(data.map((p) => p.user_id).filter(Boolean))]
      const { data: users } = await supabase
        .from('admin_users_list')
        .select('id, email')
        .in('id', userIds)

      const userMap = new Map(users?.map((u) => [u.id, u]) || [])

      return data.map((p) => ({
        ...p,
        owner_email: userMap.get(p.user_id)?.email,
      })) as WorkspaceProject[]
    },
    staleTime: 1000 * 30,
  })
}

// Search users for adding to workspace
export function useSearchUsers(search: string) {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'search-users', search] as const,
    queryFn: async () => {
      if (!search || search.length < 2) return []

      const { data, error } = await supabase
        .from('admin_users_list')
        .select('id, email, full_name')
        .or(`email.ilike.%${search}%,full_name.ilike.%${search}%`)
        .limit(10)

      if (error) throw error
      return data || []
    },
    enabled: search.length >= 2,
    staleTime: 1000 * 10,
  })
}

// System Prompts
export function useSystemPrompts(filters?: SystemPromptFilters) {
  return useQuery({
    queryKey: adminQueryKeys.systemPrompts(filters),
    queryFn: async (): Promise<SystemPrompt[]> => {
      let query = supabase
        .from('system_prompts')
        .select('*')
        .order('category')
        .order('name')

      if (filters?.search) {
        query = query.or(`key.ilike.%${filters.search}%,name.ilike.%${filters.search}%`)
      }

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      const { data, error } = await query

      if (error) throw error
      return data as SystemPrompt[]
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

// System Prompt Categories (distinct)
export function useSystemPromptCategories() {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'system-prompt-categories'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('system_prompts')
        .select('category')
        .order('category')

      if (error) throw error

      // Get unique categories
      const categories = [...new Set(data?.map((d) => d.category) || [])]
      return categories
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// OpenRouter Models
export function useOpenRouterModels(type: 'text' | 'image' | 'all' = 'all', enabled = true) {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'openrouter-models', type],
    queryFn: async (): Promise<OpenRouterModelsResponse> => {
      const { api } = await import('@/shared/utils/api')
      return api.get(`/admin/openrouter/models?type=${type}`)
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes (matches backend cache)
  })
}

// Validate OpenRouter API Key
export function useValidateOpenRouterKey() {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'openrouter-validate-key'],
    queryFn: async (): Promise<ValidateKeyResponse> => {
      const { api } = await import('@/shared/utils/api')
      return api.post('/admin/openrouter/validate-key', {})
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: false,
  })
}

// Default Image Model
export function useDefaultImageModel() {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'default-image-model'],
    queryFn: async (): Promise<DefaultImageModelConfig> => {
      const { api } = await import('@/shared/utils/api')
      return api.get('/admin/settings/image-model')
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// ==================== EXTRA CREDITS (Feature 032) ====================

// Credits Dashboard Metrics (T050)
export function useCreditsDashboard() {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'credits-dashboard'],
    queryFn: async (): Promise<CreditsDashboardMetrics> => {
      const { data, error } = await supabase
        .from('admin_credits_dashboard_metrics')
        .select('*')
        .single()

      if (error) throw error
      return data as CreditsDashboardMetrics
    },
    staleTime: 1000 * 30, // 30 seconds
  })
}

// Recent Credit Transactions (T050)
export function useRecentCreditTransactions(limit = 20) {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'credits-transactions', limit],
    queryFn: async (): Promise<AdminCreditTransaction[]> => {
      const { data, error } = await supabase
        .from('admin_credits_recent_transactions')
        .select('*')
        .limit(limit)

      if (error) throw error
      return data as AdminCreditTransaction[]
    },
    staleTime: 1000 * 30,
  })
}

// Admin User Credits Info (T051)
export function useAdminUserCredits(filters?: { search?: string }) {
  return useQuery({
    queryKey: [...adminQueryKeys.all, 'user-credits', filters],
    queryFn: async (): Promise<AdminUserCreditsInfo[]> => {
      const { data, error } = await supabase
        .rpc('get_admin_user_credits_list', {
          p_search: filters?.search || null
        })

      if (error) throw error
      return data as AdminUserCreditsInfo[]
    },
    staleTime: 1000 * 30,
  })
}

// ==================== MENU VISIBILITY (Feature 029) ====================

// Menu Visibility Configs
export function useMenuVisibilityConfigs() {
  return useQuery({
    queryKey: adminQueryKeys.menuVisibilityList(),
    queryFn: async (): Promise<MenuVisibilityConfig[]> => {
      const { data, error } = await supabase
        .from('menu_visibility_config')
        .select('*')
        .order('menu_item_key')

      if (error) throw error
      return data as MenuVisibilityConfig[]
    },
    staleTime: 1000 * 60, // 1 minute
  })
}
