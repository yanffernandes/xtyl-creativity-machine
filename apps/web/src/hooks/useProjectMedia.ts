/**
 * useProjectMedia Hook
 * Fetches project media documents (images) for asset picker.
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface MediaItem {
  document_id: string;
  title: string;
  file_url: string | null;
  thumbnail_url: string | null;
}

interface UseProjectMediaOptions {
  projectId: string;
  limit?: number;
  enabled?: boolean;
}

export function useProjectMedia({
  projectId,
  limit = 50,
  enabled = true,
}: UseProjectMediaOptions) {
  const query = useQuery({
    queryKey: ['project-media', projectId, limit],
    queryFn: async () => {
      const response = await api.get(`/api/documents`, {
        params: {
          project_id: projectId,
          media_type: 'image',
          limit,
        },
      });
      return (response.data?.documents ?? response.data ?? []) as MediaItem[];
    },
    enabled: enabled && !!projectId,
    staleTime: 30_000,
  });

  return {
    media: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
