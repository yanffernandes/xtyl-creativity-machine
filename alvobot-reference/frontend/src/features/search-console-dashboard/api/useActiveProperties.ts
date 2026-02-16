import { useQuery } from '@tanstack/react-query';
import { useConnections } from '@/features/connections/api/useConnections';
import { api } from '@/shared/utils/api';
import type { SearchConsoleProperty } from '../types';

interface StoredProperty {
  id: string;
  site_url: string;
  property_type: string;
  is_active: boolean;
  connection_id: string;
}

/**
 * Hook to fetch active Search Console properties from all connections
 */
export function useActiveSearchConsoleProperties() {
  const { data: connections } = useConnections();

  // Filter Search Console connections
  const searchConsoleConnections = connections?.filter(
    (conn) =>
      conn.plataform_name?.toLowerCase() === 'google' &&
      (conn.metadata as { type?: string } | undefined)?.type === 'search_console' &&
      conn.is_active
  ) || [];

  const connectionIds = searchConsoleConnections.map((c) => c.id);

  return useQuery({
    queryKey: ['search-console', 'active-properties', connectionIds],
    queryFn: async (): Promise<SearchConsoleProperty[]> => {
      if (connectionIds.length === 0) return [];

      // Fetch properties for all connections in parallel
      const results = await Promise.allSettled(
        searchConsoleConnections.map(async (conn) => {
          const response = await api.get<StoredProperty[]>(
            `/search-console/properties/${conn.id}/stored`
          );
          return { connection: conn, properties: response };
        })
      );

      // Flatten and transform results
      const allProperties: SearchConsoleProperty[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { connection, properties } = result.value;
          for (const prop of properties) {
            if (prop.is_active) {
              allProperties.push({
                id: prop.id,
                siteUrl: prop.site_url,
                propertyType: prop.property_type as 'DOMAIN' | 'URL_PREFIX',
                connectionId: connection.id,
                connectionName: connection.connection_name || prop.site_url,
                isActive: prop.is_active,
              });
            }
          }
        }
      }

      return allProperties;
    },
    enabled: connectionIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}
