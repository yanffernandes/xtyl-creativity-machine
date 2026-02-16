import { useState, useCallback, useMemo } from 'react'
import {
  BarChart3,
  Settings,
  History,
  FileEdit,
  CheckCircle,
  XCircle,
  MinusCircle,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
  RotateCcw,
  Eye,
} from 'lucide-react'
import {
  Button,
  PageLayout,
  PageHeader,
  FilterBar,
  PageNav,
  EmptyState,
  Spinner,
  Select,
  PeriodSelector,
  type DateRange,
  getDefault30DayRange,
} from '@/shared/components'
import { SummaryCardsGrid, type CardConfig } from '@/shared/components/SummaryCardsGrid'
import { useDocumentTitle } from '@/shared/hooks'
import {
  useAutomationRules,
  useAutomationLogs,
  type AutomationLogsFilters,
} from '../api/automationQueries'
import { ExecutionLogDetail } from '../components/ExecutionLogDetail'
import { PlatformBadge } from '../components/PlatformBadge'
import styles from './AdsHistoryPage.module.css'
import type { ExecutionStatus, ExecutionLog } from '../types/automation'

// Navigation items for sub-pages
const NAV_ITEMS = [
  { to: '/ads', label: 'Performance', icon: <BarChart3 size={16} /> },
  { to: '/ads/drafts', label: 'Rascunhos', icon: <FileEdit size={16} /> },
  { to: '/ads/automations', label: 'Automações', icon: <Settings size={16} /> },
  { to: '/ads/history', label: 'Histórico', icon: <History size={16} /> },
]

const ITEMS_PER_PAGE = 20

// ============================================================================
// HELPERS
// ============================================================================

function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

function getStatusLabel(status: ExecutionStatus): string {
  const labels: Record<ExecutionStatus, string> = {
    completed: 'Concluída',
    partial: 'Parcial',
    failed: 'Falhou',
    skipped: 'Ignorada',
    rate_limited: 'Rate Limited',
  }
  return labels[status] || status
}

function getStatusBadgeClass(status: ExecutionStatus): string {
  switch (status) {
    case 'completed': return styles.statusCompleted
    case 'partial': return styles.statusPartial
    case 'failed': return styles.statusFailed
    case 'skipped': return styles.statusSkipped
    case 'rate_limited': return styles.statusRateLimited
    default: return styles.statusSkipped
  }
}

