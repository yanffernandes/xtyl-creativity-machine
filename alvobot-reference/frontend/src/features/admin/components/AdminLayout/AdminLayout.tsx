import { Outlet } from 'react-router-dom'
import { AdminHeader } from './AdminHeader'
import styles from './AdminLayout.module.css'
import { AdminSidebar } from './AdminSidebar'

export function AdminLayout() {
  return (
    <div className={styles.layout}>
      <AdminSidebar />
      <div className={styles.main}>
        <AdminHeader />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
