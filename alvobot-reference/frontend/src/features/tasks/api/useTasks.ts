import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { Task, TaskFilters } from '../types'

async function fetchTasks(
  filters: TaskFilters = {},
  workspaceId: string | undefined
): Promise<Task[]> {
  if (!workspaceId) return []

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true })

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data as Task[]
}

export function useTasks(filters: TaskFilters = {}) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.tasks.list(filters, workspaceId),
    queryFn: () => fetchTasks(filters, workspaceId),
    enabled: !!workspaceId,
  })
}
