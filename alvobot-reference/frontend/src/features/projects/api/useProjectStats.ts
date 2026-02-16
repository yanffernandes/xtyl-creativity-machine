import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

export interface ProjectStats {
  projectId: number
  articleCount: number
  lastArticleDate: string | null
}

async function fetchProjectStats(workspaceId: string): Promise<Record<number, ProjectStats>> {
  // Fetch article counts per project, scoped through project workspace
  const { data: articles, error } = await supabase
    .from('articles')
    .select(`
      project_id,
      created_at,
      project:projects!inner(workspace_id)
    `)
    .eq('project.workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching article stats:', error)
    return {}
  }

  // Group by project
  const statsMap: Record<number, ProjectStats> = {}

  for (const article of articles || []) {
    if (!article.project_id) continue

    if (!statsMap[article.project_id]) {
      statsMap[article.project_id] = {
        projectId: article.project_id,
        articleCount: 0,
        lastArticleDate: article.created_at, // First one is the most recent due to ordering
      }
    }
    statsMap[article.project_id].articleCount++
  }

  return statsMap
}

export function useProjectStats() {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.projects.stats(), workspaceId],
    queryFn: () => fetchProjectStats(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
