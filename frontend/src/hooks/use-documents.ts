/**
 * Document Hooks
 *
 * React Query hooks for document operations via Supabase Client.
 * Provides caching, optimistic updates, and error handling.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US2 - Responsive Document Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from '@/lib/supabase/documents'
import { useToast } from './use-toast'
import type { DocumentInsert, DocumentUpdate, Document } from '@/types/supabase'

// Query keys
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (projectId: string) => [...documentKeys.lists(), projectId] as const,
  folder: (projectId: string, folderId: string | null) =>
    [...documentKeys.lists(), projectId, 'folder', folderId] as const,
  archived: (projectId: string) => [...documentKeys.lists(), projectId, 'archived'] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  shared: (shareToken: string) => [...documentKeys.all, 'shared', shareToken] as const,
}

/**
 * Hook to fetch all documents in a project
 */
export function useDocuments(projectId: string) {
  return useQuery({
    queryKey: documentKeys.list(projectId),
    queryFn: async () => {
      const { data, error } = await documentService.listByProject(projectId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
    staleTime: 15000, // Consider data fresh for 15 seconds
  })
}

/**
 * Hook to fetch documents in a specific folder
 */
export function useDocumentsByFolder(projectId: string, folderId: string | null) {
  return useQuery({
    queryKey: documentKeys.folder(projectId, folderId),
    queryFn: async () => {
      const { data, error } = await documentService.listByFolder(projectId, folderId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
    staleTime: 15000,
  })
}

/**
 * Hook to fetch archived documents
 */
export function useArchivedDocuments(projectId: string) {
  return useQuery({
    queryKey: documentKeys.archived(projectId),
    queryFn: async () => {
      const { data, error } = await documentService.listArchived(projectId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

/**
 * Hook to fetch a single document
 */
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await documentService.get(id)
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

/**
 * Hook to fetch a shared document
 */
export function useSharedDocument(shareToken: string) {
  return useQuery({
    queryKey: documentKeys.shared(shareToken),
    queryFn: async () => {
      const { data, error } = await documentService.getShared(shareToken)
      if (error) throw error
      return data
    },
    enabled: !!shareToken,
  })
}

/**
 * Hook to create a document with optimistic update
 */
export function useCreateDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (document: DocumentInsert) => {
      const { data, error } = await documentService.create(document)
      if (error) throw error
      return data
    },
    onMutate: async (newDocument) => {
      await queryClient.cancelQueries({ queryKey: documentKeys.list(newDocument.project_id) })

      const previousDocuments = queryClient.getQueryData<Document[]>(
        documentKeys.list(newDocument.project_id)
      )

      const optimisticDocument: Document = {
        id: `temp-${Date.now()}`,
        title: newDocument.title,
        content: newDocument.content || null,
        status: newDocument.status || 'draft',
        project_id: newDocument.project_id,
        folder_id: newDocument.folder_id || null,
        media_type: newDocument.media_type || 'text',
        file_url: null,
        thumbnail_url: null,
        generation_metadata: null,
        is_reference_asset: false,
        asset_type: null,
        asset_metadata: null,
        is_public: false,
        share_token: null,
        share_expires_at: null,
        is_context: newDocument.is_context || false,
        created_at: new Date().toISOString(),
        updated_at: null,
        deleted_at: null,
      }

      queryClient.setQueryData<Document[]>(
        documentKeys.list(newDocument.project_id),
        (old) => [optimisticDocument, ...(old || [])]
      )

      return { previousDocuments }
    },
    onError: (error, newDocument, context) => {
      if (context?.previousDocuments) {
        queryClient.setQueryData(
          documentKeys.list(newDocument.project_id),
          context.previousDocuments
        )
      }
      toast({
        title: 'Erro ao criar documento',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list(variables.project_id) })
      toast({
        title: 'Documento criado',
        description: `"${data?.title}" foi criado com sucesso.`,
      })
    },
  })
}

/**
 * Hook to update a document with optimistic update
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DocumentUpdate }) => {
      const { data: result, error } = await documentService.update(id, data)
      if (error) throw error
      return result
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: documentKeys.detail(id) })

      const previousDocument = queryClient.getQueryData<Document>(documentKeys.detail(id))

      if (previousDocument) {
        queryClient.setQueryData<Document>(documentKeys.detail(id), {
          ...previousDocument,
          ...data,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousDocument }
    },
    onError: (error, variables, context) => {
      if (context?.previousDocument) {
        queryClient.setQueryData(documentKeys.detail(variables.id), context.previousDocument)
      }
      toast({
        title: 'Erro ao atualizar documento',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      toast({
        title: 'Documento atualizado',
        description: 'As alterações foram salvas.',
      })
    },
  })
}

/**
 * Hook to move a document
 */
export function useMoveDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
      const { data, error } = await documentService.move(id, folderId)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      toast({
        title: 'Documento movido',
        description: 'O documento foi movido com sucesso.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao mover documento',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to archive a document
 */
export function useArchiveDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await documentService.archive(id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      toast({
        title: 'Documento arquivado',
        description: 'O documento foi movido para a lixeira.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao arquivar documento',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to restore an archived document
 */
export function useRestoreDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await documentService.restore(id)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      toast({
        title: 'Documento restaurado',
        description: 'O documento foi restaurado com sucesso.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao restaurar documento',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to permanently delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await documentService.delete(id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      toast({
        title: 'Documento excluído',
        description: 'O documento foi removido permanentemente.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir documento',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to create a share link
 */
export function useCreateShareLink() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, expiresInDays }: { id: string; expiresInDays?: number }) => {
      const { data, error } = await documentService.createShareLink(id, expiresInDays)
      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(variables.id) })
      toast({
        title: 'Link de compartilhamento criado',
        description: 'O link foi copiado para a área de transferência.',
      })
      // Copy to clipboard
      navigator.clipboard.writeText(window.location.origin + data?.shareUrl)
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar link',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Hook to revoke a share link
 */
export function useRevokeShareLink() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await documentService.revokeShareLink(id)
      if (error) throw error
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) })
      toast({
        title: 'Link revogado',
        description: 'O link de compartilhamento foi desativado.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao revogar link',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
