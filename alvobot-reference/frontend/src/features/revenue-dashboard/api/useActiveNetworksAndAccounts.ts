import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'

export interface ActiveNetwork {
  id: string
  name: string
  currencyCode: string
  connectionId: string
  connectionName: string
}

export interface ActiveAccount {
  id: string
  name: string
  currencyCode: string
  connectionId: string
  connectionName: string
}

interface AdSenseAccountMetadata {
  accounts?: Array<{
    id: string
    name?: string
    displayName?: string
    currencyCode: string
    is_active?: boolean
  }>
}

interface AdSenseConnection {
  id: string
  connection_name?: string
  metadata?: AdSenseAccountMetadata
}

interface BatchNetworksResponse {
  success: boolean
  networks: Array<{
    id: string
    name: string
    currencyCode: string
    is_active: boolean
    connectionId: string
  }>
}

/**
 * Fetch active Ad Manager networks from database (not from metadata)
 * Uses centralized /revenue endpoint to avoid N+1 queries - single request for all connections
 */
export function useActiveAdManagerNetworks(connectionIds: string[]) {
  return useQuery<ActiveNetwork[]>({
    queryKey: ['revenue', 'active-networks', ...connectionIds.sort()],
    queryFn: async (): Promise<ActiveNetwork[]> => {
      if (connectionIds.length === 0) return []

      // Single batch request to centralized revenue endpoint
      const response = await api.post<BatchNetworksResponse>(
        '/revenue/networks/active',
        { connectionIds }
      )

      // Filter only active networks (is_active=true) and map to ActiveNetwork
      return response.networks
        .filter(n => n.is_active === true)
        .map(n => ({
          id: n.id,
          name: n.name,
          currencyCode: n.currencyCode,
          connectionId: n.connectionId,
          connectionName: '', // Will be filled from connection data
        }))
    },
    enabled: connectionIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds (refresh when navigating back to page)
  })
}

/**
 * Get active accounts from AdSense connections metadata
 * For AdSense, accounts are stored in metadata and we filter by is_active
 */
export function getActiveAdSenseAccounts(
  adsenseConnections: AdSenseConnection[]
): ActiveAccount[] {
  return adsenseConnections.flatMap((conn) => {
    const accounts = (conn.metadata?.accounts || []).filter(a => a.is_active !== false)

    return accounts.map(a => ({
      id: a.id,
      name: a.displayName || a.name || a.id,
      currencyCode: a.currencyCode,
      connectionId: conn.id,
      connectionName: conn.connection_name || '',
    }))
  })
}
