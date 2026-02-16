/**
 * ActionHistoryPage
 * T073-T078: Main page for viewing action history
 */

import { useState, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useConnections } from '@/features/connections/api/useConnections'
import { Button, Select, Spinner, Input } from '@/shared/components'
import { Card, CardBody } from '@/shared/components/Card'
import { useActionHistory, useActionStats } from '../api'
import styles from './ActionHistoryPage.module.css'
import type { ActionLog, ActionLogStatus, ActionSource } from '../types'

// Action type labels
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

// Status labels and colors
const STATUS_CONFIG: Record<ActionLogStatus, { label: string; className: string }> = {
  success: { label: 'Sucesso', className: 'success' },
  failed: { label: 'Falhou', className: 'error' },
  skipped: { label: 'Ignorada', className: 'warning' },
}

// Source labels
const SOURCE_LABELS: Record<ActionSource, string> = {
  manual: 'Manual',
  automation: 'Automação',
}

// Format date for display
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

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

type SourceFilter = 'all' | 'manual' | 'automation'

const sourceFilterValues = new Set<SourceFilter>(['all', 'manual', 'automation'])

const parseSourceFilter = (value: string | null): SourceFilter => {
  if (value && sourceFilterValues.has(value as SourceFilter)) {
    return value as SourceFilter
  }
  return 'all'
}

