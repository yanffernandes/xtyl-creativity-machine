import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Settings,
  History,
  FileEdit,
  Plus,
  Pencil,
  Trash2,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Button,
  PageLayout,
  PageHeader,
  FilterBar,
  PageNav,
  EmptyState,
  Spinner,
  Select,
  RowActionsMenu,
  showToast,
  type RowActionItem,
} from '@/shared/components'
import { SummaryCardsGrid, type CardConfig } from '@/shared/components/SummaryCardsGrid'
import { useColumnReorder, useColumnResize, useDocumentTitle } from '@/shared/hooks'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { useCampaignTemplates, useDeleteTemplate, useDuplicateTemplate } from '@/features/alvoads-meta/api/useCampaigns'
import { useGoogleCampaigns, useDeleteGoogleCampaign } from '@/features/alvoads-google/api/useGoogleCampaigns'
import styles from './AdsDraftsPage.module.css'
import { PlatformBadge } from '../components/PlatformBadge'
import { PlatformSelector } from '../components/PlatformSelector'
import { useUnifiedAdsStore, useSelectedPlatforms } from '../stores/unifiedAdsStore'
import type { AdsPlatform } from '../types'

// Navigation items for sub-pages
const NAV_ITEMS = [
  { to: '/ads', label: 'Performance', icon: <BarChart3 size={16} /> },
  { to: '/ads/drafts', label: 'Rascunhos', icon: <FileEdit size={16} /> },
  { to: '/ads/automations', label: 'Automações', icon: <Settings size={16} /> },
  { to: '/ads/history', label: 'Histórico', icon: <History size={16} /> },
]

// Unified draft item (normalized from Google and Meta templates)
interface UnifiedDraft {
  id: string
  name: string
  platform: AdsPlatform
  status: 'draft' | 'ready' | 'failed' | 'publishing'
  lastWizardStep?: string
  createdAt: string
  updatedAt: string
  errorMessage?: string
}

// Helpers
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return '-'
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Agora mesmo'
  if (diffMins < 60) return `Há ${diffMins} min`
  if (diffHours < 24) return `Há ${diffHours}h`
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `Há ${diffDays} dias`
  return formatDate(dateString)
}

function getStatusLabel(status: UnifiedDraft['status']): string {
  const labels: Record<UnifiedDraft['status'], string> = {
    draft: 'Rascunho',
    ready: 'Pronto',
    failed: 'Falhou',
    publishing: 'Publicando',
  }
  return labels[status] || status
}

function getStatusIcon(status: UnifiedDraft['status']) {
  switch (status) {
    case 'draft':
      return <Pencil size={12} />
    case 'ready':
      return <CheckCircle size={12} />
    case 'failed':
      return <AlertCircle size={12} />
    case 'publishing':
      return <Clock size={12} />
    default:
      return null
  }
}

function getStepLabel(step: string | undefined): string {
  if (!step) return ''
  const stepLabels: Record<string, string> = {
    // Meta wizard steps
    articles: 'Artigos',
    adsets_config: 'Conjuntos',
    account: 'Conta',
    pixel: 'Pixel',
    page: 'Página',
    instagram: 'Instagram',
    objective: 'Objetivo',
    targeting: 'Público',
    budget: 'Orçamento',
    creative: 'Criativos',
    creative_ai: 'Gerar IA',
    creative_approval: 'Aprovar',
    ad_copy: 'Textos',
    review: 'Revisão',
    // Google wizard steps
    article_source: 'Artigo',
    google_account: 'Conta',
    campaign_settings: 'Campanha',
    ad_groups: 'Grupos',
    extensions: 'Extensões',
    google_review: 'Revisão',
  }
  return stepLabels[step] || step
}

type SortKey = 'name' | 'platform' | 'status' | 'step' | 'updated'

