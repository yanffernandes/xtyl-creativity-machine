import { useState, useMemo } from 'react'
import {
  Search,
  Image,
  Filter,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Cpu, // T060: Icon for model filter
} from 'lucide-react'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Button, Input, Spinner, Modal } from '@/shared/components'
import styles from './CreativeLibraryModal.module.css'
import { useLibraryCreatives, useLibraryFilterOptions } from '../../api/useCreatives'
import type { ImageFormat, LibraryCreative } from '../../types/creative'

// T060: Model labels for display in filter and badges
// FR-002: Gemini 3 Pro (OpenRouter), Nano Banana Pro e GPT Image 1.5 (Replicate)
const MODEL_LABELS: Record<string, string> = {
  // OpenRouter models
  'gemini-3-pro-image-preview': 'Gemini 3 Pro',
  'openrouter/google/gemini-3-pro-image-preview': 'Gemini 3 Pro',
  // Replicate models (FR-005)
  'nano-banana-pro': 'Nano Banana Pro',
  'gpt-image-1.5': 'GPT Image 1.5',
  'replicate/google/nano-banana-pro': 'Nano Banana Pro',
  'replicate/openai/gpt-image-1.5': 'GPT Image 1.5',
}

// T060: Available models for filter dropdown (matches AVAILABLE_MODELS in backend)
// FR-002: Gemini 3 Pro (OpenRouter), Replicate models for fallback
const MODEL_FILTER_OPTIONS = [
  { value: '', label: 'Todos os modelos' },
  { value: 'openrouter/google/gemini-3-pro-image-preview', label: 'Gemini 3 Pro' },
  { value: 'replicate/google/nano-banana-pro', label: 'Nano Banana Pro' },
  { value: 'replicate/openai/gpt-image-1.5', label: 'GPT Image 1.5' },
] as const

/**
 * Format model identifier for display
 * Handles both legacy short names and new provider/model format
 */
