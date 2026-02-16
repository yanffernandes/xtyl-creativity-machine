import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateMenuVisibilityDto } from '@/shared/types/menu'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import { adminQueryKeys } from './queries'
import type {
  CreateUserDto,
  CreateUserResponse,
  UpdateUserDto,
  CreateAdminDto,
  CreateTransactionDto,
  CreateSystemPromptDto,
  UpdateSystemPromptDto,
  TestPromptDto,
  TestPromptResponse,
  AIProvider,
  DefaultImageModelConfig,
  CreatePlanDto,
  Plan,
  CreateWorkspaceDto,
  AddWorkspaceMemberDto,
  MoveProjectDto,
  AddCreditsDto,
} from '../types'

// Create User
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUserDto): Promise<CreateUserResponse> => {
      // Create user via backend (needs service_role)
      // api.post returns data directly, not response.data
      return api.post('/admin/users', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() })
    },
  })
}

// Update User
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserDto }) => {
      return api.patch(`/admin/users/${userId}`, data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(variables.userId) })
    },
  })
}

// Change User Password
export function useChangeUserPassword() {
  return useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return api.post(`/admin/users/${userId}/change-password`, { password })
    },
  })
}

// Ban/Unban User
export function useBanUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, bannedUntil }: { userId: string; bannedUntil: string | null }) => {
      return api.post(`/admin/users/${userId}/ban`, { banned_until: bannedUntil })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(variables.userId) })
    },
  })
}

// Delete User
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/admin/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() })
    },
  })
}

// Generate Magic Link (Login as User)
export function useGenerateMagicLink() {
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      return api.post<{ url: string; expires_at: string }>('/admin/magic-link', {
        target_user_id: userId,
        reason,
      })
    },
  })
}

// Create Admin
export function useCreateAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAdminDto) => {
      const { error } = await supabase
        .from('admins')
        .insert({
          user_id: data.user_id,
          role: data.role,
          notes: data.notes || null,
          status: 'active',
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.admins() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
    },
  })
}

// Add Admin by Email
export function useAddAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // First, find user by email
      const { data: users, error: searchError } = await supabase
        .from('admin_users_list')
        .select('id')
        .eq('email', email)
        .limit(1)

      if (searchError) throw searchError
      if (!users || users.length === 0) {
        throw new Error('Usuario nao encontrado com este email')
      }

      const userId = users[0].id

      // Check if already an admin
      const { data: existingAdmin } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .single()

      if (existingAdmin) {
        throw new Error('Este usuario ja e um administrador')
      }

      // Create admin
      const { error } = await supabase.from('admins').insert({
        user_id: userId,
        role,
        status: 'active',
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.admins() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
    },
  })
}

// Update Admin Role
export function useUpdateAdminRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role, notes }: { userId: string; role: string; notes?: string }) => {
      const { error } = await supabase
        .from('admins')
        .update({ role, notes, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.admins() })
    },
  })
}

// Remove Admin
export function useRemoveAdmin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('admins')
        .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
        .eq('user_id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.admins() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
    },
  })
}

// Create Transaction (Manual subscription)
export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTransactionDto) => {
      const { error } = await supabase.from('transactions').insert({
        user_id: data.user_id,
        plan_id: data.plan_id,
        duration: data.duration,
        buyer_paid: data.buyer_paid,
        payment_method: data.payment_method || 'manual',
        status: 'approved',
        timestamp_approved: new Date().toISOString(),
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() })
    },
  })
}

// Cancel Transaction
export function useCancelTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transactionId: number) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', transactionId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
    },
  })
}

// Update System Setting
export function useUpdateSystemSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, value }: { id: string; value: unknown }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: JSON.stringify(value) })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.settings() })
    },
  })
}

// Create Plan
export function useCreatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePlanDto) => {
      const { error } = await supabase.from('plans').insert({
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        monthly_credits: data.monthly_credits,
        project_limit: data.project_limit,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.plans() })
    },
  })
}

// Update Plan
export function useUpdatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: Partial<Omit<Plan, 'id' | 'created_at' | 'updated_at'>>
    }) => {
      const { error } = await supabase
        .from('plans')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.plans() })
    },
  })
}

// Log Admin Action
export function useLogAdminAction() {
  return useMutation({
    mutationFn: async (data: {
      action: string
      resource_type: string
      resource_id?: string
      details?: Record<string, unknown>
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('admin_audit_log').insert({
        admin_id: user.id,
        action: data.action,
        resource_type: data.resource_type,
        resource_id: data.resource_id,
        details: data.details || {},
      })

      if (error) throw error
    },
  })
}

// System Prompts CRUD

// Create System Prompt
export function useCreateSystemPrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSystemPromptDto) => {
      const { error } = await supabase.from('system_prompts').insert({
        key: data.key,
        name: data.name,
        description: data.description || null,
        category: data.category,
        system_prompt: data.system_prompt,
        user_prompt_template: data.user_prompt_template,
        provider: data.provider || 'openai',
        provider_model: data.provider_model || null,
        model: data.model || 'google/gemini-3-flash-preview',
        temperature: data.temperature ?? 0.7,
        max_tokens: data.max_tokens ?? 2000,
        is_active: data.is_active ?? true,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.systemPrompts() })
    },
  })
}

// Update System Prompt
export function useUpdateSystemPrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateSystemPromptDto) => {
      const { id, ...updateData } = data

      const { error } = await supabase
        .from('system_prompts')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.systemPrompts() })
    },
  })
}

