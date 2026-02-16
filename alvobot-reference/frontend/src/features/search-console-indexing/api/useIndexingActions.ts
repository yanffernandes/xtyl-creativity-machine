import { useMutation, useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { api } from '@/shared/utils/api'
import type { QuotaInfo } from '../types'

export function useInspectBatch() {
  const workspaceId = useWorkspaceId()

  return useMutation({
    mutationFn: async (payload: { urls: string[]; connectionId: string; propertyId?: string }) => {
      if (!workspaceId) throw new Error('Workspace not selected')
      return api.post<{ statuses: Record<string, unknown> }>(
        '/search-console/urls/inspect-batch',
        payload,
        { headers: { 'x-workspace-id': workspaceId } }
      )
    },
  })
}

export function useIndexBatch() {
  const workspaceId = useWorkspaceId()

  return useMutation({
    mutationFn: async (payload: { connectionId: string; items: Array<{ url: string; articleId?: number }> }) => {
      if (!workspaceId) throw new Error('Workspace not selected')
      return api.post<{ queued: number }>(
        '/search-console/urls/index-batch',
        payload,
        { headers: { 'x-workspace-id': workspaceId } }
      )
    },
  })
}

export function useIndexingQuota(connectionId?: string | null) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: ['search-console-indexing', 'quota', connectionId],
    queryFn: async (): Promise<QuotaInfo | null> => {
      if (!workspaceId || !connectionId) return null
      const response = await api.get<{ quota: QuotaInfo }>(
        `/search-console/quota?connectionId=${connectionId}`,
        { headers: { 'x-workspace-id': workspaceId } }
      )
      return response.quota
    },
    enabled: !!workspaceId && !!connectionId,
    staleTime: 60 * 1000,
  })
}
