import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import type {
  PageSpeedHistory,
  PageSpeedCheckResponse,
  PageSpeedQuota,
  PageSpeedUrlCheckResponse,
} from '../types/pagespeed'

export function usePageSpeedHistory(
  projectId: number,
  strategy?: 'mobile' | 'desktop',
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.pagespeed.history(projectId, strategy),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (strategy) params.set('strategy', strategy)
      params.set('limit', '30')

      const data = await api.get<PageSpeedHistory[]>(
        `/pagespeed/history/${projectId}?${params.toString()}`
      )
      return data
    },
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function usePageSpeedLatest(
  projectId: number,
  strategy?: 'mobile' | 'desktop',
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.pagespeed.latest(projectId, strategy),
    queryFn: async () => {
      const params = strategy ? `?strategy=${strategy}` : ''
      const data = await api.get<PageSpeedHistory | null>(
        `/pagespeed/latest/${projectId}${params}`
      )
      return data
    },
    enabled: !!projectId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function usePageSpeedQuota(
  workspaceId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.pagespeed.quota(workspaceId || ''),
    queryFn: async () => {
      const data = await api.get<PageSpeedQuota>(
        `/pagespeed/quota/${workspaceId}`
      )
      return data
    },
    enabled: !!workspaceId && (options?.enabled ?? true),
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useCheckPageSpeed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      projectId: number
      domain: string
      workspaceId: string
      force?: boolean
    }) => {
      const searchParams = new URLSearchParams({
        domain: params.domain,
        workspaceId: params.workspaceId,
      })
      if (params.force) searchParams.set('force', 'true')

      const data = await api.post<PageSpeedCheckResponse>(
        `/pagespeed/check/${params.projectId}?${searchParams.toString()}`,
        {}
      )
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate pagespeed queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.pagespeed.all,
      })
      // Invalidate project detail to update scores
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.detail(variables.projectId),
      })
      // Invalidate project list
      queryClient.invalidateQueries({
        queryKey: queryKeys.projects.lists(),
      })
    },
  })
}

/**
 * Check PageSpeed for a specific URL without saving to project history.
 * Used for on-demand article speed tests.
 */
export function useCheckArticlePageSpeed() {
  return useMutation({
    mutationFn: async (params: { url: string; workspaceId: string }) => {
      const searchParams = new URLSearchParams({
        url: params.url,
        workspaceId: params.workspaceId,
      })

      const data = await api.post<PageSpeedUrlCheckResponse>(
        `/pagespeed/check-url?${searchParams.toString()}`,
        {}
      )
      return data
    },
    // No cache invalidation needed since this doesn't save anything
  })
}
