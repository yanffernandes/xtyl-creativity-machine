import { useState, useMemo, useId } from 'react'
import {
  Search,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RotateCcw,
  Ban,
  Trash2,
  TrendingUp,
  MessageSquare,
  List,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  PauseCircle,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFlows } from '@/features/flows/api/useFlows'
import { Input, Spinner, EmptyState, Alert, Modal, Button, SearchableSelect, Checkbox, MultiSelect } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './RunsPage.module.css'
import { useCancelRun, useRetryRun, useDeleteRun, useCreateRun, useUpdateRunMetrics, fetchSubscriberCounts } from '../api/mutations'
import { useActiveMetaPages } from '../api/useMetaPages'
import {
  useRuns,
  useRunStats,
  formatDuration,
  formatRunTime,
  calculateSuccessRate,
  calculateErrorRate,
  type RunStatus,
  type MessageRun,
} from '../api/useRuns'

const defaultStatusConfig = { label: 'Desconhecido', color: '#6B7280', bgColor: '#F3F4F6', icon: Clock }

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  queued: { label: 'Na fila', color: '#D97706', bgColor: '#FEF3C7', icon: Clock },
  running: { label: 'Executando', color: '#3B82F6', bgColor: '#DBEAFE', icon: Play },
  waiting: { label: 'Aguardando', color: '#8B5CF6', bgColor: '#EDE9FE', icon: PauseCircle },
  finished: { label: 'Concluído', color: '#059669', bgColor: '#D1FAE5', icon: CheckCircle },
  failed: { label: 'Falha', color: '#DC2626', bgColor: '#FEE2E2', icon: XCircle },
}

const getStatusConfig = (status: string) => statusConfig[status] || defaultStatusConfig

const statusFilters: Array<{ label: string; value: RunStatus | 'all' }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Na fila', value: 'queued' },
  { label: 'Executando', value: 'running' },
  { label: 'Aguardando', value: 'waiting' },
  { label: 'Concluídos', value: 'finished' },
  { label: 'Falhas', value: 'failed' },
]

interface DateRange {
  start: string
  end: string
}

