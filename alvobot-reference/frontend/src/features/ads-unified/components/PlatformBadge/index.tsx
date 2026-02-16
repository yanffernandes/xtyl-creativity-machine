import { serviceIcons } from '@/assets/icons/services'
import styles from './PlatformBadge.module.css'
import type { AdsPlatform } from '../../types'

const platformConfig: Record<AdsPlatform, { label: string; icon: string }> = {
  google: { label: 'Google Ads', icon: serviceIcons.ads },
  meta: { label: 'Meta Ads', icon: serviceIcons.meta },
}

interface PlatformBadgeProps {
  platform: AdsPlatform
  size?: 'sm' | 'md' | 'lg'
  compact?: boolean
  className?: string
}

export function PlatformBadge({
  platform,
  size = 'md',
  compact = false,
  className = '',
}: PlatformBadgeProps) {
  const config = platformConfig[platform]

  const classes = [
    styles.badge,
    styles[platform],
    size !== 'md' && styles[size],
    compact && styles.compact,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes}>
      <img src={config.icon} alt="" className={styles.icon} />
      <span className={styles.label}>{config.label}</span>
    </span>
  )
}
