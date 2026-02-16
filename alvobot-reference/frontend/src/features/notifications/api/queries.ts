import { useQuery } from '@tanstack/react-query'
import type { NotificationListResponse } from '@/shared/types/database'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'

interface NotificationQueryParams {
  unread_only?: boolean
  limit?: number
  offset?: number
}

export function useNotifications(params: NotificationQueryParams = {}) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (params.unread_only !== undefined) {
        queryParams.set('unread_only', String(params.unread_only))
      }
      if (params.limit !== undefined) {
        queryParams.set('limit', String(params.limit))
      }
      if (params.offset !== undefined) {
        queryParams.set('offset', String(params.offset))
      }

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/notifications?${queryString}` : '/notifications'

      return api.get<NotificationListResponse>(endpoint)
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const response = await api.get<NotificationListResponse>('/notifications?limit=1')
      return response.unread_count
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}
