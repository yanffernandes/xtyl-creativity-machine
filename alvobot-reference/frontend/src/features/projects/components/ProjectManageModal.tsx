import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Globe,
  ExternalLink,
  RefreshCw,
  Trash2,
  FileText,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Settings,
  Link2,
  Map,
  Gauge,
} from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { useGoogleLanguages } from '@/features/keywords/api/useKeywords'
import {
  useCreateSitemap,
  useDeleteSitemap,
  useDetectSitemaps,
  useSitemaps,
  useSyncSitemap,
} from '@/features/search-console-indexing/api'
import {
  Button,
  Input,
  Select,
  Modal,
  Alert,
  SearchableSelect,
  Spinner,
  ContentTabs,
} from '@/shared/components'
import { PageSpeedMetricsCard } from './PageSpeedMetricsCard'
import styles from './ProjectManageModal.module.css'
import { useGetWordPressSiteInfo, useGenerateMagicLink } from '../api/wordpress'
import type { Project } from '../types'

const manageSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  domain: z.string().optional(),
  default_language: z.string().optional(),
  adsense_status: z.string().optional(),
})

type ManageFormData = z.infer<typeof manageSchema>

interface ProjectManageModalProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: ManageFormData) => void
  onDelete: () => void
  onReinstallPlugin: () => void
  isLoading?: boolean
  articleCount?: number
}

const statusOptions = [
  { value: 'analyzing', label: 'Em análise' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'rejected', label: 'Rejeitado' },
]

type TabId = 'general' | 'connection' | 'sitemap' | 'performance'

const TABS = [
  { id: 'general' as TabId, label: 'Geral', icon: <Settings size={16} /> },
  { id: 'connection' as TabId, label: 'Conexão', icon: <Link2 size={16} /> },
  { id: 'sitemap' as TabId, label: 'Sitemap', icon: <Map size={16} /> },
  { id: 'performance' as TabId, label: 'Performance', icon: <Gauge size={16} /> },
]

