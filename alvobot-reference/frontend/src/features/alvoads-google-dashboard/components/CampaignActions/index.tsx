import { useState, useRef, useEffect } from 'react'
import styles from './CampaignActions.module.css'
import type { CampaignMetrics } from '../../types'

// SVG Icons
const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
)

const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

const DollarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
)

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

interface CampaignActionsProps {
  campaign: CampaignMetrics
  onPause: () => void
  onEnable: () => void
  onEditBudget: () => void
  onEditBid: () => void
  onDuplicate: () => void
  isLoading?: boolean
}

export function CampaignActions({
  campaign,
  onPause,
  onEnable,
  onEditBudget,
  onEditBid,
  onDuplicate,
  isLoading,
}: CampaignActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={`${styles.actionsContainer} ${isLoading ? styles.loading : ''}`}>
      <button
        className={`${styles.actionsButton} ${isOpen ? styles.open : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Acoes da campanha"
        aria-expanded={isOpen}
      >
        ...
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <span className={styles.dropdownLabel}>Status</span>

          {campaign.status === 'ENABLED' ? (
            <button
              className={`${styles.dropdownItem} ${styles.danger}`}
              onClick={() => handleAction(onPause)}
            >
              <PauseIcon /> Pausar Campanha
            </button>
          ) : (
            <button
              className={`${styles.dropdownItem} ${styles.success}`}
              onClick={() => handleAction(onEnable)}
            >
              <PlayIcon /> Ativar Campanha
            </button>
          )}

          <div className={styles.dropdownDivider} />
          <span className={styles.dropdownLabel}>Orcamento</span>

          <button
            className={styles.dropdownItem}
            onClick={() => handleAction(onEditBudget)}
          >
            <DollarIcon /> Alterar Orcamento
          </button>

          <div className={styles.dropdownDivider} />
          <span className={styles.dropdownLabel}>Lances</span>

          <button
            className={styles.dropdownItem}
            onClick={() => handleAction(onEditBid)}
          >
            <TrendingUpIcon /> Alterar Lance
          </button>

          <div className={styles.dropdownDivider} />
          <span className={styles.dropdownLabel}>Outras acoes</span>

          <button
            className={styles.dropdownItem}
            onClick={() => handleAction(onDuplicate)}
          >
            <CopyIcon /> Duplicar Campanha
          </button>
        </div>
      )}
    </div>
  )
}
