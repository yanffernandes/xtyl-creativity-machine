/**
 * Format a number with locale-specific separators
 */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a number as an integer
 */
export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString('pt-BR')
}

/**
 * Format a decimal number
 */
export function formatDecimal(value: number, decimals = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${hours}h ${remainingMinutes}m`
}

/**
 * Format duration as mm:ss
 */
export function formatDurationMinSec(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format currency
 */
export function formatCurrency(value: number, currency = 'BRL'): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatCompact(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`
  }
  return formatInteger(value)
}

/**
 * Format date string (YYYYMMDD) to readable format
 */
export function formatDateFromGA(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr

  const year = dateStr.slice(0, 4)
  const month = dateStr.slice(4, 6)
  const day = dateStr.slice(6, 8)

  const date = new Date(`${year}-${month}-${day}`)
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format week number to readable format
 */
export function formatWeek(weekStr: string): string {
  // Format: YYYY-Www or similar
  if (weekStr.includes('W')) {
    const parts = weekStr.split('W')
    return `Semana ${parts[1]} de ${parts[0]}`
  }
  return `Semana ${weekStr}`
}

/**
 * Format month (YYYYMM) to readable format
 */
export function formatMonth(monthStr: string): string {
  if (monthStr.length !== 6) return monthStr

  const year = monthStr.slice(0, 4)
  const month = monthStr.slice(4, 6)

  const date = new Date(`${year}-${month}-01`)
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
}
