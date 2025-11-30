/**
 * Workspace Hooks
 *
 * React Query hooks for workspace operations via Supabase Client.
 * Provides caching, optimistic updates, and error handling.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US1 - Fast Project Listing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceService } from '@/lib/supabase/workspaces'
import { useToast } from './use-toast'
import type { WorkspaceInsert, WorkspaceUpdate } from '@/types/supabase'

// Query keys
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: () => [...workspaceKeys.lists()] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  members: (workspaceId: string) => [...workspaceKeys.all, 'members', workspaceId] as const,
}

/**
 * Hook to fetch all workspaces
 */
export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      const { data, error } = await workspaceService.list()
      if (error) throw error
      return data
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

/**
 * Hook to fetch a single workspace
 */
export function useWorkspace(id: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await workspaceService.get(id)
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch workspace members
 */
export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: async () => {
      const { data, error } = await workspaceService.listMembers(workspaceId)
      if (error) throw error
      return data
    },
    enabled: !!workspaceId,
  })
}

/**
 * Hook to create a workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (workspace: WorkspaceInsert) => {
      const { data, error } = await workspaceService.create(workspace)
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
      toast({
        title: 'Workspace criado',
        description: `"${data?.name}" foi criado com sucesso.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar workspace',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to update a workspace
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WorkspaceUpdate }) => {
      const { data: result, error } = await workspaceService.update(id, data)
      if (error) throw error
      return result
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
      toast({
        title: 'Workspace atualizado',
        description: 'As alterações foram salvas.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar workspace',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to delete a workspace
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceService.delete(id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() })
      toast({
        title: 'Workspace excluído',
        description: 'O workspace foi removido.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir workspace',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to add a member to a workspace
 */
export function useAddWorkspaceMember() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
      role,
    }: {
      workspaceId: string
      userId: string
      role: 'admin' | 'member'
    }) => {
      const { data, error } = await workspaceService.addMember(workspaceId, userId, role)
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(variables.workspaceId) })
      toast({
        title: 'Membro adicionado',
        description: 'O membro foi adicionado ao workspace.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar membro',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to remove a member from a workspace
 */
export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const { error } = await workspaceService.removeMember(workspaceId, userId)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(variables.workspaceId) })
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido do workspace.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover membro',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
