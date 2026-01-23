/**
 * React Query hooks for Copy Library (Feature 028 - Agency Studio Flow)
 *
 * Provides data fetching, caching, and mutations for workspace-level copy library items.
 * Copies are reusable text that can be used as prompts for image generation.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import {
  listCopies,
  getCopy,
  createCopy,
  updateCopy,
  deleteCopy,
  CopyLibraryItem,
  CopyLibraryListResponse,
  CreateCopyRequest,
  UpdateCopyRequest,
  ListCopiesParams,
} from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

interface UseCopyLibraryOptions extends ListCopiesParams {}

/**
 * Hook to fetch paginated copy library items for a workspace
 */
export function useCopyLibrary(
  workspaceId: string | undefined,
  options?: UseCopyLibraryOptions,
  queryOptions?: Omit<UseQueryOptions<CopyLibraryListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CopyLibraryListResponse>({
    queryKey: queryKeys.copyLibrary.list(workspaceId || '', options as Record<string, unknown>),
    queryFn: () => listCopies(workspaceId!, options),
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds
    ...queryOptions,
  })
}

/**
 * Hook to fetch a single copy library item by ID
 */
export function useCopy(
  workspaceId: string | undefined,
  copyId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<CopyLibraryItem>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CopyLibraryItem>({
    queryKey: queryKeys.copyLibrary.detail(workspaceId || '', copyId || ''),
    queryFn: () => getCopy(workspaceId!, copyId!),
    enabled: !!workspaceId && !!copyId,
    staleTime: 30000,
    ...queryOptions,
  })
}

/**
 * Hook to create a new copy library item
 */
export function useCreateCopy(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCopyRequest) => createCopy(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.copyLibrary.byWorkspace(workspaceId),
      })
      toast.success('Copy adicionada à biblioteca')
    },
    onError: (error: Error) => {
      console.error('Failed to create copy:', error)
      toast.error('Falha ao criar copy')
    },
  })
}

/**
 * Hook to update an existing copy library item
 */
export function useUpdateCopy(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ copyId, data }: { copyId: string; data: UpdateCopyRequest }) =>
      updateCopy(workspaceId, copyId, data),
    onSuccess: (updatedCopy) => {
      queryClient.setQueryData(
        queryKeys.copyLibrary.detail(workspaceId, updatedCopy.id),
        updatedCopy
      )
      queryClient.invalidateQueries({
        queryKey: queryKeys.copyLibrary.byWorkspace(workspaceId),
      })
      toast.success('Copy atualizada com sucesso')
    },
    onError: (error: Error) => {
      console.error('Failed to update copy:', error)
      toast.error('Falha ao atualizar copy')
    },
  })
}

/**
 * Hook to delete a copy library item
 */
export function useDeleteCopy(workspaceId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (copyId: string) => deleteCopy(workspaceId, copyId),
    onSuccess: (_, copyId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.copyLibrary.detail(workspaceId, copyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.copyLibrary.byWorkspace(workspaceId),
      })
      toast.success('Copy removida da biblioteca')
    },
    onError: (error: Error) => {
      console.error('Failed to delete copy:', error)
      toast.error('Falha ao remover copy')
    },
  })
}
