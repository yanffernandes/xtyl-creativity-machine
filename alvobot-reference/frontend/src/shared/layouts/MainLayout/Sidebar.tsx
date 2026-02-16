import { useState, useEffect, useMemo } from 'react'
import {
  Home,
  FolderKanban,
  CheckSquare,
  Layers,
  FileText,
  Zap,
  ArrowUpRight,
  Facebook,
  Link2,
  Workflow,
  Send,
  Clock,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Search,
  X,
  Image,
  Megaphone,
  DollarSign,
  BookOpen,
  BarChart3,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { MenuItemComingSoon } from '@/shared/components/MenuItemComingSoon'
import { SidebarSkeleton } from '@/shared/components/SidebarSkeleton'
import { useMenuVisibilityMap } from '@/shared/hooks/useMenuVisibility'
import { useLayoutStore } from '@/shared/stores/layoutStore'
import { usePrivacyStore } from '@/shared/stores/privacyStore'
import type { MenuVisibilityStatus } from '@/shared/types/menu'
import styles from './Sidebar.module.css'

interface NavItem {
  icon: React.ComponentType<{ size?: number }>
  label: string
  path: string
  menuItemKey: string
}

interface NavSection {
  title: string
  shortTitle?: string
  color?: string
  items: NavItem[]
  collapsible?: boolean
  defaultOpen?: boolean
}

const navSections: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { icon: Home, label: 'Início', path: '/dashboard', menuItemKey: 'dashboard' },
      { icon: FolderKanban, label: 'Meus Blogs', path: '/projects', menuItemKey: 'projects' },
      { icon: CheckSquare, label: 'Minhas Tarefas', path: '/tasks', menuItemKey: 'tasks' },
      { icon: BookOpen, label: 'Cursos', path: '/courses', menuItemKey: 'courses' },
    ],
  },
  {
    title: 'FASE DE FUNDAÇÃO',
    shortTitle: 'FUND.',
    color: 'var(--color-primary)',
    collapsible: true,
    defaultOpen: true,
    items: [
      { icon: Layers, label: 'Estrutura de Base', path: '/base-structure', menuItemKey: 'base-structure' },
      { icon: FileText, label: 'Artigos de Base', path: '/articles?type=base', menuItemKey: 'base-articles' },
    ],
  },
  {
    title: 'FASE DE VALIDAÇÃO',
    shortTitle: 'VALI.',
    color: 'var(--color-primary)',
    collapsible: true,
    defaultOpen: true,
    items: [
      { icon: Zap, label: 'Mineração 10x', path: '/keywords', menuItemKey: 'keywords' },
      { icon: ArrowUpRight, label: 'Artigos Flecha', path: '/articles?type=arrow', menuItemKey: 'arrow-articles' },
    ],
  },
  {
    title: 'FASE DE ESCALA',
    shortTitle: 'ESC.',
    color: 'var(--color-primary)',
    collapsible: true,
    defaultOpen: true,
    items: [
      { icon: BarChart3, label: 'Central de Anúncios', path: '/ads', menuItemKey: 'unified-ads' },
      { icon: Facebook, label: 'AlvoADS Meta', path: '/alvoads-meta', menuItemKey: 'alvoads-meta' },
      { icon: Image, label: 'Biblioteca de Criativos', path: '/alvoads-meta/biblioteca', menuItemKey: 'alvoads-meta-library' },
      { icon: Search, label: 'AlvoADS Google', path: '/alvoads-google', menuItemKey: 'alvoads-google' },
      { icon: DollarSign, label: 'Receita', path: '/revenue', menuItemKey: 'revenue' },
      { icon: Megaphone, label: 'Google Ads Spy', path: '/google-ads', menuItemKey: 'google-ads' },
      { icon: Link2, label: 'Conexões', path: '/connections', menuItemKey: 'connections' },
      { icon: Workflow, label: 'Meus Fluxos', path: '/flows', menuItemKey: 'flows' },
      { icon: Send, label: 'Disparos', path: '/runs', menuItemKey: 'runs' },
      { icon: Clock, label: 'Acionadores', path: '/triggers', menuItemKey: 'triggers' },
    ],
  },
]

