import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { Article } from '../types'

async function fetchArticle(id: number, workspaceId: string): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      project:projects!inner(workspace_id)
    `)
    .eq('id', id)
    .eq('project.workspace_id', workspaceId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Article
}

export function useArticle(id: number) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.articles.detail(id), workspaceId],
    queryFn: () => fetchArticle(id, workspaceId!),
    enabled: !!id && !!workspaceId,
  })
}
