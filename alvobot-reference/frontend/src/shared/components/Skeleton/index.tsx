import { clsx } from 'clsx'
import styles from './Skeleton.module.css'

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  animation?: 'pulse' | 'wave' | 'none'
  className?: string
}

export function Skeleton({
  width,
  height,
  variant = 'text',
  animation = 'wave',
  className,
}: SkeletonProps) {
  return (
    <span
      className={clsx(
        styles.skeleton,
        styles[variant],
        styles[`animation-${animation}`],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  )
}

// Skeleton Text - multiple lines
export interface SkeletonTextProps {
  lines?: number
  lastLineWidth?: string
  spacing?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  spacing = 'md',
  className,
}: SkeletonTextProps) {
  return (
    <div className={clsx(styles.textWrapper, styles[`spacing-${spacing}`], className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}

// Skeleton Card
export interface SkeletonCardProps {
  hasImage?: boolean
  imageHeight?: number
  lines?: number
  className?: string
}

export function SkeletonCard({
  hasImage = true,
  imageHeight = 200,
  lines = 3,
  className,
}: SkeletonCardProps) {
  return (
    <div className={clsx(styles.card, className)}>
      {hasImage && (
        <Skeleton variant="rectangular" height={imageHeight} width="100%" />
      )}
      <div className={styles.cardContent}>
        <Skeleton variant="text" width="80%" height={24} />
        <SkeletonText lines={lines} spacing="sm" />
      </div>
    </div>
  )
}

// Skeleton Table
export interface SkeletonTableProps {
  rows?: number
  columns?: number
  hasHeader?: boolean
  className?: string
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className,
}: SkeletonTableProps) {
  return (
    <div className={clsx(styles.table, className)}>
      {hasHeader && (
        <div className={styles.tableHeader}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} variant="text" height={16} />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={styles.tableRow}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width={colIndex === 0 ? '70%' : '90%'}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Skeleton Avatar
export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function SkeletonAvatar({ size = 'md', className }: SkeletonAvatarProps) {
  const sizes = { sm: 32, md: 40, lg: 48, xl: 64 }
  return (
    <Skeleton
      variant="circular"
      width={sizes[size]}
      height={sizes[size]}
      className={className}
    />
  )
}

// Skeleton Button
export interface SkeletonButtonProps {
  size?: 'sm' | 'md' | 'lg'
  width?: string | number
  className?: string
}

export function SkeletonButton({ size = 'md', width = 120, className }: SkeletonButtonProps) {
  const heights = { sm: 32, md: 40, lg: 48 }
  return (
    <Skeleton
      variant="rounded"
      width={width}
      height={heights[size]}
      className={className}
    />
  )
}
