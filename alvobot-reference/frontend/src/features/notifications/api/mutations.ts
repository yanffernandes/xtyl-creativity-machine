import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Notification } from '@/shared/types/database'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'

interface MarkAllReadResponse {
  updated_count: number
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationId: number) => {
      return api.patch<Notification>(`/notifications/${notificationId}/read`, {})
    },
    onSuccess: () => {
      // Invalidate notification queries to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return api.post<MarkAllReadResponse>('/notifications/read-all', {})
    },
    onSuccess: () => {
      // Invalidate notification queries to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}
