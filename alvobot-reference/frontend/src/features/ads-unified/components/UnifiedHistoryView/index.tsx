/**
 * UnifiedHistoryView Component
 * T051: Displays unified action history from connected ad platforms
 *
 * Shows a filterable list of actions taken on campaigns across platforms.
 */

import { useState, useCallback, useMemo } from 'react'
import {
  History,
  CheckCircle,
  XCircle,
  MinusCircle,
  User,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Button, Spinner, EmptyState } from '@/shared/components'
import { HistoryFilters } from '../HistoryFilters'
import { PlatformBadge } from '../PlatformBadge'
import styles from './UnifiedHistoryView.module.css'
import type {
  AdsPlatform,
  UnifiedActionLog,
  ActionSource,
  ActionStatus,
  ActionType,
} from '../../types'

// ============================================
// Types
// ============================================

interface UnifiedHistoryViewProps {
  actions: UnifiedActionLog[]
  pagination: {
    page: number
    totalPages: number
    total: number
  }
  isLoading: boolean
  error?: Error | null
  selectedPlatforms: AdsPlatform[]
  onFilterChange: (filters: {
    source?: ActionSource | ''
    status?: ActionStatus | ''
    startDate?: string
    endDate?: string
  }) => void
  onPageChange: (page: number) => void
}

// ============================================
// Utility Functions
// ============================================

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

function getActionTypeLabel(actionType: ActionType): string {
  const labels: Record<ActionType, string> = {
    pause: 'Pausar campanha',
    enable: 'Ativar campanha',
    budget_change: 'Alterar orçamento',
    bid_change: 'Alterar lance',
  }
  return labels[actionType] || actionType
}

function getStatusIcon(status: ActionStatus) {
  switch (status) {
    case 'success':
      return <CheckCircle size={16} className={styles.statusSuccess} />
    case 'failed':
      return <XCircle size={16} className={styles.statusFailed} />
    case 'skipped':
      return <MinusCircle size={16} className={styles.statusSkipped} />
    default:
      return null
  }
}

function getStatusLabel(status: ActionStatus): string {
  const labels: Record<ActionStatus, string> = {
    success: 'Sucesso',
    failed: 'Falhou',
    skipped: 'Ignorado',
  }
  return labels[status] || status
}

function getSourceIcon(source: ActionSource) {
  switch (source) {
    case 'manual':
      return <User size={14} className={styles.sourceIcon} />
    case 'automation':
      return <Settings size={14} className={styles.sourceIcon} />
    default:
      return null
  }
}

function getSourceLabel(source: ActionSource): string {
  return source === 'manual' ? 'Manual' : 'Automação'
}

