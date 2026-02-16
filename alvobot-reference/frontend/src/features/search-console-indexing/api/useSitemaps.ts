import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { api } from '@/shared/utils/api'
import type { Sitemap } from '../types'

export function useSitemaps(projectId?: string | number | null) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: ['search-console-indexing', 'sitemaps', projectId],
    queryFn: async (): Promise<Sitemap[]> => {
      if (!projectId) return []
      const response = await api.get<{ sitemaps: Sitemap[] }>(`/search-console/sitemaps/${projectId}`, {
        headers: {
          'x-workspace-id': workspaceId || '',
        },
      })
      return response.sitemaps || []
    },
    enabled: !!projectId && !!workspaceId,
  })
}

export function useDetectSitemaps(projectId?: string | number | null, connectionId?: string | null) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()

  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('projectId is required')
      const result = await api.post<{ sitemaps: Sitemap[] }>(
        `/search-console/sitemaps/${projectId}/detect`,
        { projectId: String(projectId) },
        { headers: { 'x-workspace-id': workspaceId || '' } }
      )

      // Automatically sync detected sitemaps to extract URLs
      const sitemaps = result.sitemaps || []
      for (const sitemap of sitemaps) {
        try {
          await api.post(
            `/search-console/sitemaps/${sitemap.id}/sync`,
            { connectionId: connectionId || undefined },
            { headers: { 'x-workspace-id': workspaceId || '' } }
          )
        } catch (error) {
          console.warn(`Failed to sync sitemap ${sitemap.url}:`, error)
        }
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-console-indexing', 'sitemaps', projectId] })
      queryClient.invalidateQueries({ queryKey: ['search-console-indexing', 'urls'] })
    },
  })
}

export function useCreateSitemap(projectId?: string | number | null) {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()

  return useMutation({
    mutationFn: async (payload: { url: string; isPrimary?: boolean }) => {
      if (!projectId) throw new Error('projectId is required')
      return api.post<{ sitemap: Sitemap }>(
        `/search-console/sitemaps/${projectId}`,
        payload,
        { headers: { 'x-workspace-id': workspaceId || '' } }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-console-indexing', 'sitemaps', projectId] })
    },
  })
}

export function useUpdateSitemap() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()

  return useMutation({
    mutationFn: async (payload: { sitemapId: string; url?: string; isPrimary?: boolean; isEnabled?: boolean }) => {
      return api.put<{ sitemap: Sitemap }>(
        `/search-console/sitemaps/${payload.sitemapId}`,
        {
          url: payload.url,
          isPrimary: payload.isPrimary,
          isEnabled: payload.isEnabled,
        },
        { headers: { 'x-workspace-id': workspaceId || '' } }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-console-indexing', 'sitemaps'] })
    },
  })
}

export function useDeleteSitemap() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()

  return useMutation({
    mutationFn: async (sitemapId: string) => {
      return api.delete<{ success: boolean }>(`/search-console/sitemaps/${sitemapId}`, {
        headers: { 'x-workspace-id': workspaceId || '' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-console-indexing', 'sitemaps'] })
    },
  })
}

export function useSyncSitemap() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()

  return useMutation({
    mutationFn: async (payload: { sitemapId: string; connectionId?: string }) => {
      return api.post<{ total: number; inserted: number }>(
        `/search-console/sitemaps/${payload.sitemapId}/sync`,
        { connectionId: payload.connectionId },
        { headers: { 'x-workspace-id': workspaceId || '' } }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-console-indexing', 'sitemaps'] })
      queryClient.invalidateQueries({ queryKey: ['search-console-indexing', 'urls'] })
    },
  })
}
