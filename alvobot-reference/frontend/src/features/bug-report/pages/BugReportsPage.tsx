import { useState, useMemo } from 'react'
import { useBugReports } from '../api'
import styles from './BugReportsPage.module.css'
import { BugReportDetailModal } from '../components/BugReportDetailModal'
import { BugReportFilters } from '../components/BugReportFilters'
import { BugReportList } from '../components/BugReportList'
import type { BugReportWithAttachments, BugReportFilters as FilterType } from '../types'

export function BugReportsPage() {
  const [filters, setFilters] = useState<FilterType>({})
  const [selectedReport, setSelectedReport] = useState<BugReportWithAttachments | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const { data: reports, isLoading, error } = useBugReports(filters)

  const stats = useMemo(() => {
    if (!reports) return { open: 0, inProgress: 0, resolved: 0, critical: 0 }
    return {
      open: reports.filter((r) => r.status === 'open').length,
      inProgress: reports.filter((r) => r.status === 'in_progress').length,
      resolved: reports.filter((r) => r.status === 'resolved' || r.status === 'closed').length,
      critical: reports.filter((r) => r.severity === 'critical').length,
    }
  }, [reports])

  const handleReportClick = (report: BugReportWithAttachments) => {
    setSelectedReport(report)
    setIsDetailModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsDetailModalOpen(false)
    setSelectedReport(null)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Bug Reports</h1>
          <p className={styles.subtitle}>Visualize e gerencie os reports de bugs</p>
        </div>

        <div className={styles.stats}>
          <div className={`${styles.statCard} ${styles.open}`}>
            <span className={styles.statValue}>{stats.open}</span>
            <span className={styles.statLabel}>Abertos</span>
          </div>
          <div className={`${styles.statCard} ${styles.inProgress}`}>
            <span className={styles.statValue}>{stats.inProgress}</span>
            <span className={styles.statLabel}>Em andamento</span>
          </div>
          <div className={`${styles.statCard} ${styles.resolved}`}>
            <span className={styles.statValue}>{stats.resolved}</span>
            <span className={styles.statLabel}>Resolvidos</span>
          </div>
          <div className={`${styles.statCard} ${styles.critical}`}>
            <span className={styles.statValue}>{stats.critical}</span>
            <span className={styles.statLabel}>Críticos</span>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.filtersSection}>
          <BugReportFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        <div className={styles.listSection}>
          <div className={styles.listHeader}>
            <h2 className={styles.listTitle}>Todos os Reports</h2>
            {reports && (
              <span className={styles.resultCount}>
                {reports.length} {reports.length === 1 ? 'report' : 'reports'}
              </span>
            )}
          </div>

          <BugReportList
            reports={reports || []}
            isLoading={isLoading}
            error={error}
            onReportClick={handleReportClick}
          />
        </div>
      </div>

      <BugReportDetailModal
        report={selectedReport}
        isOpen={isDetailModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}
