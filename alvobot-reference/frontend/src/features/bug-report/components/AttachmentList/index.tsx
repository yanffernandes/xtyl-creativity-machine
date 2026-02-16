import { Image, Video, FileText, File, X, RefreshCw, Loader2 } from 'lucide-react'
import styles from './AttachmentList.module.css'
import { MAX_ATTACHMENTS } from '../../types'
import { formatFileSize, getFileCategory } from '../../utils/fileValidation'

export interface AttachmentItem {
  id: string
  file: File
  status: 'pending' | 'uploading' | 'complete' | 'error'
  progress?: number
  error?: string
  previewUrl?: string
}

interface AttachmentListProps {
  attachments: AttachmentItem[]
  onRemove: (id: string) => void
  onRetry?: (id: string) => void
  showHeader?: boolean
}

function getIconComponent(mimeType: string) {
  const category = getFileCategory(mimeType)
  switch (category) {
    case 'image':
      return { Icon: Image, className: styles.iconImage }
    case 'video':
      return { Icon: Video, className: styles.iconVideo }
    case 'document':
      return { Icon: FileText, className: styles.iconDocument }
    default:
      return { Icon: File, className: '' }
  }
}

function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()?.toUpperCase() || '' : ''
}

export function AttachmentList({
  attachments,
  onRemove,
  onRetry,
  showHeader = true,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      {showHeader && (
        <div className={styles.header}>
          <span className={styles.title}>Anexos</span>
          <span className={styles.count}>
            {attachments.length}/{MAX_ATTACHMENTS}
          </span>
        </div>
      )}

      <div className={styles.list}>
        {attachments.map((attachment) => {
          const { Icon, className: iconClassName } = getIconComponent(attachment.file.type)
          const isImage = getFileCategory(attachment.file.type) === 'image'
          const extension = getFileExtension(attachment.file.name)

          return (
            <div
              key={attachment.id}
              className={`${styles.item} ${
                attachment.status === 'uploading' ? styles.itemUploading : ''
              } ${attachment.status === 'error' ? styles.itemError : ''}`}
            >
              {/* Icon or thumbnail */}
              <div className={`${styles.icon} ${iconClassName}`}>
                {isImage && attachment.previewUrl ? (
                  <img
                    src={attachment.previewUrl}
                    alt=""
                    className={styles.thumbnail}
                  />
                ) : (
                  <Icon size={16} />
                )}
              </div>

              {/* File details */}
              <div className={styles.details}>
                <div className={styles.fileName} title={attachment.file.name}>
                  {attachment.file.name}
                </div>

                {attachment.status === 'uploading' ? (
                  <div className={styles.progress}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${attachment.progress || 0}%` }}
                      />
                    </div>
                    <span className={styles.progressText}>
                      Enviando... {attachment.progress || 0}%
                    </span>
                  </div>
                ) : attachment.status === 'error' ? (
                  <div className={styles.errorMessage}>
                    {attachment.error || 'Erro ao enviar'}
                  </div>
                ) : (
                  <div className={styles.fileInfo}>
                    <span className={styles.fileBadge}>{extension}</span>
                    <span>{formatFileSize(attachment.file.size)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className={styles.actions}>
                {attachment.status === 'uploading' && (
                  <div className={styles.actionButton}>
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                )}

                {attachment.status === 'error' && onRetry && (
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.retryButton}`}
                    onClick={() => onRetry(attachment.id)}
                    title="Tentar novamente"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}

                {attachment.status !== 'uploading' && (
                  <button
                    type="button"
                    className={`${styles.actionButton} ${styles.removeButton}`}
                    onClick={() => onRemove(attachment.id)}
                    title="Remover"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
