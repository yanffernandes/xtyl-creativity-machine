import { Outlet } from 'react-router-dom'
import { BugReportButton } from '@/features/bug-report/components'
import { useWorkspaceChangeEffect } from '@/shared/hooks/useWorkspaceChangeGuard'
import { Header } from './Header'
import styles from './MainLayout.module.css'
import { Sidebar } from './Sidebar'

export function MainLayout() {
  // Handle workspace change side-effects (query invalidation, navigation)
  useWorkspaceChangeEffect()

  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.main}>
        <Header />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
      <BugReportButton />
    </div>
  )
}
