/**
 * Folder Hooks
 *
 * React Query hooks for folder operations via Supabase Client.
 * Provides caching, optimistic updates, and error handling.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US4 - Folder Organization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { folderService } from '@/lib/supabase/folders'
import { useToast } from './use-toast'
import type { FolderInsert, FolderUpdate, Folder } from '@/types/supabase'

// Query keys
export const folderKeys = {
  all: ['folders'] as const,
  lists: () => [...folderKeys.all, 'list'] as const,
  list: (projectId: string) => [...folderKeys.lists(), projectId] as const,
  byParent: (projectId: string, parentId: string | null) =>
    [...folderKeys.lists(), projectId, 'parent', parentId] as const,
  archived: (projectId: string) => [...folderKeys.lists(), projectId, 'archived'] as const,
  details: () => [...folderKeys.all, 'detail'] as const,
  detail: (id: string) => [...folderKeys.details(), id] as const,
}

/**
 * Hook to fetch all folders in a project
 */
export function useFolders(projectId: string) {
  return useQuery({
    queryKey: folderKeys.list(projectId),
    queryFn: async () => {
      const { data, error } = await folderService.listByProject(projectId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

/**
 * Hook to fetch folders by parent (null for root level)
 */
export function useFoldersByParent(projectId: string, parentId: string | null) {
  return useQuery({
    queryKey: folderKeys.byParent(projectId, parentId),
    queryFn: async () => {
      const { data, error } = await folderService.listByParent(projectId, parentId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
    staleTime: 30000,
  })
}

/**
 * Hook to fetch archived folders
 */
export function useArchivedFolders(projectId: string) {
  return useQuery({
    queryKey: folderKeys.archived(projectId),
    queryFn: async () => {
      const { data, error } = await folderService.listArchived(projectId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch a single folder
 */
export function useFolder(id: string) {
  return useQuery({
    queryKey: folderKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await folderService.get(id)
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a folder with optimistic update
 */
export function useCreateFolder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (folder: FolderInsert) => {
      const { data, error } = await folderService.create(folder)
      if (error) throw error
      return data
    },
    onMutate: async (newFolder) => {
      await queryClient.cancelQueries({ queryKey: folderKeys.list(newFolder.project_id) })

      const previousFolders = queryClient.getQueryData<Folder[]>(
        folderKeys.list(newFolder.project_id)
      )

      const optimisticFolder: Folder = {
        id: `temp-${Date.now()}`,
        name: newFolder.name,
        project_id: newFolder.project_id,
        parent_folder_id: newFolder.parent_folder_id || null,
        created_at: new Date().toISOString(),
        updated_at: null,
        deleted_at: null,
      }

      queryClient.setQueryData<Folder[]>(
        folderKeys.list(newFolder.project_id),
        (old) => [...(old || []), optimisticFolder].sort((a, b) => a.name.localeCompare(b.name))
      )

      return { previousFolders }
    },
    onError: (error, newFolder, context) => {
      if (context?.previousFolders) {
        queryClient.setQueryData(
          folderKeys.list(newFolder.project_id),
          context.previousFolders
        )
      }
      toast({
        title: 'Erro ao criar pasta',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(variables.project_id) })
      queryClient.invalidateQueries({ queryKey: folderKeys.byParent(variables.project_id, variables.parent_folder_id || null) })
      toast({
        title: 'Pasta criada',
        description: `"${data?.name}" foi criada com sucesso.`,
      })
    },
  })
}

/**
 * Hook to update a folder
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FolderUpdate }) => {
      const { data: result, error } = await folderService.update(id, data)
      if (error) throw error
      return result
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: folderKeys.detail(id) })

      const previousFolder = queryClient.getQueryData<Folder>(folderKeys.detail(id))

      if (previousFolder) {
        queryClient.setQueryData<Folder>(folderKeys.detail(id), {
          ...previousFolder,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousFolder }
    },
    onError: (error, variables, context) => {
      if (context?.previousFolder) {
        queryClient.setQueryData(folderKeys.detail(variables.id), context.previousFolder)
      }
      toast({
        title: 'Erro ao atualizar pasta',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() })
      toast({
        title: 'Pasta atualizada',
        description: 'As alterações foram salvas.',
      })
    },
  })
}

/**
 * Hook to move a folder to a new parent
 */
export function useMoveFolder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, newParentId }: { id: string; newParentId: string | null }) => {
      const { data, error } = await folderService.move(id, newParentId)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() })
      toast({
        title: 'Pasta movida',
        description: 'A pasta foi movida com sucesso.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao mover pasta',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to archive a folder (soft delete)
 */
export function useArchiveFolder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, cascade = true }: { id: string; cascade?: boolean }) => {
      const { data, error } = await folderService.archive(id, cascade)
      if (error) throw error
      return data
    },
    onSuccess: (_, { cascade }) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() })
      toast({
        title: 'Pasta arquivada',
        description: cascade
          ? 'A pasta e seu conteúdo foram movidos para a lixeira.'
          : 'A pasta foi movida para a lixeira.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao arquivar pasta',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to restore an archived folder
 */
export function useRestoreFolder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, restoreContents = false }: { id: string; restoreContents?: boolean }) => {
      const { data, error } = await folderService.restore(id, restoreContents)
      if (error) throw error
      return data
    },
    onSuccess: (_, { restoreContents }) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() })
      toast({
        title: 'Pasta restaurada',
        description: restoreContents
          ? 'A pasta e seu conteúdo foram restaurados.'
          : 'A pasta foi restaurada com sucesso.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao restaurar pasta',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to permanently delete a folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await folderService.delete(id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() })
      toast({
        title: 'Pasta excluída',
        description: 'A pasta foi removida permanentemente.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir pasta',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
