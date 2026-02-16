/**
 * useProjectMedia Hook
 *
 * Infinite scroll hook for loading project media (generated images).
 * Used by the Visual Studio to display image history with pagination.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { Document, GeneratedImage } from '@/types/image-studio';

interface MediaPage {
  items: Document[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

interface UseProjectMediaOptions {
  projectId: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Fetch project media with pagination
 */
async function fetchProjectMedia(
  projectId: string,
  page: number,
  limit: number
): Promise<MediaPage> {
  const response = await api.get(`/documents/projects/${projectId}/media`, {
    params: { page, limit },
  });
  return response.data;
}

/**
 * Convert Document to GeneratedImage format for VariationGrid
 */
export function documentToGeneratedImage(doc: Document): GeneratedImage {
  return {
    success: true,
    index: 0,
    document_id: doc.id,
    file_url: doc.file_url || undefined,
    thumbnail_url: doc.thumbnail_url || undefined,
    title: doc.title,
    generatedAt: doc.created_at,
    // Use batch_id from metadata if available, otherwise use document id
    batchId: (doc.generation_metadata as { batch_id?: string } | null)?.batch_id || doc.id,
  };
}

/**
 * Hook for infinite scroll media loading
 */
export function useProjectMedia({
  projectId,
  limit = 20,
  enabled = true,
}: UseProjectMediaOptions) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.documents.media(projectId),
    queryFn: ({ pageParam = 1 }) => fetchProjectMedia(projectId, pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.has_more) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: enabled && !!projectId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Flatten all pages into a single array of GeneratedImage
  const allMedia: GeneratedImage[] = query.data?.pages.flatMap((page) =>
    page.items.map(documentToGeneratedImage)
  ) || [];

  // Total count from the last page (all pages have the same total)
  const total = query.data?.pages[query.data.pages.length - 1]?.total || 0;

  return {
    media: allMedia,
    total,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useProjectMedia;
