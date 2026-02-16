import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, Search, Play, Pause, Megaphone, Trash2, Edit, ExternalLink, FolderOpen, BarChart3, RefreshCw, Settings, History } from 'lucide-react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
// Dashboard components
import {
  useGoogleCampaigns as useGoogleCampaignMetrics,
  usePauseCampaign,
  useEnableCampaign,
  useUpdateBudget,
  useUpdateBid,
  useForceRefreshCampaigns,
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  useToggleAutomationRule,
  useActionHistory,
  useActionStats,
  useAdManagerConsolidatedMetrics,
} from '@/features/alvoads-google-dashboard/api'
import { CampaignTable, PeriodFilter, BudgetModal, BidModal, ConfirmActionModal, AutomationList, AutomationForm, TestAutomationModal } from '@/features/alvoads-google-dashboard/components'
import { useDashboardStore } from '@/features/alvoads-google-dashboard/stores/dashboardStore'
import type { CampaignMetrics, AutomationRule, CreateAutomationRuleInput, ActionLog, ActionLogStatus, ActionSource } from '@/features/alvoads-google-dashboard/types'
import { useConnections } from '@/features/connections/api/useConnections'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Button, Input, EmptyState, Spinner, showToast, Alert, Modal, Select, RowActionsMenu, type RowActionItem } from '@/shared/components'
import { Card, CardBody } from '@/shared/components/Card'
import { useColumnReorder, useColumnResize, useDocumentTitle } from '@/shared/hooks'
import styles from './AlvoAdsGooglePage.module.css'
import {
  useGoogleCampaigns,
  usePauseGoogleCampaign,
  useResumeGoogleCampaign,
  useDeleteGoogleCampaign,
  getNetworkType,
  getBudget,
  type GoogleCampaignTemplate,
} from '../api/useGoogleCampaigns'
import { CreationModeSelector } from '../components'
import { useGoogleAdsWizardStore } from '../stores/googleAdsWizardStore'
import type { CampaignCreationMode } from '../types/campaign'

type TabType = 'templates' | 'performance' | 'automations' | 'history'

// Action History helpers
const ACTION_TYPE_LABELS: Record<string, string> = {
  pause: 'Pausar',
  enable: 'Ativar',
  increase_budget: 'Aumentar orçamento',
  decrease_budget: 'Diminuir orçamento',
  update_budget: 'Alterar orçamento',
  increase_bid: 'Aumentar lance',
  decrease_bid: 'Diminuir lance',
  duplicate: 'Duplicar',
}

const STATUS_CONFIG: Record<ActionLogStatus, { label: string; className: string }> = {
  success: { label: 'Sucesso', className: 'success' },
  failed: { label: 'Falhou', className: 'error' },
  skipped: { label: 'Ignorada', className: 'warning' },
}

