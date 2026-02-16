/**
 * CreativeSlotCard Component
 * Displays individual creative slot with real-time status updates
 */

import { memo } from 'react'
import styles from './CreativeSlotCard.module.css'
import type { CreativeSlot } from '../../types/creative'

// Icons
const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)


interface CreativeSlotCardProps {
  slot: CreativeSlot
  onRetry?: (imageId: string) => void
  onCheckPending?: (pendingId: string) => void
  onImageClick?: (slot: CreativeSlot) => void
  isRetrying?: boolean
  isCheckingPending?: boolean
}

function formatModelName(model: string): string {
  // Extract model part from provider/model format
  const modelPart = model.includes('/') ? model.split('/').pop() || model : model
  const cleanModel = modelPart.replace(/\s*\(fallback\)$/i, '')

  // Map common model names to display names
  const modelMap: Record<string, string> = {
    'gemini-3-pro-image-preview': 'Gemini 3 Pro',
    'nano-banana-pro': 'Nano Banana Pro',
    'gpt-image-1.5': 'GPT Image 1.5',
    'imagen-3': 'Imagen 3',
    'dall-e-3': 'DALL-E 3',
    'flux-pro': 'Flux Pro',
    'flux-schnell': 'Flux Schnell',
    'ideogram-v2': 'Ideogram v2',
  }

  return modelMap[cleanModel] || cleanModel.split('-').slice(0, 2).join(' ')
}

function getStatusText(slot: CreativeSlot): string {
  switch (slot.status) {
    case 'queued':
      return 'Na fila...'
    case 'generating':
      return 'Gerando...'
    case 'retrying':
      return `Tentando novamente (${slot.retryAttempt}/${slot.maxRetryAttempts})...`
    case 'completed':
      return 'Concluído'
    case 'failed':
      return slot.isPending ? 'Verificar status' : 'Falhou'
    default:
      return ''
  }
}

export const CreativeSlotCard = memo(function CreativeSlotCard({
  slot,
  onRetry,
  onCheckPending,
  onImageClick,
  isRetrying,
  isCheckingPending,
}: CreativeSlotCardProps) {
  const isLoading =
    slot.status === 'queued' || slot.status === 'generating' || slot.status === 'retrying'
  const isError = slot.status === 'failed'
  const isCompleted = slot.status === 'completed'
  const isPending = slot.isPending && slot.pendingId

  return (
    <div
      className={`${styles.card} ${styles[`status${slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}`]}`}
    >
      {/* Image area */}
      <div className={styles.imageArea}>
        {isCompleted && slot.imageUrl ? (
          <button
            type="button"
            className={styles.imageButton}
            onClick={() => onImageClick?.(slot)}
            title="Clique para ampliar"
          >
            <img src={slot.imageUrl} alt={`Criativo ${slot.index + 1}`} className={styles.image} />
          </button>
        ) : (
          <div className={`${styles.skeleton} ${isLoading ? styles.skeletonAnimated : ''}`}>
            {isError && (
              <div className={styles.errorOverlay}>
                <AlertIcon />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusInfo}>
          {/* Status icon */}
          <span className={styles.statusIcon}>
            {isLoading && <span className={styles.spinner} />}
            {isCompleted && <CheckIcon />}
            {isError && !isPending && <AlertIcon />}
            {isPending && <ClockIcon />}
          </span>

          {/* Status text */}
          <span className={styles.statusText}>{getStatusText(slot)}</span>
        </div>

        <div className={styles.statusRight}>
          {/* Model badge (only when completed) */}
          {isCompleted && slot.modelUsed && (
            <span className={styles.modelBadge} title={slot.modelUsed}>
              {formatModelName(slot.modelUsed)}
            </span>
          )}

          {/* Action button */}
          {isError && !isPending && onRetry && (
            <button
              className={styles.retryButton}
              onClick={() => onRetry(slot.imageId)}
              disabled={isRetrying}
              title="Tentar novamente"
            >
              <RefreshIcon />
            </button>
          )}

          {isPending && onCheckPending && slot.pendingId && (
            <button
              className={styles.checkButton}
              onClick={() => onCheckPending(slot.pendingId!)}
              disabled={isCheckingPending}
              title="Verificar status"
            >
              <RefreshIcon />
            </button>
          )}
        </div>
      </div>

      {/* Concept badge */}
      {slot.conceptName && <div className={styles.conceptBadge}>{slot.conceptName}</div>}

      {/* Error message */}
      {isError && slot.error && <div className={styles.errorMessage}>{slot.error}</div>}

      {/* Index indicator */}
      <div className={styles.indexBadge}>{slot.index + 1}</div>
    </div>
  )
})
