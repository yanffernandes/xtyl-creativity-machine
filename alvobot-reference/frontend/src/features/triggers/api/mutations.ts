import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import { ActivityLogger } from '@/shared/utils/activityLogger'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { MessageTrigger, TriggerType, TriggerStatus } from './useTriggers'

export interface CreateTriggerInput {
  title: string
  flow_id?: string
  page_ids?: string[]
  trigger_type: TriggerType
  trigger_keywords?: string[]
  cooldown_minutes?: number
  max_triggers_per_user?: number
  allow_multiple_per_user?: boolean
}

export interface UpdateTriggerInput {
  title?: string
  flow_id?: string
  page_ids?: string[]
  trigger_type?: TriggerType
  trigger_keywords?: string[]
  cooldown_minutes?: number
  max_triggers_per_user?: number
  allow_multiple_per_user?: boolean
  status?: TriggerStatus
}

async function createTrigger(
  userId: string,
  input: CreateTriggerInput
): Promise<MessageTrigger> {
  // page_ids are Facebook page IDs (numeric strings) - PostgreSQL handles the bigint conversion
  const { data, error } = await supabase
    .from('message_triggers')
    .insert({
      owner_user_id: userId,
      ...input,
      status: 'active',
    })
    .select()
    .single()

  if (error) throw error
  return data as MessageTrigger
}

async function updateTrigger(
  userId: string,
  triggerId: number,
  input: UpdateTriggerInput
): Promise<MessageTrigger> {
  // page_ids are Facebook page IDs (numeric strings) - PostgreSQL handles the bigint conversion
  // RLS ensures user can only update triggers they own
  const { data, error } = await supabase
    .from('message_triggers')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', triggerId)
    .eq('owner_user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as MessageTrigger
}

async function toggleTriggerStatus(
  userId: string,
  triggerId: number,
  status: TriggerStatus
): Promise<MessageTrigger> {
  // RLS ensures user can only toggle triggers they own
  const { data, error } = await supabase
    .from('message_triggers')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', triggerId)
    .eq('owner_user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as MessageTrigger
}

async function deleteTrigger(userId: string, triggerId: number): Promise<void> {
  // Soft delete - verify ownership
  const { error } = await supabase
    .from('message_triggers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', triggerId)
    .eq('owner_user_id', userId)

  if (error) throw error
}

// Mutation hooks

export function useCreateTrigger() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (input: CreateTriggerInput) => createTrigger(user!.id, input),
    onSuccess: (trigger) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers.all })
      showToast.success('Acionador criado com sucesso')
      // Log activity
      ActivityLogger.triggerCreated(trigger.id, trigger.title)
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar acionador')
    },
  })
}

export function useUpdateTrigger() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTriggerInput & { id: number }) =>
      updateTrigger(user!.id, id, input),
    onSuccess: (trigger, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.triggers.detail(String(variables.id)),
      })
      showToast.success('Acionador atualizado com sucesso')
      // Log activity
      ActivityLogger.triggerUpdated(trigger.id, trigger.title)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar acionador')
    },
  })
}

export function useToggleTriggerStatus() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TriggerStatus }) =>
      toggleTriggerStatus(user!.id, id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.triggers.detail(String(variables.id)),
      })
      const statusMsg = variables.status === 'active' ? 'ativado' : 'desativado'
      showToast.success(`Acionador ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao alterar status do acionador')
    },
  })
}

export function useDeleteTrigger() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (params: { id: number; title: string }) => deleteTrigger(user!.id, params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.triggers.all })
      showToast.success('Acionador excluído com sucesso')
      // Log activity
      ActivityLogger.triggerDeleted(variables.id, variables.title)
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir acionador')
    },
  })
}
