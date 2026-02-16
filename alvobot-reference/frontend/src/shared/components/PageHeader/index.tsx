import type { ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '../Button'
import styles from './PageHeader.module.css'

export interface PageHeaderProps {
  /** Icon component to display (e.g., DollarSign, BarChart3) */
  icon: ReactNode
  /** Page title (H1) */
  title: string
  /** Optional subtitle text */
  subtitle?: string
  /** Cache status text (e.g., "há 5 min", "há 1h") */
  cacheTime?: string | null
  /** Whether data is currently refreshing */
  isRefreshing?: boolean
  /** Callback when refresh button is clicked */
  onRefresh?: () => void
  /** Primary CTA button (e.g., "Nova Campanha") */
  primaryAction?: {
    label: string
    icon?: ReactNode
    onClick: () => void
  }
  /**
   * Secondary actions area - Pills/Selectors with label
   * Use with a labeled selector like: <PlatformSelector label="Plataforma:" ... />
   */
  secondaryActions?: ReactNode
  /** Additional content to render (deprecated - use secondaryActions) */
  rightContent?: ReactNode
}

/**
 * PageHeader - Standard page header for data dashboard pages
 * 
 * STANDARDIZED LAYOUT (Design System):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ [Icon] Title          | [Pill Selector]  | [Cache] [Refresh] [CTA] │
 * │        Subtitle       | (secondaryActions) | (System Actions)      │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * Grid structure:
 * - LEFT: Icon + Title + Subtitle (flex-grow)
 * - CENTER: Secondary actions (Pills with label "Fonte:", "Plataforma:")
 * - RIGHT: System actions (Cache status + Refresh + Primary CTA)
 * 
 * Based on CLAUDE.md Blueprint:
 * - Cache status always visible, LEFT of Refresh button
 * - Refresh button never disappears
 * - Primary CTA only for operational pages (optional)
 */
export function PageHeader({
  icon,
  title,
  subtitle,
  cacheTime,
  isRefreshing = false,
  onRefresh,
  primaryAction,
  secondaryActions,
  rightContent,
}: PageHeaderProps) {
  // Check if we have system actions to show
  const hasSystemActions = onRefresh || primaryAction
  
  return (
    <header className={styles.header}>
      {/* LEFT: Title Section */}
      <div className={styles.titleSection}>
        <div className={styles.titleIcon}>
          {icon}
        </div>
        <div className={styles.titleContent}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && (
            <p className={styles.subtitle}>{subtitle}</p>
          )}
        </div>
      </div>

      {/* CENTER: Secondary Actions (Pills/Selectors) */}
      {(secondaryActions || rightContent) && (
        <div className={styles.headerCenter}>
          {secondaryActions}
          {rightContent}
        </div>
      )}

      {/* RIGHT: System Actions (Cache + Refresh + CTA) */}
      {hasSystemActions && (
        <div className={styles.headerActions}>
          {/* Refresh button with timestamp */}
          {onRefresh && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              leftIcon={
                <RefreshCw
                  size={16}
                  className={isRefreshing ? styles.spinning : undefined}
                />
              }
            >
              {isRefreshing ? 'Atualizando...' : (cacheTime || '')}
            </Button>
          )}

          {/* Primary CTA - Far right */}
          {primaryAction && (
            <Button
              variant="primary"
              onClick={primaryAction.onClick}
              leftIcon={primaryAction.icon}
            >
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}
    </header>
  )
}

export default PageHeader
