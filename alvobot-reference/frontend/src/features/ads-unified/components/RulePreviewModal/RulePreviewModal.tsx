import { AlertTriangle, CheckCircle, Search } from 'lucide-react'
import { Button, Modal, Spinner, Alert } from '@/shared/components'
import { usePreviewRule } from '../../api/automationQueries'
import styles from './RulePreviewModal.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface RulePreviewModalProps {
  ruleId: string
  isOpen: boolean
  onClose: () => void
  onActivate?: () => void
}

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatNumber(value: number | undefined, decimals = 0): string {
  if (value === undefined || value === null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function getStatusClassName(status: string): string {
  const normalized = status.toLowerCase()
  if (normalized === 'enabled' || normalized === 'active') return styles.statusActive
  if (normalized === 'paused') return styles.statusPaused
  return styles.statusOther
}

// ============================================================================
// COMPONENT
// ============================================================================

export function RulePreviewModal({ ruleId, isOpen, onClose, onActivate }: RulePreviewModalProps) {
  const { data, isLoading, error } = usePreviewRule(ruleId, isOpen)

  const totalAffected = data?.summary?.totalWouldBeAffected ?? 0
  const entities = data?.matchingEntities ?? []
  const warnings = data?.warnings ?? []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Preview da Regra" size="lg">
      <div className={styles.previewContent}>
        {/* Loading */}
        {isLoading && (
          <div className={styles.loadingContainer}>
            <Spinner size="lg" />
            <p>Simulando regra...</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <Alert variant="error">
            Erro ao gerar preview: {error instanceof Error ? error.message : 'Tente novamente.'}
          </Alert>
        )}

        {/* Warnings */}
        {warnings.length > 0 && !isLoading && (
          <Alert variant="warning">
            <AlertTriangle size={16} />
            {warnings.join(' ')}
          </Alert>
        )}

        {/* Results */}
        {data && !isLoading && (
          <>
            {/* Summary */}
            <div className={styles.summary}>
              <Search size={16} />
              <span>
                <span className={styles.summaryCount}>{data.summary.totalEvaluated}</span>{' '}
                avaliadas,{' '}
                <span className={styles.summaryCount}>{totalAffected}</span>{' '}
                {totalAffected === 1 ? 'seria afetada' : 'seriam afetadas'}
              </span>
            </div>

            {/* Entity Table */}
            {entities.length > 0 ? (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>ID</th>
                      <th>Plataforma</th>
                      <th className={styles.metricCell}>Gasto</th>
                      <th className={styles.metricCell}>Impressões</th>
                      <th className={styles.metricCell}>Conversões</th>
                      <th className={styles.metricCell}>ROAS</th>
                      <th>Tasks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entities.map((entity) => (
                      <tr key={entity.entityId}>
                        <td>
                          <span className={styles.entityName}>{entity.entityName}</span>
                        </td>
                        <td>
                          <span className={styles.entityId}>{entity.entityId}</span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${getStatusClassName(entity.platform)}`}>
                            {entity.platform}
                          </span>
                        </td>
                        <td className={styles.metricCell}>
                          {formatCurrency(entity.currentMetrics.spend)}
                        </td>
                        <td className={styles.metricCell}>
                          {formatNumber(entity.currentMetrics.impressions)}
                        </td>
                        <td className={styles.metricCell}>
                          {formatNumber(entity.currentMetrics.conversions ?? entity.currentMetrics.purchases ?? 0)}
                        </td>
                        <td className={styles.metricCell}>
                          {formatNumber(entity.currentMetrics.roas ?? entity.currentMetrics.purchase_roas ?? 0, 2)}
                        </td>
                        <td>
                          {entity.wouldExecuteTasks.map((t) => (
                            <span
                              key={t.taskIndex}
                              className={`${styles.statusBadge} ${t.conditionsMet ? styles.statusActive : styles.statusPaused}`}
                            >
                              {t.action}{t.skippedByCap ? ' (cap)' : ''}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyPreview}>
                <CheckCircle size={32} />
                <p>Nenhuma entidade corresponde aos critérios da regra no momento.</p>
                <p className={styles.emptyDetail}>
                  {data.summary.totalEvaluated} entidades avaliadas, {data.summary.totalMatchedFilters} passaram nos filtros
                </p>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          {onActivate && data && entities.length > 0 && (
            <Button variant="primary" onClick={onActivate}>
              Ativar Regra
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
