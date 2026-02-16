import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { Upload, AlertCircle } from 'lucide-react'
import styles from './FileUploader.module.css'
import { MAX_FILE_SIZE, MAX_ATTACHMENTS } from '../../types'
import {
  validateFiles,
  getAcceptString,
  getAllowedTypesDescription,
  formatFileSize,
  type FileValidationError,
} from '../../utils/fileValidation'

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void
  currentCount: number
  disabled?: boolean
  compact?: boolean
}

export function FileUploader({
  onFilesSelected,
  currentCount,
  disabled = false,
  compact = false,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<FileValidationError[]>([])

  const remaining = MAX_ATTACHMENTS - currentCount
  const isAtLimit = remaining <= 0

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      const files = Array.from(fileList)
      const result = validateFiles(files, currentCount)

      if (result.errors.length > 0) {
        setErrors(result.errors)
        // Clear errors after 5 seconds
        setTimeout(() => setErrors([]), 5000)
      }

      if (result.validFiles.length > 0) {
        onFilesSelected(result.validFiles)
      }

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [currentCount, onFilesSelected]
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
    },
    [handleFiles]
  )

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled || isAtLimit) return

      handleFiles(e.dataTransfer.files)
    },
    [disabled, isAtLimit, handleFiles]
  )

  const handleClick = useCallback(() => {
    if (!disabled && !isAtLimit && inputRef.current) {
      inputRef.current.click()
    }
  }, [disabled, isAtLimit])

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''} ${
          disabled || isAtLimit ? styles.dropzoneDisabled : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleClick()
          }
        }}
        role="button"
        tabIndex={disabled || isAtLimit ? -1 : 0}
        aria-disabled={disabled || isAtLimit}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={getAcceptString()}
          onChange={handleChange}
          disabled={disabled || isAtLimit}
          className={styles.input}
          aria-label="Selecionar arquivos"
        />

        <Upload size={24} className={styles.icon} />

        <div className={styles.text}>
          <p className={styles.primary}>
            {isDragging ? 'Solte aqui' : 'Anexar arquivos'}
          </p>
          <p className={styles.secondary}>
            {getAllowedTypesDescription()}
          </p>
        </div>
      </div>

      <div className={styles.footer}>
        <span className={styles.hint}>
          Máx. {formatFileSize(MAX_FILE_SIZE)}
        </span>
        <span className={`${styles.limit} ${isAtLimit ? styles.limitReached : ''}`}>
          {remaining}/{MAX_ATTACHMENTS}
        </span>
      </div>

      {errors.length > 0 && (
        <div className={styles.errors} role="alert">
          {errors.map((error, index) => (
            <div key={index} className={styles.errorItem}>
              <AlertCircle size={14} className={styles.errorIcon} />
              <span className={styles.errorText}>{error.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