export function Sidebar() {
  const location = useLocation()
  const { isMobileMenuOpen, closeMobileMenu, isSidebarCollapsed, toggleSidebar } = useLayoutStore()
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyStore()
  const { isLoading, isError, visibilityMap, getVisibility } = useMenuVisibilityMap()

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    let firstCollapsibleFound = false
    navSections.forEach((section) => {
      if (section.collapsible) {
        // Only the first collapsible section starts open
        initial[section.title] = !firstCollapsibleFound && (section.defaultOpen ?? true)
        if (section.defaultOpen ?? true) {
          firstCollapsibleFound = true
        }
      }
    })
    return initial
  })

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu()
  }, [location.pathname, closeMobileMenu])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const isActive = (path: string) => {
    // Parse path to separate pathname and search params
    const [itemPathname, itemSearch] = path.split('?')

    // If the item has query params, check for exact match including search
    if (itemSearch) {
      const currentSearch = new URLSearchParams(location.search)
      const itemSearchParams = new URLSearchParams(itemSearch)

      // Check pathname matches
      if (location.pathname !== itemPathname) return false

      // Check all item search params exist in current search
      for (const [key, value] of itemSearchParams.entries()) {
        if (currentSearch.get(key) !== value) return false
      }
      return true
    }

    // Exact match for paths without query params
    if (location.pathname === path) return true

    // For parent routes like /alvoads-meta, don't match if a sibling route exists
    // Check if there's another nav item that is a more specific match
    const allPaths = navSections.flatMap(section => section.items.map(item => item.path.split('?')[0]))
    const hasMoreSpecificMatch = allPaths.some(
      p => p !== path && location.pathname.startsWith(p) && p.startsWith(`${path  }/`)
    )

    if (hasMoreSpecificMatch) return false

    // Otherwise check if current path starts with this path
    return location.pathname.startsWith(`${path  }/`)
  }

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const isCurrentlyOpen = prev[title]

      // If closing the current section, just close it
      if (isCurrentlyOpen) {
        return {
          ...prev,
          [title]: false,
        }
      }

      // If opening a section, close all other collapsible sections
      const newState: Record<string, boolean> = {}
      navSections.forEach((section) => {
        if (section.collapsible) {
          newState[section.title] = section.title === title
        }
      })
      return newState
    })
  }

  // Filter sections based on visibility
  // Fail-open: if loading or error, show all items
  const filteredSections = useMemo(() => {
    if (isLoading || isError) {
      // Fail-open: show all items during loading or on error
      return navSections
    }

    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const visibility = getVisibility(item.menuItemKey)
          // Show visible and coming_soon items, hide 'hidden' items
          return visibility !== 'hidden'
        }),
      }))
      // Hide sections with no visible children
      .filter((section) => section.items.length > 0)
  }, [isLoading, isError, getVisibility])

  // Get visibility status for an item (for rendering coming soon vs normal)
  const getItemVisibility = (menuItemKey: string): MenuVisibilityStatus => {
    if (isLoading || isError) {
      return 'visible' // Fail-open
    }
    return getVisibility(menuItemKey)
  }

  // Get coming soon text for an item
  const getComingSoonText = (menuItemKey: string): string => {
    const item = visibilityMap.get(menuItemKey)
    return item?.coming_soon_text || 'Disponível em breve'
  }

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <>
        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div
            className={`${styles.mobileOverlay} ${isMobileMenuOpen ? styles.visible : ''}`}
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
        )}

        <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.open : ''} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
          <SidebarSkeleton />
        </aside>
      </>
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <button
          className={`${styles.mobileOverlay} ${isMobileMenuOpen ? styles.visible : ''}`}
          onClick={closeMobileMenu}
          aria-hidden="true"
          type="button"
        />
      )}

      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.open : ''} ${isSidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={`${styles.logo} ${isSidebarCollapsed ? styles.logoWrapper : ''}`}>
            <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
            <img src="/favicon.png" alt="AlvoBot" className={styles.logoIcon} />
            {isSidebarCollapsed && (
              <span className={styles.tooltip}>AlvoBot</span>
            )}
          </div>
          <button
            className={styles.closeButton}
            onClick={closeMobileMenu}
            aria-label="Fechar menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navSections}>
            {filteredSections.map((section) => (
              <div key={section.title} className={styles.section}>
              <div className={styles.sectionHeaderWrapper}>
                {section.collapsible ? (
                  <button
                    type="button"
                    className={`${styles.sectionHeader} ${styles.collapsible}`}
                    style={section.color ? { color: section.color } : undefined}
                    onClick={() => toggleSection(section.title)}
                    aria-expanded={openSections[section.title]}
                  >
                    <span className={styles.sectionHeaderFull}>{section.title}</span>
                    {section.shortTitle && (
                      <span className={styles.sectionHeaderShort}>{section.shortTitle}</span>
                    )}
                    <span className={styles.chevron}>
                      {openSections[section.title] ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </span>
                  </button>
                ) : (
                  <div
                    className={styles.sectionHeader}
                    style={section.color ? { color: section.color } : undefined}
                  >
                    <span className={styles.sectionHeaderFull}>{section.title}</span>
                    {section.shortTitle && (
                      <span className={styles.sectionHeaderShort}>{section.shortTitle}</span>
                    )}
                  </div>
                )}
                {isSidebarCollapsed && section.shortTitle && (
                  <span className={styles.tooltip}>{section.title}</span>
                )}
              </div>

              {(!section.collapsible || openSections[section.title]) && (
                <ul className={styles.navList}>
                  {section.items.map((item) => {
                    const visibility = getItemVisibility(item.menuItemKey)

                    // Render as "Coming Soon" for restricted items
                    if (visibility === 'coming_soon') {
                      return (
                        <li key={item.path} className={styles.navItemWrapper}>
                          <MenuItemComingSoon
                            icon={item.icon}
                            label={item.label}
                            comingSoonText={getComingSoonText(item.menuItemKey)}
                          />
                          {isSidebarCollapsed && (
                            <span className={styles.tooltip}>{item.label}</span>
                          )}
                        </li>
                      )
                    }

                    // Render normal nav link for visible items
                    return (
                      <li key={item.path} className={styles.navItemWrapper}>
                        <NavLink
                          to={item.path}
                          className={() =>
                            `${styles.navItem} ${isActive(item.path) ? styles.active : ''}`
                          }
                          onClick={closeMobileMenu}
                        >
                          <item.icon size={18} />
                          <span className={styles.navItemLabel}>{item.label}</span>
                        </NavLink>
                        {isSidebarCollapsed && (
                          <span className={styles.tooltip}>{item.label}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              </div>
            ))}
          </div>

          <div className={styles.bottomNav}>
            <div className={styles.navItemWrapper}>
              <button
                className={styles.navItem}
                onClick={togglePrivacyMode}
                title={isPrivacyMode ? 'Mostrar informações sensíveis' : 'Ocultar informações sensíveis'}
              >
                {isPrivacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
                <span className={styles.navItemLabel}>Ocultar Informações</span>
                <span className={`${styles.toggle} ${isPrivacyMode ? styles.toggleOn : ''}`} />
              </button>
              {isSidebarCollapsed && (
                <span className={styles.tooltip}>
                  {isPrivacyMode ? 'Mostrar informações' : 'Ocultar informações'}
                </span>
              )}
            </div>

            <div className={styles.collapseToggleWrapper}>
              <button
                className={styles.collapseToggle}
                onClick={toggleSidebar}
                aria-label={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                <ChevronLeft size={18} className={styles.collapseIcon} />
                <span className={styles.collapseToggleLabel}>Recolher menu</span>
              </button>
              {isSidebarCollapsed && (
                <span className={styles.tooltip}>Expandir menu</span>
              )}
            </div>

            <div className={styles.version}>V1.0.0</div>
          </div>
        </nav>
      </aside>
    </>
  )
}
