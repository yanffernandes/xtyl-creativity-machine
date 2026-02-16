import { useState, useMemo } from 'react'
import { Columns, RotateCcw } from 'lucide-react'
import {
  Checkbox,
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/shared/components'
import styles from './ColumnVisibilitySelector.module.css'

export interface ColumnVisibility {
  domain: boolean
  site: boolean // Key-Value
  country: boolean // Country
  source: boolean
  revenue: boolean
  ecpm: boolean
  cpc: boolean
  ctr: boolean
  clicks: boolean
  impressions: boolean
}

const COLUMN_LABELS: Record<keyof ColumnVisibility, string> = {
  domain: 'Domínio',
  site: 'Key-Value',
  country: 'País',
  source: 'Fonte',
  revenue: 'Receita',
  ecpm: 'eCPM',
  cpc: 'CPC',
  ctr: 'CTR',
  clicks: 'Cliques',
  impressions: 'Impressões',
}

// Default visibility
export const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  domain: true,
  site: true,
  country: false, // Hidden by default (can be shown via column selector)
  source: true,
  revenue: true,
  ecpm: true,
  cpc: true,
  ctr: true,
  clicks: true,
  impressions: true,
}

interface ColumnVisibilitySelectorProps {
  visibility: ColumnVisibility
  onChange: (visibility: ColumnVisibility) => void
  showSourceColumn?: boolean // Whether source column is available
}

export function ColumnVisibilitySelector({
  visibility,
  onChange,
  showSourceColumn = false,
}: ColumnVisibilitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Filter out source column if not available
  const columns = Object.keys(COLUMN_LABELS) as Array<keyof ColumnVisibility>
  const filteredColumns = useMemo(
    () => (showSourceColumn ? columns : columns.filter((col) => col !== 'source')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSourceColumn]
  )

  const visibleCount = useMemo(
    () => filteredColumns.filter((col) => visibility[col]).length,
    [filteredColumns, visibility]
  )

  const handleToggle = (col: keyof ColumnVisibility) => {
    onChange({ ...visibility, [col]: !visibility[col] })
  }

  const handleReset = () => {
    onChange(DEFAULT_COLUMN_VISIBILITY)
  }

  return (
    <PopoverRoot open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <TooltipRoot>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button type="button" className={styles.trigger}>
                <Columns size={16} />
                <span>Colunas</span>
                <span className={styles.badge}>{visibleCount}</span>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Configurar colunas visíveis</TooltipContent>
        </TooltipRoot>
      </TooltipProvider>
      <PopoverContent align="end" className="w-auto p-4" style={{ minWidth: 'auto', maxWidth: 'none' }}>
        <div className="mb-2 font-medium text-sm">Colunas Visíveis</div>
        <div className={styles.content}>
          <div className={styles.options}>
            {filteredColumns.map((col) => (
              <label
                key={col}
                className={`${styles.option} ${visibility[col] ? styles.optionActive : ''}`}
              >
                <Checkbox
                  checked={visibility[col]}
                  onCheckedChange={() => handleToggle(col)}
                  aria-label={`Mostrar coluna ${COLUMN_LABELS[col]}`}
                  size="sm"
                  density="compact"
                />
                <span className={styles.optionLabel}>{COLUMN_LABELS[col]}</span>
              </label>
            ))}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.resetButton} onClick={handleReset}>
              <RotateCcw size={14} />
              <span>Restaurar padrão</span>
            </button>
          </div>
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}
