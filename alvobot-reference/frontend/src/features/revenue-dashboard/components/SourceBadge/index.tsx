/**
 * SourceBadge - Badge component for Ad Manager/AdSense source
 * 
 * STANDARDIZED: Uses Icon + Text pattern (matches Central de Anúncios PlatformBadge)
 * This provides a visually richer and faster-to-read experience than text-only badges.
 */
import { serviceIcons } from '@/assets/icons/services'
import styles from './SourceBadge.module.css'
import type { RevenueSource } from '../../types'

const sourceConfig: Record<RevenueSource, { label: string; icon: string }> = {
  ad_manager: { label: 'Ad Manager', icon: serviceIcons.ad_manager },
  adsense: { label: 'AdSense', icon: serviceIcons.adsense },
}

interface SourceBadgeProps {
  source: RevenueSource
  /** Optional source name for tooltip (e.g., network/account name) */
  sourceName?: string
  size?: 'sm' | 'md'
  className?: string
}

export function SourceBadge({
  source,
  sourceName,
  size = 'md',
  className = '',
}: SourceBadgeProps) {
  const config = sourceConfig[source]

  if (!config) {
    return null
  }

  const classes = [
    styles.badge,
    styles[source],
    size !== 'md' && styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span 
      className={classes}
      role="status"
      aria-label={`Fonte: ${config.label}${sourceName ? ` (${sourceName})` : ''}`}
      title={sourceName || config.label}
    >
      <img src={config.icon} alt="" className={styles.icon} aria-hidden="true" />
      <span className={styles.label}>{config.label}</span>
    </span>
  )
}
