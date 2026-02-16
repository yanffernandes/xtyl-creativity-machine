import { useState, useCallback, useMemo } from 'react'
import {
  BarChart3,
  Settings,
  History,
  FileEdit,
  Plus,
  Play,
  Pause,
  Clock,
  Eye,
  Edit,
  Copy,
  Trash2,
  Zap,
  Search,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  Button,
  PageLayout,
  PageHeader,
  FilterBar,
  PageNav,
  EmptyState,
  Spinner,
  Select,
  Input,
  RowActionsMenu,
  showToast,
  type RowActionItem,
} from '@/shared/components'
import { SummaryCardsGrid, type CardConfig } from '@/shared/components/SummaryCardsGrid'
import { useDocumentTitle } from '@/shared/hooks'
import {
  useAutomationRules,
  type AutomationRulesFilters,
} from '../api/automationQueries'
import {
  useToggleRule,
  useDeleteRule,
  useExecuteRule,
} from '../api/automationMutations'
import { RulePreviewModal } from '../components/RulePreviewModal'
import { AutomationWizard } from '../components/AutomationWizard/AutomationWizard'
import { PlatformBadge } from '../components/PlatformBadge'
import styles from './AdsAutomationsPage.module.css'
import type { AutomationRule, Platform, RuleStatus, EntityLevel } from '../types/automation'

