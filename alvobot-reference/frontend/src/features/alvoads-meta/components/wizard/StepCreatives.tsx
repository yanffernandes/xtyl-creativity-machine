import { useState, useCallback, useEffect, useId, useRef, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { Button, Modal } from '@/shared/components'
import { ConceptSelector } from './ConceptSelector'
import { CreativeLibraryModal } from './CreativeLibraryModal'
import { CreativeSlotCard } from './CreativeSlotCard' // T080: Real-time streaming cards
import { ModeToggle } from './ModeToggle'
import styles from './StepCreatives.module.css'
import { useCreditsPreview, useDetectNiche } from '../../api/useCreatives'
import { useStreamingCreatives } from '../../hooks/useStreamingCreatives' // T080: Streaming hook
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import type { ImageFormat, GeneratedImage, GeneratedImageWithConcept, LibraryCreative, GenerationMode, ConceptSelection } from '../../types/creative'

// Icons (inline SVG for simplicity)
const ImageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21,15 16,10 5,21" />
  </svg>
)

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4l12.8-12.8" />
  </svg>
)

const AlertCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

// T027: Icon for concept badge
const TagIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
)


// T059: AI Model icon for model rotation badge
const CpuIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </svg>
)

// T059: Format model name for display
// FR-002: Gemini 3 Pro (OpenRouter), Nano Banana Pro e GPT Image 1.5 (Replicate)
function formatModelName(model: string): string {
  // Handle provider/model format: "replicate/openai/gpt-image-1.5"
  const modelPart = model.includes('/') ? model.split('/').pop() || model : model
  // Remove "(fallback)" suffix if present
  const cleanModel = modelPart.replace(/\s*\(fallback\)$/i, '')

  // Map models to friendly names (FR-002)
  const modelMap: Record<string, string> = {
    'gemini-3-pro-image-preview': 'Gemini 3 Pro',
    'nano-banana-pro': 'Nano Banana Pro',
    'gpt-image-1.5': 'GPT Image 1.5',
  }

  return modelMap[cleanModel] || cleanModel.split('-').slice(0, 2).join(' ')
}

