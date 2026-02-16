import { useState } from 'react'
import {
  AlertCircle,
  Loader2,
  Check,
  Image,
  FolderOpen,
  Wand2,
  X,
  RefreshCw,
} from 'lucide-react'
import { Button, Input } from '@/shared/components'
import styles from './WizardSteps.module.css'
import { useGenerateAiImage } from '../../api/mutations'
import { useDriveFiles } from '../../api/queries'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import { validateDriveFolderUrl, extractDriveFolderId } from '../../utils/validation'
import type { DriveFile } from '../../types/campaign'

type CreativeMode = 'google_drive' | 'ai_generated'

export function CreativeStep() {
  const {
    creativeMode,
    driveFolderUrl,
    driveImages,
    aiGeneratedImages,
    setCreativeMode,
    setDriveFolderUrl,
    setDriveImages,
    addAiImage,
    removeAiImage,
    clearAiImages,
    markStepCompleted,
    markStepIncomplete,
  } = useMetaAdsWizardStore()

  const [aiPrompt, setAiPrompt] = useState('')
  const [driveUrlInput, setDriveUrlInput] = useState(driveFolderUrl || '')
  const [urlError, setUrlError] = useState('')

  // Extract folder ID from URL - convert null to undefined for useDriveFiles
  const folderId = driveFolderUrl ? (extractDriveFolderId(driveFolderUrl) ?? undefined) : undefined

  // Fetch drive files
  const {
    data: driveFilesData,
    isLoading: loadingDriveFiles,
    error: driveError,
    refetch: refetchDriveFiles,
  } = useDriveFiles(folderId)

  // AI image generation mutation
  const generateImageMutation = useGenerateAiImage()

  const handleModeChange = (mode: CreativeMode) => {
    setCreativeMode(mode)
    // Clear images when changing mode
    setDriveImages([])
    clearAiImages()
    if (mode === 'google_drive') {
      setAiPrompt('')
    } else {
      setDriveUrlInput('')
      setDriveFolderUrl('')
    }
  }

  const handleDriveUrlSubmit = () => {
    if (!driveUrlInput) {
      setUrlError('Por favor, insira uma URL')
      return
    }

    if (!validateDriveFolderUrl(driveUrlInput)) {
      setUrlError('URL inválida. Use uma URL de pasta pública do Google Drive.')
      return
    }

    setUrlError('')
    setDriveFolderUrl(driveUrlInput)
  }

  const handleDriveImageToggle = (file: DriveFile) => {
    const isSelected = driveImages.some((img) => img.id === file.id)
    // Get the display URL - prefer thumbnailUrl, then url, then webContentLink
    const displayUrl = file.thumbnailUrl || file.url || file.webContentLink || file.thumbnailLink

    let newDriveImages: DriveFile[]
    if (isSelected) {
      newDriveImages = driveImages.filter((img) => img.id !== file.id)
    } else {
      newDriveImages = [...driveImages, {
        id: file.id,
        name: file.name,
        url: displayUrl,
        thumbnailUrl: file.thumbnailUrl || file.thumbnailLink,
      }]
    }
    setDriveImages(newDriveImages)

    // Check if we have at least one image selected
    setTimeout(() => {
      const state = useMetaAdsWizardStore.getState()
      const hasImages = state.driveImages.length > 0 || state.aiGeneratedImages.length > 0
      if (hasImages) {
        markStepCompleted('creative')
      } else {
        markStepIncomplete('creative')
      }
    }, 0)
  }

  const handleGenerateAiImage = async () => {
    if (!aiPrompt) return

    try {
      // The mutation returns an array of AiGeneratedImage
      const images = await generateImageMutation.mutateAsync({
        prompt: aiPrompt,
        style: 'natural',
        aspectRatio: '1:1',
        count: 1,
      })

      // Add each generated image to the store
      if (images && images.length > 0) {
        images.forEach((image) => {
          addAiImage({
            id: image.id || `ai-${Date.now()}`,
            url: image.url,
            prompt: image.prompt || aiPrompt,
            createdAt: image.createdAt || new Date().toISOString(),
            approved: image.approved ?? true,
          })
        })
        setAiPrompt('')
        markStepCompleted('creative')
      }
    } catch (error) {
      console.error('Error generating image:', error)
    }
  }

  // driveFilesData is directly the array of DriveFile[]
  const availableDriveFiles = driveFilesData || []
  const hasCreatives = driveImages.length > 0 || aiGeneratedImages.length > 0

  return (
    <div className={styles.stepContent}>
      {/* Creative Mode Selection */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Fonte dos Criativos</h3>
        <p className={styles.sectionDescription}>
          Escolha de onde virão as imagens dos seus anúncios
        </p>

        <div className={styles.optionsGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <button
            type="button"
            className={`${styles.optionCard} ${creativeMode === 'google_drive' ? styles.selected : ''}`}
            onClick={() => handleModeChange('google_drive')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
              <div style={{
                padding: 'var(--space-2)',
                background: creativeMode === 'google_drive' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                color: creativeMode === 'google_drive' ? 'white' : 'var(--color-text-secondary)',
              }}>
                <FolderOpen size={24} />
              </div>
              <div>
                <span className={styles.optionLabel}>Google Drive</span>
                <span className={styles.optionDescription}>
                  Selecione imagens de uma pasta pública do Google Drive
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            className={`${styles.optionCard} ${creativeMode === 'ai_generated' ? styles.selected : ''}`}
            onClick={() => handleModeChange('ai_generated')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
              <div style={{
                padding: 'var(--space-2)',
                background: creativeMode === 'ai_generated' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                color: creativeMode === 'ai_generated' ? 'white' : 'var(--color-text-secondary)',
              }}>
                <Wand2 size={24} />
              </div>
              <div>
                <span className={styles.optionLabel}>IA (DALL-E)</span>
                <span className={styles.optionDescription}>
                  Gere imagens personalizadas usando inteligência artificial
                </span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Google Drive Mode */}
      {creativeMode === 'google_drive' && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Pasta do Google Drive</h3>
          <p className={styles.sectionDescription}>
            Cole a URL de uma pasta pública do Google Drive contendo suas imagens
          </p>

          <div className={styles.formGroup}>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Input
                value={driveUrlInput}
                onChange={(e) => setDriveUrlInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                error={urlError}
                style={{ flex: 1 }}
              />
              <Button onClick={handleDriveUrlSubmit}>
                Carregar
              </Button>
            </div>
            <span className={styles.hint}>
              A pasta deve estar configurada como "Qualquer pessoa com o link pode ver"
            </span>
          </div>

          {/* Drive Files */}
          {driveFolderUrl && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              {loadingDriveFiles ? (
                <div className={styles.loadingState}>
                  <Loader2 size={24} className={styles.spinner} />
                  <span>Carregando imagens...</span>
                </div>
              ) : driveError ? (
                <div className={styles.errorState}>
                  <AlertCircle size={24} />
                  <span>Erro ao carregar imagens. Verifique se a pasta está pública.</span>
                  <Button variant="outline" size="sm" onClick={() => refetchDriveFiles()}>
                    <RefreshCw size={16} />
                    Tentar novamente
                  </Button>
                </div>
              ) : availableDriveFiles.length === 0 ? (
                <div className={styles.emptyState}>
                  <Image size={32} className={styles.emptyIcon} />
                  <h4>Nenhuma imagem encontrada</h4>
                  <p>A pasta não contém imagens ou não está acessível.</p>
                </div>
              ) : (
                <div className={styles.creativeGrid}>
                  {availableDriveFiles.map((file) => {
                    const isSelected = driveImages.some((img) => img.id === file.id)

                    return (
                      <button
                        key={file.id}
                        type="button"
                        className={`${styles.creativeCard} ${isSelected ? styles.selected : ''}`}
                        onClick={() => handleDriveImageToggle(file)}
                      >
                        <img src={file.thumbnailUrl || file.url} alt={file.name} />
                        <div className={styles.creativeCardOverlay}>
                          <span className={styles.creativeCardName}>{file.name}</span>
                        </div>
                        {isSelected && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '24px',
                            height: '24px',
                            background: 'var(--color-primary)',
                            borderRadius: 'var(--radius-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <Check size={14} color="white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* AI Mode */}
      {creativeMode === 'ai_generated' && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Gerar Imagem com IA</h3>
          <p className={styles.sectionDescription}>
            Descreva a imagem que você deseja criar. Seja específico sobre cores, estilo e elementos.
          </p>

          <div className={styles.formGroup}>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ex: Uma foto profissional de um café gelado em um copo de vidro, com gelo e canudo de metal, fundo branco minimalista, iluminação de estúdio..."
              rows={4}
            />
            <Button
              onClick={handleGenerateAiImage}
              disabled={!aiPrompt || generateImageMutation.isPending}
            >
              {generateImageMutation.isPending ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Gerar Imagem
                </>
              )}
            </Button>
            <span className={styles.hint}>
              Cada imagem gerada consome 5 créditos
            </span>
          </div>

          {/* Generated AI Images */}
          {aiGeneratedImages.length > 0 && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <h4 className={styles.sectionSubtitle}>Imagens Geradas</h4>
              <div className={styles.creativeGrid}>
                {aiGeneratedImages.map((image) => (
                  <div key={image.id} className={styles.creativeCard} style={{ cursor: 'default' }}>
                    <img src={image.url} alt="AI Generated" />
                    <button
                      type="button"
                      onClick={() => removeAiImage(image.id)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        background: 'var(--color-error)',
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={14} color="white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Selected Creatives Summary */}
      {hasCreatives && (
        <section className={styles.section}>
          <div className={styles.selectionCounter}>
            <Image size={20} className={styles.selectionCounterIcon} />
            <div className={styles.selectionCounterText}>
              <strong>
                {driveImages.length + aiGeneratedImages.length}
              </strong>{' '}
              {driveImages.length + aiGeneratedImages.length === 1
                ? 'imagem selecionada'
                : 'imagens selecionadas'}
            </div>
            <div className={styles.selectionCounterActions}>
              <button
                type="button"
                className={styles.clearSelectionButton}
                onClick={() => {
                  setDriveImages([])
                  clearAiImages()
                  markStepIncomplete('creative')
                }}
              >
                <X size={14} />
                Limpar
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
