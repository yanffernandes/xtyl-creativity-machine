import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import type { ImportTasksInput, ImportTasksResponse } from '../types'

async function importTasks(input: ImportTasksInput): Promise<ImportTasksResponse> {
  return api.post<ImportTasksResponse>('/tasks/import', input)
}

export function useImportTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: importTasks,
    onSuccess: () => {
      // Invalidate tasks cache to refresh the Kanban board
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
    },
    onError: (error: Error) => {
      console.error('Failed to import tasks:', error.message)
    },
  })
}