export function StepCreatives() {
  const workspaceId = useWorkspaceId()
  const queryClient = useQueryClient()

  const {
    selectedArticles,
    imageConfig,
    setImageConfig,
    generatedImages,
    setGeneratedImages,
    isGeneratingImages,
    setIsGeneratingImages,
    generationProgress,
    setGenerationProgress,
    generationError,
    setGenerationError,
    getRequiredImageCount,
    markStepCompleted,
    markStepIncomplete,
    targeting,
    // T027: Diversity tracking from store
    setDiversityMetrics,
    setDetectedNiche,
    // T033-T039: Mode and concept selection from store
    setConceptSelections,
    validateConceptSelections,
  } = useMetaAdsWizardStore()

  // T038: Get generation mode and concept selections from imageConfig
  const generationMode = imageConfig.generationMode || 'free'
  const conceptSelections = useMemo(() => imageConfig.conceptSelections || [], [imageConfig.conceptSelections])

  // T039: Detect niche for showing specialized concepts
  const detectNicheMutation = useDetectNiche()
  const [localDetectedNiche, setLocalDetectedNiche] = useState<string>('generic')

  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ url: string; model?: string; concept?: string; index: number } | null>(null)
  const formatSelectId = useId()
  const directionsId = useId()
  const generateSectionRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to generate button when preset mode selections are complete
  const handleConceptSelectionsComplete = useCallback(() => {
    // Small delay to ensure the UI has updated
    setTimeout(() => {
      generateSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 100)
  }, [])

  // T080: Real-time streaming generation hook
  const streaming = useStreamingCreatives({
    onComplete: (results) => {
      // Invalidate library queries
      queryClient.invalidateQueries({ queryKey: ['meta-creatives'] })

      // Update wizard store with final images from streaming slots
      const completedImages = streaming.slots
        .filter((s) => s.status === 'completed')
        .map((s) => ({
          id: s.libraryId!,
          articleId: s.articleId,
          imageUrl: s.imageUrl!,
          storagePath: s.storagePath!,
          model: s.modelUsed!,
          style: 'photorealistic' as const,
          promptUsed: s.promptUsed || '',
          format: imageConfig.format,
          status: 'completed' as const,
          adsetIndex: s.index,
          conceptUsed: s.conceptName ? { name: s.conceptName, slug: s.conceptSlug!, id: '' } : undefined,
          backgroundStyle: s.backgroundStyle,
        }))

      // Deduplicate by id to prevent React key warnings
      const existingIds = new Set(generatedImages.map(img => img.id))
      const newImages = completedImages.filter(img => !existingIds.has(img.id))
      setGeneratedImages([...generatedImages, ...newImages])

      if (streaming.diversity) {
        setDiversityMetrics({
          ...streaming.diversity,
          totalGenerated: results.totalGenerated,
          meetsThreshold: streaming.diversity.diversityScore >= 70,
        })
      }

      setIsGeneratingImages(false)
    },
    onError: (error) => {
      setGenerationError(error.message)
      setIsGeneratingImages(false)
    },
  })

  // Calculate required image count
  const requiredImageCount = getRequiredImageCount()

  // Credits preview - use workspace credits if available
  const { data: creditsPreview, isLoading: isLoadingCredits } = useCreditsPreview(
    { imageCount: requiredImageCount, generateAdCopy: true, workspaceId: workspaceId || undefined },
    requiredImageCount > 0
  )

  const targetingPayload = useMemo(() => targeting
    ? {
        countries: targeting.countries,
        languages: targeting.languages,
      }
    : undefined, [targeting])

  // Handle format change
  const handleFormatChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setImageConfig({ format: e.target.value as ImageFormat })
    },
    [setImageConfig]
  )

  // Handle user directions change
  const handleDirectionsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setImageConfig({ userDirections: e.target.value })
    },
    [setImageConfig]
  )

  // T038: Handle mode change
  const handleModeChange = useCallback(
    (mode: GenerationMode) => {
      setImageConfig({ generationMode: mode })
      // Clear concept selections when switching to free mode
      if (mode === 'free') {
        setConceptSelections([])
      }
    },
    [setImageConfig, setConceptSelections]
  )

  // T038: Handle concept selections change
  const handleConceptSelectionsChange = useCallback(
    (selections: ConceptSelection[]) => {
      setConceptSelections(selections)
    },
    [setConceptSelections]
  )

  // T039: Detect niche when articles change
  useEffect(() => {
    if (selectedArticles.length > 0) {
      const articlesForNicheDetection = selectedArticles.map((article) => ({
        id: article.id,
        title: article.title || '',
        keyword: article.keyword_used || '',
        excerpt: article.excerpt || '',
      }))

      detectNicheMutation.mutate(
        { articles: articlesForNicheDetection },
        {
          onSuccess: (result) => {
            setLocalDetectedNiche(result.detectedNiche)
            setDetectedNiche(result.detectedNiche)
          },
        }
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticles.length]) // Only run when articles count changes

  // T039: Check if preset mode selections are valid
  const isPresetModeValid = generationMode === 'free' || validateConceptSelections()

  // T080: Generate images using real-time SSE streaming
  // Shows each image as it's generated for better UX
  const handleGenerate = useCallback(async () => {
    if (selectedArticles.length === 0) return

    // Calculate how many images we still need
    const existingCompletedCount = generatedImages.filter((img) => img.status === 'completed').length
    const imagesToGenerate = Math.max(0, requiredImageCount - existingCompletedCount)

    if (imagesToGenerate === 0) return

    setIsGeneratingImages(true)
    setGenerationError(null)
    setGenerationProgress(0, imagesToGenerate)

    const articlesContext = selectedArticles.map((article) => {
      // Extract country from keyword_snapshot if available
      let country: string | undefined
      if (article.keyword_snapshot) {
        const snapshot =
          typeof article.keyword_snapshot === 'string'
            ? JSON.parse(article.keyword_snapshot)
            : article.keyword_snapshot
        country = snapshot?.country
      }

      return {
        id: article.id,
        title: article.title || '',
        keyword: article.keyword_used || '',
        excerpt: article.excerpt || '',
        language: article.language, // Pass source language for creative generation
        country, // Pass country for localization (currency, etc.)
      }
    })

    // Start streaming generation
    streaming.startGeneration({
      articles: articlesContext,
      count: imagesToGenerate,
      mode: generationMode || 'free',
      conceptSelections: generationMode === 'preset' ? conceptSelections : undefined,
      format: imageConfig.format,
      userDirections: imageConfig.userDirections,
      targeting: targetingPayload,
      workspaceId: workspaceId || undefined,
    })
  }, [
    selectedArticles,
    requiredImageCount,
    generatedImages,
    imageConfig,
    generationMode,
    conceptSelections,
    setIsGeneratingImages,
    setGenerationError,
    setGenerationProgress,
    targetingPayload,
    workspaceId,
    streaming,
  ])

  // Cancel generation - T080: Use streaming cancel
  const handleCancel = useCallback(() => {
    streaming.cancel()
    setIsGeneratingImages(false)
  }, [streaming, setIsGeneratingImages])

  // Handle library selection (convert LibraryCreative to GeneratedImage)
  const handleLibrarySelect = useCallback((libraryCreatives: LibraryCreative[]) => {
    const images: GeneratedImage[] = libraryCreatives.map((lc, index) => ({
      id: lc.id,
      articleId: lc.articleId || 0,
      imageUrl: lc.imageUrl,
      storagePath: '',
      model: lc.model,
      style: lc.style || 'photorealistic',
      promptUsed: lc.promptUsed || '',
      format: lc.format,
      status: 'completed' as const,
      adsetIndex: index,
      libraryId: lc.id,
      createdAt: lc.createdAt,
    }))

    // Add library images to generated images (without consuming credits)
    // Deduplicate by id to prevent React key warnings
    const existingIds = new Set(generatedImages.map(img => img.id))
    const newImages = images.filter(img => !existingIds.has(img.id))
    setGeneratedImages([...generatedImages, ...newImages])
    setIsLibraryOpen(false)
  }, [generatedImages, setGeneratedImages])

  // Count completed images
  const completedImagesCount = generatedImages.filter((img) => img.status === 'completed').length
  const remainingImagesCount = requiredImageCount - completedImagesCount

  // Check if can proceed - need ALL required images
  const canProceed = completedImagesCount >= requiredImageCount

  // Mark step as completed only when we have ALL required images
  useEffect(() => {
    if (canProceed) {
      markStepCompleted('creative_ai')
    } else {
      markStepIncomplete('creative_ai')
    }
  }, [canProceed, markStepCompleted, markStepIncomplete])

  // Calculate progress percentage
  const progressPercentage =
    generationProgress.total > 0
      ? (generationProgress.current / generationProgress.total) * 100
      : 0

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Criativos por IA</h2>
        <p className={styles.description}>
          Configure e gere imagens automaticamente usando inteligência artificial.
          Cada AdSet receberá uma imagem única com estilo variado.
        </p>
      </div>

      {/* T051: Niche Indicator Banner - shows before generation */}
      {localDetectedNiche && localDetectedNiche !== 'generic' && !isGeneratingImages && generatedImages.length === 0 && (
        <div className={styles.nicheIndicator}>
          <SparkleIcon />
          <div className={styles.nicheIndicatorContent}>
            <span className={styles.nicheIndicatorTitle}>
              Nicho detectado: <strong style={{ textTransform: 'capitalize' }}>{localDetectedNiche}</strong>
            </span>
            <span className={styles.nicheIndicatorDescription}>
              {localDetectedNiche === 'financial'
                ? 'Templates especializados para crédito/empréstimo serão aplicados automaticamente.'
                : localDetectedNiche === 'jobs'
                  ? 'Conceitos otimizados para vagas de emprego serão sugeridos.'
                  : localDetectedNiche === 'health'
                    ? 'Estilos visuais adequados para saúde e bem-estar serão utilizados.'
                    : 'Conceitos otimizados para e-commerce serão aplicados.'
              }
            </span>
          </div>
        </div>
      )}

      {/* Configuration Section */}
      <div className={styles.configSection}>
        <div className={styles.configRow}>
          {/* Format Selection */}
          <div className={styles.configField}>
            <label className={styles.configLabel} htmlFor={formatSelectId}>Formato da Imagem</label>
            <select
              id={formatSelectId}
              className={styles.configSelect}
              value={imageConfig.format}
              onChange={handleFormatChange}
              disabled={isGeneratingImages}
            >
              <option value="1:1">1:1 - Quadrado (Feed)</option>
              <option value="9:16">9:16 - Vertical (Stories)</option>
              <option value="16:9">16:9 - Paisagem</option>
            </select>
          </div>
        </div>

        {/* User Directions */}
        <div className={styles.configField}>
          <label className={styles.configLabel} htmlFor={directionsId}>
            Direcionamentos (opcional)
          </label>
          <textarea
            id={directionsId}
            className={styles.directionsInput}
            value={imageConfig.userDirections || ''}
            onChange={handleDirectionsChange}
            placeholder="Ex: Usar tons de azul, incluir pessoas sorrindo, estilo moderno..."
            maxLength={500}
            disabled={isGeneratingImages}
          />
        </div>

        {/* Credits Preview */}
        {creditsPreview && (
          <div className={styles.creditsPreview}>
            <div className={styles.creditsInfo}>
              <span className={styles.creditsLabel}>
                {requiredImageCount} imagens ({requiredImageCount * 5} créditos)
              </span>
              <span
                className={`${styles.creditsValue} ${
                  !creditsPreview.hasSufficientCredits ? styles.creditsInsufficient : ''
                }`}
              >
                Total: {creditsPreview.totalCredits} créditos
              </span>
              <span className={styles.balanceInfo}>
                Saldo disponível: {creditsPreview.userBalance} créditos
              </span>
            </div>
            {!creditsPreview.hasSufficientCredits && (
              <Button variant="secondary" size="sm">
                Comprar créditos
              </Button>
            )}
          </div>
        )}

        {/* T038: Mode Toggle */}
        <ModeToggle
          value={generationMode}
          onChange={handleModeChange}
          disabled={isGeneratingImages}
        />
      </div>

      {/* T039: Concept Selector - only visible in preset mode */}
      {generationMode === 'preset' && (
        <div className={styles.configSection}>
          <ConceptSelector
            niche={localDetectedNiche as 'generic' | 'financial' | 'jobs' | 'health' | 'ecommerce'}
            selections={conceptSelections}
            requiredCount={requiredImageCount}
            onSelectionsChange={handleConceptSelectionsChange}
            disabled={isGeneratingImages}
            onComplete={handleConceptSelectionsComplete}
          />
        </div>
      )}

      {/* Generate Section - show when we still need more images */}
      {!isGeneratingImages && remainingImagesCount > 0 && (
        <div ref={generateSectionRef} className={styles.generateSection}>
          {/* Status indicator */}
          {completedImagesCount > 0 && (
            <div className={styles.statusBanner}>
              <AlertCircleIcon />
              <span>
                Você tem <strong>{completedImagesCount}</strong> de <strong>{requiredImageCount}</strong> imagens.
                Faltam <strong>{remainingImagesCount}</strong> para completar.
              </span>
            </div>
          )}

          <div className={styles.generateButtons}>
            <button
              className={styles.generateButton}
              onClick={handleGenerate}
              disabled={
                selectedArticles.length === 0 ||
                !creditsPreview?.hasSufficientCredits ||
                isLoadingCredits ||
                !isPresetModeValid
              }
            >
              <SparkleIcon />
              {completedImagesCount > 0
                ? `Gerar ${remainingImagesCount} Imagens Restantes`
                : `Gerar ${requiredImageCount} Imagens por IA`
              }
            </button>
            <button
              className={styles.libraryButton}
              onClick={() => setIsLibraryOpen(true)}
            >
              <FolderIcon />
              {completedImagesCount > 0
                ? `Adicionar da Biblioteca (${remainingImagesCount})`
                : 'Usar da Biblioteca'
              }
            </button>
          </div>
          {selectedArticles.length === 0 && (
            <span className={styles.balanceInfo}>
              Selecione artigos no passo anterior para gerar imagens
            </span>
          )}
          {generationMode === 'preset' && !isPresetModeValid && selectedArticles.length > 0 && (
            <span className={styles.balanceInfo} style={{ color: 'var(--color-warning)' }}>
              Configure os conceitos acima para atingir {requiredImageCount} imagens
            </span>
          )}
          <span className={styles.libraryHint}>
            Use imagens da biblioteca sem gastar créditos
          </span>
        </div>
      )}

      {/* T080: Real-time Streaming Progress Section */}
      {isGeneratingImages && streaming.slots.length > 0 && (
        <div className={styles.streamingSection}>
          <div className={styles.streamingHeader}>
            <div className={styles.streamingStatus}>
              <SparkleIcon />
              <span className={styles.streamingTitle}>Gerando criativos...</span>
            </div>
            <div className={styles.streamingProgress}>
              <span className={styles.streamingCount}>
                {streaming.totalGenerated} de {streaming.slots.length} concluídas
              </span>
              {streaming.totalFailed > 0 && (
                <span className={styles.streamingFailed}>
                  ({streaming.totalFailed} falhou)
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${streaming.slots.length > 0 ? (streaming.totalGenerated / streaming.slots.length) * 100 : 0}%` }}
            />
          </div>

          {/* Streaming Grid */}
          <div className={styles.streamingGrid}>
            {streaming.slots.map((slot) => (
              <CreativeSlotCard
                key={slot.imageId}
                slot={slot}
                onRetry={(imageId) => streaming.retryImage(imageId)}
                onCheckPending={(pendingId) => streaming.checkPending(pendingId)}
                onImageClick={(s) => s.imageUrl && setPreviewImage({
                  url: s.imageUrl,
                  model: s.modelUsed,
                  concept: s.conceptName,
                  index: s.index,
                })}
                isRetrying={streaming.isRetrying}
                isCheckingPending={streaming.isCheckingPending}
              />
            ))}
          </div>

          <button className={styles.cancelButton} onClick={handleCancel}>
            Cancelar Geração
          </button>
        </div>
      )}

      {/* Legacy Progress Section - fallback for non-streaming generation */}
      {isGeneratingImages && streaming.slots.length === 0 && (
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressText}>Gerando imagens...</span>
            <span className={styles.progressCount}>
              {generationProgress.current} de {generationProgress.total}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <button className={styles.cancelButton} onClick={handleCancel}>
            Cancelar
          </button>
        </div>
      )}

      {/* Error Display */}
      {generationError && (
        <div className={styles.errorAlert}>
          <AlertCircleIcon />
          <span className={styles.errorText}>{generationError}</span>
        </div>
      )}

      {/* Results Summary */}
      {!isGeneratingImages && generatedImages.length > 0 && (
        <div className={`${styles.resultsSummary} ${canProceed ? styles.resultsComplete : styles.resultsIncomplete}`}>
          {canProceed ? <CheckCircleIcon /> : <AlertCircleIcon />}
          <span className={styles.resultsText}>
            <strong>{completedImagesCount}</strong> de <strong>{requiredImageCount}</strong> imagens.
            {' '}
            {canProceed ? (
              <span style={{ color: 'var(--color-success)' }}>Pronto para avançar!</span>
            ) : (
              <span style={{ color: 'var(--color-warning)' }}>
                Faltam {remainingImagesCount} imagens.
              </span>
            )}
            {generatedImages.filter((img) => img.status === 'failed').length > 0 && (
              <span style={{ color: 'var(--color-error)' }}>
                {' '}({generatedImages.filter((img) => img.status === 'failed').length} falharam)
              </span>
            )}
          </span>
        </div>
      )}

      {/* T069: Diversity Preview - hidden for now, will be useful when we add more diversity features
      {!isGeneratingImages && diversityMetrics && diversityMetrics.totalGenerated > 0 && (
        <DiversityPreview
          metrics={diversityMetrics}
          conceptsUsed={diversityData.conceptsUsed}
          modelsUsed={diversityData.modelsUsed}
          backgroundsUsed={diversityData.backgroundsUsed}
          detectedNiche={detectedNiche}
          generationMode={generationMode}
        />
      )}
      */}

      {/* T027: Image Grid with Concept Badges */}
      {!isGeneratingImages && generatedImages.length > 0 && (
        <div className={styles.imageGrid}>
          {generatedImages.filter(img => img.status === 'completed').map((image) => {
            const imageWithConcept = image as GeneratedImageWithConcept
            return (
              <div key={image.id} className={styles.imageCard}>
                <button
                  type="button"
                  className={styles.imagePreviewButton}
                  onClick={() => setPreviewImage({
                    url: image.imageUrl,
                    model: image.model,
                    concept: imageWithConcept.conceptUsed?.name,
                    index: image.adsetIndex,
                  })}
                  title="Clique para ampliar"
                >
                  <img
                    src={image.imageUrl}
                    alt={`Criativo ${image.adsetIndex + 1}`}
                    className={styles.imagePreview}
                  />
                </button>
                <div className={styles.imageInfo}>
                  {imageWithConcept.conceptUsed && (
                    <span className={styles.conceptBadge}>
                      <TagIcon />
                      {imageWithConcept.conceptUsed.name}
                    </span>
                  )}
                  {imageWithConcept.backgroundStyle && (
                    <span className={styles.backgroundBadge}>
                      {imageWithConcept.backgroundStyle}
                    </span>
                  )}
                  {/* T059: Display model badge for model rotation tracking */}
                  {image.model && (
                    <span className={styles.modelBadge}>
                      <CpuIcon />
                      {formatModelName(image.model)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!isGeneratingImages && generatedImages.length === 0 && selectedArticles.length > 0 && (
        <div className={styles.emptyState}>
          <ImageIcon />
          <h3 className={styles.emptyTitle}>Nenhuma imagem gerada ainda</h3>
          <p className={styles.emptyDescription}>
            Clique no botão acima para gerar imagens usando IA.
            Cada artigo receberá imagens únicas com estilos variados.
          </p>
        </div>
      )}

      {/* Library Modal */}
      <CreativeLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={handleLibrarySelect}
        maxSelection={Math.max(0, remainingImagesCount)}
        formatFilter={imageConfig.format}
        title={`Selecionar da Biblioteca (máx. ${Math.max(0, remainingImagesCount)})`}
      />

      {/* Image Preview Modal */}
      <Modal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title={`Criativo ${previewImage ? previewImage.index + 1 : ''}`}
        size="lg"
      >
        {previewImage && (
          <div className={styles.previewModal}>
            <img
              src={previewImage.url}
              alt={`Criativo ${previewImage.index + 1}`}
              className={styles.previewModalImage}
            />
            <div className={styles.previewModalInfo}>
              {previewImage.concept && (
                <span className={styles.previewModalBadge}>
                  <TagIcon />
                  {previewImage.concept}
                </span>
              )}
              {previewImage.model && (
                <span className={styles.previewModalBadge}>
                  <CpuIcon />
                  {formatModelName(previewImage.model)}
                </span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
