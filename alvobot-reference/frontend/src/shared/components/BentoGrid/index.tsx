import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import styles from './BentoGrid.module.css'

export interface BentoGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4 | 6 | 12
  gap?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function BentoGrid({
  children,
  columns = 4,
  gap = 'md',
  className,
}: BentoGridProps) {
  return (
    <div
      className={clsx(
        styles.grid,
        styles[`cols-${columns}`],
        styles[`gap-${gap}`],
        className
      )}
    >
      {children}
    </div>
  )
}

export interface BentoItemProps {
  children?: ReactNode
  title?: string
  description?: string
  icon?: ReactNode
  badge?: ReactNode
  footer?: ReactNode
  colSpan?: 1 | 2 | 3 | 4 | 6 | 'full'
  rowSpan?: 1 | 2 | 3
  variant?: 'default' | 'subtle' | 'outlined' | 'gradient' | 'primary' | 'dark'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  featured?: boolean
  showBackground?: boolean
  onClick?: () => void
  className?: string
}

export function BentoItem({
  children,
  title,
  description,
  icon,
  badge,
  footer,
  colSpan = 1,
  rowSpan = 1,
  variant = 'default',
  size = 'md',
  interactive = false,
  featured = false,
  showBackground = false,
  onClick,
  className,
}: BentoItemProps) {
  const isClickable = interactive || !!onClick
  const Component = isClickable ? 'button' : 'div'
  const componentProps = isClickable ? { type: 'button' as const } : {}

  return (
    <Component
      {...componentProps}
      className={clsx(
        styles.item,
        styles[variant],
        styles[`size-${size}`],
        styles[`colSpan-${colSpan}`],
        styles[`rowSpan-${rowSpan}`],
        isClickable && styles.interactive,
        featured && styles.featured,
        className
      )}
      onClick={onClick}
    >
      {showBackground && <div className={styles.itemBackground} />}

      {(icon || badge) && (
        <div className={styles.itemHeader}>
          {icon && <div className={styles.itemIcon}>{icon}</div>}
          {badge && <div className={styles.itemBadge}>{badge}</div>}
        </div>
      )}

      {title && <h3 className={styles.itemTitle}>{title}</h3>}
      {description && <p className={styles.itemDescription}>{description}</p>}

      {children && <div className={styles.itemContent}>{children}</div>}

      {footer && <div className={styles.itemFooter}>{footer}</div>}
    </Component>
  )
}

// Compound component exports
BentoGrid.Item = BentoItem
