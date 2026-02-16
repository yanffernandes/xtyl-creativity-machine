import { useState, useMemo, useRef } from 'react'
import { Pencil, Shield, Globe, Clock, EyeOff, Filter, HelpCircle, Columns3 } from 'lucide-react'
import { useMenuVisibilityConfigs, useAdminPlans } from '@/features/admin/api/queries'
import { Tooltip } from '@/shared/components'
import { useColumnResize, useColumnReorder } from '@/shared/hooks'
import type { MenuVisibilityConfig } from '@/shared/types/menu'
import { MenuVisibilityEditModal } from '../MenuVisibilityEditModal'
import styles from './MenuVisibilityTable.module.css'

type StatusFilter = 'all' | 'public' | 'restricted' | 'coming_soon' | 'hidden'

// Map menu item keys to human-readable labels
const menuItemLabels: Record<string, { label: string; section: string }> = {
  dashboard: { label: 'Início', section: 'Principal' },
  projects: { label: 'Meus Blogs', section: 'Principal' },
  tasks: { label: 'Minhas Tarefas', section: 'Principal' },
  courses: { label: 'Cursos', section: 'Principal' },
  'base-structure': { label: 'Estrutura de Base', section: 'Fase de Fundação' },
  'base-articles': { label: 'Artigos de Base', section: 'Fase de Fundação' },
  keywords: { label: 'Mineração 10x', section: 'Fase de Validação' },
  'arrow-articles': { label: 'Artigos Flecha', section: 'Fase de Validação' },
  'alvoads-meta': { label: 'AlvoADS Meta', section: 'Fase de Escala' },
  'alvoads-meta-library': { label: 'Biblioteca de Criativos', section: 'Fase de Escala' },
  'alvoads-google': { label: 'AlvoADS Google', section: 'Fase de Escala' },
  receita: { label: 'Receita', section: 'Fase de Escala' },
  'google-ads': { label: 'Google Ads Spy', section: 'Fase de Escala' },
  connections: { label: 'Conexões', section: 'Fase de Escala' },
  flows: { label: 'Meus Fluxos', section: 'Fase de Escala' },
  runs: { label: 'Disparos', section: 'Fase de Escala' },
  triggers: { label: 'Acionadores', section: 'Fase de Escala' },
  settings: { label: 'Configurações', section: 'Sistema' },
}

function getStatusBadge(config: MenuVisibilityConfig) {
  if (config.is_public) {
    return (
      <span className={`${styles.badge} ${styles.public}`}>
        <Globe size={12} />
        Público
      </span>
    )
  }
  if (config.plan_ids.length > 0) {
    return (
      <span className={`${styles.badge} ${styles.restricted}`}>
        <Shield size={12} />
        Por Plano
      </span>
    )
  }
  if (config.show_as_coming_soon) {
    return (
      <span className={`${styles.badge} ${styles.comingSoon}`}>
        <Clock size={12} />
        Em Breve
      </span>
    )
  }
  return (
    <span className={`${styles.badge} ${styles.hidden}`}>
      <EyeOff size={12} />
      Oculto
    </span>
  )
}

// Get unique sections for filter dropdown
const sections = [...new Set(Object.values(menuItemLabels).map((item) => item.section))]

// Column configuration with tooltips
type ColumnKey = 'menuItem' | 'section' | 'status' | 'plans' | 'actions'

interface ColumnConfig {
  key: ColumnKey
  label: string
  tooltip?: string
  minWidth: number
  defaultWidth: number
}

const COLUMN_CONFIG: ColumnConfig[] = [
  {
    key: 'menuItem',
    label: 'Item do Menu',
    tooltip: 'Nome do item de menu e sua chave interna no sistema',
    minWidth: 150,
    defaultWidth: 200,
  },
  {
    key: 'section',
    label: 'Seção',
    tooltip: 'Grupo/fase ao qual este item pertence no menu lateral',
    minWidth: 100,
    defaultWidth: 130,
  },
  {
    key: 'status',
    label: 'Status',
    tooltip: 'Público (todos veem), Por Plano (apenas assinantes), Em Breve (visível mas bloqueado), Oculto (invisível)',
    minWidth: 80,
    defaultWidth: 110,
  },
  {
    key: 'plans',
    label: 'Planos com Acesso',
    tooltip: 'Planos de assinatura que têm acesso a este recurso',
    minWidth: 120,
    defaultWidth: 180,
  },
  {
    key: 'actions',
    label: 'Ações',
    tooltip: 'Editar configurações de visibilidade deste item',
    minWidth: 70,
    defaultWidth: 80,
  },
]

const DEFAULT_COLUMN_ORDER = COLUMN_CONFIG.map((c) => c.key)
const DEFAULT_COLUMN_WIDTHS = COLUMN_CONFIG.reduce(
  (acc, col) => ({ ...acc, [col.key]: col.defaultWidth }),
  {} as Record<string, number>
)

// Get status of a config
function getConfigStatus(config: MenuVisibilityConfig): StatusFilter {
  if (config.is_public) return 'public'
  if (config.plan_ids.length > 0) return 'restricted'
  if (config.show_as_coming_soon) return 'coming_soon'
  return 'hidden'
}

interface MenuVisibilityTableProps {
  canEdit?: boolean
}

