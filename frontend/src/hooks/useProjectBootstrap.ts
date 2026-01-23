/**
 * React Query hook for project bootstrap data (Feature 027)
 *
 * Fetches all data needed to load the project page in a single request,
 * replacing 8+ individual API calls with 1 optimized endpoint.
 *
 * Returns: project, settings, models, visual_context, memories, recent_copies, recent_media, style_presets
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { getProjectBootstrap, getStylePresets } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import type { BootstrapData, StylePresetList } from '@/types/image-studio';

/**
 * Hook to fetch all project data in a single request
 *
 * Features:
 * - Reduces page load from 8+ requests to 1
 * - 5-minute cache (staleTime)
 * - Returns typed bootstrap data
 *
 * @param projectId - The project ID to fetch data for
 * @param queryOptions - Additional React Query options
 */
export function useProjectBootstrap(
  projectId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<BootstrapData>, 'queryKey' | 'queryFn'>
) {
  return useQuery<BootstrapData>({
    queryKey: queryKeys.bootstrap.byProject(projectId || ''),
    queryFn: () => getProjectBootstrap(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes - data doesn't change frequently
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch on window focus
    ...queryOptions,
  });
}

/**
 * Hook to fetch style presets (can be used independently of bootstrap)
 *
 * Features:
 * - Fetches all active style presets
 * - 30-minute cache (presets rarely change)
 *
 * @param queryOptions - Additional React Query options
 */
export function useStylePresets(
  queryOptions?: Omit<UseQueryOptions<StylePresetList>, 'queryKey' | 'queryFn'>
) {
  return useQuery<StylePresetList>({
    queryKey: queryKeys.stylePresets.list(),
    queryFn: getStylePresets,
    staleTime: 1000 * 60 * 30, // 30 minutes - presets rarely change
    gcTime: 1000 * 60 * 60, // 1 hour garbage collection
    ...queryOptions,
  });
}

/**
 * Helper hook that extracts specific data from bootstrap
 * Use this when you only need part of the bootstrap data
 */
export function useBootstrapModels(projectId: string | undefined) {
  const { data, ...rest } = useProjectBootstrap(projectId);

  return {
    textModels: data?.models.text || [],
    imageModels: data?.models.image || [],
    ...rest,
  };
}

export function useBootstrapSettings(projectId: string | undefined) {
  const { data, ...rest } = useProjectBootstrap(projectId);

  return {
    project: data?.project,
    settings: data?.settings,
    ...rest,
  };
}

export function useBootstrapVisualContext(projectId: string | undefined) {
  const { data, ...rest } = useProjectBootstrap(projectId);

  return {
    visualContext: data?.visual_context || [],
    ...rest,
  };
}

export function useBootstrapMemories(projectId: string | undefined) {
  const { data, ...rest } = useProjectBootstrap(projectId);

  return {
    memories: data?.memories || [],
    ...rest,
  };
}

export function useBootstrapCopies(projectId: string | undefined) {
  const { data, ...rest } = useProjectBootstrap(projectId);

  return {
    recentCopies: data?.recent_copies || [],
    ...rest,
  };
}

export function useBootstrapMedia(projectId: string | undefined) {
  const { data, ...rest } = useProjectBootstrap(projectId);

  return {
    recentMedia: data?.recent_media || [],
    ...rest,
  };
}

/** @deprecated Use useBootstrapCopies or useBootstrapMedia instead */
export function useBootstrapDocuments(projectId: string | undefined) {
  const { data, ...rest } = useProjectBootstrap(projectId);

  return {
    recentDocuments: data?.recent_documents || [],
    ...rest,
  };
}

export function useBootstrapStylePresets(projectId: string | undefined) {
  const { data, ...rest } = useProjectBootstrap(projectId);

  return {
    stylePresets: data?.style_presets || [],
    ...rest,
  };
}

export default useProjectBootstrap;
