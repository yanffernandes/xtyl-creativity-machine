import { useState, useEffect, useMemo, type JSX } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Link2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Trash2,
  AlertCircle,
  MessageCircle,
  Megaphone,
  ChevronRight,
  History,
  CheckSquare,
  Square,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { serviceIcons } from '@/assets/icons/services'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import { Button, Input, Spinner, EmptyState, Modal, Alert, Checkbox, toast } from '@/shared/components'
import { useConfirmDialog, useDocumentTitle } from '@/shared/hooks'
import type { Connection } from '@/shared/types/entities'
import { api } from '@/shared/utils/api'
import { getConnectionStatus } from '@/shared/utils/connectionStatus'
import { queryKeys } from '@/shared/utils/queryKeys'
import { searchConsoleApi, type SearchConsoleQuotaUsage } from '@/shared/utils/searchConsoleApi'
import styles from './ConnectionsPage.module.css'
import { useDeleteConnection, useRefreshConnectionToken, useMetaConnectionPages, useUpdateMetaPageStatus, useBatchUpdateMetaPagesStatus, useRefreshMetaPages, useAutoRefreshTokens, useAdSenseOAuthInitiate, useUpdateConnection, useSearchConsoleOAuthInitiate, useAnalyticsOAuthInitiate, useGoogleAdsStoredAccounts, useSyncGoogleAdsAccounts, useUpdateGoogleAdsAccountStatus, useBulkUpdateGoogleAdsAccounts, useAdManagerStoredNetworks, useSyncAdManagerNetworks, useUpdateAdManagerNetworkStatus, useBatchUpdateAdManagerNetworks, useMetaAdStoredAccounts, useSyncMetaAdAccounts, useUpdateMetaAdAccountStatus, useBatchUpdateMetaAdAccounts, useMetaPagesForAds, useSyncMetaPagesForAds, useUpdateMetaPageForAdsStatus, useBatchUpdateMetaPagesForAdsStatus, useMetaPixelsStored, useSyncMetaPixels, useUpdateMetaPixelStatus, useBatchUpdateMetaPixels, useMetaInstagramAccountsForConnection, useSyncAllMetaResources, useAnalyticsStoredProperties, useSyncAnalyticsProperties, useUpdateAnalyticsPropertyStatus, useBulkUpdateAnalyticsProperties, useSearchConsoleStoredProperties, useSyncSearchConsoleProperties, useUpdateSearchConsolePropertyStatus, useBulkUpdateSearchConsoleProperties } from '../api/mutations'
import { useConnections, useConnectionStats } from '../api/useConnections'
import { ConnectionLogsModal } from '../components/ConnectionLogsModal'

// Plataformas disponíveis (apenas Meta e Google no step 2)
type Platform = 'meta' | 'google'
type ConnectionSubType = 'messages' | 'ads'
type GoogleServiceType = 'ads' | 'adsense' | 'ad_manager' | 'search_console' | 'analytics'

interface PlatformConfig {
  id: Platform
  label: string
  color: string
}

const platforms: PlatformConfig[] = [
  {
    id: 'meta',
    label: 'Meta',
    color: '#0084FF',
  },
  {
    id: 'google',
    label: 'Google',
    color: '#4285F4',
  },
]

// Google services sub-selection
interface GoogleServiceConfig {
  id: GoogleServiceType
  label: string
  description: string
  color: string
  iconKey: keyof typeof serviceIcons
}

const googleServices: GoogleServiceConfig[] = [
  {
    id: 'ads',
    label: 'Google Ads',
    description: 'Campanhas e anúncios pagos',
    color: '#4285F4',
    iconKey: 'ads',
  },
  {
    id: 'adsense',
    label: 'AdSense',
    description: 'Monetização de conteúdo',
    color: '#34A853',
    iconKey: 'adsense',
  },
  {
    id: 'ad_manager',
    label: 'Ad Manager',
    description: 'Gerenciamento avançado de anúncios',
    color: '#FBBC04',
    iconKey: 'ad_manager',
  },
  {
    id: 'search_console',
    label: 'Search Console',
    description: 'Desempenho na pesquisa Google',
    color: '#EA4335',
    iconKey: 'search_console',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Análise de tráfego e comportamento',
    color: '#F9AB00',
    iconKey: 'analytics',
  },
]

interface InitiateOAuthResponse {
  success: boolean
  authorizationUrl: string
  metaAppId: string
}

interface ConnectionTypeOption {
  id: ConnectionSubType
  label: string
  description: string
  icon: typeof MessageCircle
}

const connectionSubTypes: ConnectionTypeOption[] = [
  {
    id: 'messages',
    label: 'Mensagens',
    description: 'Disparo automático de mensagens',
    icon: MessageCircle,
  },
  {
    id: 'ads',
    label: 'Anúncios',
    description: 'Criação e gerenciamento de anúncios',
    icon: Megaphone,
  },
]

// Helper to get service badge info for connection list
// Uses hierarchical approach: plataform_name = 'meta' | 'google', metadata.type = service type
function getServiceBadgeInfo(connection: Connection): { label: string; color: string } | null {
  const metadata = connection.metadata as { type?: string } | undefined
  const platformName = connection.plataform_name?.toLowerCase()
  const metadataType = metadata?.type

  // Google connections - determine service type from metadata.type
  if (platformName === 'google') {
    switch (metadataType) {
      case 'adsense':
        return { label: 'AdSense', color: '#34A853' }
      case 'ad_manager':
        return { label: 'Ad Manager', color: '#FBBC04' }
      case 'search_console':
        return { label: 'Search Console', color: '#EA4335' }
      case 'analytics':
        return { label: 'Analytics', color: '#F9AB00' }
      case 'ads':
      default:
        return { label: 'Ads', color: '#4285F4' }
    }
  }

  // Legacy support: flat platform names (will be migrated)
  if (platformName === 'ad_manager') {
    return { label: 'Ad Manager', color: '#FBBC04' }
  }
  if (platformName === 'adsense') {
    return { label: 'AdSense', color: '#34A853' }
  }
  if (platformName === 'search_console') {
    return { label: 'Search Console', color: '#EA4335' }
  }
  if (platformName === 'analytics') {
    return { label: 'Analytics', color: '#F9AB00' }
  }

  // Meta connections - show message/ads type
  if (platformName === 'meta') {
    if (metadataType === 'messages') {
      return { label: 'Mensagens', color: '#0084FF' }
    } if (metadataType === 'ads') {
      return { label: 'Anúncios', color: '#0084FF' }
    }
  }

  return null
}


