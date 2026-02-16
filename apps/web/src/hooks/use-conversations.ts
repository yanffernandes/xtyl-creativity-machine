/**
 * Chat Conversations Hooks
 *
 * React Query hooks for conversation metadata via Supabase Client.
 * Provides caching and optimistic updates for conversation management.
 *
 * Ported from: frontend/src/hooks/use-conversations.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  role: string
  content: string
}

export interface ChatConversation {
  id: string
  user_id: string
  project_id: string | null
  workspace_id: string
  title: string | null
  summary: string | null
  messages_json: ChatMessage[]
  model_used: string | null
  document_ids_context: string[]
  folder_ids_context: string[]
  created_document_ids: string[]
  is_archived: boolean
  message_count: number
  last_message_at: string | null
  created_at: string
  updated_at: string | null
}

export interface ChatConversationInsert {
  id?: string
  user_id: string
  project_id?: string | null
  workspace_id: string
  title?: string | null
  summary?: string | null
  messages_json?: ChatMessage[]
  model_used?: string | null
  document_ids_context?: string[]
  folder_ids_context?: string[]
  created_document_ids?: string[]
  is_archived?: boolean
  message_count?: number
  last_message_at?: string | null
  created_at?: string
  updated_at?: string | null
}

export interface ChatConversationUpdate {
  id?: string
  user_id?: string
  project_id?: string | null
  workspace_id?: string
  title?: string | null
  summary?: string | null
  messages_json?: ChatMessage[]
  model_used?: string | null
  document_ids_context?: string[]
  folder_ids_context?: string[]
  created_document_ids?: string[]
  is_archived?: boolean
  message_count?: number
  last_message_at?: string | null
  created_at?: string
  updated_at?: string | null
}

interface ServiceResult<T> {
  data: T | null
  error: Error | null
}

// ============================================================================
// Conversation Service (Supabase direct)
// ============================================================================

const conversationService = {
  async list(): Promise<ServiceResult<ChatConversation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      return { data: data as ChatConversation[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async listByWorkspace(workspaceId: string): Promise<ServiceResult<ChatConversation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      return { data: data as ChatConversation[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async listByProject(projectId: string): Promise<ServiceResult<ChatConversation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) throw error
      return { data: data as ChatConversation[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async listArchived(): Promise<ServiceResult<ChatConversation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return { data: data as ChatConversation[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async get(id: string): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return { data: data as ChatConversation, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async create(
    conversation: Omit<ChatConversationInsert, 'user_id'>
  ): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          ...conversation,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return { data: data as ChatConversation, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async update(
    id: string,
    conversation: ChatConversationUpdate
  ): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          ...conversation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data: data as ChatConversation, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async updateTitle(id: string, title: string): Promise<ServiceResult<ChatConversation>> {
    return this.update(id, { title })
  },

  async moveToProject(
    id: string,
    projectId: string | null
  ): Promise<ServiceResult<ChatConversation>> {
    return this.update(id, { project_id: projectId })
  },

  async archive(id: string): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data: data as ChatConversation, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async restore(id: string): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          is_archived: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data: data as ChatConversation, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

// ============================================================================
// Query Keys
// ============================================================================

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: () => [...conversationKeys.lists(), 'all'] as const,
  workspace: (workspaceId: string) =>
    [...conversationKeys.lists(), 'workspace', workspaceId] as const,
  project: (projectId: string) =>
    [...conversationKeys.lists(), 'project', projectId] as const,
  archived: () => [...conversationKeys.lists(), 'archived'] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
}

// ============================================================================
// Query Hooks
// ============================================================================

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

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a conversation with optimistic update
 */
export function useCreateConversation() {
  const queryClient = useQueryClient()

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
        title: newConversation.title || 'New conversation',
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
    onError: (error: Error, _variables, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationKeys.list(), context.previousConversations)
      }
      toast.error('Failed to create conversation', {
        description: error.message,
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.list() })
      if (variables.workspace_id) {
        queryClient.invalidateQueries({
          queryKey: conversationKeys.workspace(variables.workspace_id),
        })
      }
      if (variables.project_id) {
        queryClient.invalidateQueries({
          queryKey: conversationKeys.project(variables.project_id),
        })
      }
    },
  })
}

/**
 * Hook to update conversation metadata
 */
export function useUpdateConversation() {
  const queryClient = useQueryClient()

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
    onError: (error: Error, variables, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(
          conversationKeys.detail(variables.id),
          context.previousConversation
        )
      }
      toast.error('Failed to update conversation', {
        description: error.message,
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
    onError: (error: Error, variables, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(
          conversationKeys.detail(variables.id),
          context.previousConversation
        )
      }
      toast.error('Failed to rename conversation', {
        description: error.message,
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

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string | null }) => {
      const { data, error } = await conversationService.moveToProject(id, projectId)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      toast.success('Conversation moved', {
        description: 'The conversation was moved successfully.',
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to move conversation', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to archive a conversation
 */
export function useArchiveConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await conversationService.archive(id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      toast.success('Conversation archived', {
        description: 'The conversation was moved to the archive.',
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to archive conversation', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to restore an archived conversation
 */
export function useRestoreConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await conversationService.restore(id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      toast.success('Conversation restored', {
        description: 'The conversation was restored successfully.',
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to restore conversation', {
        description: error.message,
      })
    },
  })
}

/**
 * Hook to permanently delete a conversation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await conversationService.delete(id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      toast.success('Conversation deleted', {
        description: 'The conversation was permanently removed.',
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to delete conversation', {
        description: error.message,
      })
    },
  })
}
