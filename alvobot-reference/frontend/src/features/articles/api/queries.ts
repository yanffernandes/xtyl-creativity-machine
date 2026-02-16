import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { searchConsoleApi } from '@/shared/utils/searchConsoleApi'

export interface IndexingStatus {
  url: string
  verdict?: string
  coverage_state?: string | null
  last_inspected_at?: string | null
  last_error?: string | null
}

async function fetchIndexingStatus(
  urls: string[],
  connectionId: string,
  workspaceId: string,
  forceRefresh = false
): Promise<Record<string, IndexingStatus>> {
  const { statuses } = await searchConsoleApi.inspectBatch(
    { urls, connectionId, forceRefresh },
    workspaceId
  )
  return statuses as Record<string, IndexingStatus>
}

export function useIndexingStatus(urls: string[], connectionId?: string, forceRefresh = false) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.searchConsole.status(workspaceId, urls, connectionId),
    queryFn: () => fetchIndexingStatus(urls, connectionId!, workspaceId!, forceRefresh),
    enabled: !!workspaceId && !!connectionId && urls.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}
