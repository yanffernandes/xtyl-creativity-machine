import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Building2,
  Settings,
  Shield,
  Activity,
  ChevronLeft,
  X,
  FileText,
  BarChart3,
  MessageSquare,
  Megaphone,
  BookOpen,
  Menu,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import styles from './AdminSidebar.module.css'
import { useAdminStore } from '../../stores/adminStore'

interface NavItem {
  icon: React.ComponentType<{ size?: number }>
  label: string
  path: string
  permission?: { resource: string; action: string }
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
      { icon: Users, label: 'Usuarios', path: '/admin/users', permission: { resource: 'users', action: 'view' } },
      { icon: Building2, label: 'Workspaces', path: '/admin/workspaces', permission: { resource: 'workspaces', action: 'view' } },
    ],
  },
  {
    title: 'FINANCEIRO',
    items: [
      { icon: CreditCard, label: 'Assinaturas', path: '/admin/subscriptions', permission: { resource: 'subscriptions', action: 'view' } },
      { icon: FileText, label: 'Planos', path: '/admin/plans', permission: { resource: 'subscriptions', action: 'view' } },
    ],
  },
  {
    title: 'CONTEÚDO',
    items: [
      { icon: BookOpen, label: 'Cursos', path: '/admin/courses', permission: { resource: 'settings', action: 'view' } },
    ],
  },
  {
    title: 'FERRAMENTAS',
    items: [
      { icon: Megaphone, label: 'Google Ads Spy', path: '/admin/google-ads', permission: { resource: 'settings', action: 'view' } },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { icon: Shield, label: 'Administradores', path: '/admin/admins', permission: { resource: 'admins', action: 'view' } },
      { icon: Activity, label: 'Auditoria', path: '/admin/audit', permission: { resource: 'reports', action: 'view' } },
      { icon: MessageSquare, label: 'Prompts', path: '/admin/system-prompts', permission: { resource: 'settings', action: 'view' } },
      { icon: Menu, label: 'Visibilidade de Menu', path: '/admin/menu-visibility', permission: { resource: 'settings', action: 'view' } },
      { icon: BarChart3, label: 'Relatorios', path: '/admin/reports', permission: { resource: 'reports', action: 'view' } },
      { icon: Settings, label: 'Configuracoes', path: '/admin/settings', permission: { resource: 'settings', action: 'view' } },
    ],
  },
]

export function AdminSidebar() {
  const location = useLocation()
  const { hasPermission, adminData } = useAdminStore()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin'
    }
    return location.pathname.startsWith(path)
  }

  const canViewItem = (item: NavItem) => {
    if (!item.permission) return true
    return hasPermission(item.permission.resource as keyof typeof hasPermission, item.permission.action)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className={`${styles.mobileOverlay} ${isMobileOpen ? styles.visible : ''}`}
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`${styles.sidebar} ${isMobileOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <Shield size={24} className={styles.logoIcon} />
            <span className={styles.logoText}>Admin</span>
          </div>
          <button
            className={styles.closeButton}
            onClick={() => setIsMobileOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Admin info */}
        <div className={styles.adminInfo}>
          <div className={styles.adminAvatar}>
            {adminData?.full_name?.charAt(0) || adminData?.email?.charAt(0) || 'A'}
          </div>
          <div className={styles.adminDetails}>
            <span className={styles.adminName}>
              {adminData?.full_name || adminData?.email || 'Admin'}
            </span>
            <span className={styles.adminRole}>{adminData?.role_name || 'Administrador'}</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {navSections.map((section) => {
            const visibleItems = section.items.filter(canViewItem)
            if (visibleItems.length === 0) return null

            return (
              <div key={section.title} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span>{section.title}</span>
                </div>

                <ul className={styles.navList}>
                  {visibleItems.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                        end={item.path === '/admin'}
                      >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          <div className={styles.bottomNav}>
            <NavLink to="/dashboard" className={styles.navItem}>
              <ChevronLeft size={18} />
              <span>Voltar ao App</span>
            </NavLink>

            <div className={styles.version}>Admin v1.0.0</div>
          </div>
        </nav>
      </aside>
    </>
  )
}
