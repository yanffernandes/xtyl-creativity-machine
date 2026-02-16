import { useState, type JSX } from 'react'
import {
  Search,
  Plus,
  Megaphone,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Play,
  Pause,
  FileText,
  BarChart3,
  Trash2,
  MoreVertical,
  Copy,
  ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { serviceIcons } from '@/assets/icons/services'
import { Button, Input, Spinner, EmptyState, Alert, Modal } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { getConnectionStatus } from '@/shared/utils/connectionStatus'
import { useMetaAdsConnections, useCampaignTemplates, useDeleteTemplate, useDuplicateTemplate } from '../api'
import { META_STEP_LABELS, META_WIZARD_STEPS, type MetaWizardStep } from '../types/campaign'
import styles from './AlvoAdsMetaPage.module.css'
import type { CampaignTemplate } from '../api/useCampaigns'

// URLs de OAuth
const META_OAUTH_URL = import.meta.env.VITE_META_OAUTH_URL || '/api/auth/meta'

const objectiveLabels: Record<string, string> = {
  // Backend objectives
  awareness: 'Reconhecimento',
  engagement: 'Engajamento',
  leads: 'Cadastros',
  sales: 'Vendas',
  traffic: 'Tráfego',
  app_promotion: 'Promoção de App',
  // Legacy/Meta API objectives
  CONVERSIONS: 'Conversões',
  TRAFFIC: 'Tráfego',
  BRAND_AWARENESS: 'Reconhecimento',
  ENGAGEMENT: 'Engajamento',
  LEAD_GENERATION: 'Leads',
  APP_INSTALLS: 'Instalações',
  VIDEO_VIEWS: 'Visualizações',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function AlvoAdsMetaPage() {
  useDocumentTitle('AlvoAds Meta')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CampaignTemplate | null>(null)
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
  const [accountName, setAccountName] = useState('')

  // Query para buscar conexões de ads do Meta
  const {
    data: adsConnections = [],
    isLoading: isLoadingConnections,
    error: connectionsError
  } = useMetaAdsConnections()

  // Query para buscar templates de campanha (filtrado por workspace)
  const {
    data: templatesData,
    isLoading: isLoadingTemplates,
    error: templatesError
  } = useCampaignTemplates({ search: search || undefined })

  // Mutations
  const deleteTemplateMutation = useDeleteTemplate()
  const duplicateTemplateMutation = useDuplicateTemplate()

  const templates = templatesData?.templates ?? []
  const hasConnectedAccounts = adsConnections.length > 0
  const isLoading = isLoadingConnections || isLoadingTemplates

  // Filter templates by search (já filtrado pela API, mas mantemos para filtro local adicional)
  const filteredTemplates = templates

  const getStatusBadge = (status: CampaignTemplate['status']) => {
    switch (status) {
      case 'published':
        return (
          <span className={`${styles.badge} ${styles.badgeSuccess}`}>
            <Play size={12} /> Publicada
          </span>
        )
      case 'ready':
        return (
          <span className={`${styles.badge} ${styles.badgeWarning}`}>
            <Pause size={12} /> Pronta
          </span>
        )
      case 'failed':
        return (
          <span className={`${styles.badge} ${styles.badgeDanger}`}>
            <XCircle size={12} /> Falhou
          </span>
        )
      case 'draft':
      default:
        return (
          <span className={`${styles.badge} ${styles.badgeDefault}`}>
            <FileText size={12} /> Rascunho
          </span>
        )
    }
  }

  const getConnectionStatusBadge = (connection: { is_active?: boolean | null; token_expires_at?: string | null; needs_reconnect?: boolean; last_refresh_error?: string | null }) => {
    const statusInfo = getConnectionStatus({
      is_active: connection.is_active ?? false,
      token_expires_at: connection.token_expires_at,
      needs_reconnect: connection.needs_reconnect,
      last_refresh_error: connection.last_refresh_error,
    })

    const variantStyles: Record<string, string> = {
      success: styles.badgeSuccess,
      danger: styles.badgeDanger,
      warning: styles.badgeWarning,
    }

    const icons: Record<string, JSX.Element> = {
      connected: <CheckCircle size={12} />,
      disconnected: <XCircle size={12} />,
      expired: <AlertCircle size={12} />,
      needs_reconnect: <AlertCircle size={12} />,
    }

    return (
      <span
        className={`${styles.badge} ${variantStyles[statusInfo.variant]}`}
        title={statusInfo.errorMessage}
      >
        {icons[statusInfo.status]} {statusInfo.label}
      </span>
    )
  }

  const handleAddAccount = () => {
    if (!accountName.trim()) return

    // Salva estado no localStorage para recuperar após o callback OAuth
    localStorage.setItem(
      'pending_connection',
      JSON.stringify({
        name: accountName,
        platform: 'meta',
        type: 'ads',
      })
    )

    // Redireciona para OAuth do Meta
    window.location.href = META_OAUTH_URL
  }

  const handleDeleteTemplate = async () => {
    if (!deleteTarget) return
    try {
      await deleteTemplateMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (error) {
      console.error('Erro ao excluir template:', error)
    }
  }

  const handleDuplicateTemplate = async (template: CampaignTemplate) => {
    try {
      await duplicateTemplateMutation.mutateAsync(template.id)
    } catch (error) {
      console.error('Erro ao duplicar template:', error)
    }
  }

  // Estado não conectado - mostrar tela de onboarding
  if (!isLoading && !hasConnectedAccounts) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <div className={styles.titleIcon}>
              <Megaphone size={24} />
            </div>
            <div>
              <h1 className={styles.title}>AlvoADS Meta</h1>
              <p className={styles.subtitle}>Crie e gerencie campanhas de anúncios no Facebook e Instagram</p>
            </div>
          </div>
        </div>

        <div className={styles.emptyStateContainer}>
          <div className={styles.emptyStateCard}>
            <div className={styles.emptyStateIcon}>
              <Megaphone size={48} />
            </div>
            <h2>Conecte sua conta de anúncios</h2>
            <p>
              Para criar e gerenciar campanhas, você precisa conectar sua conta do Meta Business Suite.
              Isso permitirá acesso às suas contas de anúncio, pixels e públicos.
            </p>
            <div className={styles.emptyStateActions}>
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={() => setShowAddAccountModal(true)}
              >
                Conectar Conta Meta
              </Button>
            </div>
            <div className={styles.emptyStateInfo}>
              <h4>O que você poderá fazer:</h4>
              <ul>
                <li><CheckCircle size={16} /> Criar campanhas com templates personalizados</li>
                <li><CheckCircle size={16} /> Gerenciar múltiplas contas de anúncio</li>
                <li><CheckCircle size={16} /> Usar macros para automação em escala</li>
                <li><CheckCircle size={16} /> Monitorar performance em tempo real</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal de adicionar conta */}
        <Modal
          isOpen={showAddAccountModal}
          onClose={() => setShowAddAccountModal(false)}
          title="Conectar Conta Meta Ads"
          size="md"
        >
          <div className={styles.addAccountModal}>
            <p className={styles.addAccountDescription}>
              Dê um nome para identificar esta conta de anúncios. Após conectar, você terá acesso
              às suas campanhas, públicos e pixels do Meta Business Suite.
            </p>
            <Input
              placeholder="Ex: Minha Empresa - Conta Principal"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className={styles.accountNameInput}
              autoFocus
            />
            <div className={styles.addAccountActions}>
              <Button variant="ghost" onClick={() => setShowAddAccountModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleAddAccount}
                disabled={!accountName.trim()}
              >
                Conectar com Meta
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <Megaphone size={24} />
          </div>
          <div>
            <h1 className={styles.title}>AlvoADS Meta</h1>
            <p className={styles.subtitle}>Crie e gerencie campanhas de anúncios no Facebook e Instagram</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" leftIcon={<RefreshCw size={18} />}>
            Sincronizar
          </Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={18} />}
            onClick={() => navigate('/alvoads-meta/criar')}
          >
            Criar Campanha
          </Button>
        </div>
      </div>

      {(connectionsError || templatesError) && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar dados: {connectionsError?.message || templatesError?.message}
        </Alert>
      )}

      {/* Contas conectadas */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Contas de Anúncio</h2>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Plus size={16} />}
            onClick={() => setShowAddAccountModal(true)}
          >
            Adicionar conta
          </Button>
        </div>

        {isLoading ? (
          <div className={styles.loadingSmall}>
            <Spinner size="sm" />
          </div>
        ) : (
          <div className={styles.accountsGrid}>
            {adsConnections.map((connection) => (
              <div key={connection.id} className={styles.accountCard}>
                <div className={styles.accountIcon}>
                  <img src={serviceIcons.meta} alt="" width={24} height={24} />
                </div>
                <div className={styles.accountInfo}>
                  <span className={styles.accountName}>
                    {connection.connection_name || 'Conta Meta'}
                  </span>
                  <span className={styles.accountId}>
                    ID: {connection.platform_user_id || 'N/A'}
                  </span>
                </div>
                {getConnectionStatusBadge(connection)}
                <button className={styles.accountSettingsBtn} title="Configurações">
                  <Settings size={16} />
                </button>
              </div>
            ))}

            {/* Card para adicionar nova conta */}
            <button
              className={styles.addAccountCard}
              onClick={() => setShowAddAccountModal(true)}
            >
              <Plus size={24} />
              <span>Adicionar conta</span>
            </button>
          </div>
        )}
      </section>

      {/* Templates/Campanhas */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Templates de Campanha</h2>
          <div className={styles.templateStats}>
            <span className={styles.statBadge}>
              <Play size={14} /> {templates.filter(t => t.status === 'published').length} publicadas
            </span>
            <span className={styles.statBadge}>
              <FileText size={14} /> {templates.filter(t => t.status === 'draft').length} rascunhos
            </span>
          </div>
        </div>

        <div className={styles.toolbar}>
          <Input
            placeholder="Buscar templates..."
            leftIcon={<Search size={18} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
            size="md"
          />
        </div>

        {isLoadingTemplates ? (
          <div className={styles.loadingSmall}>
            <Spinner size="sm" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={48} />}
            title="Nenhum template encontrado"
            description={
              search
                ? 'Tente ajustar sua busca'
                : 'Crie seu primeiro template de campanha'
            }
            action={
              !search && (
                <Button
                  variant="primary"
                  leftIcon={<Plus size={18} />}
                  onClick={() => navigate('/alvoads-meta/criar')}
                >
                  Criar Template
                </Button>
              )
            }
          />
        ) : (
          <div className={styles.templatesList}>
            {filteredTemplates.map((template) => {
              // Type assertions for nested data objects
              const campaignData = template.campaign_data as { objective?: string; campaign?: { objective?: string } } | undefined
              const adSetData = template.ad_set_data as { numberOfAdSets?: number; budget?: number; budgetType?: string } | undefined
              const adsData = template.ads_data as { creatives?: unknown[] } | undefined

              const objective = campaignData?.campaign?.objective || campaignData?.objective || 'traffic'
              const adSetsCount = adSetData?.numberOfAdSets || 1
              const adsCount = adsData?.creatives?.length || 0
              const budget = adSetData?.budget
              const budgetType = adSetData?.budgetType

              // Draft progress info
              const isDraft = template.status === 'draft'
              const lastStep = template.last_wizard_step as MetaWizardStep | undefined
              const lastStepLabel = lastStep ? META_STEP_LABELS[lastStep] : null
              const lastStepIndex = lastStep ? META_WIZARD_STEPS.indexOf(lastStep) : -1
              const totalSteps = META_WIZARD_STEPS.length
              const progressPercent = lastStepIndex >= 0 ? Math.round(((lastStepIndex + 1) / totalSteps) * 100) : 0

              return (
                <div key={template.id} className={styles.templateCard}>
                  <div className={styles.templateMain}>
                    <div className={styles.templateInfo}>
                      <h3 className={styles.templateName}>{template.template_name}</h3>
                      <div className={styles.templateMeta}>
                        <span className={styles.templateObjective}>
                          {objectiveLabels[objective] || objective}
                        </span>
                        <span className={styles.separator}>•</span>
                        <span>{adSetsCount} conjunto{adSetsCount !== 1 ? 's' : ''}</span>
                        <span className={styles.separator}>•</span>
                        <span>{adsCount} anúncio{adsCount !== 1 ? 's' : ''}</span>
                        {budget && (
                          <>
                            <span className={styles.separator}>•</span>
                            <span>R$ {budget.toFixed(2)}/{budgetType === 'daily' ? 'dia' : 'total'}</span>
                          </>
                        )}
                      </div>
                      {/* Draft progress indicator */}
                      {isDraft && lastStep && (
                        <div className={styles.draftProgress}>
                          <div className={styles.draftProgressBar}>
                            <div
                              className={styles.draftProgressFill}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className={styles.draftProgressLabel}>
                            Parou em: <strong>{lastStepLabel}</strong> ({progressPercent}%)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={styles.templateStatus}>
                      {getStatusBadge(template.status)}
                      <span className={styles.templateDate}>
                        Modificado em {formatDate(template.updated_at)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.templateActions}>
                    {isDraft ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/alvoads-meta/editar/${template.id}`)}
                      >
                        Continuar <ArrowRight size={14} />
                      </Button>
                    ) : (
                      <button
                        className={styles.templateActionBtn}
                        title="Ver detalhes"
                        onClick={() => navigate(`/alvoads-meta/editar/${template.id}`)}
                      >
                        <ChevronRight size={20} />
                      </button>
                    )}
                    <div className={styles.templateDropdown}>
                      <button className={styles.templateActionBtn} title="Mais opções">
                        <MoreVertical size={18} />
                      </button>
                      <div className={styles.dropdownMenu}>
                        <button
                          onClick={() => handleDuplicateTemplate(template)}
                          disabled={duplicateTemplateMutation.isPending}
                        >
                          <Copy size={14} /> {duplicateTemplateMutation.isPending ? 'Duplicando...' : 'Duplicar'}
                        </button>
                        <button>
                          <BarChart3 size={14} /> Ver métricas
                        </button>
                        <button
                          className={styles.dangerOption}
                          onClick={() => setDeleteTarget(template)}
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal de adicionar conta */}
      <Modal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        title="Conectar Conta Meta Ads"
        size="md"
      >
        <div className={styles.addAccountModal}>
          <p className={styles.addAccountDescription}>
            Dê um nome para identificar esta conta de anúncios. Após conectar, você terá acesso
            às suas campanhas, públicos e pixels do Meta Business Suite.
          </p>
          <Input
            placeholder="Ex: Minha Empresa - Conta Principal"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className={styles.accountNameInput}
            autoFocus
          />
          <div className={styles.addAccountActions}>
            <Button variant="ghost" onClick={() => setShowAddAccountModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAddAccount}
              disabled={!accountName.trim()}
            >
              Conectar com Meta
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Template"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja excluir o template{' '}
            <strong>{deleteTarget?.template_name}</strong>?
          </p>
          <p className={styles.deleteWarning}>
            Esta ação não pode ser desfeita. Todas as configurações do template serão perdidas.
          </p>
          <div className={styles.deleteActions}>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTemplate}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
