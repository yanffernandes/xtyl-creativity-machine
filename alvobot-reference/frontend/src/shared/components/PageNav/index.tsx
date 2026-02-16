import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './PageNav.module.css'

export interface PageNavItem {
  /** Path to navigate to */
  to: string
  /** Display label */
  label: string
  /** Optional icon */
  icon?: ReactNode
}

export interface PageNavProps {
  /** Array of navigation items */
  items: PageNavItem[]
  /** Optional class name */
  className?: string
}

/**
 * PageNav - Navigation component for sub-pages within a feature
 * 
 * Uses NavLink for automatic active state based on current route.
 * Visually similar to tabs but uses navigation instead of state.
 * 
 * Usage:
 * ```tsx
 * <PageNav
 *   items={[
 *     { to: '/ads', label: 'Performance', icon: <BarChart3 /> },
 *     { to: '/ads/automations', label: 'Automações', icon: <Settings /> },
 *     { to: '/ads/history', label: 'Histórico', icon: <History /> },
 *   ]}
 * />
 * ```
 */
export function PageNav({ items, className }: PageNavProps) {
  return (
    <nav className={`${styles.nav} ${className || ''}`}>
      <div className={styles.items}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/ads' || item.to === '/revenue'}
            className={({ isActive }) =>
              `${styles.item} ${isActive ? styles.active : ''}`
            }
          >
            {item.icon && <span className={styles.icon}>{item.icon}</span>}
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default PageNav
