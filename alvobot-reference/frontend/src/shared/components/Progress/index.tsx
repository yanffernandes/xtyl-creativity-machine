import { clsx } from 'clsx'
import styles from './Progress.module.css'

export interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  animated?: boolean
  striped?: boolean
  className?: string
}

export function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = false,
  striped = false,
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={clsx(styles.wrapper, className)}>
      {(showLabel || label) && (
        <div className={styles.labelRow}>
          {label && <span className={styles.label}>{label}</span>}
          {showLabel && <span className={styles.percentage}>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div
        className={clsx(styles.track, styles[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={clsx(
            styles.bar,
            styles[variant],
            animated && styles.animated,
            striped && styles.striped
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Circular Progress
export interface CircularProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  thickness?: number
  className?: string
}

export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  thickness,
  className,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const sizes = { sm: 32, md: 48, lg: 64 }
  const thicknesses = { sm: 3, md: 4, lg: 5 }

  const svgSize = sizes[size]
  const strokeWidth = thickness || thicknesses[size]
  const radius = (svgSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className={clsx(styles.circularWrapper, className)}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        className={styles.circular}
      >
        <circle
          className={styles.circularTrack}
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className={clsx(styles.circularBar, styles[`circular-${variant}`])}
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      {showLabel && (
        <span className={clsx(styles.circularLabel, styles[`label-${size}`])}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

// Indeterminate Progress (loading)
export interface IndeterminateProgressProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary'
  className?: string
}

export function IndeterminateProgress({
  size = 'md',
  variant = 'primary',
  className,
}: IndeterminateProgressProps) {
  return (
    <div className={clsx(styles.track, styles[size], styles.indeterminate, className)}>
      <div className={clsx(styles.bar, styles[variant], styles.indeterminateBar)} />
    </div>
  )
}