export function MenuVisibilityTable({ canEdit = true }: MenuVisibilityTableProps) {
  const { data: configs = [], isLoading } = useMenuVisibilityConfigs()
  const { data: plans = [] } = useAdminPlans()
  const [editingConfig, setEditingConfig] = useState<MenuVisibilityConfig | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  // Column resize and reorder hooks
  const { columnWidths, handleMouseDown, handleDoubleClick, autoFitAllColumns } = useColumnResize(
    DEFAULT_COLUMN_WIDTHS,
    tableRef,
    COLUMN_CONFIG.map((c) => ({ key: c.key, minWidth: c.minWidth }))
  )
  const {
    columnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnReorder(DEFAULT_COLUMN_ORDER)

  // Get ordered columns based on drag state
  const orderedColumns = useMemo(() => {
    // If canEdit is false, filter out actions column
    const visibleKeys = canEdit ? columnOrder : columnOrder.filter((k) => k !== 'actions')
    return visibleKeys
      .map((key) => COLUMN_CONFIG.find((c) => c.key === key)!)
      .filter(Boolean)
  }, [columnOrder, canEdit])

  // Filters
  const [sectionFilter, setSectionFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const getPlanNames = (planIds: number[]) => {
    return planIds
      .map((id) => plans.find((p) => p.id === id)?.name)
      .filter(Boolean) as string[]
  }

  // Filter configs based on selected filters
  const filteredConfigs = useMemo(() => {
    return configs.filter((config) => {
      const info = menuItemLabels[config.menu_item_key] || { label: config.menu_item_key, section: 'Outro' }

      // Section filter
      if (sectionFilter !== 'all' && info.section !== sectionFilter) {
        return false
      }

      // Plan filter
      if (planFilter !== 'all') {
        const planId = parseInt(planFilter, 10)
        if (!config.is_public && !config.plan_ids.includes(planId)) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        const status = getConfigStatus(config)
        if (status !== statusFilter) {
          return false
        }
      }

      return true
    })
  }, [configs, sectionFilter, planFilter, statusFilter])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>Carregando...</div>
      </div>
    )
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Configuração de Visibilidade</h2>

          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <Filter size={14} />
              <select
                className={styles.filterSelect}
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                <option value="all">Todas as seções</option>
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <select
                className={styles.filterSelect}
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                <option value="all">Todos os planos</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id.toString()}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">Todos os status</option>
                <option value="public">Público</option>
                <option value="restricted">Por Plano</option>
                <option value="coming_soon">Em Breve</option>
                <option value="hidden">Oculto</option>
              </select>
            </div>

            {(sectionFilter !== 'all' || planFilter !== 'all' || statusFilter !== 'all') && (
              <button
                className={styles.clearFilters}
                onClick={() => {
                  setSectionFilter('all')
                  setPlanFilter('all')
                  setStatusFilter('all')
                }}
              >
                Limpar filtros
              </button>
            )}

            {/* Auto-fit all columns button */}
            <Tooltip content="Ajustar largura de todas as colunas automaticamente">
              <button
                type="button"
                className={styles.autoFitButton}
                onClick={autoFitAllColumns}
                aria-label="Auto-ajustar colunas"
              >
                <Columns3 size={16} />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table ref={tableRef} className={styles.table}>
            <thead>
              <tr>
                {orderedColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`${styles.th} ${
                      draggedColumn === col.key ? styles.headerDragging : ''
                    } ${dragOverColumn === col.key ? styles.headerDragOver : ''}`}
                    style={{ width: columnWidths[col.key] }}
                    draggable
                    onDragStart={(e) => handleDragStart(col.key, e)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(col.key, e)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(col.key, e)}
                  >
                    <span className={styles.headerContent}>
                      {col.label}
                      {col.tooltip && (
                        <Tooltip content={col.tooltip}>
                          <span className={styles.helpIcon}>
                            <HelpCircle size={12} />
                          </span>
                        </Tooltip>
                      )}
                    </span>
                    <button
                      type="button"
                      className={styles.resizeHandle}
                      onMouseDown={(e) => handleMouseDown(col.key, e)}
                      onDoubleClick={() => handleDoubleClick(col.key)}
                      aria-label={`Redimensionar coluna ${col.label}`}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredConfigs.map((config) => {
                const info = menuItemLabels[config.menu_item_key] || {
                  label: config.menu_item_key,
                  section: 'Outro',
                }
                const planNames = getPlanNames(config.plan_ids)

                // Render cell content based on column key
                const renderCell = (colKey: ColumnKey) => {
                  switch (colKey) {
                    case 'menuItem':
                      return (
                        <>
                          <span>{info.label}</span>
                          {config.is_essential && (
                            <span className={`${styles.badge} ${styles.essential}`}>
                              Essencial
                            </span>
                          )}
                          <br />
                          <code className={styles.menuItemKey}>{config.menu_item_key}</code>
                        </>
                      )
                    case 'section':
                      return info.section
                    case 'status':
                      return getStatusBadge(config)
                    case 'plans':
                      return config.is_public ? (
                        <span style={{ color: 'var(--color-text-tertiary)' }}>
                          Todos os usuários
                        </span>
                      ) : planNames.length > 0 ? (
                        <div className={styles.plansList}>
                          {planNames.map((name) => (
                            <span key={name} className={styles.planBadge}>
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-tertiary)' }}>
                          Nenhum
                        </span>
                      )
                    case 'actions':
                      return (
                        <div className={styles.actions}>
                          <button
                            className={styles.editButton}
                            onClick={() => setEditingConfig(config)}
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      )
                    default:
                      return null
                  }
                }

                return (
                  <tr key={config.id}>
                    {orderedColumns.map((col) => (
                      <td key={col.key} style={{ width: columnWidths[col.key] }}>
                        {renderCell(col.key)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredConfigs.length === 0 && (
          <div className={styles.empty}>
            {configs.length === 0
              ? 'Nenhuma configuração de visibilidade encontrada.'
              : 'Nenhum item corresponde aos filtros selecionados.'}
          </div>
        )}
      </div>

      {editingConfig && (
        <MenuVisibilityEditModal
          config={editingConfig}
          plans={plans}
          onClose={() => setEditingConfig(null)}
        />
      )}
    </>
  )
}
