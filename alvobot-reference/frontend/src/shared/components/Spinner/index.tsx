import { clsx } from 'clsx'
import styles from './Spinner.module.css'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <div className={clsx(styles.spinner, styles[size], className)} role="status" aria-label="Loading">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
        />
      </svg>
    </div>
  )
}

export interface LoadingOverlayProps {
  isLoading: boolean
  children?: React.ReactNode
}

export function LoadingOverlay({ isLoading, children }: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>

  return (
    <div className={styles.overlay}>
      <Spinner size="lg" />
    </div>
  )
}
