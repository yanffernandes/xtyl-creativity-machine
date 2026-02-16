import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import type {
  ActivePropertiesResponse,
  ActiveProperty,
} from '../types'

// ============================================
// Active Properties API
// ============================================

async function getActiveProperties(connectionIds: string[]): Promise<ActiveProperty[]> {
  console.debug('[DEBUG getActiveProperties] Input connectionIds:', connectionIds)

  if (connectionIds.length === 0) {
    console.debug('[DEBUG getActiveProperties] No connectionIds, returning empty array')
    return []
  }

  try {
    const response = await api.post<ActivePropertiesResponse>(
      '/analytics/report/properties/active',
      { connectionIds }
    )

    console.debug('[DEBUG getActiveProperties] API Response:', {
      success: response.success,
      propertiesCount: response.properties?.length,
      properties: response.properties?.map(p => ({
        id: p.id,
        propertyId: p.propertyId,
        displayName: p.displayName,
        connectionId: p.connectionId,
      })),
    })

    return response.properties || []
  } catch (error) {
    console.error('[DEBUG getActiveProperties] API Error:', error)
    throw error
  }
}

export function useActiveAnalyticsProperties(connectionIds: string[]) {
  return useQuery({
    queryKey: ['analytics-active-properties', connectionIds.sort().join(',')],
    queryFn: () => getActiveProperties(connectionIds),
    enabled: connectionIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  })
}
