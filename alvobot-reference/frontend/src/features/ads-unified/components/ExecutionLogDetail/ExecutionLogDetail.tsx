import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  MinusCircle,
  Zap,
} from 'lucide-react'
import { Button, Modal, Spinner } from '@/shared/components'
import { useAutomationLogDetail } from '../../api/automationQueries'
import type { ExecutionStatus, AffectedEntity } from '../../types/automation'
import styles from './ExecutionLogDetail.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface ExecutionLogDetailProps {
  logId: string
  isOpen: boolean
  onClose: () => void
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    pause: 'Pausar',
    start: 'Ativar',
    increase_budget: '↑ Orçamento',
    decrease_budget: '↓ Orçamento',
    set_budget: 'Definir orçamento',
    scale_budget_by_target: 'Escalar orçamento',
    increase_bid: '↑ Lance',
    decrease_bid: '↓ Lance',
    set_bid: 'Definir lance',
    set_bid_strategy: 'Estratégia de lance',
    duplicate: 'Duplicar',
    add_to_name: 'Adicionar ao nome',
    remove_from_name: 'Remover do nome',
    replace_in_name: 'Renomear',
    extend_end_date: 'Estender data',
    notify: 'Notificar',
  }
  return labels[actionType] || actionType
}

function getOverallStatusLabel(status: ExecutionStatus): string {
  const labels: Record<ExecutionStatus, string> = {
    completed: 'Concluída',
    partial: 'Parcial',
    failed: 'Falhou',
    skipped: 'Ignorada',
    rate_limited: 'Rate Limited',
  }
  return labels[status] || status
}

function getOverallStatusClassName(status: ExecutionStatus): string {
  switch (status) {
    case 'completed': return styles.overallCompleted
    case 'partial': return styles.overallPartial
    case 'failed': return styles.overallFailed
    case 'skipped': return styles.overallSkipped
    case 'rate_limited': return styles.overallRateLimited
    default: return styles.overallSkipped
  }
}

function getOverallStatusIcon(status: ExecutionStatus) {
  switch (status) {
    case 'completed': return <CheckCircle size={14} />
    case 'partial': return <AlertCircle size={14} />
    case 'failed': return <XCircle size={14} />
    case 'skipped': return <MinusCircle size={14} />
    case 'rate_limited': return <Zap size={14} />
    default: return null
  }
}

function getEntityStatusClassName(status: AffectedEntity['status']): string {
  switch (status) {
    case 'success': return styles.statusSuccess
    case 'failed': return styles.statusFailed
    case 'skipped': return styles.statusSkipped
    default: return styles.statusSkipped
  }
}

function getEntityStatusLabel(status: AffectedEntity['status']): string {
  switch (status) {
    case 'success': return 'Sucesso'
    case 'failed': return 'Falhou'
    case 'skipped': return 'Ignorado'
    default: return status
  }
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }
  return String(value)
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExecutionLogDetail({ logId, isOpen, onClose }: ExecutionLogDetailProps) {
  const { data: log, isLoading, error } = useAutomationLogDetail(isOpen ? logId : undefined)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da Execução" size="lg">
      <div className={styles.detailContent}>
        {/* Loading */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <Spinner size="lg" />
            <p>Carregando detalhes...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className={styles.errorItem}>
            <AlertCircle size={16} className={styles.errorIcon} />
            <span>Erro ao carregar detalhes: {error instanceof Error ? error.message : 'Tente novamente.'}</span>
          </div>
        )}

        {/* Content */}
        {log && !isLoading && (
          <>
            {/* Overall Status + Meta */}
            <div className={styles.metaInfo}>
              <div className={styles.metaItem}>
                <span className={`${styles.overallStatus} ${getOverallStatusClassName(log.status)}`}>
                  {getOverallStatusIcon(log.status)}
                  {getOverallStatusLabel(log.status)}
                </span>
              </div>
              <div className={styles.metaItem}>
                <Clock size={14} />
                <strong>{formatDateTime(log.executedAt)}</strong>
              </div>
              <div className={styles.metaItem}>
                <Zap size={14} />
                <span>Duração: <strong>{formatDuration(log.durationMs)}</strong></span>
              </div>
            </div>

            {/* Summary Cards */}
            <div className={styles.summaryCards}>
              <div className={styles.summaryCard}>
                <span className={styles.cardValue}>{log.entitiesEvaluated}</span>
                <span className={styles.cardLabel}>Avaliadas</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.cardValue}>{log.entitiesMatchedFilters}</span>
                <span className={styles.cardLabel}>Filtradas</span>
              </div>
              <div className={styles.summaryCard}>
                <span className={styles.cardValue}>{log.entitiesMatchedConditions}</span>
                <span className={styles.cardLabel}>Condições</span>
              </div>
              <div className={`${styles.summaryCard} ${styles.cardGreen}`}>
                <span className={styles.cardValue}>{log.entitiesAffected}</span>
                <span className={styles.cardLabel}>Afetadas</span>
              </div>
              <div className={`${styles.summaryCard} ${styles.cardYellow}`}>
                <span className={styles.cardValue}>{log.entitiesSkippedCap}</span>
                <span className={styles.cardLabel}>Freq Cap</span>
              </div>
              <div className={`${styles.summaryCard} ${styles.cardRed}`}>
                <span className={styles.cardValue}>{log.errorsCount}</span>
                <span className={styles.cardLabel}>Erros</span>
              </div>
            </div>

            {/* Affected Entities Table */}
            {log.affectedEntities.length > 0 && (
              <section>
                <h3 className={styles.sectionTitle}>Entidades Afetadas</h3>
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Ação</th>
                        <th>Valor Anterior</th>
                        <th>Novo Valor</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.affectedEntities.map((entity, i) => (
                        <tr key={`${entity.entityId}-${i}`}>
                          <td>
                            <span className={styles.entityName}>{entity.entityName}</span>
                          </td>
                          <td>
                            <span className={styles.actionLabel}>
                              {getActionLabel(entity.actionExecuted)}
                            </span>
                          </td>
                          <td className={styles.valueCell}>
                            {formatValue(entity.previousValue)}
                          </td>
                          <td className={styles.valueCell}>
                            {formatValue(entity.newValue)}
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${getEntityStatusClassName(entity.status)}`}>
                              {getEntityStatusLabel(entity.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Errors */}
            {log.errors.length > 0 && (
              <section>
                <h3 className={styles.sectionTitle}>Erros ({log.errors.length})</h3>
                <div className={styles.errorsSection}>
                  {log.errors.map((err, i) => (
                    <div key={i} className={styles.errorItem}>
                      <AlertCircle size={14} className={styles.errorIcon} />
                      <span>
                        {err.entityName && <strong>{err.entityName}: </strong>}
                        {err.message}
                        {err.code && (
                          <> <span className={styles.entityId}>({err.code})</span></>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
