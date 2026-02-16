/**
 * PeriodSelector - Componente PADRÃO e ÚNICO para seleção de período
 * 
 * Este é o componente obrigatório para qualquer seleção de período no sistema.
 * NÃO use outros componentes de período - todos devem usar este.
 * 
 * Features:
 * - Presets: Hoje, Ontem, 7 dias, 30 dias
 * - Seleção customizada com calendário dual-month
 * - Formatação em português
 * - Auto-fecha ao selecionar range completo
 * 
 * @example
 * ```tsx
 * const [dateRange, setDateRange] = useState<DateRange>({
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-07',
 * })
 * 
 * <PeriodSelector
 *   value={dateRange}
 *   onChange={setDateRange}
 * />
 * ```
 */

import { useState, useMemo, useCallback } from 'react'
import { format, subDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, ChevronDown } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '../Popover'
import styles from './PeriodSelector.module.css'
import type { DateRange as DayPickerDateRange } from 'react-day-picker'

// ============================================
// Types
// ============================================

export type PeriodPreset = 'today' | 'yesterday' | '7days' | '30days' | 'custom'

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}

export interface PeriodSelectorProps {
  /** Current date range value */
  value: DateRange
  /** Called when date range changes */
  onChange: (range: DateRange) => void
  /** Current preset (optional - derived from value if not provided) */
  preset?: PeriodPreset
  /** Called when preset changes (optional) */
  onPresetChange?: (preset: PeriodPreset) => void
  /** Minimum selectable date */
  minDate?: Date
  /** Maximum selectable date */
  maxDate?: Date
  /** Additional CSS class */
  className?: string
  /** Disable the selector */
  disabled?: boolean
  /** Warning message to show */
  warning?: string | null
  /** Size variant: 'sm' (32px), 'md' (36px, default), 'lg' (44px) */
  size?: 'sm' | 'md' | 'lg'
}

// ============================================
// Constants
// ============================================

const PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
]

// ============================================
// Utility Functions
// ============================================

function getPresetRange(preset: PeriodPreset): DateRange {
  const today = startOfDay(new Date())

  switch (preset) {
    case 'today':
      return {
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      }
    case 'yesterday': {
      const yesterday = subDays(today, 1)
      return {
        startDate: format(yesterday, 'yyyy-MM-dd'),
        endDate: format(yesterday, 'yyyy-MM-dd'),
      }
    }
    case '7days':
      return {
        startDate: format(subDays(today, 6), 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      }
    case '30days':
      return {
        startDate: format(subDays(today, 29), 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      }
    default:
      return {
        startDate: format(subDays(today, 6), 'yyyy-MM-dd'),
        endDate: format(today, 'yyyy-MM-dd'),
      }
  }
}

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr  }T00:00:00`)
}

function detectPreset(range: DateRange): PeriodPreset {
  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')
  const yesterday = format(subDays(startOfDay(new Date()), 1), 'yyyy-MM-dd')
  const days7 = format(subDays(startOfDay(new Date()), 6), 'yyyy-MM-dd')
  const days30 = format(subDays(startOfDay(new Date()), 29), 'yyyy-MM-dd')

  if (range.startDate === today && range.endDate === today) {
    return 'today'
  }
  if (range.startDate === yesterday && range.endDate === yesterday) {
    return 'yesterday'
  }
  if (range.startDate === days7 && range.endDate === today) {
    return '7days'
  }
  if (range.startDate === days30 && range.endDate === today) {
    return '30days'
  }
  return 'custom'
}

// ============================================
// Component
// ============================================

export function PeriodSelector({
  value,
  onChange,
  preset: controlledPreset,
  onPresetChange,
  minDate,
  maxDate,
  className,
  disabled = false,
  warning,
  size = 'md',
}: PeriodSelectorProps) {
  const [open, setOpen] = useState(false)

  // Determine current preset (controlled or derived)
  const currentPreset = controlledPreset ?? detectPreset(value)

  // Build disabled date matchers for react-day-picker
  const disabledDates = useMemo(() => {
    const matchers: Array<{ before: Date } | { after: Date }> = []
    if (minDate) matchers.push({ before: minDate })
    if (maxDate) matchers.push({ after: maxDate })
    return matchers.length > 0 ? matchers : undefined
  }, [minDate, maxDate])

  // Convert string dates to Date objects for react-day-picker
  const dateRange: DayPickerDateRange | undefined = useMemo(() => {
    if (!value.startDate || !value.endDate) return undefined
    return {
      from: parseDate(value.startDate),
      to: parseDate(value.endDate),
    }
  }, [value.startDate, value.endDate])

  // Handle preset click
  const handlePresetClick = useCallback((newPreset: PeriodPreset) => {
    const range = getPresetRange(newPreset)
    onChange(range)
    onPresetChange?.(newPreset)
    setOpen(false)
  }, [onChange, onPresetChange])

  // Handle calendar range selection
  const handleRangeSelect = useCallback((range: DayPickerDateRange | undefined) => {
    if (range?.from) {
      const newRange: DateRange = {
        startDate: format(range.from, 'yyyy-MM-dd'),
        endDate: range.to ? format(range.to, 'yyyy-MM-dd') : format(range.from, 'yyyy-MM-dd'),
      }
      onChange(newRange)
      onPresetChange?.('custom')

      // Close popover when both dates are selected
      if (range.to) {
        setOpen(false)
      }
    }
  }, [onChange, onPresetChange])

  // Format display text
  const displayText = useMemo(() => {
    if (!value.startDate || !value.endDate) return 'Selecionar período'

    const from = parseDate(value.startDate)
    const to = parseDate(value.endDate)

    if (value.startDate === value.endDate) {
      return format(from, "d 'de' MMM, yyyy", { locale: ptBR })
    }

    // Check if same year
    if (from.getFullYear() === to.getFullYear()) {
      return `${format(from, "d 'de' MMM", { locale: ptBR })} - ${format(to, "d 'de' MMM, yyyy", { locale: ptBR })}`
    }

    return `${format(from, "d 'de' MMM, yyyy", { locale: ptBR })} - ${format(to, "d 'de' MMM, yyyy", { locale: ptBR })}`
  }, [value.startDate, value.endDate])

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`${styles.trigger} ${size === 'sm' ? styles.triggerSm : ''} ${size === 'lg' ? styles.triggerLg : ''} ${!value.startDate ? styles.empty : ''} ${className || ''}`}
        >
          <CalendarIcon size={16} className={styles.calendarIcon} />
          <span className={styles.text}>{displayText}</span>
          <ChevronDown size={16} className={styles.chevron} />
        </button>
      </PopoverTrigger>
      <PopoverContent className={styles.popover} align="start">
        <div className={styles.content}>
          {/* Presets sidebar */}
          <div className={styles.presets}>
            <div className={styles.presetsTitle}>Atalhos</div>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`${styles.presetButton} ${currentPreset === p.value ? styles.active : ''}`}
                onClick={() => handlePresetClick(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className={styles.calendarWrapper}>
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              locale={ptBR}
              disabled={disabledDates}
            />

            {/* Warning message */}
            {warning && (
              <p className={styles.warning}>{warning}</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </PopoverRoot>
  )
}

// ============================================
// Helper exports for backwards compatibility
// ============================================

/** Get date range from a preset */
export { getPresetRange }

/** Detect preset from date range */
export { detectPreset }

/** Get default 7-day range */
export function getDefault7DayRange(): DateRange {
  return getPresetRange('7days')
}

/** Get default 30-day range */
export function getDefault30DayRange(): DateRange {
  return getPresetRange('30days')
}

export default PeriodSelector