function formatCurrency(value?: number): string {
  if (value === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// ============================================
// Component
// ============================================

export function UnifiedHistoryView({
  actions,
  pagination,
  isLoading,
  error,
  selectedPlatforms,
  onFilterChange,
  onPageChange,
}: UnifiedHistoryViewProps) {
  // Filter state
  const [source, setSource] = useState<ActionSource | ''>('')
  const [status, setStatus] = useState<ActionStatus | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Handle filter changes
  const handleSourceChange = useCallback(
    (value: ActionSource | '') => {
      setSource(value)
      onFilterChange({ source: value, status, startDate, endDate })
    },
    [status, startDate, endDate, onFilterChange]
  )

  const handleStatusChange = useCallback(
    (value: ActionStatus | '') => {
      setStatus(value)
      onFilterChange({ source, status: value, startDate, endDate })
    },
    [source, startDate, endDate, onFilterChange]
  )

  const handleStartDateChange = useCallback(
    (value: string) => {
      setStartDate(value)
      onFilterChange({ source, status, startDate: value, endDate })
    },
    [source, status, endDate, onFilterChange]
  )

  const handleEndDateChange = useCallback(
    (value: string) => {
      setEndDate(value)
      onFilterChange({ source, status, startDate, endDate: value })
    },
    [source, status, startDate, onFilterChange]
  )

  // Toggle row expansion
  const toggleRowExpansion = useCallback((actionId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(actionId)) {
        newSet.delete(actionId)
      } else {
        newSet.add(actionId)
      }
      return newSet
    })
  }, [])

  // Summary stats
  const stats = useMemo(() => {
    return {
      total: pagination.total,
      success: actions.filter((a) => a.status === 'success').length,
      failed: actions.filter((a) => a.status === 'failed').length,
      skipped: actions.filter((a) => a.status === 'skipped').length,
    }
  }, [actions, pagination.total])

  // Loading state
  if (isLoading && actions.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p>Carregando histórico...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h3>Erro ao carregar histórico</h3>
        <p>{error.message}</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Histórico de Ações</h2>
        {pagination.total > 0 && (
          <span className={styles.totalCount}>{pagination.total} ações registradas</span>
        )}
      </div>

      {/* Filters */}
      <HistoryFilters
        source={source}
        status={status}
        startDate={startDate}
        endDate={endDate}
        selectedPlatforms={selectedPlatforms}
        onSourceChange={handleSourceChange}
        onStatusChange={handleStatusChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
      />

      {/* Summary Stats */}
      {actions.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryValue}>{stats.total}</span>
            <span className={styles.summaryLabel}>Total</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryValue} ${styles.success}`}>{stats.success}</span>
            <span className={styles.summaryLabel}>Sucesso</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryValue} ${styles.failed}`}>{stats.failed}</span>
            <span className={styles.summaryLabel}>Falhou</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryValue} ${styles.skipped}`}>{stats.skipped}</span>
            <span className={styles.summaryLabel}>Ignorado</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {actions.length === 0 && !isLoading && (
        <EmptyState
          icon={<History size={48} />}
          title="Nenhuma ação registrada"
          description={
            selectedPlatforms.length === 1
              ? `Ações realizadas nas campanhas do ${selectedPlatforms[0] === 'google' ? 'Google Ads' : 'Meta Ads'} aparecerão aqui.`
              : 'Ações realizadas nas suas campanhas aparecerão aqui.'
          }
        />
      )}

      {/* Actions List */}
      {actions.length > 0 && (
        <div className={styles.actionsList}>
          {actions.map((action) => {
            const isExpanded = expandedRows.has(action.id)
            const hasDetails = action.details || action.errorMessage

            return (
              <div
                key={action.id}
                className={`${styles.actionCard} ${styles[action.status]}`}
              >
                <button
                  type="button"
                  className={styles.actionMain}
                  onClick={() => toggleRowExpansion(action.id)}
                  disabled={!hasDetails}
                >
                  <div className={styles.actionHeader}>
                    <div className={styles.actionInfo}>
                      <PlatformBadge platform={action.platform} size="sm" />
                      <div className={styles.statusBadge}>
                        {getStatusIcon(action.status)}
                        <span>{getStatusLabel(action.status)}</span>
                      </div>
                      <div className={styles.sourceBadge}>
                        {getSourceIcon(action.source)}
                        <span>{getSourceLabel(action.source)}</span>
                      </div>
                    </div>
                    <div className={styles.actionMeta}>
                      <span className={styles.timestamp}>{formatDate(action.executedAt)}</span>
                      {hasDetails && (
                        <span className={styles.expandButton} aria-hidden="true">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.actionBody}>
                    <span className={styles.actionType}>{getActionTypeLabel(action.actionType)}</span>
                    <span className={styles.campaignName}>{action.campaignName}</span>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && hasDetails && (
                  <div className={styles.actionDetails}>
                    {action.details && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Valor anterior:</span>
                        <span className={styles.detailValue}>
                          {formatCurrency(action.details.previousValue)}
                        </span>
                        <span className={styles.detailArrow}>→</span>
                        <span className={styles.detailLabel}>Novo valor:</span>
                        <span className={styles.detailValue}>
                          {formatCurrency(action.details.newValue)}
                        </span>
                      </div>
                    )}
                    {action.errorMessage && (
                      <div className={styles.errorDetail}>
                        <AlertCircle size={14} />
                        <span>{action.errorMessage}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft size={16} />
            Anterior
          </Button>
          <span className={styles.pageInfo}>
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Próxima
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Loading overlay when refetching */}
      {isLoading && actions.length > 0 && (
        <div className={styles.loadingOverlay}>
          <Spinner size="sm" />
        </div>
      )}
    </div>
  )
}

export default UnifiedHistoryView