const SOURCE_LABELS: Record<ActionSource, string> = {
  manual: 'Manual',
  automation: 'Automação',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Helper to convert DashboardPeriod to date range
function getDateRangeFromPeriod(period: 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'custom'): { startDate: string; endDate: string } {
  const today = new Date()

  let startDate: string
  let endDate: string

  switch (period) {
    case 'today':
      startDate = today.toISOString().split('T')[0]
      endDate = startDate
      break
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      startDate = yesterday.toISOString().split('T')[0]
      endDate = startDate
      break
    case 'last_7d':
      endDate = today.toISOString().split('T')[0]
      const last7 = new Date(today)
      last7.setDate(last7.getDate() - 6)
      startDate = last7.toISOString().split('T')[0]
      break
    case 'last_30d':
      endDate = today.toISOString().split('T')[0]
      const last30 = new Date(today)
      last30.setDate(last30.getDate() - 29)
      startDate = last30.toISOString().split('T')[0]
      break
    default:
      // Default to last 7 days
      endDate = today.toISOString().split('T')[0]
      const defaultStart = new Date(today)
      defaultStart.setDate(defaultStart.getDate() - 6)
      startDate = defaultStart.toISOString().split('T')[0]
  }

  return { startDate, endDate }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function AlvoAdsGooglePage() {
  useDocumentTitle('AlvoAds Google')
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const workspaceId = useWorkspaceId()
  const resetWizard = useGoogleAdsWizardStore((state) => state.reset)
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [sortKey, setSortKey] = useState<'campaign' | 'status' | 'network' | 'budget' | 'created_at'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const tableRef = useRef<HTMLTableElement>(null)

  // Tab state - read from URL param or default to 'templates'
  const tabFromUrl = searchParams.get('tab') as TabType | null
  const validTab = tabFromUrl || 'templates'
  const [activeTab, setActiveTab] = useState<TabType>(validTab)

  // Update URL when tab changes
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'templates') {
      searchParams.delete('tab')
    } else {
      searchParams.set('tab', tab)
    }
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams])

  // Buscar campanhas reais da API (filtrado por workspace)
  const { data: campaignsData, isLoading, error } = useGoogleCampaigns()
  const pauseMutation = usePauseGoogleCampaign()
  const resumeMutation = useResumeGoogleCampaign()
  const deleteMutation = useDeleteGoogleCampaign()

  // Performance Dashboard state and hooks
  const { data: connectionsData } = useConnections()
  const googleConnections = useMemo(
    () => connectionsData?.filter(c => c.plataform_name === 'google') || [],
    [connectionsData]
  )
  const hasGoogleConnection = googleConnections.length > 0
  const selectedConnection = googleConnections[0] // Use first connection for now

  // Ad Manager connection for consolidated metrics
  const adManagerConnections = useMemo(() => {
    return (connectionsData?.filter((c) => {
      const metadata = c.metadata as { type?: string } | undefined
      const isAdManager =
        c.plataform_name === 'ad_manager' || // Legacy format
        (c.plataform_name === 'google' && metadata?.type === 'ad_manager') // New format
      return isAdManager && c.is_active
    }) || [])
  }, [connectionsData])
  const hasAdManagerConnection = adManagerConnections.length > 0
  const selectedAdManagerConnection = adManagerConnections[0]
  // Extract network ID from metadata (Ad Manager stores networks array in metadata)
  const adManagerMetadata = selectedAdManagerConnection?.metadata as { networks?: Array<{ id: string }> } | undefined
  const adManagerNetworkId = adManagerMetadata?.networks?.[0]?.id

  // Dashboard store
  const { filters, setPeriod } = useDashboardStore()
  const period = filters.period

  // Campaign metrics for performance tab - use workspaceId to fetch from all connections
  const {
    data: campaignMetrics,
    isLoading: isLoadingMetrics,
    error: metricsError,
    refetch: refetchMetrics
  } = useGoogleCampaignMetrics({
    workspaceId: workspaceId || undefined,
    period,
  })

  // Ad Manager consolidated metrics for performance tab
  const { startDate: adManagerStartDate, endDate: adManagerEndDate } = getDateRangeFromPeriod(period)
  const {
    data: adManagerMetrics,
  } = useAdManagerConsolidatedMetrics({
    connectionId: selectedAdManagerConnection?.id || '',
    networkId: adManagerNetworkId || '',
    startDate: adManagerStartDate,
    endDate: adManagerEndDate,
  })

  // Extract error message from API errors (objects with { message, statusCode })
  const errorMessage = metricsError
    ? (typeof metricsError === 'object' && 'message' in metricsError
        ? (metricsError as { message: string }).message
        : String(metricsError))
    : ''

  // Check if there are no campaigns (empty result from backend)
  const hasNoCampaigns = !isLoadingMetrics && !metricsError && campaignMetrics?.campaigns?.length === 0

  // Performance tab mutations
  const pauseCampaignMutation = usePauseCampaign()
  const enableCampaignMutation = useEnableCampaign()
  const updateBudgetMutation = useUpdateBudget()
  const updateBidMutation = useUpdateBid()
  const forceRefreshMutation = useForceRefreshCampaigns()

  // Performance tab modals state
  const [budgetModalCampaign, setBudgetModalCampaign] = useState<CampaignMetrics | null>(null)
  const [bidModalCampaign, setBidModalCampaign] = useState<CampaignMetrics | null>(null)
  const [confirmActionModal, setConfirmActionModal] = useState<{
    campaign: CampaignMetrics
    action: 'pause' | 'enable'
  } | null>(null)

  // Performance tab filters
  const [connectionFilter, setConnectionFilter] = useState<string>('all')

  // Filtered campaigns based on connection filter
  const filteredCampaignMetrics = useMemo(() => {
    if (!campaignMetrics?.campaigns) return []
    if (connectionFilter === 'all') return campaignMetrics.campaigns
    return campaignMetrics.campaigns.filter(c => c.connectionId === connectionFilter)
  }, [campaignMetrics?.campaigns, connectionFilter])

  // Get available connections from response for filter dropdown
  const availableConnections = campaignMetrics?.connections || []

  // Automations tab state
  const [automationViewMode, setAutomationViewMode] = useState<'list' | 'create' | 'edit'>('list')
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('')
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null)
  const [automationAlert, setAutomationAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Auto-select first Google connection for automations/history
  useEffect(() => {
    if (!selectedConnectionId && googleConnections.length > 0) {
      setSelectedConnectionId(googleConnections[0].id)
    }
  }, [googleConnections, selectedConnectionId])

  // Automation queries and mutations
  const {
    data: automationRules = [],
    isLoading: isLoadingRules,
    refetch: refetchRules,
  } = useAutomationRules({
    connectionId: selectedConnectionId || undefined,
  })

  const createAutomationMutation = useCreateAutomationRule()
  const updateAutomationMutation = useUpdateAutomationRule()
  const deleteAutomationMutation = useDeleteAutomationRule()
  const toggleAutomationMutation = useToggleAutomationRule()

  // History tab state
  const [historySourceFilter, setHistorySourceFilter] = useState<'all' | 'manual' | 'automation'>('all')
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('')
  const [historyStartDate, setHistoryStartDate] = useState<string>('')
  const [historyEndDate, setHistoryEndDate] = useState<string>('')
  const [historyPage, setHistoryPage] = useState(1)
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null)

  // History queries
  const {
    data: historyData,
    isLoading: isLoadingHistory,
  } = useActionHistory({
    connectionId: selectedConnectionId || undefined,
    source: historySourceFilter !== 'all' ? historySourceFilter : undefined,
    status: historyStatusFilter || undefined,
    startDate: historyStartDate || undefined,
    endDate: historyEndDate || undefined,
    page: historyPage,
    limit: 20,
  })

  const {
    data: historyStats,
    isLoading: isLoadingHistoryStats,
  } = useActionStats(selectedConnectionId, historyStartDate, historyEndDate)

  // Force refresh que invalida o cache do backend e busca dados novos da API
  const handleForceRefresh = useCallback(async () => {
    if (!workspaceId) return
    // Usa mutation com forceRefresh=true para ignorar cache do backend
    await forceRefreshMutation.mutateAsync({
      workspaceId,
      period,
    })
  }, [forceRefreshMutation, workspaceId, period])

  // Verificar se há mensagem de sucesso/warning do wizard e mostrar como toast
  useEffect(() => {
    if (location.state?.message) {
      const message = location.state.message
      const type = location.state.type || 'success'
      const warnings = location.state.warnings as string[] | undefined

      // Show toast based on type
      if (type === 'warning' && warnings && warnings.length > 0) {
        showToast.warning(message, {
          description: warnings.join('; '),
          duration: 10000,
        })
      } else if (type === 'success') {
        showToast.success(message)
      } else {
        showToast.info(message)
      }

      // Limpar o state para não mostrar novamente ao navegar
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const campaigns = campaignsData || []

  const handleCreateCampaign = () => {
    setShowModeSelector(true)
  }

  const handleModeSelect = (mode: CampaignCreationMode) => {
    setShowModeSelector(false)
    resetWizard()

    switch (mode) {
      case 'single':
        navigate('/alvoads-google/wizard')
        break
      case 'bulk_location':
        navigate('/alvoads-google/bulk/location')
        break
      case 'spreadsheet':
        navigate('/alvoads-google/import')
        break
      case 'duplicate':
        navigate('/alvoads-google/duplicate')
        break
    }
  }

  const handleCancelModeSelector = () => {
    setShowModeSelector(false)
  }

  const handleEditCampaign = (campaignId: string) => {
    navigate(`/alvoads-google/wizard?id=${campaignId}`)
  }

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await pauseMutation.mutateAsync(campaignId)
    } catch (error) {
      console.error('Erro ao pausar campanha:', error)
    }
  }

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      await resumeMutation.mutateAsync(campaignId)
    } catch (error) {
      console.error('Erro ao retomar campanha:', error)
    }
  }

  const handleDeleteCampaign = (campaignId: string, campaignName: string) => {
    setDeleteConfirm({ id: campaignId, name: campaignName })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      await deleteMutation.mutateAsync(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Erro ao excluir campanha:', error)
    }
  }

  // Performance tab handlers
  const handlePerformancePause = (campaign: CampaignMetrics) => {
    setConfirmActionModal({ campaign, action: 'pause' })
  }

  const handlePerformanceEnable = (campaign: CampaignMetrics) => {
    setConfirmActionModal({ campaign, action: 'enable' })
  }

  const handlePerformanceEditBudget = (campaign: CampaignMetrics) => {
    console.info('handlePerformanceEditBudget - campaign:', JSON.stringify(campaign, null, 2))
    console.info('handlePerformanceEditBudget - customerId:', campaign.customerId)
    setBudgetModalCampaign(campaign)
  }

  const handlePerformanceEditBid = (campaign: CampaignMetrics) => {
    setBidModalCampaign(campaign)
  }

  const handleConfirmPerformanceAction = async () => {
    if (!confirmActionModal || !selectedConnection) return

    const { campaign, action } = confirmActionModal
    try {
      if (action === 'pause') {
        await pauseCampaignMutation.mutateAsync({
          connectionId: selectedConnection.id,
          campaignId: campaign.id,
        })
        showToast.success(`Campanha "${campaign.name}" pausada com sucesso`)
      } else {
        await enableCampaignMutation.mutateAsync({
          connectionId: selectedConnection.id,
          campaignId: campaign.id,
        })
        showToast.success(`Campanha "${campaign.name}" ativada com sucesso`)
      }
      refetchMetrics()
    } catch (error) {
      console.error(`Erro ao ${action === 'pause' ? 'pausar' : 'ativar'} campanha:`, error)
      showToast.error(`Erro ao ${action === 'pause' ? 'pausar' : 'ativar'} campanha`)
    }
  }

  const handleConfirmBudgetChange = async (newBudget: number) => {
    if (!budgetModalCampaign || !selectedConnection) return

    // Warn if customer data is missing (may need a refresh)
    if (!budgetModalCampaign.customerId) {
      showToast.warning('Dados da campanha incompletos. Clique em Atualizar e tente novamente.')
      return
    }

    try {
      const result = await updateBudgetMutation.mutateAsync({
        connectionId: selectedConnection.id,
        campaignId: budgetModalCampaign.id,
        budgetId: budgetModalCampaign.budgetId,
        budget: newBudget,
        customerId: budgetModalCampaign.customerId,
        loginCustomerId: budgetModalCampaign.loginCustomerId,
      })
      if (result.success) {
        showToast.success(`Orçamento atualizado para R$ ${newBudget.toFixed(2)}`)
        refetchMetrics()
      } else {
        showToast.error(result.error || 'Erro ao atualizar orçamento')
      }
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error)
      const message = error instanceof Error ? error.message : 'Erro ao atualizar orçamento'
      showToast.error(message)
    }
  }

  const handleConfirmBidChange = async (newBid: number) => {
    if (!bidModalCampaign || !selectedConnection) return

    // Warn if customer data is missing (may need a refresh)
    if (!bidModalCampaign.customerId) {
      showToast.warning('Dados da campanha incompletos. Clique em Atualizar e tente novamente.')
      return
    }

    console.info('[handleConfirmBidChange] Starting bid update:', {
      campaignId: bidModalCampaign.id,
      newBid,
      customerId: bidModalCampaign.customerId,
    })

    try {
      const result = await updateBidMutation.mutateAsync({
        connectionId: selectedConnection.id,
        campaignId: bidModalCampaign.id,
        newBid,
        customerId: bidModalCampaign.customerId,
        loginCustomerId: bidModalCampaign.loginCustomerId,
      })
      console.info('[handleConfirmBidChange] API result:', result)
      if (result.success) {
        showToast.success(`Lance atualizado para R$ ${newBid.toFixed(2)}`)
        refetchMetrics()
      } else {
        showToast.error(result.error || 'Erro ao atualizar lance')
      }
    } catch (error) {
      console.error('Erro ao atualizar lance:', error)
      const message = error instanceof Error ? error.message : 'Erro ao atualizar lance'
      showToast.error(message)
    }
  }

  // Automation tab handlers
  const handleAutomationCreate = useCallback(() => {
    setSelectedRule(null)
    setAutomationViewMode('create')
  }, [])

  const handleAutomationEdit = useCallback((rule: AutomationRule) => {
    setSelectedRule(rule)
    setAutomationViewMode('edit')
  }, [])

  const handleAutomationCancel = useCallback(() => {
    setSelectedRule(null)
    setAutomationViewMode('list')
  }, [])

  const handleAutomationSubmit = useCallback(async (data: CreateAutomationRuleInput) => {
    try {
      if (selectedRule) {
        await updateAutomationMutation.mutateAsync({ ruleId: selectedRule.id, ...data })
        setAutomationAlert({ type: 'success', message: 'Automação atualizada com sucesso!' })
      } else {
        await createAutomationMutation.mutateAsync(data)
        setAutomationAlert({ type: 'success', message: 'Automação criada com sucesso!' })
      }
      setAutomationViewMode('list')
      setSelectedRule(null)
      refetchRules()
    } catch (error) {
      setAutomationAlert({
        type: 'error',
        message: `Erro ao ${selectedRule ? 'atualizar' : 'criar'} automação: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`,
      })
    }
  }, [selectedRule, createAutomationMutation, updateAutomationMutation, refetchRules])

  const handleAutomationDelete = useCallback(async (ruleId: string) => {
    try {
      await deleteAutomationMutation.mutateAsync(ruleId)
      setAutomationAlert({ type: 'success', message: 'Automação excluída com sucesso!' })
      refetchRules()
    } catch (error) {
      setAutomationAlert({
        type: 'error',
        message: `Erro ao excluir automação: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`,
      })
    }
  }, [deleteAutomationMutation, refetchRules])

  const handleAutomationToggle = useCallback(async (ruleId: string) => {
    try {
      await toggleAutomationMutation.mutateAsync(ruleId)
      refetchRules()
    } catch (error) {
      setAutomationAlert({
        type: 'error',
        message: `Erro ao alterar status da automação: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`,
      })
    }
  }, [toggleAutomationMutation, refetchRules])

  const handleAutomationTest = useCallback((ruleId: string) => {
    setTestingRuleId(ruleId)
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <span className={`${styles.badge} ${styles.active}`}>Publicada</span>
      case 'paused':
        return <span className={`${styles.badge} ${styles.paused}`}>Pausada</span>
      case 'draft':
        return <span className={`${styles.badge} ${styles.draft}`}>Rascunho</span>
      case 'failed':
        return <span className={`${styles.badge} ${styles.failed}`}>Erro</span>
      default:
        return <span className={styles.badge}>{status}</span>
    }
  }

  const getNetworkBadge = (network: string) => {
    switch (network) {
      case 'search':
        return <span className={`${styles.networkBadge} ${styles.search}`}>Pesquisa</span>
      case 'display':
        return <span className={`${styles.networkBadge} ${styles.display}`}>Display</span>
      default:
        return <span className={styles.networkBadge}>{network}</span>
    }
  }

  // Generate Google Ads campaign URL
  // Format: https://ads.google.com/aw/campaigns?campaignId={campaignId}&ocid={customerId}
  const getGoogleAdsUrl = (campaign: GoogleCampaignTemplate): string | null => {
    const { campaignId, customerId } = campaign.platform_ids || {}
    if (!campaignId || !customerId) return null

    // customerId should be without dashes (e.g., 1234567890)
    const cleanCustomerId = customerId.replace(/-/g, '')
    return `https://ads.google.com/aw/campaigns?campaignId=${campaignId}&ocid=${cleanCustomerId}`
  }

  const filteredCampaigns = campaigns.filter((c: GoogleCampaignTemplate) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleHeaderSort = useCallback((key: typeof sortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'))
        return prevKey
      }
      setSortDirection('desc')
      return key
    })
  }, [])

  const getSortIcon = useCallback(
    (key: typeof sortKey) => {
      if (sortKey !== key) {
        return <ArrowUpDown size={14} className={styles.sortIcon} />
      }
      return sortDirection === 'asc' ? (
        <ArrowUp size={14} className={styles.sortIconActive} />
      ) : (
        <ArrowDown size={14} className={styles.sortIconActive} />
      )
    },
    [sortDirection, sortKey]
  )

  const columns = useMemo(
    () => [
      { key: 'campaign', label: 'Campanha', sortable: true, sortKey: 'campaign', minWidth: 240, width: 320 },
      { key: 'status', label: 'Status', sortable: true, sortKey: 'status', minWidth: 140, width: 160 },
      { key: 'network', label: 'Rede', sortable: true, sortKey: 'network', minWidth: 140, width: 160 },
      { key: 'budget', label: 'Orcamento/dia', sortable: true, sortKey: 'budget', minWidth: 140, width: 160 },
      { key: 'created_at', label: 'Criada em', sortable: true, sortKey: 'created_at', minWidth: 150, width: 170 },
      { key: 'actions', label: 'Acoes', sortable: false, minWidth: 72, width: 72 },
    ],
    []
  )

  const columnMap = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns])

  const {
    columnOrder,
    setColumnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnReorder(columns.map((column) => column.key))

  useEffect(() => {
    setColumnOrder(columns.map((column) => column.key))
  }, [columns, setColumnOrder])

  const orderedColumns = useMemo(
    () =>
      columnOrder
        .map((key) => columnMap.get(key))
        .filter((column): column is (typeof columns)[number] => Boolean(column)),
    [columnMap, columnOrder]
  )

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    columns.forEach((column) => {
      widths[column.key] = column.width
    })
    return widths
  }, [columns])

  const { columnWidths, handleMouseDown, handleDoubleClick } = useColumnResize(
    initialWidths,
    tableRef,
    columns.map((column) => ({ key: column.key, minWidth: column.minWidth }))
  )

  const sortedCampaigns = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1

    return [...filteredCampaigns].sort((a, b) => {
      switch (sortKey) {
        case 'campaign': {
          const nameA = a.campaign_data?.name || a.name
          const nameB = b.campaign_data?.name || b.name
          return direction * nameA.localeCompare(nameB)
        }
        case 'status':
          return direction * a.status.localeCompare(b.status)
        case 'network': {
          const networkA = getNetworkType(a)
          const networkB = getNetworkType(b)
          return direction * networkA.localeCompare(networkB)
        }
        case 'budget':
          return direction * (Number(getBudget(a)) - Number(getBudget(b)))
        case 'created_at':
        default: {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return direction * (dateA - dateB)
        }
      }
    })
  }, [filteredCampaigns, sortDirection, sortKey])

  const buildCampaignActions = (campaign: GoogleCampaignTemplate): RowActionItem[] => {
    const items: RowActionItem[] = []
    const adsUrl = getGoogleAdsUrl(campaign)

    if (adsUrl) {
      items.push({
        label: 'Abrir no Google Ads',
        onSelect: () => window.open(adsUrl, '_blank', 'noopener,noreferrer'),
        icon: <ExternalLink size={16} />,
      })
    }

    if (campaign.status === 'draft') {
      items.push({
        label: 'Editar',
        onSelect: () => handleEditCampaign(campaign.id),
        icon: <Edit size={16} />,
      })
    }

    if (campaign.status === 'published') {
      items.push({
        label: 'Pausar',
        onSelect: () => handlePauseCampaign(campaign.id),
        icon: <Pause size={16} />,
        disabled: pauseMutation.isPending,
      })
    }

    if (campaign.status === 'paused') {
      items.push({
        label: 'Retomar',
        onSelect: () => handleResumeCampaign(campaign.id),
        icon: <Play size={16} />,
        disabled: resumeMutation.isPending,
      })
    }

    if (items.length > 0) {
      items.push({ type: 'separator' })
    }

    items.push({
      label: 'Excluir',
      onSelect: () => handleDeleteCampaign(campaign.id, campaign.name),
      icon: <Trash2 size={16} />,
      destructive: true,
      disabled: deleteMutation.isPending,
    })

    return items
  }

  const hasCampaigns = campaigns.length > 0

  // Stats calculados das campanhas
  const stats = {
    published: campaigns.filter((c: GoogleCampaignTemplate) => c.status === 'published').length,
    draft: campaigns.filter((c: GoogleCampaignTemplate) => c.status === 'draft').length,
    total: campaigns.length,
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Spinner size="lg" />
          <p>Carregando campanhas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className={styles.title}>AlvoAds Google</h1>
            <p className={styles.subtitle}>
              Crie e gerencie campanhas automatizadas no Google Ads
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={handleCreateCampaign}
        >
          Nova Campanha
        </Button>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'templates' ? styles.active : ''}`}
          onClick={() => handleTabChange('templates')}
        >
          <span className={styles.tabIcon}><FolderOpen size={16} /></span>
          Campanhas
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'performance' ? styles.active : ''}`}
          onClick={() => handleTabChange('performance')}
        >
          <span className={styles.tabIcon}><BarChart3 size={16} /></span>
          Performance
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'automations' ? styles.active : ''}`}
          onClick={() => handleTabChange('automations')}
        >
          <span className={styles.tabIcon}><Settings size={16} /></span>
          Automações
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => handleTabChange('history')}
        >
          <span className={styles.tabIcon}><History size={16} /></span>
          Histórico
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'templates' && (
          <>
            {/* Stats Cards - só mostra se tiver campanhas */}
            {hasCampaigns && (
              <section className={styles.statsSection}>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Total de Campanhas</span>
                    <span className={styles.statValue}>{stats.total}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Publicadas</span>
                    <span className={styles.statValue}>{stats.published}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Rascunhos</span>
                    <span className={styles.statValue}>{stats.draft}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Taxa de Publicação</span>
                    <span className={styles.statValue}>
                      {stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Error State */}
            {error && (
              <div className={styles.errorState}>
                <Alert variant="error">
                  Erro ao carregar campanhas. Tente novamente.
                </Alert>
              </div>
            )}

            {/* Campaigns Section */}
            <section className={styles.campaignsSection}>
        {hasCampaigns ? (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Campanhas</h2>
              <div className={styles.searchWrapper}>
                <Input
                  placeholder="Buscar campanhas..."
                  leftIcon={<Search size={16} />}
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="md"
                />
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table} ref={tableRef}>
                <thead>
                  <tr>
                    {orderedColumns.map((column) => {
                      const isSortable = column.sortable && column.sortKey
                      const columnWidth = columnWidths[column.key]

                      return (
                        <th
                          key={column.key}
                          data-column-key={column.key}
                          className={`${styles.th} ${styles.draggableHeader} ${
                            draggedColumn === column.key ? styles.draggingHeader : ''
                          } ${dragOverColumn === column.key ? styles.dragOverHeader : ''}`}
                          style={{ width: columnWidth || undefined }}
                          draggable
                          onDragStart={(e) => handleDragStart(column.key, e)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(column.key, e)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(column.key, e)}
                        >
                          <div className={styles.thContent}>
                            {isSortable ? (
                              <button
                                type="button"
                                className={styles.sortButton}
                                onClick={() => handleHeaderSort(column.sortKey as typeof sortKey)}
                              >
                                {column.label}
                                {getSortIcon(column.sortKey as typeof sortKey)}
                              </button>
                            ) : (
                              <span>{column.label}</span>
                            )}
                          </div>
                          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                          <div
                            className={styles.resizeHandle}
                            onMouseDown={(e) => handleMouseDown(column.key, e)}
                            onDoubleClick={(e) => handleDoubleClick(column.key, e)}
                          />
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaigns.map((campaign: GoogleCampaignTemplate) => (
                    <tr key={campaign.id}>
                      {orderedColumns.map((column) => {
                        const columnWidth = columnWidths[column.key]

                        if (column.key === 'campaign') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              <span className={styles.campaignName}>
                                {campaign.campaign_data?.name || campaign.name}
                              </span>
                              {campaign.platform_ids?.campaignId && (
                                <span className={styles.campaignId}>
                                  ID: {campaign.platform_ids.campaignId}
                                </span>
                              )}
                            </td>
                          )
                        }

                        if (column.key === 'status') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              {getStatusBadge(campaign.status)}
                            </td>
                          )
                        }

                        if (column.key === 'network') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              {getNetworkBadge(getNetworkType(campaign))}
                            </td>
                          )
                        }

                        if (column.key === 'budget') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              R$ {getBudget(campaign)}
                            </td>
                          )
                        }

                        if (column.key === 'created_at') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                            </td>
                          )
                        }

                        if (column.key === 'actions') {
                          return (
                            <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                              <div className={styles.actionsCell}>
                                <RowActionsMenu
                                  items={buildCampaignActions(campaign)}
                                  ariaLabel="Acoes da campanha"
                                />
                              </div>
                            </td>
                          )
                        }

                        return null
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCampaigns.length === 0 && searchQuery && (
              <div className={styles.emptyState}>
                <p>Nenhuma campanha encontrada para "{searchQuery}"</p>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<Megaphone size={48} />}
            title="Nenhuma campanha criada"
            description="Crie sua primeira campanha no Google Ads para começar a anunciar seus produtos e serviços."
            action={
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={handleCreateCampaign}
              >
                Criar primeira campanha
              </Button>
            }
          />
        )}
            </section>
          </>
        )}

        {activeTab === 'performance' && (
          <section className={styles.campaignsSection}>
            <div className={styles.performanceContent}>
              <div className={styles.performanceHeader}>
                <h2 className={styles.sectionTitle}>Performance das Campanhas</h2>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                  {availableConnections.length > 1 && (
                    <Select
                      value={connectionFilter}
                      onChange={(e) => setConnectionFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'Todas as contas' },
                        ...availableConnections.map(c => ({
                          value: c.id,
                          label: c.name,
                        })),
                      ]}
                    />
                  )}
                  <PeriodFilter period={period} onPeriodChange={setPeriod} />
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RefreshCw size={16} className={forceRefreshMutation.isPending ? styles.spinning : ''} />}
                    onClick={handleForceRefresh}
                    disabled={forceRefreshMutation.isPending}
                  >
                    {forceRefreshMutation.isPending ? 'Atualizando...' : 'Atualizar'}
                  </Button>
                </div>
              </div>

              {!hasGoogleConnection ? (
                <div className={styles.connectionWarning}>
                  <p>Conecte sua conta do Google Ads para ver métricas de performance.</p>
                  <Button variant="primary" onClick={() => navigate('/connections')}>
                    Conectar Google Ads
                  </Button>
                </div>
              ) : isLoadingMetrics ? (
                <div className={styles.loadingState}>
                  <Spinner size="lg" />
                  <p>Carregando métricas...</p>
                </div>
              ) : metricsError ? (
                <div className={styles.connectionWarning}>
                  <p>Erro ao carregar métricas de performance.</p>
                  <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                    {errorMessage || 'Tente novamente mais tarde.'}
                  </p>
                  <Button variant="secondary" onClick={handleForceRefresh} style={{ marginTop: 'var(--space-3)' }}>
                    Tentar Novamente
                  </Button>
                </div>
              ) : hasNoCampaigns ? (
                <div className={styles.connectionWarning}>
                  <p>Nenhuma campanha publicada encontrada.</p>
                  <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
                    As métricas de performance serão exibidas aqui quando você tiver campanhas publicadas no Google Ads.
                  </p>
                  <Button variant="primary" onClick={() => setShowModeSelector(true)} style={{ marginTop: 'var(--space-3)' }}>
                    Criar Campanha
                  </Button>
                </div>
              ) : (
                <>
                  <CampaignTable
                    campaigns={filteredCampaignMetrics}
                    onPause={handlePerformancePause}
                    onEnable={handlePerformanceEnable}
                    onEditBudget={handlePerformanceEditBudget}
                    onEditBid={handlePerformanceEditBid}
                    adManagerMetrics={adManagerMetrics?.byLandUri}
                    showAdManagerColumns={hasAdManagerConnection && !!adManagerMetrics?.byLandUri?.length}
                  />

                  {/* Ad Manager Summary Section */}
                  {hasAdManagerConnection && adManagerNetworkId && adManagerMetrics?.data && (
                    <div style={{ marginTop: 'var(--space-6)' }}>
                      <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--color-text-primary)' }}>
                        Resumo Ad Manager (USD)
                      </h3>
                      <div className={styles.statsGrid}>
                        <Card className={styles.statCard}>
                          <CardBody>
                            <span className={styles.statValue} style={{ color: 'var(--color-success)' }}>
                              ${adManagerMetrics.data.totalRevenue.toFixed(2)}
                            </span>
                            <span className={styles.statLabel}>Receita Total</span>
                          </CardBody>
                        </Card>
                        <Card className={styles.statCard}>
                          <CardBody>
                            <span className={styles.statValue}>
                              {adManagerMetrics.data.totalImpressions.toLocaleString('pt-BR')}
                            </span>
                            <span className={styles.statLabel}>Impressões</span>
                          </CardBody>
                        </Card>
                        <Card className={styles.statCard}>
                          <CardBody>
                            <span className={styles.statValue}>
                              {adManagerMetrics.data.totalClicks.toLocaleString('pt-BR')}
                            </span>
                            <span className={styles.statLabel}>Cliques</span>
                          </CardBody>
                        </Card>
                        <Card className={styles.statCard}>
                          <CardBody>
                            <span className={styles.statValue}>
                              ${adManagerMetrics.data.ecpm.toFixed(2)}
                            </span>
                            <span className={styles.statLabel}>eCPM</span>
                          </CardBody>
                        </Card>
                      </div>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-3)' }}>
                        💡 As colunas "Receita AM", "Impr. AM" e "eCPM AM" na tabela acima mostram os dados do Ad Manager correspondentes a cada campanha (match por nome).
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === 'automations' && (
          <section className={styles.campaignsSection}>
            {googleConnections.length === 0 ? (
              <div className={styles.connectionWarning}>
                <p>Conecte sua conta do Google Ads para criar automações.</p>
                <Button variant="primary" onClick={() => navigate('/connections')}>
                  Ir para Conexões
                </Button>
              </div>
            ) : (
              <>
                {/* Automation Header */}
                <div className={styles.performanceHeader}>
                  <h2 className={styles.sectionTitle}>
                    {automationViewMode === 'list' ? 'Automações' : automationViewMode === 'create' ? 'Nova Automação' : 'Editar Automação'}
                  </h2>
                </div>

                {/* Automation Alert */}
                {automationAlert && (
                  <Alert
                    variant={automationAlert.type}
                    onClose={() => setAutomationAlert(null)}
                    style={{ marginBottom: 'var(--space-4)' }}
                  >
                    {automationAlert.message}
                  </Alert>
                )}

                {/* Automation Content */}
                {automationViewMode === 'list' ? (
                  <AutomationList
                    rules={automationRules as AutomationRule[]}
                    isLoading={isLoadingRules}
                    onEdit={handleAutomationEdit}
                    onDelete={handleAutomationDelete}
                    onToggle={handleAutomationToggle}
                    onTest={handleAutomationTest}
                    onCreate={handleAutomationCreate}
                  />
                ) : (
                  <div>
                    <Button
                      variant="ghost"
                      onClick={handleAutomationCancel}
                      style={{ marginBottom: 'var(--space-4)' }}
                    >
                      ← Voltar
                    </Button>
                    <AutomationForm
                      connectionId={selectedConnectionId}
                      initialData={selectedRule || undefined}
                      onSubmit={handleAutomationSubmit}
                      onCancel={handleAutomationCancel}
                      isLoading={createAutomationMutation.isPending || updateAutomationMutation.isPending}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === 'history' && (
          <section className={styles.campaignsSection}>
            {googleConnections.length === 0 ? (
              <div className={styles.connectionWarning}>
                <p>Conecte sua conta do Google Ads para ver o histórico.</p>
                <Button variant="primary" onClick={() => navigate('/connections')}>
                  Ir para Conexões
                </Button>
              </div>
            ) : (
              <>
                {/* History Header */}
                <div className={styles.performanceHeader}>
                  <h2 className={styles.sectionTitle}>Histórico de Ações</h2>
                </div>

                {/* History Stats */}
                {historyStats && !isLoadingHistoryStats && (
                  <div className={styles.statsGrid} style={{ marginBottom: 'var(--space-4)' }}>
                    <Card className={styles.statCard}>
                      <CardBody>
                        <span className={styles.statValue}>{historyStats.totalActions}</span>
                        <span className={styles.statLabel}>Total de Ações</span>
                      </CardBody>
                    </Card>
                    <Card className={styles.statCard}>
                      <CardBody>
                        <span className={styles.statValue}>{historyStats.manualActions}</span>
                        <span className={styles.statLabel}>Ações Manuais</span>
                      </CardBody>
                    </Card>
                    <Card className={styles.statCard}>
                      <CardBody>
                        <span className={styles.statValue}>{historyStats.automatedActions}</span>
                        <span className={styles.statLabel}>Automações</span>
                      </CardBody>
                    </Card>
                    <Card className={styles.statCard}>
                      <CardBody>
                        <span className={styles.statValue} style={{ color: 'var(--color-success)' }}>
                          {(historyStats.successRate * 100).toFixed(1)}%
                        </span>
                        <span className={styles.statLabel}>Taxa de Sucesso</span>
                      </CardBody>
                    </Card>
                  </div>
                )}

                {/* History Filters */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                  <Select
                    value={historySourceFilter}
                    onChange={(e) => {
                      setHistorySourceFilter(e.target.value as 'all' | 'manual' | 'automation')
                      setHistoryPage(1)
                    }}
                    options={[
                      { value: 'all', label: 'Todas as fontes' },
                      { value: 'manual', label: 'Manual' },
                      { value: 'automation', label: 'Automação' },
                    ]}
                  />
                  <Select
                    value={historyStatusFilter}
                    onChange={(e) => {
                      setHistoryStatusFilter(e.target.value)
                      setHistoryPage(1)
                    }}
                    options={[
                      { value: '', label: 'Todos os status' },
                      { value: 'success', label: 'Sucesso' },
                      { value: 'failed', label: 'Falhou' },
                      { value: 'skipped', label: 'Ignorada' },
                    ]}
                  />
                  <Input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => {
                      setHistoryStartDate(e.target.value)
                      setHistoryPage(1)
                    }}
                    placeholder="Data inicial"
                    style={{ width: '160px' }}
                  />
                  <Input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => {
                      setHistoryEndDate(e.target.value)
                      setHistoryPage(1)
                    }}
                    placeholder="Data final"
                    style={{ width: '160px' }}
                  />
                </div>

                {/* History List */}
                {isLoadingHistory ? (
                  <div className={styles.loadingState}>
                    <Spinner size="lg" />
                    <p>Carregando histórico...</p>
                  </div>
                ) : (historyData?.actions || []).length === 0 ? (
                  <div className={styles.emptyState}>
                    <History size={48} />
                    <h3>Nenhuma ação encontrada</h3>
                    <p>Nenhuma ação corresponde aos filtros selecionados.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {(historyData?.actions || []).map((action: ActionLog) => {
                        const statusConfig = STATUS_CONFIG[action.status]
                        const isExpanded = expandedActionId === action.id
                        return (
                          <div
                            key={action.id}
                            style={{
                              background: 'var(--color-bg-secondary)',
                              borderRadius: 'var(--radius-md)',
                              overflow: 'hidden',
                            }}
                          >
                            <button
                              type="button"
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 'var(--space-3) var(--space-4)',
                                cursor: 'pointer',
                                width: '100%',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                              }}
                              onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                  <span className={`${styles.badge} ${styles[statusConfig.className]}`}>
                                    {statusConfig.label}
                                  </span>
                                  <span className={styles.badge}>
                                    {SOURCE_LABELS[action.source]}
                                  </span>
                                  <span style={{ fontWeight: 500 }}>
                                    {ACTION_TYPE_LABELS[action.action_type] || action.action_type}
                                  </span>
                                </div>
                                <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                  {action.google_campaign_name || action.google_campaign_id}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                                  {formatDate(action.executed_at)}
                                </span>
                                <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                  ▼
                                </span>
                              </div>
                            </button>
                            {isExpanded && (
                              <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                                {action.action_details && (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                    {action.action_details.previousValue !== undefined && (
                                      <div>
                                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>Valor anterior</span>
                                        <div style={{ fontWeight: 500 }}>
                                          {typeof action.action_details.previousValue === 'number'
                                            ? formatCurrency(action.action_details.previousValue)
                                            : action.action_details.previousValue}
                                        </div>
                                      </div>
                                    )}
                                    {action.action_details.newValue !== undefined && (
                                      <div>
                                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>Novo valor</span>
                                        <div style={{ fontWeight: 500 }}>
                                          {typeof action.action_details.newValue === 'number'
                                            ? formatCurrency(action.action_details.newValue)
                                            : action.action_details.newValue}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {action.error_message && (
                                  <div style={{ color: 'var(--color-error)', padding: 'var(--space-2)', background: 'var(--color-error-bg)', borderRadius: 'var(--radius-sm)' }}>
                                    <strong>Erro:</strong> {action.error_message}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Pagination */}
                    {historyData?.pagination && historyData.pagination.totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={historyPage === 1}
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        >
                          Anterior
                        </Button>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          Página {historyData.pagination.page} de {historyData.pagination.totalPages}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={historyPage === historyData.pagination.totalPages}
                          onClick={() => setHistoryPage((p) => p + 1)}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {/* Mode Selector Modal */}
      <CreationModeSelector
        isOpen={showModeSelector}
        onSelect={handleModeSelect}
        onCancel={handleCancelModeSelector}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir campanha"
        size="sm"
      >
        <p>
          Tem certeza que deseja excluir a campanha <strong>"{deleteConfirm?.name}"</strong>?
        </p>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
          Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            isLoading={deleteMutation.isPending}
          >
            Excluir
          </Button>
        </div>
      </Modal>

      {/* Performance Tab Modals */}
      {budgetModalCampaign && (
        <BudgetModal
          isOpen={!!budgetModalCampaign}
          onClose={() => setBudgetModalCampaign(null)}
          campaign={budgetModalCampaign}
          onConfirm={handleConfirmBudgetChange}
          isLoading={updateBudgetMutation.isPending}
        />
      )}

      {bidModalCampaign && (
        <BidModal
          isOpen={!!bidModalCampaign}
          onClose={() => setBidModalCampaign(null)}
          campaign={bidModalCampaign}
          currentBid={bidModalCampaign.maxBid || 1}
          onConfirm={handleConfirmBidChange}
          isLoading={updateBidMutation.isPending}
        />
      )}

      {confirmActionModal && (
        <ConfirmActionModal
          isOpen={!!confirmActionModal}
          onClose={() => setConfirmActionModal(null)}
          campaign={confirmActionModal.campaign}
          action={confirmActionModal.action}
          onConfirm={handleConfirmPerformanceAction}
          isLoading={pauseCampaignMutation.isPending || enableCampaignMutation.isPending}
        />
      )}

      {/* Automation Test Modal */}
      <TestAutomationModal
        rule={(automationRules as AutomationRule[]).find(r => r.id === testingRuleId) || null}
        isOpen={!!testingRuleId}
        onClose={() => setTestingRuleId(null)}
        onExecuted={refetchRules}
      />
    </div>
  )
}
