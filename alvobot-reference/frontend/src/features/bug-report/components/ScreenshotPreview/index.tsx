import { clsx } from 'clsx'
import { X, ZoomIn, RefreshCw, AlertCircle, Camera, Plus } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './ScreenshotPreview.module.css'
import { formatFileSize } from '../../utils/screenshot'

interface ScreenshotPreviewProps {
  dataUrl: string | null
  size?: number
  error?: string | null
  isCapturing?: boolean
  onCapture?: () => void
  onRetake?: () => void
  onRemove?: () => void
  onZoom?: () => void
  className?: string
  /** Number of screenshots captured */
  screenshotCount?: number
  /** Whether more screenshots can be added */
  canAddMore?: boolean
}

export function ScreenshotPreview({
  dataUrl,
  size,
  error,
  isCapturing = false,
  onCapture,
  onRetake,
  onRemove,
  onZoom,
  className,
  screenshotCount = 0,
  canAddMore = true,
}: ScreenshotPreviewProps) {
  if (isCapturing) {
    return (
      <div className={clsx(styles.container, styles.loading, className)}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Capturando tela...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={clsx(styles.container, styles.error, className)}>
        <AlertCircle className={styles.errorIcon} />
        <span className={styles.errorText}>{error}</span>
        {(onCapture || onRetake) && (
          <Button variant="secondary" size="sm" onClick={onCapture || onRetake} leftIcon={<RefreshCw size={14} />}>
            Tentar novamente
          </Button>
        )}
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div className={clsx(styles.container, styles.empty, className)}>
        <Camera size={32} className={styles.emptyIcon} />
        <span className={styles.emptyText}>Capturar tela</span>
        <span className={styles.emptyHint}>Capture o estado atual da tela</span>
        {onCapture && (
          <Button variant="secondary" size="sm" onClick={onCapture} leftIcon={<Camera size={14} />}>
            Capturar
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={clsx(styles.container, className)}>
      <div className={styles.imageWrapper}>
        <img src={dataUrl} alt="Screenshot" className={styles.image} />

        <div className={styles.overlay}>
          {onZoom && (
            <button
              type="button"
              className={styles.overlayButton}
              onClick={onZoom}
              title="Ampliar"
            >
              <ZoomIn size={16} />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              className={clsx(styles.overlayButton, styles.removeButton)}
              onClick={onRemove}
              title="Remover"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.label}>
          {screenshotCount > 1 ? 'Screenshot principal' : 'Screenshot'}
        </span>
        {size && <span className={styles.size}>{formatFileSize(size)}</span>}
        {canAddMore && onCapture && (
          <button
            type="button"
            className={styles.addButton}
            onClick={onCapture}
            title="Adicionar mais screenshots"
          >
            <Plus size={12} />
            Adicionar
          </button>
        )}
      </div>
    </div>
  )
}
