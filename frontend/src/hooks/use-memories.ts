/**
 * React Query hooks for User Memory System (Feature 024)
 * Provides data fetching, caching, and mutations for user memories
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
    getMemories,
    getMemory,
    createMemory,
    updateMemory,
    deleteMemory,
    deleteAllMemories,
    searchMemories,
    CreateMemoryRequest,
    UpdateMemoryRequest,
    SearchMemoriesRequest
} from '@/lib/api';
import { UserMemory, MemoryCategory, MemoryListResponse, MemorySearchResponse } from '@/types/memory';
import { memoryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

interface UseMemoriesOptions extends Record<string, unknown> {
    limit?: number;
    offset?: number;
    category?: MemoryCategory;
}

/**
 * Hook to fetch paginated memories for a project
 */
export function useMemories(
    projectId: string | undefined,
    options?: UseMemoriesOptions,
    queryOptions?: Omit<UseQueryOptions<MemoryListResponse>, 'queryKey' | 'queryFn'>
) {
    return useQuery<MemoryListResponse>({
        queryKey: memoryKeys.list(projectId || '', options),
        queryFn: () => getMemories(projectId!, options),
        enabled: !!projectId,
        staleTime: 30000, // 30 seconds
        ...queryOptions,
    });
}

/**
 * Hook to fetch a single memory by ID
 */
export function useMemory(
    projectId: string | undefined,
    memoryId: string | undefined,
    queryOptions?: Omit<UseQueryOptions<UserMemory>, 'queryKey' | 'queryFn'>
) {
    return useQuery<UserMemory>({
        queryKey: memoryKeys.detail(projectId || '', memoryId || ''),
        queryFn: () => getMemory(projectId!, memoryId!),
        enabled: !!projectId && !!memoryId,
        staleTime: 30000,
        ...queryOptions,
    });
}

/**
 * Hook to create a new memory
 */
export function useCreateMemory(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateMemoryRequest) => createMemory(projectId, data),
        onSuccess: () => {
            // Invalidate memories list to refetch
            queryClient.invalidateQueries({ queryKey: memoryKeys.lists(projectId) });
            toast.success('Memória criada com sucesso');
        },
        onError: (error: Error) => {
            console.error('Failed to create memory:', error);
            toast.error('Falha ao criar memória');
        },
    });
}

/**
 * Hook to update an existing memory
 */
export function useUpdateMemory(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ memoryId, data }: { memoryId: string; data: UpdateMemoryRequest }) =>
            updateMemory(projectId, memoryId, data),
        onSuccess: (updatedMemory) => {
            // Update the specific memory in cache
            queryClient.setQueryData(
                memoryKeys.detail(projectId, updatedMemory.id),
                updatedMemory
            );
            // Invalidate list to refetch
            queryClient.invalidateQueries({ queryKey: memoryKeys.lists(projectId) });
            toast.success('Memória atualizada com sucesso');
        },
        onError: (error: Error) => {
            console.error('Failed to update memory:', error);
            toast.error('Falha ao atualizar memória');
        },
    });
}

/**
 * Hook to delete a single memory
 */
export function useDeleteMemory(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (memoryId: string) => deleteMemory(projectId, memoryId),
        onSuccess: (_, memoryId) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: memoryKeys.detail(projectId, memoryId) });
            // Invalidate list to refetch
            queryClient.invalidateQueries({ queryKey: memoryKeys.lists(projectId) });
            toast.success('Memória excluída com sucesso');
        },
        onError: (error: Error) => {
            console.error('Failed to delete memory:', error);
            toast.error('Falha ao excluir memória');
        },
    });
}

/**
 * Hook to delete all memories for a project
 */
export function useDeleteAllMemories(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => deleteAllMemories(projectId),
        onSuccess: (result) => {
            // Invalidate all memory queries for this project
            queryClient.invalidateQueries({ queryKey: memoryKeys.all(projectId) });
            toast.success(`${result.deleted_count} memórias excluídas`);
        },
        onError: (error: Error) => {
            console.error('Failed to delete all memories:', error);
            toast.error('Falha ao excluir memórias');
        },
    });
}

/**
 * Hook to search memories using semantic similarity
 */
export function useSearchMemories(projectId: string) {
    return useMutation({
        mutationFn: (data: SearchMemoriesRequest) => searchMemories(projectId, data),
        onError: (error: Error) => {
            console.error('Failed to search memories:', error);
            toast.error('Falha ao buscar memórias');
        },
    });
}
