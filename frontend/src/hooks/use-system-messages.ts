/**
 * React Query hooks for System Messages
 * Provides data fetching for system-wide messages and configuration
 *
 * Feature: Supabase Direct Migration
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { systemService } from '@/lib/supabase/system'
import type { SystemMessage, SystemConfig } from '@/types/supabase'
import { queryKeys } from '@/lib/query-keys'

/**
 * Hook to fetch active system messages
 * Uses Supabase directly for faster access
 */
export function useSystemMessages(
  queryOptions?: Omit<UseQueryOptions<SystemMessage[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SystemMessage[]>({
    queryKey: queryKeys.systemMessages.active(),
    queryFn: async () => {
      const result = await systemService.getActiveMessages()
      if (result.error) throw result.error
      return result.data || []
    },
    staleTime: 60000, // 1 minute - system messages don't change often
    refetchOnWindowFocus: false,
    ...queryOptions,
  })
}

/**
 * Hook to fetch a specific system configuration
 */
export function useSystemConfig(
  key: string,
  queryOptions?: Omit<UseQueryOptions<SystemConfig | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SystemConfig | null>({
    queryKey: ['systemConfig', key],
    queryFn: async () => {
      const result = await systemService.getConfig(key)
      if (result.error) {
        // Return null if not found instead of throwing
        if (result.error.message?.includes('not found')) {
          return null
        }
        throw result.error
      }
      return result.data
    },
    staleTime: 300000, // 5 minutes
    ...queryOptions,
  })
}

/**
 * Hook to fetch all system configurations (for admin panel)
 */
export function useAllSystemConfigs(
  queryOptions?: Omit<UseQueryOptions<SystemConfig[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<SystemConfig[]>({
    queryKey: ['systemConfig', 'all'],
    queryFn: async () => {
      const result = await systemService.getAllConfigs()
      if (result.error) throw result.error
      return result.data || []
    },
    staleTime: 60000, // 1 minute
    ...queryOptions,
  })
}
