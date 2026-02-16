import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { Project, ProjectFilters } from '../types'

async function fetchProjects(
  filters: ProjectFilters = {},
  workspaceId: string | undefined
): Promise<Project[]> {
  if (!workspaceId) return []

  let query = supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', filters.isDeleted ?? false)
    .order('created_at', { ascending: false })

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  if (filters.status !== undefined) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data as Project[]
}

export function useProjects(filters: ProjectFilters = {}) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.projects.list(filters, workspaceId),
    queryFn: () => fetchProjects(filters, workspaceId),
    enabled: !!workspaceId,
  })
}
