import { useQuery } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import { supabase } from '@/shared/utils/supabase'

/**
 * Interface para conexão de ads do Meta
 */
export interface MetaAdsConnection {
  id: string
  user_id: string
  workspace_id?: string
  connection_name: string | null
  plataform_name: string | null
  platform_user_id: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  metadata: {
    type?: 'ads' | 'messages'
    ad_account_id?: string
    business_id?: string
    [key: string]: unknown
  } | null
  is_active: boolean | null
  last_used_at: string | null
  created_at: string
  updated_at: string | null
}

/**
 * Hook para buscar conexões de ads do Meta
 * Filtra apenas conexões da plataforma 'meta' com metadata.type = 'ads' do workspace atual
 */
export function useMetaAdsConnections() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: ['meta-ads-connections', workspaceId],
    queryFn: async (): Promise<MetaAdsConnection[]> => {
      if (!workspaceId) {
        return []
      }

      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('plataform_name', 'meta')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      // Filtra apenas conexões do tipo 'ads' no metadata
      const adsConnections = (data || []).filter((connection) => {
        const metadata = connection.metadata as MetaAdsConnection['metadata']
        return metadata?.type === 'ads'
      })

      return adsConnections as MetaAdsConnection[]
    },
    enabled: !!workspaceId,
  })
}

/**
 * Hook para buscar uma conexão específica pelo ID (com escopo de workspace)
 */
export function useMetaAdsConnection(connectionId: string | undefined) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: ['meta-ads-connection', connectionId, workspaceId],
    queryFn: async (): Promise<MetaAdsConnection | null> => {
      if (!connectionId || !workspaceId) return null

      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .eq('workspace_id', workspaceId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Not found or not in this workspace
        }
        throw error
      }

      return data as MetaAdsConnection
    },
    enabled: !!connectionId && !!workspaceId,
  })
}

/**
 * Hook para verificar se o usuário tem pelo menos uma conta de ads conectada
 */
export function useHasMetaAdsConnection() {
  const { data: connections, isLoading } = useMetaAdsConnections()

  return {
    hasConnection: (connections?.length ?? 0) > 0,
    activeConnections: connections?.filter(c => c.is_active) ?? [],
    isLoading,
  }
}
