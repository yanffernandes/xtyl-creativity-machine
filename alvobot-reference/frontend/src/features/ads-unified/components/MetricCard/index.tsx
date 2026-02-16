/**
 * MetricCard Component
 *
 * Displays a single metric with label, value, and optional trend indicator.
 * Used in the Performance tab for displaying aggregated metrics.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import styles from './MetricCard.module.css'

export interface MetricCardProps {
  label: string
  value: string | number
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  format?: 'number' | 'currency' | 'percentage'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function MetricCard({
  label,
  value,
  trend,
  format = 'number',
  size = 'md',
  className = '',
}: MetricCardProps) {
  const formattedValue = formatValue(value, format)

  const getTrendIcon = () => {
    if (!trend) return null

    switch (trend.direction) {
      case 'up':
        return <TrendingUp size={14} />
      case 'down':
        return <TrendingDown size={14} />
      default:
        return <Minus size={14} />
    }
  }

  const getTrendClass = () => {
    if (!trend) return ''

    switch (trend.direction) {
      case 'up':
        return styles.trendUp
      case 'down':
        return styles.trendDown
      default:
        return styles.trendNeutral
    }
  }

  return (
    <div className={`${styles.card} ${styles[size]} ${className}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{formattedValue}</span>
      {trend && (
        <div className={`${styles.trend} ${getTrendClass()}`}>
          {getTrendIcon()}
          <span className={styles.trendValue}>
            {trend.value > 0 ? '+' : ''}
            {trend.value.toFixed(1)}%
          </span>
          {trend.label && <span className={styles.trendLabel}>{trend.label}</span>}
        </div>
      )}
    </div>
  )
}

function formatValue(value: string | number, format: 'number' | 'currency' | 'percentage'): string {
  if (typeof value === 'string') return value

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value)

    case 'percentage':
      return `${value.toFixed(2)}%`

    case 'number':
    default:
      if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`
      }
      if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}K`
      }
      return value.toLocaleString('pt-BR')
  }
}

export default MetricCard
