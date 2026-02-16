import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search, Loader2, AlertCircle, SkipForward, MousePointerClick, CheckCircle2, X, Layers, Check, Link2, ExternalLink } from 'lucide-react'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Input, Button, Select, Modal, DataTable, Alert } from '@/shared/components'
import { supabase } from '@/shared/utils/supabase'
import { StepNavigation } from './StepNavigation'
import styles from './Steps.module.css'
import { fetchWordPressPostUrl } from '../../api/useGoogleCampaigns'
import { useGoogleAdsWizardStore } from '../../stores/googleAdsWizardStore'
import { toPreArticleUrl } from '../../utils/utmBuilder'
import type { SourceArticleData } from '../../types/campaign'
import type { ColumnDef } from '@tanstack/react-table'

interface ArticleProject {
  id: number
  name: string
  workspace_id: string
}

interface KeywordSnapshotData {
  id: number
  word: string
  search_volume?: number
  cpc_min?: number
  cpc_max?: number
  visibility?: string
  created_at?: string
  updated_at?: string
  competition?: string
  language: string
  country: string
}

interface Article {
  id: number
  title: string
  excerpt?: string
  content?: string
  keyword_used?: string
  keyword_snapshot?: KeywordSnapshotData // Full keyword data with language and country
  language?: string
  words?: number
  status: string
  project_id?: number
  wpPost_id?: number // WordPress post ID
  is_approval_article?: boolean // true = base article, false = arrow/scale article
  project?: ArticleProject[] | ArticleProject
  googleAdsTemplates?: Array<{ id: string; name: string; status: string }> // Google Ads templates for this article
}

interface Project {
  id: number
  name: string
}

