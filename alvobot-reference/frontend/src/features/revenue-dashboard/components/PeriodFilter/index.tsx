import { useCallback, useMemo } from 'react'
import {
  PeriodFilter as UnifiedPeriodFilter,
  normalizePeriodPreset,
  denormalizePeriodPreset,
  type DateRange,
  type PeriodPreset,
} from '@/components/ui/datatable'
import type { PeriodFilterValue } from '../../types'

interface PeriodFilterProps {
  period: PeriodFilterValue
  startDate: string | null
  endDate: string | null
  onPeriodChange: (period: PeriodFilterValue, startDate?: string, endDate?: string) => void
}

// Ad Manager supports up to 3 years of historical data
const AD_MANAGER_MAX_YEARS = 3

// Calculate 3 years ago date for warning
function getThreeYearsAgoWarning(startDate: string): string | null {
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - AD_MANAGER_MAX_YEARS)

  const startDateObj = new Date(startDate)
  if (startDateObj < threeYearsAgo) {
    return 'Ad Manager retorna no máximo 3 anos de dados históricos'
  }
  return null
}

export function PeriodFilter({
  period,
  startDate,
  endDate,
  onPeriodChange,
}: PeriodFilterProps) {
  // Convert legacy period to canonical format
  const normalizedPreset = useMemo(() => normalizePeriodPreset(period), [period])

  // Build DateRange from props
  const dateRange: DateRange = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      startDate: startDate || today,
      endDate: endDate || today,
    }
  }, [startDate, endDate])

  // Calculate warning based on date range
  const warning = useMemo(() => {
    if (dateRange.startDate) {
      return getThreeYearsAgoWarning(dateRange.startDate)
    }
    return null
  }, [dateRange.startDate])

  // Handle date range changes (called when user selects dates on calendar)
  // This is only called for custom date selections, so we mark it as 'custom'
  const handleChange = useCallback((range: DateRange) => {
    onPeriodChange('custom', range.startDate, range.endDate)
  }, [onPeriodChange])

  // Handle preset changes (called when user clicks preset buttons)
  const handlePresetChange = useCallback((preset: PeriodPreset) => {
    // Convert canonical preset back to legacy format
    const legacyPreset = denormalizePeriodPreset(preset, 'revenue') as PeriodFilterValue
    // Note: dates are already set by the unified component via handleChange
    // We just need to update the period type
    onPeriodChange(legacyPreset)
  }, [onPeriodChange])

  return (
    <UnifiedPeriodFilter
      value={dateRange}
      onChange={handleChange}
      preset={normalizedPreset}
      onPresetChange={handlePresetChange}
      warning={warning}
    />
  )
}
