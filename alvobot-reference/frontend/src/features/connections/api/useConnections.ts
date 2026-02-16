import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import type { Connection } from '@/shared/types/entities'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

export interface ConnectionFilters {
  search?: string
  platform?: string
  status?: 'active' | 'inactive' | 'all'
}

async function fetchConnections(
  workspaceId: string,
  filters: ConnectionFilters = {}
): Promise<Connection[]> {
  let query = supabase
    .from('connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Filter by platform if provided
  if (filters.platform) {
    query = query.eq('plataform_name', filters.platform)
  }

  // Filter by status
  if (filters.status === 'active') {
    query = query.eq('is_active', true)
  } else if (filters.status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data, error } = await query

  if (error) {
    if (error.code === '42P01') return [] // Table doesn't exist
    throw error
  }

  // Filter by search on client side (name or platform)
  let connections = data || []
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    connections = connections.filter(
      (c) =>
        c.connection_name?.toLowerCase().includes(searchLower) ||
        c.plataform_name?.toLowerCase().includes(searchLower)
    )
  }

  return connections
}

export function useConnections(filters: ConnectionFilters = {}) {
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: queryKeys.connections.list(filters, workspaceId),
    queryFn: () => fetchConnections(workspaceId!, filters),
    enabled: !!user?.id && !!workspaceId,
  })
}

export function useConnection(connectionId: string | null) {
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: queryKeys.connections.detail(connectionId || ''),
    queryFn: async () => {
      if (!connectionId) return null

      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .eq('workspace_id', workspaceId!)
        .single()

      if (error) throw error
      return data as Connection
    },
    enabled: !!user?.id && !!connectionId && !!workspaceId,
  })
}

// Helper to get connection stats
export function useConnectionStats() {
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: queryKeys.connections.stats(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connections')
        .select('is_active, plataform_name')
        .eq('workspace_id', workspaceId!)
        .is('deleted_at', null)

      if (error) {
        if (error.code === '42P01') {
          return { total: 0, active: 0, inactive: 0, byPlatform: {} }
        }
        throw error
      }

      const connections = data || []
      const active = connections.filter((c) => c.is_active).length
      const inactive = connections.filter((c) => !c.is_active).length

      // Group by platform
      const byPlatform = connections.reduce<Record<string, number>>((acc, c) => {
        const platform = c.plataform_name || 'unknown'
        acc[platform] = (acc[platform] || 0) + 1
        return acc
      }, {})

      return {
        total: connections.length,
        active,
        inactive,
        byPlatform,
      }
    },
    enabled: !!user?.id && !!workspaceId,
  })
}
