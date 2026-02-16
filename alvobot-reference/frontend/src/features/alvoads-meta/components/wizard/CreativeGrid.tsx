import { useState, useCallback, useMemo } from 'react'
import { CreativeCard } from './CreativeCard'
import styles from './CreativeGrid.module.css'
import { RegenerateEditModal } from './RegenerateEditModal'
import { useRegenerateImage } from '../../api/useCreatives'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import type { GeneratedImage } from '../../types/creative'

// Icons
const ImageIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21,15 16,10 5,21" />
  </svg>
)

type FilterType = 'all' | 'approved' | 'pending' | 'failed'

interface EditModalState {
  isOpen: boolean
  imageId: string | null
  imageUrl: string
}

export function CreativeGrid() {
  const {
    generatedImages,
    selectedArticles,
    approveImage,
    markForRegenerate,
    updateGeneratedImage,
    imageConfig,
  } = useMetaAdsWizardStore()

  const [filter, setFilter] = useState<FilterType>('all')
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set())
  const [editModal, setEditModal] = useState<EditModalState>({
    isOpen: false,
    imageId: null,
    imageUrl: '',
  })

  const regenerateMutation = useRegenerateImage()

  // Create article title lookup
  const articleTitleMap = useMemo(() => {
    const map = new Map<number, string>()
    selectedArticles.forEach((article) => {
      if (article.title) {
        map.set(article.id, article.title)
      }
    })
    return map
  }, [selectedArticles])

  // Filter images
  const filteredImages = useMemo(() => {
    if (filter === 'all') return generatedImages
    if (filter === 'approved') return generatedImages.filter((img) => img.status === 'approved')
    if (filter === 'pending')
      {return generatedImages.filter(
        (img) => img.status !== 'approved' && img.status !== 'failed'
      )}
    if (filter === 'failed') return generatedImages.filter((img) => img.status === 'failed')
    return generatedImages
  }, [generatedImages, filter])

  // Calculate stats
  const stats = useMemo(() => {
    const total = generatedImages.length
    const approved = generatedImages.filter((img) => img.status === 'approved').length
    const pending = generatedImages.filter(
      (img) => img.status !== 'approved' && img.status !== 'failed'
    ).length
    const failed = generatedImages.filter((img) => img.status === 'failed').length

    return { total, approved, pending, failed }
  }, [generatedImages])

  // Handlers
  const handleApprove = useCallback(
    (imageId: string) => {
      approveImage(imageId)
    },
    [approveImage]
  )

  const handleRegenerate = useCallback(
    async (imageId: string, customDirections?: string) => {
      const image = generatedImages.find((img) => img.id === imageId)
      if (!image) return

      setRegeneratingIds((prev) => new Set(prev).add(imageId))
      markForRegenerate(imageId)

      try {
        // Two modes:
        // 1. customDirections === undefined → "Regenerar" (reuse original prompt & model exactly)
        // 2. customDirections is string → "Editar e Regenerar" (original prompt + edit directions)
        const isReuseMode = customDirections === undefined

        const newImage = await regenerateMutation.mutateAsync({
          articleId: image.articleId,
          adsetIndex: image.adsetIndex,
          model: imageConfig.model,
          format: imageConfig.format,
          // Always pass original prompt and model when available
          ...(image.promptUsed && {
            originalPrompt: image.promptUsed,
            originalModel: image.model,
          }),
          // Mode 2: Also pass edit directions
          ...(!isReuseMode && {
            userDirections: customDirections,
          }),
        })

        // Update the image in the store
        updateGeneratedImage(imageId, {
          imageUrl: newImage.imageUrl,
          storagePath: newImage.storagePath,
          model: newImage.model,
          style: newImage.style as GeneratedImage['style'],
          promptUsed: newImage.promptUsed,
          status: 'completed',
          error: undefined,
        })
      } catch (error) {
        updateGeneratedImage(imageId, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Regeneration failed',
        })
      } finally {
        setRegeneratingIds((prev) => {
          const next = new Set(prev)
          next.delete(imageId)
          return next
        })
      }
    },
    [generatedImages, imageConfig, regenerateMutation, markForRegenerate, updateGeneratedImage]
  )

  // Modal handlers
  const handleOpenEditModal = useCallback((imageId: string, imageUrl: string) => {
    setEditModal({
      isOpen: true,
      imageId,
      imageUrl,
    })
  }, [])

  const handleCloseEditModal = useCallback(() => {
    setEditModal({
      isOpen: false,
      imageId: null,
      imageUrl: '',
    })
  }, [])

  const handleConfirmEdit = useCallback(
    (customDirections: string) => {
      if (editModal.imageId) {
        handleRegenerate(editModal.imageId, customDirections)
        handleCloseEditModal()
      }
    },
    [editModal.imageId, handleRegenerate, handleCloseEditModal]
  )

  return (
    <div className={styles.container}>
      {/* Filter Bar */}
      {generatedImages.length > 0 && (
        <div className={styles.filterBar}>
          <button
            className={`${styles.filterButton} ${filter === 'all' ? styles.filterButtonActive : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas ({stats.total})
          </button>
          <button
            className={`${styles.filterButton} ${
              filter === 'approved' ? styles.filterButtonActive : ''
            }`}
            onClick={() => setFilter('approved')}
          >
            Aprovadas ({stats.approved})
          </button>
          <button
            className={`${styles.filterButton} ${
              filter === 'pending' ? styles.filterButtonActive : ''
            }`}
            onClick={() => setFilter('pending')}
          >
            Pendentes ({stats.pending})
          </button>
          {stats.failed > 0 && (
            <button
              className={`${styles.filterButton} ${
                filter === 'failed' ? styles.filterButtonActive : ''
              }`}
              onClick={() => setFilter('failed')}
            >
              Falharam ({stats.failed})
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {filteredImages.length > 0 ? (
        <div className={styles.grid}>
          {filteredImages.map((image) => (
            <CreativeCard
              key={image.id}
              image={image}
              articleTitle={articleTitleMap.get(image.articleId)}
              onApprove={handleApprove}
              onRegenerate={handleRegenerate}
              isRegenerating={regeneratingIds.has(image.id)}
              onOpenEditModal={handleOpenEditModal}
            />
          ))}
        </div>
      ) : generatedImages.length === 0 ? (
        <div className={styles.emptyState}>
          <ImageIcon />
          <h3 className={styles.emptyTitle}>Nenhuma imagem gerada</h3>
          <p className={styles.emptyDescription}>
            Volte ao passo anterior para gerar imagens usando IA.
          </p>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <ImageIcon />
          <h3 className={styles.emptyTitle}>Nenhuma imagem neste filtro</h3>
          <p className={styles.emptyDescription}>
            Tente selecionar outro filtro para ver as imagens.
          </p>
        </div>
      )}

      {/* Edit and Regenerate Modal */}
      <RegenerateEditModal
        isOpen={editModal.isOpen}
        onClose={handleCloseEditModal}
        onConfirm={handleConfirmEdit}
        imageUrl={editModal.imageUrl}
        isLoading={editModal.imageId ? regeneratingIds.has(editModal.imageId) : false}
      />
    </div>
  )
}
