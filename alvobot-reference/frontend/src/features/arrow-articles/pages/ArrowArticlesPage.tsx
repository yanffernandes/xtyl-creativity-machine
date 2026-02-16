import { useState, useMemo } from 'react'
import {
  Plus,
  Search,
  ArrowUpRight,
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
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProjects } from '@/features/projects/api/useProjects'
import { Button, Input, Spinner, EmptyState, Alert, Modal, Select, SearchableSelect, MaskedValue, useMaskedValue } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { useDeleteArrowArticle, useQueueDraftArticles } from '../api/mutations'
import {
  useArrowArticles,
  getStatusLabel,
  formatDate,
  type ArticleStatus,
  type ArrowArticle,
} from '../api/useArrowArticles'
import { CreateArrowArticleModal } from '../components'
import styles from './ArrowArticlesPage.module.css'

const statusFilters: Array<{ label: string; value: ArticleStatus | 'all' | 'queue' }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Na Fila', value: 'queue' },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Escrevendo', value: 'writing' },
  { label: 'Publicado', value: 'published' },
  { label: 'Agendado', value: 'scheduled' },
  { label: 'Arquivado', value: 'archived' },
]

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 por página' },
  { value: '25', label: '25 por página' },
  { value: '50', label: '50 por página' },
  { value: '100', label: '100 por página' },
]

export function ArrowArticlesPage() {
  useDocumentTitle('Artigos Flecha')
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<number | undefined>()
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'all' | 'queue'>('all')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [articleToDelete, setArticleToDelete] = useState<ArrowArticle | null>(null)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [bulkQueueModalOpen, setBulkQueueModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [articleToPreview, setArticleToPreview] = useState<ArrowArticle | null>(null)

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
  } = useArrowArticles({
    search,
    projectId: selectedProject,
    status: statusFilter,
  })

  // Mutations
  const deleteMutation = useDeleteArrowArticle()
  const queueMutation = useQueueDraftArticles()
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

  // Count how many selected articles are drafts
  const selectedDraftIds = useMemo(() => {
    return articles
      .filter((a) => selectedIds.has(a.id) && a.status === 'draft')
      .map((a) => a.id)
  }, [articles, selectedIds])

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

  const getProjectInfo = (article: ArrowArticle): { name: string; domain?: string; isOffline: boolean } => {
    const projectData = article.project
    if (!projectData) return { name: 'Sem projeto', isOffline: false }

    const isOffline = projectData.status === false

    return { name: projectData.name || 'Sem projeto', domain: projectData.domain, isOffline }
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

  const handlePreview = (article: ArrowArticle) => {
    setArticleToPreview(article)
    setPreviewModalOpen(true)
  }

  const handleOpenInWordPress = (article: ArrowArticle) => {
    const projectInfo = getProjectInfo(article)
    if (projectInfo.domain && article.wpPost_id) {
      const url = `${projectInfo.domain}/?p=${article.wpPost_id}`
      window.open(url, '_blank')
    }
  }

  const handleEdit = (article: ArrowArticle) => {
    navigate(`/articles/edit/${article.id}`)
  }

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

    // Delete selected articles one by one, continuing even if some fail
    for (const id of selectedIds) {
      try {
        const article = articles.find(a => a.id === id)
        await deleteMutation.mutateAsync({
          id,
          title: article?.title || 'Artigo'
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

  const handleBulkQueue = async () => {
    try {
      await queueMutation.mutateAsync(selectedDraftIds)
      setBulkQueueModalOpen(false)
      clearSelection()
    } catch (err) {
      console.error('Error queueing articles:', err)
    }
  }

  const openDeleteModal = (article: ArrowArticle) => {
    setArticleToDelete(article)
    setDeleteModalOpen(true)
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
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <ArrowUpRight size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Artigos Flecha</h1>
            <p className={styles.subtitle}>
              Artigos prontos para publicação nos seus blogs
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setCreateModalOpen(true)}
        >
          Novo Artigo Flecha
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
            {selectedDraftIds.length > 0 && selectedDraftIds.length !== selectedIds.size && (
              <span className={styles.draftCount}> ({selectedDraftIds.length} rascunho{selectedDraftIds.length !== 1 ? 's' : ''})</span>
            )}
          </span>
          <div className={styles.bulkButtons}>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              Limpar seleção
            </Button>
            {selectedDraftIds.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<ArrowUpRight size={16} />}
                onClick={() => setBulkQueueModalOpen(true)}
              >
                Criar {selectedDraftIds.length} artigo{selectedDraftIds.length !== 1 ? 's' : ''}
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={16} />}
              onClick={() => setBulkDeleteModalOpen(true)}
            >
              Excluir selecionados
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
          icon={<ArrowUpRight size={48} />}
          title="Nenhum artigo flecha encontrado"
          description={
            search || selectedProject || statusFilter !== 'all'
              ? 'Tente ajustar os filtros'
              : 'Crie seu primeiro artigo flecha para publicar em seus blogs'
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
                Criar Artigo Flecha
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
                  <th className={styles.projectCell}>Projeto</th>
                  <th>Status</th>
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
                    <td className={styles.projectCell}>
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
                          title="Editar"
                          onClick={() => handleEdit(article)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.danger}`}
                          title="Excluir"
                          onClick={() => openDeleteModal(article)}
                        >
                          <Trash2 size={16} />
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

      {/* Delete Confirmation Modal */}
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
            <strong><MaskedValue value={articleToDelete?.title || 'Sem título'} type="partial" visibleStart={5} /></strong>?
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
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              Excluir
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
            <strong>{selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}</strong>?
          </p>
          <p className={styles.deleteWarning}>Esta ação não pode ser desfeita.</p>
          <div className={styles.deleteActions}>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleBulkDelete}
              isLoading={deleteMutation.isPending}
            >
              Excluir {selectedIds.size} {selectedIds.size === 1 ? 'artigo' : 'artigos'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Queue Confirmation Modal */}
      <Modal
        isOpen={bulkQueueModalOpen}
        onClose={() => setBulkQueueModalOpen(false)}
        title="Enviar Artigos para a Fila"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Deseja enviar{' '}
            <strong>{selectedDraftIds.length} {selectedDraftIds.length === 1 ? 'artigo' : 'artigos'}</strong> para a fila de publicação?
          </p>
          <p className={styles.queueInfo}>
            Os artigos selecionados com status "Rascunho" serão movidos para a fila e processados automaticamente.
          </p>
          <div className={styles.deleteActions}>
            <Button
              variant="outline"
              onClick={() => setBulkQueueModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleBulkQueue}
              isLoading={queueMutation.isPending}
              leftIcon={<ArrowUpRight size={16} />}
            >
              Criar {selectedDraftIds.length} {selectedDraftIds.length === 1 ? 'artigo' : 'artigos'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Article Modal */}
      <CreateArrowArticleModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
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
    </div>
  )
}
