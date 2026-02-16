import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Search,
  Loader2,
  SkipForward,
  MousePointerClick,
  CheckCircle2,
  X,
  Layers,
  Check,
  AlertCircle,
} from 'lucide-react'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Input, Select, DataTable, Alert } from '@/shared/components'
import { supabase } from '@/shared/utils/supabase'
import styles from './WizardSteps.module.css'
import { fetchWordPressPostUrl } from '../../api/queries'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import type { MetaSelectedArticle } from '../../types/campaign'
import type { ColumnDef } from '@tanstack/react-table'

interface ArticleProject {
  id: number
  name: string
  workspace_id: string
  domain?: string
}

interface Article {
  id: number
  title: string
  excerpt?: string
  content?: string
  keyword_used?: string
  language?: string
  words?: number
  status: string
  project_id?: number
  wpPost_id?: number
  slug?: string
  is_approval_article?: boolean
  project?: ArticleProject[] | ArticleProject
  metaAdsTemplates?: Array<{ id: string; name: string; status: string }>
}

interface Project {
  id: number
  name: string
}

export function StepArticles() {
  const workspaceId = useWorkspaceId()
  const {
    selectedArticles,
    toggleArticle,
    isArticleSelected,
    clearArticles,
    removeArticle,
    markStepCompleted,
    markStepIncomplete,
  } = useMetaAdsWizardStore()

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [articleUrlError, setArticleUrlError] = useState<string | null>(null)

  // Fetch projects
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects-for-meta-ads', workspaceId],
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
    queryKey: ['articles-for-meta-campaign', workspaceId, selectedProjectId],
    queryFn: async () => {
      if (!workspaceId) return []

      let query = supabase
        .from('articles')
        .select(`
          id, title, excerpt, content, keyword_used, language, words, status, project_id, is_approval_article, wpPost_id, slug, keyword_snapshot,
          project:projects!inner(id, name, workspace_id, domain)
        `)
        .eq('project.workspace_id', workspaceId)
        .eq('project.is_deleted', false) // Only from non-deleted projects
        .eq('is_approval_article', false) // Only arrow articles
        .in('status', ['published', 'publish']) // Only published articles
        .order('created_at', { ascending: false })
        .limit(100)

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId)
      }

      const { data, error } = await query
      if (error) throw error

      // Get article IDs to check for existing Meta Ads templates
      const articleIds = (data || []).map((a: { id: number }) => a.id)

      // Fetch existing Meta Ads templates for these articles
      const templatesByArticle = new Map<number, Array<{ id: string; name: string; status: string }>>()
      if (articleIds.length > 0) {
        const { data: templates } = await supabase
          .from('ad_campaign_templates')
          .select('id, name, status, source_article_id')
          .eq('platform', 'meta')
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

      // Normalize project field and add metaAdsTemplates array
      return (data || []).map((item: Record<string, unknown>) => ({
        ...item,
        project: Array.isArray(item.project) ? item.project[0] : item.project,
        metaAdsTemplates: templatesByArticle.get(item.id as number) || [],
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

  // Helper to get project from article (handles array or object)
  const getArticleProject = (article: Article): ArticleProject | undefined => {
    if (!article.project) return undefined
    if (Array.isArray(article.project)) return article.project[0]
    return article.project
  }

  /**
   * Handles article selection with WordPress URL fetch
   * Similar to Google Ads implementation - fetches URL from WordPress API
   * to ensure correct URL and proper handling of trashed/unpublished posts
   */
  const handleSelectArticle = useCallback(
    async (article: Article) => {
      const project = getArticleProject(article)
      setArticleUrlError(null)

      // If article is already selected, just remove it
      if (isArticleSelected(article.id)) {
        removeArticle(article.id)
        setTimeout(() => {
          if (useMetaAdsWizardStore.getState().selectedArticles.length === 0) {
            markStepIncomplete('articles')
          }
        }, 0)
        return
      }

      // Fetch WordPress URL if article has wpPost_id and project_id
      let articleUrl: string | null = null
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
          } else if (result.status && result.status !== 'publish') {
            setArticleUrlError(`Artigo não está publicado no WordPress (status: ${result.status}). Selecione outro artigo.`)
            setFetchingUrl(false)
            return
          } else if (result.message) {
            setArticleUrlError(result.message)
            setFetchingUrl(false)
            return
          }
        } catch (error) {
          console.error('Erro ao buscar URL do artigo:', error)
          // Fallback: try to build URL from project domain and slug
          if (project?.domain && article.slug) {
            const domain = project.domain.startsWith('http')
              ? project.domain
              : `https://${project.domain}`
            const cleanDomain = domain.replace(/\/$/, '')
            articleUrl = `${cleanDomain}/${article.slug}`
          }
        } finally {
          setFetchingUrl(false)
        }
      } else if (project?.domain && article.slug) {
        // No wpPost_id - build URL from project domain and slug as fallback
        const domain = project.domain.startsWith('http')
          ? project.domain
          : `https://${project.domain}`
        const cleanDomain = domain.replace(/\/$/, '')
        articleUrl = `${cleanDomain}/${article.slug}`
      }

      const articleData: MetaSelectedArticle = {
        id: article.id,
        title: article.title || null,
        keyword_used: article.keyword_used || null,
        excerpt: article.excerpt || null,
        url: articleUrl,
        project_id: article.project_id || 0,
        project_name: project?.name,
        status: article.status || null,
        language: article.language,
      }

      toggleArticle(articleData)

      // Mark step completed if at least one article is selected
      setTimeout(() => {
        const state = useMetaAdsWizardStore.getState()
        if (state.selectedArticles.length > 0) {
          markStepCompleted('articles')
        } else {
          markStepIncomplete('articles')
        }
      }, 0)
    },
    [toggleArticle, removeArticle, isArticleSelected, markStepCompleted, markStepIncomplete]
  )

  const handleSkip = () => {
    clearArticles()
    markStepCompleted('articles')
  }

  const isLoading = loadingProjects || loadingArticles || fetchingUrl
  const hasArticles = filteredArticles.length > 0
  const selectedArticlesCount = selectedArticles.length

  // Define columns for DataTable
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
      id: 'metaAds',
      header: 'Meta Ads',
      accessorFn: (row) => row.metaAdsTemplates?.length || 0,
      cell: ({ row }) => {
        const templates = row.original.metaAdsTemplates || []
        const count = templates.length

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
        const a = rowA.original.metaAdsTemplates?.length || 0
        const b = rowB.original.metaAdsTemplates?.length || 0
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
  const selectedRowIds = selectedArticles.map(a => a.id.toString())

  return (
    <div className={styles.stepContent}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Selecionar Artigos Flecha</h3>
        <p className={styles.sectionDescription}>
          Selecione um ou mais artigos flecha publicados para gerar campanhas Meta Ads.
          Cada artigo selecionado criará uma campanha separada.
          Você pode pular esta etapa se preferir criar manualmente.
        </p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <Select
            value={selectedProjectId?.toString() || ''}
            onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
            options={[
              { value: '', label: 'Todos os projetos' },
              ...(projects?.map((p) => ({ value: p.id.toString(), label: p.name })) || []),
            ]}
            style={{ minWidth: '200px' }}
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

        {/* URL Fetch Error */}
        {articleUrlError && (
          <Alert
            variant="error"
            onClose={() => setArticleUrlError(null)}
            style={{ marginBottom: 'var(--space-3)' }}
          >
            <AlertCircle size={16} style={{ marginRight: 'var(--space-2)' }} />
            {articleUrlError}
          </Alert>
        )}

        {/* URL Fetch Loading */}
        {fetchingUrl && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-primary-alpha-10)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            color: 'var(--color-primary)',
            marginBottom: 'var(--space-3)',
          }}>
            <Loader2 size={16} className={styles.spinner} />
            <span>Buscando URL do artigo no WordPress...</span>
          </div>
        )}

        {/* Table Hint */}
        {hasArticles && !isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-info-alpha-10)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--space-3)',
          }}>
            <MousePointerClick size={16} />
            <span>Clique em um ou mais artigos para selecioná-los. Cada artigo gerará uma campanha.</span>
          </div>
        )}

        {/* Selection Counter */}
        {selectedArticlesCount > 0 && (
          <div className={styles.selectionCounter}>
            <Layers size={20} className={styles.selectionCounterIcon} />
            <div className={styles.selectionCounterText}>
              <strong>{selectedArticlesCount}</strong> {selectedArticlesCount === 1 ? 'artigo selecionado' : 'artigos selecionados'}
              <span style={{ color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                = {selectedArticlesCount} {selectedArticlesCount === 1 ? 'campanha' : 'campanhas'}
              </span>
            </div>
            <div className={styles.selectionCounterActions}>
              <button
                type="button"
                className={styles.clearSelectionButton}
                onClick={() => {
                  clearArticles()
                  markStepIncomplete('articles')
                }}
              >
                <X size={14} />
                Limpar
              </button>
            </div>
          </div>
        )}

        {/* Articles Table */}
        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Carregando artigos...</span>
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
          <div style={{ marginTop: 'var(--space-3)' }}>
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
        <div style={{
          marginTop: 'var(--space-4)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border)',
        }}>
          <button
            type="button"
            onClick={handleSkip}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              background: selectedArticlesCount === 0 ? 'var(--color-primary-alpha-10)' : 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <SkipForward size={16} />
            <span>Pular esta etapa - vou criar manualmente</span>
          </button>
        </div>

        {/* Selected Articles as Chips */}
        {selectedArticlesCount > 0 && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <div className={styles.selectedItemsList}>
              {selectedArticles.map((article) => (
                <div key={article.id} className={styles.selectedItemChip}>
                  <span>{article.title || article.keyword_used || `Artigo #${article.id}`}</span>
                  {article.keyword_used && article.title && (
                    <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}>
                      ({article.keyword_used})
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.selectedItemChipRemove}
                    onClick={() => {
                      removeArticle(article.id)
                      setTimeout(() => {
                        if (useMetaAdsWizardStore.getState().selectedArticles.length === 0) {
                          markStepIncomplete('articles')
                        }
                      }, 0)
                    }}
                    title="Remover artigo"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
