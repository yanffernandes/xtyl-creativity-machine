import { useMemo, useCallback } from 'react'
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
  Image,
  Megaphone,
  DollarSign,
  BookOpen,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { MenuVisibilityConfig } from '@/shared/types/menu'
import styles from './MenuVisibilityPreview.module.css'

interface MenuVisibilityPreviewProps {
  configs: MenuVisibilityConfig[]
  selectedPlanId: number | null
}

interface NavItem {
  icon: LucideIcon
  label: string
  menuItemKey: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

// Match the sidebar structure
const navSections: NavSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      { icon: Home, label: 'Início', menuItemKey: 'dashboard' },
      { icon: FolderKanban, label: 'Meus Blogs', menuItemKey: 'projects' },
      { icon: CheckSquare, label: 'Minhas Tarefas', menuItemKey: 'tasks' },
      { icon: BookOpen, label: 'Cursos', menuItemKey: 'courses' },
    ],
  },
  {
    title: 'FASE DE FUNDAÇÃO',
    items: [
      { icon: Layers, label: 'Estrutura de Base', menuItemKey: 'base-structure' },
      { icon: FileText, label: 'Artigos de Base', menuItemKey: 'base-articles' },
    ],
  },
  {
    title: 'FASE DE VALIDAÇÃO',
    items: [
      { icon: Zap, label: 'Mineração 10x', menuItemKey: 'keywords' },
      { icon: ArrowUpRight, label: 'Artigos Flecha', menuItemKey: 'arrow-articles' },
    ],
  },
  {
    title: 'FASE DE ESCALA',
    items: [
      { icon: Facebook, label: 'AlvoADS Meta', menuItemKey: 'alvoads-meta' },
      { icon: Image, label: 'Biblioteca de Criativos', menuItemKey: 'alvoads-meta-library' },
      { icon: Search, label: 'AlvoADS Google', menuItemKey: 'alvoads-google' },
      { icon: DollarSign, label: 'Receita', menuItemKey: 'revenue' },
      { icon: Megaphone, label: 'Google Ads Spy', menuItemKey: 'google-ads' },
      { icon: Link2, label: 'Conexões', menuItemKey: 'connections' },
      { icon: Workflow, label: 'Meus Fluxos', menuItemKey: 'flows' },
      { icon: Send, label: 'Disparos', menuItemKey: 'runs' },
      { icon: Clock, label: 'Acionadores', menuItemKey: 'triggers' },
    ],
  },
  {
    title: 'SISTEMA',
    items: [{ icon: Settings, label: 'Configurações', menuItemKey: 'settings' }],
  },
]

type VisibilityStatus = 'visible' | 'coming_soon' | 'hidden'

export function MenuVisibilityPreview({ configs, selectedPlanId }: MenuVisibilityPreviewProps) {
  // Build config map for fast lookup
  const configMap = useMemo(() => {
    const map = new Map<string, MenuVisibilityConfig>()
    configs.forEach((config) => {
      map.set(config.menu_item_key, config)
    })
    return map
  }, [configs])

  // Determine visibility for a menu item based on selected plan
  const getVisibility = useCallback((menuItemKey: string): VisibilityStatus => {
    const config = configMap.get(menuItemKey)

    // If no config, default to visible (fail-open)
    if (!config) {
      return 'visible'
    }

    // Public items are always visible
    if (config.is_public) {
      return 'visible'
    }

    // If user is in the plan_ids array, visible
    if (selectedPlanId !== null && config.plan_ids.includes(selectedPlanId)) {
      return 'visible'
    }

    // Not in plan, check if coming soon or hidden
    if (config.show_as_coming_soon) {
      return 'coming_soon'
    }

    return 'hidden'
  }, [configMap, selectedPlanId])

  // Filter sections based on visibility
  const filteredSections = useMemo(() => {
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          visibility: getVisibility(item.menuItemKey),
        })),
      }))
      .filter((section) => section.items.some((item) => item.visibility !== 'hidden'))
  }, [getVisibility])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Preview do Menu</h3>
        <p className={styles.subtitle}>
          {selectedPlanId === null
            ? 'Visualização para usuários sem plano'
            : 'Visualização para o plano selecionado'}
        </p>
      </div>

      <div className={styles.sidebar}>
        <div className={styles.logo}>
          <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
        </div>

        <nav className={styles.nav}>
          {filteredSections.map((section) => (
            <div key={section.title} className={styles.section}>
              <div className={styles.sectionHeader}>{section.title}</div>
              <ul className={styles.navList}>
                {section.items
                  .filter((item) => item.visibility !== 'hidden')
                  .map((item) => (
                    <li key={item.menuItemKey}>
                      <div
                        className={`${styles.navItem} ${item.visibility === 'coming_soon' ? styles.comingSoon : ''}`}
                      >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                        {item.visibility === 'coming_soon' && (
                          <span className={styles.badge}>Em Breve</span>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}
