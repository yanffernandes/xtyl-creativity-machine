import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import type { Task, Article } from '@/shared/types/entities'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { CalendarEvent, CalendarFilters } from '../types'

async function fetchCalendarEvents(filters: CalendarFilters, workspaceId: string): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = []

  // Fetch tasks with due dates, scoped to workspace
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('created_at', filters.start)
    .lte('created_at', filters.end)

  if (tasks) {
    tasks.forEach((task: Task) => {
      events.push({
        id: `task-${task.id}`,
        title: task.name,
        description: task.description || undefined,
        start: task.started_at || task.created_at,
        end: task.completed_at || task.created_at,
        type: 'task',
        color: getTaskColor(task.status),
        resourceId: task.id,
      })
    })
  }

  // Fetch articles with publish dates, scoped through project workspace
  const { data: articles } = await supabase
    .from('articles')
    .select(`
      *,
      project:projects!inner(workspace_id)
    `)
    .eq('project.workspace_id', workspaceId)
    .gte('created_at', filters.start)
    .lte('created_at', filters.end)

  if (articles) {
    articles.forEach((article: Article) => {
      events.push({
        id: `article-${article.id}`,
        title: article.title || 'Sem título',
        description: article.excerpt || undefined,
        start: article.date || article.created_at,
        end: article.date || article.created_at,
        allDay: true,
        type: 'article',
        color: getArticleColor(article.status),
        resourceId: article.id,
      })
    })
  }

  // Filter by type if specified
  if (filters.types && filters.types.length > 0) {
    return events.filter(e => filters.types!.includes(e.type))
  }

  return events
}

function getTaskColor(status?: string): string {
  switch (status) {
    case 'done': return 'var(--color-success)'
    case 'in_progress': return 'var(--color-info)'
    case 'blocked': return 'var(--color-error)'
    default: return 'var(--color-text-muted)'
  }
}

function getArticleColor(status?: string): string {
  switch (status) {
    case 'published': return 'var(--color-success)'
    case 'scheduled': return 'var(--color-warning)'
    case 'archived': return 'var(--color-text-muted)'
    default: return 'var(--color-primary)'
  }
}

export function useCalendarEvents(filters: CalendarFilters) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.calendar.events(filters, workspaceId),
    queryFn: () => fetchCalendarEvents(filters, workspaceId!),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  })
}
