import { useMutation, useQueryClient } from '@tanstack/react-query'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import { ActivityLogger } from '@/shared/utils/activityLogger'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase, getCurrentUserId } from '@/shared/utils/supabase'
import type { Flow, CreateFlowInput, UpdateFlowInput } from '../types'
import type { Node, Edge } from '@xyflow/react'

// Transform database row to Flow type
function transformDbToFlow(row: Record<string, unknown>): Flow {
  const flowData = row.flow as { nodes?: Node[]; edges?: Edge[] } | null
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    nodes: (flowData?.nodes || []) as Node[],
    edges: (flowData?.edges || []) as Edge[],
    project_id: row.project_id as number | undefined,
    is_active: (row.is_active as boolean) ?? false,
    utm_enabled: (row.utm_enabled as boolean) ?? true,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

async function createFlow(input: CreateFlowInput): Promise<Flow> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  if (!input.project_id) {
    throw new Error('project_id is required')
  }

  // RLS on message_flows table ensures user can only create flows for projects they own
  const { data, error } = await supabase
    .from('message_flows')
    .insert({
      name: input.name,
      project_id: input.project_id,
      flow: {
        nodes: input.nodes || [],
        edges: input.edges || [],
      },
      is_active: false,
      utm_enabled: input.utm_enabled ?? true, // Default to true for new flows
    })
    .select()
    .single()

  if (error) throw error
  return transformDbToFlow(data)
}

async function updateFlow(input: UpdateFlowInput): Promise<Flow> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { id, nodes, edges, ...updates } = input

  // Build the update object
  const updateData: Record<string, unknown> = { ...updates }

  // If nodes or edges are provided, update the flow JSONB field directly
  // No need to fetch current data - we always have the full state from the editor
  if (nodes !== undefined || edges !== undefined) {
    updateData.flow = {
      nodes: nodes || [],
      edges: edges || [],
    }
  }

  // RLS ensures user can only update flows for projects they own/have workspace access
  const { data, error } = await supabase
    .from('message_flows')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return transformDbToFlow(data)
}

async function deleteFlow(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  // Soft delete by setting deleted_at
  // RLS ensures user can only delete flows for projects they own/have workspace access
  const { error } = await supabase
    .from('message_flows')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export function useCreateFlow() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: createFlow,
    onSuccess: (flow) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flows.all })
      showToast.success('Fluxo criado com sucesso!')
      // Log activity
      ActivityLogger.flowCreated(flow.id, flow.name)
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar fluxo')
    },
  })
}

export function useUpdateFlow() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateFlow,
    onSuccess: (data) => {
      // Update cache directly instead of invalidating (avoids refetch)
      queryClient.setQueryData(queryKeys.flows.detail(data.id), data)

      // Only invalidate lists if name changed (affects display in lists)
      // For auto-save, we skip list invalidation to avoid unnecessary requests
      // Lists will be refreshed when navigating back to the list page

      // Log activity
      ActivityLogger.flowUpdated(data.id, data.name)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar fluxo')
    },
  })
}

export function useDeleteFlow() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (params: { id: string; name: string }) => deleteFlow(params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flows.all })
      showToast.success('Fluxo excluído com sucesso!')
      // Log activity
      ActivityLogger.flowDeleted(variables.id, variables.name)
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir fluxo')
    },
  })
}
