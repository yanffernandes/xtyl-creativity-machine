import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { api } from '@/shared/utils/api'
import type { IndexingStats } from '../types'

export interface IndexingStatsParams {
  projectId?: string
  connectionId?: string
}

export function useIndexingStats(params: IndexingStatsParams) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: ['search-console-indexing', 'stats', params],
    queryFn: async (): Promise<IndexingStats> => {
      if (!workspaceId) {
        return {
          total_urls: 0,
          indexed: 0,
          indexed_percent: 0,
          in_progress: 0,
          in_progress_percent: 0,
          not_indexed: 0,
          not_indexed_percent: 0,
          error: 0,
          error_percent: 0,
          not_checked: 0,
          not_checked_percent: 0,
        }
      }

      const query = new URLSearchParams()
      if (params.projectId) query.set('projectId', params.projectId)
      if (params.connectionId) query.set('connectionId', params.connectionId)

      const response = await api.get<{ stats: IndexingStats }>(`/search-console/stats?${query.toString()}`, {
        headers: { 'x-workspace-id': workspaceId },
      })

      return response.stats
    },
    enabled: !!workspaceId,
  })
}