export function ProjectManageModal({
  project,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onReinstallPlugin,
  isLoading,
  articleCount = 0,
}: ProjectManageModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean
    message: string
    wpVersion?: string
  } | null>(null)
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null)
  const [sitemapUrl, setSitemapUrl] = useState('')

  const testConnectionMutation = useGetWordPressSiteInfo()
  const magicLinkMutation = useGenerateMagicLink()
  const { data: languageOptions = [], isLoading: isLoadingLanguages } =
    useGoogleLanguages()
  const { data: sitemaps = [], isLoading: isLoadingSitemaps } = useSitemaps(
    project?.id
  )
  const detectSitemapsMutation = useDetectSitemaps(project?.id)
  const createSitemapMutation = useCreateSitemap(project?.id)
  const deleteSitemapMutation = useDeleteSitemap()
  const syncSitemapMutation = useSyncSitemap()
  const [syncingSitemapId, setSyncingSitemapId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<ManageFormData>({
    resolver: zodResolver(manageSchema),
    defaultValues: {
      name: '',
      domain: '',
      default_language: 'pt-BR',
      adsense_status: 'analyzing',
    },
  })

  // Reset form and tab when project changes or modal opens
  useEffect(() => {
    if (project && isOpen) {
      reset({
        name: project.name || '',
        domain: project.domain || '',
        default_language: project.default_language || 'pt-BR',
        adsense_status: project.adsense_status || 'analyzing',
      })
      setActiveTab('general')
    }
  }, [project, isOpen, reset])

  // Reset connection test result and magic link error when modal closes or project changes
  const projectId = project?.id
  useEffect(() => {
    return () => {
      setConnectionTestResult(null)
      setMagicLinkError(null)
    }
  }, [projectId])

  const handleTestConnection = async () => {
    if (!project) return

    setConnectionTestResult(null)
    try {
      const result = await testConnectionMutation.mutateAsync(project.id)
      setConnectionTestResult({
        success: result.success,
        message: result.message,
        wpVersion: result.wpVersion,
      })
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao testar conexão'
      setConnectionTestResult({
        success: false,
        message: errorMessage,
      })
    }
  }

  const handleDeleteClick = () => {
    onDelete()
  }

  const handleOpenWordPress = async () => {
    if (!project?.domain) return

    setMagicLinkError(null)

    // If project has a token, try to generate magic link
    if (project.token) {
      try {
        const result = await magicLinkMutation.mutateAsync({
          domain: project.domain,
          token: project.token,
        })

        if (result.login_url) {
          window.open(result.login_url, '_blank')
          return
        }
      } catch (error) {
        // If magic link fails, show error but still allow fallback to regular wp-admin
        const errorMessage =
          error instanceof Error ? error.message : 'Erro ao gerar link de acesso'
        setMagicLinkError(errorMessage)
      }
    }

    // Fallback: open regular wp-admin (user will need to login manually)
    const wpAdmin = `${project.domain.replace(/\/$/, '')}/wp-admin`
    window.open(wpAdmin, '_blank')
  }

  const handleRefreshPlugin = () => {
    onClose() // Close manage modal first
    onReinstallPlugin() // Then open wizard in reinstall mode
  }

  const handleDetectSitemap = async () => {
    if (!project?.id) return
    await detectSitemapsMutation.mutateAsync()
  }

  const handleAddSitemap = async () => {
    if (!project?.id || !sitemapUrl.trim()) return
    await createSitemapMutation.mutateAsync({ url: sitemapUrl.trim() })
    setSitemapUrl('')
  }

  const handleSyncSitemap = async (sitemapId: string) => {
    setSyncingSitemapId(sitemapId)
    try {
      await syncSitemapMutation.mutateAsync({ sitemapId })
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      setSyncingSitemapId(null)
    }
  }

  const formatDomain = (domain: string | undefined) => {
    if (!domain) return 'Não configurado'
    return domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }

  if (!project) return null

  const renderGeneralTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.fieldsGroup}>
        <div className={styles.field}>
          <Input
            label="Nome do Projeto"
            placeholder="Meu Blog"
            error={errors.name?.message}
            fullWidth
            {...register('name')}
          />
        </div>

        <div className={styles.field}>
          <Controller
            name="default_language"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Idioma Padrão"
                options={languageOptions}
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="Selecione um idioma"
                searchPlaceholder="Buscar idioma..."
                isLoading={isLoadingLanguages}
                fullWidth
              />
            )}
          />
        </div>

        <div className={styles.field}>
          <Controller
            name="adsense_status"
            control={control}
            render={({ field }) => (
              <Select
                label="Status do Blog"
                options={statusOptions}
                value={field.value || ''}
                onValueChange={field.onChange}
                fullWidth
              />
            )}
          />
        </div>
      </div>

      {/* Stats Summary */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <FileText size={18} className={styles.statIcon} />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{articleCount}</span>
            <span className={styles.statLabel}>Artigos Publicados</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderConnectionTab = () => (
    <div className={styles.tabContent}>
      {/* Connection Status Card */}
      <div
        className={`${styles.connectionCard} ${project.status ? styles.connected : styles.disconnected}`}
      >
        <div className={styles.connectionIcon}>
          {project.status ? <Wifi size={24} /> : <WifiOff size={24} />}
        </div>
        <div className={styles.connectionInfo}>
          <span className={styles.connectionStatus}>
            {project.status ? 'Conectado' : 'Desconectado'}
          </span>
          <span className={styles.connectionDomain}>
            {formatDomain(project.domain)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenWordPress}
          rightIcon={
            magicLinkMutation.isPending ? (
              <Loader2 size={14} className={styles.spinnerIcon} />
            ) : (
              <ExternalLink size={14} />
            )
          }
          disabled={!project.domain || magicLinkMutation.isPending}
        >
          {magicLinkMutation.isPending ? 'Abrindo...' : 'Acessar WordPress'}
        </Button>
      </div>

      {/* Magic Link Error */}
      {magicLinkError && (
        <Alert variant="warning" className={styles.alert}>
          <div className={styles.alertContent}>
            <AlertCircle size={16} />
            <div>
              <strong>Login automático indisponível</strong>
              <p className={styles.alertMessage}>{magicLinkError}</p>
            </div>
          </div>
        </Alert>
      )}

      {/* Connection Actions */}
      <div className={styles.connectionActions}>
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          leftIcon={
            testConnectionMutation.isPending ? (
              <Loader2 size={16} className={styles.spinnerIcon} />
            ) : (
              <Wifi size={16} />
            )
          }
          fullWidth
          disabled={testConnectionMutation.isPending}
        >
          {testConnectionMutation.isPending ? 'Testando...' : 'Testar Conexão'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleRefreshPlugin}
          leftIcon={<RefreshCw size={16} />}
          fullWidth
        >
          Refazer Instalação do Plugin
        </Button>
      </div>

      {/* Connection Test Result */}
      {connectionTestResult && (
        <Alert
          variant={connectionTestResult.success ? 'success' : 'error'}
          className={styles.alert}
        >
          <div className={styles.alertContent}>
            {connectionTestResult.success ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <div>
              <strong>
                {connectionTestResult.success ? 'Conexão OK' : 'Erro na conexão'}
              </strong>
              <p className={styles.alertMessage}>{connectionTestResult.message}</p>
              {connectionTestResult.wpVersion && (
                <p className={styles.alertVersion}>
                  WordPress: {connectionTestResult.wpVersion}
                </p>
              )}
            </div>
          </div>
        </Alert>
      )}
    </div>
  )

  const renderSitemapTab = () => (
    <div className={styles.tabContent}>
      {/* Sitemap Status */}
      <div className={styles.sitemapHeader}>
        <div className={styles.sitemapStatus}>
          {isLoadingSitemaps ? (
            <>
              <Spinner size="sm" />
              <span>Verificando...</span>
            </>
          ) : sitemaps.length > 0 ? (
            <>
              <CheckCircle size={16} className={styles.statusSuccess} />
              <span>
                {sitemaps.length} sitemap{sitemaps.length > 1 ? 's' : ''} encontrado
                {sitemaps.length > 1 ? 's' : ''}
              </span>
            </>
          ) : (
            <>
              <AlertCircle size={16} className={styles.statusWarning} />
              <span>Nenhum sitemap configurado</span>
            </>
          )}
        </div>
      </div>

      {/* Add Sitemap Form */}
      <div className={styles.sitemapForm}>
        <Input
          placeholder="https://seusite.com/sitemap.xml"
          value={sitemapUrl}
          onChange={(e) => setSitemapUrl(e.target.value)}
          fullWidth
        />
        <div className={styles.sitemapFormActions}>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddSitemap}
            isLoading={createSitemapMutation.isPending}
            disabled={!sitemapUrl.trim()}
          >
            Adicionar
          </Button>
          <Button
            size="sm"
            onClick={handleDetectSitemap}
            isLoading={detectSitemapsMutation.isPending}
          >
            Auto-detectar
          </Button>
        </div>
      </div>

      {/* Sitemap List */}
      {sitemaps.length > 0 && (
        <div className={styles.sitemapList}>
          {sitemaps.map((sitemap) => (
            <div
              key={sitemap.id}
              className={`${styles.sitemapItem} ${sitemap.last_sync_error ? styles.sitemapItemError : ''}`}
            >
              <div className={styles.sitemapItemInfo}>
                <span className={styles.sitemapItemUrl}>{sitemap.url}</span>
                <div className={styles.sitemapItemMeta}>
                  {sitemap.is_primary && (
                    <span className={styles.sitemapPrimaryBadge}>Principal</span>
                  )}
                  <span className={styles.sitemapItemType}>
                    {sitemap.sitemap_type}
                  </span>
                  {sitemap.last_sync_error ? (
                    <span
                      className={styles.sitemapItemErrorBadge}
                      title={sitemap.last_sync_error}
                    >
                      <AlertCircle size={10} />
                      Erro
                    </span>
                  ) : sitemap.urls_count !== undefined && sitemap.urls_count > 0 ? (
                    <span className={styles.sitemapItemCount}>
                      {sitemap.urls_count} URLs
                    </span>
                  ) : sitemap.last_synced_at ? (
                    <span className={styles.sitemapItemCount}>0 URLs</span>
                  ) : (
                    <span className={styles.sitemapItemPending}>
                      Não sincronizado
                    </span>
                  )}
                </div>
                {sitemap.last_sync_error && (
                  <span className={styles.sitemapItemErrorMessage}>
                    {sitemap.last_sync_error}
                  </span>
                )}
              </div>
              <div className={styles.sitemapItemButtons}>
                <button
                  type="button"
                  className={styles.sitemapItemSync}
                  onClick={() => handleSyncSitemap(sitemap.id)}
                  disabled={syncingSitemapId === sitemap.id}
                  aria-label="Sincronizar sitemap"
                  title="Sincronizar URLs do sitemap"
                >
                  {syncingSitemapId === sitemap.id ? (
                    <Loader2 size={14} className={styles.spinnerIcon} />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                </button>
                <button
                  type="button"
                  className={styles.sitemapItemRemove}
                  onClick={() => deleteSitemapMutation.mutate(sitemap.id)}
                  disabled={deleteSitemapMutation.isPending}
                  aria-label="Remover sitemap"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderPerformanceTab = () => (
    <div className={styles.tabContent}>
      {project.domain ? (
        <PageSpeedMetricsCard
          projectId={project.id}
          domain={project.domain}
          mobileScore={project.pagespeed_mobile_score}
          desktopScore={project.pagespeed_desktop_score}
          lastCheck={project.pagespeed_last_check}
          checkError={project.pagespeed_check_error}
        />
      ) : (
        <div className={styles.emptyState}>
          <Gauge size={32} className={styles.emptyIcon} />
          <p>Configure um domínio para verificar a performance</p>
        </div>
      )}
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      <div className={styles.container}>
        {/* Hero Header with Domain */}
        <div className={styles.heroHeader}>
          <div className={styles.heroContent}>
            <div className={styles.heroIcon}>
              <Globe size={20} />
            </div>
            <div className={styles.heroInfo}>
              <span className={styles.heroDomain}>
                {formatDomain(project.domain)}
              </span>
              <div className={styles.heroStatus}>
                {project.status ? (
                  <>
                    <Wifi size={12} className={styles.statusIconConnected} />
                    <span className={styles.statusTextConnected}>Conectado</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={12} className={styles.statusIconDisconnected} />
                    <span className={styles.statusTextDisconnected}>
                      Desconectado
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <ContentTabs
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabId)}
          className={styles.tabs}
        />

        {/* Tab Content */}
        <form onSubmit={handleSubmit(onSave)} className={styles.form}>
          <div className={styles.tabPanel}>
            {activeTab === 'general' && renderGeneralTab()}
            {activeTab === 'connection' && renderConnectionTab()}
            {activeTab === 'sitemap' && renderSitemapTab()}
            {activeTab === 'performance' && renderPerformanceTab()}
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              onClick={handleDeleteClick}
              leftIcon={<Trash2 size={16} />}
              className={styles.deleteButton}
            >
              Excluir Projeto
            </Button>
            <div className={styles.actionsRight}>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isLoading}>
                Salvar alterações
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  )
}
