/**
 * React Query hooks for Copy Library
 *
 * Provides data fetching, caching, and mutations for workspace-level copy library items.
 * Copies are reusable text that can be used as prompts for image generation.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import {
  listCopies,
  getCopy,
  createCopy,
  updateCopy,
  deleteCopy,
  type CopyLibraryItem,
  type CopyLibraryListResponse,
  type CreateCopyRequest,
  type UpdateCopyRequest,
  type ListCopiesParams,
} from '@/lib/copy-library-api';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

type UseCopyLibraryOptions = ListCopiesParams;

export function useCopyLibrary(
  workspaceId: string | undefined,
  options?: UseCopyLibraryOptions,
  queryOptions?: Omit<
    UseQueryOptions<CopyLibraryListResponse>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<CopyLibraryListResponse>({
    queryKey: queryKeys.copyLibrary.list(
      workspaceId || '',
      options as Record<string, unknown>,
    ),
    queryFn: () => listCopies(workspaceId!, options),
    enabled: !!workspaceId,
    staleTime: 30000,
    ...queryOptions,
  });
}

export function useCopy(
  workspaceId: string | undefined,
  copyId: string | undefined,
  queryOptions?: Omit<
    UseQueryOptions<CopyLibraryItem>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<CopyLibraryItem>({
    queryKey: queryKeys.copyLibrary.detail(workspaceId || '', copyId || ''),
    queryFn: () => getCopy(workspaceId!, copyId!),
    enabled: !!workspaceId && !!copyId,
    staleTime: 30000,
    ...queryOptions,
  });
}

export function useCreateCopy(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCopyRequest) => createCopy(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.copyLibrary.byWorkspace(workspaceId),
      });
      toast.success('Copy added to library');
    },
    onError: (error: Error) => {
      console.error('Failed to create copy:', error);
      toast.error('Failed to create copy');
    },
  });
}

export function useUpdateCopy(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      copyId,
      data,
    }: {
      copyId: string;
      data: UpdateCopyRequest;
    }) => updateCopy(workspaceId, copyId, data),
    onSuccess: (updatedCopy) => {
      queryClient.setQueryData(
        queryKeys.copyLibrary.detail(workspaceId, updatedCopy.id),
        updatedCopy,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.copyLibrary.byWorkspace(workspaceId),
      });
      toast.success('Copy updated successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to update copy:', error);
      toast.error('Failed to update copy');
    },
  });
}

export function useDeleteCopy(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (copyId: string) => deleteCopy(workspaceId, copyId),
    onSuccess: (_, copyId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.copyLibrary.detail(workspaceId, copyId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.copyLibrary.byWorkspace(workspaceId),
      });
      toast.success('Copy removed from library');
    },
    onError: (error: Error) => {
      console.error('Failed to delete copy:', error);
      toast.error('Failed to remove copy');
    },
  });
}
