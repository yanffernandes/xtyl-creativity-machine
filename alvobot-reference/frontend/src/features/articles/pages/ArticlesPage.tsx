import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Plus,
  Search,
  ArrowUpRight,
  FileText,
  Edit,
  Trash2,
  Eye,
  ExternalLink,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  Archive,
  ListChecks,
  RefreshCw,
  Link,
  MoreVertical,
  HelpCircle,
  Loader2,
  GripVertical,
  CheckCircle,
  Gauge,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useConnections } from '@/features/connections/api/useConnections'
import { useProjects } from '@/features/projects/api/useProjects'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import {
  Button,
  Input,
  Spinner,
  EmptyState,
  Alert,
  Modal,
  Select,
  SearchableSelect,
  MaskedValue,
  useMaskedValue,
} from '@/shared/components'
import { useDocumentTitle, useColumnResize, useColumnReorder } from '@/shared/hooks'
import { searchConsoleApi } from '@/shared/utils/searchConsoleApi'
import { getSearchConsoleSites, isUrlCoveredByConnection, matchSearchConsoleSiteForUrl } from '@/shared/utils/searchConsoleConnections'
import styles from './ArticlesPage.module.css'
import {
  useDeleteArticle,
  useArchiveArticle,
  useSendToQueue,
  useQueueDraftArticles,
  useRequestIndexing,
  useRequestIndexingBatch,
  useSyncArticleUrl,
  useSyncArticleUrlsBatch,
} from '../api/mutations'
import { useIndexingStatus } from '../api/queries'
import {
  useArticles,
  getStatusLabel,
  formatDate,
  getArticleTypeLabel,
  getArticleTypeDescription,
  type ArticleType,
  type ArticleStatus,
  type Article,
} from '../api/useArticles'
import { CreateArticleModal } from '../components/CreateArticleModal'
import { IndexingErrorToast } from '../components/IndexingErrorToast'
import { PageSpeedTestModal } from '../components/PageSpeedTestModal'

const statusFiltersArrow: Array<{ label: string; value: ArticleStatus | 'all' | 'queue' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Na Fila', value: 'queue' },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Escrevendo', value: 'writing' },
  { label: 'Publicado', value: 'published' },
  { label: 'Agendado', value: 'scheduled' },
  { label: 'Arquivado', value: 'archived' },
]

const statusFiltersBase: Array<{ label: string; value: ArticleStatus | 'all' | 'queue' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Na Fila', value: 'queue' },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Escrevendo', value: 'writing' },
  { label: 'Publicado', value: 'published' },
  { label: 'Arquivado', value: 'archived' },
]

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 por página' },
  { value: '25', label: '25 por página' },
  { value: '50', label: '50 por página' },
  { value: '100', label: '100 por página' },
]