export function ActionHistoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    searchParams.get('connectionId') || ''
  )
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(
    parseSourceFilter(searchParams.get('source'))
  )
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') || ''
  )
  const [startDate, setStartDate] = useState<string>(
    searchParams.get('startDate') || ''
  )
  const [endDate, setEndDate] = useState<string>(
    searchParams.get('endDate') || ''
  )
  const [page, setPage] = useState(1)
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null)

  // Queries
  const { data: connections = [], isLoading: isLoadingConnections } = useConnections()
  const googleConnections = connections.filter((c) => c.plataform_name === 'google')

  // Auto-select first connection if none selected
  if (!selectedConnectionId && googleConnections.length > 0 && !isLoadingConnections) {
    setSelectedConnectionId(googleConnections[0].id)
  }

  const {
    data: historyData,
    isLoading: isLoadingHistory,
  } = useActionHistory({
    connectionId: selectedConnectionId || undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    status: statusFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit: 20,
  })

  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useActionStats(selectedConnectionId, startDate, endDate)

  // Handlers
  const handleConnectionChange = useCallback((connectionId: string) => {
    setSelectedConnectionId(connectionId)
    setPage(1)
    setSearchParams((prev) => {
      prev.set('connectionId', connectionId)
      return prev
    })
  }, [setSearchParams])

  const handleFilterChange = useCallback((key: string, value: string) => {
    setPage(1)
    setSearchParams((prev) => {
      if (value) {
        prev.set(key, value)
      } else {
        prev.delete(key)
      }
      return prev
    })
  }, [setSearchParams])

  // Loading state
  if (isLoadingConnections) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <p>Carregando conexões...</p>
      </div>
    )
  }

  // No Google connections
  if (googleConnections.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyConnections}>
          <h2>Nenhuma conexão Google encontrada</h2>
          <p>
            Você precisa conectar uma conta Google Ads para ver o histórico de ações.
          </p>
          <Button onClick={() => navigate('/connections')}>
            Ir para Conexões
          </Button>
        </div>
      </div>
    )
  }

  const actions = historyData?.actions || []
  const pagination = historyData?.pagination

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/alvoads-google')} leftIcon={<ArrowLeft size={16} />}>
            Voltar
          </Button>
          <h1 className={styles.title}>Histórico de Ações</h1>
          <p className={styles.subtitle}>
            Visualize todas as ações executadas em suas campanhas
          </p>
        </div>

        <div className={styles.headerRight}>
          <Select
            value={selectedConnectionId}
            onChange={(e) => handleConnectionChange(e.target.value)}
            options={googleConnections.map((c) => ({
              value: c.id,
              label: c.connection_name || `Conta Google ${c.id.slice(0, 8)}`,
            }))}
            className={styles.connectionSelect}
          />
        </div>
      </div>

      {/* Stats Cards */}
      {stats && !isLoadingStats && (
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <CardBody>
              <div className={styles.statValue}>{stats.totalActions}</div>
              <div className={styles.statLabel}>Total de Ações</div>
            </CardBody>
          </Card>
          <Card className={styles.statCard}>
            <CardBody>
              <div className={styles.statValue}>{stats.manualActions}</div>
              <div className={styles.statLabel}>Ações Manuais</div>
            </CardBody>
          </Card>
          <Card className={styles.statCard}>
            <CardBody>
              <div className={styles.statValue}>{stats.automatedActions}</div>
              <div className={styles.statLabel}>Automações</div>
            </CardBody>
          </Card>
          <Card className={styles.statCard}>
            <CardBody>
              <div className={`${styles.statValue} ${styles.successRate}`}>
                {(stats.successRate * 100).toFixed(1)}%
              </div>
              <div className={styles.statLabel}>Taxa de Sucesso</div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <Select
            value={sourceFilter}
            onChange={(e) => {
              const nextValue = parseSourceFilter(e.target.value)
              setSourceFilter(nextValue)
              handleFilterChange('source', e.target.value)
            }}
            options={[
              { value: 'all', label: 'Todas as fontes' },
              { value: 'manual', label: 'Manual' },
              { value: 'automation', label: 'Automação' },
            ]}
          />
        </div>
        <div className={styles.filterGroup}>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              handleFilterChange('status', e.target.value)
            }}
            options={[
              { value: '', label: 'Todos os status' },
              { value: 'success', label: 'Sucesso' },
              { value: 'failed', label: 'Falhou' },
              { value: 'skipped', label: 'Ignorada' },
            ]}
          />
        </div>
        <div className={styles.filterGroup}>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              handleFilterChange('startDate', e.target.value)
            }}
            placeholder="Data inicial"
          />
        </div>
        <div className={styles.filterGroup}>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              handleFilterChange('endDate', e.target.value)
            }}
            placeholder="Data final"
          />
        </div>
      </div>

      {/* Action List */}
      <div className={styles.content}>
        {isLoadingHistory ? (
          <div className={styles.loading}>
            <Spinner size="lg" />
            <p>Carregando histórico...</p>
          </div>
        ) : actions.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3>Nenhuma ação encontrada</h3>
            <p>Nenhuma ação corresponde aos filtros selecionados.</p>
          </div>
        ) : (
          <>
            <div className={styles.actionList}>
              {actions.map((action) => (
                <ActionRow
                  key={action.id}
                  action={action}
                  isExpanded={expandedActionId === action.id}
                  onToggle={() =>
                    setExpandedActionId(
                      expandedActionId === action.id ? null : action.id
                    )
                  }
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className={styles.pagination}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className={styles.pageInfo}>
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Action Row Component
function ActionRow({
  action,
  isExpanded,
  onToggle,
}: {
  action: ActionLog
  isExpanded: boolean
  onToggle: () => void
}) {
  const statusConfig = STATUS_CONFIG[action.status]

  return (
    <div className={styles.actionRow}>
      <button type="button" className={styles.actionMain} onClick={onToggle}>
        <div className={styles.actionInfo}>
          <div className={styles.actionHeader}>
            <span className={`${styles.statusBadge} ${styles[statusConfig.className]}`}>
              {statusConfig.label}
            </span>
            <span className={`${styles.sourceBadge} ${styles[action.source]}`}>
              {SOURCE_LABELS[action.source]}
            </span>
            <span className={styles.actionType}>
              {ACTION_TYPE_LABELS[action.action_type] || action.action_type}
            </span>
          </div>
          <div className={styles.campaignName}>
            {action.google_campaign_name || action.google_campaign_id}
          </div>
          {action.automation_rule_name && (
            <div className={styles.automationName}>
              Regra: {action.automation_rule_name}
            </div>
          )}
        </div>

        <div className={styles.actionMeta}>
          <div className={styles.actionDate}>{formatDate(action.executed_at)}</div>
          <span
            className={styles.expandButton}
            aria-hidden="true"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className={isExpanded ? styles.rotated : ''}
            >
              <path
                d="M19 9l-7 7-7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className={styles.actionDetails}>
          {action.action_details && (
            <div className={styles.detailsGrid}>
              {action.action_details.previousValue !== undefined && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Valor anterior</span>
                  <span className={styles.detailValue}>
                    {typeof action.action_details.previousValue === 'number'
                      ? formatCurrency(action.action_details.previousValue)
                      : action.action_details.previousValue}
                  </span>
                </div>
              )}
              {action.action_details.newValue !== undefined && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Novo valor</span>
                  <span className={styles.detailValue}>
                    {typeof action.action_details.newValue === 'number'
                      ? formatCurrency(action.action_details.newValue)
                      : action.action_details.newValue}
                  </span>
                </div>
              )}
              {action.action_details.changeAmount !== undefined && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Alteração</span>
                  <span className={`${styles.detailValue} ${
                    action.action_details.changeAmount > 0 ? styles.positive : styles.negative
                  }`}>
                    {action.action_details.changeAmount > 0 ? '+' : ''}
                    {formatCurrency(action.action_details.changeAmount)}
                  </span>
                </div>
              )}
              {action.action_details.changePercent !== undefined && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Alteração %</span>
                  <span className={`${styles.detailValue} ${
                    action.action_details.changePercent > 0 ? styles.positive : styles.negative
                  }`}>
                    {action.action_details.changePercent > 0 ? '+' : ''}
                    {action.action_details.changePercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {action.error_message && (
            <div className={styles.errorMessage}>
              <strong>Erro:</strong> {action.error_message}
            </div>
          )}

          {action.metrics_snapshot && (
            <div className={styles.metricsSnapshot}>
              <h4>Métricas no momento da ação</h4>
              <div className={styles.metricsGrid}>
                {action.metrics_snapshot.impressions !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Impressões</span>
                    <span className={styles.metricValue}>
                      {action.metrics_snapshot.impressions.toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
                {action.metrics_snapshot.clicks !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Cliques</span>
                    <span className={styles.metricValue}>
                      {action.metrics_snapshot.clicks.toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
                {action.metrics_snapshot.ctr !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>CTR</span>
                    <span className={styles.metricValue}>
                      {action.metrics_snapshot.ctr.toFixed(2)}%
                    </span>
                  </div>
                )}
                {action.metrics_snapshot.cost !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Custo</span>
                    <span className={styles.metricValue}>
                      {formatCurrency(action.metrics_snapshot.cost)}
                    </span>
                  </div>
                )}
                {action.metrics_snapshot.conversions !== undefined && (
                  <div className={styles.metricItem}>
                    <span className={styles.metricLabel}>Conversões</span>
                    <span className={styles.metricValue}>
                      {action.metrics_snapshot.conversions}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActionHistoryPage
