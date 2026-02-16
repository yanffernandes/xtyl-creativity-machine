/**
 * HistoryFilters Component
 * T052: Filters for the unified action history
 *
 * Provides filtering options for action source, status, and date range.
 */

import { useMemo } from 'react'
import { Filter, Calendar } from 'lucide-react'
import { Select, Input } from '@/shared/components'
import styles from './HistoryFilters.module.css'
import type { ActionSource, ActionStatus, AdsPlatform } from '../../types'

// ============================================
// Types
// ============================================

interface HistoryFiltersProps {
  source: ActionSource | ''
  status: ActionStatus | ''
  startDate: string
  endDate: string
  selectedPlatforms: AdsPlatform[]
  onSourceChange: (source: ActionSource | '') => void
  onStatusChange: (status: ActionStatus | '') => void
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}

// ============================================
// Options
// ============================================

const SOURCE_OPTIONS = [
  { value: '', label: 'Todas as origens' },
  { value: 'manual', label: 'Manual' },
  { value: 'automation', label: 'Automação' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'success', label: 'Sucesso' },
  { value: 'failed', label: 'Falhou' },
  { value: 'skipped', label: 'Ignorado' },
]

// ============================================
// Component
// ============================================

export function HistoryFilters({
  source,
  status,
  startDate,
  endDate,
  selectedPlatforms,
  onSourceChange,
  onStatusChange,
  onStartDateChange,
  onEndDateChange,
}: HistoryFiltersProps) {
  // Disable automation filter if only Meta is selected (no automations yet)
  const sourceOptionsFiltered = useMemo(() => {
    if (selectedPlatforms.length === 1 && selectedPlatforms[0] === 'meta') {
      return SOURCE_OPTIONS.filter((opt) => opt.value !== 'automation')
    }
    return SOURCE_OPTIONS
  }, [selectedPlatforms])

  return (
    <div className={styles.container}>
      <div className={styles.filterIcon}>
        <Filter size={16} />
        <span>Filtros:</span>
      </div>

      <div className={styles.filters}>
        {/* Source Filter */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Origem</span>
          <Select
            value={source}
            onChange={(e) => onSourceChange(e.target.value as ActionSource | '')}
            options={sourceOptionsFiltered}
            className={styles.select}
          />
        </div>

        {/* Status Filter */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status</span>
          <Select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as ActionStatus | '')}
            options={STATUS_OPTIONS}
            className={styles.select}
          />
        </div>

        {/* Date Range */}
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>
            <Calendar size={14} />
            Período
          </span>
          <div className={styles.dateRange}>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className={styles.dateInput}
            />
            <span className={styles.dateSeparator}>até</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default HistoryFilters