export function RunsPage() {
  useDocumentTitle('Disparos')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RunStatus | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange>({
    start: '',
    end: '',
  })
  const [selectedRun, setSelectedRun] = useState<MessageRun | null>(null)
  const [expandedRuns, setExpandedRuns] = useState<Set<number>>(new Set())
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [runToDelete, setRunToDelete] = useState<MessageRun | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedFlowId, setSelectedFlowId] = useState<string>('')
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  // Modal filters
  const [pageSearchFilter, setPageSearchFilter] = useState('')
  const [connectionFilters, setConnectionFilters] = useState<string[]>([])
  const scheduledAtId = useId()

  // Queries
  const {
    data: runs = [],
    isLoading,
    error,
    refetch
  } = useRuns({
    search,
    status: statusFilter,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  })
  const { data: stats } = useRunStats()
  const { data: flows = [] } = useFlows({ status: 'active' })
  const { data: metaPages = [], isLoading: isLoadingPages } = useActiveMetaPages()

  // Get unique connections for filter dropdown
  const uniqueConnections = useMemo(() => {
    const connectionsMap = new Map<string, { id: string; name: string }>()
    metaPages.forEach(page => {
      if (page.connection?.id && page.connection?.connection_name) {
        connectionsMap.set(page.connection.id, {
          id: page.connection.id,
          name: page.connection.connection_name
        })
      }
    })
    return Array.from(connectionsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [metaPages])

  // Filter and deduplicate pages based on filters
  const filteredPages = useMemo(() => {
    let pages = [...metaPages]

    // If connection filters are set, show pages from selected connections (no dedup)
    if (connectionFilters.length > 0) {
      pages = pages.filter(p => p.connection?.id && connectionFilters.includes(p.connection.id))
    } else {
      // No connection filter: deduplicate by page_id, keeping most recent
      const pageMap = new Map<string, typeof pages[0]>()
      // Sort by created_at descending to get most recent first
      const sortedPages = [...pages].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      sortedPages.forEach(page => {
        if (!pageMap.has(page.page_id)) {
          pageMap.set(page.page_id, page)
        }
      })
      pages = Array.from(pageMap.values())
    }

    // Apply name search filter
    if (pageSearchFilter) {
      const searchLower = pageSearchFilter.toLowerCase()
      pages = pages.filter(p =>
        p.page_name.toLowerCase().includes(searchLower)
      )
    }

    // Sort alphabetically by name
    return pages.sort((a, b) => a.page_name.localeCompare(b.page_name))
  }, [metaPages, connectionFilters, pageSearchFilter])

  // Helper to get current datetime in local format for input
  const getCurrentDatetime = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const localDate = new Date(now.getTime() - offset * 60 * 1000)
    return localDate.toISOString().slice(0, 16)
  }

  // Initialize scheduledAt when modal opens
  const openCreateModal = () => {
    setScheduledAt(getCurrentDatetime())
    setSelectedPageIds([])
    setSelectedFlowId('')
    setPageSearchFilter('')
    setConnectionFilters([])
    setCreateModalOpen(true)
  }

  // Toggle page selection - uses page_id (Facebook ID) not id (UUID)
  const togglePageSelection = (facebookPageId: string) => {
    setSelectedPageIds(prev =>
      prev.includes(facebookPageId)
        ? prev.filter(id => id !== facebookPageId)
        : [...prev, facebookPageId]
    )
  }

  // Select/deselect all filtered pages
  const toggleAllFilteredPages = () => {
    const filteredIds = filteredPages.map(p => p.page_id)
    const allFilteredSelected = filteredIds.every(id => selectedPageIds.includes(id))

    if (allFilteredSelected) {
      // Deselect all filtered pages
      setSelectedPageIds(prev => prev.filter(id => !filteredIds.includes(id)))
    } else {
      // Select all filtered pages (add to existing selection)
      setSelectedPageIds(prev => {
        const newSelection = new Set(prev)
        filteredIds.forEach(id => newSelection.add(id))
        return Array.from(newSelection)
      })
    }
  }

  // Check if all filtered pages are selected
  const allFilteredSelected = filteredPages.length > 0 &&
    filteredPages.every(p => selectedPageIds.includes(p.page_id))

  // State for tracking which run is being updated
  const [updatingRunId, setUpdatingRunId] = useState<number | null>(null)

  // Mutations
  const createMutation = useCreateRun()
  const cancelMutation = useCancelRun()
  const retryMutation = useRetryRun()
  const deleteMutation = useDeleteRun()
  const updateMetricsMutation = useUpdateRunMetrics()

  const toggleExpanded = (runId: number) => {
    setExpandedRuns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(runId)) {
        newSet.delete(runId)
      } else {
        newSet.add(runId)
      }
      return newSet
    })
  }

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status)
    const Icon = config.icon
    return (
      <span
        className={styles.statusBadge}
        style={{ color: config.color, backgroundColor: config.bgColor }}
      >
        <Icon size={12} className={status === 'running' ? styles.spin : undefined} />
        {config.label}
      </span>
    )
  }

  const getFlowName = (run: MessageRun): string => {
    if (!run.flow) return 'Fluxo não encontrado'
    return run.flow.name
  }

  const handleCancel = async (run: MessageRun) => {
    try {
      await cancelMutation.mutateAsync(run.id)
    } catch (err) {
      console.error('Error cancelling run:', err)
    }
  }

  const handleRetry = async (run: MessageRun) => {
    try {
      await retryMutation.mutateAsync(run)
    } catch (err) {
      console.error('Error retrying run:', err)
    }
  }

  const handleDelete = async () => {
    if (!runToDelete) return
    try {
      await deleteMutation.mutateAsync(runToDelete.id)
      setDeleteModalOpen(false)
      setRunToDelete(null)
    } catch (err) {
      console.error('Error deleting run:', err)
    }
  }

  const openDeleteModal = (run: MessageRun) => {
    setRunToDelete(run)
    setDeleteModalOpen(true)
  }

  const handleUpdateMetrics = async (run: MessageRun) => {
    setUpdatingRunId(run.id)
    try {
      await updateMetricsMutation.mutateAsync(run.id)
    } catch (err) {
      console.error('Error updating run metrics:', err)
    } finally {
      setUpdatingRunId(null)
    }
  }

  const handleCreate = async () => {
    if (!selectedFlowId || selectedPageIds.length === 0) return
    setIsCreating(true)
    try {
      // Fetch subscriber counts for selected pages
      const subscriberCounts = await fetchSubscriberCounts(selectedPageIds)

      await createMutation.mutateAsync({
        flow_id: selectedFlowId,
        page_ids: selectedPageIds,
        start_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        total_subscribers_at_creation: subscriberCounts.total,
        active_subscribers_at_creation: subscriberCounts.active,
      })
      setCreateModalOpen(false)
      setSelectedFlowId('')
      setSelectedPageIds([])
      setScheduledAt('')
    } catch (err) {
      console.error('Error creating run:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const canCreateRun = selectedFlowId && selectedPageIds.length > 0

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <Play size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Disparos</h1>
            <p className={styles.subtitle}>Acompanhe a execução dos seus fluxos</p>
          </div>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={openCreateModal}>
          Novo disparo
        </Button>
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar execuções: {error.message}
        </Alert>
      )}

      {/* Search and Period Filter */}
      <div className={styles.searchRow}>
        <Input
          placeholder="Buscar por nome do fluxo..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          size="md"
        />
        <div className={styles.periodFilter}>
          <span className={styles.periodLabel}>Período:</span>
          <div className={styles.dateInputGroup}>
            <input
              type="date"
              className={styles.dateInput}
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <Calendar size={16} className={styles.calendarIcon} />
          </div>
          <span className={styles.periodSeparator}>até</span>
          <div className={styles.dateInputGroup}>
            <input
              type="date"
              className={styles.dateInput}
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
            <Calendar size={16} className={styles.calendarIcon} />
          </div>
          {(dateRange.start || dateRange.end) && (
            <button
              className={styles.clearDateBtn}
              onClick={() => setDateRange({ start: '', end: '' })}
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.stats}>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <TrendingUp size={24} />
          <div>
            <span className={styles.statValue}>{stats?.successRate ?? 0}%</span>
            <span className={styles.statLabel}>Taxa Média de Sucesso</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statMessages}`}>
          <MessageSquare size={24} />
          <div>
            <span className={styles.statValue}>{stats?.totalMessages ?? 0}</span>
            <span className={styles.statLabel}>Mensagens Enviadas</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statTotal}`}>
          <List size={24} />
          <div>
            <span className={styles.statValue}>{stats?.total ?? 0}</span>
            <span className={styles.statLabel}>Total de Runs</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statRunning}`}>
          <Play size={24} />
          <div>
            <span className={styles.statValue}>{stats?.running ?? 0}</span>
            <span className={styles.statLabel}>Em Execução</span>
          </div>
        </div>
      </div>

      {/* Status Filters */}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              className={`${styles.filterBtn} ${statusFilter === filter.value ? styles.active : ''}`}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button className={styles.refreshBtn} onClick={() => refetch()} title="Atualizar">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Runs List */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={<Play size={48} />}
          title="Nenhum disparo encontrado"
          description={
            search || statusFilter !== 'all' || dateRange.start || dateRange.end
              ? 'Tente ajustar os filtros'
              : 'Execute um fluxo para ver o histórico aqui'
          }
        />
      ) : (
        <div className={styles.list}>
          {runs.map((run) => {
            const isExpanded = expandedRuns.has(run.id)
            const successRate = calculateSuccessRate(run.success_count, run.total_messages)
            const errorRate = calculateErrorRate(run.failure_count, run.total_messages)
            const statusConf = getStatusConfig(run.status)

            return (
              <div
                key={run.id}
                className={styles.row}
                style={{ borderLeftColor: statusConf.color }}
              >
                <div className={styles.rowMain}>
                  {/* Left: Status + Info */}
                  <div className={styles.rowInfo}>
                    {getStatusBadge(run.status)}
                    <div className={styles.rowTitle}>
                      <span className={styles.flowName}>{getFlowName(run)}</span>
                      <span className={styles.runMeta}>
                        #{run.id} • {formatRunTime(run.start_at)}
                        {run.completed_at && ` • ${formatDuration(run.start_at, run.completed_at)}`}
                      </span>
                    </div>
                  </div>

                  {/* Pages */}
                  <div className={styles.rowPages}>
                    {run.pages && run.pages.length > 0 ? (
                      <>
                        <div className={styles.pagesAvatars}>
                          {run.pages.slice(0, 3).map((page, idx) => (
                            <div
                              key={page.page_id}
                              className={styles.pageAvatar}
                              style={{ zIndex: 3 - idx }}
                              title={page.page_name}
                            >
                              {page.image ? (
                                <>
                                  {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                                  <img
                                    src={page.image}
                                    alt={page.page_name}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      target.nextElementSibling?.classList.remove(styles.hidden)
                                    }}
                                  />
                                </>
                              ) : null}
                              <span className={`${styles.pageAvatarFallback} ${page.image ? styles.hidden : ''}`}>
                                {page.page_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          ))}
                          {run.pages.length > 3 && (
                            <div className={styles.pageAvatarMore} title={`+${run.pages.length - 3} páginas`}>
                              +{run.pages.length - 3}
                            </div>
                          )}
                        </div>
                        <span className={styles.pagesCount}>
                          {run.pages.length} {run.pages.length === 1 ? 'página' : 'páginas'}
                        </span>
                      </>
                    ) : (
                      <span className={styles.pagesCount}>
                        {run.page_ids?.length || 0} {(run.page_ids?.length || 0) === 1 ? 'página' : 'páginas'}
                      </span>
                    )}
                  </div>

                  {/* Center: Metrics */}
                  <div className={styles.rowMetrics}>
                    <div className={styles.metric} title="Enviadas com sucesso">
                      <CheckCircle size={14} className={styles.metricSuccess} />
                      <span>{run.success_count}</span>
                    </div>
                    <div className={styles.metric} title="Falhas">
                      <XCircle size={14} className={styles.metricError} />
                      <span>{run.failure_count}</span>
                    </div>
                    <div className={styles.metric} title="Na fila">
                      <Clock size={14} className={styles.metricPending} />
                      <span>{run.messages_in_queue}</span>
                    </div>
                    <div className={styles.metricTotal}>
                      {run.total_messages} mensagens
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className={styles.rowActions}>
                    <button
                      className={`${styles.actionBtn} ${updatingRunId === run.id ? styles.actionUpdating : ''}`}
                      onClick={() => handleUpdateMetrics(run)}
                      disabled={updatingRunId === run.id}
                      title="Atualizar métricas"
                    >
                      <RefreshCw size={16} className={updatingRunId === run.id ? styles.spin : undefined} />
                    </button>

                    <button
                      className={styles.actionBtn}
                      onClick={() => setSelectedRun(run)}
                      title="Ver detalhes"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      className={styles.actionBtn}
                      onClick={() => toggleExpanded(run.id)}
                      title={isExpanded ? 'Recolher' : 'Expandir'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {(run.status === 'queued' || run.status === 'running' || run.status === 'waiting') && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionCancel}`}
                        onClick={() => handleCancel(run)}
                        disabled={cancelMutation.isPending}
                        title="Cancelar"
                      >
                        <Ban size={16} />
                      </button>
                    )}

                    {run.status === 'failed' && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionRetry}`}
                        onClick={() => handleRetry(run)}
                        disabled={retryMutation.isPending}
                        title="Reexecutar"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}

                    {(run.status === 'finished' || run.status === 'failed') && (
                      <button
                        className={`${styles.actionBtn} ${styles.actionDelete}`}
                        onClick={() => openDeleteModal(run)}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className={styles.expandedDetails}>
                    <div className={styles.detailsGrid}>
                      <div className={styles.detailSection}>
                        <h4 className={styles.detailSectionTitle}>Audiência</h4>
                        <div className={styles.detailContent}>
                          <p>Total: {run.total_subscribers_at_creation}</p>
                          <p className={styles.textSuccess}>Ativos: {run.active_subscribers_at_creation}</p>
                          <p className={styles.textMuted}>
                            Inativos: {run.total_subscribers_at_creation - run.active_subscribers_at_creation}
                          </p>
                        </div>
                      </div>
                      <div className={styles.detailSection}>
                        <h4 className={styles.detailSectionTitle}>Taxas de entrega</h4>
                        <div className={styles.detailContent}>
                          <p className={styles.textSuccess}>Sucesso: {successRate}%</p>
                          <p className={styles.textDanger}>Erro: {errorRate}%</p>
                        </div>
                      </div>
                      {run.pages && run.pages.length > 0 && (
                        <div className={styles.detailSection}>
                          <h4 className={styles.detailSectionTitle}>Páginas ({run.pages.length})</h4>
                          <div className={styles.expandedPagesList}>
                            {run.pages.map((page) => (
                              <div key={page.page_id} className={styles.expandedPageItem}>
                                {page.image ? (
                                  <>
                                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                                    <img
                                      src={page.image}
                                      alt={page.page_name}
                                      className={styles.expandedPageImage}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        target.nextElementSibling?.classList.remove(styles.hidden)
                                      }}
                                    />
                                  </>
                                ) : null}
                                <span className={`${styles.expandedPageFallback} ${page.image ? styles.hidden : ''}`}>
                                  {page.page_name.charAt(0).toUpperCase()}
                                </span>
                                <span className={styles.expandedPageName}>{page.page_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Run Details Modal */}
      <Modal
        isOpen={!!selectedRun}
        onClose={() => setSelectedRun(null)}
        title="Detalhes da Execução"
        size="lg"
      >
        {selectedRun && (
          <div className={styles.detailsModal}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>ID:</span>
              <span className={styles.detailValue}>#{selectedRun.id}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fluxo:</span>
              <span className={styles.detailValue}>{getFlowName(selectedRun)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status:</span>
              <span className={styles.detailValue}>{getStatusBadge(selectedRun.status)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Início:</span>
              <span className={styles.detailValue}>{formatRunTime(selectedRun.start_at)}</span>
            </div>
            {selectedRun.completed_at && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Fim:</span>
                <span className={styles.detailValue}>
                  {formatRunTime(selectedRun.completed_at)}
                </span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Duração:</span>
              <span className={styles.detailValue}>
                {formatDuration(selectedRun.start_at, selectedRun.completed_at)}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Total de Mensagens:</span>
              <span className={styles.detailValue}>{selectedRun.total_messages}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Sucessos:</span>
              <span className={`${styles.detailValue} ${styles.textSuccess}`}>
                {selectedRun.success_count}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Falhas:</span>
              <span className={`${styles.detailValue} ${styles.textDanger}`}>
                {selectedRun.failure_count}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Na Fila:</span>
              <span className={styles.detailValue}>{selectedRun.messages_in_queue}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Assinantes (criação):</span>
              <span className={styles.detailValue}>
                {selectedRun.active_subscribers_at_creation} ativos / {selectedRun.total_subscribers_at_creation} total
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Páginas:</span>
              <span className={styles.detailValue}>
                {selectedRun.pages?.length || selectedRun.page_ids?.length || 0}
              </span>
            </div>
            {selectedRun.pages && selectedRun.pages.length > 0 && (
              <div className={styles.detailRowFull}>
                <span className={styles.detailLabel}>Lista de páginas:</span>
                <div className={styles.modalPagesList}>
                  {selectedRun.pages.map((page) => (
                    <div key={page.page_id} className={styles.modalPageItem}>
                      {page.image ? (
                        <>
                          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                          <img
                            src={page.image}
                            alt={page.page_name}
                            className={styles.modalPageImage}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              target.nextElementSibling?.classList.remove(styles.hidden)
                            }}
                          />
                        </>
                      ) : null}
                      <span className={`${styles.modalPageFallback} ${page.image ? styles.hidden : ''}`}>
                        {page.page_name.charAt(0).toUpperCase()}
                      </span>
                      <span className={styles.modalPageName}>{page.page_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedRun.error_summary && Object.keys(selectedRun.error_summary).length > 0 && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Erros:</span>
                <pre className={styles.errorSummary}>
                  {JSON.stringify(selectedRun.error_summary, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setRunToDelete(null)
        }}
        title="Excluir Execução"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>Tem certeza que deseja excluir esta execução?</p>
          <p className={styles.deleteWarning}>Esta ação não pode ser desfeita.</p>
          <div className={styles.deleteActions}>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false)
                setRunToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Run Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setSelectedFlowId('')
          setSelectedPageIds([])
          setScheduledAt('')
          setPageSearchFilter('')
          setConnectionFilters([])
        }}
        title="Novo disparo"
        size="md"
      >
        <div className={styles.createForm}>
          {/* DateTime Picker */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor={scheduledAtId}>Data e horário do disparo</label>
            <input
              id={scheduledAtId}
              type="datetime-local"
              className={styles.datetimeInput}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className={styles.formHint}>
              Deixe o horário atual para disparar imediatamente
            </p>
          </div>

          {/* Pages Multi-Select */}
          <div className={styles.formGroup}>
            <span className={styles.formLabel}>Páginas para disparo</span>

            {/* Filters row */}
            {metaPages.length > 0 && (
              <div className={styles.pagesFilters}>
                <Input
                  placeholder="Buscar página..."
                  leftIcon={<Search size={16} />}
                  value={pageSearchFilter}
                  onChange={(e) => setPageSearchFilter(e.target.value)}
                  className={styles.pageSearchWrapper}
                  size="md"
                />
                <MultiSelect
                  options={uniqueConnections.map((conn) => ({
                    value: conn.id,
                    label: conn.name,
                  }))}
                  value={connectionFilters}
                  onChange={setConnectionFilters}
                  placeholder="Todas as conexões"
                  searchPlaceholder="Buscar conexão..."
                  showSelectAll
                  selectAllLabel="Selecionar todas"
                  deselectAllLabel="Desmarcar todas"
                  className={styles.connectionFilterMultiSelect}
                  size="md"
                />
              </div>
            )}

            <div className={styles.pagesSelect}>
              {isLoadingPages ? (
                <div className={styles.noPagesMessage}>
                  <Spinner size="sm" />
                </div>
              ) : metaPages.length === 0 ? (
                <div className={styles.noPagesMessage}>
                  Nenhuma página ativa encontrada.{' '}
                  <Link to="/connections">Configure suas conexões</Link> primeiro.
                </div>
              ) : filteredPages.length === 0 ? (
                <div className={styles.noPagesMessage}>
                  Nenhuma página encontrada com os filtros aplicados.
                </div>
              ) : (
                <>
                  <div className={styles.pagesSelectHeader}>
                    <span className={styles.pagesSelectCount}>
                      {selectedPageIds.length} selecionada(s)
                      {(pageSearchFilter || connectionFilters.length > 0) && (
                        <span className={styles.filteredCount}>
                          {' '}• {filteredPages.length} exibida(s)
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className={styles.selectAllBtn}
                      onClick={toggleAllFilteredPages}
                    >
                      {allFilteredSelected ? 'Desmarcar exibidas' : 'Selecionar exibidas'}
                    </button>
                  </div>
                  <div className={styles.pagesList}>
                    {filteredPages.map((page) => (
                      <div
                        key={page.id}
                        className={`${styles.pageItem} ${selectedPageIds.includes(page.page_id) ? styles.selected : ''}`}
                        onClick={() => togglePageSelection(page.page_id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            togglePageSelection(page.page_id)
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selectedPageIds.includes(page.page_id)}
                      >
                        <Checkbox
                          checked={selectedPageIds.includes(page.page_id)}
                          onChange={() => togglePageSelection(page.page_id)}
                          className={styles.pageCheckbox}
                        />
                        {page.image ? (
                          <>
                            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                            <img
                              src={page.image}
                              alt={page.page_name}
                              className={styles.pageImage}
                              onError={(e) => {
                                // Fallback to placeholder on image load error
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.nextElementSibling?.classList.remove(styles.hidden)
                              }}
                            />
                          </>
                        ) : null}
                        <div className={`${styles.pageImagePlaceholder} ${page.image ? styles.hidden : ''}`}>
                          <ImageIcon size={20} />
                        </div>
                        <div className={styles.pageInfo}>
                          <span className={styles.pageName}>{page.page_name}</span>
                          <span className={styles.pageConnection}>
                            <LinkIcon size={10} />
                            {page.connection?.connection_name || 'Conexão não encontrada'}
                          </span>
                        </div>
                        <span className={`${styles.pageStatus} ${page.is_active ? styles.pageStatusActive : styles.pageStatusInactive}`}>
                          {page.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Flow Select */}
          <div className={styles.formGroup}>
            <SearchableSelect
              label="Fluxo de mensagens"
              options={flows.map((flow) => ({ value: flow.id, label: flow.name }))}
              value={selectedFlowId}
              onChange={setSelectedFlowId}
              placeholder="Selecione um fluxo..."
              searchPlaceholder="Buscar fluxo..."
              emptyMessage="Nenhum fluxo ativo encontrado. Crie e ative um fluxo primeiro."
              noResultsMessage="Nenhum fluxo encontrado"
              fullWidth
            />
          </div>

          <div className={styles.createActions}>
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false)
                setSelectedFlowId('')
                setSelectedPageIds([])
                setScheduledAt('')
                setPageSearchFilter('')
                setConnectionFilters([])
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              isLoading={isCreating}
              disabled={!canCreateRun || isCreating}
            >
              Criar disparo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
