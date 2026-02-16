import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { Project } from '../types'

async function fetchProject(id: number, workspaceId: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Project
}

export function useProject(id: number) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.projects.detail(id), workspaceId],
    queryFn: () => fetchProject(id, workspaceId!),
    enabled: !!id && !!workspaceId,
  })
}