export function ArticlesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Get article type from URL query param, default to 'arrow'
  const typeParam = searchParams.get('type') as ArticleType | null
  const articleType: ArticleType = typeParam === 'base' ? 'base' : 'arrow'

  useDocumentTitle(getArticleTypeLabel(articleType))

  const workspaceId = useWorkspaceId()

  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'all' | 'queue'>('all')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [articleToArchive, setArticleToArchive] = useState<Article | null>(null)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkArchiveModalOpen, setBulkArchiveModalOpen] = useState(false)
  const [bulkQueueModalOpen, setBulkQueueModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [articleToPreview, setArticleToPreview] = useState<Article | null>(null)
  const [indexingError, setIndexingError] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null)
  const [syncingArticleId, setSyncingArticleId] = useState<number | null>(null)
  const [checkingIndexingId, setCheckingIndexingId] = useState<number | null>(null)
  const [pageSpeedModalOpen, setPageSpeedModalOpen] = useState(false)
  const [articleForPageSpeed, setArticleForPageSpeed] = useState<Article | null>(null)

  const CONNECTION_MISMATCH_MESSAGE =
    'Esta conexão não tem permissão para o domínio desta URL. Selecione a conexão correta ou conecte o Search Console desse domínio.'

  const mapSearchConsoleError = (code?: string | null) => {
    switch (code) {
      case 'connection_expired':
        return 'Conexão expirada. Reconecte sua conta.'
      case 'property_not_verified':
        return CONNECTION_MISMATCH_MESSAGE
      case 'canonical_mismatch':
        return 'Canonical da URL aponta para outra página.'
      case 'cannot_be_indexed':
        return 'A URL não pode ser indexada pelo Google.'
      case 'quota_exceeded':
        return 'Quota diária esgotada para esta conexão.'
      case 'ineligible_url':
        return 'URL não elegível para Indexing API.'
      default:
        return null
    }
  }

  const getSearchConsoleErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'message' in error) {
      const code = String((error as { message?: string }).message || '')
      return mapSearchConsoleError(code) || fallback
    }
    if (error instanceof Error) {
      return mapSearchConsoleError(error.message) || fallback
    }
    return fallback
  }

  // Table ref for column resize
  const tableRef = useRef<HTMLTableElement>(null)

  // Column configuration for articles table
  const columnConfig = useMemo(
    () => [
      { key: 'checkbox', label: '', minWidth: 48, sortable: false, draggable: false },
      { key: 'title', label: 'Título', minWidth: 200, sortable: true, draggable: true },
      { key: 'project', label: 'Projeto', minWidth: 120, sortable: true, draggable: true },
      { key: 'status', label: 'Status', minWidth: 100, sortable: true, draggable: true },
      { key: 'indexing', label: 'Indexação', minWidth: 120, sortable: false, draggable: true },
      ...(articleType === 'base'
        ? [{ key: 'words', label: 'Palavras', minWidth: 80, sortable: true, draggable: true }]
        : []),
      { key: 'date', label: 'Data', minWidth: 100, sortable: true, draggable: true },
      { key: 'actions', label: 'Ações', minWidth: 60, sortable: false, draggable: false },
    ],
    [articleType]
  )

  const initialWidths = useMemo(
    () =>
      columnConfig.reduce(
        (acc, col) => ({ ...acc, [col.key]: col.minWidth }),
        {} as Record<string, number>
      ),
    [columnConfig]
  )

  const initialOrder = useMemo(() => columnConfig.map((col) => col.key), [columnConfig])

  const { columnWidths, handleMouseDown, handleDoubleClick } = useColumnResize(
    initialWidths,
    tableRef,
    columnConfig
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
  } = useColumnReorder(initialOrder)

  // Get column by key
  const getColumn = (key: string) => columnConfig.find((col) => col.key === key)

  // Search Console connections
  const { data: connections = [] } = useConnections({ platform: 'google', status: 'active' })
  const searchConsoleConnections = useMemo(
    () => connections.filter((c) => c.metadata?.type === 'search_console'),
    [connections]
  )
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Reset filters when article type changes
  useEffect(() => {
    setSearch('')
    setSelectedProject(undefined)
    setStatusFilter('all')
    setCurrentPage(1)
    setSelectedIds(new Set())
  }, [articleType])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId !== null) {
        const target = event.target as HTMLElement
        if (!target.closest(`.${styles.actionsDropdownContainer}`) && !target.closest(`.${styles.actionsDropdown}`)) {
          setOpenDropdownId(null)
          setDropdownPosition(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdownId])

  // Queries
  const { data: projects = [] } = useProjects()
  const {
    data: articles = [],
    isLoading,
    error,
  } = useArticles({
    type: articleType,
    search,
    projectId: selectedProject,
    status: statusFilter,
  })

  // Mutations
  const deleteMutation = useDeleteArticle(articleType)
  const archiveMutation = useArchiveArticle(articleType)
  const sendToQueueMutation = useSendToQueue(articleType)
  const queueDraftsMutation = useQueueDraftArticles(articleType)
  const requestIndexingMutation = useRequestIndexing()
  const requestIndexingBatchMutation = useRequestIndexingBatch()
  const syncArticleUrlMutation = useSyncArticleUrl()
  const syncArticleUrlsBatchMutation = useSyncArticleUrlsBatch()
  const { mask } = useMaskedValue()

  // Get status filters based on article type
  const statusFilters = articleType === 'arrow' ? statusFiltersArrow : statusFiltersBase

  // Pagination calculations
  const totalItems = articles.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedArticles = useMemo(() => {
    return articles.slice(startIndex, endIndex)
  }, [articles, startIndex, endIndex])

  const buildArticleUrl = (article: Article) => {
    if (article.url) return article.url
    if (!article.slug || !article.project?.domain) return null
    const domain = article.project.domain.startsWith('http')
      ? article.project.domain
      : `https://${article.project.domain}`
    return `${domain.replace(/\/$/, '')}/${article.slug}`
  }

  const paginatedUrls = useMemo(() => {
    return paginatedArticles
      .map((article) => buildArticleUrl(article))
      .filter((url): url is string => !!url)
  }, [paginatedArticles])

  const selectedConnection = useMemo(
    () => searchConsoleConnections.find((conn) => conn.id === selectedConnectionId) || null,
    [searchConsoleConnections, selectedConnectionId]
  )

  const connectionCoverage = useMemo(() => {
    if (!searchConsoleConnections.length) return []

    return searchConsoleConnections.map((connection) => {
      const sites = getSearchConsoleSites(connection)
      const matchCount = paginatedUrls.filter((url) => !!matchSearchConsoleSiteForUrl(sites, url)).length
      return { connection, matchCount }
    })
  }, [searchConsoleConnections, paginatedUrls])

  const selectedCoverage = useMemo(() => {
    return connectionCoverage.find((entry) => entry.connection.id === selectedConnectionId) || null
  }, [connectionCoverage, selectedConnectionId])

  const connectionHint = useMemo(() => {
    if (searchConsoleConnections.length === 0) {
      return 'Conecte o Google Search Console para habilitar verificação e solicitação de indexação.'
    }
    if (!paginatedUrls.length) {
      return 'Selecione a conexão do Search Console que possui o domínio das URLs.'
    }
    if (!selectedConnectionId) {
      return 'Selecione a conexão do Search Console que possui o domínio das URLs.'
    }
    if (!selectedCoverage) return undefined
    if (selectedCoverage.matchCount === 0) {
      return 'Esta conexão não cobre as URLs desta página. Selecione outra conexão.'
    }
    if (selectedCoverage.matchCount < paginatedUrls.length) {
      return `Cobertura parcial: ${selectedCoverage.matchCount} de ${paginatedUrls.length} URLs desta página.`
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedUrls.length, selectedConnectionId, selectedCoverage])

  const compatibleUrls = useMemo(() => {
    if (!selectedConnection) return []
    return paginatedUrls.filter((url) => isUrlCoveredByConnection(selectedConnection, url))
  }, [paginatedUrls, selectedConnection])

  useEffect(() => {
    if (selectedConnectionId || !searchConsoleConnections.length) return

    const bestMatch = connectionCoverage.find((entry) => entry.matchCount > 0)
    setSelectedConnectionId((bestMatch || connectionCoverage[0])?.connection.id || null)
  }, [connectionCoverage, searchConsoleConnections.length, selectedConnectionId])

  const {
    data: indexingStatus = {},
    refetch: refetchIndexingStatus,
  } = useIndexingStatus(compatibleUrls, selectedConnectionId || undefined)

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value)
    setCurrentPage(1)
  }

  const handleProjectChange = (value: number | undefined) => {
    setSelectedProject(value)
    setCurrentPage(1)
  }

  const handleStatusChange = (value: ArticleStatus | 'all' | 'queue') => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const handlePageSizeChange = (value: number) => {
    setPageSize(value)
    setCurrentPage(1)
  }

  // Selection helpers - now based on paginated articles
  const allSelectedOnPage = useMemo(() => {
    return paginatedArticles.length > 0 && paginatedArticles.every((a) => selectedIds.has(a.id))
  }, [paginatedArticles, selectedIds])

  const someSelectedOnPage = useMemo(() => {
    return paginatedArticles.some((a) => selectedIds.has(a.id)) && !allSelectedOnPage
  }, [paginatedArticles, selectedIds, allSelectedOnPage])

  // Count how many selected articles are drafts (for arrow articles)
  const selectedDraftIds = useMemo(() => {
    return articles.filter((a) => selectedIds.has(a.id) && a.status === 'draft').map((a) => a.id)
  }, [articles, selectedIds])

  const selectedArticles = useMemo(() => {
    return articles.filter((article) => selectedIds.has(article.id))
  }, [articles, selectedIds])

  const selectedUrls = useMemo(() => {
    return selectedArticles
      .map((article) => buildArticleUrl(article))
      .filter((url): url is string => !!url)
  }, [selectedArticles])

  const selectedCompatibleCount = useMemo(() => {
    if (!selectedConnection) return 0
    return selectedUrls.filter((url) => isUrlCoveredByConnection(selectedConnection, url)).length
  }, [selectedConnection, selectedUrls])

  const hasIncompatibleSelectedUrls =
    selectedUrls.length > 0 && selectedCompatibleCount < selectedUrls.length

  const toggleSelectAll = () => {
    const newSelected = new Set(selectedIds)
    if (allSelectedOnPage) {
      // Deselect all on current page
      paginatedArticles.forEach((a) => newSelected.delete(a.id))
    } else {
      // Select all on current page
      paginatedArticles.forEach((a) => newSelected.add(a.id))
    }
    setSelectedIds(newSelected)
  }

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const getStatusBadge = (status?: ArticleStatus | null) => {
    const baseClass = styles.badge
    let statusClass = styles.badgeQueue

    switch (status) {
      case 'draft':
        statusClass = styles.badgeDraft
        break
      case 'writing':
        statusClass = styles.badgeWriting
        break
      case 'publish':
        statusClass = styles.badgePublish
        break
      case 'published':
        statusClass = styles.badgePublished
        break
      case 'scheduled':
        statusClass = styles.badgeScheduled
        break
      case 'archived':
        statusClass = styles.badgeArchived
        break
      default:
        statusClass = styles.badgeQueue
    }

    return <span className={`${baseClass} ${statusClass}`}>{getStatusLabel(status)}</span>
  }

  const getIndexingBadge = (article: Article) => {
    const url = buildArticleUrl(article)
    const isSyncing = syncingArticleId === article.id
    const isChecking = checkingIndexingId === article.id

    // H1: Show loading state during sync
    if (isSyncing) {
      return (
        <span className={`${styles.indexBadge} ${styles.indexBadgeLoading}`}>
          <Loader2 size={12} className={styles.spinning} />
          Sincronizando...
        </span>
      )
    }

    // H1: Show loading state during indexing check
    if (isChecking) {
      return (
        <span className={`${styles.indexBadge} ${styles.indexBadgeLoading}`}>
          <Loader2 size={12} className={styles.spinning} />
          Verificando...
        </span>
      )
    }

    // No Search Console connection configured - H4: Make it clickable
    if (searchConsoleConnections.length === 0) {
      return (
        <button
          type="button"
          className={`${styles.indexBadge} ${styles.indexBadgeAction}`}
          onClick={() => navigate('/connections')}
          title="Clique para conectar o Search Console"
        >
          Conectar Search Console
        </button>
      )
    }

    // Connection exists but not selected (shouldn't happen with auto-select)
    if (!selectedConnectionId) {
      return (
        <span
          className={`${styles.indexBadge} ${styles.indexBadgeUnknown}`}
          title="Selecione a conexão do Search Console para este domínio"
        >
          Selecione a conexão
        </span>
      )
    }

    // No URL - either not published or URL not synced - H4: Make "Sincronizar URL" clickable
    if (!url) {
      if (article.wpPost_id) {
        return (
          <button
            type="button"
            className={`${styles.indexBadge} ${styles.indexBadgeAction}`}
            onClick={() => handleSyncSingleUrl(article)}
            title="Clique para buscar a URL do WordPress"
          >
            <Link size={12} />
            Sincronizar URL
          </button>
        )
      }
      return (
        <span
          className={`${styles.indexBadge} ${styles.indexBadgeUnknown}`}
          title="O artigo precisa ser publicado no WordPress primeiro"
        >
          Não publicado
        </span>
      )
    }

    if (selectedConnection && !isUrlCoveredByConnection(selectedConnection, url)) {
      return (
        <span
          className={`${styles.indexBadge} ${styles.indexBadgeWarning}`}
          title={CONNECTION_MISMATCH_MESSAGE}
        >
          Sem permissão
        </span>
      )
    }

    const status = indexingStatus[url]
    if (!status?.verdict) {
      return (
        <button
          type="button"
          className={`${styles.indexBadge} ${styles.indexBadgeAction}`}
          onClick={() => handleCheckIndexing(article)}
          title={`Clique para verificar indexação\nURL: ${url}`}
        >
          <RefreshCw size={12} />
          Verificar
        </button>
      )
    }

    // Google Search Console API returns these verdicts:
    // - "pass" or "PASS" = Indexed (Submitted and indexed)
    // - "neutral" or "NEUTRAL" = Not indexed but crawled
    // - "fail" or "FAIL" = Failed to index
    // - "error" = Error during inspection
    const verdict = status.verdict.toLowerCase()
    const coverageState = status.coverage_state?.toLowerCase() || ''

    // Indexed: verdict is "pass" or coverage indicates indexed
    if (verdict === 'pass' || verdict === 'indexed' || coverageState.includes('indexed')) {
      return (
        <span
          className={`${styles.indexBadge} ${styles.indexBadgeIndexed}`}
          title={`Indexado no Google\n${status.coverage_state || 'Submitted and indexed'}\n${url}`}
        >
          <CheckCircle size={12} />
          Indexado
        </span>
      )
    }

    // Not indexed: verdict is "neutral" or "fail", or explicitly not indexed
    if (verdict === 'neutral' || verdict === 'fail' || verdict === 'not_indexed' ||
        coverageState.includes('not indexed') || coverageState.includes('crawled')) {
      return (
        <button
          type="button"
          className={`${styles.indexBadge} ${styles.indexBadgeWarningAction}`}
          onClick={() => handleRequestIndexing(article)}
          title={`Clique para solicitar indexação\n${status.coverage_state || 'Não indexado'}\n${url}`}
        >
          <ArrowUpRight size={12} />
          Não indexado
        </button>
      )
    }

    // Error state
    if (verdict === 'error') {
      return (
        <span
          className={`${styles.indexBadge} ${styles.indexBadgeError}`}
          title={`Erro: ${status.last_error || 'Falha ao verificar'}\nClique no menu de ações para tentar novamente`}
        >
          Erro
        </span>
      )
    }

    // Unknown/other states
    return (
      <span
        className={`${styles.indexBadge} ${styles.indexBadgeUnknown}`}
        title={`Status: ${status.verdict}\n${status.coverage_state || ''}`}
      >
        Desconhecido
      </span>
    )
  }

  // H1: Handler for syncing single article URL with loading state
  const handleSyncSingleUrl = async (article: Article) => {
    setSyncingArticleId(article.id)
    try {
      await syncArticleUrlMutation.mutateAsync(article.id)
    } catch {
      setIndexingError('Não foi possível sincronizar a URL. Verifique se o artigo está publicado no WordPress.')
    } finally {
      setSyncingArticleId(null)
    }
  }

  // H1: Handler for checking indexing with loading state
  const handleCheckIndexing = async (article: Article) => {
    if (!selectedConnectionId || !workspaceId) return

    const url = buildArticleUrl(article)
    if (!url) return
    if (!selectedConnection || !isUrlCoveredByConnection(selectedConnection, url)) {
      setIndexingError(CONNECTION_MISMATCH_MESSAGE)
      return
    }

    setCheckingIndexingId(article.id)
    try {
      await searchConsoleApi.inspectUrl(
        { url, connectionId: selectedConnectionId, forceRefresh: true },
        workspaceId
      )
      await refetchIndexingStatus()
    } catch (error) {
      setIndexingError(
        getSearchConsoleErrorMessage(
          error,
          'Não foi possível verificar a indexação. Tente novamente em alguns instantes.'
        )
      )
    } finally {
      setCheckingIndexingId(null)
    }
  }

  const getProjectInfo = (
    article: Article
  ): { name: string; domain?: string; isOffline: boolean } => {
    const projectData = article.project
    if (!projectData) return { name: 'Sem projeto', isOffline: false }

    const isOffline = projectData.status === false

    return { name: projectData.name || 'Sem projeto', domain: projectData.domain, isOffline }
  }

  // Helper to strip HTML tags from content
  const stripHtml = (html?: string): string => {
    if (!html) return ''
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Helper to count words in text
  const countWords = (text?: string): number => {
    if (!text) return 0
    const plainText = stripHtml(text)
    const words = plainText.split(/\s+/).filter((word) => word.length > 0)
    return words.length
  }

  // Helper to get content preview (first N characters without HTML)
  const getContentPreview = (content?: string, maxLength = 500): string => {
    if (!content) return 'Sem conteúdo'
    const plainText = stripHtml(content)
    if (plainText.length <= maxLength) return plainText
    return `${plainText.substring(0, maxLength)  }...`
  }

  const handlePreview = (article: Article) => {
    setArticleToPreview(article)
    setPreviewModalOpen(true)
  }

  const handleEditInWordPress = (article: Article) => {
    const projectInfo = getProjectInfo(article)
    if (projectInfo.domain && article.wpPost_id) {
      const domain = projectInfo.domain.replace(/\/$/, '')
      const url = `${domain}/wp-admin/post.php?post=${article.wpPost_id}&action=edit`
      window.open(url, '_blank')
    }
  }

  const handleEdit = (article: Article) => {
    navigate(`/articles/${article.id}`)
  }

  const handleRefreshIndexing = async (article: Article) => {
    if (!selectedConnectionId || !workspaceId) {
      setIndexingError('Conecte o Search Console para usar indexação.')
      return
    }

    let url = buildArticleUrl(article)

    // If no URL, try to sync from WordPress first
    if (!url && article.wpPost_id) {
      try {
        const syncResult = await syncArticleUrlMutation.mutateAsync(article.id)
        if (syncResult.success && syncResult.url) {
          url = syncResult.url
        }
      } catch {
        // Continue with error message below
      }
    }

    if (!url) {
      setIndexingError('URL do artigo não disponível. Verifique se o artigo foi publicado no WordPress.')
      return
    }

    try {
      if (!selectedConnection || !isUrlCoveredByConnection(selectedConnection, url)) {
        setIndexingError(CONNECTION_MISMATCH_MESSAGE)
        return
      }
      await searchConsoleApi.inspectUrl(
        { url, connectionId: selectedConnectionId, forceRefresh: true },
        workspaceId
      )
      await refetchIndexingStatus()
    } catch (error) {
      setIndexingError(
        getSearchConsoleErrorMessage(error, 'Falha ao atualizar status de indexação.')
      )
    }
  }

  const handleRequestIndexing = async (article: Article) => {
    if (!selectedConnectionId) {
      setIndexingError('Conecte o Search Console para usar indexação.')
      return
    }

    let url = buildArticleUrl(article)

    // If no URL, try to sync from WordPress first
    if (!url && article.wpPost_id) {
      try {
        const syncResult = await syncArticleUrlMutation.mutateAsync(article.id)
        if (syncResult.success && syncResult.url) {
          url = syncResult.url
        }
      } catch {
        // Continue with error message below
      }
    }

    if (!url) {
      setIndexingError('URL do artigo não disponível. Verifique se o artigo foi publicado no WordPress.')
      return
    }

    try {
      if (!selectedConnection || !isUrlCoveredByConnection(selectedConnection, url)) {
        setIndexingError(CONNECTION_MISMATCH_MESSAGE)
        return
      }
      const result = await requestIndexingMutation.mutateAsync({
        url,
        articleId: article.id,
        connectionId: selectedConnectionId,
      })
      if (result.status === 'blocked') {
        setIndexingError(result.message || 'Solicitação bloqueada.')
      }
    } catch (error) {
      setIndexingError(getSearchConsoleErrorMessage(error, 'Falha ao solicitar indexação.'))
    }
  }

  // Sync URLs for selected articles that have wpPost_id but no URL
  const handleSyncUrls = async () => {
    const articlesToSync = articles
      .filter((a) => selectedIds.has(a.id) && a.wpPost_id && !buildArticleUrl(a))
      .map((a) => a.id)

    if (articlesToSync.length === 0) {
      setIndexingError('Nenhum artigo selecionado precisa sincronizar URL.')
      return
    }

    try {
      await syncArticleUrlsBatchMutation.mutateAsync(articlesToSync)
      clearSelection()
    } catch {
      setIndexingError('Falha ao sincronizar URLs.')
    }
  }

  const handleBatchIndexing = async () => {
    if (!selectedConnectionId) {
      setIndexingError('Conecte o Search Console para usar indexação.')
      return
    }
    if (!selectedConnection) {
      setIndexingError('Conecte o Search Console para usar indexação.')
      return
    }

    // First, sync URLs for articles that need it
    const articlesToSync = articles
      .filter((a) => selectedIds.has(a.id) && a.wpPost_id && !buildArticleUrl(a))
      .map((a) => a.id)

    if (articlesToSync.length > 0) {
      try {
        await syncArticleUrlsBatchMutation.mutateAsync(articlesToSync)
        // Wait a bit for cache to update before continuing
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch {
        // Continue - some articles might not sync but others might work
      }
    }

    const items = articles
      .filter((a) => selectedIds.has(a.id))
      .map((article) => ({ article, url: buildArticleUrl(article) }))
      .filter((item) => !!item.url)
      .map((item) => ({ url: item.url!, articleId: item.article.id }))

    const compatibleItems = items.filter((item) =>
      isUrlCoveredByConnection(selectedConnection, item.url)
    )

    if (items.length === 0) {
      setIndexingError('Nenhum artigo com URL válida selecionado.')
      return
    }

    if (compatibleItems.length === 0) {
      setIndexingError(CONNECTION_MISMATCH_MESSAGE)
      return
    }

    try {
    if (compatibleItems.length < items.length) {
      setIndexingError('Algumas URLs não pertencem a esta conexão e foram ignoradas.')
    }
      await requestIndexingBatchMutation.mutateAsync({
        connectionId: selectedConnectionId,
        items: compatibleItems,
      })
      clearSelection()
    } catch (error) {
      setIndexingError(getSearchConsoleErrorMessage(error, 'Falha ao solicitar indexação em massa.'))
    }
  }

  // Delete handlers (for arrow articles)
  const handleDelete = async () => {
    if (!articleToDelete) return
    try {
      await deleteMutation.mutateAsync({ id: articleToDelete.id, title: articleToDelete.title })
      setDeleteModalOpen(false)
      setArticleToDelete(null)
    } catch (err) {
      console.error('Error deleting article:', err)
    }
  }

  const handleBulkDelete = async () => {
    let successCount = 0
    let errorCount = 0

    for (const id of selectedIds) {
      try {
        const article = articles.find((a) => a.id === id)
        await deleteMutation.mutateAsync({
          id,
          title: article?.title || 'Artigo',
        })
        successCount++
      } catch (err) {
        console.error(`Error deleting article ${id}:`, err)
        errorCount++
      }
    }

    setBulkDeleteModalOpen(false)
    clearSelection()

    if (errorCount > 0) {
      console.warn(`Bulk delete completed: ${successCount} deleted, ${errorCount} failed`)
    }
  }

  // Archive handlers (for base articles)
  const handleArchive = async () => {
    if (!articleToArchive) return
    try {
      await archiveMutation.mutateAsync(articleToArchive.id)
      setArchiveModalOpen(false)
      setArticleToArchive(null)
    } catch (err) {
      console.error('Error archiving article:', err)
    }
  }

  const handleBulkArchive = async () => {
    try {
      for (const id of selectedIds) {
        await archiveMutation.mutateAsync(id)
      }
      setBulkArchiveModalOpen(false)
      clearSelection()
    } catch (err) {
      console.error('Error archiving articles:', err)
    }
  }

  // Queue handlers
  const handleBulkQueue = async () => {
    try {
      if (articleType === 'arrow') {
        await queueDraftsMutation.mutateAsync(selectedDraftIds)
      } else {
        for (const id of selectedIds) {
          await sendToQueueMutation.mutateAsync(id)
        }
      }
      setBulkQueueModalOpen(false)
      clearSelection()
    } catch (err) {
      console.error('Error queueing articles:', err)
    }
  }

  const openDeleteModal = (article: Article) => {
    setArticleToDelete(article)
    setDeleteModalOpen(true)
  }

  const openArchiveModal = (article: Article) => {
    setArticleToArchive(article)
    setArchiveModalOpen(true)
  }

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }))
  const connectionOptions = [
    { value: '', label: 'Selecionar conexão do Search Console' },
    ...connectionCoverage
      .slice()
      .sort((a, b) => b.matchCount - a.matchCount)
      .map(({ connection, matchCount }) => ({
        value: connection.id,
        label:
          `${connection.connection_name || `Search Console ${connection.id.slice(0, 6)}`}${ 
          paginatedUrls.length > 0 && matchCount === 0 ? ' — sem cobertura nesta página' : ''}`,
      })),
  ]

  // Pagination navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const getPageNumbers = () => {
    const pages: Array<number | 'ellipsis'> = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('ellipsis')
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  // Get icon based on article type
  const PageIcon = articleType === 'arrow' ? ArrowUpRight : FileText

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <PageIcon size={24} />
          </div>
          <div>
            <h1 className={styles.title}>{getArticleTypeLabel(articleType)}</h1>
            <p className={styles.subtitle}>{getArticleTypeDescription(articleType)}</p>
          </div>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setCreateModalOpen(true)}
        >
          Novo {getArticleTypeLabel(articleType)}
        </Button>
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar artigos: {error.message}
        </Alert>
      )}

      {indexingError && (
        <div className={styles.alert}>
          <IndexingErrorToast message={indexingError} onClose={() => setIndexingError(null)} />
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <Input
            placeholder="Buscar artigos..."
            leftIcon={<Search size={18} />}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={styles.search}
            size="md"
          />
          <div className={styles.projectSelect}>
            <SearchableSelect
              options={projectOptions}
              value={String(selectedProject || '')}
              onChange={(value) => handleProjectChange(value ? Number(value) : undefined)}
              placeholder="Todos os projetos"
              searchPlaceholder="Buscar projeto..."
              emptyMessage="Nenhum projeto encontrado"
              fullWidth
              size="md"
            />
          </div>
          <div className={styles.connectionSelect}>
            <Select
              options={connectionOptions}
              value={selectedConnectionId || ''}
              onValueChange={(value) => {
                setSelectedConnectionId(value || null)
                setCurrentPage(1)
              }}
              placeholder="Conexão do Search Console"
              hint={connectionHint}
              fullWidth
              size="md"
            />
          </div>
        </div>
        <div className={styles.filters}>
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              className={`${styles.filterBtn} ${statusFilter === filter.value ? styles.active : ''}`}
              onClick={() => handleStatusChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className={styles.bulkActions}>
          <span className={styles.selectedCount}>
            {selectedIds.size} {selectedIds.size === 1 ? 'artigo selecionado' : 'artigos selecionados'}
            {articleType === 'arrow' &&
              selectedDraftIds.length > 0 &&
              selectedDraftIds.length !== selectedIds.size && (
                <span className={styles.draftCount}>
                  {' '}
                  ({selectedDraftIds.length} rascunho{selectedDraftIds.length !== 1 ? 's' : ''})
                </span>
              )}
          </span>
          <div className={styles.bulkButtons}>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Limpar seleção
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Link size={16} />}
              onClick={handleSyncUrls}
              disabled={syncArticleUrlsBatchMutation.isPending}
            >
              {syncArticleUrlsBatchMutation.isPending ? 'Sincronizando...' : 'Sincronizar URLs'}
            </Button>
            {selectedConnectionId && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowUpRight size={16} />}
                onClick={handleBatchIndexing}
                disabled={selectedUrls.length > 0 && selectedCompatibleCount === 0}
                title={hasIncompatibleSelectedUrls ? CONNECTION_MISMATCH_MESSAGE : undefined}
              >
                Solicitar indexação
              </Button>
            )}
            {articleType === 'arrow' && selectedDraftIds.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<ArrowUpRight size={16} />}
                onClick={() => setBulkQueueModalOpen(true)}
              >
                Criar {selectedDraftIds.length} artigo{selectedDraftIds.length !== 1 ? 's' : ''}
              </Button>
            )}
            {articleType === 'base' && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ListChecks size={16} />}
                onClick={() => setBulkQueueModalOpen(true)}
              >
                Enviar para Fila
              </Button>
            )}
            {articleType === 'arrow' ? (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={16} />}
                onClick={() => setBulkDeleteModalOpen(true)}
              >
                Excluir selecionados
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Archive size={16} />}
                onClick={() => setBulkArchiveModalOpen(true)}
              >
                Arquivar selecionados
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<PageIcon size={48} />}
          title={`Nenhum ${articleType === 'arrow' ? 'artigo flecha' : 'artigo de base'} encontrado`}
          description={
            search || selectedProject || statusFilter !== 'all'
              ? 'Tente ajustar os filtros'
              : `Crie seu primeiro ${articleType === 'arrow' ? 'artigo flecha' : 'artigo de base'}`
          }
          action={
            !search &&
            !selectedProject &&
            statusFilter === 'all' && (
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={() => setCreateModalOpen(true)}
              >
                Criar {getArticleTypeLabel(articleType)}
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table} ref={tableRef}>
              <thead>
                <tr>
                  {columnOrder.map((key) => {
                    const col = getColumn(key)
                    if (!col) return null

                    // Skip words column if not base article
                    if (key === 'words' && articleType !== 'base') return null

                    const isDragging = draggedColumn === key
                    const isDragOver = dragOverColumn === key

                    const headerClasses = [
                      col.draggable ? styles.draggableHeader : '',
                      isDragging ? styles.dragging : '',
                      isDragOver ? styles.dragOver : '',
                      key === 'checkbox' ? styles.checkboxCell : '',
                      key === 'title' ? styles.titleCell : '',
                      key === 'project' ? styles.projectCell : '',
                      key === 'actions' ? styles.actionsCell : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <th
                        key={key}
                        data-column-key={key}
                        className={headerClasses}
                        style={{ width: columnWidths[key], minWidth: col.minWidth }}
                        draggable={col.draggable}
                        onDragStart={col.draggable ? (e) => handleDragStart(key, e) : undefined}
                        onDragEnd={col.draggable ? handleDragEnd : undefined}
                        onDragOver={col.draggable ? (e) => handleDragOver(key, e) : undefined}
                        onDragLeave={col.draggable ? handleDragLeave : undefined}
                        onDrop={col.draggable ? (e) => handleDrop(key, e) : undefined}
                      >
                        {key === 'checkbox' ? (
                          <button
                            className={styles.checkboxBtn}
                            onClick={toggleSelectAll}
                            title={
                              allSelectedOnPage
                                ? 'Desmarcar todos da página'
                                : 'Selecionar todos da página'
                            }
                          >
                            {allSelectedOnPage ? (
                              <CheckSquare size={24} />
                            ) : someSelectedOnPage ? (
                              <MinusSquare size={24} />
                            ) : (
                              <Square size={24} />
                            )}
                          </button>
                        ) : key === 'indexing' ? (
                          <div className={styles.headerContent}>
                            {col.draggable && <GripVertical size={12} className={styles.dragHandle} />}
                            <span>{col.label}</span>
                            <span
                              className={styles.helpIcon}
                              title="Verifica se o artigo está indexado no Google.&#10;&#10;• Conectar Search Console: conecte o domínio no Search Console&#10;• Sincronizar URL: busca a URL no WordPress&#10;• Verificar: consulta o status de indexação&#10;• Não indexado: clique para solicitar indexação&#10;• Indexado: o artigo já aparece no Google"
                            >
                              <HelpCircle size={14} />
                            </span>
                          </div>
                        ) : key === 'actions' ? (
                          col.label
                        ) : (
                          <div className={styles.headerContent}>
                            {col.draggable && <GripVertical size={12} className={styles.dragHandle} />}
                            <span>{col.label}</span>
                          </div>
                        )}
                        {key !== 'checkbox' && key !== 'actions' && (
                          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                          <div
                            className={styles.resizeHandle}
                            onMouseDown={(e) => handleMouseDown(key, e)}
                            onDoubleClick={(e) => handleDoubleClick(key, e)}
                          />
                        )}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedArticles.map((article) => {
                  const articleUrl = buildArticleUrl(article)
                  const hasConnectionAccess =
                    !!articleUrl && !!selectedConnection && isUrlCoveredByConnection(selectedConnection, articleUrl)

                  return (
                    <tr
                      key={article.id}
                      className={selectedIds.has(article.id) ? styles.selectedRow : ''}
                    >
                    <td className={styles.checkboxCell}>
                      <button
                        className={styles.checkboxBtn}
                        onClick={() => toggleSelect(article.id)}
                      >
                        {selectedIds.has(article.id) ? (
                          <CheckSquare size={24} />
                        ) : (
                          <Square size={24} />
                        )}
                      </button>
                    </td>
                    <td className={styles.titleCell}>
                      <div className={styles.titleContent}>
                        <span className={styles.articleTitle}>
                          <MaskedValue
                            value={article.title || 'Sem título'}
                            type="partial"
                            visibleStart={5}
                          />
                        </span>
                        {article.keyword_used && (
                          <span className={styles.keyword}>
                            <MaskedValue
                              value={article.keyword_used}
                              type="partial"
                              visibleStart={3}
                            />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles.projectCell}>
                      {(() => {
                        const projectInfo = getProjectInfo(article)
                        return (
                          <span
                            className={`${styles.project} ${projectInfo.isOffline ? styles.projectOffline : ''}`}
                          >
                            <MaskedValue
                              value={projectInfo.name}
                              type="partial"
                              visibleStart={3}
                            />
                            {projectInfo.isOffline && (
                              <span title="Projeto offline">
                                <WifiOff size={12} className={styles.offlineIcon} />
                              </span>
                            )}
                          </span>
                        )
                      })()}
                    </td>
                    <td>{getStatusBadge(article.status)}</td>
                    <td className={styles.indexingCell}>
                      {getIndexingBadge(article)}
                    </td>
                    {articleType === 'base' && (
                      <td className={styles.wordsCell}>{article.words ?? 0}</td>
                    )}
                    <td className={styles.dateCell}>{formatDate(article.created_at)}</td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionsDropdownContainer}>
                        <button
                          className={styles.actionsMenuBtn}
                          onClick={(e) => {
                            if (openDropdownId === article.id) {
                              setOpenDropdownId(null)
                              setDropdownPosition(null)
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setDropdownPosition({
                                top: rect.bottom + 4,
                                left: rect.right - 200,
                              })
                              setOpenDropdownId(article.id)
                            }
                          }}
                          title="Ações"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openDropdownId === article.id && dropdownPosition && (
                          <div
                            className={styles.actionsDropdown}
                            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                          >
                            <button
                              className={styles.actionsDropdownItem}
                              onClick={() => {
                                handlePreview(article)
                                setOpenDropdownId(null)
                              }}
                            >
                              <Eye size={16} />
                              Preview
                            </button>
                            {articleType === 'arrow' && (
                              <button
                                className={styles.actionsDropdownItem}
                                onClick={() => {
                                  handleEdit(article)
                                  setOpenDropdownId(null)
                                }}
                              >
                                <Edit size={16} />
                                Editar
                              </button>
                            )}
                            {article.wpPost_id && (
                              <button
                                className={styles.actionsDropdownItem}
                                onClick={() => {
                                  handleEditInWordPress(article)
                                  setOpenDropdownId(null)
                                }}
                                disabled={!getProjectInfo(article).domain}
                              >
                                <ExternalLink size={16} />
                                Editar no WordPress
                              </button>
                            )}
                            <div className={styles.actionsDropdownDivider} />
                            {article.wpPost_id && !buildArticleUrl(article) && (
                              <button
                                className={styles.actionsDropdownItem}
                                onClick={() => {
                                  syncArticleUrlMutation.mutate(article.id)
                                  setOpenDropdownId(null)
                                }}
                                disabled={syncArticleUrlMutation.isPending}
                              >
                                <RefreshCw size={16} className={syncArticleUrlMutation.isPending ? styles.spinning : ''} />
                                Sincronizar URL
                              </button>
                            )}
                            <button
                              className={styles.actionsDropdownItem}
                              onClick={() => {
                                handleRefreshIndexing(article)
                                setOpenDropdownId(null)
                              }}
                              disabled={
                                !selectedConnectionId ||
                                syncArticleUrlMutation.isPending ||
                                (!!articleUrl && !hasConnectionAccess)
                              }
                              title={
                                !!articleUrl && !hasConnectionAccess ? CONNECTION_MISMATCH_MESSAGE : undefined
                              }
                            >
                              <ArrowUpRight size={16} />
                              Verificar indexação
                            </button>
                            <button
                              className={styles.actionsDropdownItem}
                              onClick={() => {
                                handleRequestIndexing(article)
                                setOpenDropdownId(null)
                              }}
                              disabled={
                                !selectedConnectionId ||
                                syncArticleUrlMutation.isPending ||
                                (!!articleUrl && !hasConnectionAccess)
                              }
                              title={
                                !!articleUrl && !hasConnectionAccess ? CONNECTION_MISMATCH_MESSAGE : undefined
                              }
                            >
                              <ListChecks size={16} />
                              Solicitar indexação
                            </button>
                            <button
                              className={styles.actionsDropdownItem}
                              onClick={() => {
                                setArticleForPageSpeed(article)
                                setPageSpeedModalOpen(true)
                                setOpenDropdownId(null)
                              }}
                              disabled={!articleUrl || !article.project?.domain}
                              title={
                                !articleUrl
                                  ? 'O artigo precisa ter uma URL publicada'
                                  : !article.project?.domain
                                    ? 'O projeto precisa ter um domínio configurado'
                                    : 'Testar velocidade da página com PageSpeed Insights'
                              }
                            >
                              <Gauge size={16} />
                              Testar velocidade
                            </button>
                            <div className={styles.actionsDropdownDivider} />
                            {articleType === 'arrow' ? (
                              <button
                                className={`${styles.actionsDropdownItem} ${styles.danger}`}
                                onClick={() => {
                                  openDeleteModal(article)
                                  setOpenDropdownId(null)
                                }}
                              >
                                <Trash2 size={16} />
                                Excluir
                              </button>
                            ) : (
                              <button
                                className={styles.actionsDropdownItem}
                                onClick={() => {
                                  openArchiveModal(article)
                                  setOpenDropdownId(null)
                                }}
                              >
                                <Archive size={16} />
                                Arquivar
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              <span>
                Mostrando {startIndex + 1}-{endIndex} de {totalItems} artigos
              </span>
              <Select
                value={String(pageSize)}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                options={PAGE_SIZE_OPTIONS}
                className={styles.pageSizeSelect}
              />
            </div>

            <div className={styles.paginationControls}>
              <button
                className={styles.paginationBtn}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                title="Página anterior"
              >
                <ChevronLeft size={18} />
              </button>

              {getPageNumbers().map((page, index) =>
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${index}`} className={styles.paginationEllipsis}>
                    ...
                  </span>
                ) : (
                  <button
                    key={page}
                    className={`${styles.paginationBtn} ${currentPage === page ? styles.active : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                className={styles.paginationBtn}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Próxima página"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal (Arrow articles) */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setArticleToDelete(null)
        }}
        title="Excluir Artigo Flecha"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja excluir o artigo{' '}
            <strong>
              <MaskedValue
                value={articleToDelete?.title || 'Sem título'}
                type="partial"
                visibleStart={5}
              />
            </strong>
            ?
          </p>
          <p className={styles.deleteWarning}>Esta ação não pode ser desfeita.</p>
          <div className={styles.deleteActions}>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false)
                setArticleToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteMutation.isPending}>
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Archive Confirmation Modal (Base articles) */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={() => {
          setArchiveModalOpen(false)
          setArticleToArchive(null)
        }}
        title="Arquivar Artigo"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja arquivar o artigo{' '}
            <strong>
              <MaskedValue
                value={articleToArchive?.title || 'Sem título'}
                type="partial"
                visibleStart={5}
              />
            </strong>
            ?
          </p>
          <p className={styles.deleteWarning}>O artigo será movido para os arquivados.</p>
          <div className={styles.deleteActions}>
            <Button
              variant="outline"
              onClick={() => {
                setArchiveModalOpen(false)
                setArticleToArchive(null)
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleArchive} isLoading={archiveMutation.isPending}>
              Arquivar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        title="Excluir Artigos Selecionados"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja excluir{' '}
            <strong>
              {selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}
            </strong>
            ?
          </p>
          <p className={styles.deleteWarning}>Esta ação não pode ser desfeita.</p>
          <div className={styles.deleteActions}>
            <Button variant="outline" onClick={() => setBulkDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleBulkDelete} isLoading={deleteMutation.isPending}>
              Excluir {selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Archive Confirmation Modal */}
      <Modal
        isOpen={bulkArchiveModalOpen}
        onClose={() => setBulkArchiveModalOpen(false)}
        title="Arquivar Artigos Selecionados"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja arquivar{' '}
            <strong>
              {selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}
            </strong>
            ?
          </p>
          <p className={styles.deleteWarning}>Os artigos serão movidos para os arquivados.</p>
          <div className={styles.deleteActions}>
            <Button variant="outline" onClick={() => setBulkArchiveModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkArchive}
              isLoading={archiveMutation.isPending}
            >
              Arquivar {selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Queue Confirmation Modal */}
      <Modal
        isOpen={bulkQueueModalOpen}
        onClose={() => setBulkQueueModalOpen(false)}
        title={articleType === 'arrow' ? 'Enviar Artigos para a Fila' : 'Enviar para Fila'}
        size="sm"
      >
        <div className={styles.deleteModal}>
          {articleType === 'arrow' ? (
            <>
              <p>
                Deseja enviar{' '}
                <strong>
                  {selectedDraftIds.length}{' '}
                  {selectedDraftIds.length === 1 ? 'artigo' : 'artigos'}
                </strong>{' '}
                para a fila de publicação?
              </p>
              <p className={styles.queueInfo}>
                Os artigos selecionados com status "Rascunho" serão movidos para a fila e
                processados automaticamente.
              </p>
            </>
          ) : (
            <>
              <p>
                Tem certeza que deseja enviar{' '}
                <strong>
                  {selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}
                </strong>{' '}
                para a fila?
              </p>
              <p className={styles.queueInfo}>Os artigos serão processados pela automação.</p>
            </>
          )}
          <div className={styles.deleteActions}>
            <Button variant="outline" onClick={() => setBulkQueueModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkQueue}
              isLoading={articleType === 'arrow' ? queueDraftsMutation.isPending : sendToQueueMutation.isPending}
              leftIcon={articleType === 'arrow' ? <ArrowUpRight size={16} /> : undefined}
            >
              {articleType === 'arrow'
                ? `Criar ${selectedDraftIds.length} ${selectedDraftIds.length === 1 ? 'artigo' : 'artigos'}`
                : `Enviar ${selectedIds.size} ${selectedIds.size === 1 ? 'artigo' : 'artigos'}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Article Modal */}
      <CreateArticleModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        articleType={articleType}
      />

      {/* Preview Modal */}
      <Modal
        isOpen={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false)
          setArticleToPreview(null)
        }}
        title="Preview do Artigo"
        size="lg"
      >
        {articleToPreview && (
          <div className={styles.previewModal}>
            <div className={styles.previewHeader}>
              <h2 className={styles.previewTitle}>
                <MaskedValue
                  value={articleToPreview.title || 'Sem título'}
                  type="partial"
                  visibleStart={5}
                />
              </h2>
              {getStatusBadge(articleToPreview.status)}
            </div>

            <div className={styles.previewStats}>
              <div className={styles.previewStatItem}>
                <span className={styles.previewStatValue}>
                  {countWords(articleToPreview.content)}
                </span>
                <span className={styles.previewStatLabel}>palavras</span>
              </div>
              <div className={styles.previewStatItem}>
                <span className={styles.previewStatValue}>
                  {stripHtml(articleToPreview.content).length}
                </span>
                <span className={styles.previewStatLabel}>caracteres</span>
              </div>
              <div className={styles.previewStatItem}>
                <span className={styles.previewStatValue}>
                  {Math.max(1, Math.ceil(countWords(articleToPreview.content) / 200))}
                </span>
                <span className={styles.previewStatLabel}>min leitura</span>
              </div>
            </div>

            <div className={styles.previewInfo}>
              <div className={styles.previewInfoRow}>
                <span className={styles.previewInfoLabel}>Projeto:</span>
                <MaskedValue
                  value={getProjectInfo(articleToPreview).name}
                  type="partial"
                  visibleStart={3}
                />
              </div>
              {articleToPreview.keyword_used && (
                <div className={styles.previewInfoRow}>
                  <span className={styles.previewInfoLabel}>Palavra-chave:</span>
                  <MaskedValue
                    value={articleToPreview.keyword_used}
                    type="partial"
                    visibleStart={3}
                  />
                </div>
              )}
              <div className={styles.previewInfoRow}>
                <span className={styles.previewInfoLabel}>Criado em:</span>
                <span>{formatDate(articleToPreview.created_at)}</span>
              </div>
            </div>

            <div className={styles.previewContentSection}>
              <h4>Preview do conteúdo</h4>
              <p className={styles.previewText}>
                {mask(getContentPreview(articleToPreview.content, 400), 'partial', 20)}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* PageSpeed Test Modal */}
      {articleForPageSpeed && (
        <PageSpeedTestModal
          isOpen={pageSpeedModalOpen}
          onClose={() => {
            setPageSpeedModalOpen(false)
            setArticleForPageSpeed(null)
          }}
          articleTitle={articleForPageSpeed.title || 'Sem título'}
          articleUrl={buildArticleUrl(articleForPageSpeed) || ''}
          projectId={articleForPageSpeed.project_id ?? 0}
        />
      )}
    </div>
  )
}
