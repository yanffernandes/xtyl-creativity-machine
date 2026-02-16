import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

export type TriggerType = 'any_message' | 'keywords' | 'schedule' | 'event' | 'webhook' | 'manual' | 'keyword'
export type TriggerStatus = 'active' | 'paused' | 'error'

export interface MessageTrigger {
  id: number
  owner_user_id: string
  title: string
  page_ids?: string[]
  flow_id?: string
  status: TriggerStatus
  trigger_type: TriggerType
  trigger_keywords?: string[]
  cooldown_minutes?: number
  max_triggers_per_user?: number
  allow_multiple_per_user?: boolean
  created_at: string
  updated_at?: string
  deleted_at?: string
  // Joined relations
  flow?: {
    id: string
    name: string
  } | null
}

export interface TriggerFilters {
  search?: string
  status?: TriggerStatus | 'all'
  type?: TriggerType | 'all'
}

export interface TriggerStats {
  total: number
  active: number
  paused: number
  error: number
}

async function fetchTriggers(workspaceId: string, filters: TriggerFilters = {}): Promise<MessageTrigger[]> {
  console.log('[DEBUG triggers] fetchTriggers called with workspaceId:', workspaceId, 'filters:', filters)
  let query = supabase
    .from('message_triggers')
    .select(`
      *,
      flow:message_flows(id, name)
    `)
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Status filter
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  // Type filter
  if (filters.type && filters.type !== 'all') {
    query = query.eq('trigger_type', filters.type)
  }

  const { data, error } = await query

  console.log('[DEBUG triggers] response:', { data, error, count: data?.length })

  if (error) throw error

  // Client-side search filter
  let triggers = (data || []) as MessageTrigger[]
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    triggers = triggers.filter(trigger => {
      const flowName = trigger.flow?.name
      return (
        trigger.title?.toLowerCase().includes(searchLower) ||
        flowName?.toLowerCase().includes(searchLower)
      )
    })
  }

  return triggers
}

async function fetchTriggerById(triggerId: string | number, workspaceId: string): Promise<MessageTrigger | null> {
  const { data, error } = await supabase
    .from('message_triggers')
    .select(`
      *,
      flow:message_flows(id, name)
    `)
    .eq('id', triggerId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as MessageTrigger
}

async function fetchTriggerStats(workspaceId: string): Promise<TriggerStats> {
  const { data, error } = await supabase
    .from('message_triggers')
    .select('status')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (error) throw error

  const triggers = data || []
  return {
    total: triggers.length,
    active: triggers.filter(t => t.status === 'active').length,
    paused: triggers.filter(t => t.status === 'paused').length,
    error: triggers.filter(t => t.status === 'error').length,
  }
}

// Query hooks

export function useTriggers(filters: TriggerFilters = {}) {
  const workspaceId = useWorkspaceId()
  console.log('[DEBUG triggers] useTriggers hook - workspaceId:', workspaceId, 'enabled:', !!workspaceId)

  return useQuery({
    queryKey: queryKeys.triggers.list(workspaceId || null, filters),
    queryFn: () => fetchTriggers(workspaceId!, filters),
    enabled: !!workspaceId,
  })
}

export function useTrigger(triggerId: string | number) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.triggers.detail(String(triggerId)), workspaceId],
    queryFn: () => fetchTriggerById(triggerId, workspaceId!),
    enabled: !!triggerId && !!workspaceId,
  })
}

export function useTriggerStats() {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.triggers.all, 'stats', workspaceId],
    queryFn: () => fetchTriggerStats(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 1000 * 60, // 1 minute
  })
}

// Helper functions

export function formatTriggerTime(dateString?: string): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getTriggerTypeLabel(type: TriggerType): string {
  const labels: Record<TriggerType, string> = {
    any_message: 'Qualquer mensagem',
    keywords: 'Palavras-chave',
    schedule: 'Agendado',
    event: 'Evento',
    webhook: 'Webhook',
    manual: 'Manual',
    keyword: 'Palavra-chave',
  }
  return labels[type] || type
}

export function getStatusLabel(status: TriggerStatus): string {
  const labels: Record<TriggerStatus, string> = {
    active: 'Ativo',
    paused: 'Pausado',
    error: 'Erro',
  }
  return labels[status] || status
}
