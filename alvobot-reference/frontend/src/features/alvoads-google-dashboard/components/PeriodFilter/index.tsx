import { useCallback, useMemo } from 'react'
import {
  PeriodFilter as UnifiedPeriodFilter,
  normalizePeriodPreset,
  denormalizePeriodPreset,
  type DateRange,
  type PeriodPreset,
} from '@/components/ui/datatable'
import type { DashboardPeriod } from '../../types'

// Simplified props for basic usage (most common)
interface SimplePeriodFilterProps {
  period: DashboardPeriod
  onPeriodChange: (period: DashboardPeriod) => void
}

// Full props for advanced usage (kept for backwards compatibility)
interface FullPeriodFilterProps extends SimplePeriodFilterProps {
  startDate?: string
  endDate?: string
  onDateRangeChange?: (startDate: string, endDate: string) => void
}

export type PeriodFilterProps = SimplePeriodFilterProps | FullPeriodFilterProps

// Calculate date range from period
function getDateRangeFromPeriod(period: DashboardPeriod): DateRange {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  switch (period) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr }
    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      return { startDate: yesterdayStr, endDate: yesterdayStr }
    }
    case 'last_7d': {
      const last7 = new Date(today)
      last7.setDate(last7.getDate() - 6)
      return { startDate: last7.toISOString().split('T')[0], endDate: todayStr }
    }
    case 'last_30d': {
      const last30 = new Date(today)
      last30.setDate(last30.getDate() - 29)
      return { startDate: last30.toISOString().split('T')[0], endDate: todayStr }
    }
    case 'custom':
    default:
      // Default to last 7 days for custom without dates
      const defaultStart = new Date(today)
      defaultStart.setDate(defaultStart.getDate() - 6)
      return { startDate: defaultStart.toISOString().split('T')[0], endDate: todayStr }
  }
}

export function PeriodFilter(props: PeriodFilterProps) {
  const {
    period,
    onPeriodChange,
    startDate,
    endDate,
    onDateRangeChange,
  } = props as FullPeriodFilterProps

  // Convert legacy period to canonical format
  const normalizedPreset = useMemo(() => normalizePeriodPreset(period), [period])

  // Build DateRange from props or calculate from period
  const dateRange: DateRange = useMemo(() => {
    if (startDate && endDate) {
      return { startDate, endDate }
    }
    return getDateRangeFromPeriod(period)
  }, [period, startDate, endDate])

  // Handle date range changes (called when user selects dates on calendar)
  const handleChange = useCallback((range: DateRange) => {
    // Mark as custom when user selects dates manually
    onPeriodChange('custom')
    if (onDateRangeChange) {
      onDateRangeChange(range.startDate, range.endDate)
    }
  }, [onPeriodChange, onDateRangeChange])

  // Handle preset changes (called when user clicks preset buttons)
  const handlePresetChange = useCallback((preset: PeriodPreset) => {
    // Convert canonical preset back to Google Ads format
    const legacyPreset = denormalizePeriodPreset(preset, 'google-ads') as DashboardPeriod
    onPeriodChange(legacyPreset)
  }, [onPeriodChange])

  return (
    <UnifiedPeriodFilter
      value={dateRange}
      onChange={handleChange}
      preset={normalizedPreset}
      onPresetChange={handlePresetChange}
    />
  )
}