function getStatusIcon(status: ExecutionStatus) {
  switch (status) {
    case 'completed': return <CheckCircle size={14} />
    case 'partial': return <AlertCircle size={14} />
    case 'failed': return <XCircle size={14} />
    case 'skipped': return <MinusCircle size={14} />
    case 'rate_limited': return <Zap size={14} />
    default: return null
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AdsHistoryPage() {
  useDocumentTitle('Histórico | Central de Anúncios')

  // Filter state
  const [ruleFilter, setRuleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | 'all'>('all')
  const [dateRange, setDateRange] = useState<DateRange>(() => getDefault30DayRange())
  const [page, setPage] = useState(1)

  // Detail modal state
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

  // Fetch rules for the rule selector dropdown
  const { data: rulesData } = useAutomationRules({ limit: 100 })
  const allRules = rulesData?.rules ?? []

  // Build log query filters
  const logFilters: AutomationLogsFilters = useMemo(() => ({
    ruleId: ruleFilter !== 'all' ? ruleFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: ITEMS_PER_PAGE,
  }), [ruleFilter, statusFilter, page])

  // Fetch execution logs
  const { data: logsData, isLoading, error, refetch } = useAutomationLogs(logFilters)
  const logs = logsData?.logs ?? []
  const totalLogs = logsData?.total ?? 0
  const totalPages = Math.ceil(totalLogs / ITEMS_PER_PAGE) || 1

  // Find rule name by ruleId
  const getRuleName = useCallback((ruleId: string): string => {
    const rule = allRules.find(r => r.id === ruleId)
    return rule?.name ?? ruleId.slice(0, 8)
  }, [allRules])

  // Find rule platform by ruleId
  const getRulePlatform = useCallback((ruleId: string): 'meta' | 'google' | undefined => {
    const rule = allRules.find(r => r.id === ruleId)
    return rule?.platform
  }, [allRules])

  // Handlers
  const handleRuleFilterChange = useCallback((value: string) => {
    setRuleFilter(value)
    setPage(1)
  }, [])

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value as ExecutionStatus | 'all')
    setPage(1)
  }, [])

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range)
    setPage(1)
  }, [])

  const handleRowClick = useCallback((log: ExecutionLog) => {
    setSelectedLogId(log.id)
  }, [])

  // Summary cards
  const summaryCards: CardConfig[] = useMemo(() => {
    const completedCount = logs.filter(l => l.status === 'completed').length
    const partialCount = logs.filter(l => l.status === 'partial').length
    const failedCount = logs.filter(l => l.status === 'failed').length

    return [
      { icon: History, label: 'Total', value: String(totalLogs), color: '#3B82F6' },
      { icon: CheckCircle, label: 'Concluídas', value: String(completedCount), color: '#10B981' },
      { icon: AlertCircle, label: 'Parciais', value: String(partialCount), color: '#F59E0B' },
      { icon: XCircle, label: 'Falhou', value: String(failedCount), color: '#EF4444' },
    ]
  }, [logs, totalLogs])

  return (
    <PageLayout>
      {/* Header */}
      <PageHeader
        icon={<History size={24} />}
        title="Central de Anúncios"
        subtitle="Histórico de execuções das regras de automação"
      />

      {/* Sub-page Navigation */}
      <PageNav items={NAV_ITEMS} />

      {/* Filter Bar */}
      <FilterBar
        rightContent={
          <>
            <Select
              label=""
              value={ruleFilter}
              onChange={(e) => handleRuleFilterChange(e.target.value)}
              options={[
                { value: 'all', label: 'Todas as regras' },
                ...allRules.map(r => ({
                  value: r.id,
                  label: r.name,
                })),
              ]}
            />
            <Select
              label=""
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              options={[
                { value: 'all', label: 'Todos os status' },
                { value: 'completed', label: 'Concluída' },
                { value: 'partial', label: 'Parcial' },
                { value: 'failed', label: 'Falhou' },
                { value: 'skipped', label: 'Ignorada' },
                { value: 'rate_limited', label: 'Rate Limited' },
              ]}
            />
          </>
        }
      >
        <PeriodSelector value={dateRange} onChange={handleDateRangeChange} />
      </FilterBar>

      {/* Summary Cards */}
      {logs.length > 0 && (
        <SummaryCardsGrid cards={summaryCards} isLoading={isLoading} />
      )}

      {/* Content */}
      <div className={styles.content}>
        {/* Loading state */}
        {isLoading && logs.length === 0 && !error && (
          <div className={styles.loadingContainer}>
            <Spinner size="lg" />
            <p>Carregando histórico...</p>
          </div>
        )}

        {/* Error banner */}
        {error && !isLoading && (
          <div className={styles.errorBanner}>
            <div className={styles.errorBannerContent}>
              <AlertTriangle size={16} className={styles.errorBannerIcon} />
              <span>{error instanceof Error ? error.message : 'Erro ao carregar histórico. Tente novamente.'}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={() => refetch()}
            >
              Tentar Novamente
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && logs.length === 0 && !error && (
          <EmptyState
            icon={<History size={48} />}
            title="Nenhuma execução registrada"
            description={
              ruleFilter !== 'all' || statusFilter !== 'all'
                ? 'Nenhum log corresponde aos filtros selecionados. Tente ajustar os critérios.'
                : 'As execuções das suas regras de automação aparecerão aqui.'
            }
          />
        )}

        {/* Logs Table */}
        {!isLoading && logs.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Regra</th>
                  <th data-column-key="date">Executada em</th>
                  <th data-column-key="status">Status</th>
                  <th data-column-key="evaluated">Avaliadas</th>
                  <th data-column-key="matched">Filtradas</th>
                  <th data-column-key="affected">Afetadas</th>
                  <th data-column-key="errors">Erros</th>
                  <th data-column-key="duration">Duração</th>
                  <th data-column-key="actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const platform = getRulePlatform(log.ruleId)

                  return (
                    <tr
                      key={log.id}
                      className={styles.clickableRow}
                      onClick={() => handleRowClick(log)}
                    >
                      {/* Rule name + platform badge */}
                      <td>
                        <div className={styles.ruleCell}>
                          <span className={styles.ruleName}>{getRuleName(log.ruleId)}</span>
                          {platform && <PlatformBadge platform={platform} size="sm" />}
                        </div>
                      </td>

                      {/* Executed at */}
                      <td data-column-key="date">
                        <span className={styles.timestamp}>
                          <Clock size={12} />
                          {formatDateTime(log.executedAt)}
                        </span>
                      </td>

                      {/* Status */}
                      <td data-column-key="status">
                        <div className={`${styles.statusBadge} ${getStatusBadgeClass(log.status)}`}>
                          {getStatusIcon(log.status)}
                          <span>{getStatusLabel(log.status)}</span>
                        </div>
                      </td>

                      {/* Entities Evaluated */}
                      <td data-column-key="evaluated" className={styles.metricCell}>
                        {log.entitiesEvaluated}
                      </td>

                      {/* Entities Matched */}
                      <td data-column-key="matched" className={styles.metricCell}>
                        {log.entitiesMatchedConditions}
                      </td>

                      {/* Entities Affected */}
                      <td data-column-key="affected" className={styles.metricCell}>
                        <span className={log.entitiesAffected > 0 ? styles.affectedHighlight : ''}>
                          {log.entitiesAffected}
                        </span>
                      </td>

                      {/* Errors */}
                      <td data-column-key="errors" className={styles.metricCell}>
                        <span className={log.errorsCount > 0 ? styles.errorHighlight : ''}>
                          {log.errorsCount}
                        </span>
                      </td>

                      {/* Duration */}
                      <td data-column-key="duration">
                        <span className={styles.duration}>
                          {formatDuration(log.durationMs)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td data-column-key="actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLogId(log.id)
                          }}
                          leftIcon={<Eye size={14} />}
                          title="Ver detalhes"
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  leftIcon={<ChevronLeft size={16} />}
                >
                  Anterior
                </Button>
                <span className={styles.pageInfo}>
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  rightIcon={<ChevronRight size={16} />}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Loading overlay when refetching */}
        {isLoading && logs.length > 0 && (
          <div className={styles.loadingOverlay}>
            <Spinner size="sm" />
          </div>
        )}
      </div>

      {/* Execution Log Detail Modal */}
      {selectedLogId && (
        <ExecutionLogDetail
          logId={selectedLogId}
          isOpen={!!selectedLogId}
          onClose={() => setSelectedLogId(null)}
        />
      )}
    </PageLayout>
  )
}

export default AdsHistoryPage