// Navigation items for sub-pages
const NAV_ITEMS = [
  { to: '/ads', label: 'Performance', icon: <BarChart3 size={16} /> },
  { to: '/ads/drafts', label: 'Rascunhos', icon: <FileEdit size={16} /> },
  { to: '/ads/automations', label: 'Automações', icon: <Settings size={16} /> },
  { to: '/ads/history', label: 'Histórico', icon: <History size={16} /> },
]

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateString?: string): string {
  if (!dateString) return 'Nunca'
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

function getLevelLabel(level: EntityLevel): string {
  const labels: Record<EntityLevel, string> = {
    campaign: 'Campanha',
    adset: 'Conjunto',
    ad_group: 'Grupo de anúncios',
    ad: 'Anúncio',
    keyword: 'Palavra-chave',
    ad_account: 'Conta',
  }
  return labels[level] || level
}

function getStatusLabel(status: RuleStatus): string {
  const labels: Record<RuleStatus, string> = {
    active: 'Ativa',
    paused: 'Pausada',
    draft: 'Rascunho',
  }
  return labels[status] || status
}

function getStatusBadgeClass(status: RuleStatus): string {
  switch (status) {
    case 'active': return styles.active
    case 'paused': return styles.paused
    case 'draft': return styles.draft
    default: return styles.paused
  }
}

function getStatusIcon(status: RuleStatus) {
  switch (status) {
    case 'active': return <Play size={12} />
    case 'paused': return <Pause size={12} />
    case 'draft': return <Edit size={12} />
    default: return null
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function AdsAutomationsPage() {
  useDocumentTitle('Automações | Central de Anúncios')
  const [searchParams, setSearchParams] = useSearchParams()

  // Filter state
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<RuleStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [previewRuleId, setPreviewRuleId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)

  // Build query filters
  const queryFilters: AutomationRulesFilters = useMemo(() => ({
    platform: platformFilter !== 'all' ? platformFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
  }), [platformFilter, statusFilter, searchQuery])

  // Fetch automation rules via new engine API
  const { data, isLoading, error, refetch } = useAutomationRules(queryFilters)
  const rules = data?.rules ?? []
  const totalRules = data?.total ?? 0

  // Mutations
  const toggleMutation = useToggleRule()
  const deleteMutation = useDeleteRule()
  const executeMutation = useExecuteRule()

  // Handlers
  const handleToggleStatus = useCallback((rule: AutomationRule) => {
    const newStatus = rule.status === 'active' ? 'paused' : 'active'
    toggleMutation.mutate(
      { id: rule.id, status: newStatus },
      {
        onSuccess: () => {
          showToast.success(
            newStatus === 'active' ? 'Regra ativada!' : 'Regra pausada.'
          )
        },
        onError: (err) => {
          showToast.error(`Erro: ${err instanceof Error ? err.message : 'Tente novamente.'}`)
        },
      }
    )
  }, [toggleMutation])

  const handleDeleteRule = useCallback((rule: AutomationRule) => {
    if (!window.confirm(`Tem certeza que deseja excluir a regra "${rule.name}"?`)) return

    deleteMutation.mutate(rule.id, {
      onSuccess: () => showToast.success('Regra excluída.'),
      onError: (err) => showToast.error(`Erro: ${err instanceof Error ? err.message : 'Tente novamente.'}`),
    })
  }, [deleteMutation])

  const handleExecuteRule = useCallback((rule: AutomationRule) => {
    if (!window.confirm(`Executar a regra "${rule.name}" agora?`)) return

    executeMutation.mutate(rule.id, {
      onSuccess: () => showToast.success('Regra executada! Verifique o histórico para ver os resultados.'),
      onError: (err) => showToast.error(`Erro: ${err instanceof Error ? err.message : 'Tente novamente.'}`),
    })
  }, [executeMutation])

  const handleCreateAutomation = useCallback(() => {
    setEditingRule(null)
    setShowWizard(true)
  }, [])

  const handleEditRule = useCallback((rule: AutomationRule) => {
    setEditingRule(rule)
    setShowWizard(true)
  }, [])

  const handleDuplicateRule = useCallback((rule: AutomationRule) => {
    // Open wizard with the rule's data but no ruleId (creates a new one)
    const duplicate = {
      ...rule,
      id: undefined,
      name: `${rule.name} (cópia)`,
      status: 'draft' as RuleStatus,
    } as AutomationRule
    setEditingRule(duplicate)
    setShowWizard(true)
  }, [])

  const handleActivateFromPreview = useCallback(() => {
    if (!previewRuleId) return
    toggleMutation.mutate(
      { id: previewRuleId, status: 'active' },
      {
        onSuccess: () => {
          showToast.success('Regra ativada!')
          setPreviewRuleId(null)
        },
        onError: (err) => showToast.error(`Erro: ${err instanceof Error ? err.message : 'Tente novamente.'}`),
      }
    )
  }, [previewRuleId, toggleMutation])

  const handlePlatformChange = useCallback((value: string) => {
    const platform = value as Platform | 'all'
    setPlatformFilter(platform)
    if (platform !== 'all') {
      searchParams.set('platform', platform)
    } else {
      searchParams.delete('platform')
    }
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, setSearchParams])

  // Build row actions
  const buildRuleActions = useCallback((rule: AutomationRule): RowActionItem[] => {
    const items: RowActionItem[] = [
      {
        label: 'Preview',
        onSelect: () => setPreviewRuleId(rule.id),
        icon: <Eye size={16} />,
      },
      {
        label: 'Editar',
        onSelect: () => handleEditRule(rule),
        icon: <Edit size={16} />,
      },
    ]

    items.push({
      label: 'Executar agora',
      onSelect: () => handleExecuteRule(rule),
      icon: <Zap size={16} />,
    })

    items.push({
      label: 'Duplicar',
      onSelect: () => handleDuplicateRule(rule),
      icon: <Copy size={16} />,
    })

    if (rule.status !== 'draft') {
      items.push({
        label: rule.status === 'active' ? 'Pausar' : 'Ativar',
        onSelect: () => handleToggleStatus(rule),
        icon: rule.status === 'active' ? <Pause size={16} /> : <Play size={16} />,
      })
    }

    items.push({
      label: 'Excluir',
      onSelect: () => handleDeleteRule(rule),
      icon: <Trash2 size={16} />,
      destructive: true,
    })

    return items
  }, [handleEditRule, handleExecuteRule, handleDuplicateRule, handleToggleStatus, handleDeleteRule])

  // Summary cards
  const summaryCards: CardConfig[] = useMemo(() => {
    const activeCount = rules.filter(r => r.status === 'active').length
    const pausedCount = rules.filter(r => r.status === 'paused').length
    const draftCount = rules.filter(r => r.status === 'draft').length

    return [
      { icon: Settings, label: 'Total', value: String(totalRules), color: '#3B82F6' },
      { icon: Play, label: 'Ativas', value: String(activeCount), color: '#10B981' },
      { icon: Pause, label: 'Pausadas', value: String(pausedCount), color: '#F59E0B' },
      { icon: Edit, label: 'Rascunhos', value: String(draftCount), color: '#6B7280' },
    ]
  }, [rules, totalRules])

  return (
    <PageLayout>
      {/* Header */}
      <PageHeader
        icon={<Settings size={24} />}
        title="Central de Anúncios"
        subtitle="Regras de automação para suas campanhas"
        primaryAction={{
          label: 'Nova Automação',
          icon: <Plus size={18} />,
          onClick: handleCreateAutomation,
        }}
      />

      {/* Sub-page Navigation */}
      <PageNav items={NAV_ITEMS} />

      {/* Filter Bar */}
      <FilterBar>
        <Input
          label=""
          placeholder="Buscar regras..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={16} />}
        />
        <Select
          label=""
          value={platformFilter}
          onChange={(e) => handlePlatformChange(e.target.value)}
          options={[
            { value: 'all', label: 'Todas as plataformas' },
            { value: 'google', label: 'Google Ads' },
            { value: 'meta', label: 'Meta Ads' },
          ]}
        />
        <Select
          label=""
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RuleStatus | 'all')}
          options={[
            { value: 'all', label: 'Todos os status' },
            { value: 'active', label: 'Ativas' },
            { value: 'paused', label: 'Pausadas' },
            { value: 'draft', label: 'Rascunhos' },
          ]}
        />
      </FilterBar>

      {/* Summary Cards */}
      {rules.length > 0 && (
        <SummaryCardsGrid cards={summaryCards} isLoading={isLoading} />
      )}

      {/* Content */}
      <div className={styles.content}>
        {/* Loading state */}
        {isLoading && rules.length === 0 && !error && (
          <div className={styles.loadingContainer}>
            <Spinner size="lg" />
            <p>Carregando automações...</p>
          </div>
        )}

        {/* Error banner */}
        {error && !isLoading && (
          <div className={styles.errorBanner}>
            <div className={styles.errorBannerContent}>
              <AlertTriangle size={16} className={styles.errorBannerIcon} />
              <span>{error instanceof Error ? error.message : 'Erro ao carregar automações. Tente novamente.'}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw size={14} />}
              onClick={() => refetch()}
            >
              Tentar Novamente
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && rules.length === 0 && !error && (
          <EmptyState
            icon={<Settings size={48} />}
            title="Nenhuma automação encontrada"
            description={
              statusFilter !== 'all' || platformFilter !== 'all' || searchQuery
                ? 'Nenhuma regra corresponde aos filtros selecionados. Tente ajustar os critérios de busca.'
                : 'Crie regras automáticas para gerenciar suas campanhas com base em métricas de performance.'
            }
            action={
              statusFilter === 'all' && platformFilter === 'all' && !searchQuery ? (
                <Button variant="secondary" onClick={handleCreateAutomation} leftIcon={<Plus size={16} />}>
                  Criar primeira automação
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Rules Table */}
        {!isLoading && rules.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>
                    <div className={styles.thContent}><span>Nome</span></div>
                  </th>
                  <th className={styles.th} data-column-key="platform">
                    <div className={styles.thContent}><span>Plataforma</span></div>
                  </th>
                  <th className={styles.th} data-column-key="level">
                    <div className={styles.thContent}><span>Nível</span></div>
                  </th>
                  <th className={styles.th} data-column-key="status">
                    <div className={styles.thContent}><span>Status</span></div>
                  </th>
                  <th className={styles.th} data-column-key="last_run">
                    <div className={styles.thContent}><span>Última Execução</span></div>
                  </th>
                  <th className={styles.th} data-column-key="next_run">
                    <div className={styles.thContent}><span>Próxima Execução</span></div>
                  </th>
                  <th className={styles.th} data-column-key="actions">
                    <div className={styles.thContent}><span>Ações</span></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className={rule.status !== 'active' ? styles.inactive : ''}
                  >
                    {/* Name */}
                    <td>
                      <div className={styles.automationName}>
                        <span className={styles.name}>{rule.name}</span>
                        {rule.description && (
                          <span className={styles.description}>{rule.description}</span>
                        )}
                      </div>
                    </td>

                    {/* Platform */}
                    <td data-column-key="platform">
                      <PlatformBadge platform={rule.platform} size="sm" />
                    </td>

                    {/* Level */}
                    <td data-column-key="level">
                      <span className={styles.actionType}>
                        {getLevelLabel(rule.level)}
                      </span>
                    </td>

                    {/* Status */}
                    <td data-column-key="status">
                      <button
                        type="button"
                        className={`${styles.statusBadge} ${getStatusBadgeClass(rule.status)}`}
                        onClick={() => rule.status !== 'draft' && handleToggleStatus(rule)}
                        disabled={
                          rule.status === 'draft' || toggleMutation.isPending
                        }
                        title={
                          rule.status === 'draft'
                            ? 'Finalize o rascunho para ativar'
                            : rule.status === 'active'
                              ? 'Clique para pausar'
                              : 'Clique para ativar'
                        }
                      >
                        {getStatusIcon(rule.status)}
                        <span>{getStatusLabel(rule.status)}</span>
                      </button>
                    </td>

                    {/* Last Run */}
                    <td data-column-key="last_run">
                      <span className={styles.lastRun}>
                        <Clock size={12} />
                        {formatDate(rule.lastRunAt)}
                      </span>
                    </td>

                    {/* Next Run */}
                    <td data-column-key="next_run">
                      <span className={styles.lastRun}>
                        <Clock size={12} />
                        {formatDate(rule.nextRunAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td data-column-key="actions">
                      <div className={styles.actionsCell}>
                        <RowActionsMenu
                          items={buildRuleActions(rule)}
                          ariaLabel="Ações da automação"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewRuleId && (
        <RulePreviewModal
          ruleId={previewRuleId}
          isOpen={!!previewRuleId}
          onClose={() => setPreviewRuleId(null)}
          onActivate={handleActivateFromPreview}
        />
      )}

      {/* Automation Wizard */}
      {showWizard && (
        <AutomationWizard
          ruleId={editingRule?.id}
          initialData={editingRule ? {
            name: editingRule.name,
            description: editingRule.description ?? '',
            platform: editingRule.platform,
            connectionIds: editingRule.connectionIds,
            adAccountIds: editingRule.adAccountIds ?? [],
            googleCampaignType: editingRule.googleCampaignType ?? '',
            level: editingRule.level,
            filters: editingRule.filters,
            tasks: editingRule.tasks,
            schedule: editingRule.schedule,
            timezone: editingRule.timezone,
            attribution: editingRule.attribution,
            notifications: editingRule.notifications ?? {
              emails: [],
              notifyOnAction: true,
              notifyOnError: true,
              notifyOnNoMatch: false,
              includeSummary: true,
              includeEntityDetails: false,
              includeMetricsSnapshot: false,
            },
          } : undefined}
          onClose={() => { setShowWizard(false); setEditingRule(null); }}
          onSave={() => { setShowWizard(false); setEditingRule(null); }}
        />
      )}
    </PageLayout>
  )
}

export default AdsAutomationsPage
