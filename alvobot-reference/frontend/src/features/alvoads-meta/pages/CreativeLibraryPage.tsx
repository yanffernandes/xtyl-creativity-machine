import { useState, useMemo } from 'react'
import {
  Search,
  Image,
  Trash2,
  Filter,
  Grid,
  List,
  Calendar,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Button, Input, Spinner, EmptyState, Modal, Alert } from '@/shared/components'
import styles from './CreativeLibraryPage.module.css'
import { useLibraryCreatives, useDeleteLibraryCreative, useLibraryStats, useLibraryFilterOptions } from '../api/useCreatives'
import type { ImageModel, ImageFormat, LibraryCreative } from '../types/creative'

const MODEL_LABELS: Record<string, string> = {
  'gemini-3-pro-image-preview': 'Gemini 3 Pro',
  'nano-banana-pro': 'Nano Banana Pro',
  'gpt-image-1.5': 'GPT Image 1.5',
}

const FORMAT_LABELS: Record<string, string> = {
  '1:1': 'Quadrado (1:1)',
  '9:16': 'Stories (9:16)',
  '16:9': 'Paisagem (16:9)',
}

const STYLE_LABELS: Record<string, string> = {
  photorealistic: 'Fotorrealista',
  illustration: 'Ilustração',
  minimalist: 'Minimalista',
  cinematic: 'Cinematográfico',
  watercolor: 'Aquarela',
  'concept-based': 'Baseado em Conceito',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatModelShortName(model: string): string {
  // Extract the last part of provider/vendor/model format
  const parts = model.split('/')
  const modelName = parts[parts.length - 1] || model

  // Capitalize and format: "nano-banana-pro" → "Nano Banana"
  return modelName
    .split('-')
    .slice(0, 2) // Take first 2 parts to keep it short
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function CreativeLibraryPage() {
  const workspaceId = useWorkspaceId()

  // View and filter state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [modelFilter, setModelFilter] = useState<ImageModel | ''>('')
  const [formatFilter, setFormatFilter] = useState<ImageFormat | ''>('')
  const [articleFilter, setArticleFilter] = useState<number | ''>('')
  const [nicheFilter, setNicheFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Modal state
  const [selectedCreative, setSelectedCreative] = useState<LibraryCreative | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LibraryCreative | null>(null)

  // Queries
  const queryParams = useMemo(() => ({
    page,
    limit,
    workspaceId: workspaceId || undefined,
    model: modelFilter || undefined,
    format: formatFilter || undefined,
    articleId: articleFilter || undefined,
    niche: nicheFilter || undefined,
    language: languageFilter || undefined,
  }), [page, limit, workspaceId, modelFilter, formatFilter, articleFilter, nicheFilter, languageFilter])

  const {
    data: libraryData,
    isLoading,
    error,
    refetch,
  } = useLibraryCreatives(queryParams)

  const { data: stats } = useLibraryStats(workspaceId || undefined)
  const { data: filterOptions } = useLibraryFilterOptions(workspaceId || undefined)

  const deleteCreativeMutation = useDeleteLibraryCreative()

  const creatives = useMemo(() => libraryData?.data ?? [], [libraryData])
  const pagination = useMemo(
    () => libraryData?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    [libraryData]
  )

  // Filter by search locally (article title)
  const filteredCreatives = useMemo(() => {
    if (!search.trim()) return creatives
    const searchLower = search.toLowerCase()
    return creatives.filter(
      (c) =>
        c.articleTitle?.toLowerCase().includes(searchLower) ||
        c.model.toLowerCase().includes(searchLower) ||
        c.style?.toLowerCase().includes(searchLower)
    )
  }, [creatives, search])

  const handleDeleteCreative = async () => {
    if (!deleteTarget) return
    try {
      await deleteCreativeMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (err) {
      console.error('Erro ao excluir criativo:', err)
    }
  }

  const clearFilters = () => {
    setModelFilter('')
    setFormatFilter('')
    setArticleFilter('')
    setNicheFilter('')
    setLanguageFilter('')
    setSearch('')
    setPage(1)
  }

  const hasActiveFilters = modelFilter || formatFilter || articleFilter || nicheFilter || languageFilter || search

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <Image size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Biblioteca de Criativos</h1>
            <p className={styles.subtitle}>
              Visualize e reutilize imagens geradas por IA em suas campanhas
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={18} />}
            onClick={() => refetch()}
            disabled={isLoading}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar biblioteca: {error.message}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Image size={24} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.totalCreatives}</span>
              <span className={styles.statLabel}>Criativos Salvos</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Sparkles size={24} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>
                {Object.entries(stats.byModel)
                  .sort(([, a], [, b]) => b - a)[0]?.[0]
                  ? MODEL_LABELS[Object.entries(stats.byModel).sort(([, a], [, b]) => b - a)[0][0]] || '-'
                  : '-'}
              </span>
              <span className={styles.statLabel}>Modelo Mais Usado</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <Grid size={24} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>
                {Object.entries(stats.byFormat)
                  .sort(([, a], [, b]) => b - a)[0]?.[0] || '-'}
              </span>
              <span className={styles.statLabel}>Formato Mais Usado</span>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="Buscar por artigo, modelo ou estilo..."
            leftIcon={<Search size={18} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
            size="md"
          />

          <div className={styles.filterGroup}>
            <Filter size={16} className={styles.filterIcon} />

            {/* Article filter */}
            <select
              value={articleFilter}
              onChange={(e) => {
                setArticleFilter(e.target.value ? Number(e.target.value) : '')
                setPage(1)
              }}
              className={styles.filterSelect}
            >
              <option value="">Todos os artigos</option>
              {filterOptions?.articles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title.length > 30 ? `${article.title.slice(0, 30)}...` : article.title}
                </option>
              ))}
            </select>

            {/* Niche filter */}
            <select
              value={nicheFilter}
              onChange={(e) => {
                setNicheFilter(e.target.value)
                setPage(1)
              }}
              className={styles.filterSelect}
            >
              <option value="">Todos os nichos</option>
              {filterOptions?.niches.map((niche) => (
                <option key={niche} value={niche}>
                  {niche.charAt(0).toUpperCase() + niche.slice(1)}
                </option>
              ))}
            </select>

            {/* Language filter */}
            <select
              value={languageFilter}
              onChange={(e) => {
                setLanguageFilter(e.target.value)
                setPage(1)
              }}
              className={styles.filterSelect}
            >
              <option value="">Todos os idiomas</option>
              {filterOptions?.languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>

            {/* Model filter */}
            <select
              value={modelFilter}
              onChange={(e) => {
                setModelFilter(e.target.value as ImageModel | '')
                setPage(1)
              }}
              className={styles.filterSelect}
            >
              <option value="">Todos os modelos</option>
              {filterOptions?.models.map((model) => (
                <option key={model} value={model}>
                  {MODEL_LABELS[model] || model}
                </option>
              ))}
            </select>

            {/* Format filter */}
            <select
              value={formatFilter}
              onChange={(e) => {
                setFormatFilter(e.target.value as ImageFormat | '')
                setPage(1)
              }}
              className={styles.filterSelect}
            >
              <option value="">Todos os formatos</option>
              <option value="1:1">Quadrado (1:1)</option>
              <option value="9:16">Stories (9:16)</option>
              <option value="16:9">Paisagem (16:9)</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<X size={14} />}
                onClick={clearFilters}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
              onClick={() => setViewMode('grid')}
              title="Visualização em grade"
            >
              <Grid size={18} />
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              title="Visualização em lista"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <Spinner size="lg" />
          <p>Carregando criativos...</p>
        </div>
      ) : filteredCreatives.length === 0 ? (
        <EmptyState
          icon={<Image size={48} />}
          title="Nenhum criativo encontrado"
          description={
            hasActiveFilters
              ? 'Tente ajustar seus filtros ou busca'
              : 'Gere imagens por IA no wizard de campanhas para vê-las aqui'
          }
          action={
            hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className={styles.creativesGrid}>
              {filteredCreatives.map((creative) => (
                <div key={creative.id} className={styles.creativeCardWrapper}>
                  <button
                    type="button"
                    className={styles.creativeCard}
                    onClick={() => setSelectedCreative(creative)}
                  >
                    <div className={styles.creativeImageWrapper}>
                      <img
                        src={creative.imageUrl}
                        alt={creative.articleTitle || 'Criativo'}
                        className={styles.creativeImage}
                        loading="lazy"
                      />
                    </div>
                    <div className={styles.creativeInfo}>
                      <span className={styles.creativeTitle}>
                        {creative.articleTitle || 'Sem artigo vinculado'}
                      </span>
                      <div className={styles.creativeMeta}>
                        <span>{creative.format}</span>
                        {creative.conceptInfo ? (
                          <>
                            <span className={styles.separator}>•</span>
                            <span>{creative.conceptInfo.name}</span>
                          </>
                        ) : creative.style && (
                          <>
                            <span className={styles.separator}>•</span>
                            <span>{STYLE_LABELS[creative.style] || creative.style}</span>
                          </>
                        )}
                      </div>
                      <div className={styles.creativeFooter}>
                        <span className={styles.creativeDate}>
                          <Calendar size={12} /> {formatDate(creative.createdAt)}
                        </span>
                        <span className={styles.modelBadge} title={creative.model}>
                          {MODEL_LABELS[creative.model] || formatModelShortName(creative.model)}
                        </span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => setDeleteTarget(creative)}
                    title="Excluir criativo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className={styles.creativesList}>
              {filteredCreatives.map((creative) => (
                <div key={creative.id} className={styles.creativeListItemWrapper}>
                  <button
                    type="button"
                    className={styles.creativeListItem}
                    onClick={() => setSelectedCreative(creative)}
                  >
                    <img
                      src={creative.imageUrl}
                      alt={creative.articleTitle || 'Criativo'}
                      className={styles.creativeListThumb}
                      loading="lazy"
                    />
                    <div className={styles.creativeListInfo}>
                      <span className={styles.creativeListTitle}>
                        {creative.articleTitle || 'Sem artigo vinculado'}
                      </span>
                      <div className={styles.creativeListMeta}>
                        <span className={styles.modelBadge}>
                          {MODEL_LABELS[creative.model] || creative.model}
                        </span>
                        <span>{FORMAT_LABELS[creative.format] || creative.format}</span>
                        {creative.conceptInfo ? (
                          <span>{creative.conceptInfo.name}</span>
                        ) : creative.style && (
                          <span>{STYLE_LABELS[creative.style] || creative.style}</span>
                        )}
                      </div>
                    </div>
                    <span className={styles.creativeListDate}>
                      {formatDate(creative.createdAt)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => setDeleteTarget(creative)}
                    title="Excluir criativo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ChevronLeft size={16} />}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className={styles.paginationInfo}>
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ChevronRight size={16} />}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={!!selectedCreative}
        onClose={() => setSelectedCreative(null)}
        title="Visualizar Criativo"
        size="lg"
      >
        {selectedCreative && (
          <div className={styles.previewModal}>
            <div className={styles.previewImageWrapper}>
              <img
                src={selectedCreative.imageUrl}
                alt={selectedCreative.articleTitle || 'Criativo'}
                className={styles.previewImage}
              />
            </div>
            <div className={styles.previewDetails}>
              <h3>{selectedCreative.articleTitle || 'Sem artigo vinculado'}</h3>
              <div className={styles.previewMeta}>
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewMetaLabel}>Modelo:</span>
                  <span>{MODEL_LABELS[selectedCreative.model] || selectedCreative.model}</span>
                </div>
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewMetaLabel}>Formato:</span>
                  <span>{FORMAT_LABELS[selectedCreative.format] || selectedCreative.format}</span>
                </div>
                {selectedCreative.conceptInfo ? (
                  <div className={styles.previewMetaItem}>
                    <span className={styles.previewMetaLabel}>Conceito:</span>
                    <span>{selectedCreative.conceptInfo.name}</span>
                  </div>
                ) : selectedCreative.style && (
                  <div className={styles.previewMetaItem}>
                    <span className={styles.previewMetaLabel}>Estilo:</span>
                    <span>{STYLE_LABELS[selectedCreative.style] || selectedCreative.style}</span>
                  </div>
                )}
                {selectedCreative.language && (
                  <div className={styles.previewMetaItem}>
                    <span className={styles.previewMetaLabel}>Idioma:</span>
                    <span>{selectedCreative.language.charAt(0).toUpperCase() + selectedCreative.language.slice(1)}</span>
                  </div>
                )}
                <div className={styles.previewMetaItem}>
                  <span className={styles.previewMetaLabel}>Criado em:</span>
                  <span>{formatDate(selectedCreative.createdAt)}</span>
                </div>
              </div>
              <div className={styles.previewActions}>
                <Button
                  variant="danger"
                  leftIcon={<Trash2 size={16} />}
                  onClick={() => {
                    setDeleteTarget(selectedCreative)
                    setSelectedCreative(null)
                  }}
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Excluir Criativo"
        size="sm"
      >
        <div className={styles.deleteModal}>
          <p>
            Tem certeza que deseja excluir este criativo?
          </p>
          <p className={styles.deleteWarning}>
            Esta ação não pode ser desfeita. O criativo não estará mais disponível para uso em campanhas.
          </p>
          <div className={styles.deleteActions}>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteCreative}
              disabled={deleteCreativeMutation.isPending}
            >
              {deleteCreativeMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
