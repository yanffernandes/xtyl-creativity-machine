import { Columns, ChevronDown } from 'lucide-react'
import { Checkbox, PopoverContent, PopoverRoot, PopoverTrigger } from '@/shared/components'
import styles from './ColumnVisibilitySelector.module.css'
import type { ColumnVisibility } from '../../types'

export { DEFAULT_COLUMN_VISIBILITY } from '../../types'
export type { ColumnVisibility } from '../../types'

interface ColumnVisibilitySelectorProps {
  visibility: ColumnVisibility
  onChange: (visibility: ColumnVisibility) => void
}

interface ColumnOption {
  key: keyof ColumnVisibility
  label: string
}

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: 'domain', label: 'Domínio' },
  { key: 'key', label: 'Dimensão' },
  { key: 'activeUsers', label: 'Usuários Ativos' },
  { key: 'newUsers', label: 'Novos Usuários' },
  { key: 'sessions', label: 'Sessões' },
  { key: 'engagedSessions', label: 'Sessões Engajadas' },
  { key: 'pageViews', label: 'Visualizações' },
  { key: 'pagesPerSession', label: 'Páginas/Sessão' },
  { key: 'totalRevenue', label: 'Receita' },
  { key: 'bounceRate', label: 'Taxa de Rejeição' },
  { key: 'engagementRate', label: 'Taxa de Engajamento' },
  { key: 'avgSessionDuration', label: 'Duração Média' },
  { key: 'eventCount', label: 'Eventos' },
  { key: 'conversions', label: 'Conversões' },
]

export function ColumnVisibilitySelector({
  visibility,
  onChange,
}: ColumnVisibilitySelectorProps) {
  // Count visible columns
  const visibleCount = Object.values(visibility).filter(Boolean).length

  const handleToggle = (key: keyof ColumnVisibility) => {
    onChange({
      ...visibility,
      [key]: !visibility[key],
    })
  }

  return (
    <PopoverRoot>
      <PopoverTrigger asChild>
        <button
          className={styles.button}
          aria-haspopup="true"
        >
          <Columns size={16} />
          <span className={styles.label}>Colunas</span>
          <span className={styles.count}>{visibleCount}</span>
          <ChevronDown size={14} className={styles.chevron} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className={styles.dropdown}>
        <div className={styles.dropdownHeader}>
          <span>Colunas visíveis</span>
        </div>
        <div className={styles.dropdownContent}>
          {COLUMN_OPTIONS.map((option) => (
            <label key={option.key} className={styles.option}>
              <Checkbox
                checked={visibility[option.key]}
                onCheckedChange={() => handleToggle(option.key)}
                size="sm"
                density="compact"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
