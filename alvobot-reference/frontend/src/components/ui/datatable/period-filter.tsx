'use client'

import * as React from 'react'
import { format, subDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { DateRange as DayPickerDateRange } from 'react-day-picker'

// Period presets - canonical format
export type PeriodPreset = 'today' | 'yesterday' | '7days' | '30days' | 'custom'

// Legacy period formats for backwards compatibility
export type LegacyPeriodFormat =
  | '7d' | '30d'  // Revenue Dashboard format
  | 'last_7d' | 'last_30d'  // Google Ads Dashboard format

// Combined type that accepts any format
export type AnyPeriodPreset = PeriodPreset | LegacyPeriodFormat

// Normalize any preset format to canonical format
export function normalizePeriodPreset(preset: AnyPeriodPreset): PeriodPreset {
  switch (preset) {
    case '7d':
    case 'last_7d':
    case '7days':
      return '7days'
    case '30d':
    case 'last_30d':
    case '30days':
      return '30days'
    case 'today':
    case 'yesterday':
    case 'custom':
      return preset
    default:
      return '7days' // default
  }
}

// Convert canonical format back to a specific legacy format
export function denormalizePeriodPreset(
  preset: PeriodPreset,
  targetFormat: 'revenue' | 'google-ads' | 'canonical' = 'canonical'
): string {
  if (targetFormat === 'canonical') return preset

  switch (preset) {
    case '7days':
      return targetFormat === 'revenue' ? '7d' : 'last_7d'
    case '30days':
      return targetFormat === 'revenue' ? '30d' : 'last_30d'
    default:
      return preset
  }
}

export interface DateRange {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}

export interface PeriodFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  preset?: AnyPeriodPreset
  onPresetChange?: (preset: PeriodPreset) => void
  minDate?: Date
  maxDate?: Date
  className?: string
  disabled?: boolean
  /** Warning message to show (e.g., for date range limits) */
  warning?: string | null
}

const PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
]

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

export function PeriodFilter({
  value,
  onChange,
  preset = '7days',
  onPresetChange,
  minDate,
  maxDate,
  className,
  disabled = false,
  warning,
}: PeriodFilterProps) {
  const [open, setOpen] = React.useState(false)
  const normalizedPreset = normalizePeriodPreset(preset)

  // Build disabled date matchers for react-day-picker
  const disabledDates = React.useMemo(() => {
    const matchers: Array<{ before: Date } | { after: Date }> = []
    if (minDate) matchers.push({ before: minDate })
    if (maxDate) matchers.push({ after: maxDate })
    return matchers.length > 0 ? matchers : undefined
  }, [minDate, maxDate])

  // Convert string dates to Date objects for react-day-picker
  const dateRange: DayPickerDateRange | undefined = React.useMemo(() => {
    if (!value.startDate || !value.endDate) return undefined
    return {
      from: parseDate(value.startDate),
      to: parseDate(value.endDate),
    }
  }, [value.startDate, value.endDate])

  const handlePresetClick = (newPreset: PeriodPreset) => {
    const range = getPresetRange(newPreset)
    onChange(range)
    onPresetChange?.(newPreset)
    setOpen(false)
  }

  const handleRangeSelect = (range: DayPickerDateRange | undefined) => {
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
  }

  // Format display text
  const displayText = React.useMemo(() => {
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          data-empty={!value.startDate}
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            'data-[empty=true]:text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex flex-col gap-1 border-r p-3">
            <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
              Atalhos
            </div>
            {PRESETS.map((p) => (
              <Button
                key={p.value}
                variant={normalizedPreset === p.value ? 'default' : 'ghost'}
                size="sm"
                className="justify-start"
                onClick={() => handlePresetClick(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
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
              <p className="mt-2 border-t pt-2 text-xs text-amber-600">
                {warning}
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