export function StepArticleSource() {
  const workspaceId = useWorkspaceId()
  const {
    sourceArticles,
    toggleSourceArticle,
    isArticleSelected,
    clearSourceArticles,
    removeSourceArticle,
    markStepCompleted,
    hasGeneratedContent,
    accounts,
    getTotalCampaignsCount,
    toggleArticlePreUrl,
  } = useGoogleAdsWizardStore()

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showChangeConfirmModal, setShowChangeConfirmModal] = useState(false)
  const [pendingArticle, setPendingArticle] = useState<Article | null>(null)
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [articleUrlError, setArticleUrlError] = useState<string | null>(null)

  // Fetch projects
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects-for-article-source', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return []
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .order('name')
      if (error) throw error
      return data as Project[]
    },
    enabled: !!workspaceId,
  })

  // Fetch only arrow articles (is_approval_article=false) that are published
  const { data: articles, isLoading: loadingArticles } = useQuery({
    queryKey: ['articles-for-campaign', workspaceId, selectedProjectId],
    queryFn: async () => {
      if (!workspaceId) return []

      let query = supabase
        .from('articles')
        .select(`
          id, title, excerpt, content, keyword_used, keyword_snapshot, language, words, status, project_id, is_approval_article, wpPost_id,
          project:projects!inner(id, name, workspace_id, is_deleted)
        `)
        .eq('project.workspace_id', workspaceId)
        .eq('project.is_deleted', false) // Only non-deleted projects
        .eq('is_approval_article', false) // Only arrow articles
        .in('status', ['published', 'publish']) // Only published articles
        .order('created_at', { ascending: false })
        .limit(100)

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId)
      }

      const { data, error } = await query
      if (error) throw error

      // Get article IDs to check for existing Google Ads templates
      const articleIds = (data || []).map((a: { id: number }) => a.id)

      // Fetch existing Google Ads templates for these articles (with details)
      const templatesByArticle = new Map<number, Array<{ id: string; name: string; status: string }>>()
      if (articleIds.length > 0) {
        const { data: templates } = await supabase
          .from('ad_campaign_templates')
          .select('id, name, status, source_article_id')
          .eq('platform', 'google_ads')
          .in('source_article_id', articleIds)

        if (templates) {
          templates.forEach(t => {
            if (t.source_article_id) {
              const existing = templatesByArticle.get(t.source_article_id) || []
              existing.push({ id: t.id, name: t.name, status: t.status })
              templatesByArticle.set(t.source_article_id, existing)
            }
          })
        }
      }

      // Normalize project field and add googleAdsTemplates array
      return (data || []).map((item: Record<string, unknown>) => ({
        ...item,
        project: Array.isArray(item.project) ? item.project[0] : item.project,
        googleAdsTemplates: templatesByArticle.get(item.id as number) || [],
      })) as Article[]
    },
    enabled: !!workspaceId,
  })

  // Filter articles by search term
  const filteredArticles = useMemo(() => {
    if (!articles) return []
    if (!searchTerm.trim()) return articles

    const term = searchTerm.toLowerCase()
    return articles.filter(
      (a) =>
        a.title?.toLowerCase().includes(term) ||
        a.keyword_used?.toLowerCase().includes(term)
    )
  }, [articles, searchTerm])

  const handleSelectArticle = async (article: Article) => {
    // Check if user already has generated content
    const hasContent = hasGeneratedContent()

    // If there's already generated content and we're adding a NEW article
    if (hasContent && !isArticleSelected(article.id)) {
      // Show confirmation modal
      setPendingArticle(article)
      setShowChangeConfirmModal(true)
      return
    }

    // Toggle article selection (multi-select)
    await toggleArticleWithUrl(article)
  }

  const toggleArticleWithUrl = async (article: Article) => {
    const project = getArticleProject(article)
    setArticleUrlError(null)

    // If article is already selected, just remove it
    if (isArticleSelected(article.id)) {
      removeSourceArticle(article.id)
      // Step remains completed if we still have at least one article
      // (step also remains completed if we're in "skip" mode with 0 articles)
      return
    }

    // Fetch WordPress URL if article has wpPost_id and project_id
    let articleUrl: string | undefined
    if (article.wpPost_id && article.project_id) {
      setFetchingUrl(true)
      try {
        const result = await fetchWordPressPostUrl(article.project_id, article.wpPost_id)
        if (result.success && result.url) {
          articleUrl = result.url
        } else if (result.status === 'trashed') {
          setArticleUrlError('Este artigo foi excluído do WordPress. Selecione outro artigo.')
          setFetchingUrl(false)
          return
        } else if (result.message) {
          setArticleUrlError(result.message)
        }
      } catch (error) {
        console.error('Erro ao buscar URL do artigo:', error)
      } finally {
        setFetchingUrl(false)
      }
    }

    const articleData: SourceArticleData = {
      articleId: article.id,
      wpPostId: article.wpPost_id,
      title: article.title || 'Sem título',
      excerpt: article.excerpt,
      content: article.content?.substring(0, 1000),
      keywordUsed: article.keyword_used,
      keywordSnapshot: article.keyword_snapshot,
      language: article.language,
      words: article.words,
      projectId: article.project_id,
      projectName: project?.name,
      articleUrl,
    }

    toggleSourceArticle(articleData)
    markStepCompleted('article_source')
  }

  // Helper to get project from article (handles array or object)
  const getArticleProject = (article: Article): ArticleProject | undefined => {
    if (!article.project) return undefined
    if (Array.isArray(article.project)) return article.project[0]
    return article.project
  }

  const handleConfirmChange = async () => {
    if (pendingArticle) {
      // Clear existing content and add the new article
      setShowChangeConfirmModal(false)
      setPendingArticle(null)
      await toggleArticleWithUrl(pendingArticle)
    }
  }

  const handleSkip = () => {
    clearSourceArticles()
    markStepCompleted('article_source')
  }

  const isLoading = loadingProjects || loadingArticles || fetchingUrl
  const hasArticles = filteredArticles.length > 0

  const selectedArticlesCount = sourceArticles.length
  const accountsCount = accounts.length
  const totalCampaigns = getTotalCampaignsCount()

  // Define columns for DataTable (only arrow articles that are published)
  const columns: Array<ColumnDef<Article, unknown>> = useMemo(() => [
    {
      id: 'select',
      header: () => null,
      cell: ({ row }) => {
        const isSelected = isArticleSelected(row.original.id)
        return (
          <div
            className={`${styles.checkboxIndicator} ${isSelected ? styles.checked : ''}`}
            style={{ margin: '0 auto' }}
          >
            {isSelected && <Check size={14} />}
          </div>
        )
      },
      size: 50,
      enableSorting: false,
    },
    {
      accessorKey: 'title',
      header: 'Título',
      cell: ({ row }) => (
        <span style={{
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: '1.4',
        }}>
          {row.original.title || 'Sem título'}
        </span>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'keyword_used',
      header: 'Palavra-chave',
      cell: ({ row }) => (
        row.original.keyword_used ? (
          <span style={{
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-primary-bg)',
            color: 'var(--color-primary-dark)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            display: 'inline-block',
            maxWidth: '200px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {row.original.keyword_used}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>—</span>
        )
      ),
      enableSorting: true,
    },
    {
      id: 'project',
      header: 'Projeto',
      // accessorFn is required for sorting to work on columns without accessorKey
      accessorFn: (row) => getArticleProject(row)?.name || '',
      cell: ({ row }) => {
        const project = getArticleProject(row.original)
        return project?.name ? (
          <span style={{
            fontSize: '12px',
            color: 'var(--color-text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '150px',
            display: 'inline-block',
          }}>
            {project.name}
          </span>
        ) : (
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>—</span>
        )
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = getArticleProject(rowA.original)?.name || ''
        const b = getArticleProject(rowB.original)?.name || ''
        return a.localeCompare(b)
      },
    },
    {
      id: 'googleAds',
      header: 'Google Ads',
      accessorFn: (row) => row.googleAdsTemplates?.length || 0,
      cell: ({ row }) => {
        const templates = row.original.googleAdsTemplates || []
        const count = templates.length

        // Build tooltip content with template names
        const tooltipContent = count > 0
          ? templates.map(t => `• ${t.name} (${t.status})`).join('\n')
          : 'Nenhum anúncio criado'

        return (
          <span
            title={tooltipContent}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              background: count > 0 ? 'var(--color-success-bg)' : 'var(--color-bg-tertiary)',
              color: count > 0 ? 'var(--color-success)' : 'var(--color-text-tertiary)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'help',
            }}
          >
            {count > 0 && <CheckCircle2 size={12} />}
            {count === 0 ? '0' : count === 1 ? '1 anúncio' : `${count} anúncios`}
          </span>
        )
      },
      size: 110,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.googleAdsTemplates?.length || 0
        const b = rowB.original.googleAdsTemplates?.length || 0
        return a - b
      },
    },
  ], [isArticleSelected])

  // Handle row click to select article
  const handleRowClick = (article: Article) => {
    handleSelectArticle(article)
  }

  // Get selected row for highlighting
  const getRowId = (article: Article) => article.id.toString()
  const selectedRowIds = sourceArticles.map(a => a.articleId.toString())

  return (
    <div className={styles.stepContent}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Selecionar Artigos Flecha</h3>
        <p className={styles.sectionDescription}>
          Selecione um ou mais artigos flecha publicados para gerar campanhas automaticamente.
          Cada artigo selecionado criará uma campanha em cada conta selecionada.
          Você pode pular esta etapa se preferir criar manualmente.
        </p>

        {/* Filters */}
        <div className={styles.filtersRow}>
          <Select
            value={selectedProjectId?.toString() || ''}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: 'Todos os projetos' },
              ...(projects?.map((p) => ({ value: p.id.toString(), label: p.name })) || []),
            ]}
            className={styles.projectSelect}
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar artigo por título ou palavra-chave..."
            leftIcon={<Search size={16} />}
            fullWidth
            size="md"
          />
        </div>

        {/* Table Hint */}
        {hasArticles && !isLoading && (
          <div className={styles.tableHint}>
            <MousePointerClick size={16} />
            <span>Clique em um ou mais artigos para selecioná-los. Cada artigo gerará uma campanha por conta.</span>
          </div>
        )}

        {/* Selection Counter */}
        {selectedArticlesCount > 0 && (
          <div className={styles.selectionCounter}>
            <Layers size={20} className={styles.selectionCounterIcon} />
            <div className={styles.selectionCounterText}>
              <strong>{selectedArticlesCount}</strong> {selectedArticlesCount === 1 ? 'artigo selecionado' : 'artigos selecionados'}
              {accountsCount > 0 && (
                <span> × <strong>{accountsCount}</strong> {accountsCount === 1 ? 'conta' : 'contas'} = <strong>{totalCampaigns}</strong> {totalCampaigns === 1 ? 'campanha' : 'campanhas'}</span>
              )}
            </div>
            <div className={styles.selectionCounterActions}>
              <button
                type="button"
                className={styles.clearSelectionButton}
                onClick={clearSourceArticles}
              >
                <X size={14} />
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Error Alert for trashed/unavailable articles */}
        {articleUrlError && (
          <Alert variant="error" onClose={() => setArticleUrlError(null)}>
            <strong>Artigo indisponível:</strong> {articleUrlError}
          </Alert>
        )}

        {/* Articles Table */}
        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>{fetchingUrl ? 'Buscando URL do artigo...' : 'Carregando artigos...'}</span>
          </div>
        ) : !hasArticles ? (
          <div className={styles.emptyState}>
            <FileText size={32} className={styles.emptyIcon} />
            <h4>Nenhum artigo flecha encontrado</h4>
            <p>
              {searchTerm
                ? 'Nenhum artigo corresponde à sua busca.'
                : 'Você ainda não tem artigos flecha publicados.'}
            </p>
          </div>
        ) : (
          <div className={styles.articlesTableWrapper}>
            <DataTable
              data={filteredArticles}
              columns={columns}
              enableSorting={true}
              defaultSorting={[{ id: 'title', desc: false }]}
              enablePagination={filteredArticles.length > 10}
              pageSize={10}
              size="sm"
              variant="default"
              stickyHeader
              emptyMessage="Nenhum artigo encontrado"
              onRowClick={handleRowClick}
              getRowId={getRowId}
              highlightedRowIds={selectedRowIds}
            />
          </div>
        )}

        {/* Skip Option */}
        <div className={styles.skipSection}>
          <button
            type="button"
            className={`${styles.skipButton} ${selectedArticlesCount === 0 ? styles.active : ''}`}
            onClick={handleSkip}
          >
            <SkipForward size={16} />
            <span>Pular esta etapa - vou criar manualmente</span>
          </button>
        </div>

        {/* Selected Articles with URL Type Selection */}
        {selectedArticlesCount > 0 && (
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)'
            }}>
              <Link2 size={16} />
              Configurar URL dos Anúncios
            </h4>
            <p style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-4)'
            }}>
              Escolha o tipo de URL que será usada nos anúncios de cada artigo.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sourceArticles.map((article) => {
                const baseUrl = article.articleUrl || ''
                const preUrl = baseUrl ? toPreArticleUrl(baseUrl) : ''
                const displayUrl = article.usePreArticleUrl ? preUrl : baseUrl

                return (
                  <div
                    key={article.articleId}
                    style={{
                      background: 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--space-4)',
                    }}
                  >
                    {/* Article Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 'var(--space-3)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 500,
                          color: 'var(--color-text-primary)',
                          fontSize: '14px',
                          marginBottom: '2px'
                        }}>
                          {article.title}
                        </div>
                        {article.keywordUsed && (
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--color-primary-bg)',
                            color: 'var(--color-primary-dark)',
                            fontWeight: 500,
                          }}>
                            {article.keywordUsed}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSourceArticle(article.articleId)}
                        title="Remover artigo"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          color: 'var(--color-text-tertiary)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* URL Type Toggle */}
                    <div style={{
                      display: 'flex',
                      gap: 'var(--space-2)',
                      marginBottom: 'var(--space-3)'
                    }}>
                      <button
                        type="button"
                        onClick={() => article.usePreArticleUrl && toggleArticlePreUrl(article.articleId)}
                        style={{
                          flex: 1,
                          padding: 'var(--space-2) var(--space-3)',
                          border: `2px solid ${!article.usePreArticleUrl ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: !article.usePreArticleUrl ? 'var(--color-primary-bg)' : 'var(--color-bg-primary)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 'var(--space-2)',
                          fontSize: '13px',
                          fontWeight: !article.usePreArticleUrl ? 600 : 400,
                          color: !article.usePreArticleUrl ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <ExternalLink size={14} />
                        URL Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => !article.usePreArticleUrl && toggleArticlePreUrl(article.articleId)}
                        style={{
                          flex: 1,
                          padding: 'var(--space-2) var(--space-3)',
                          border: `2px solid ${article.usePreArticleUrl ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: article.usePreArticleUrl ? 'var(--color-primary-bg)' : 'var(--color-bg-primary)',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 'var(--space-2)',
                          fontSize: '13px',
                          fontWeight: article.usePreArticleUrl ? 600 : 400,
                          color: article.usePreArticleUrl ? 'var(--color-primary-dark)' : 'var(--color-text-secondary)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Link2 size={14} />
                        URL Pré-Artigo
                      </button>
                    </div>

                    {/* URL Preview */}
                    {baseUrl && (
                      <div style={{
                        background: 'var(--color-bg-tertiary)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: 'var(--color-text-secondary)',
                        wordBreak: 'break-all',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}>
                        <Link2 size={12} style={{ flexShrink: 0 }} />
                        <span>{displayUrl}</span>
                      </div>
                    )}

                    {!baseUrl && (
                      <div style={{
                        background: 'var(--color-warning-bg)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        color: 'var(--color-warning)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}>
                        <AlertCircle size={12} />
                        <span>URL não disponível - artigo pode não estar publicado no WordPress</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showChangeConfirmModal}
        onClose={() => {
          setShowChangeConfirmModal(false)
          setPendingArticle(null)
        }}
        title="Adicionar artigo?"
        size="sm"
      >
        <div className={styles.confirmModalContent}>
          <AlertCircle size={48} className={styles.warningIcon} />
          <p>
            Você já tem conteúdo gerado (palavras-chave ou anúncios).
            Ao adicionar mais artigos, você pode precisar ajustar esse conteúdo.
          </p>
          <p className={styles.confirmQuestion}>
            Deseja adicionar este artigo?
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', justifyContent: 'center' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setShowChangeConfirmModal(false)
                setPendingArticle(null)
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmChange}>
              Sim, adicionar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step Navigation */}
      <StepNavigation />
    </div>
  )
}
