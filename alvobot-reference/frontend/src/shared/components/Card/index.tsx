import type { HTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'
import styles from './Card.module.css'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  children: ReactNode
}

export function Card({ variant = 'default', padding = 'md', interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        styles.card,
        styles[variant],
        styles[`padding-${padding}`],
        interactive && styles.interactive,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  action?: ReactNode
  children?: ReactNode
}

export function CardHeader({ title, subtitle, action, children, className, ...props }: CardHeaderProps) {
  return (
    <div className={clsx(styles.header, className)} {...props}>
      {children || (
        <>
          <div className={styles.headerContent}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {action && <div className={styles.action}>{action}</div>}
        </>
      )}
    </div>
  )
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={clsx(styles.body, className)} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div className={clsx(styles.footer, className)} {...props}>
      {children}
    </div>
  )
}
