/**
 * Date Range Utilities for Unified Ads Dashboard
 * Converts period strings to date ranges
 */

import type { DashboardPeriod } from '../types'

export function getDateRangeFromPeriod(period: DashboardPeriod): {
  startDate: string
  endDate: string
} {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let startDate: Date
  let endDate: Date = today

  switch (period) {
    case 'today':
      startDate = today
      break
    case 'yesterday':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 1)
      endDate = new Date(startDate)
      break
    case 'last_7d':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 6)
      break
    case 'last_30d':
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 29)
      break
    default:
      startDate = new Date(today)
      startDate.setDate(startDate.getDate() - 6)
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}
