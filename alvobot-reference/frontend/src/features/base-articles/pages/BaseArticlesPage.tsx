import { useState, useMemo } from 'react'
import {
  Plus,
  Search,
  FileText,
  Archive,
  Eye,
  ExternalLink,
  CheckSquare,
  Square,
  MinusSquare,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  ListChecks,
} from 'lucide-react'
import { useProjects } from '@/features/projects/api/useProjects'
import { Button, Input, Spinner, EmptyState, Alert, Modal, Select, SearchableSelect, MaskedValue, useMaskedValue } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { useArchiveBaseArticle, useSendToQueueBaseArticle } from '../api/mutations'
import {
  useBaseArticles,
  getStatusLabel,
  formatDate,
  type ArticleStatus,
  type BaseArticle,
} from '../api/useBaseArticles'
import { CreateBaseArticleModal } from '../components'
import styles from './BaseArticlesPage.module.css'

const statusFilters: Array<{ label: string; value: ArticleStatus | 'all' | 'queue' }> = [
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

export function BaseArticlesPage() {
  useDocumentTitle('Artigos Base')
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'all' | 'queue'>('all')
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [articleToArchive, setArticleToArchive] = useState<BaseArticle | null>(null)
  const [bulkArchiveModalOpen, setBulkArchiveModalOpen] = useState(false)
  const [bulkQueueModalOpen, setBulkQueueModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [articleToPreview, setArticleToPreview] = useState<BaseArticle | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Queries
  const { data: projects = [] } = useProjects()
  const {
    data: articles = [],
    isLoading,
    error,
  } = useBaseArticles({
    search,
    projectId: selectedProject,
    status: statusFilter,
  })

  // Mutations
  const archiveMutation = useArchiveBaseArticle()
  const sendToQueueMutation = useSendToQueueBaseArticle()
  const { mask } = useMaskedValue()

  // Pagination calculations
  const totalItems = articles.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedArticles = useMemo(() => {
    return articles.slice(startIndex, endIndex)
  }, [articles, startIndex, endIndex])

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
    let statusClass = styles.badgeQueue // Default for null/queue

    if (status) {
      switch (status) {
        case 'draft':
          statusClass = styles.badgeDraft
          break
        case 'writing':
          statusClass = styles.badgeWriting
          break
        case 'publish':
        case 'published':
          statusClass = styles.badgePublished
          break
        case 'archived':
          statusClass = styles.badgeArchived
          break
        case 'scheduled':
          statusClass = styles.badgeScheduled
          break
      }
    }

    return <span className={`${baseClass} ${statusClass}`}>{getStatusLabel(status)}</span>
  }

  const getProjectInfo = (article: BaseArticle): { name: string; domain?: string; isOffline: boolean } => {
    const projectData = article.project as { name: string; domain?: string; status: boolean } | Array<{ name: string; domain?: string; status: boolean }> | null
    if (!projectData) return { name: 'Sem projeto', isOffline: false }

    const project = Array.isArray(projectData) ? projectData[0] : projectData
    const isOffline = project?.status === false

    return { name: project?.name || 'Sem projeto', domain: project?.domain, isOffline }
  }

  // Helper to strip HTML tags from content
  const stripHtml = (html?: string): string => {
    if (!html) return ''
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
  }

  // Helper to count words in text
  const countWords = (text?: string): number => {
    if (!text) return 0
    const plainText = stripHtml(text)
    const words = plainText.split(/\s+/).filter(word => word.length > 0)
    return words.length
  }

  // Helper to get content preview (first N characters without HTML)
  const getContentPreview = (content?: string, maxLength = 500): string => {
    if (!content) return 'Sem conteúdo'
    const plainText = stripHtml(content)
    if (plainText.length <= maxLength) return plainText
    return `${plainText.substring(0, maxLength)  }...`
  }

  const handlePreview = (article: BaseArticle) => {
    setArticleToPreview(article)
    setPreviewModalOpen(true)
  }

  const handleOpenInWordPress = (article: BaseArticle) => {
    const projectInfo = getProjectInfo(article)
    if (projectInfo.domain && article.wpPost_id) {
      const url = `${projectInfo.domain}/?p=${article.wpPost_id}`
      window.open(url, '_blank')
    }
  }

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

  const handleBulkSendToQueue = async () => {
    try {
      for (const id of selectedIds) {
        await sendToQueueMutation.mutateAsync(id)
      }
      setBulkQueueModalOpen(false)
      clearSelection()
    } catch (err) {
      console.error('Error sending articles to queue:', err)
    }
  }

  const openArchiveModal = (article: BaseArticle) => {
    setArticleToArchive(article)
    setArchiveModalOpen(true)
  }

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }))

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <FileText size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Artigos de Base</h1>
            <p className={styles.subtitle}>
              Templates de artigos reutilizáveis para seus blogs
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setCreateModalOpen(true)}
        >
          Novo Artigo de Base
        </Button>
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar artigos: {error.message}
        </Alert>
      )}

      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <Input
            placeholder="Buscar artigos..."
            leftIcon={<Search size={18} />}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={styles.search}
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
          </span>
          <div className={styles.bulkButtons}>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              Limpar seleção
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ListChecks size={16} />}
              onClick={() => setBulkQueueModalOpen(true)}
            >
              Enviar para Fila
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Archive size={16} />}
              onClick={() => setBulkArchiveModalOpen(true)}
            >
              Arquivar selecionados
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="Nenhum artigo de base encontrado"
          description={
            search || selectedProject || statusFilter !== 'all'
              ? 'Tente ajustar os filtros'
              : 'Crie seu primeiro artigo de base para reutilizar em seus blogs'
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
                Criar Artigo de Base
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <button
                      className={styles.checkboxBtn}
                      onClick={toggleSelectAll}
                      title={allSelectedOnPage ? 'Desmarcar todos da página' : 'Selecionar todos da página'}
                    >
                      {allSelectedOnPage ? (
                        <CheckSquare size={24} />
                      ) : someSelectedOnPage ? (
                        <MinusSquare size={24} />
                      ) : (
                        <Square size={24} />
                      )}
                    </button>
                  </th>
                  <th className={styles.titleCell}>Título</th>
                  <th>Projeto</th>
                  <th>Status</th>
                  <th>Palavras</th>
                  <th>Data</th>
                  <th className={styles.actionsCell}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedArticles.map((article) => (
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
                          <MaskedValue value={article.title || 'Sem título'} type="partial" visibleStart={5} />
                        </span>
                        {article.keyword_used && (
                          <span className={styles.keyword}>
                            <MaskedValue value={article.keyword_used} type="partial" visibleStart={3} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const projectInfo = getProjectInfo(article)
                        return (
                          <span className={`${styles.project} ${projectInfo.isOffline ? styles.projectOffline : ''}`}>
                            <MaskedValue value={projectInfo.name} type="partial" visibleStart={3} />
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
                    <td className={styles.wordsCell}>{article.words ?? 0}</td>
                    <td className={styles.dateCell}>{formatDate(article.created_at)}</td>
                    <td className={styles.actionsCell}>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.actionBtn}
                          title="Preview"
                          onClick={() => handlePreview(article)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className={styles.actionBtn}
                          title="Arquivar"
                          onClick={() => openArchiveModal(article)}
                        >
                          <Archive size={16} />
                        </button>
                        {article.wpPost_id && (
                          <button
                            className={styles.actionBtn}
                            title="Abrir no WordPress"
                            onClick={() => handleOpenInWordPress(article)}
                            disabled={!getProjectInfo(article).domain}
                          >
                            <ExternalLink size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                <MaskedValue value={articleToPreview.title || 'Sem título'} type="partial" visibleStart={5} />
              </h2>
              {getStatusBadge(articleToPreview.status)}
            </div>

            <div className={styles.previewStats}>
              <div className={styles.previewStatItem}>
                <span className={styles.previewStatValue}>{countWords(articleToPreview.content)}</span>
                <span className={styles.previewStatLabel}>palavras</span>
              </div>
              <div className={styles.previewStatItem}>
                <span className={styles.previewStatValue}>{stripHtml(articleToPreview.content).length}</span>
                <span className={styles.previewStatLabel}>caracteres</span>
              </div>
              <div className={styles.previewStatItem}>
                <span className={styles.previewStatValue}>{Math.max(1, Math.ceil(countWords(articleToPreview.content) / 200))}</span>
                <span className={styles.previewStatLabel}>min leitura</span>
              </div>
            </div>

            <div className={styles.previewInfo}>
              <div className={styles.previewInfoRow}>
                <span className={styles.previewInfoLabel}>Projeto:</span>
                <MaskedValue value={getProjectInfo(articleToPreview).name} type="partial" visibleStart={3} />
              </div>
              {articleToPreview.keyword_used && (
                <div className={styles.previewInfoRow}>
                  <span className={styles.previewInfoLabel}>Palavra-chave:</span>
                  <MaskedValue value={articleToPreview.keyword_used} type="partial" visibleStart={3} />
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

      {/* Archive Confirmation Modal */}
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
            <strong><MaskedValue value={articleToArchive?.title || 'Sem título'} type="partial" visibleStart={5} /></strong>?
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
            <Button
              variant="primary"
              onClick={handleArchive}
              isLoading={archiveMutation.isPending}
            >
              Arquivar
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
            <strong>{selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}</strong>?
          </p>
          <p className={styles.deleteWarning}>Os artigos serão movidos para os arquivados.</p>
          <div className={styles.deleteActions}>
            <Button
              variant="outline"
              onClick={() => setBulkArchiveModalOpen(false)}
            >
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

      {/* Bulk Send to Queue Confirmation Modal */}
      <Modal
        isOpen={bulkQueueModalOpen}
        onClose={() => setBulkQueueModalOpen(false)}
        title="Enviar para Fila"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja enviar{' '}
            <strong>{selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}</strong> para a fila?
          </p>
          <p className={styles.deleteWarning}>Os artigos serão processados pela automação.</p>
          <div className={styles.deleteActions}>
            <Button
              variant="outline"
              onClick={() => setBulkQueueModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkSendToQueue}
              isLoading={sendToQueueMutation.isPending}
            >
              Enviar {selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Article Modal */}
      <CreateBaseArticleModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}
