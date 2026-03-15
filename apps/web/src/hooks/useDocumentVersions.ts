
/**
 * useDocumentVersions Hook
 * Feature 028 T059: Document version history management
 *
 * Provides access to document version history and restore functionality.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';

export interface VersionEntry {
  version: number;
  title: string;
  content: string;
  created_at: string;
  created_by?: string;
}

export interface VersionHistoryResponse {
  document_id: string;
  current_version: number;
  versions: VersionEntry[];
}

interface RestoreVersionResponse {
  success: boolean;
  message: string;
  current_version: number;
  restored_from: number;
}

/**
 * Fetch version history for a document
 */
export function useDocumentVersions(documentId: string | null) {
  return useQuery({
    queryKey: queryKeys.documents.versions(documentId || ''),
    queryFn: async (): Promise<VersionHistoryResponse> => {
      if (!documentId) throw new Error('Document ID required');
      const response = await api.get(`/documents/${documentId}/versions`);
      return response.data;
    },
    enabled: !!documentId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Restore document to a previous version
 */
export function useRestoreVersion(documentId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (version: number): Promise<RestoreVersionResponse> => {
      if (!documentId) throw new Error('Document ID required');
      const response = await api.post(`/documents/${documentId}/versions/${version}/restore`);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate document queries to refresh content
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents.versions(documentId || ''),
      });

      toast.success(`Documento restaurado para versão ${data.restored_from}`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao restaurar versão: ${error.message}`);
    },
  });
}

export default useDocumentVersions;
