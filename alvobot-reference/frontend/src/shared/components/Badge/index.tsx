import type { HTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'
import styles from './Badge.module.css'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
  outline?: boolean
  children: ReactNode
}

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  outline = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={clsx(
        styles.badge,
        styles[variant],
        styles[size],
        outline && styles.outline,
        dot && styles.withDot,
        className
      )}
      {...props}
    >
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  )
}

// Status Badge - for status indicators
export interface StatusBadgeProps {
  status: 'online' | 'offline' | 'away' | 'busy' | 'pending'
  label?: string
  showDot?: boolean
  className?: string
}

export function StatusBadge({ status, label, showDot = true, className }: StatusBadgeProps) {
  const statusConfig = {
    online: { variant: 'success' as const, defaultLabel: 'Online' },
    offline: { variant: 'default' as const, defaultLabel: 'Offline' },
    away: { variant: 'warning' as const, defaultLabel: 'Ausente' },
    busy: { variant: 'error' as const, defaultLabel: 'Ocupado' },
    pending: { variant: 'info' as const, defaultLabel: 'Pendente' },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} dot={showDot} size="sm" className={className}>
      {label || config.defaultLabel}
    </Badge>
  )
}

// Counter Badge - for notifications
export interface CounterBadgeProps {
  count: number
  max?: number
  showZero?: boolean
  variant?: 'primary' | 'error'
  className?: string
}

export function CounterBadge({
  count,
  max = 99,
  showZero = false,
  variant = 'error',
  className,
}: CounterBadgeProps) {
  if (count === 0 && !showZero) return null

  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <span className={clsx(styles.counter, styles[`counter-${variant}`], className)}>
      {displayCount}
    </span>
  )
}
