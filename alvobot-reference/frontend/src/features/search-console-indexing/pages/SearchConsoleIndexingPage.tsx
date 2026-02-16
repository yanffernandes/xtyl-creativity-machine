import { useMemo, useState, useEffect, useRef } from 'react'
import { Search, Settings } from 'lucide-react'
import { useConnections } from '@/features/connections/api/useConnections'
import { useProjects } from '@/features/projects/api/useProjects'
import { Button, Input, PageHeader, Select, showToast } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { getSearchConsoleSites, isUrlCoveredByConnection, matchSearchConsoleSiteForUrl } from '@/shared/utils/searchConsoleConnections'
import { useIndexBatch, useIndexingQuota, useIndexingStats, useInspectBatch, useSitemaps, useUrls } from '../api'
import { BulkActionsBar, IndexingSummaryCards, IndexingTable, QuotaIndicator, SitemapManager } from '../components'
import styles from './SearchConsoleIndexingPage.module.css'
import { useUrlSelection } from '../hooks/useUrlSelection'
import { mapVerdictToStatus } from '../utils/statusMapping'

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'indexed', label: 'Indexadas' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'not_indexed', label: 'Não indexadas' },
  { value: 'error', label: 'Erros' },
  { value: 'not_checked', label: 'Não verificadas' },
]