// Delete System Prompt
export function useDeleteSystemPrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('system_prompts').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.systemPrompts() })
    },
  })
}

// Test System Prompt
export function useTestSystemPrompt() {
  return useMutation({
    mutationFn: async (data: TestPromptDto): Promise<TestPromptResponse> => {
      return api.post<TestPromptResponse>('/admin/system-prompts/test', data)
    },
  })
}

// ==================== WORKSPACE MUTATIONS ====================

// Create Workspace
export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateWorkspaceDto) => {
      const { data: workspace, error } = await supabase
        .from('workspaces')
        .insert({
          name: data.name,
          slug: data.slug,
          description: data.description || null,
          owner_user_id: data.owner_user_id,
          max_projects: data.max_projects ?? 5,
          max_members: data.max_members ?? 3,
        })
        .select()
        .single()

      if (error) throw error
      return workspace
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspaces() })
    },
  })
}

// Delete Workspace
export function useDeleteWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      // Soft delete
      const { error } = await supabase
        .from('workspaces')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', workspaceId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspaces() })
    },
  })
}

// Add Member to Workspace
export function useAddWorkspaceMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AddWorkspaceMemberDto) => {
      // First find user by email
      const { data: users, error: searchError } = await supabase
        .from('admin_users_list')
        .select('id')
        .eq('email', data.user_email)
        .limit(1)

      if (searchError) throw searchError
      if (!users || users.length === 0) {
        throw new Error('Usuario nao encontrado com este email')
      }

      const userId = users[0].id

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', data.workspace_id)
        .eq('user_id', userId)
        .single()

      if (existingMember) {
        throw new Error('Este usuario ja e membro deste workspace')
      }

      // Add member
      const { error } = await supabase.from('workspace_members').insert({
        workspace_id: data.workspace_id,
        user_id: userId,
        role: data.role || 'member',
        status: 'active', // Admin adding directly = active
        accepted_at: new Date().toISOString(),
      })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspaces() })
      queryClient.invalidateQueries({
        queryKey: [...adminQueryKeys.workspaces(), 'members', variables.workspace_id],
      })
    },
  })
}

// Remove Member from Workspace
export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memberId, workspaceId }: { memberId: string; workspaceId: string }) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      return { workspaceId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspaces() })
      queryClient.invalidateQueries({
        queryKey: [...adminQueryKeys.workspaces(), 'members', data.workspaceId],
      })
    },
  })
}

// Move Project to Workspace
export function useMoveProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: MoveProjectDto) => {
      const { error } = await supabase
        .from('projects')
        .update({ workspace_id: data.target_workspace_id })
        .eq('id', data.project_id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspaces() })
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'all-projects'] })
    },
  })
}

// Remove Project from Workspace (set workspace_id to null)
export function useRemoveProjectFromWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, workspaceId }: { projectId: number; workspaceId: string }) => {
      const { error } = await supabase
        .from('projects')
        .update({ workspace_id: null })
        .eq('id', projectId)

      if (error) throw error
      return { workspaceId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.workspaces() })
      queryClient.invalidateQueries({
        queryKey: [...adminQueryKeys.workspaces(), 'projects', data.workspaceId],
      })
    },
  })
}

// Update Default Image Model
export function useUpdateDefaultImageModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { provider: AIProvider; model: string }): Promise<DefaultImageModelConfig> => {
      return api.patch('/admin/settings/image-model', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'default-image-model'] })
    },
  })
}

// ==================== EXTRA CREDITS (Feature 032) ====================

// T021: Add extra credits to a user
export function useAddCredits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AddCreditsDto) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Call the add_extra_credits RPC function
      const { data: transactionId, error } = await supabase.rpc('add_extra_credits', {
        p_user_id: data.user_id,
        p_amount: data.amount,
        p_description: data.description,
        p_expires_at: data.expires_at || null,
        p_admin_id: user.id,
        p_metadata: {},
      })

      if (error) throw error
      return transactionId
    },
    onSuccess: (_, variables) => {
      // Invalidate admin user list
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() })
      // Invalidate credits queries
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.summaryV2(variables.user_id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.packages(variables.user_id) })
    },
  })
}

// ==================== MENU VISIBILITY (Feature 029) ====================

// Update Menu Visibility Config
export function useUpdateMenuVisibilityConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      menuItemKey,
      data,
    }: {
      menuItemKey: string
      data: UpdateMenuVisibilityDto
    }) => {
      // First get existing config to check if essential
      const { data: existing, error: fetchError } = await supabase
        .from('menu_visibility_config')
        .select('is_essential')
        .eq('menu_item_key', menuItemKey)
        .single()

      if (fetchError) throw fetchError

      // Validate: essential items cannot be completely hidden
      if (existing?.is_essential) {
        const wouldBeHidden =
          !data.is_public &&
          (!data.plan_ids || data.plan_ids.length === 0) &&
          !data.show_as_coming_soon
        if (wouldBeHidden) {
          throw new Error('Itens essenciais não podem ser completamente ocultos')
        }
      }

      // Update the config
      const { error } = await supabase
        .from('menu_visibility_config')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('menu_item_key', menuItemKey)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.menuVisibilityList() })
      // Also invalidate user menu visibility cache
      queryClient.invalidateQueries({ queryKey: ['menu-visibility'] })
    },
  })
}
