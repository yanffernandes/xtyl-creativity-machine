/**
 * Chat Conversations Hooks
 *
 * React Query hooks for conversation metadata via Supabase Client.
 * Provides caching and optimistic updates for conversation management.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US6 - Preferences & Conversations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationService } from '@/lib/supabase/conversations'
import { useToast } from './use-toast'
import type { ChatConversationInsert, ChatConversationUpdate, ChatConversation } from '@/types/supabase'

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: () => [...conversationKeys.lists(), 'all'] as const,
  workspace: (workspaceId: string) => [...conversationKeys.lists(), 'workspace', workspaceId] as const,
  project: (projectId: string) => [...conversationKeys.lists(), 'project', projectId] as const,
  archived: () => [...conversationKeys.lists(), 'archived'] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
}

/**
 * Hook to fetch all conversations for current user
 */
export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.list(),
    queryFn: async () => {
      const { data, error } = await conversationService.list()
      if (error) throw error
      return data
    },
    staleTime: 30000,
  })
}

/**
 * Hook to fetch conversations in a workspace
 */
export function useWorkspaceConversations(workspaceId: string) {
  return useQuery({
    queryKey: conversationKeys.workspace(workspaceId),
    queryFn: async () => {
      const { data, error } = await conversationService.listByWorkspace(workspaceId)
      if (error) throw error
      return data
    },
    enabled: !!workspaceId,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch conversations in a project
 */
export function useProjectConversations(projectId: string) {
  return useQuery({
    queryKey: conversationKeys.project(projectId),
    queryFn: async () => {
      const { data, error } = await conversationService.listByProject(projectId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch archived conversations
 */
export function useArchivedConversations() {
  return useQuery({
    queryKey: conversationKeys.archived(),
    queryFn: async () => {
      const { data, error } = await conversationService.listArchived()
      if (error) throw error
      return data
    },
  })
}

/**
 * Hook to fetch a single conversation
 */
export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await conversationService.get(id)
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a conversation with optimistic update
 */
export function useCreateConversation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (conversation: Omit<ChatConversationInsert, 'user_id'>) => {
      const { data, error } = await conversationService.create(conversation)
      if (error) throw error
      return data
    },
    onMutate: async (newConversation) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.list() })

      const previousConversations = queryClient.getQueryData<ChatConversation[]>(
        conversationKeys.list()
      )

      const optimisticConversation: ChatConversation = {
        id: `temp-${Date.now()}`,
        title: newConversation.title || 'Nova conversa',
        user_id: 'current-user',
        workspace_id: newConversation.workspace_id,
        project_id: newConversation.project_id || null,
        summary: newConversation.summary || null,
        messages_json: [],
        model_used: null,
        document_ids_context: [],
        folder_ids_context: [],
        created_document_ids: [],
        is_archived: false,
        message_count: 0,
        last_message_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      queryClient.setQueryData<ChatConversation[]>(
        conversationKeys.list(),
        (old) => [optimisticConversation, ...(old || [])]
      )

      return { previousConversations }
    },
    onError: (error, _, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationKeys.list(), context.previousConversations)
      }
      toast({
        title: 'Erro ao criar conversa',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      if (variables.workspace_id) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.workspace(variables.workspace_id) })
      }
      if (variables.project_id) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.project(variables.project_id) })
      }
    },
  })
}

/**
 * Hook to update conversation metadata
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ChatConversationUpdate }) => {
      const { data: result, error } = await conversationService.update(id, data)
      if (error) throw error
      return result
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(id) })

      const previousConversation = queryClient.getQueryData<ChatConversation>(
        conversationKeys.detail(id)
      )

      if (previousConversation) {
        queryClient.setQueryData<ChatConversation>(conversationKeys.detail(id), {
          ...previousConversation,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousConversation }
    },
    onError: (error, variables, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(conversationKeys.detail(variables.id), context.previousConversation)
      }
      toast({
        title: 'Erro ao atualizar conversa',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
  })
}

/**
 * Hook to update conversation title
 */
export function useUpdateConversationTitle() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { data, error } = await conversationService.updateTitle(id, title)
      if (error) throw error
      return data
    },
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(id) })

      const previousConversation = queryClient.getQueryData<ChatConversation>(
        conversationKeys.detail(id)
      )

      if (previousConversation) {
        queryClient.setQueryData<ChatConversation>(conversationKeys.detail(id), {
          ...previousConversation,
          title,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousConversation }
    },
    onError: (error, variables, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(conversationKeys.detail(variables.id), context.previousConversation)
      }
      toast({
        title: 'Erro ao renomear conversa',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    },
  })
}

/**
 * Hook to move conversation to a project
 */
export function useMoveConversationToProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string | null }) => {
      const { data, error } = await conversationService.moveToProject(id, projectId)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      toast({
        title: 'Conversa movida',
        description: 'A conversa foi movida com sucesso.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao mover conversa',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to archive a conversation
 */
export function useArchiveConversation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await conversationService.archive(id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      toast({
        title: 'Conversa arquivada',
        description: 'A conversa foi movida para o arquivo.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao arquivar conversa',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to restore an archived conversation
 */
export function useRestoreConversation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await conversationService.restore(id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      toast({
        title: 'Conversa restaurada',
        description: 'A conversa foi restaurada com sucesso.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao restaurar conversa',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to permanently delete a conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await conversationService.delete(id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      toast({
        title: 'Conversa excluída',
        description: 'A conversa foi removida permanentemente.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir conversa',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
