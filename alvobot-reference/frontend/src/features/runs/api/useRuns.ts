import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

export type RunStatus = 'queued' | 'running' | 'waiting' | 'finished' | 'failed'

export interface RunPage {
  page_id: string
  page_name: string
  image: string | null
  is_active: boolean
}

export interface MessageRun {
  id: number
  user_id: string
  page_ids?: string[]  // IDs das páginas Meta (Facebook page IDs)
  flow_id?: string
  status: RunStatus
  start_at?: string
  completed_at?: string
  created_at: string
  updated_at?: string
  deleted_at?: string
  next_step_at?: string
  next_step_id?: string
  last_step_id?: string
  total_messages: number
  success_count: number
  failure_count: number
  messages_in_queue: number
  total_subscribers_at_creation: number
  active_subscribers_at_creation: number
  error_summary?: Record<string, unknown>
  parent_run_id?: number
  // Joined relations
  flow?: {
    id: string
    name: string
    project_id?: number
  } | null
  // Pages info (fetched separately)
  pages?: RunPage[]
}

export interface RunFilters {
  search?: string
  status?: RunStatus | 'all'
  flowId?: string
  startDate?: string
  endDate?: string
}

export interface RunStats {
  total: number
  queued: number
  running: number
  waiting: number
  finished: number
  failed: number
  totalMessages: number
  successRate: number
}

async function fetchRuns(
  filters: RunFilters = {},
  workspaceId: string | undefined
): Promise<MessageRun[]> {
  if (!workspaceId) return []

  // Runs are filtered through flows that belong to projects in the workspace
  let query = supabase
    .from('message_runs')
    .select(`
      *,
      flow:message_flows!inner(
        id,
        name,
        project_id,
        projects!inner(workspace_id)
      )
    `)
    .eq('flow.projects.workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Status filter
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // Flow filter
  if (filters.flowId) {
    query = query.eq('flow_id', filters.flowId)
  }

  // Date range filter
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  const { data, error } = await query

  if (error) throw error

  // Client-side search filter (flow name)
  let runs = (data || []) as MessageRun[]
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    runs = runs.filter(run => {
      const flowName = run.flow?.name
      return flowName?.toLowerCase().includes(searchLower)
    })
  }

  // Fetch pages info for all runs
  // Convert page_ids to strings since meta_pages.page_id is text type
  const allPageIds = runs.flatMap(run => (run.page_ids || []).map(id => String(id)))
  const uniquePageIds = [...new Set(allPageIds)]

  if (uniquePageIds.length > 0) {
    const { data: pagesData } = await supabase
      .from('meta_pages')
      .select('page_id, page_name, image, is_active')
      .in('page_id', uniquePageIds)

    if (pagesData) {
      // Create a map for quick lookup
      const pagesMap = new Map<string, RunPage>()
      pagesData.forEach(page => {
        pagesMap.set(page.page_id, {
          page_id: page.page_id,
          page_name: page.page_name,
          image: page.image,
          is_active: page.is_active,
        })
      })

      // Attach pages to each run (convert page_ids to strings for lookup)
      runs = runs.map(run => ({
        ...run,
        pages: (run.page_ids || [])
          .map(pageId => pagesMap.get(String(pageId)))
          .filter((page): page is RunPage => page !== undefined),
      }))
    }
  }

  return runs
}

async function fetchRunById(runId: string | number, workspaceId: string): Promise<MessageRun | null> {
  const { data, error } = await supabase
    .from('message_runs')
    .select(`
      *,
      flow:message_flows!inner(
        id, name, project_id,
        projects!inner(workspace_id)
      )
    `)
    .eq('id', runId)
    .eq('flow.projects.workspace_id', workspaceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as MessageRun
}

async function fetchRunStats(workspaceId: string | undefined): Promise<RunStats> {
  if (!workspaceId) {
    return { total: 0, queued: 0, running: 0, waiting: 0, finished: 0, failed: 0, totalMessages: 0, successRate: 0 }
  }

  const { data, error } = await supabase
    .from('message_runs')
    .select(`
      status,
      total_messages,
      success_count,
      failure_count,
      flow:message_flows!inner(
        project_id,
        projects!inner(workspace_id)
      )
    `)
    .eq('flow.projects.workspace_id', workspaceId)
    .is('deleted_at', null)

  if (error) throw error

  const runs = data || []
  const totalMessages = runs.reduce((acc, r) => acc + (r.total_messages || 0), 0)
  const totalSuccess = runs.reduce((acc, r) => acc + (r.success_count || 0), 0)
  const successRate = totalMessages > 0 ? Math.round((totalSuccess / totalMessages) * 100) : 0

  return {
    total: runs.length,
    queued: runs.filter(r => r.status === 'queued').length,
    running: runs.filter(r => r.status === 'running').length,
    waiting: runs.filter(r => r.status === 'waiting').length,
    finished: runs.filter(r => r.status === 'finished').length,
    failed: runs.filter(r => r.status === 'failed').length,
    totalMessages,
    successRate,
  }
}

// Query hooks

export function useRuns(filters: RunFilters = {}) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.runs.list(filters, workspaceId),
    queryFn: () => fetchRuns(filters, workspaceId),
    enabled: !!workspaceId,
  })
}

export function useRun(runId: string | number) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.runs.detail(String(runId)), workspaceId],
    queryFn: () => fetchRunById(runId, workspaceId!),
    enabled: !!runId && !!workspaceId,
  })
}

export function useRunStats() {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.runs.all, 'stats', workspaceId],
    queryFn: () => fetchRunStats(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Helper functions

export function formatDuration(startAt?: string, completedAt?: string): string {
  if (!startAt) return '-'

  const start = new Date(startAt)
  const end = completedAt ? new Date(completedAt) : new Date()
  const diffMs = end.getTime() - start.getTime()

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export function formatRunTime(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusLabel(status: RunStatus): string {
  const labels: Record<RunStatus, string> = {
    queued: 'Na fila',
    running: 'Executando',
    waiting: 'Aguardando',
    finished: 'Concluído',
    failed: 'Falha',
  }
  return labels[status] || status
}

export function calculateSuccessRate(successCount: number, totalMessages: number): number {
  if (totalMessages === 0) return 0
  return Math.round((successCount / totalMessages) * 100)
}

export function calculateErrorRate(failureCount: number, totalMessages: number): number {
  if (totalMessages === 0) return 0
  return Math.round((failureCount / totalMessages) * 100)
}
