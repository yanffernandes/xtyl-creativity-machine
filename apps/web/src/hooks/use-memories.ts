/**
 * React Query hooks for User Memory System (Feature 024)
 * Provides data fetching, caching, and mutations for user memories
 *
 * Migrated to use Supabase directly for CRUD operations.
 * Keeps searchMemories in backend for pgvector similarity search.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { searchMemories, SearchMemoriesRequest } from '@/lib/api'
import { memoryService } from '@/lib/supabase/memories'
import type { UserMemory, MemoryCategory } from '@/types/supabase'
import type { MemoryListResponse, Memory } from '@/types/memory'
import { memoryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

interface UseMemoriesOptions extends Record<string, unknown> {
  limit?: number
  offset?: number
  category?: MemoryCategory
}

// Helper to adapt Supabase service result to expected format
function adaptToMemoryListResponse(
  data: UserMemory[],
  total: number,
  page: number,
  perPage: number
): MemoryListResponse {
  return {
    memories: data.map(m => ({
      id: m.id,
      user_id: m.user_id,
      project_id: m.project_id,
      content: m.content,
      content_hash: m.content_hash,
      category: m.category,
      source_conversation_id: m.source_conversation_id || undefined,
      created_at: m.created_at,
      updated_at: m.updated_at,
    })),
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  }
}

/**
 * Hook to fetch paginated memories for a project
 * Now uses Supabase directly
 */
export function useMemories(
  projectId: string | undefined,
  options?: UseMemoriesOptions,
  queryOptions?: Omit<UseQueryOptions<MemoryListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<MemoryListResponse>({
    queryKey: memoryKeys.list(projectId || '', options),
    queryFn: async () => {
      const page = options?.offset ? Math.floor(options.offset / (options.limit || 20)) + 1 : 1
      const perPage = options?.limit || 20

      const result = await memoryService.listByProject(projectId!, {
        page,
        perPage,
        category: options?.category,
      })

      if (result.error) throw result.error
      if (!result.data) throw new Error('No data returned')

      return adaptToMemoryListResponse(
        result.data.data,
        result.data.total,
        result.data.page,
        result.data.pageSize
      )
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    ...queryOptions,
  })
}

/**
 * Hook to fetch a single memory by ID
 * Now uses Supabase directly
 */
export function useMemory(
  projectId: string | undefined,
  memoryId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<Memory>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Memory>({
    queryKey: memoryKeys.detail(projectId || '', memoryId || ''),
    queryFn: async () => {
      const result = await memoryService.get(memoryId!)
      if (result.error) throw result.error
      if (!result.data) throw new Error('Memory not found')

      return {
        id: result.data.id,
        user_id: result.data.user_id,
        project_id: result.data.project_id,
        content: result.data.content,
        content_hash: result.data.content_hash,
        category: result.data.category,
        source_conversation_id: result.data.source_conversation_id || undefined,
        created_at: result.data.created_at,
        updated_at: result.data.updated_at,
      }
    },
    enabled: !!projectId && !!memoryId,
    staleTime: 30000,
    ...queryOptions,
  })
}

interface CreateMemoryData {
  content: string
  category?: MemoryCategory
}

/**
 * Hook to create a new memory
 * Now uses Supabase directly
 */
export function useCreateMemory(projectId: string, userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMemoryData) => {
      const result = await memoryService.create({
        user_id: userId,
        project_id: projectId,
        content: data.content,
        category: data.category || 'other',
      })
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists(projectId) })
      toast.success('Memória criada com sucesso')
    },
    onError: (error: Error) => {
      console.error('Failed to create memory:', error)
      toast.error('Falha ao criar memória')
    },
  })
}

interface UpdateMemoryData {
  content?: string
  category?: MemoryCategory
}

/**
 * Hook to update an existing memory
 * Now uses Supabase directly
 */
export function useUpdateMemory(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memoryId, data }: { memoryId: string; data: UpdateMemoryData }) => {
      const result = await memoryService.update(memoryId, data)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (updatedMemory) => {
      if (updatedMemory) {
        queryClient.setQueryData(
          memoryKeys.detail(projectId, updatedMemory.id),
          updatedMemory
        )
      }
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists(projectId) })
      toast.success('Memória atualizada com sucesso')
    },
    onError: (error: Error) => {
      console.error('Failed to update memory:', error)
      toast.error('Falha ao atualizar memória')
    },
  })
}

/**
 * Hook to delete a single memory
 * Now uses Supabase directly
 */
export function useDeleteMemory(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memoryId: string) => {
      const result = await memoryService.delete(memoryId)
      if (result.error) throw result.error
      return memoryId
    },
    onSuccess: (memoryId) => {
      queryClient.removeQueries({ queryKey: memoryKeys.detail(projectId, memoryId) })
      queryClient.invalidateQueries({ queryKey: memoryKeys.lists(projectId) })
      toast.success('Memória excluída com sucesso')
    },
    onError: (error: Error) => {
      console.error('Failed to delete memory:', error)
      toast.error('Falha ao excluir memória')
    },
  })
}

/**
 * Hook to delete all memories for a project
 * Now uses Supabase directly
 */
export function useDeleteAllMemories(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await memoryService.deleteAll(projectId)
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all(projectId) })
      toast.success(`${result?.count || 0} memórias excluídas`)
    },
    onError: (error: Error) => {
      console.error('Failed to delete all memories:', error)
      toast.error('Falha ao excluir memórias')
    },
  })
}

/**
 * Hook to search memories using semantic similarity
 * Still uses backend because pgvector operations require server-side processing
 */
export function useSearchMemories(projectId: string) {
  return useMutation({
    mutationFn: (data: SearchMemoriesRequest) => searchMemories(projectId, data),
    onError: (error: Error) => {
      console.error('Failed to search memories:', error)
      toast.error('Falha ao buscar memórias')
    },
  })
}
