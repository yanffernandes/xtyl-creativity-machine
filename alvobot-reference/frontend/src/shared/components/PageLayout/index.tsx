import type { ReactNode } from 'react'
import styles from './PageLayout.module.css'

export interface PageLayoutProps {
  children: ReactNode
  className?: string
}

/**
 * PageLayout - Standard page container for data dashboard pages
 * 
 * Structure:
 * 1. PageHeader (required)
 * 2. FilterBar (required)
 * 3. SummaryCards (optional)
 * 4. Tabs (optional)
 * 5. Content (table/list/graph)
 * 
 * Usage:
 * ```tsx
 * <PageLayout>
 *   <PageHeader ... />
 *   <FilterBar ... />
 *   <SummaryCardsGrid ... />
 *   <Tabs ... /> // optional
 *   <Card>...</Card>
 * </PageLayout>
 * ```
 */
export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={`${styles.container} ${className || ''}`}>
      {children}
    </div>
  )
}

export default PageLayout