function formatDate(dateString?: string): string {
  if (!dateString) return 'Nunca'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getConnectionInfo(connection: Connection | null): {
  platform: PlatformConfig | undefined
  subType: ConnectionTypeOption | undefined
  color: string
  iconKey: keyof typeof serviceIcons | null
} {
  if (!connection) {
    return { platform: undefined, subType: undefined, color: '#6366f1', iconKey: null }
  }

  const platformName = connection.plataform_name?.toLowerCase()
  // For display, treat 'google' as the platform (hierarchical approach)
  const normalizedPlatformName = ['adsense', 'ad_manager', 'search_console', 'analytics'].includes(platformName || '')
    ? 'google'
    : platformName
  const platform = platforms.find((p) => p.id === normalizedPlatformName)
  const metadata = connection.metadata as { type?: string } | undefined
  const metadataType = metadata?.type
  const subType = connectionSubTypes.find((t) => t.id === metadataType)

  // Determine icon and color based on metadata.type (hierarchical) or legacy platform_name
  let iconKey: keyof typeof serviceIcons | null = null
  let color = '#6366f1'

  if (platformName === 'google') {
    // Hierarchical: use metadata.type to determine service
    switch (metadataType) {
      case 'adsense':
        iconKey = 'adsense'
        color = '#34A853'
        break
      case 'ad_manager':
        iconKey = 'ad_manager'
        color = '#FBBC04'
        break
      case 'search_console':
        iconKey = 'search_console'
        color = '#EA4335'
        break
      case 'analytics':
        iconKey = 'analytics'
        color = '#F9AB00'
        break
      case 'ads':
      default:
        iconKey = 'ads'
        color = '#4285F4'
        break
    }
  } else if (platformName === 'adsense') {
    // Legacy: flat platform name
    iconKey = 'adsense'
    color = '#34A853'
  } else if (platformName === 'ad_manager') {
    iconKey = 'ad_manager'
    color = '#FBBC04'
  } else if (platformName === 'search_console') {
    iconKey = 'search_console'
    color = '#EA4335'
  } else if (platformName === 'analytics') {
    iconKey = 'analytics'
    color = '#F9AB00'
  } else if (platformName === 'meta') {
    color = '#0084FF'
    iconKey = metadataType === 'messages' ? 'messages' : 'meta_ads'
  }

  return {
    platform,
    subType,
    color,
    iconKey,
  }
}

export function ConnectionsPage() {
  useDocumentTitle('Conexões')
  const location = useLocation()
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Connection | null>(null)
  const [configureConnection, setConfigureConnection] = useState<Connection | null>(null)
  const [logsConnection, setLogsConnection] = useState<Connection | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null)

  // Estados do modal de nova conexão
  const [newConnectionModal, setNewConnectionModal] = useState(false)
  const [connectionName, setConnectionName] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedSubType, setSelectedSubType] = useState<ConnectionSubType | null>(null)
  const [selectedGoogleService, setSelectedGoogleService] = useState<GoogleServiceType | null>(null)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)

  // Google OAuth mutations
  const adSenseOAuthMutation = useAdSenseOAuthInitiate()
  const searchConsoleOAuthMutation = useSearchConsoleOAuthInitiate()
  const analyticsOAuthMutation = useAnalyticsOAuthInitiate()

  const [refreshingConnectionId, setRefreshingConnectionId] = useState<string | null>(null)
  const [reconnectingConnectionId, setReconnectingConnectionId] = useState<string | null>(null)

  // Estados do modal de configuração
  const [editingConnectionName, setEditingConnectionName] = useState('')
  const [isReconnectingFromConfig, setIsReconnectingFromConfig] = useState(false)

  const { data: connections, isLoading, error, refetch } = useConnections({ search })
  const searchConsoleConnections = useMemo(
    () =>
      (connections || []).filter(
        (connection) =>
          connection.plataform_name?.toLowerCase() === 'google' &&
          (connection.metadata as { type?: string } | undefined)?.type === 'search_console'
      ),
    [connections]
  )

  const quotaQueries = useQueries({
    queries: searchConsoleConnections.map((connection) => ({
      queryKey: queryKeys.searchConsole.quota(workspaceId, connection.id),
      queryFn: () =>
        searchConsoleApi.getQuota(connection.id, workspaceId || '').then((res) => res.quota),
      enabled: !!workspaceId,
      staleTime: 1000 * 60 * 10,
    })),
  })

  const quotaByConnection = useMemo(() => {
    const map: Record<string, SearchConsoleQuotaUsage | undefined> = {}
    searchConsoleConnections.forEach((connection, index) => {
      map[connection.id] = quotaQueries[index]?.data
    })
    return map
  }, [quotaQueries, searchConsoleConnections])

  // Handle success message from callback page
  useEffect(() => {
    const state = location.state as { message?: string } | undefined
    if (state?.message) {
      setSuccessMessage(state.message)
      // Clear the state to prevent showing message on refresh
      window.history.replaceState({}, document.title)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      // Refetch connections to show the new one
      refetch()
      return () => clearTimeout(timer)
    }
  }, [location.state, refetch])
  const { data: stats } = useConnectionStats()
  const deleteMutation = useDeleteConnection()
  const refreshTokenMutation = useRefreshConnectionToken()
  const autoRefreshMutation = useAutoRefreshTokens()
  const updateConnectionMutation = useUpdateConnection()

  // Auto-refresh expired tokens when page loads
  useEffect(() => {
    // Only run once when connections are loaded
    if (connections && connections.length > 0 && !autoRefreshMutation.isPending) {
      // Check if any connection has expired or is about to expire
      const hasExpiredTokens = connections.some((conn) => {
        if (!conn.token_expires_at || !conn.is_active) return false
        const expiresAt = new Date(conn.token_expires_at)
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)
        return expiresAt <= fiveMinutesFromNow
      })

      if (hasExpiredTokens) {
        autoRefreshMutation.mutate(undefined, {
          onSuccess: (result) => {
            if (result.refreshed > 0) {
              setSuccessMessage(`${result.refreshed} conexão(ões) atualizada(s) automaticamente`)
              setTimeout(() => setSuccessMessage(null), 5000)
            }
          },
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections?.length]) // Only trigger when connections count changes (initial load)

  // Initialize editing name when config modal opens
  useEffect(() => {
    if (configureConnection) {
      setEditingConnectionName(configureConnection.connection_name || '')
      setIsReconnectingFromConfig(false)
    }
  }, [configureConnection])

  // Meta pages for config modal
  const { data: metaPages, isLoading: isLoadingMetaPages, refetch: refetchMetaPages } = useMetaConnectionPages(
    configureConnection?.plataform_name === 'meta' ? configureConnection.id : null
  )
  const updateMetaPageMutation = useUpdateMetaPageStatus()
  const batchUpdateMetaPagesMutation = useBatchUpdateMetaPagesStatus()
  const refreshMetaPagesMutation = useRefreshMetaPages()
  const [metaMessagesSearch, setMetaMessagesSearch] = useState('')

  // Google Ads accounts for config modal
  const isGoogleAdsConnection =
    configureConnection?.plataform_name?.toLowerCase() === 'google' &&
    (configureConnection?.metadata as { type?: string } | undefined)?.type === 'ads'
  const { data: googleAdsAccounts, isLoading: isLoadingGoogleAdsAccounts } = useGoogleAdsStoredAccounts(
    isGoogleAdsConnection ? configureConnection?.id : undefined
  )
  const syncGoogleAdsAccountsMutation = useSyncGoogleAdsAccounts()
  const updateGoogleAdsAccountMutation = useUpdateGoogleAdsAccountStatus()
  const batchUpdateGoogleAdsAccountsMutation = useBulkUpdateGoogleAdsAccounts()
  const [showInactiveGoogleAdsAccounts, setShowInactiveGoogleAdsAccounts] = useState(false)
  const [googleAdsAccountsSearch, setGoogleAdsAccountsSearch] = useState('')

  // Ad Manager networks for config modal
  const isAdManagerConnection =
    configureConnection?.plataform_name?.toLowerCase() === 'google' &&
    (configureConnection?.metadata as { type?: string } | undefined)?.type === 'ad_manager'
  const { data: adManagerNetworks, isLoading: isLoadingAdManagerNetworks } = useAdManagerStoredNetworks(
    isAdManagerConnection ? configureConnection?.id : undefined
  )
  const syncAdManagerNetworksMutation = useSyncAdManagerNetworks()
  const updateAdManagerNetworkMutation = useUpdateAdManagerNetworkStatus()
  const batchUpdateAdManagerNetworksMutation = useBatchUpdateAdManagerNetworks()
  const [showInactiveAdManagerNetworks, setShowInactiveAdManagerNetworks] = useState(false)
  const [adManagerNetworksSearch, setAdManagerNetworksSearch] = useState('')

  // Meta ad accounts for config modal
  const isMetaAdsConnection =
    configureConnection?.plataform_name?.toLowerCase() === 'meta' &&
    (configureConnection?.metadata as { type?: string } | undefined)?.type === 'ads'
  const { data: metaAdAccounts, isLoading: isLoadingMetaAdAccounts } = useMetaAdStoredAccounts(
    isMetaAdsConnection ? configureConnection?.id : undefined
  )
  const syncMetaAdAccountsMutation = useSyncMetaAdAccounts()
  const updateMetaAdAccountMutation = useUpdateMetaAdAccountStatus()
  const batchUpdateMetaAdAccountsMutation = useBatchUpdateMetaAdAccounts()
  const [showInactiveMetaAdAccounts, setShowInactiveMetaAdAccounts] = useState(false)
  const [metaAdAccountsSearch, setMetaAdAccountsSearch] = useState('')

  // Meta pages for ads config modal
  const { data: metaPagesForAds, isLoading: isLoadingMetaPagesForAds } = useMetaPagesForAds(
    isMetaAdsConnection ? configureConnection?.id : undefined
  )
  const syncMetaPagesForAdsMutation = useSyncMetaPagesForAds()
  const updateMetaPageForAdsMutation = useUpdateMetaPageForAdsStatus()
  const batchUpdateMetaPagesForAdsMutation = useBatchUpdateMetaPagesForAdsStatus()
  const [showInactiveMetaPagesForAds, setShowInactiveMetaPagesForAds] = useState(false)
  const [metaPagesSearch, setMetaPagesSearch] = useState('')

  // Meta pixels for config modal
  const [selectedMetaAdAccountForPixels, setSelectedMetaAdAccountForPixels] = useState<string | null>(null)
  const { data: metaPixels, isLoading: isLoadingMetaPixels } = useMetaPixelsStored(
    isMetaAdsConnection ? configureConnection?.id : undefined,
    selectedMetaAdAccountForPixels || undefined
  )
  const syncMetaPixelsMutation = useSyncMetaPixels()
  const updateMetaPixelMutation = useUpdateMetaPixelStatus()
  const batchUpdateMetaPixelsMutation = useBatchUpdateMetaPixels()
  const [showInactiveMetaPixels, setShowInactiveMetaPixels] = useState(false)
  const [metaPixelsSearch, setMetaPixelsSearch] = useState('')

  // Meta Instagram accounts for config modal
  const { data: metaInstagramAccounts, isLoading: isLoadingMetaInstagram } = useMetaInstagramAccountsForConnection(
    isMetaAdsConnection ? configureConnection?.id : undefined,
    metaPagesForAds
  )
  const [instagramAccountsSearch, setInstagramAccountsSearch] = useState('')

  // Unified sync for all Meta resources
  const syncAllMetaResourcesMutation = useSyncAllMetaResources()

  // Analytics properties for config modal
  const isAnalyticsConnection =
    configureConnection?.plataform_name?.toLowerCase() === 'google' &&
    (configureConnection?.metadata as { type?: string } | undefined)?.type === 'analytics'
  const { data: analyticsProperties, isLoading: isLoadingAnalyticsProperties } = useAnalyticsStoredProperties(
    isAnalyticsConnection ? configureConnection?.id : undefined
  )
  const syncAnalyticsPropertiesMutation = useSyncAnalyticsProperties()
  const updateAnalyticsPropertyMutation = useUpdateAnalyticsPropertyStatus()
  const batchUpdateAnalyticsPropertiesMutation = useBulkUpdateAnalyticsProperties()
  const [showInactiveAnalyticsProperties, setShowInactiveAnalyticsProperties] = useState(false)
  const [analyticsPropertiesSearch, setAnalyticsPropertiesSearch] = useState('')

  // Search Console properties for config modal
  const isSearchConsoleConnection =
    configureConnection?.plataform_name?.toLowerCase() === 'google' &&
    (configureConnection?.metadata as { type?: string } | undefined)?.type === 'search_console'
  const { data: searchConsoleProperties, isLoading: isLoadingSearchConsoleProperties } = useSearchConsoleStoredProperties(
    isSearchConsoleConnection ? configureConnection?.id : undefined
  )
  const syncSearchConsolePropertiesMutation = useSyncSearchConsoleProperties()
  const batchUpdateSearchConsolePropertiesMutation = useBulkUpdateSearchConsoleProperties()
  const updateSearchConsolePropertyMutation = useUpdateSearchConsolePropertyStatus()
  const [showInactiveSearchConsoleProperties, setShowInactiveSearchConsoleProperties] = useState(false)
  const [searchConsolePropertiesSearch, setSearchConsolePropertiesSearch] = useState('')

  // Reset selected ad account for pixels when connection changes
  useEffect(() => {
    setSelectedMetaAdAccountForPixels(null)
  }, [configureConnection?.id])

  // Auto-select first active ad account for pixels when ad accounts load
  useEffect(() => {
    if (isMetaAdsConnection && metaAdAccounts && metaAdAccounts.length > 0 && !selectedMetaAdAccountForPixels) {
      const firstActiveAccount = metaAdAccounts.find(a => a.is_active)
      if (firstActiveAccount) {
        setSelectedMetaAdAccountForPixels(firstActiveAccount.account_id)
      }
    }
  }, [isMetaAdsConnection, metaAdAccounts, selectedMetaAdAccountForPixels])

  const needsReconnect = (connection: Connection): boolean => {
    const status = getConnectionStatus(connection)
    return status.status !== 'connected'
  }

  const getStatusBadge = (connection: Connection) => {
    const statusInfo = getConnectionStatus(connection)

    const variantStyles: Record<string, string> = {
      success: styles.badgeSuccess,
      danger: styles.badgeDanger,
      warning: styles.badgeWarning,
    }

    const icons: Record<string, JSX.Element> = {
      connected: <CheckCircle size={14} />,
      disconnected: <XCircle size={14} />,
      expired: <AlertCircle size={14} />,
      needs_reconnect: <AlertCircle size={14} />,
    }

    return (
      <span
        className={`${styles.badge} ${variantStyles[statusInfo.variant]}`}
        title={statusInfo.errorMessage}
      >
        {icons[statusInfo.status]} {statusInfo.label}
      </span>
    )
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      console.error('Error deleting connection:', error)
    }
  }

  const handleRefreshToken = async (connection: Connection) => {
    const platformName = connection.plataform_name?.toLowerCase()
    const metadata = connection.metadata as { type?: string } | undefined
    const metadataType = metadata?.type

    // Determine the platform for the refresh token API
    // Hierarchical approach: use metadata.type for Google services
    let platform: 'meta' | 'google' | 'adsense' | 'ad_manager' | 'search_console' | 'analytics'

    if (platformName === 'meta') {
      platform = 'meta'
    } else if (platformName === 'google') {
      // Hierarchical: determine service from metadata.type
      switch (metadataType) {
        case 'adsense':
          platform = 'adsense'
          break
        case 'ad_manager':
          platform = 'ad_manager'
          break
        case 'search_console':
          platform = 'search_console'
          break
        case 'analytics':
          platform = 'analytics'
          break
        default:
          platform = 'google' // Google Ads
      }
    } else if (['adsense', 'ad_manager', 'search_console', 'analytics'].includes(platformName || '')) {
      // Legacy: flat platform name
      platform = platformName as 'adsense' | 'ad_manager' | 'search_console' | 'analytics'
    } else {
      return
    }

    setRefreshingConnectionId(connection.id)
    try {
      const result = await refreshTokenMutation.mutateAsync({
        connectionId: connection.id,
        platform,
      })

      if (result.success) {
        setSuccessMessage('Token atualizado com sucesso!')
        setTimeout(() => setSuccessMessage(null), 3000)
      } else if (result.requiresReconnect) {
        setSuccessMessage(null)
        toast.warning('Token expirado. Por favor, reconecte sua conta.')
      } else {
        toast.error(result.error || 'Erro ao atualizar token')
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      toast.error('Erro ao atualizar token. Tente novamente.')
    } finally {
      setRefreshingConnectionId(null)
    }
  }

  const handleToggleMetaPage = async (pageId: string, currentlyActive: boolean) => {
    if (!configureConnection) return

    try {
      await updateMetaPageMutation.mutateAsync({
        connectionId: configureConnection.id,
        pageId,
        isActive: !currentlyActive,
      })
    } catch (error) {
      console.error('Error toggling page status:', error)
    }
  }

  const handleRefreshMetaPages = async () => {
    if (!configureConnection) return

    try {
      await refreshMetaPagesMutation.mutateAsync(configureConnection.id)
      refetchMetaPages()
      setSuccessMessage('Páginas atualizadas com sucesso!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Error refreshing pages:', error)
      toast.error('Erro ao atualizar páginas. Verifique se a conexão ainda está válida.')
    }
  }

  const handleSaveConnectionName = async () => {
    if (!configureConnection || !editingConnectionName.trim()) return

    try {
      await updateConnectionMutation.mutateAsync({
        id: configureConnection.id,
        connection_name: editingConnectionName.trim(),
      })
      setSuccessMessage('Nome da conexão atualizado com sucesso!')
      setTimeout(() => setSuccessMessage(null), 3000)
      setConfigureConnection(null)
    } catch (error) {
      console.error('Error updating connection name:', error)
      toast.error('Erro ao atualizar nome da conexão. Tente novamente.')
    }
  }

  const handleReconnectFromConfig = async () => {
    if (!configureConnection) return
    setIsReconnectingFromConfig(true)
    await handleReconnect(configureConnection)
  }

  // Check if name has changed
  const hasNameChanged = configureConnection
    ? editingConnectionName.trim() !== (configureConnection.connection_name || '')
    : false

  const getActionErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error) {
      const message = (error as { message?: unknown }).message
      if (typeof message === 'string') return message
    }
    return fallback
  }

  const handleUpdateAdManagerNetwork = (networkId: string, isActive: boolean) => {
    if (!configureConnection) return
    setActionErrorMessage(null)
    updateAdManagerNetworkMutation.mutate(
      {
        connectionId: configureConnection.id,
        networkId,
        isActive,
      },
      {
        onError: (err) => {
          setActionErrorMessage(
            getActionErrorMessage(err, 'Erro ao atualizar rede do Ad Manager. Tente novamente.'),
          )
        },
      },
    )
  }

  const handleCloseConfigModal = async () => {
    if (!hasNameChanged) {
      setConfigureConnection(null)
      setActionErrorMessage(null)
      return
    }

    const confirmed = await confirm({
      title: 'Descartar alterações',
      message: 'Você tem alterações não salvas. Deseja descartar?',
      confirmText: 'Descartar',
      cancelText: 'Continuar editando',
      variant: 'danger',
    })

    if (!confirmed) return

    setConfigureConnection(null)
    setActionErrorMessage(null)
  }

  const handleReconnect = async (connection: Connection) => {
    const platformName = connection.plataform_name?.toLowerCase()
    const metadata = connection.metadata as { type?: string } | undefined
    const metadataType = metadata?.type || 'ads'

    setReconnectingConnectionId(connection.id)

    try {
      if (platformName === 'meta') {
        // Pass redirectUri based on current origin to ensure consistency
        const response = await api.post<InitiateOAuthResponse>('/meta/oauth/initiate', {
          connectionName: connection.connection_name,
          connectionType: metadataType,
          workspaceId,
          reconnectConnectionId: connection.id,
          redirectUri: `${window.location.origin}/callback/meta`,
        })

        if (response.success && response.authorizationUrl) {
          window.location.href = response.authorizationUrl
        } else {
          throw new Error('Falha ao iniciar reconexão')
        }
      } else if (platformName === 'google') {
        // Hierarchical: determine service from metadata.type
        switch (metadataType) {
          case 'adsense':
            adSenseOAuthMutation.mutate({
              connectionName: connection.connection_name || 'AdSense',
              workspaceId: workspaceId || undefined,
              reconnectConnectionId: connection.id,
            }, {
              onError: (err) => {
                console.error('AdSense reconnect error:', err)
                toast.error(err instanceof Error ? err.message : 'Erro ao reconectar AdSense. Tente novamente.')
                setReconnectingConnectionId(null)
              }
            })
            break
          case 'ad_manager': {
            const response = await api.post<InitiateOAuthResponse>('/ad-manager/oauth/initiate', {
              connectionName: connection.connection_name,
              workspaceId,
              reconnectConnectionId: connection.id,
            })
            if (response.success && response.authorizationUrl) {
              window.location.href = response.authorizationUrl
            } else {
              throw new Error('Falha ao iniciar reconexão')
            }
            break
          }
          case 'search_console':
            searchConsoleOAuthMutation.mutate({
              connectionName: connection.connection_name || 'Search Console',
              workspaceId: workspaceId || undefined,
              reconnectConnectionId: connection.id,
            }, {
              onError: (err) => {
                console.error('Search Console reconnect error:', err)
                toast.error(err instanceof Error ? err.message : 'Erro ao reconectar Search Console. Tente novamente.')
                setReconnectingConnectionId(null)
              }
            })
            break
          case 'analytics':
            analyticsOAuthMutation.mutate({
              connectionName: connection.connection_name || 'Analytics',
              workspaceId: workspaceId || undefined,
              reconnectConnectionId: connection.id,
            }, {
              onError: (err) => {
                console.error('Analytics reconnect error:', err)
                toast.error(err instanceof Error ? err.message : 'Erro ao reconectar Analytics. Tente novamente.')
                setReconnectingConnectionId(null)
              }
            })
            break
          default: {
            // Google Ads
            const response = await api.post<InitiateOAuthResponse>('/google/oauth/initiate', {
              connectionName: connection.connection_name,
              connectionType: 'ads',
              workspaceId,
              reconnectConnectionId: connection.id,
            })
            if (response.success && response.authorizationUrl) {
              window.location.href = response.authorizationUrl
            } else {
              throw new Error('Falha ao iniciar reconexão')
            }
          }
        }
      } else if (platformName === 'adsense') {
        // Legacy: flat platform name
        adSenseOAuthMutation.mutate({
          connectionName: connection.connection_name || 'AdSense',
          workspaceId: workspaceId || undefined,
          reconnectConnectionId: connection.id,
        }, {
          onError: (err) => {
            console.error('AdSense reconnect error:', err)
            toast.error(err instanceof Error ? err.message : 'Erro ao reconectar AdSense. Tente novamente.')
            setReconnectingConnectionId(null)
          }
        })
      } else if (platformName === 'ad_manager') {
        const response = await api.post<InitiateOAuthResponse>('/ad-manager/oauth/initiate', {
          connectionName: connection.connection_name,
          workspaceId,
          reconnectConnectionId: connection.id,
        })
        if (response.success && response.authorizationUrl) {
          window.location.href = response.authorizationUrl
        } else {
          throw new Error('Falha ao iniciar reconexão')
        }
      } else if (platformName === 'search_console') {
        searchConsoleOAuthMutation.mutate({
          connectionName: connection.connection_name || 'Search Console',
          workspaceId: workspaceId || undefined,
          reconnectConnectionId: connection.id,
        }, {
          onError: (err) => {
            console.error('Search Console reconnect error:', err)
            toast.error(err instanceof Error ? err.message : 'Erro ao reconectar Search Console. Tente novamente.')
            setReconnectingConnectionId(null)
          }
        })
      } else if (platformName === 'analytics') {
        analyticsOAuthMutation.mutate({
          connectionName: connection.connection_name || 'Analytics',
          workspaceId: workspaceId || undefined,
          reconnectConnectionId: connection.id,
        }, {
          onError: (err) => {
            console.error('Analytics reconnect error:', err)
            toast.error(err instanceof Error ? err.message : 'Erro ao reconectar Analytics. Tente novamente.')
            setReconnectingConnectionId(null)
          }
        })
      } else {
        throw new Error('Plataforma não suportada')
      }
    } catch (err) {
      console.error('Reconnect error:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao reconectar. Tente novamente.')
      setReconnectingConnectionId(null)
    }
  }

  const openNewConnectionModal = () => {
    setNewConnectionModal(true)
    setConnectionName('')
    setSelectedPlatform(null)
    setSelectedSubType(null)
    setSelectedGoogleService(null)
    setStep(1)
    setConnectError(null)
  }

  const closeNewConnectionModal = () => {
    setNewConnectionModal(false)
    setConnectionName('')
    setSelectedPlatform(null)
    setSelectedSubType(null)
    setSelectedGoogleService(null)
    setStep(1)
    setConnectError(null)
  }

  const handleNextStep = () => {
    if (step === 1 && connectionName.trim()) {
      setStep(2)
    } else if (step === 2 && selectedPlatform) {
      if (selectedPlatform === 'google') {
        // Google: go to service selection step (3)
        setStep(3)
      } else {
        // Meta: go to subtype selection step (4)
        setStep(4)
      }
    } else if (step === 3 && selectedGoogleService) {
      // Google service selected - initiate connection
      handleConnectGoogleService()
    }
  }

  const handleConnectGoogleService = async () => {
    if (!connectionName.trim() || !selectedGoogleService) return

    setIsConnecting(true)
    setConnectError(null)

    try {
      if (selectedGoogleService === 'ads') {
        const response = await api.post<InitiateOAuthResponse>('/google/oauth/initiate', {
          connectionName: connectionName.trim(),
          connectionType: 'ads',
          workspaceId,
        })
        if (response.success && response.authorizationUrl) {
          window.location.href = response.authorizationUrl
        } else {
          throw new Error('Falha ao iniciar autenticação')
        }
      } else if (selectedGoogleService === 'adsense') {
        adSenseOAuthMutation.mutate({
          connectionName: connectionName.trim(),
          workspaceId: workspaceId || undefined,
        }, {
          onError: (err) => {
            setConnectError(
              err instanceof Error
                ? err.message
                : 'Erro ao iniciar conexão com AdSense. Tente novamente.'
            )
            setIsConnecting(false)
          }
        })
      } else if (selectedGoogleService === 'ad_manager') {
        const response = await api.post<InitiateOAuthResponse>('/ad-manager/oauth/initiate', {
          connectionName: connectionName.trim(),
          workspaceId,
        })
        if (response.success && response.authorizationUrl) {
          window.location.href = response.authorizationUrl
        } else {
          throw new Error('Falha ao iniciar autenticação')
        }
      } else if (selectedGoogleService === 'search_console') {
        searchConsoleOAuthMutation.mutate({
          connectionName: connectionName.trim(),
          workspaceId: workspaceId || undefined,
        }, {
          onError: (err) => {
            setConnectError(
              err instanceof Error
                ? err.message
                : 'Erro ao iniciar conexão com Search Console. Tente novamente.'
            )
            setIsConnecting(false)
          }
        })
      } else if (selectedGoogleService === 'analytics') {
        analyticsOAuthMutation.mutate({
          connectionName: connectionName.trim(),
          workspaceId: workspaceId || undefined,
        }, {
          onError: (err) => {
            setConnectError(
              err instanceof Error
                ? err.message
                : 'Erro ao iniciar conexão com Analytics. Tente novamente.'
            )
            setIsConnecting(false)
          }
        })
      }
    } catch (err) {
      console.error('OAuth initiation error:', err)
      setConnectError(
        err instanceof Error
          ? err.message
          : 'Erro ao iniciar conexão. Tente novamente.'
      )
      setIsConnecting(false)
    }
  }

  const handleBackStep = () => {
    if (step === 2) {
      setStep(1)
    } else if (step === 3) {
      // Back from Google service selection to platform selection
      setSelectedGoogleService(null)
      setStep(2)
    } else if (step === 4) {
      // Back from Meta subtype selection to platform selection
      setSelectedSubType(null)
      setStep(2)
    }
  }

  const handleConnect = async () => {
    if (!selectedPlatform || !selectedSubType || !connectionName.trim()) return

    setIsConnecting(true)
    setConnectError(null)

    try {
      if (selectedPlatform === 'meta') {
        // Call backend to initiate Meta OAuth flow
        // Pass redirectUri based on current origin to ensure consistency
        const response = await api.post<InitiateOAuthResponse>('/meta/oauth/initiate', {
          connectionName: connectionName.trim(),
          connectionType: selectedSubType,
          workspaceId,
          redirectUri: `${window.location.origin}/callback/meta`,
        })

        if (response.success && response.authorizationUrl) {
          // Redirect to Facebook OAuth
          window.location.href = response.authorizationUrl
        } else {
          throw new Error('Falha ao iniciar autenticação')
        }
      } else if (selectedPlatform === 'google') {
        // Call backend to initiate Google OAuth flow
        const response = await api.post<InitiateOAuthResponse>('/google/oauth/initiate', {
          connectionName: connectionName.trim(),
          connectionType: selectedSubType,
          workspaceId,
        })

        if (response.success && response.authorizationUrl) {
          // Redirect to Google OAuth
          window.location.href = response.authorizationUrl
        } else {
          throw new Error('Falha ao iniciar autenticação')
        }
      }
    } catch (err) {
      console.error('OAuth initiation error:', err)
      setConnectError(
        err instanceof Error
          ? err.message
          : 'Erro ao iniciar conexão. Tente novamente.'
      )
    } finally {
      setIsConnecting(false)
    }
  }


  const getConfigureModalContent = () => {
    if (!configureConnection) return null

    const { subType, platform } = getConnectionInfo(configureConnection)
    const platformName = configureConnection.plataform_name?.toLowerCase()
    const isMeta = platform?.id === 'meta' || platformName === 'meta'
    const isMessages = subType?.id === 'messages'
    const serviceBadge = getServiceBadgeInfo(configureConnection)
    const metadata = configureConnection.metadata as {
      type?: string
      user_email?: string
      user_name?: string
      // Search Console
      sites?: Array<{ siteUrl: string; permissionLevel: string }>
      // AdSense
      accounts?: Array<{ name: string; displayName: string; reportingDimensionId?: string }>
      // Analytics
      properties?: Array<{ name: string; displayName: string; propertyType?: string }>
      // Ad Manager
      networks?: Array<{ networkCode: string; displayName: string }>
    } | undefined
    const isSearchConsole = serviceBadge?.label === 'Search Console'
    const isAdSense = serviceBadge?.label === 'AdSense'
    const isAnalytics = serviceBadge?.label === 'Analytics'
    const isAdManager = serviceBadge?.label === 'Ad Manager'

    return (
      <div className={styles.configContent}>
        {/* Nome da conexão - editável */}
        <div className={styles.configSection}>
          <span className={styles.configLabel}>Nome da conexão</span>
          <Input
            value={editingConnectionName}
            onChange={(e) => setEditingConnectionName(e.target.value)}
            placeholder="Nome da conexão"
          />
        </div>

        {/* Status e informações */}
        <div className={styles.configSection}>
          <span className={styles.configLabel}>Informações</span>
          <div className={styles.googleInfoBox}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Status:</span>
              <span className={styles.infoValue}>
                {(() => {
                  const statusInfo = getConnectionStatus(configureConnection)
                  return (
                    <span style={{ color: statusInfo.color }} title={statusInfo.errorMessage}>
                      ● {statusInfo.label}
                    </span>
                  )
                })()}
              </span>
            </div>
            {serviceBadge && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Serviço:</span>
                <span
                  className={styles.serviceBadge}
                  style={{ backgroundColor: `${serviceBadge.color}15`, color: serviceBadge.color }}
                >
                  {serviceBadge.label}
                </span>
              </div>
            )}
            {/* Account email for Google/Meta services */}
            {metadata?.user_email && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Conta:</span>
                <span className={styles.infoValue}>{metadata.user_email}</span>
              </div>
            )}
            {/* Platform user ID */}
            {configureConnection.platform_user_id && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>ID:</span>
                <span className={styles.infoValue}>{configureConnection.platform_user_id}</span>
              </div>
            )}
            {configureConnection.token_expires_at && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Token expira em:</span>
                <span className={styles.infoValue}>
                  {formatDate(configureConnection.token_expires_at)}
                </span>
              </div>
            )}
            {configureConnection.last_used_at && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Último uso:</span>
                <span className={styles.infoValue}>
                  {formatDate(configureConnection.last_used_at)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search Console: Properties with enable/disable */}
        {isSearchConsole && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Propriedades monitoradas</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => configureConnection && syncSearchConsolePropertiesMutation.mutate(configureConnection.id)}
                disabled={syncSearchConsolePropertiesMutation.isPending || isLoadingSearchConsoleProperties}
                leftIcon={<RefreshCw size={14} className={syncSearchConsolePropertiesMutation.isPending ? styles.spinning : ''} />}
              >
                {syncSearchConsolePropertiesMutation.isPending ? 'Sincronizando...' : 'Sincronizar propriedades'}
              </Button>
            </div>
            <p className={styles.configHint}>
              Habilite as propriedades que deseja monitorar. Apenas propriedades ativas serão exibidas nos relatórios.
            </p>
            {(isLoadingSearchConsoleProperties || syncSearchConsolePropertiesMutation.isPending) ? (
              <div className={styles.loadingPages}>
                <Spinner size="md" />
                <span>{syncSearchConsolePropertiesMutation.isPending ? 'Buscando propriedades...' : 'Carregando propriedades...'}</span>
              </div>
            ) : searchConsoleProperties && searchConsoleProperties.length > 0 ? (
              <>
                {(() => {
                  const filteredProperties = searchConsolePropertiesSearch
                    ? searchConsoleProperties.filter(p =>
                        p.site_url.toLowerCase().includes(searchConsolePropertiesSearch.toLowerCase())
                      )
                    : searchConsoleProperties
                  const activeProperties = filteredProperties.filter(p => p.is_active)
                  const inactiveProperties = filteredProperties.filter(p => !p.is_active)
                  const allFilteredUrls = filteredProperties.map(p => p.site_url)
                  const allActive = filteredProperties.length > 0 && filteredProperties.every(p => p.is_active)
                  const allInactive = filteredProperties.length > 0 && filteredProperties.every(p => !p.is_active)

                  return (
                    <>
                      {/* Search and Select All Toolbar */}
                      <div className={styles.configToolbar}>
                        <div className={styles.configSearchWrapper}>
                          <Search size={16} className={styles.configSearchIcon} />
                          <input
                            type="text"
                            placeholder="Buscar propriedades..."
                            value={searchConsolePropertiesSearch}
                            onChange={(e) => setSearchConsolePropertiesSearch(e.target.value)}
                            className={styles.configSearchInput}
                          />
                        </div>
                        <div className={styles.selectAllButtons}>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.selectAll}`}
                            onClick={() => configureConnection && allFilteredUrls.length > 0 && batchUpdateSearchConsolePropertiesMutation.mutate({
                              connectionId: configureConnection.id,
                              siteUrls: allFilteredUrls,
                              isActive: true,
                            })}
                            disabled={batchUpdateSearchConsolePropertiesMutation.isPending || allActive || allFilteredUrls.length === 0}
                          >
                            <CheckSquare size={14} />
                            Selecionar todos
                          </button>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.deselectAll}`}
                            onClick={() => configureConnection && allFilteredUrls.length > 0 && batchUpdateSearchConsolePropertiesMutation.mutate({
                              connectionId: configureConnection.id,
                              siteUrls: allFilteredUrls,
                              isActive: false,
                            })}
                            disabled={batchUpdateSearchConsolePropertiesMutation.isPending || allInactive || allFilteredUrls.length === 0}
                          >
                            <Square size={14} />
                            Desmarcar todos
                          </button>
                        </div>
                        {searchConsolePropertiesSearch && (
                          <span className={styles.itemCount}>
                            {filteredProperties.length} de {searchConsoleProperties.length}
                          </span>
                        )}
                      </div>

                      {filteredProperties.length === 0 && searchConsolePropertiesSearch && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma propriedade encontrada para "{searchConsolePropertiesSearch}"</p>
                        </div>
                      )}

                      {activeProperties.length > 0 && (
                        <div className={styles.pagesList}>
                          {activeProperties.map((property) => (
                            <div key={property.site_url} className={styles.googleAdsAccountItem}>
                              <label
                                className={styles.googleAdsAccountLabel}
                                aria-label={property.site_url}
                              >
                                <input
                                  type="checkbox"
                                  checked={property.is_active}
                                  onChange={() => configureConnection && updateSearchConsolePropertyMutation.mutate({
                                    connectionId: configureConnection.id,
                                    siteUrl: property.site_url,
                                    isActive: !property.is_active,
                                  })}
                                  disabled={updateSearchConsolePropertyMutation.isPending || batchUpdateSearchConsolePropertiesMutation.isPending}
                                  className={styles.googleAdsAccountCheckbox}
                                />
                                <span className={styles.googleAdsAccountInfo}>
                                  <span className={styles.googleAdsAccountName}>
                                    <img src={serviceIcons.search_console} alt="" width={16} height={16} />
                                    {property.site_url}
                                    {property.property_type === 'DOMAIN' && (
                                      <span className={styles.mccBadge}>Domínio</span>
                                    )}
                                  </span>
                                  <span className={styles.googleAdsAccountId}>
                                    {property.ownership}
                                  </span>
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inactive properties - collapsible */}
                      {inactiveProperties.length > 0 && (
                        <div className={styles.inactiveAccountsSection}>
                          <button
                            type="button"
                            className={styles.collapseToggle}
                            onClick={() => setShowInactiveSearchConsoleProperties(!showInactiveSearchConsoleProperties)}
                          >
                            <ChevronRight
                              size={16}
                              style={{
                                transform: showInactiveSearchConsoleProperties ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            />
                            <span>
                              {inactiveProperties.length} propriedade{inactiveProperties.length > 1 ? 's' : ''} inativa{inactiveProperties.length > 1 ? 's' : ''}
                            </span>
                          </button>
                          {showInactiveSearchConsoleProperties && (
                            <div className={styles.pagesList} style={{ marginTop: '8px' }}>
                              {inactiveProperties.map((property) => (
                                <div key={property.site_url} className={`${styles.googleAdsAccountItem} ${styles.inactive}`}>
                                  <label
                                    className={styles.googleAdsAccountLabel}
                                    aria-label={property.site_url}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={property.is_active}
                                      onChange={() => configureConnection && updateSearchConsolePropertyMutation.mutate({
                                        connectionId: configureConnection.id,
                                        siteUrl: property.site_url,
                                        isActive: !property.is_active,
                                      })}
                                      disabled={updateSearchConsolePropertyMutation.isPending || batchUpdateSearchConsolePropertiesMutation.isPending}
                                      className={styles.googleAdsAccountCheckbox}
                                    />
                                    <span className={styles.googleAdsAccountInfo}>
                                      <span className={styles.googleAdsAccountName}>
                                        <img src={serviceIcons.search_console} alt="" width={16} height={16} style={{ opacity: 0.5 }} />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>
                                          {property.site_url}
                                        </span>
                                        {property.property_type === 'DOMAIN' && (
                                          <span className={`${styles.mccBadge} ${styles.inactive}`}>Domínio</span>
                                        )}
                                      </span>
                                      <span className={styles.googleAdsAccountId}>
                                        {property.ownership}
                                      </span>
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeProperties.length === 0 && inactiveProperties.length > 0 && !showInactiveSearchConsoleProperties && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma propriedade ativa.</p>
                          <p>Expanda a lista acima para habilitar propriedades.</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className={styles.emptyPages}>
                <p>Nenhuma propriedade encontrada.</p>
                <p>Clique em "Sincronizar propriedades" para buscar.</p>
              </div>
            )}
          </div>
        )}

        {/* AdSense: Publisher accounts */}
        {isAdSense && metadata?.accounts && metadata.accounts.length > 0 && (
          <div className={styles.configSection}>
            <span className={styles.configLabel}>Contas de publisher</span>
            <div className={styles.propertiesList}>
              {metadata.accounts.map((account) => {
                // Extract ID from name (format: accounts/pub-1234567890123456)
                const accountId = account.name?.split('/').pop() || account.reportingDimensionId
                const accountState = (account as { state?: string }).state
                const stateBadge = (() => {
                  switch (accountState) {
                    case 'READY':
                      return { label: 'Pronta', className: styles.badgeReady }
                    case 'NEEDS_ATTENTION':
                      return { label: 'Requer Atenção', className: styles.badgeNeedsAttention, link: true }
                    case 'CLOSED':
                      return { label: 'Encerrada', className: styles.badgeClosed }
                    default:
                      return { label: 'Desconhecido', className: styles.badgeUnknown }
                  }
                })()
                return (
                  <div key={account.name} className={styles.propertyItem}>
                    <img src={serviceIcons.adsense} alt="" width={16} height={16} className={styles.propertyIcon} />
                    <span className={styles.propertyUrl}>{account.displayName || account.name}</span>
                    {accountId && (
                      <span className={styles.propertyPermission}>{accountId}</span>
                    )}
                    {stateBadge.link ? (
                      <a
                        href="https://www.google.com/adsense"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Clique para resolver no Google AdSense"
                        className={`${styles.accountStateBadge} ${stateBadge.className}`}
                      >
                        {stateBadge.label}
                      </a>
                    ) : (
                      <span className={`${styles.accountStateBadge} ${stateBadge.className}`}>
                        {stateBadge.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Analytics: Properties with enable/disable */}
        {isAnalytics && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Propriedades monitoradas</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => configureConnection && syncAnalyticsPropertiesMutation.mutate(configureConnection.id)}
                disabled={syncAnalyticsPropertiesMutation.isPending || isLoadingAnalyticsProperties}
                leftIcon={<RefreshCw size={14} className={syncAnalyticsPropertiesMutation.isPending ? styles.spinning : ''} />}
              >
                {syncAnalyticsPropertiesMutation.isPending ? 'Sincronizando...' : 'Sincronizar propriedades'}
              </Button>
            </div>
            <p className={styles.configHint}>
              Habilite as propriedades que deseja monitorar. Apenas propriedades ativas serão exibidas nos relatórios.
            </p>
            {(isLoadingAnalyticsProperties || syncAnalyticsPropertiesMutation.isPending) ? (
              <div className={styles.loadingPages}>
                <Spinner size="md" />
                <span>{syncAnalyticsPropertiesMutation.isPending ? 'Buscando propriedades...' : 'Carregando propriedades...'}</span>
              </div>
            ) : analyticsProperties && analyticsProperties.length > 0 ? (
              <>
                {(() => {
                  const filteredProperties = analyticsPropertiesSearch
                    ? analyticsProperties.filter(p =>
                        (p.display_name && p.display_name.toLowerCase().includes(analyticsPropertiesSearch.toLowerCase())) ||
                        p.property_id.toLowerCase().includes(analyticsPropertiesSearch.toLowerCase())
                      )
                    : analyticsProperties
                  const activeProperties = filteredProperties.filter(p => p.is_active)
                  const inactiveProperties = filteredProperties.filter(p => !p.is_active)
                  const allFilteredIds = filteredProperties.map(p => p.property_id)
                  const allActive = filteredProperties.length > 0 && filteredProperties.every(p => p.is_active)
                  const allInactive = filteredProperties.length > 0 && filteredProperties.every(p => !p.is_active)

                  return (
                    <>
                      {/* Search and Select All Toolbar */}
                      <div className={styles.configToolbar}>
                        <div className={styles.configSearchWrapper}>
                          <Search size={16} className={styles.configSearchIcon} />
                          <input
                            type="text"
                            placeholder="Buscar propriedades..."
                            value={analyticsPropertiesSearch}
                            onChange={(e) => setAnalyticsPropertiesSearch(e.target.value)}
                            className={styles.configSearchInput}
                          />
                        </div>
                        <div className={styles.selectAllButtons}>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.selectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateAnalyticsPropertiesMutation.mutate({
                              connectionId: configureConnection.id,
                              propertyIds: allFilteredIds,
                              isActive: true,
                            })}
                            disabled={batchUpdateAnalyticsPropertiesMutation.isPending || allActive || allFilteredIds.length === 0}
                          >
                            <CheckSquare size={14} />
                            Selecionar todos
                          </button>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.deselectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateAnalyticsPropertiesMutation.mutate({
                              connectionId: configureConnection.id,
                              propertyIds: allFilteredIds,
                              isActive: false,
                            })}
                            disabled={batchUpdateAnalyticsPropertiesMutation.isPending || allInactive || allFilteredIds.length === 0}
                          >
                            <Square size={14} />
                            Desmarcar todos
                          </button>
                        </div>
                        {analyticsPropertiesSearch && (
                          <span className={styles.itemCount}>
                            {filteredProperties.length} de {analyticsProperties.length}
                          </span>
                        )}
                      </div>

                      {filteredProperties.length === 0 && analyticsPropertiesSearch && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma propriedade encontrada para "{analyticsPropertiesSearch}"</p>
                        </div>
                      )}

                      {activeProperties.length > 0 && (
                        <div className={styles.pagesList}>
                          {activeProperties.map((property) => {
                            const propertyId = property.property_id?.split('/').pop()
                            return (
                              <div key={property.property_id} className={styles.googleAdsAccountItem}>
                                <label
                                  className={styles.googleAdsAccountLabel}
                                  aria-label={property.display_name}
                                >
                                  <input
                                    type="checkbox"
                                    checked={property.is_active}
                                    onChange={() => configureConnection && updateAnalyticsPropertyMutation.mutate({
                                      connectionId: configureConnection.id,
                                      propertyId: property.property_id,
                                      isActive: !property.is_active,
                                    })}
                                    disabled={updateAnalyticsPropertyMutation.isPending || batchUpdateAnalyticsPropertiesMutation.isPending}
                                    className={styles.googleAdsAccountCheckbox}
                                  />
                                  <span className={styles.googleAdsAccountInfo}>
                                    <span className={styles.googleAdsAccountName}>
                                      <img src={serviceIcons.analytics} alt="" width={16} height={16} />
                                      {property.display_name || property.property_id}
                                    </span>
                                    <span className={styles.googleAdsAccountId}>
                                      ID: {propertyId}{property.account_name ? ` • ${property.account_name}` : ''}
                                    </span>
                                  </span>
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Inactive properties - collapsible */}
                      {inactiveProperties.length > 0 && (
                        <div className={styles.inactiveAccountsSection}>
                          <button
                            type="button"
                            className={styles.collapseToggle}
                            onClick={() => setShowInactiveAnalyticsProperties(!showInactiveAnalyticsProperties)}
                          >
                            <ChevronRight
                              size={16}
                              style={{
                                transform: showInactiveAnalyticsProperties ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            />
                            <span>
                              {inactiveProperties.length} propriedade{inactiveProperties.length > 1 ? 's' : ''} inativa{inactiveProperties.length > 1 ? 's' : ''}
                            </span>
                          </button>
                          {showInactiveAnalyticsProperties && (
                            <div className={styles.pagesList} style={{ marginTop: '8px' }}>
                              {inactiveProperties.map((property) => {
                                const propertyId = property.property_id?.split('/').pop()
                                return (
                                  <div key={property.property_id} className={`${styles.googleAdsAccountItem} ${styles.inactive}`}>
                                    <label
                                      className={styles.googleAdsAccountLabel}
                                      aria-label={property.display_name}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={property.is_active}
                                        onChange={() => configureConnection && updateAnalyticsPropertyMutation.mutate({
                                          connectionId: configureConnection.id,
                                          propertyId: property.property_id,
                                          isActive: !property.is_active,
                                        })}
                                        disabled={updateAnalyticsPropertyMutation.isPending || batchUpdateAnalyticsPropertiesMutation.isPending}
                                        className={styles.googleAdsAccountCheckbox}
                                      />
                                      <span className={styles.googleAdsAccountInfo}>
                                        <span className={styles.googleAdsAccountName}>
                                          <img src={serviceIcons.analytics} alt="" width={16} height={16} style={{ opacity: 0.5 }} />
                                          <span style={{ color: 'var(--color-text-secondary)' }}>
                                            {property.display_name || property.property_id}
                                          </span>
                                        </span>
                                        <span className={styles.googleAdsAccountId}>
                                          ID: {propertyId}{property.account_name ? ` • ${property.account_name}` : ''}
                                        </span>
                                      </span>
                                    </label>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {activeProperties.length === 0 && inactiveProperties.length > 0 && !showInactiveAnalyticsProperties && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma propriedade ativa.</p>
                          <p>Expanda a lista acima para habilitar propriedades.</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className={styles.emptyPages}>
                <p>Nenhuma propriedade encontrada.</p>
                <p>Clique em "Sincronizar propriedades" para buscar.</p>
              </div>
            )}
          </div>
        )}

        {/* Ad Manager: Networks with enable/disable */}
        {isAdManager && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Redes do Ad Manager</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => configureConnection && syncAdManagerNetworksMutation.mutate(configureConnection.id)}
                disabled={syncAdManagerNetworksMutation.isPending || isLoadingAdManagerNetworks}
                leftIcon={<RefreshCw size={14} className={syncAdManagerNetworksMutation.isPending ? styles.spinning : ''} />}
              >
                {syncAdManagerNetworksMutation.isPending ? 'Sincronizando...' : 'Sincronizar redes'}
              </Button>
            </div>
            <p className={styles.configHint}>
              Habilite as redes que deseja monitorar. Apenas redes ativas serão exibidas na aba de receita.
            </p>
            {actionErrorMessage && (
              <Alert
                variant="error"
                className={styles.alert}
                onClose={() => setActionErrorMessage(null)}
              >
                {actionErrorMessage}
              </Alert>
            )}
            {(isLoadingAdManagerNetworks || syncAdManagerNetworksMutation.isPending) ? (
              <div className={styles.loadingPages}>
                <Spinner size="md" />
                <span>{syncAdManagerNetworksMutation.isPending ? 'Buscando redes...' : 'Carregando redes...'}</span>
              </div>
            ) : adManagerNetworks && adManagerNetworks.length > 0 ? (
              <>
                {/* Active networks */}
                {(() => {
                  const filteredNetworks = adManagerNetworksSearch
                    ? adManagerNetworks.filter(n =>
                        (n.network_name && n.network_name.toLowerCase().includes(adManagerNetworksSearch.toLowerCase())) ||
                        n.network_code.toLowerCase().includes(adManagerNetworksSearch.toLowerCase())
                      )
                    : adManagerNetworks
                  const activeNetworks = filteredNetworks.filter(n => n.is_active)
                  const inactiveNetworks = filteredNetworks.filter(n => !n.is_active)
                  const allFilteredIds = filteredNetworks.map(n => n.id)
                  const allActive = filteredNetworks.length > 0 && filteredNetworks.every(n => n.is_active)
                  const allInactive = filteredNetworks.length > 0 && filteredNetworks.every(n => !n.is_active)

                  return (
                    <>
                      {/* Search and Select All Toolbar */}
                      <div className={styles.configToolbar}>
                        <div className={styles.configSearchWrapper}>
                          <Search size={16} className={styles.configSearchIcon} />
                          <input
                            type="text"
                            placeholder="Buscar redes..."
                            value={adManagerNetworksSearch}
                            onChange={(e) => setAdManagerNetworksSearch(e.target.value)}
                            className={styles.configSearchInput}
                          />
                        </div>
                        <div className={styles.selectAllButtons}>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.selectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateAdManagerNetworksMutation.mutate({
                              connectionId: configureConnection.id,
                              networkIds: allFilteredIds,
                              isActive: true,
                            })}
                            disabled={batchUpdateAdManagerNetworksMutation.isPending || allActive || allFilteredIds.length === 0}
                          >
                            <CheckSquare size={14} />
                            Selecionar todos
                          </button>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.deselectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateAdManagerNetworksMutation.mutate({
                              connectionId: configureConnection.id,
                              networkIds: allFilteredIds,
                              isActive: false,
                            })}
                            disabled={batchUpdateAdManagerNetworksMutation.isPending || allInactive || allFilteredIds.length === 0}
                          >
                            <Square size={14} />
                            Desmarcar todos
                          </button>
                        </div>
                        {adManagerNetworksSearch && (
                          <span className={styles.itemCount}>
                            {filteredNetworks.length} de {adManagerNetworks.length}
                          </span>
                        )}
                      </div>

                      {filteredNetworks.length === 0 && adManagerNetworksSearch && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma rede encontrada para "{adManagerNetworksSearch}"</p>
                        </div>
                      )}

                      {activeNetworks.length > 0 && (
                        <div className={styles.pagesList}>
                          {activeNetworks.map((network) => (
                            <div key={network.network_code} className={styles.googleAdsAccountItem}>
                              <label
                                className={styles.googleAdsAccountLabel}
                                aria-label={network.network_name || network.network_code}
                              >
                                  <input
                                    type="checkbox"
                                    checked={network.is_active}
                                    onChange={() => handleUpdateAdManagerNetwork(network.id, !network.is_active)}
                                    disabled={updateAdManagerNetworkMutation.isPending || batchUpdateAdManagerNetworksMutation.isPending}
                                    className={styles.googleAdsAccountCheckbox}
                                  />
                                <span className={styles.googleAdsAccountInfo}>
                                  <span className={styles.googleAdsAccountName}>
                                    <img src={serviceIcons.ad_manager} alt="" width={16} height={16} />
                                    {network.network_name || network.network_code}
                                  </span>
                                  <span className={styles.googleAdsAccountId}>
                                    Código: {network.network_code}{network.currency_code ? ` • ${network.currency_code}` : ''}
                                  </span>
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inactive networks - collapsible */}
                      {inactiveNetworks.length > 0 && (
                        <div className={styles.inactiveAccountsSection}>
                          <button
                            type="button"
                            className={styles.collapseToggle}
                            onClick={() => setShowInactiveAdManagerNetworks(!showInactiveAdManagerNetworks)}
                          >
                            <ChevronRight
                              size={16}
                              style={{
                                transform: showInactiveAdManagerNetworks ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            />
                            <span>
                              {inactiveNetworks.length} rede{inactiveNetworks.length > 1 ? 's' : ''} inativa{inactiveNetworks.length > 1 ? 's' : ''}
                            </span>
                          </button>
                          {showInactiveAdManagerNetworks && (
                            <div className={styles.pagesList} style={{ marginTop: '8px' }}>
                              {inactiveNetworks.map((network) => (
                                <div key={network.network_code} className={`${styles.googleAdsAccountItem} ${styles.inactive}`}>
                                  <label
                                    className={styles.googleAdsAccountLabel}
                                    aria-label={network.network_name || network.network_code}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={network.is_active}
                                      onChange={() => handleUpdateAdManagerNetwork(network.id, !network.is_active)}
                                      disabled={updateAdManagerNetworkMutation.isPending || batchUpdateAdManagerNetworksMutation.isPending}
                                      className={styles.googleAdsAccountCheckbox}
                                    />
                                    <span className={styles.googleAdsAccountInfo}>
                                      <span className={styles.googleAdsAccountName}>
                                        <img src={serviceIcons.ad_manager} alt="" width={16} height={16} style={{ opacity: 0.5 }} />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>
                                          {network.network_name || network.network_code}
                                        </span>
                                      </span>
                                      <span className={styles.googleAdsAccountId}>
                                        Código: {network.network_code}{network.currency_code ? ` • ${network.currency_code}` : ''}
                                      </span>
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeNetworks.length === 0 && inactiveNetworks.length > 0 && !showInactiveAdManagerNetworks && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma rede ativa.</p>
                          <p>Expanda a lista acima para habilitar redes.</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className={styles.emptyPages}>
                <p>Nenhuma rede encontrada.</p>
                <p>Clique em "Sincronizar redes" para buscar.</p>
              </div>
            )}
          </div>
        )}

        {/* Google Ads: Managed accounts with enable/disable */}
        {serviceBadge?.label === 'Ads' && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Contas monitoradas</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => configureConnection && syncGoogleAdsAccountsMutation.mutate(configureConnection.id)}
                disabled={syncGoogleAdsAccountsMutation.isPending || isLoadingGoogleAdsAccounts}
                leftIcon={<RefreshCw size={14} className={syncGoogleAdsAccountsMutation.isPending ? styles.spinning : ''} />}
              >
                {syncGoogleAdsAccountsMutation.isPending ? 'Sincronizando...' : 'Sincronizar contas'}
              </Button>
            </div>
            <p className={styles.configHint}>
              Habilite as contas que deseja monitorar. Apenas contas ativas serão exibidas na aba de performance.
            </p>
            {(isLoadingGoogleAdsAccounts || syncGoogleAdsAccountsMutation.isPending) ? (
              <div className={styles.loadingPages}>
                <Spinner size="md" />
                <span>{syncGoogleAdsAccountsMutation.isPending ? 'Buscando contas recursivamente...' : 'Carregando contas...'}</span>
              </div>
            ) : googleAdsAccounts && googleAdsAccounts.length > 0 ? (
              <>
                {/* Active accounts */}
                {(() => {
                  const filteredAccounts = googleAdsAccountsSearch
                    ? googleAdsAccounts.filter(a =>
                        (a.name && a.name.toLowerCase().includes(googleAdsAccountsSearch.toLowerCase())) ||
                        a.customer_id.toLowerCase().includes(googleAdsAccountsSearch.toLowerCase())
                      )
                    : googleAdsAccounts
                  const activeAccounts = filteredAccounts.filter(a => a.is_active)
                  const inactiveAccounts = filteredAccounts.filter(a => !a.is_active)
                  const allFilteredIds = filteredAccounts.map(a => a.customer_id)
                  const allActive = filteredAccounts.length > 0 && filteredAccounts.every(a => a.is_active)
                  const allInactive = filteredAccounts.length > 0 && filteredAccounts.every(a => !a.is_active)

                  return (
                    <>
                      {/* Search and Select All Toolbar */}
                      <div className={styles.configToolbar}>
                        <div className={styles.configSearchWrapper}>
                          <Search size={16} className={styles.configSearchIcon} />
                          <input
                            type="text"
                            placeholder="Buscar contas..."
                            value={googleAdsAccountsSearch}
                            onChange={(e) => setGoogleAdsAccountsSearch(e.target.value)}
                            className={styles.configSearchInput}
                          />
                        </div>
                        <div className={styles.selectAllButtons}>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.selectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateGoogleAdsAccountsMutation.mutate({
                              connectionId: configureConnection.id,
                              customerIds: allFilteredIds,
                              isActive: true,
                            })}
                            disabled={batchUpdateGoogleAdsAccountsMutation.isPending || allActive || allFilteredIds.length === 0}
                          >
                            <CheckSquare size={14} />
                            Selecionar todos
                          </button>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.deselectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateGoogleAdsAccountsMutation.mutate({
                              connectionId: configureConnection.id,
                              customerIds: allFilteredIds,
                              isActive: false,
                            })}
                            disabled={batchUpdateGoogleAdsAccountsMutation.isPending || allInactive || allFilteredIds.length === 0}
                          >
                            <Square size={14} />
                            Desmarcar todos
                          </button>
                        </div>
                        {googleAdsAccountsSearch && (
                          <span className={styles.itemCount}>
                            {filteredAccounts.length} de {googleAdsAccounts.length}
                          </span>
                        )}
                      </div>

                      {filteredAccounts.length === 0 && googleAdsAccountsSearch && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma conta encontrada para "{googleAdsAccountsSearch}"</p>
                        </div>
                      )}

                      {activeAccounts.length > 0 && (
                        <div className={styles.pagesList}>
                          {activeAccounts.map((account) => (
                            <div key={account.customer_id} className={styles.googleAdsAccountItem}>
                              <label
                                className={styles.googleAdsAccountLabel}
                                aria-label={account.name || `Conta ${account.customer_id}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={account.is_active}
                                  onChange={() => configureConnection && updateGoogleAdsAccountMutation.mutate({
                                    connectionId: configureConnection.id,
                                    customerId: account.customer_id,
                                    isActive: !account.is_active,
                                  })}
                                  disabled={updateGoogleAdsAccountMutation.isPending || batchUpdateGoogleAdsAccountsMutation.isPending}
                                  className={styles.googleAdsAccountCheckbox}
                                />
                                <span className={styles.googleAdsAccountInfo}>
                                  <span className={styles.googleAdsAccountName}>
                                    <img src={serviceIcons.ads} alt="" width={16} height={16} />
                                    {account.name || `Conta ${account.customer_id}`}
                                    {account.is_manager && (
                                      <span className={styles.mccBadge}>MCC</span>
                                    )}
                                  </span>
                                  <span className={styles.googleAdsAccountId}>
                                    ID: {account.customer_id}{account.currency ? ` • ${account.currency}` : ''}
                                  </span>
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inactive accounts - collapsible */}
                      {inactiveAccounts.length > 0 && (
                        <div className={styles.inactiveAccountsSection}>
                          <button
                            type="button"
                            className={styles.collapseToggle}
                            onClick={() => setShowInactiveGoogleAdsAccounts(!showInactiveGoogleAdsAccounts)}
                          >
                            <ChevronRight
                              size={16}
                              style={{
                                transform: showInactiveGoogleAdsAccounts ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            />
                            <span>
                              {inactiveAccounts.length} conta{inactiveAccounts.length > 1 ? 's' : ''} inativa{inactiveAccounts.length > 1 ? 's' : ''}
                            </span>
                          </button>
                          {showInactiveGoogleAdsAccounts && (
                            <div className={styles.pagesList} style={{ marginTop: '8px' }}>
                              {inactiveAccounts.map((account) => (
                                <div key={account.customer_id} className={`${styles.googleAdsAccountItem} ${styles.inactive}`}>
                                  <label
                                    className={styles.googleAdsAccountLabel}
                                    aria-label={account.name || `Conta ${account.customer_id}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={account.is_active}
                                      onChange={() => configureConnection && updateGoogleAdsAccountMutation.mutate({
                                        connectionId: configureConnection.id,
                                        customerId: account.customer_id,
                                        isActive: !account.is_active,
                                      })}
                                      disabled={updateGoogleAdsAccountMutation.isPending || batchUpdateGoogleAdsAccountsMutation.isPending}
                                      className={styles.googleAdsAccountCheckbox}
                                    />
                                    <span className={styles.googleAdsAccountInfo}>
                                      <span className={styles.googleAdsAccountName}>
                                        <img src={serviceIcons.ads} alt="" width={16} height={16} style={{ opacity: 0.5 }} />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>
                                          {account.name || `Conta ${account.customer_id}`}
                                        </span>
                                        {account.is_manager && (
                                          <span className={`${styles.mccBadge} ${styles.inactive}`}>MCC</span>
                                        )}
                                      </span>
                                      <span className={styles.googleAdsAccountId}>
                                        ID: {account.customer_id}{account.currency ? ` • ${account.currency}` : ''}
                                      </span>
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeAccounts.length === 0 && inactiveAccounts.length > 0 && !showInactiveGoogleAdsAccounts && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma conta ativa.</p>
                          <p>Expanda a lista acima para habilitar contas.</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className={styles.emptyPages}>
                <p>Nenhuma conta encontrada.</p>
                <p>Clique em "Sincronizar contas" para buscar.</p>
              </div>
            )}
          </div>
        )}

        {/* Meta: Sync All Resources Button */}
        {isMetaAdsConnection && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Sincronização</span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => configureConnection && syncAllMetaResourcesMutation.mutate(configureConnection.id)}
                disabled={syncAllMetaResourcesMutation.isPending}
                leftIcon={<RefreshCw size={14} className={syncAllMetaResourcesMutation.isPending ? styles.spinning : ''} />}
              >
                {syncAllMetaResourcesMutation.isPending ? 'Sincronizando...' : 'Sincronizar tudo'}
              </Button>
            </div>
            <p className={styles.configHint}>
              Busca todas as contas de anúncios, páginas, pixels e contas do Instagram vinculadas a esta conexão.
            </p>
          </div>
        )}

        {/* Meta: Ad Accounts (for Meta Ads connections) */}
        {isMetaAdsConnection && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Contas de anúncios</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => configureConnection && syncMetaAdAccountsMutation.mutate(configureConnection.id)}
                disabled={syncMetaAdAccountsMutation.isPending || isLoadingMetaAdAccounts}
                leftIcon={<RefreshCw size={14} className={syncMetaAdAccountsMutation.isPending ? styles.spinning : ''} />}
              >
                {syncMetaAdAccountsMutation.isPending ? 'Sincronizando...' : 'Sincronizar contas'}
              </Button>
            </div>
            <p className={styles.configHint}>
              Habilite as contas de anúncios que deseja utilizar. Apenas contas ativas aparecerão nos seletores.
            </p>
            {(isLoadingMetaAdAccounts || syncMetaAdAccountsMutation.isPending) ? (
              <div className={styles.loadingPages}>
                <Spinner size="md" />
                <span>{syncMetaAdAccountsMutation.isPending ? 'Buscando contas...' : 'Carregando contas...'}</span>
              </div>
            ) : metaAdAccounts && metaAdAccounts.length > 0 ? (
              <>
                {(() => {
                  const filteredAccounts = metaAdAccountsSearch
                    ? metaAdAccounts.filter(a =>
                        (a.account_name && a.account_name.toLowerCase().includes(metaAdAccountsSearch.toLowerCase())) ||
                        a.account_id.toLowerCase().includes(metaAdAccountsSearch.toLowerCase())
                      )
                    : metaAdAccounts
                  const activeAccounts = filteredAccounts.filter(a => a.is_active)
                  const inactiveAccounts = filteredAccounts.filter(a => !a.is_active)
                  const allFilteredIds = filteredAccounts.map(a => a.id)
                  const allActive = filteredAccounts.length > 0 && filteredAccounts.every(a => a.is_active)
                  const allInactive = filteredAccounts.length > 0 && filteredAccounts.every(a => !a.is_active)

                  return (
                    <>
                      {/* Search and Select All Toolbar */}
                      <div className={styles.configToolbar}>
                        <div className={styles.configSearchWrapper}>
                          <Search size={16} className={styles.configSearchIcon} />
                          <input
                            type="text"
                            placeholder="Buscar contas..."
                            value={metaAdAccountsSearch}
                            onChange={(e) => setMetaAdAccountsSearch(e.target.value)}
                            className={styles.configSearchInput}
                          />
                        </div>
                        <div className={styles.selectAllButtons}>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.selectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateMetaAdAccountsMutation.mutate({
                              connectionId: configureConnection.id,
                              accountIds: allFilteredIds,
                              isActive: true,
                            })}
                            disabled={batchUpdateMetaAdAccountsMutation.isPending || allActive || allFilteredIds.length === 0}
                          >
                            <CheckSquare size={14} />
                            Selecionar todos
                          </button>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.deselectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateMetaAdAccountsMutation.mutate({
                              connectionId: configureConnection.id,
                              accountIds: allFilteredIds,
                              isActive: false,
                            })}
                            disabled={batchUpdateMetaAdAccountsMutation.isPending || allInactive || allFilteredIds.length === 0}
                          >
                            <Square size={14} />
                            Desmarcar todos
                          </button>
                        </div>
                        {metaAdAccountsSearch && (
                          <span className={styles.itemCount}>
                            {filteredAccounts.length} de {metaAdAccounts.length}
                          </span>
                        )}
                      </div>

                      {filteredAccounts.length === 0 && metaAdAccountsSearch && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma conta encontrada para "{metaAdAccountsSearch}"</p>
                        </div>
                      )}

                      {activeAccounts.length > 0 && (
                        <div className={styles.pagesList}>
                          {activeAccounts.map((account) => (
                            <div key={account.account_id} className={styles.googleAdsAccountItem}>
                              <label
                                className={styles.googleAdsAccountLabel}
                                aria-label={account.account_name || account.account_id}
                              >
                                <input
                                  type="checkbox"
                                  checked={account.is_active}
                                  onChange={() => configureConnection && updateMetaAdAccountMutation.mutate({
                                    connectionId: configureConnection.id,
                                    accountId: account.id,
                                    isActive: !account.is_active,
                                  })}
                                  disabled={updateMetaAdAccountMutation.isPending || batchUpdateMetaAdAccountsMutation.isPending}
                                  className={styles.googleAdsAccountCheckbox}
                                />
                                <span className={styles.googleAdsAccountInfo}>
                                  <span className={styles.googleAdsAccountName}>
                                    <img src={serviceIcons.meta_ads} alt="" width={16} height={16} />
                                    {account.account_name}
                                  </span>
                                  <span className={styles.googleAdsAccountId}>
                                    ID: {account.account_id}{account.currency ? ` • ${account.currency}` : ''}
                                  </span>
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {inactiveAccounts.length > 0 && (
                        <div className={styles.inactiveAccountsSection}>
                          <button
                            type="button"
                            className={styles.collapseToggle}
                            onClick={() => setShowInactiveMetaAdAccounts(!showInactiveMetaAdAccounts)}
                          >
                            <ChevronRight
                              size={16}
                              style={{
                                transform: showInactiveMetaAdAccounts ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            />
                            <span>
                              {inactiveAccounts.length} conta{inactiveAccounts.length > 1 ? 's' : ''} inativa{inactiveAccounts.length > 1 ? 's' : ''}
                            </span>
                          </button>
                          {showInactiveMetaAdAccounts && (
                            <div className={styles.pagesList} style={{ marginTop: '8px' }}>
                              {inactiveAccounts.map((account) => (
                                <div key={account.account_id} className={`${styles.googleAdsAccountItem} ${styles.inactive}`}>
                                  <label
                                    className={styles.googleAdsAccountLabel}
                                    aria-label={account.account_name || account.account_id}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={account.is_active}
                                      onChange={() => configureConnection && updateMetaAdAccountMutation.mutate({
                                        connectionId: configureConnection.id,
                                        accountId: account.id,
                                        isActive: !account.is_active,
                                      })}
                                      disabled={updateMetaAdAccountMutation.isPending || batchUpdateMetaAdAccountsMutation.isPending}
                                      className={styles.googleAdsAccountCheckbox}
                                    />
                                    <span className={styles.googleAdsAccountInfo}>
                                      <span className={styles.googleAdsAccountName}>
                                        <img src={serviceIcons.meta_ads} alt="" width={16} height={16} style={{ opacity: 0.5 }} />
                                        <span style={{ color: 'var(--color-text-secondary)' }}>
                                          {account.account_name}
                                        </span>
                                      </span>
                                      <span className={styles.googleAdsAccountId}>
                                        ID: {account.account_id}{account.currency ? ` • ${account.currency}` : ''}
                                      </span>
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activeAccounts.length === 0 && inactiveAccounts.length > 0 && !showInactiveMetaAdAccounts && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma conta ativa.</p>
                          <p>Expanda a lista acima para habilitar contas.</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className={styles.emptyPages}>
                <p>Nenhuma conta encontrada.</p>
                <p>Clique em "Sincronizar contas" para buscar.</p>
              </div>
            )}
          </div>
        )}

        {/* Meta: Pages for Ads (different from Messages) */}
        {isMetaAdsConnection && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Páginas do Facebook</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => configureConnection && syncMetaPagesForAdsMutation.mutate(configureConnection.id)}
                disabled={syncMetaPagesForAdsMutation.isPending || isLoadingMetaPagesForAds}
                leftIcon={<RefreshCw size={14} className={syncMetaPagesForAdsMutation.isPending ? styles.spinning : ''} />}
              >
                {syncMetaPagesForAdsMutation.isPending ? 'Sincronizando...' : 'Sincronizar páginas'}
              </Button>
            </div>
            <p className={styles.configHint}>
              Habilite as páginas que deseja utilizar para anúncios. Páginas ativas aparecerão nos seletores.
            </p>
            {(isLoadingMetaPagesForAds || syncMetaPagesForAdsMutation.isPending) ? (
              <div className={styles.loadingPages}>
                <Spinner size="md" />
                <span>{syncMetaPagesForAdsMutation.isPending ? 'Buscando páginas...' : 'Carregando páginas...'}</span>
              </div>
            ) : metaPagesForAds && metaPagesForAds.length > 0 ? (
              <>
                {(() => {
                  const filteredPages = metaPagesSearch
                    ? metaPagesForAds.filter(p =>
                        p.page_name.toLowerCase().includes(metaPagesSearch.toLowerCase()) ||
                        (p.category && p.category.toLowerCase().includes(metaPagesSearch.toLowerCase()))
                      )
                    : metaPagesForAds
                  const activePages = filteredPages.filter(p => p.is_active)
                  const inactivePages = filteredPages.filter(p => !p.is_active)
                  const allFilteredIds = filteredPages.map(p => p.page_id)
                  const allActive = filteredPages.length > 0 && filteredPages.every(p => p.is_active)
                  const allInactive = filteredPages.length > 0 && filteredPages.every(p => !p.is_active)

                  return (
                    <>
                      {/* Search and Select All Toolbar */}
                      <div className={styles.configToolbar}>
                        <div className={styles.configSearchWrapper}>
                          <Search size={16} className={styles.configSearchIcon} />
                          <input
                            type="text"
                            placeholder="Buscar páginas..."
                            value={metaPagesSearch}
                            onChange={(e) => setMetaPagesSearch(e.target.value)}
                            className={styles.configSearchInput}
                          />
                        </div>
                        <div className={styles.selectAllButtons}>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.selectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateMetaPagesForAdsMutation.mutate({
                              connectionId: configureConnection.id,
                              pageIds: allFilteredIds,
                              isActive: true,
                            })}
                            disabled={batchUpdateMetaPagesForAdsMutation.isPending || allActive || allFilteredIds.length === 0}
                          >
                            <CheckSquare size={14} />
                            Selecionar todos
                          </button>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.deselectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateMetaPagesForAdsMutation.mutate({
                              connectionId: configureConnection.id,
                              pageIds: allFilteredIds,
                              isActive: false,
                            })}
                            disabled={batchUpdateMetaPagesForAdsMutation.isPending || allInactive || allFilteredIds.length === 0}
                          >
                            <Square size={14} />
                            Desmarcar todos
                          </button>
                        </div>
                        {metaPagesSearch && (
                          <span className={styles.itemCount}>
                            {filteredPages.length} de {metaPagesForAds.length}
                          </span>
                        )}
                      </div>

                      {filteredPages.length === 0 && metaPagesSearch && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma página encontrada para "{metaPagesSearch}"</p>
                        </div>
                      )}

                      {activePages.length > 0 && (
                        <div className={styles.pagesList}>
                          {activePages.map((page) => (
                            <div key={page.page_id} className={styles.googleAdsAccountItem}>
                              <label
                                className={styles.googleAdsAccountLabel}
                                aria-label={page.page_name}
                              >
                                <input
                                  type="checkbox"
                                  checked={page.is_active}
                                  onChange={() => configureConnection && updateMetaPageForAdsMutation.mutate({
                                    connectionId: configureConnection.id,
                                    pageId: page.page_id,
                                    isActive: !page.is_active,
                                  })}
                                  disabled={updateMetaPageForAdsMutation.isPending || batchUpdateMetaPagesForAdsMutation.isPending}
                                  className={styles.googleAdsAccountCheckbox}
                                />
                                <span className={styles.googleAdsAccountInfo}>
                                  <span className={styles.googleAdsAccountName}>
                                    {page.picture_url && <img src={page.picture_url} alt="" width={20} height={20} style={{ borderRadius: '50%' }} />}
                                    {!page.picture_url && <img src={serviceIcons.meta_ads} alt="" width={16} height={16} />}
                                    {page.page_name}
                                  </span>
                                  {page.category && (
                                    <span className={styles.googleAdsAccountId}>
                                      {page.category}
                                    </span>
                                  )}
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {inactivePages.length > 0 && (
                        <div className={styles.inactiveAccountsSection}>
                          <button
                            type="button"
                            className={styles.collapseToggle}
                            onClick={() => setShowInactiveMetaPagesForAds(!showInactiveMetaPagesForAds)}
                          >
                            <ChevronRight
                              size={16}
                              style={{
                                transform: showInactiveMetaPagesForAds ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                              }}
                            />
                            <span>
                              {inactivePages.length} página{inactivePages.length > 1 ? 's' : ''} inativa{inactivePages.length > 1 ? 's' : ''}
                            </span>
                          </button>
                          {showInactiveMetaPagesForAds && (
                            <div className={styles.pagesList} style={{ marginTop: '8px' }}>
                              {inactivePages.map((page) => (
                                <div key={page.page_id} className={`${styles.googleAdsAccountItem} ${styles.inactive}`}>
                                  <label
                                    className={styles.googleAdsAccountLabel}
                                    aria-label={page.page_name}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={page.is_active}
                                      onChange={() => configureConnection && updateMetaPageForAdsMutation.mutate({
                                        connectionId: configureConnection.id,
                                        pageId: page.page_id,
                                        isActive: !page.is_active,
                                      })}
                                      disabled={updateMetaPageForAdsMutation.isPending || batchUpdateMetaPagesForAdsMutation.isPending}
                                      className={styles.googleAdsAccountCheckbox}
                                    />
                                    <span className={styles.googleAdsAccountInfo}>
                                      <span className={styles.googleAdsAccountName}>
                                        {page.picture_url && <img src={page.picture_url} alt="" width={20} height={20} style={{ borderRadius: '50%', opacity: 0.5 }} />}
                                        {!page.picture_url && <img src={serviceIcons.meta_ads} alt="" width={16} height={16} style={{ opacity: 0.5 }} />}
                                        <span style={{ color: 'var(--color-text-secondary)' }}>
                                          {page.page_name}
                                        </span>
                                      </span>
                                      {page.category && (
                                        <span className={styles.googleAdsAccountId}>
                                          {page.category}
                                        </span>
                                      )}
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {activePages.length === 0 && inactivePages.length > 0 && !showInactiveMetaPagesForAds && (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma página ativa.</p>
                          <p>Expanda a lista acima para habilitar páginas.</p>
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className={styles.emptyPages}>
                <p>Nenhuma página encontrada.</p>
                <p>Clique em "Sincronizar páginas" para buscar.</p>
              </div>
            )}
          </div>
        )}

        {/* Meta: Pixels */}
        {isMetaAdsConnection && metaAdAccounts && metaAdAccounts.some(a => a.is_active) && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Pixels do Meta</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (configureConnection && selectedMetaAdAccountForPixels) {
                    syncMetaPixelsMutation.mutate({
                      connectionId: configureConnection.id,
                      adAccountId: selectedMetaAdAccountForPixels,
                    })
                  }
                }}
                disabled={syncMetaPixelsMutation.isPending || isLoadingMetaPixels || !selectedMetaAdAccountForPixels}
                leftIcon={<RefreshCw size={14} className={syncMetaPixelsMutation.isPending ? styles.spinning : ''} />}
              >
                {syncMetaPixelsMutation.isPending ? 'Sincronizando...' : 'Sincronizar pixels'}
              </Button>
            </div>
            <p className={styles.configHint}>
              Selecione uma conta de anúncios para ver os pixels disponíveis.
            </p>

            {/* Ad Account Selector for Pixels */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <select
                value={selectedMetaAdAccountForPixels || ''}
                onChange={(e) => setSelectedMetaAdAccountForPixels(e.target.value || null)}
                className={styles.pixelAccountSelect}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                  backgroundColor: 'var(--color-bg-primary)',
                }}
              >
                <option value="">Selecione uma conta...</option>
                {metaAdAccounts.filter(a => a.is_active).map((account) => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.account_name} ({account.account_id})
                  </option>
                ))}
              </select>
            </div>

            {selectedMetaAdAccountForPixels && (
              <>
                {(isLoadingMetaPixels || syncMetaPixelsMutation.isPending) ? (
                  <div className={styles.loadingPages}>
                    <Spinner size="md" />
                    <span>{syncMetaPixelsMutation.isPending ? 'Buscando pixels...' : 'Carregando pixels...'}</span>
                  </div>
                ) : metaPixels && metaPixels.length > 0 ? (
                  <>
                    {(() => {
                      const filteredPixels = metaPixelsSearch
                        ? metaPixels.filter(p =>
                            (p.pixel_name && p.pixel_name.toLowerCase().includes(metaPixelsSearch.toLowerCase())) ||
                            p.pixel_id.toLowerCase().includes(metaPixelsSearch.toLowerCase())
                          )
                        : metaPixels
                      const activePixels = filteredPixels.filter(p => p.is_active)
                      const inactivePixels = filteredPixels.filter(p => !p.is_active)
                      const allFilteredIds = filteredPixels.map(p => p.id)
                      const allActive = filteredPixels.length > 0 && filteredPixels.every(p => p.is_active)
                      const allInactive = filteredPixels.length > 0 && filteredPixels.every(p => !p.is_active)

                      return (
                        <>
                          {/* Search and Select All Toolbar */}
                          <div className={styles.configToolbar}>
                            <div className={styles.configSearchWrapper}>
                              <Search size={16} className={styles.configSearchIcon} />
                              <input
                                type="text"
                                placeholder="Buscar pixels..."
                                value={metaPixelsSearch}
                                onChange={(e) => setMetaPixelsSearch(e.target.value)}
                                className={styles.configSearchInput}
                              />
                            </div>
                            <div className={styles.selectAllButtons}>
                              <button
                                type="button"
                                className={`${styles.selectAllBtn} ${styles.selectAll}`}
                                onClick={() => configureConnection && selectedMetaAdAccountForPixels && allFilteredIds.length > 0 && batchUpdateMetaPixelsMutation.mutate({
                                  connectionId: configureConnection.id,
                                  adAccountId: selectedMetaAdAccountForPixels,
                                  pixelIds: allFilteredIds,
                                  isActive: true,
                                })}
                                disabled={batchUpdateMetaPixelsMutation.isPending || allActive || allFilteredIds.length === 0}
                              >
                                <CheckSquare size={14} />
                                Selecionar todos
                              </button>
                              <button
                                type="button"
                                className={`${styles.selectAllBtn} ${styles.deselectAll}`}
                                onClick={() => configureConnection && selectedMetaAdAccountForPixels && allFilteredIds.length > 0 && batchUpdateMetaPixelsMutation.mutate({
                                  connectionId: configureConnection.id,
                                  adAccountId: selectedMetaAdAccountForPixels,
                                  pixelIds: allFilteredIds,
                                  isActive: false,
                                })}
                                disabled={batchUpdateMetaPixelsMutation.isPending || allInactive || allFilteredIds.length === 0}
                              >
                                <Square size={14} />
                                Desmarcar todos
                              </button>
                            </div>
                            {metaPixelsSearch && (
                              <span className={styles.itemCount}>
                                {filteredPixels.length} de {metaPixels.length}
                              </span>
                            )}
                          </div>

                          {filteredPixels.length === 0 && metaPixelsSearch && (
                            <div className={styles.emptyPages}>
                              <p>Nenhum pixel encontrado para "{metaPixelsSearch}"</p>
                            </div>
                          )}

                          {activePixels.length > 0 && (
                            <div className={styles.pagesList}>
                              {activePixels.map((pixel) => (
                                <div key={pixel.pixel_id} className={styles.googleAdsAccountItem}>
                                  <label
                                    className={styles.googleAdsAccountLabel}
                                    aria-label={pixel.pixel_name || pixel.pixel_id}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={pixel.is_active}
                                      onChange={() => configureConnection && updateMetaPixelMutation.mutate({
                                        connectionId: configureConnection.id,
                                        adAccountId: selectedMetaAdAccountForPixels,
                                        pixelId: pixel.id,
                                        isActive: !pixel.is_active,
                                      })}
                                      disabled={updateMetaPixelMutation.isPending || batchUpdateMetaPixelsMutation.isPending}
                                      className={styles.googleAdsAccountCheckbox}
                                    />
                                    <span className={styles.googleAdsAccountInfo}>
                                      <span className={styles.googleAdsAccountName}>
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '20px',
                                          height: '20px',
                                          backgroundColor: 'var(--color-primary-light)',
                                          borderRadius: '4px',
                                          marginRight: '8px',
                                          fontSize: '10px',
                                        }}>
                                          PX
                                        </span>
                                        {pixel.pixel_name}
                                      </span>
                                      <span className={styles.googleAdsAccountId}>
                                        ID: {pixel.pixel_id}
                                        {pixel.is_unavailable && ' • Indisponível'}
                                      </span>
                                    </span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}

                          {inactivePixels.length > 0 && (
                            <div className={styles.inactiveAccountsSection}>
                              <button
                                type="button"
                                className={styles.collapseToggle}
                                onClick={() => setShowInactiveMetaPixels(!showInactiveMetaPixels)}
                              >
                                <ChevronRight
                                  size={16}
                                  style={{
                                    transform: showInactiveMetaPixels ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                  }}
                                />
                                <span>
                                  {inactivePixels.length} pixel{inactivePixels.length > 1 ? 's' : ''} inativo{inactivePixels.length > 1 ? 's' : ''}
                                </span>
                              </button>
                              {showInactiveMetaPixels && (
                                <div className={styles.pagesList} style={{ marginTop: '8px' }}>
                                  {inactivePixels.map((pixel) => (
                                    <div key={pixel.pixel_id} className={`${styles.googleAdsAccountItem} ${styles.inactive}`}>
                                      <label
                                        className={styles.googleAdsAccountLabel}
                                        aria-label={pixel.pixel_name || pixel.pixel_id}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={pixel.is_active}
                                          onChange={() => configureConnection && updateMetaPixelMutation.mutate({
                                            connectionId: configureConnection.id,
                                            adAccountId: selectedMetaAdAccountForPixels,
                                            pixelId: pixel.id,
                                            isActive: !pixel.is_active,
                                          })}
                                          disabled={updateMetaPixelMutation.isPending || batchUpdateMetaPixelsMutation.isPending}
                                          className={styles.googleAdsAccountCheckbox}
                                        />
                                        <span className={styles.googleAdsAccountInfo}>
                                          <span className={styles.googleAdsAccountName}>
                                            <span style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              width: '20px',
                                              height: '20px',
                                              backgroundColor: 'var(--color-bg-secondary)',
                                              borderRadius: '4px',
                                              marginRight: '8px',
                                              fontSize: '10px',
                                              opacity: 0.5,
                                            }}>
                                              PX
                                            </span>
                                            <span style={{ color: 'var(--color-text-secondary)' }}>
                                              {pixel.pixel_name}
                                            </span>
                                          </span>
                                          <span className={styles.googleAdsAccountId}>
                                            ID: {pixel.pixel_id}
                                            {pixel.is_unavailable && ' • Indisponível'}
                                          </span>
                                        </span>
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {activePixels.length === 0 && inactivePixels.length > 0 && !showInactiveMetaPixels && (
                            <div className={styles.emptyPages}>
                              <p>Nenhum pixel ativo.</p>
                              <p>Expanda a lista acima para habilitar pixels.</p>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </>
                ) : (
                  <div className={styles.emptyPages}>
                    <p>Nenhum pixel encontrado para esta conta.</p>
                    <p>Clique em "Sincronizar pixels" para buscar.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Meta: Instagram Accounts */}
        {isMetaAdsConnection && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Contas do Instagram</span>
            </div>
            <p className={styles.configHint}>
              Contas do Instagram vinculadas às páginas do Facebook ativas. Usadas para anúncios no Instagram.
            </p>
            {isLoadingMetaInstagram || isLoadingMetaPagesForAds ? (
              <div className={styles.loadingPages}>
                <Spinner size="md" />
                <span>Carregando contas do Instagram...</span>
              </div>
            ) : metaInstagramAccounts && metaInstagramAccounts.length > 0 ? (
              <>
                {(() => {
                  const filteredAccounts = instagramAccountsSearch
                    ? metaInstagramAccounts.filter(ig =>
                        ig.username.toLowerCase().includes(instagramAccountsSearch.toLowerCase()) ||
                        (ig.name && ig.name.toLowerCase().includes(instagramAccountsSearch.toLowerCase())) ||
                        ig.pageName.toLowerCase().includes(instagramAccountsSearch.toLowerCase())
                      )
                    : metaInstagramAccounts

                  return (
                    <>
                      {/* Search Toolbar */}
                      <div className={styles.configToolbar}>
                        <div className={styles.configSearchWrapper}>
                          <Search size={16} className={styles.configSearchIcon} />
                          <input
                            type="text"
                            placeholder="Buscar contas..."
                            value={instagramAccountsSearch}
                            onChange={(e) => setInstagramAccountsSearch(e.target.value)}
                            className={styles.configSearchInput}
                          />
                        </div>
                        {instagramAccountsSearch && (
                          <span className={styles.itemCount}>
                            {filteredAccounts.length} de {metaInstagramAccounts.length}
                          </span>
                        )}
                      </div>

                      {filteredAccounts.length === 0 && instagramAccountsSearch ? (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma conta encontrada para "{instagramAccountsSearch}"</p>
                        </div>
                      ) : (
                        <div className={styles.pagesList}>
                          {filteredAccounts.map((ig) => (
                            <div key={ig.id} className={styles.googleAdsAccountItem}>
                              <div className={styles.googleAdsAccountLabel} style={{ cursor: 'default' }}>
                                <span className={styles.googleAdsAccountInfo}>
                                  <span className={styles.googleAdsAccountName}>
                                    {ig.profilePictureUrl && (
                                      <img
                                        src={ig.profilePictureUrl}
                                        alt=""
                                        width={24}
                                        height={24}
                                        style={{ borderRadius: '50%', marginRight: '8px' }}
                                      />
                                    )}
                                    {!ig.profilePictureUrl && (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                                        borderRadius: '50%',
                                        marginRight: '8px',
                                        color: 'white',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                      }}>
                                        IG
                                      </span>
                                    )}
                                    @{ig.username}
                                    {ig.name && ig.name !== ig.username && (
                                      <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                                        ({ig.name})
                                      </span>
                                    )}
                                  </span>
                                  <span className={styles.googleAdsAccountId}>
                                    Página: {ig.pageName}
                                    {ig.followersCount !== undefined && ` • ${ig.followersCount.toLocaleString()} seguidores`}
                                  </span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className={styles.emptyPages}>
                <p>Nenhuma conta do Instagram encontrada.</p>
                <p>Vincule uma conta do Instagram às suas páginas do Facebook para usar em anúncios.</p>
              </div>
            )}
          </div>
        )}

        {/* Meta pages section - only for Meta Messages connections */}
        {isMeta && isMessages && (
          <div className={styles.configSection}>
            <div className={styles.configSectionHeader}>
              <span className={styles.configLabel}>Páginas para mensagens</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefreshMetaPages}
                disabled={refreshMetaPagesMutation.isPending || isLoadingMetaPages}
              >
                <RefreshCw size={14} className={refreshMetaPagesMutation.isPending ? styles.spinning : ''} />
                {refreshMetaPagesMutation.isPending ? 'Atualizando...' : 'Buscar páginas'}
              </Button>
            </div>
            {isLoadingMetaPages || refreshMetaPagesMutation.isPending ? (
              <div className={styles.loadingPages}>
                <Spinner size="md" />
                <span>{refreshMetaPagesMutation.isPending ? 'Buscando páginas do Facebook...' : 'Carregando páginas...'}</span>
              </div>
            ) : metaPages && metaPages.length > 0 ? (
              <>
                {(() => {
                  const filteredPages = metaMessagesSearch
                    ? metaPages.filter(p =>
                        p.page_name.toLowerCase().includes(metaMessagesSearch.toLowerCase()) ||
                        (p.category && p.category.toLowerCase().includes(metaMessagesSearch.toLowerCase()))
                      )
                    : metaPages
                  const allFilteredIds = filteredPages.map(p => p.page_id)
                  const allActive = filteredPages.length > 0 && filteredPages.every(p => p.is_active)
                  const allInactive = filteredPages.length > 0 && filteredPages.every(p => !p.is_active)

                  return (
                    <>
                      {/* Search and Select All Toolbar */}
                      <div className={styles.configToolbar}>
                        <div className={styles.configSearchWrapper}>
                          <Search size={16} className={styles.configSearchIcon} />
                          <input
                            type="text"
                            placeholder="Buscar páginas..."
                            value={metaMessagesSearch}
                            onChange={(e) => setMetaMessagesSearch(e.target.value)}
                            className={styles.configSearchInput}
                          />
                        </div>
                        <div className={styles.selectAllButtons}>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.selectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateMetaPagesMutation.mutate({
                              connectionId: configureConnection.id,
                              pageIds: allFilteredIds,
                              isActive: true,
                            })}
                            disabled={batchUpdateMetaPagesMutation.isPending || allActive || allFilteredIds.length === 0}
                          >
                            <CheckSquare size={14} />
                            Selecionar todos
                          </button>
                          <button
                            type="button"
                            className={`${styles.selectAllBtn} ${styles.deselectAll}`}
                            onClick={() => configureConnection && allFilteredIds.length > 0 && batchUpdateMetaPagesMutation.mutate({
                              connectionId: configureConnection.id,
                              pageIds: allFilteredIds,
                              isActive: false,
                            })}
                            disabled={batchUpdateMetaPagesMutation.isPending || allInactive || allFilteredIds.length === 0}
                          >
                            <Square size={14} />
                            Desmarcar todos
                          </button>
                        </div>
                        {metaMessagesSearch && (
                          <span className={styles.itemCount}>
                            {filteredPages.length} de {metaPages.length}
                          </span>
                        )}
                      </div>

                      {filteredPages.length === 0 && metaMessagesSearch ? (
                        <div className={styles.emptyPages}>
                          <p>Nenhuma página encontrada para "{metaMessagesSearch}"</p>
                        </div>
                      ) : (
                        <div className={styles.pagesList}>
                          {filteredPages.map((page) => (
                            <div key={page.id} className={styles.pageItem}>
                              <Checkbox
                                checked={page.is_active}
                                onChange={() => handleToggleMetaPage(page.page_id, page.is_active)}
                                label={page.page_name}
                                description={page.category || undefined}
                                disabled={updateMetaPageMutation.isPending || batchUpdateMetaPagesMutation.isPending}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </>
            ) : (
              <div className={styles.emptyPages}>
                <p>Nenhuma página encontrada.</p>
                <p>Clique em "Buscar páginas" para sincronizar.</p>
              </div>
            )}
          </div>
        )}

        {/* Reconectar section */}
        <div className={styles.configSection}>
          <span className={styles.configLabel}>Reconectar</span>
          <p className={styles.configHint}>
            Use esta opção para atualizar permissões ou resolver problemas de autenticação.
          </p>
          <Button
            variant="secondary"
            onClick={handleReconnectFromConfig}
            disabled={isReconnectingFromConfig}
            leftIcon={isReconnectingFromConfig ? undefined : <Link2 size={16} />}
          >
            {isReconnectingFromConfig ? (
              <>
                <Spinner size="sm" /> Reconectando...
              </>
            ) : (
              'Reconectar conta'
            )}
          </Button>
        </div>

        {/* Actions */}
        <div className={styles.configActions}>
          <Button variant="ghost" onClick={handleCloseConfigModal}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveConnectionName}
            disabled={!hasNameChanged || updateConnectionMutation.isPending}
          >
            {updateConnectionMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    )
  }

  const renderNewConnectionStep = () => {
    switch (step) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>Nome da conexão</h3>
            <p className={styles.stepDescription}>
              Dê um nome para identificar esta conexão facilmente
            </p>
            <Input
              placeholder="Ex: Meta Ads Principal, Google Mensagens..."
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
              className={styles.nameInput}
              autoFocus
            />
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={closeNewConnectionModal}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleNextStep} disabled={!connectionName.trim()}>
                Próximo
              </Button>
            </div>
          </div>
        )

      case 2:
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>Escolha a plataforma</h3>
            <p className={styles.stepDescription}>Selecione a plataforma que deseja conectar</p>
            <div className={styles.platformList}>
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  className={`${styles.platformItem} ${selectedPlatform === platform.id ? styles.platformItemSelected : ''}`}
                  onClick={() => setSelectedPlatform(platform.id)}
                  style={
                    selectedPlatform === platform.id
                      ? { borderColor: platform.color, background: `${platform.color}10` }
                      : undefined
                  }
                >
                  <div
                    className={styles.platformIcon}
                    style={{ background: `${platform.color}15` }}
                  >
                    <img
                      src={platform.id === 'meta' ? serviceIcons.meta : serviceIcons.ads}
                      alt=""
                      width={24}
                      height={24}
                    />
                  </div>
                  <span className={styles.platformLabel}>{platform.label}</span>
                  {selectedPlatform === platform.id && (
                    <CheckCircle size={20} style={{ color: platform.color }} />
                  )}
                </button>
              ))}
            </div>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={handleBackStep}>
                Voltar
              </Button>
              <Button variant="primary" onClick={handleNextStep} disabled={!selectedPlatform}>
                Próximo
              </Button>
            </div>
          </div>
        )

      case 3:
        // Google service selection (Ads, AdSense, Ad Manager)
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>Serviço Google</h3>
            <p className={styles.stepDescription}>Selecione o serviço que deseja conectar</p>
            <div className={styles.typeList}>
              {googleServices.map((service) => (
                  <button
                    key={service.id}
                    className={`${styles.typeItem} ${selectedGoogleService === service.id ? styles.typeItemSelected : ''}`}
                    onClick={() => setSelectedGoogleService(service.id)}
                    style={
                      selectedGoogleService === service.id
                        ? { borderColor: service.color, background: `${service.color}10` }
                        : undefined
                    }
                    disabled={isConnecting || adSenseOAuthMutation.isPending}
                  >
                    <div
                      className={styles.typeItemIcon}
                      style={{ background: `${service.color}08` }}
                    >
                      <img src={serviceIcons[service.iconKey]} alt={service.label} width={28} height={28} />
                    </div>
                    <div className={styles.typeItemInfo}>
                      <span className={styles.typeItemLabel}>{service.label}</span>
                      <span className={styles.typeItemDesc}>{service.description}</span>
                    </div>
                    {selectedGoogleService === service.id && <CheckCircle size={20} style={{ color: service.color }} />}
                  </button>
                )
              )}
            </div>
            {connectError && (
              <Alert variant="error" className={styles.connectError}>
                {connectError}
              </Alert>
            )}
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={handleBackStep} disabled={isConnecting || adSenseOAuthMutation.isPending}>
                Voltar
              </Button>
              <Button
                variant="primary"
                onClick={handleNextStep}
                disabled={!selectedGoogleService || isConnecting || adSenseOAuthMutation.isPending}
              >
                {isConnecting || adSenseOAuthMutation.isPending ? (
                  <>
                    <Spinner size="sm" /> Conectando...
                  </>
                ) : (
                  'Conectar'
                )}
              </Button>
            </div>
          </div>
        )

      case 4:
        // Meta subtype selection (Messages, Ads)
        return (
          <div className={styles.stepContent}>
            <h3 className={styles.stepTitle}>Tipo de conexão</h3>
            <p className={styles.stepDescription}>Escolha o tipo de integração desejada</p>
            <div className={styles.typeList}>
              {connectionSubTypes.map((type) => {
                const Icon = type.icon
                const platform = platforms.find((p) => p.id === selectedPlatform)
                const color = platform?.color || '#6366f1'

                return (
                  <button
                    key={type.id}
                    className={`${styles.typeItem} ${selectedSubType === type.id ? styles.typeItemSelected : ''}`}
                    onClick={() => setSelectedSubType(type.id)}
                    style={
                      selectedSubType === type.id
                        ? { borderColor: color, background: `${color}10` }
                        : undefined
                    }
                    disabled={isConnecting}
                  >
                    <div
                      className={styles.typeItemIcon}
                      style={{ background: `${color}15`, color }}
                    >
                      <Icon size={24} />
                    </div>
                    <div className={styles.typeItemInfo}>
                      <span className={styles.typeItemLabel}>{type.label}</span>
                      <span className={styles.typeItemDesc}>{type.description}</span>
                    </div>
                    {selectedSubType === type.id && <CheckCircle size={20} style={{ color }} />}
                  </button>
                )
              })}
            </div>
            {connectError && (
              <Alert variant="error" className={styles.connectError}>
                {connectError}
              </Alert>
            )}
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={handleBackStep} disabled={isConnecting}>
                Voltar
              </Button>
              <Button
                variant="primary"
                onClick={handleConnect}
                disabled={!selectedSubType || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Spinner size="sm" /> Conectando...
                  </>
                ) : (
                  'Conectar'
                )}
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <Link2 size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Conexões</h1>
            <p className={styles.subtitle}>Gerencie suas integrações com Meta e Google</p>
          </div>
        </div>
        <Button variant="primary" leftIcon={<Plus size={18} />} onClick={openNewConnectionModal}>
          Nova Conexão
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar conexões..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          size="md"
        />
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
            <CheckCircle size={24} color="#22c55e" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.active || 0}</span>
            <span className={styles.statLabel}>Conectadas</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <XCircle size={24} color="#f59e0b" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.inactive || 0}</span>
            <span className={styles.statLabel}>Desconectadas</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
            <Link2 size={24} color="#6366f1" />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{stats?.total || 0}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </div>
      </div>

      {successMessage && (
        <Alert variant="success" className={styles.alert}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar conexões: {error.message}
        </Alert>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !connections || connections.length === 0 ? (
        <EmptyState
          icon={<Link2 size={48} />}
          title="Nenhuma conexão encontrada"
          description="Adicione sua primeira integração para começar a automatizar"
          action={
            <Button variant="primary" leftIcon={<Plus size={18} />} onClick={openNewConnectionModal}>
              Nova Conexão
            </Button>
          }
        />
      ) : (
        <div className={styles.list}>
          {connections.map((connection) => {
            const { platform, color, iconKey } = getConnectionInfo(connection)
            const serviceBadge = getServiceBadgeInfo(connection)

            // Count AdSense accounts needing attention (state !== READY and state is defined)
            const adSenseMetadata = connection.metadata as { type?: string; accounts?: Array<{ state?: string }> } | null
            const isAdSenseConn = adSenseMetadata?.type === 'adsense' || connection.plataform_name === 'adsense'
            const accountsNeedingAttention = isAdSenseConn && adSenseMetadata?.accounts
              ? adSenseMetadata.accounts.filter(
                  (a) => a.state && a.state !== 'READY' && a.state !== 'STATE_UNSPECIFIED'
                ).length
              : 0

            return (
              <div key={connection.id} className={styles.card}>
                <div className={styles.cardIcon} style={{ background: `${color}15` }}>
                  {iconKey ? (
                    <img src={serviceIcons[iconKey]} alt={platform?.label || ''} width={24} height={24} />
                  ) : (
                    <Link2 size={24} style={{ color }} />
                  )}
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{connection.connection_name || 'Conexão'}</h3>
                    {serviceBadge && (
                      <span
                        className={styles.serviceBadge}
                        style={{ backgroundColor: `${serviceBadge.color}15`, color: serviceBadge.color }}
                      >
                        {serviceBadge.label}
                      </span>
                    )}
                    {getStatusBadge(connection)}
                    {accountsNeedingAttention > 0 && (
                      <span className={styles.connectionWarning}>
                        <AlertCircle size={14} />
                        {accountsNeedingAttention}
                      </span>
                    )}
                  </div>
                <div className={styles.cardMeta}>
                  <span className={styles.platform} style={{ color }}>
                    {platform?.label || connection.plataform_name}
                  </span>
                  {serviceBadge?.label === 'Search Console' && quotaByConnection[connection.id] && (
                    <>
                      <span className={styles.separator}>•</span>
                      <span>
                        Quota: {quotaByConnection[connection.id]?.publish_quota_used ?? 0}/
                        {quotaByConnection[connection.id]?.publish_quota_limit ?? 0} indexações ·{' '}
                        {quotaByConnection[connection.id]?.inspection_quota_used ?? 0}/
                        {quotaByConnection[connection.id]?.inspection_quota_limit ?? 0} inspeções
                      </span>
                    </>
                  )}
                  {connection.last_used_at && (
                    <>
                      <span className={styles.separator}>•</span>
                        <span>Último uso: {formatDate(connection.last_used_at)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.cardActions}>
                  {needsReconnect(connection) && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleReconnect(connection)}
                      disabled={reconnectingConnectionId === connection.id}
                      isLoading={reconnectingConnectionId === connection.id}
                      leftIcon={reconnectingConnectionId !== connection.id ? <Link2 size={14} /> : undefined}
                    >
                      {reconnectingConnectionId === connection.id ? 'Reconectando...' : 'Reconectar'}
                    </Button>
                  )}
                  <button
                    className={styles.actionBtn}
                    title="Ver Histórico"
                    onClick={() => setLogsConnection(connection)}
                  >
                    <History size={16} />
                  </button>
                  <button
                    className={`${styles.actionBtn} ${refreshingConnectionId === connection.id ? styles.spinning : ''}`}
                    title="Atualizar Token"
                    onClick={() => handleRefreshToken(connection)}
                    disabled={refreshingConnectionId === connection.id || refreshTokenMutation.isPending}
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    className={styles.actionBtn}
                    title="Configurar"
                    onClick={() => setConfigureConnection(connection)}
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.danger}`}
                    title="Remover"
                    onClick={() => setDeleteTarget(connection)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Add Section */}
      <div className={styles.quickAddSection}>
        <h3 className={styles.sectionTitle}>Adicionar Conexão Rápida</h3>
        <div className={styles.quickAddGrid}>
          {platforms.map((platform) => (
            <button
              key={platform.id}
              className={styles.quickAddCard}
              onClick={() => {
                setSelectedPlatform(platform.id)
                setStep(1)
                setNewConnectionModal(true)
              }}
            >
              <div
                className={styles.quickAddIcon}
                style={{ background: `${platform.color}15` }}
              >
                <img
                  src={platform.id === 'meta' ? serviceIcons.meta : serviceIcons.ads}
                  alt=""
                  width={32}
                  height={32}
                />
              </div>
              <span className={styles.quickAddLabel}>{platform.label}</span>
              <ChevronRight size={20} className={styles.quickAddArrow} />
            </button>
          ))}
        </div>
      </div>

      {/* New Connection Modal */}
      <Modal
        isOpen={newConnectionModal}
        onClose={closeNewConnectionModal}
        title="Nova Conexão"
        size="md"
      >
        {renderNewConnectionStep()}
      </Modal>

      {/* Configure Connection Modal */}
      <Modal
        isOpen={!!configureConnection}
        onClose={() => setConfigureConnection(null)}
        title={`Configurar ${configureConnection?.connection_name || 'Conexão'}`}
        size="md"
      >
        {getConfigureModalContent()}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remover Conexão"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja remover a conexão{' '}
            <strong>{deleteTarget?.connection_name || 'esta conexão'}</strong>?
          </p>
          <p className={styles.deleteWarning}>
            Esta ação irá revogar o acesso e remover todos os dados associados.
          </p>
          <div className={styles.deleteActions}>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Connection Logs Modal */}
      <ConnectionLogsModal
        connection={logsConnection}
        isOpen={!!logsConnection}
        onClose={() => setLogsConnection(null)}
      />

      <ConfirmDialog />
    </div>
  )
}
