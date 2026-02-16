import { useMemo } from 'react'
import { useWorkspaceMembersQuery } from '@/features/workspace/api/queries'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import { connectionNeedsAttention, getConnectionStatus } from '@/shared/utils/connectionStatus'
import { useConnections } from './useConnections'

export interface ConnectionNeedingReconnect {
  id: string
  connection_name: string
  plataform_name: string
  metadata: { type?: string } | null
  last_refresh_error: string | null
  user_id: string
  token_expires_at: string | null
  owner_name?: string // Populated from workspace members
  reason: 'needs_reconnect' | 'expired' // Why this connection needs attention
}

/**
 * Hook to find connections that need user reconnection.
 * 
 * OPTIMIZATION: Instead of making a separate Supabase query, this hook
 * reuses data from `useConnections({ status: 'active' })` which is already
 * fetched by other components (e.g., AdsPerformancePage, ConnectionsPage).
 * This eliminates 1-2 duplicate HTTP requests per page load.
 * 
 * Includes connections where:
 * 1. needs_reconnect = true (permanent token refresh failure)
 * 2. token_expires_at < now (token has expired)
 *
 * Used to display persistent alerts in the notification bell.
 * Shows owner name so all workspace members know whose connection needs attention.
 */
export function useConnectionsNeedingReconnect() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)
  const { data: members } = useWorkspaceMembersQuery(workspaceId)

  // Reuse the connections data from the shared hook (same TanStack Query cache)
  const { data: activeConnections, isLoading } = useConnections({ status: 'active' })

  const data = useMemo(() => {
    if (!activeConnections) return []

    // Filter to connections that need attention using shared utility
    const connectionsNeedingAttentionList = activeConnections.filter((conn) =>
      connectionNeedsAttention({
        is_active: true,
        needs_reconnect: (conn as Record<string, unknown>).needs_reconnect as boolean ?? false,
        token_expires_at: conn.token_expires_at ?? null,
      })
    )

    // Enrich with owner name and reason
    const enrichedConnections: ConnectionNeedingReconnect[] = connectionsNeedingAttentionList.map((conn) => {
      const member = members?.find((m) => m.user_id === conn.user_id)
      const statusInfo = getConnectionStatus({
        is_active: true,
        needs_reconnect: (conn as Record<string, unknown>).needs_reconnect as boolean ?? false,
        token_expires_at: conn.token_expires_at ?? null,
      })

      return {
        id: conn.id,
        connection_name: conn.connection_name,
        plataform_name: conn.plataform_name,
        metadata: conn.metadata as { type?: string } | null,
        last_refresh_error: conn.last_refresh_error ?? null,
        user_id: conn.user_id,
        token_expires_at: conn.token_expires_at ?? null,
        owner_name: member?.user?.raw_user_meta_data?.name ||
                   member?.user?.raw_user_meta_data?.full_name ||
                   member?.user?.email?.split('@')[0] ||
                   undefined,
        reason: statusInfo.status === 'needs_reconnect' ? 'needs_reconnect' : 'expired',
      }
    })

    return enrichedConnections
  }, [activeConnections, members])

  return { data, isLoading }
}
