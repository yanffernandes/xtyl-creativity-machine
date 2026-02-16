/**
 * Shared number and currency formatting utilities
 * Uses Brazilian Portuguese (pt-BR) locale by default
 */

export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${formatNumber(value)}%`
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value))
}

/**
 * Format currency with compact notation (K, M, B)
 * Example: 1500 → R$ 1,5 mil
 */
export function formatCompactCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value)
}

/**
 * Format number with compact notation
 * Example: 1500000 → 1,5 mi
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value)
}
