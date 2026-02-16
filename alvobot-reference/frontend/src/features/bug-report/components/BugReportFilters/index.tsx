import { useId } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/shared/components'
import styles from './BugReportFilters.module.css'
import {
  BUG_STATUS,
  BUG_SEVERITY,
  BUG_TYPE,
  type BugReportFilters as FilterType,
  type BugStatus,
  type BugSeverity,
  type BugType,
} from '../../types'

interface BugReportFiltersProps {
  filters: FilterType
  onFiltersChange: (filters: FilterType) => void
}

const statusLabels: Record<BugStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

const severityLabels: Record<BugSeverity, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
}

const typeLabels: Record<BugType, string> = {
  visual: 'Visual',
  functional: 'Funcional',
  performance: 'Performance',
  other: 'Outro',
}

export function BugReportFilters({ filters, onFiltersChange }: BugReportFiltersProps) {
  const statusId = useId()
  const severityId = useId()
  const typeId = useId()
  const updateFilter = <K extends keyof FilterType>(key: K, value: FilterType[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const removeFilter = (key: keyof FilterType) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof FilterType] !== undefined && filters[key as keyof FilterType] !== ''
  )

  const getActiveFilterLabel = (key: keyof FilterType, value: string): string => {
    switch (key) {
      case 'status':
        return `Status: ${statusLabels[value as BugStatus]}`
      case 'severity':
        return `Severidade: ${severityLabels[value as BugSeverity]}`
      case 'bug_type':
        return `Tipo: ${typeLabels[value as BugType]}`
      case 'search':
        return `Busca: "${value}"`
      case 'startDate':
        return `Início: ${new Date(value).toLocaleDateString('pt-BR')}`
      case 'endDate':
        return `Fim: ${new Date(value).toLocaleDateString('pt-BR')}`
      default:
        return value
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchWrapper}>
        <Input
          placeholder="Buscar por título ou descrição..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          fullWidth
          leftIcon={<Search size={18} />}
          size="md"
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel} htmlFor={statusId}>Status</label>
        <select
          id={statusId}
          className={styles.filterSelect}
          value={filters.status || ''}
          onChange={(e) => updateFilter('status', (e.target.value as BugStatus) || undefined)}
        >
          <option value="">Todos</option>
          {BUG_STATUS.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel} htmlFor={severityId}>Severidade</label>
        <select
          id={severityId}
          className={styles.filterSelect}
          value={filters.severity || ''}
          onChange={(e) => updateFilter('severity', (e.target.value as BugSeverity) || undefined)}
        >
          <option value="">Todas</option>
          {BUG_SEVERITY.map((severity) => (
            <option key={severity} value={severity}>
              {severityLabels[severity]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel} htmlFor={typeId}>Tipo</label>
        <select
          id={typeId}
          className={styles.filterSelect}
          value={filters.bug_type || ''}
          onChange={(e) => updateFilter('bug_type', (e.target.value as BugType) || undefined)}
        >
          <option value="">Todos</option>
          {BUG_TYPE.map((type) => (
            <option key={type} value={type}>
              {typeLabels[type]}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <div className={styles.actions}>
          <button className={styles.clearButton} onClick={clearAllFilters}>
            <X size={14} />
            Limpar filtros
          </button>
        </div>
      )}

      {hasActiveFilters && (
        <div className={styles.activeFilters}>
          {(Object.keys(filters) as Array<keyof FilterType>).map((key) => {
            const value = filters[key]
            if (!value) return null
            return (
              <span key={key} className={styles.activeFilter}>
                {getActiveFilterLabel(key, value)}
                <button
                  className={styles.removeFilter}
                  onClick={() => removeFilter(key)}
                  aria-label={`Remover filtro ${key}`}
                >
                  <X size={12} />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
