import styles from './AlvobotBadge.module.css'

interface AlvobotBadgeProps {
  /** Optional smaller size for nested rows */
  size?: 'default' | 'small'
}

/**
 * Badge indicating a campaign was created by AlvoBot
 */
export function AlvobotBadge({ size = 'default' }: AlvobotBadgeProps) {
  return (
    <span className={`${styles.badge} ${size === 'small' ? styles.small : ''}`}>
      AlvoBot
    </span>
  )
}
