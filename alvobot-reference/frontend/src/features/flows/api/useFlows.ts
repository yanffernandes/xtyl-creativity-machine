import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { Flow, FlowFilters } from '../types'
import type { Node, Edge } from '@xyflow/react'

// Transform database row to Flow type
// Supports both VueFlow format (connections) and ReactFlow format (edges)
function transformDbToFlow(row: Record<string, unknown>): Flow {
  const flowData = row.flow as {
    nodes?: Node[]
    edges?: Edge[]
    connections?: Array<{ from: string; to: string; sourceHandle?: string; targetHandle?: string }>
  } | null

  // Get nodes
  const nodes = (flowData?.nodes || []) as Node[]

  // Get edges - support both 'edges' (ReactFlow) and 'connections' (VueFlow)
  let edges: Edge[] = []
  if (flowData?.edges && Array.isArray(flowData.edges)) {
    edges = flowData.edges as Edge[]
  } else if (flowData?.connections && Array.isArray(flowData.connections)) {
    // Convert VueFlow connections to ReactFlow edges
    edges = flowData.connections as unknown as Edge[]
  }

  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    nodes,
    edges,
    project_id: row.project_id as number | undefined,
    is_active: (row.is_active as boolean) ?? false,
    utm_enabled: (row.utm_enabled as boolean) ?? true,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

async function fetchFlows(
  filters: FlowFilters,
  workspaceId: string | undefined
): Promise<Flow[]> {
  if (!workspaceId) return []

  let query = supabase
    .from('message_flows')
    .select('*, projects!inner(workspace_id)')
    .eq('projects.workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }

  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters.status && filters.status !== 'all') {
    query = query.eq('is_active', filters.status === 'active')
  }

  const { data, error } = await query

  if (error) throw error
  return (data || []).map(transformDbToFlow)
}

async function fetchFlow(
  id: string,
  workspaceId: string | undefined
): Promise<Flow | null> {
  if (!workspaceId) return null

  const { data, error } = await supabase
    .from('message_flows')
    .select('*, projects!inner(workspace_id)')
    .eq('id', id)
    .eq('projects.workspace_id', workspaceId)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return data ? transformDbToFlow(data) : null
}

export function useFlows(filters: FlowFilters = {}) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.flows.list(filters, workspaceId),
    queryFn: () => fetchFlows(filters, workspaceId),
    enabled: !!workspaceId,
  })
}

export function useFlow(id: string) {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.flows.detail(id),
    queryFn: () => fetchFlow(id, workspaceId),
    enabled: !!id && id !== 'new' && !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds - flow data doesn't change externally during editing
  })
}

// Lightweight query for flow selector dropdowns (only id and name)
async function fetchFlowOptions(
  workspaceId: string | undefined
): Promise<Array<{ id: string; name: string }>> {
  if (!workspaceId) return []

  const { data, error } = await supabase
    .from('message_flows')
    .select('id, name, projects!inner(workspace_id)')
    .eq('projects.workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }))
}

export function useFlowOptions() {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: [...queryKeys.flows.all, 'options', workspaceId],
    queryFn: () => fetchFlowOptions(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes - flow names don't change often
  })
}
