import type { HTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react'
import styles from './Alert.module.css'

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children?: ReactNode
  onClose?: () => void
  showIcon?: boolean
}

const icons = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
}

export function Alert({
  variant = 'info',
  title,
  children,
  onClose,
  showIcon = true,
  className,
  ...props
}: AlertProps) {
  const Icon = icons[variant]

  return (
    <div className={clsx(styles.alert, styles[variant], className)} role="alert" {...props}>
      {showIcon && (
        <span className={styles.icon}>
          <Icon size={20} />
        </span>
      )}
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        {children && <div className={styles.message}>{children}</div>}
      </div>
      {onClose && (
        <button className={styles.closeButton} onClick={onClose} aria-label="Dismiss alert">
          <X size={16} />
        </button>
      )}
    </div>
  )
}