function formatModelName(model?: string | null): string {
  if (!model) {
    return 'Modelo desconhecido'
  }

  // Check direct lookup first
  if (MODEL_LABELS[model]) {
    return MODEL_LABELS[model]
  }

  // Handle fallback notation like "openai/dall-e-3 (fallback)"
  const fallbackMatch = model.match(/^(.+?)\s*\(fallback\)$/)
  if (fallbackMatch) {
    const baseModel = formatModelName(fallbackMatch[1].trim())
    return `${baseModel} (fallback)`
  }

  // Handle provider/model format (e.g., "openrouter/google/gemini-3-flash-001")
  if (model.includes('/')) {
    const parts = model.split('/')
    // Get the last meaningful part as the model name
    const modelPart = parts[parts.length - 1]
    // Clean up the model name for display
    return modelPart
      .replace(/-/g, ' ')
      .replace(/(\d+\.\d+)/g, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return model
}

const STYLE_LABELS: Record<string, string> = {
  photorealistic: 'Fotorrealista',
  illustration: 'Ilustração',
  minimalist: 'Minimalista',
  cinematic: 'Cinematográfico',
  watercolor: 'Aquarela',
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface CreativeLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (creatives: LibraryCreative[]) => void
  maxSelection?: number
  formatFilter?: ImageFormat
  title?: string
}

export function CreativeLibraryModal({
  isOpen,
  onClose,
  onSelect,
  maxSelection,
  formatFilter,
  title = 'Selecionar da Biblioteca',
}: CreativeLibraryModalProps) {
  const workspaceId = useWorkspaceId()

  // State
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [modelFilter, setModelFilter] = useState('') // T060: Model filter state
  const [articleFilter, setArticleFilter] = useState<number | ''>('')
  const [nicheFilter, setNicheFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const limit = 12

  // Query
  const queryParams = useMemo(() => ({
    page,
    limit,
    workspaceId: workspaceId || undefined,
    format: formatFilter || undefined,
    model: modelFilter || undefined, // T060: Include model filter in query
    articleId: articleFilter || undefined,
    niche: nicheFilter || undefined,
    language: languageFilter || undefined,
  }), [page, limit, workspaceId, formatFilter, modelFilter, articleFilter, nicheFilter, languageFilter])

  const {
    data: libraryData,
    isLoading,
  } = useLibraryCreatives(queryParams)

  const { data: filterOptions } = useLibraryFilterOptions(workspaceId || undefined)

  const creatives = useMemo(() => libraryData?.data ?? [], [libraryData])
  const pagination = useMemo(
    () => libraryData?.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 0 },
    [libraryData]
  )

  // Filter by search locally
  const filteredCreatives = useMemo(() => {
    if (!search.trim()) return creatives
    const searchLower = search.toLowerCase()
    return creatives.filter(
      (c) =>
        c.articleTitle?.toLowerCase().includes(searchLower) ||
        (c.model || '').toLowerCase().includes(searchLower) ||
        c.style?.toLowerCase().includes(searchLower)
    )
  }, [creatives, search])

  // Selection handlers
  const toggleSelection = (creative: LibraryCreative) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(creative.id)) {
        newSet.delete(creative.id)
      } else {
        if (maxSelection && newSet.size >= maxSelection) {
          return prev
        }
        newSet.add(creative.id)
      }
      return newSet
    })
  }

  const isSelected = (id: string) => selectedIds.has(id)

  const handleConfirm = () => {
    const selectedCreatives = creatives.filter((c) => selectedIds.has(c.id))
    onSelect(selectedCreatives)
    handleClose()
  }

  const handleClose = () => {
    setSelectedIds(new Set())
    setSearch('')
    setPage(1)
    setModelFilter('') // T060: Reset model filter on close
    setArticleFilter('')
    setNicheFilter('')
    setLanguageFilter('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="lg"
    >
      <div className={styles.container}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <Input
            placeholder="Buscar por artigo, modelo ou estilo..."
            leftIcon={<Search size={18} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.search}
            size="md"
          />

          {/* Article filter dropdown */}
          <div className={styles.modelFilterWrapper}>
            <select
              className={styles.modelFilter}
              value={articleFilter}
              onChange={(e) => {
                setArticleFilter(e.target.value ? Number(e.target.value) : '')
                setPage(1)
              }}
            >
              <option value="">Artigo</option>
              {filterOptions?.articles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.title.length > 20 ? `${article.title.slice(0, 20)}...` : article.title}
                </option>
              ))}
            </select>
          </div>

          {/* Niche filter dropdown */}
          {filterOptions?.niches && filterOptions.niches.length > 0 && (
            <div className={styles.modelFilterWrapper}>
              <select
                className={styles.modelFilter}
                value={nicheFilter}
                onChange={(e) => {
                  setNicheFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Nicho</option>
                {filterOptions.niches.map((niche) => (
                  <option key={niche} value={niche}>
                    {niche.charAt(0).toUpperCase() + niche.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Language filter dropdown */}
          {filterOptions?.languages && filterOptions.languages.length > 0 && (
            <div className={styles.modelFilterWrapper}>
              <select
                className={styles.modelFilter}
                value={languageFilter}
                onChange={(e) => {
                  setLanguageFilter(e.target.value)
                  setPage(1)
                }}
              >
                <option value="">Idioma</option>
                {filterOptions.languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* T060: Model filter dropdown */}
          <div className={styles.modelFilterWrapper}>
            <Cpu size={14} className={styles.modelFilterIcon} />
            <select
              className={styles.modelFilter}
              value={modelFilter}
              onChange={(e) => {
                setModelFilter(e.target.value)
                setPage(1) // Reset to first page when filter changes
              }}
            >
              {MODEL_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {formatFilter && (
            <span className={styles.filterBadge}>
              <Filter size={14} /> Formato: {formatFilter}
            </span>
          )}
        </div>

        {/* Selection info */}
        {maxSelection && (
          <div className={styles.selectionInfo}>
            <span>
              {selectedIds.size} de {maxSelection} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
            {selectedIds.size > 0 && (
              <button
                className={styles.clearBtn}
                onClick={() => setSelectedIds(new Set())}
              >
                <X size={14} /> Limpar seleção
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="lg" />
            <p>Carregando biblioteca...</p>
          </div>
        ) : filteredCreatives.length === 0 ? (
          <div className={styles.emptyState}>
            <Image size={48} className={styles.emptyIcon} />
            <p>Nenhum criativo encontrado</p>
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
                Limpar busca
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {filteredCreatives.map((creative) => (
                <button
                  type="button"
                  key={creative.id}
                  className={`${styles.card} ${isSelected(creative.id) ? styles.selected : ''}`}
                  onClick={() => toggleSelection(creative)}
                >
                  <div className={styles.imageWrapper}>
                    <img
                      src={creative.imageUrl}
                      alt={creative.articleTitle || 'Criativo'}
                      className={styles.image}
                      loading="lazy"
                    />
                    {isSelected(creative.id) && (
                      <div className={styles.checkmark}>
                        <Check size={20} />
                      </div>
                    )}
                  </div>
                  <div className={styles.info}>
                    <span className={styles.title}>
                      {creative.articleTitle || 'Sem artigo'}
                    </span>
                    <div className={styles.meta}>
                      <span>{creative.format}</span>
                      {creative.style && (
                        <>
                          <span className={styles.separator}>•</span>
                          <span>{STYLE_LABELS[creative.style] || creative.style}</span>
                        </>
                      )}
                    </div>
                    <div className={styles.cardFooter}>
                      <span className={styles.date}>
                        <Calendar size={12} /> {formatDate(creative.createdAt)}
                      </span>
                      <span className={styles.modelBadge} title={creative.model}>
                        {formatModelName(creative.model)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

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
                  {pagination.page} / {pagination.totalPages}
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

        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
          >
            Usar {selectedIds.size} criativo{selectedIds.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
