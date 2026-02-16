import { useCallback, useState, useRef, useEffect } from 'react'
import { Spinner } from '@/shared/components/Spinner'
import styles from './CreativeCard.module.css'
import type { GeneratedImage, CreativeStatus } from '../../types/creative'

// Icons
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const AlertTriangleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const ImageIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21,15 16,10 5,21" />
  </svg>
)

interface CreativeCardProps {
  image: GeneratedImage
  articleTitle?: string
  onApprove: (imageId: string) => void
  onRegenerate: (imageId: string, customDirections?: string) => void
  isRegenerating?: boolean
  disabled?: boolean
  onOpenEditModal?: (imageId: string, imageUrl: string) => void
}

const STATUS_LABELS: Record<CreativeStatus, string> = {
  pending: 'Pendente',
  generating: 'Gerando...',
  completed: 'Concluído',
  failed: 'Falhou',
  approved: 'Aprovado',
  rejected: 'Refazer',
}

const formatModelBadge = (model?: string) => {
  if (!model) return null
  const normalized = model.toLowerCase()
  if (normalized.includes('dall-e')) return 'DALL-E'
  if (normalized.includes('imagen')) return 'Imagen'
  if (normalized.includes('gemini')) return 'Gemini'
  if (normalized.includes('/')) {
    const parts = model.split('/')
    return parts[parts.length - 1]
  }
  return model
}

export function CreativeCard({
  image,
  articleTitle,
  onApprove,
  onRegenerate,
  isRegenerating = false,
  disabled = false,
  onOpenEditModal,
}: CreativeCardProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDropdown])

  const handleApprove = useCallback(() => {
    if (!disabled) {
      onApprove(image.id)
    }
  }, [image.id, onApprove, disabled])

  const handleRegenerate = useCallback(() => {
    if (!disabled && !isRegenerating) {
      onRegenerate(image.id)
      setShowDropdown(false)
    }
  }, [image.id, onRegenerate, disabled, isRegenerating])

  const handleRegenerateWithEdit = useCallback(() => {
    if (!disabled && !isRegenerating && onOpenEditModal) {
      onOpenEditModal(image.id, image.imageUrl)
      setShowDropdown(false)
    }
  }, [image.id, image.imageUrl, onOpenEditModal, disabled, isRegenerating])

  // Determine card class based on status
  const cardStatusClass =
    image.status === 'approved'
      ? styles.cardApproved
      : image.status === 'rejected'
      ? styles.cardPending
      : image.status === 'pending'
      ? styles.cardPending
      : image.status === 'generating'
      ? styles.cardGenerating
      : image.status === 'failed'
      ? styles.cardFailed
      : ''

  // Determine status dot class
  const statusDotClass =
    image.status === 'approved'
      ? styles.statusDotApproved
      : image.status === 'rejected'
      ? styles.statusDotPending
      : image.status === 'pending'
      ? styles.statusDotPending
      : image.status === 'generating'
      ? styles.statusDotGenerating
      : styles.statusDotFailed

  const isApproved = image.status === 'approved'
  const isFailed = image.status === 'failed'
  const isGenerating = image.status === 'generating'

  return (
    <div className={`${styles.card} ${cardStatusClass}`}>
      {/* Image Container */}
      <div className={styles.imageContainer}>
        {isFailed ? (
          <div className={styles.errorContainer}>
            <AlertTriangleIcon />
            <span className={styles.errorText}>
              {image.error || 'Erro ao gerar imagem'}
            </span>
          </div>
        ) : image.imageUrl ? (
          <img
            src={image.imageUrl}
            alt={`Creative for ${articleTitle || 'article'}`}
            className={styles.image}
            loading="lazy"
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <ImageIcon />
          </div>
        )}

        {/* Status Badge */}
        <div className={styles.statusBadge}>
          <span className={`${styles.statusDot} ${statusDotClass}`} />
          {STATUS_LABELS[image.status]}
        </div>

        {/* Model Badge */}
        {image.model && (
          <div className={styles.modelBadge}>
            {formatModelBadge(image.model)}
          </div>
        )}

        {/* Loading Overlay */}
        {(isGenerating || isRegenerating) && (
          <div className={styles.loadingOverlay}>
            <Spinner size="lg" />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className={styles.info}>
        {articleTitle && (
          <span className={styles.articleTitle} title={articleTitle}>
            {articleTitle}
          </span>
        )}

        <div className={styles.metadata}>
          {image.style && (
            <span className={styles.metaTag}>
              {image.style.charAt(0).toUpperCase() + image.style.slice(1)}
            </span>
          )}
          {image.format && (
            <span className={styles.metaTag}>{image.format}</span>
          )}
          <span className={styles.metaTag}>AdSet #{image.adsetIndex + 1}</span>
        </div>
      </div>

      {/* Actions */}
      {!isGenerating && !isFailed && (
        <div className={styles.actions}>
          <button
            className={`${styles.actionButton} ${styles.approveButton} ${
              isApproved ? styles.approveButtonActive : ''
            }`}
            onClick={handleApprove}
            disabled={disabled || isRegenerating}
            title="Aprovar imagem"
          >
            <CheckIcon />
            {isApproved ? 'Aprovado' : 'Aprovar'}
          </button>

          {/* Regenerate Dropdown */}
          <div className={styles.regenerateDropdownContainer} ref={dropdownRef}>
            <button
              className={`${styles.actionButton} ${styles.regenerateButton}`}
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={disabled || isRegenerating}
              title="Opções de regeneração"
            >
              {isRegenerating ? <Spinner size="sm" /> : <RefreshIcon />}
              <ChevronDownIcon />
            </button>
            {showDropdown && !isRegenerating && (
              <div className={styles.regenerateDropdown}>
                <button
                  className={styles.dropdownItem}
                  onClick={handleRegenerate}
                  disabled={disabled}
                >
                  <RefreshIcon />
                  <span>Regenerar</span>
                </button>
                {onOpenEditModal && (
                  <button
                    className={styles.dropdownItem}
                    onClick={handleRegenerateWithEdit}
                    disabled={disabled}
                  >
                    <EditIcon />
                    <span>Editar e Regenerar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Failed State - Retry Button */}
      {isFailed && (
        <div className={styles.actions}>
          <div className={styles.regenerateDropdownContainer} ref={dropdownRef} style={{ flex: 1 }}>
            <button
              className={`${styles.actionButton} ${styles.regenerateButton}`}
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={disabled || isRegenerating}
              style={{ width: '100%' }}
            >
              {isRegenerating ? <Spinner size="sm" /> : <RefreshIcon />}
              Tentar novamente
              <ChevronDownIcon />
            </button>
            {showDropdown && !isRegenerating && (
              <div className={styles.regenerateDropdown}>
                <button
                  className={styles.dropdownItem}
                  onClick={handleRegenerate}
                  disabled={disabled}
                >
                  <RefreshIcon />
                  <span>Mesmo estilo</span>
                </button>
                {onOpenEditModal && (
                  <button
                    className={styles.dropdownItem}
                    onClick={handleRegenerateWithEdit}
                    disabled={disabled}
                  >
                    <EditIcon />
                    <span>Editar e tentar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
