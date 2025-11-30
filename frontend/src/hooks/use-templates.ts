/**
 * Template Hooks
 *
 * React Query hooks for template operations via Supabase Client.
 * Provides caching, optimistic updates, and error handling.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US5 - Template Access
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateService } from '@/lib/supabase/templates'
import { useToast } from './use-toast'
import type { TemplateInsert, TemplateUpdate, Template } from '@/types/supabase'

// Query keys
export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (workspaceId?: string) => [...templateKeys.lists(), { workspaceId }] as const,
  system: () => [...templateKeys.lists(), 'system'] as const,
  user: () => [...templateKeys.lists(), 'user'] as const,
  workspace: (workspaceId: string) => [...templateKeys.lists(), 'workspace', workspaceId] as const,
  category: (category: string) => [...templateKeys.lists(), 'category', category] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
}

/**
 * Hook to fetch all accessible templates
 */
export function useTemplates(workspaceId?: string) {
  return useQuery({
    queryKey: templateKeys.list(workspaceId),
    queryFn: async () => {
      const { data, error } = await templateService.list(workspaceId)
      if (error) throw error
      return data
    },
    staleTime: 60000, // Templates change infrequently, 1 minute stale time
  })
}

/**
 * Hook to fetch system templates only
 */
export function useSystemTemplates() {
  return useQuery({
    queryKey: templateKeys.system(),
    queryFn: async () => {
      const { data, error } = await templateService.listSystem()
      if (error) throw error
      return data
    },
    staleTime: 300000, // System templates rarely change, 5 minute stale time
  })
}

/**
 * Hook to fetch user's own templates
 */
export function useUserTemplates() {
  return useQuery({
    queryKey: templateKeys.user(),
    queryFn: async () => {
      const { data, error } = await templateService.listUserTemplates()
      if (error) throw error
      return data
    },
    staleTime: 30000,
  })
}

/**
 * Hook to fetch templates shared with a workspace
 */
export function useWorkspaceTemplates(workspaceId: string) {
  return useQuery({
    queryKey: templateKeys.workspace(workspaceId),
    queryFn: async () => {
      const { data, error } = await templateService.listWorkspaceTemplates(workspaceId)
      if (error) throw error
      return data
    },
    enabled: !!workspaceId,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch templates by category
 */
export function useTemplatesByCategory(category: string) {
  return useQuery({
    queryKey: templateKeys.category(category),
    queryFn: async () => {
      const { data, error } = await templateService.listByCategory(category)
      if (error) throw error
      return data
    },
    enabled: !!category,
    staleTime: 60000,
  })
}

/**
 * Hook to fetch a single template
 */
export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await templateService.get(id)
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a template with optimistic update
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (template: Omit<TemplateInsert, 'user_id' | 'is_system'>) => {
      const { data, error } = await templateService.create(template)
      if (error) throw error
      return data
    },
    onMutate: async (newTemplate) => {
      await queryClient.cancelQueries({ queryKey: templateKeys.user() })

      const previousTemplates = queryClient.getQueryData<Template[]>(templateKeys.user())

      const optimisticTemplate: Template = {
        id: `temp-${Date.now()}`,
        name: newTemplate.name,
        description: newTemplate.description || null,
        prompt: newTemplate.prompt,
        category: newTemplate.category,
        icon: newTemplate.icon || null,
        tags: newTemplate.tags || null,
        user_id: 'current-user',
        workspace_id: newTemplate.workspace_id || null,
        is_system: false,
        is_active: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: null,
      }

      queryClient.setQueryData<Template[]>(
        templateKeys.user(),
        (old) => [...(old || []), optimisticTemplate].sort((a, b) => a.name.localeCompare(b.name))
      )

      return { previousTemplates }
    },
    onError: (error, _, context) => {
      if (context?.previousTemplates) {
        queryClient.setQueryData(templateKeys.user(), context.previousTemplates)
      }
      toast({
        title: 'Erro ao criar template',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast({
        title: 'Template criado',
        description: `"${data?.name}" foi criado com sucesso.`,
      })
    },
  })
}

/**
 * Hook to update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TemplateUpdate }) => {
      const { data: result, error } = await templateService.update(id, data)
      if (error) throw error
      return result
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: templateKeys.detail(id) })

      const previousTemplate = queryClient.getQueryData<Template>(templateKeys.detail(id))

      if (previousTemplate) {
        queryClient.setQueryData<Template>(templateKeys.detail(id), {
          ...previousTemplate,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousTemplate }
    },
    onError: (error, variables, context) => {
      if (context?.previousTemplate) {
        queryClient.setQueryData(templateKeys.detail(variables.id), context.previousTemplate)
      }
      toast({
        title: 'Erro ao atualizar template',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast({
        title: 'Template atualizado',
        description: 'As alterações foram salvas.',
      })
    },
  })
}

/**
 * Hook to share a template with a workspace
 */
export function useShareTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { data, error } = await templateService.shareWithWorkspace(id, workspaceId)
      if (error) throw error
      return data
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      queryClient.invalidateQueries({ queryKey: templateKeys.workspace(workspaceId) })
      toast({
        title: 'Template compartilhado',
        description: 'O template agora está disponível para o workspace.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao compartilhar template',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to unshare a template from workspace
 */
export function useUnshareTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await templateService.unshareFromWorkspace(id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast({
        title: 'Template privado',
        description: 'O template não está mais compartilhado.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao tornar template privado',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to duplicate a template
 */
export function useDuplicateTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName?: string }) => {
      const { data, error } = await templateService.duplicate(id, newName)
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.user() })
      toast({
        title: 'Template duplicado',
        description: `"${data?.name}" foi criado a partir do template original.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao duplicar template',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await templateService.delete(id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() })
      toast({
        title: 'Template excluído',
        description: 'O template foi removido permanentemente.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir template',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
