/**
 * Context Files Hooks
 *
 * React Query hooks for context file operations.
 * Context files are documents marked as reference material for RAG.
 *
 * Feature: 007-hybrid-supabase-architecture
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from '@/lib/supabase/documents'
import { useToast } from './use-toast'
import type { Document } from '@/types/supabase'
import { documentKeys } from './use-documents'

// Query keys for context files
export const contextFileKeys = {
  all: ['context-files'] as const,
  list: (projectId: string) => [...contextFileKeys.all, projectId] as const,
}

/**
 * Hook to fetch all context files in a project
 */
export function useContextFiles(projectId: string) {
  return useQuery({
    queryKey: contextFileKeys.list(projectId),
    queryFn: async () => {
      const { data, error } = await documentService.listContextFiles(projectId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
    staleTime: 15000, // Consider data fresh for 15 seconds
  })
}

/**
 * Hook to toggle a document's context status
 */
export function useToggleContext() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await documentService.toggleContext(documentId)
      if (error) throw error
      return data
    },
    onMutate: async (documentId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: contextFileKeys.all })
      await queryClient.cancelQueries({ queryKey: documentKeys.all })

      return { documentId }
    },
    onSuccess: (data) => {
      // Invalidate both context files and documents lists
      queryClient.invalidateQueries({ queryKey: contextFileKeys.all })
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })

      toast({
        title: data?.is_context ? 'Adicionado ao contexto' : 'Removido do contexto',
        description: data?.is_context
          ? 'O arquivo agora será usado como referência pelo chat.'
          : 'O arquivo não será mais usado como referência.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar contexto',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
