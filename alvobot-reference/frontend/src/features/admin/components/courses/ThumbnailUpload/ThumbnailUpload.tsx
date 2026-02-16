import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Spinner, toast } from '@/shared/components'
import styles from './ThumbnailUpload.module.css'

interface ThumbnailUploadProps {
  currentUrl: string | null
  onUpload: (url: string) => void
  onRemove: () => void
  courseId?: string
}

export function ThumbnailUpload({
  currentUrl,
  onUpload,
  onRemove,
}: ThumbnailUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.warning('Por favor, selecione uma imagem')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning('A imagem deve ter no máximo 5MB')
      return
    }

    setIsUploading(true)
    try {
      // For now, we'll create a local preview URL
      // The actual upload will happen when the course is saved
      const previewUrl = URL.createObjectURL(file)
      onUpload(previewUrl)

      // Store the file for later upload
      // This will be handled by the parent component
      ;(window as { __pendingThumbnailFile?: File }).__pendingThumbnailFile = file
    } catch (error) {
      console.error('Error processing image:', error)
      toast.error('Erro ao processar imagem')
    } finally {
      setIsUploading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  if (currentUrl) {
    return (
      <div className={styles.preview}>
        <img src={currentUrl} alt="Thumbnail" className={styles.previewImage} />
        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          title="Remover thumbnail"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Selecionar thumbnail"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.input}
        onChange={handleInputChange}
      />

      {isUploading ? (
        <div className={styles.uploading}>
          <Spinner size="md" />
          <span>Processando...</span>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.icon}>
            {isDragging ? <ImageIcon size={32} /> : <Upload size={32} />}
          </div>
          <p className={styles.text}>
            {isDragging
              ? 'Solte a imagem aqui'
              : 'Clique ou arraste uma imagem'}
          </p>
          <p className={styles.hint}>PNG, JPG ou WebP até 5MB</p>
        </div>
      )}
    </div>
  )
}