export function AdsDraftsPage() {
  useDocumentTitle('Rascunhos | Central de Anúncios')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const workspaceId = useWorkspaceId()

  // Store state
  const selectedPlatforms = useSelectedPlatforms()
  const { setSelectedPlatforms } = useUnifiedAdsStore()

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'ready' | 'failed'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('updated')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const tableRef = useRef<HTMLTableElement>(null)

  // URL-driven platform state
  const platformFromUrl = searchParams.get('platform')
  useEffect(() => {
    if (platformFromUrl) {
      const platforms = platformFromUrl.split(',').filter(
        (p): p is AdsPlatform => p === 'google' || p === 'meta'
      )
      if (platforms.length > 0) {
        setSelectedPlatforms(platforms)
      }
    }
  }, [platformFromUrl, setSelectedPlatforms])

  // Handle platform change with URL sync
  const handlePlatformChange = useCallback((platforms: AdsPlatform[]) => {
    setSelectedPlatforms(platforms)
    if (platforms.length === 1 && platforms[0] === 'google') {
      searchParams.delete('platform')
    } else {
      searchParams.set('platform', platforms.join(','))
    }
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams, setSelectedPlatforms])

  // Fetch Meta templates (draft + ready + failed only)
  const { data: metaTemplatesData, isLoading: isLoadingMeta } = useCampaignTemplates()

  // Fetch Google templates (draft + ready + failed only)
  const { data: googleTemplatesData, isLoading: isLoadingGoogle } = useGoogleCampaigns()

  // Mutations
  const deleteMetaMutation = useDeleteTemplate()
  const duplicateMetaMutation = useDuplicateTemplate()
  const deleteGoogleMutation = useDeleteGoogleCampaign()

  const isLoading = isLoadingMeta || isLoadingGoogle

  // Normalize into unified drafts
  const allDrafts: UnifiedDraft[] = useMemo(() => {
    const drafts: UnifiedDraft[] = []

    // Meta templates
    if (selectedPlatforms.includes('meta') && metaTemplatesData?.templates) {
      metaTemplatesData.templates
        .filter(t => t.status !== 'published') // Only non-published
        .forEach(t => {
          drafts.push({
            id: t.id,
            name: t.template_name || 'Sem nome',
            platform: 'meta',
            status: t.status as UnifiedDraft['status'],
            lastWizardStep: t.last_wizard_step || undefined,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
            errorMessage: t.publish_error || undefined,
          })
        })
    }

    // Google templates
    if (selectedPlatforms.includes('google') && googleTemplatesData) {
      const templates = Array.isArray(googleTemplatesData) ? googleTemplatesData : []
      templates
        .filter(t => t.status !== 'published' && t.status !== 'paused')
        .forEach(t => {
          drafts.push({
            id: t.id,
            name: t.name || 'Sem nome',
            platform: 'google',
            status: t.status as UnifiedDraft['status'],
            lastWizardStep: undefined, // Google doesn't store wizard step
            createdAt: t.created_at,
            updatedAt: t.updated_at,
            errorMessage: t.last_error || undefined,
          })
        })
    }

    return drafts
  }, [metaTemplatesData, googleTemplatesData, selectedPlatforms])

  // Filter by status
  const filteredDrafts = useMemo(() => {
    if (statusFilter === 'all') return allDrafts
    return allDrafts.filter(d => d.status === statusFilter)
  }, [allDrafts, statusFilter])

  // Sort
  const sortedDrafts = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1

    return [...filteredDrafts].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return direction * a.name.localeCompare(b.name)
        case 'platform':
          return direction * a.platform.localeCompare(b.platform)
        case 'status':
          return direction * a.status.localeCompare(b.status)
        case 'step':
          return direction * (getStepLabel(a.lastWizardStep)).localeCompare(getStepLabel(b.lastWizardStep))
        case 'updated':
        default: {
          const dateA = new Date(a.updatedAt).getTime()
          const dateB = new Date(b.updatedAt).getTime()
          return direction * (dateA - dateB)
        }
      }
    })
  }, [filteredDrafts, sortKey, sortDirection])

  // Column definitions
  const columns = useMemo(
    () => [
      { key: 'name', label: 'Nome', sortable: true, sortKey: 'name' as SortKey, minWidth: 220, width: 320 },
      { key: 'platform', label: 'Plataforma', sortable: true, sortKey: 'platform' as SortKey, minWidth: 120, width: 140 },
      { key: 'status', label: 'Status', sortable: true, sortKey: 'status' as SortKey, minWidth: 140, width: 160 },
      { key: 'step', label: 'Etapa', sortable: true, sortKey: 'step' as SortKey, minWidth: 140, width: 160 },
      { key: 'updated', label: 'Atualizado', sortable: true, sortKey: 'updated' as SortKey, minWidth: 160, width: 180 },
      { key: 'actions', label: 'Ações', sortable: false, minWidth: 72, width: 72 },
    ],
    []
  )

  const columnMap = useMemo(() => new Map(columns.map(col => [col.key, col])), [columns])

  const {
    columnOrder,
    setColumnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnReorder(columns.map(col => col.key))

  useEffect(() => {
    setColumnOrder(columns.map(col => col.key))
  }, [columns, setColumnOrder])

  const orderedColumns = useMemo(
    () =>
      columnOrder
        .map(key => columnMap.get(key))
        .filter((col): col is (typeof columns)[number] => Boolean(col)),
    [columnMap, columnOrder]
  )

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    columns.forEach(col => {
      widths[col.key] = col.width
    })
    return widths
  }, [columns])

  const { columnWidths, handleMouseDown, handleDoubleClick } = useColumnResize(
    initialWidths,
    tableRef,
    columns.map(col => ({ key: col.key, minWidth: col.minWidth }))
  )

  // Handlers
  const handleHeaderSort = useCallback((key: SortKey) => {
    setSortKey(prevKey => {
      if (prevKey === key) {
        setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
        return prevKey
      }
      setSortDirection('desc')
      return key
    })
  }, [])

  const getSortIcon = useCallback(
    (key: SortKey) => {
      if (sortKey !== key) {
        return <ArrowUpDown size={14} className={styles.sortIcon} />
      }
      return sortDirection === 'asc' ? (
        <ArrowUp size={14} className={styles.sortIconActive} />
      ) : (
        <ArrowDown size={14} className={styles.sortIconActive} />
      )
    },
    [sortDirection, sortKey]
  )

  const handleResumeDraft = useCallback((draft: UnifiedDraft) => {
    if (draft.platform === 'meta') {
      navigate(`/alvoads-meta/wizard?template=${draft.id}`)
    } else {
      navigate(`/alvoads-google/wizard?template=${draft.id}`)
    }
  }, [navigate])

  const handleDuplicate = useCallback((draft: UnifiedDraft) => {
    if (draft.platform === 'meta') {
      duplicateMetaMutation.mutate(draft.id, {
        onSuccess: () => showToast.success('Rascunho duplicado!'),
        onError: () => showToast.error('Erro ao duplicar rascunho'),
      })
    } else {
      showToast.info('Duplicação de rascunhos Google Ads ainda não disponível')
    }
  }, [duplicateMetaMutation])

  const handleDelete = useCallback((draft: UnifiedDraft) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${draft.name}"?`)) return

    if (draft.platform === 'meta') {
      deleteMetaMutation.mutate(draft.id, {
        onSuccess: () => showToast.success('Rascunho excluído'),
        onError: () => showToast.error('Erro ao excluir rascunho'),
      })
    } else {
      deleteGoogleMutation.mutate(draft.id, {
        onSuccess: () => showToast.success('Rascunho excluído'),
        onError: () => showToast.error('Erro ao excluir rascunho'),
      })
    }
  }, [deleteMetaMutation, deleteGoogleMutation])

  const handleCreateCampaign = useCallback(() => {
    if (selectedPlatforms.includes('meta') && !selectedPlatforms.includes('google')) {
      navigate('/alvoads-meta/wizard')
    } else {
      navigate('/alvoads-google/wizard')
    }
  }, [navigate, selectedPlatforms])

  const buildDraftActions = useCallback((draft: UnifiedDraft): RowActionItem[] => [
    {
      label: 'Continuar edição',
      onSelect: () => handleResumeDraft(draft),
      icon: <Pencil size={16} />,
    },
    {
      label: 'Duplicar',
      onSelect: () => handleDuplicate(draft),
      icon: <Copy size={16} />,
    },
    {
      label: 'Excluir',
      onSelect: () => handleDelete(draft),
      icon: <Trash2 size={16} />,
      destructive: true,
    },
  ], [handleResumeDraft, handleDuplicate, handleDelete])

  // Summary cards
  const summaryCards: CardConfig[] = useMemo(() => [
    {
      icon: FileEdit,
      label: 'Total',
      value: String(allDrafts.length),
      color: '#3B82F6',
    },
    {
      icon: Pencil,
      label: 'Rascunhos',
      value: String(allDrafts.filter(d => d.status === 'draft').length),
      color: '#F59E0B',
    },
    {
      icon: CheckCircle,
      label: 'Prontos',
      value: String(allDrafts.filter(d => d.status === 'ready').length),
      color: '#10B981',
    },
    {
      icon: AlertCircle,
      label: 'Com erro',
      value: String(allDrafts.filter(d => d.status === 'failed').length),
      color: '#EF4444',
    },
  ], [allDrafts])

  return (
    <PageLayout>
      {/* Header */}
      <PageHeader
        icon={<FileEdit size={24} />}
        title="Central de Anúncios"
        subtitle="Campanhas em rascunho aguardando publicação"
        secondaryActions={
          <PlatformSelector
            selected={selectedPlatforms}
            onChange={handlePlatformChange}
          />
        }
        primaryAction={{
          label: 'Nova Campanha',
          icon: <Plus size={18} />,
          onClick: handleCreateCampaign,
        }}
      />

      {/* Sub-page Navigation */}
      <PageNav items={NAV_ITEMS} />

      {/* Filter Bar */}
      <FilterBar>
        <Select
          label=""
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          options={[
            { value: 'all', label: 'Todos os status' },
            { value: 'draft', label: 'Rascunho' },
            { value: 'ready', label: 'Pronto' },
            { value: 'failed', label: 'Com erro' },
          ]}
        />
      </FilterBar>

      {/* Summary Cards */}
      {allDrafts.length > 0 && (
        <SummaryCardsGrid cards={summaryCards} isLoading={isLoading} />
      )}

      {/* Content */}
      <div className={styles.content}>
        {/* Loading state */}
        {isLoading && allDrafts.length === 0 && (
          <div className={styles.loadingContainer}>
            <Spinner size="lg" />
            <p>Carregando rascunhos...</p>
          </div>
        )}

        {/* Error state - skipped since we handle individual query errors */}

        {/* Empty state */}
        {!isLoading && allDrafts.length === 0 && (
          <EmptyState
            icon={<FileEdit size={48} />}
            title="Nenhum rascunho encontrado"
            description="Campanhas salvas como rascunho durante a criação aparecerão aqui. Você pode retomá-las a qualquer momento."
            action={
              <Button variant="secondary" onClick={handleCreateCampaign}>
                Criar nova campanha
              </Button>
            }
          />
        )}

        {/* Empty filtered state */}
        {!isLoading && allDrafts.length > 0 && filteredDrafts.length === 0 && (
          <EmptyState
            icon={<FileEdit size={48} />}
            title="Nenhum rascunho com esse filtro"
            description="Tente alterar o filtro de status para ver outros rascunhos."
          />
        )}

        {/* Drafts Table */}
        {!isLoading && filteredDrafts.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.table} ref={tableRef}>
              <thead>
                <tr>
                  {orderedColumns.map(column => {
                    const isSortable = column.sortable && column.sortKey
                    const columnWidth = columnWidths[column.key]

                    return (
                      <th
                        key={column.key}
                        data-column-key={column.key}
                        className={`${styles.th} ${styles.draggableHeader} ${
                          draggedColumn === column.key ? styles.draggingHeader : ''
                        } ${dragOverColumn === column.key ? styles.dragOverHeader : ''}`}
                        style={{ width: columnWidth || undefined }}
                        draggable
                        onDragStart={(e) => handleDragStart(column.key, e)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(column.key, e)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(column.key, e)}
                      >
                        <div className={styles.thContent}>
                          {isSortable ? (
                            <button
                              type="button"
                              className={styles.sortButton}
                              onClick={() => handleHeaderSort(column.sortKey!)}
                            >
                              {column.label}
                              {getSortIcon(column.sortKey!)}
                            </button>
                          ) : (
                            <span>{column.label}</span>
                          )}
                        </div>
                        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                        <div
                          className={styles.resizeHandle}
                          onMouseDown={(e) => handleMouseDown(column.key, e)}
                          onDoubleClick={(e) => handleDoubleClick(column.key, e)}
                        />
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedDrafts.map(draft => (
                  <tr
                    key={draft.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleResumeDraft(draft)}
                  >
                    {orderedColumns.map(column => {
                      const columnWidth = columnWidths[column.key]

                      if (column.key === 'name') {
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            <div className={styles.draftName}>
                              <span className={styles.name}>{draft.name}</span>
                              {draft.errorMessage && (
                                <span className={styles.step} style={{ color: 'var(--color-error)' }}>
                                  <AlertCircle size={12} />
                                  {draft.errorMessage.slice(0, 60)}{draft.errorMessage.length > 60 ? '...' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      }

                      if (column.key === 'platform') {
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            <PlatformBadge platform={draft.platform} size="sm" />
                          </td>
                        )
                      }

                      if (column.key === 'status') {
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            <div className={`${styles.statusBadge} ${styles[draft.status]}`}>
                              {getStatusIcon(draft.status)}
                              <span>{getStatusLabel(draft.status)}</span>
                            </div>
                          </td>
                        )
                      }

                      if (column.key === 'step') {
                        const stepLabel = getStepLabel(draft.lastWizardStep)
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            {stepLabel ? (
                              <span className={styles.timestamp}>
                                {stepLabel}
                              </span>
                            ) : (
                              <span className={styles.timestamp}>-</span>
                            )}
                          </td>
                        )
                      }

                      if (column.key === 'updated') {
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            <span className={styles.timestamp} title={formatDate(draft.updatedAt)}>
                              {formatRelativeDate(draft.updatedAt)}
                            </span>
                          </td>
                        )
                      }

                      if (column.key === 'actions') {
                        return (
                          <td
                            key={column.key}
                            data-column-key={column.key}
                            style={{ width: columnWidth || undefined }}
                            onClick={(e) => e.stopPropagation()} // Prevent row click
                          >
                            <div className={styles.actionsCell}>
                              <RowActionsMenu
                                items={buildDraftActions(draft)}
                                ariaLabel="Ações do rascunho"
                              />
                            </div>
                          </td>
                        )
                      }

                      return null
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Loading overlay when refetching */}
        {isLoading && allDrafts.length > 0 && (
          <div className={styles.loadingOverlay}>
            <Spinner size="sm" />
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export default AdsDraftsPage
