import { Bug, ChevronLeft, ChevronRight } from 'lucide-react'
import { Spinner, Alert } from '@/shared/components'
import { BugReportCard } from '../BugReportCard'
import styles from './BugReportList.module.css'
import type { BugReportWithAttachments } from '../../types'

interface BugReportListProps {
  reports: BugReportWithAttachments[]
  isLoading?: boolean
  error?: Error | null
  onReportClick: (report: BugReportWithAttachments) => void
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

export function BugReportList({
  reports,
  isLoading,
  error,
  onReportClick,
  page = 1,
  totalPages = 1,
  onPageChange,
}: BugReportListProps) {
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p className={styles.loadingText}>Carregando reports...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <Alert variant="error">
          Erro ao carregar reports: {error.message}
        </Alert>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Bug size={48} className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>Nenhum report encontrado</h3>
        <p className={styles.emptyDescription}>
          Não há reports de bugs para exibir com os filtros selecionados.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {reports.map((report) => (
          <BugReportCard
            key={report.id}
            report={report}
            onClick={() => onReportClick(report)}
          />
        ))}
      </div>

      {totalPages > 1 && onPageChange && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <span className={styles.pageInfo}>
            Página {page} de {totalPages}
          </span>

          <button
            className={styles.pageButton}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
