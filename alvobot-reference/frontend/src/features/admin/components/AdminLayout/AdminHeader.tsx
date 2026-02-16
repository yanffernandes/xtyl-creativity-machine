import { useState } from 'react'
import { Menu, Bell, LogOut, User, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import styles from './AdminHeader.module.css'
import { useAdminStore } from '../../stores/adminStore'

export function AdminHeader() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const { adminData, clearAdmin } = useAdminStore()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const handleLogout = async () => {
    clearAdmin()
    await logout()
    navigate('/login')
  }

  const handleBackToApp = () => {
    navigate('/dashboard')
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuButton} aria-label="Abrir menu">
          <Menu size={24} />
        </button>

        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbItem}>Admin</span>
        </div>
      </div>

      <div className={styles.right}>
        {/* Notifications */}
        <button className={styles.iconButton} aria-label="Notificacoes">
          <Bell size={20} />
          <span className={styles.notificationBadge}>3</span>
        </button>

        {/* User dropdown */}
        <div className={styles.dropdown}>
          <button
            className={styles.userButton}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
          >
            <div className={styles.userAvatar}>
              {adminData?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>
                {adminData?.full_name || user?.email || 'Admin'}
              </span>
              <span className={styles.userRole}>{adminData?.role_name || 'Administrador'}</span>
            </div>
            <ChevronDown
              size={16}
              className={`${styles.chevron} ${isDropdownOpen ? styles.open : ''}`}
            />
          </button>

          {isDropdownOpen && (
            <>
              <button
                type="button"
                className={styles.dropdownOverlay}
                onClick={() => setIsDropdownOpen(false)}
                aria-label="Fechar menu"
              />
              <div className={styles.dropdownMenu}>
                <button
                  className={styles.dropdownItem}
                  onClick={handleBackToApp}
                >
                  <User size={16} />
                  Voltar ao App
                </button>
                <div className={styles.dropdownDivider} />
                <button
                  className={`${styles.dropdownItem} ${styles.danger}`}
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