export function SearchConsoleIndexingPage() {
  useDocumentTitle('Monitoramento de Indexação')

  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedConnection, setSelectedConnection] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sitemapFilter, setSitemapFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isSitemapModalOpen, setIsSitemapModalOpen] = useState(false)

  const { data: projects = [] } = useProjects()
  const { data: connections = [] } = useConnections()

  const searchConsoleConnections = useMemo(() => {
    return (connections || []).filter(
      (conn) =>
        conn.plataform_name?.toLowerCase() === 'google' &&
        (conn.metadata as { type?: string } | undefined)?.type === 'search_console' &&
        conn.is_active
    )
  }, [connections])

  const { data: sitemaps = [] } = useSitemaps(selectedProject || null)

  useEffect(() => {
    if (!selectedConnection && searchConsoleConnections.length === 1) {
      setSelectedConnection(searchConsoleConnections[0].id)
    }
  }, [selectedConnection, searchConsoleConnections])

  useEffect(() => {
    if (!selectedProject && projects.length === 1) {
      setSelectedProject(String(projects[0].id))
    }
  }, [selectedProject, projects])

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useIndexingStats({
    projectId: selectedProject || undefined,
    connectionId: selectedConnection || undefined,
  })

  const { data: urlsResult, isLoading: urlsLoading, refetch: refetchUrls } = useUrls({
    projectId: selectedProject || undefined,
    connectionId: selectedConnection || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    sitemapId: sitemapFilter || undefined,
    search: search || undefined,
    page,
    limit: 50,
  })

  const urls = useMemo(() => urlsResult?.urls || [], [urlsResult?.urls])
  const total = urlsResult?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / (urlsResult?.limit || 50)))

  const { data: quota } = useIndexingQuota(selectedConnection || null)

  const inspectMutation = useInspectBatch()
  const indexMutation = useIndexBatch()

  const { selectedIds, toggleSelection, selectAll, clearSelection } = useUrlSelection()
  const autoInspectKeyRef = useRef<string | null>(null)
  const [autoInspecting, setAutoInspecting] = useState(false)

  const selectedUrls = urls.filter((url) => selectedIds.includes(url.id))

  const selectedConnectionData = useMemo(
    () => searchConsoleConnections.find((conn) => conn.id === selectedConnection) || null,
    [searchConsoleConnections, selectedConnection]
  )

  const connectionCoverage = useMemo(() => {
    if (!searchConsoleConnections.length || !urls.length) return []
    const urlList = urls.map((row) => row.url)

    return searchConsoleConnections.map((connection) => {
      const sites = getSearchConsoleSites(connection)
      const matchCount = urlList.filter((url) => !!matchSearchConsoleSiteForUrl(sites, url)).length
      return { connection, matchCount }
    })
  }, [searchConsoleConnections, urls])

  const selectedCoverage = useMemo(() => {
    return connectionCoverage.find((entry) => entry.connection.id === selectedConnection) || null
  }, [connectionCoverage, selectedConnection])

  const connectionHint = useMemo(() => {
    if (searchConsoleConnections.length === 0) {
      return 'Conecte o Google Search Console para habilitar verificação e solicitação de indexação.'
    }
    if (!selectedConnection) {
      return 'Selecione a conexão do Search Console que possui o domínio das URLs.'
    }
    if (!urls.length || !selectedCoverage) return undefined
    if (selectedCoverage.matchCount === 0) {
      return 'Esta conexão não cobre as URLs desta página. Selecione outra conexão.'
    }
    if (selectedCoverage.matchCount < urls.length) {
      return `Cobertura parcial: ${selectedCoverage.matchCount} de ${urls.length} URLs desta página.`
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnection, selectedCoverage, urls.length])

  const incompatibleSelectedCount = useMemo(() => {
    if (!selectedConnectionData || selectedUrls.length === 0) return 0
    return selectedUrls.filter((url) => !isUrlCoveredByConnection(selectedConnectionData, url.url)).length
  }, [selectedConnectionData, selectedUrls])

  const disableBulkActions =
    selectedUrls.length > 0 && incompatibleSelectedCount === selectedUrls.length
  const bulkDisabledReason = disableBulkActions
    ? 'Nenhuma URL selecionada pertence a esta conexão.'
    : undefined

  const inspectionRemaining = quota
    ? quota.inspection_quota_limit - quota.inspection_quota_used
    : null
  const publishRemaining = quota
    ? quota.publish_quota_limit - quota.publish_quota_used
    : null

  useEffect(() => {
    clearSelection()
  }, [page, selectedProject, selectedConnection, statusFilter, sitemapFilter, search, clearSelection])

  useEffect(() => {
    if (!selectedConnection || urlsLoading) return
    if (!urls.length) return
    if (inspectMutation.isPending || autoInspecting) return

    const remainingQuota = quota
      ? quota.inspection_quota_limit - quota.inspection_quota_used
      : 0
    if (remainingQuota <= 0) return

    const now = Date.now()
    const scopedUrls = selectedConnectionData
      ? urls.filter((url) => isUrlCoveredByConnection(selectedConnectionData, url.url))
      : []

    const candidates = scopedUrls.filter((url) => {
      const status = mapVerdictToStatus(url.verdict)
      if (status === 'not_checked') return true
      if (!url.last_inspected_at) return true
      const last = new Date(url.last_inspected_at).getTime()
      if (Number.isNaN(last)) return true
      return now - last > 24 * 60 * 60 * 1000
    })

    if (!candidates.length) return

    const autoKey = [
      selectedConnection,
      selectedProject,
      page,
      statusFilter,
      sitemapFilter,
      search,
    ].join(':')

    if (autoInspectKeyRef.current === autoKey) return

    const limit = Math.min(10, remainingQuota, candidates.length)
    autoInspectKeyRef.current = autoKey
    setAutoInspecting(true)

    inspectMutation
      .mutateAsync({
        urls: candidates.slice(0, limit).map((url) => url.url),
        connectionId: selectedConnection,
      })
      .then(() => {
        refetchUrls()
        refetchStats()
      })
      .finally(() => setAutoInspecting(false))
  }, [
    selectedConnection,
    selectedConnectionData,
    selectedProject,
    page,
    statusFilter,
    sitemapFilter,
    search,
    urls,
    urlsLoading,
    quota,
    inspectMutation,
    autoInspecting,
    refetchUrls,
    refetchStats,
  ])

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchUrls()])
  }

  const handleInspect = async () => {
    if (!selectedConnection || !selectedConnectionData) return
    const compatibleUrls = selectedUrls.filter((url) =>
      isUrlCoveredByConnection(selectedConnectionData, url.url)
    )
    if (!compatibleUrls.length) {
      showToast.warning('Nenhuma URL selecionada pertence a esta conexão.')
      return
    }
    if (compatibleUrls.length < selectedUrls.length) {
      showToast.warning('Algumas URLs não pertencem a esta conexão e foram ignoradas.')
    }
    const payload = {
      urls: compatibleUrls.map((url) => url.url),
      connectionId: selectedConnection,
    }
    await inspectMutation.mutateAsync(payload)
    clearSelection()
    refetchUrls()
  }

  const handleIndex = async () => {
    if (!selectedConnection || !selectedConnectionData) return
    const compatibleUrls = selectedUrls.filter((url) =>
      isUrlCoveredByConnection(selectedConnectionData, url.url)
    )
    if (!compatibleUrls.length) {
      showToast.warning('Nenhuma URL selecionada pertence a esta conexão.')
      return
    }
    if (compatibleUrls.length < selectedUrls.length) {
      showToast.warning('Algumas URLs não pertencem a esta conexão e foram ignoradas.')
    }
    const items = compatibleUrls
      .filter((url) => mapVerdictToStatus(url.verdict) !== 'indexed')
      .map((url) => ({ url: url.url, articleId: url.article_id || undefined }))

    if (!items.length) return

    await indexMutation.mutateAsync({ connectionId: selectedConnection, items })
    clearSelection()
    refetchUrls()
  }

  const getInspectState = (url: { url: string }) => {
    if (!selectedConnection || !selectedConnectionData) {
      return { disabled: true, reason: 'Selecione a conexão do Search Console que possui o domínio da URL.' }
    }
    if (!isUrlCoveredByConnection(selectedConnectionData, url.url)) {
      return { disabled: true, reason: 'Esta conexão não cobre esta URL.' }
    }
    if (inspectionRemaining !== null && inspectionRemaining <= 0) {
      return { disabled: true, reason: 'Quota de verificação esgotada para esta conexão.' }
    }
    return { disabled: false }
  }

  const getIndexState = (url: { url: string; verdict?: string | null }) => {
    if (!selectedConnection || !selectedConnectionData) {
      return { disabled: true, reason: 'Selecione a conexão do Search Console que possui o domínio da URL.' }
    }
    if (!isUrlCoveredByConnection(selectedConnectionData, url.url)) {
      return { disabled: true, reason: 'Esta conexão não cobre esta URL.' }
    }
    const status = mapVerdictToStatus(url.verdict)
    if (status === 'indexed') {
      return { disabled: true, reason: 'URL já está indexada.' }
    }
    if (status === 'in_progress') {
      return { disabled: true, reason: 'Indexação em progresso.' }
    }
    if (publishRemaining !== null && publishRemaining <= 0) {
      return { disabled: true, reason: 'Quota de indexação esgotada para esta conexão.' }
    }
    return { disabled: false }
  }

  const handleInspectUrl = async (url: { url: string }) => {
    if (!selectedConnection) return
    const state = getInspectState(url)
    if (state.disabled) {
      if (state.reason) showToast.warning(state.reason)
      return
    }
    await inspectMutation.mutateAsync({
      urls: [url.url],
      connectionId: selectedConnection,
    })
    refetchUrls()
    refetchStats()
  }

  const handleIndexUrl = async (url: { url: string; article_id?: number | null; verdict?: string | null }) => {
    if (!selectedConnection) return
    const state = getIndexState(url)
    if (state.disabled) {
      if (state.reason) showToast.warning(state.reason)
      return
    }
    await indexMutation.mutateAsync({
      connectionId: selectedConnection,
      items: [{ url: url.url, articleId: url.article_id || undefined }],
    })
    refetchUrls()
    refetchStats()
  }

  const projectOptions = [{ value: '', label: 'Todos os projetos' }, ...projects.map((project) => ({
    value: String(project.id),
    label: project.name || `Projeto ${project.id}`,
  }))]

  const connectionOptions = [{ value: '', label: 'Todas as conexões' }, ...searchConsoleConnections.map((conn) => ({
    value: conn.id,
    label: conn.connection_name || conn.id,
  }))]

  const sitemapOptions = [{ value: '', label: 'Todos os sitemaps' }, ...sitemaps.map((sitemap) => ({
    value: sitemap.id,
    label: sitemap.url,
  }))]

  return (
    <div className={styles.container}>
      <PageHeader
        icon={<Search />}
        title="Monitoramento de Indexação"
        subtitle="Acompanhe a indexação e envie URLs para o Google"
        onRefresh={handleRefresh}
        isRefreshing={urlsLoading || statsLoading || autoInspecting || inspectMutation.isPending}
        secondaryActions={
          <div className={styles.headerActions}>
            <QuotaIndicator quota={quota || undefined} />
            <Button variant="outline" onClick={() => setIsSitemapModalOpen(true)} leftIcon={<Settings size={16} />}>
              Sitemaps
            </Button>
          </div>
        }
      />

      <IndexingSummaryCards stats={stats} isLoading={statsLoading} />

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="Buscar URL..."
            leftIcon={<Search size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            size="md"
          />
          <Select
            options={connectionOptions}
            value={selectedConnection}
            onValueChange={(value) => {
              setSelectedConnection(value)
              setPage(1)
            }}
            hint={connectionHint}
            size="md"
          />
          <Select
            options={statusOptions}
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
            size="md"
          />
          <Select
            options={projectOptions}
            value={selectedProject}
            onValueChange={(value) => {
              setSelectedProject(value)
              setSitemapFilter('')
              setPage(1)
            }}
            size="md"
          />
          <Select
            options={sitemapOptions}
            value={sitemapFilter}
            onValueChange={(value) => {
              setSitemapFilter(value)
              setPage(1)
            }}
            size="md"
          />
        </div>
        <div className={styles.toolbarRight}>
          {selectedIds.length > 0 && selectedConnection && (
            <BulkActionsBar
              selectedCount={selectedIds.length}
              onInspect={handleInspect}
              onIndex={handleIndex}
              onClear={clearSelection}
              isInspecting={inspectMutation.isPending}
              isIndexing={indexMutation.isPending}
              disableActions={disableBulkActions}
              disabledReason={bulkDisabledReason}
            />
          )}
        </div>
      </div>

      <IndexingTable
        urls={urls}
        isLoading={urlsLoading}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
        onSelectAll={selectAll}
        onInspectUrl={handleInspectUrl}
        onIndexUrl={handleIndexUrl}
        getInspectState={getInspectState}
        getIndexState={getIndexState}
        isInspecting={inspectMutation.isPending}
        isIndexing={indexMutation.isPending}
      />

      <div className={styles.pagination}>
        <Button
          variant="outline"
          size="md"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1}
        >
          Anterior
        </Button>
        <span>Página {page} de {totalPages}</span>
        <Button
          variant="outline"
          size="md"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page === totalPages}
        >
          Próxima
        </Button>
        <span className={styles.paginationCount}>Mostrando {urls.length} de {total}</span>
      </div>

      <SitemapManager
        projectId={selectedProject || null}
        connectionId={selectedConnection || null}
        isOpen={isSitemapModalOpen}
        onClose={() => setIsSitemapModalOpen(false)}
      />
    </div>
  )
}
