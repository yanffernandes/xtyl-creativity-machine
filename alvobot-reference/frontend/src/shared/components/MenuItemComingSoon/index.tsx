import { Clock } from 'lucide-react'
import styles from './MenuItemComingSoon.module.css'

interface MenuItemComingSoonProps {
  icon: React.ComponentType<{ size?: number }>
  label: string
  comingSoonText?: string
}

/**
 * A disabled menu item that shows as "Coming Soon".
 * Used for features not available in the user's current plan.
 */
export function MenuItemComingSoon({
  icon: Icon,
  label,
  comingSoonText = 'Disponível em breve',
}: MenuItemComingSoonProps) {
  return (
    <div className={styles.menuItem} role="menuitem" aria-disabled="true">
      <div className={styles.content}>
        <Icon size={18} />
        <span className={styles.label}>{label}</span>
      </div>
      <span className={styles.badge}>
        <Clock size={10} />
        Em Breve
      </span>
      <div className={styles.tooltip}>{comingSoonText}</div>
    </div>
  )
}
