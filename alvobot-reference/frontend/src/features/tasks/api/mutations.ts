import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import { ActivityLogger } from '@/shared/utils/activityLogger'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase, getCurrentUserId } from '@/shared/utils/supabase'
import type { Task, CreateTaskInput, UpdateTaskInput } from '../types'

async function createTask(input: CreateTaskInput & { user_id: string; workspace_id: string }): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...input,
      status: input.status || 'to_do',
      sort_order: 0,
      completion_percentage: 0,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Task
}

async function updateTask({ id, ...input }: UpdateTaskInput): Promise<Task> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const updateData: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  }

  // Auto-set started_at when moving to in_progress
  if (input.status === 'in_progress' && !input.started_at) {
    updateData.started_at = new Date().toISOString()
  }

  // Auto-set completed_at when moving to done
  if (input.status === 'done' && !input.completed_at) {
    updateData.completed_at = new Date().toISOString()
    updateData.completion_percentage = 100
  }

  // RLS handles workspace access - no user_id filter needed
  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Task
}

async function deleteTask(id: string): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  // RLS handles workspace access - no user_id filter needed
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceId()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (input: CreateTaskInput) => {
      if (!workspaceId) throw new Error('Workspace not selected')
      return createTask({ ...input, user_id: user!.id, workspace_id: workspaceId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      showToast.success('Tarefa criada com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar tarefa')
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateTask,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      showToast.success('Tarefa atualizada com sucesso')
      // Log activity when task is completed
      if (task.status === 'done') {
        ActivityLogger.taskCompleted(task.id, task.name || 'Tarefa')
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar tarefa')
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
      showToast.success('Tarefa excluída com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir tarefa')
    },
  })
}
