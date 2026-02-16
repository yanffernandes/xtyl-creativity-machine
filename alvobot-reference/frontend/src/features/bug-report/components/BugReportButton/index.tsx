import { useCallback } from 'react'
import { Bug } from 'lucide-react'
import { useBugReportStore } from '../../stores/bugReportStore'
import { BugReportModal } from '../BugReportModal'
import styles from './BugReportButton.module.css'

export function BugReportButton() {
  const { openModal } = useBugReportStore()

  const handleOpenModal = useCallback(() => {
    openModal()
  }, [openModal])

  return (
    <>
      <div className={`${styles.container} bug-report-button`}>
        <button
          type="button"
          className={styles.mainButton}
          onClick={handleOpenModal}
          title="Reportar bug"
          aria-label="Reportar bug"
        >
          <Bug size={20} />
          <span className={styles.label}>Reportar Bug</span>
        </button>
      </div>

      <BugReportModal />
    </>
  )
}
