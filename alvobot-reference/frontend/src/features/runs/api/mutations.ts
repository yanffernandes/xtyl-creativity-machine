import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { processFlowNodesForRun } from '@/features/flows/utils/utmBuilder'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import { ActivityLogger } from '@/shared/utils/activityLogger'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { MessageRun, RunStatus } from './useRuns'

export interface CreateRunInput {
  flow_id: string
  page_ids: string[]  // Facebook page IDs (will be converted to bigint)
  start_at?: string   // ISO string da data/hora agendada
  total_subscribers_at_creation?: number
  active_subscribers_at_creation?: number
  // Optional trigger info for UTM tracking
  triggerId?: string | number
  triggerName?: string
}

// Fetch subscriber counts from the meta_page_subs_count view for given page IDs
export async function fetchSubscriberCounts(pageIds: string[]): Promise<{
  total: number
  active: number
}> {
  if (pageIds.length === 0) {
    return { total: 0, active: 0 }
  }

  const { data, error } = await supabase
    .from('meta_page_subs_count')
    .select('page_id, subscriber_count, active_subscribers')
    .in('page_id', pageIds)

  if (error) {
    console.error('Error fetching subscriber counts:', error)
    return { total: 0, active: 0 }
  }

  // Sum up all subscribers from selected pages
  const totals = (data || []).reduce(
    (acc, page) => ({
      total: acc.total + (page.subscriber_count || 0),
      active: acc.active + (page.active_subscribers || 0),
    }),
    { total: 0, active: 0 }
  )

  return totals
}

async function createRun(
  userId: string,
  input: CreateRunInput
): Promise<MessageRun> {
  // First, fetch the flow to get its data and utm_enabled setting
  const { data: flowData, error: flowError } = await supabase
    .from('message_flows')
    .select('id, name, flow, utm_enabled')
    .eq('id', input.flow_id)
    .single()

  if (flowError) throw flowError

  // Create the run first to get the run ID
  const { data: runData, error: runError } = await supabase
    .from('message_runs')
    .insert({
      user_id: userId,
      flow_id: input.flow_id,
      page_ids: input.page_ids,
      status: 'queued',
      start_at: input.start_at || new Date().toISOString(),
      total_messages: 0,
      success_count: 0,
      failure_count: 0,
      messages_in_queue: 0,
      total_subscribers_at_creation: input.total_subscribers_at_creation ?? 0,
      active_subscribers_at_creation: input.active_subscribers_at_creation ?? 0,
    })
    .select()
    .single()

  if (runError) throw runError

  const run = runData as MessageRun

  // Process the flow nodes to apply UTM parameters if enabled
  const flowContent = flowData.flow as { nodes?: unknown[]; edges?: unknown[] } | null
  const utmEnabled = flowData.utm_enabled ?? true

  if (flowContent?.nodes && utmEnabled) {
    // Apply UTM parameters to all URLs in the flow
    const processedNodes = processFlowNodesForRun(
      flowContent.nodes as Array<{ id: string; data?: Record<string, unknown> }>,
      {
        runId: run.id,
        triggerId: input.triggerId,
        triggerName: input.triggerName,
      }
    )

    const processedFlow = {
      nodes: processedNodes,
      edges: flowContent.edges || [],
      // Include flow metadata for reference
      flowId: flowData.id,
      flowName: flowData.name,
    }

    // Update the run with the processed flow
    const { error: updateError } = await supabase
      .from('message_runs')
      .update({ processed_flow: processedFlow })
      .eq('id', run.id)

    if (updateError) {
      console.error('Error updating processed_flow:', updateError)
      // Don't throw - the run was created, just without processed_flow
    }
  }

  return run
}

async function updateRunStatus(
  runId: number,
  status: RunStatus
): Promise<MessageRun> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'finished' || status === 'failed') {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('message_runs')
    .update(updateData)
    .eq('id', runId)
    .select()
    .single()

  if (error) throw error
  return data as MessageRun
}

async function cancelRun(runId: number): Promise<MessageRun> {
  return updateRunStatus(runId, 'failed')
}

async function retryRun(
  userId: string,
  originalRun: MessageRun
): Promise<MessageRun> {
  if (!originalRun.flow_id || !originalRun.page_ids) {
    throw new Error('Cannot retry run without flow_id and page_ids')
  }

  // Create a new run using the same createRun logic (which handles UTM processing)
  return createRun(userId, {
    flow_id: originalRun.flow_id,
    page_ids: originalRun.page_ids,
    // Note: retry runs don't have trigger info since they're manual
  })
}

async function deleteRun(runId: number): Promise<void> {
  // Soft delete
  const { error } = await supabase
    .from('message_runs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', runId)

  if (error) throw error
}

// Mutation hooks

export function useCreateRun() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (input: CreateRunInput & { flowName?: string }) => createRun(user!.id, input),
    onSuccess: (run, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all })
      showToast.success('Disparo criado com sucesso')
      // Log activity
      ActivityLogger.runCreated(run.id, variables.flowName)
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar disparo')
    },
  })
}

export function useUpdateRunStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: ({
      runId,
      status,
    }: {
      runId: number
      status: RunStatus
    }) => updateRunStatus(runId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs.detail(String(variables.runId)),
      })
      showToast.success('Status do disparo atualizado com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status do disparo')
    },
  })
}

export function useCancelRun() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (runId: number) => cancelRun(runId),
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs.detail(String(runId)),
      })
      showToast.success('Disparo cancelado com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao cancelar disparo')
    },
  })
}

export function useRetryRun() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (originalRun: MessageRun) => retryRun(user!.id, originalRun),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all })
      showToast.success('Disparo reprocessado com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao reprocessar disparo')
    },
  })
}

export function useDeleteRun() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (runId: number) => deleteRun(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all })
      showToast.success('Disparo excluído com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir disparo')
    },
  })
}

// Types for metrics update
interface UpdateMetricsResponse {
  success: boolean
  run: MessageRun
  metricsUpdated: boolean
}

interface BatchUpdateMetricsResponse {
  success: boolean
  updated: number[]
  skipped: number[]
  failed: number[]
}

// Update metrics for a single run via backend API
async function updateRunMetrics(runId: number): Promise<UpdateMetricsResponse> {
  return api.post<UpdateMetricsResponse>(`/runs/${runId}/metrics`, {})
}

// Batch update metrics for multiple runs
async function batchUpdateRunMetrics(runIds: number[]): Promise<BatchUpdateMetricsResponse> {
  return api.post<BatchUpdateMetricsResponse>('/runs/metrics/batch', { runIds })
}

export function useUpdateRunMetrics() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (runId: number) => updateRunMetrics(runId),
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs.detail(String(runId)),
      })
      showToast.success('Métricas do disparo atualizadas com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar métricas do disparo')
    },
  })
}

export function useBatchUpdateRunMetrics() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (runIds: number[]) => batchUpdateRunMetrics(runIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all })
      showToast.success(`${result.updated.length} disparo(s) atualizado(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar métricas em lote')
    },
  })
}
