import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_ATTACHMENTS,
} from '../types'

export interface FileValidationError {
  code: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'TOO_MANY_FILES' | 'DUPLICATE_FILE'
  message: string
  fileName?: string
}

export interface FileValidationResult {
  valid: boolean
  errors: FileValidationError[]
  validFiles: File[]
}

/**
 * Get all allowed MIME types as a flat array
 */
export function getAllowedMimeTypes(): string[] {
  return [
    ...ALLOWED_FILE_TYPES.image,
    ...ALLOWED_FILE_TYPES.video,
    ...ALLOWED_FILE_TYPES.document,
  ]
}

/**
 * Get the accept string for file input
 */
export function getAcceptString(): string {
  return getAllowedMimeTypes().join(',')
}

/**
 * Get file type category from MIME type
 */
export function getFileCategory(mimeType: string): 'image' | 'video' | 'document' | 'unknown' {
  if (ALLOWED_FILE_TYPES.image.includes(mimeType)) return 'image'
  if (ALLOWED_FILE_TYPES.video.includes(mimeType)) return 'video'
  if (ALLOWED_FILE_TYPES.document.includes(mimeType)) return 'document'
  return 'unknown'
}

/**
 * Check if a file type is allowed
 */
export function isAllowedFileType(mimeType: string): boolean {
  return getAllowedMimeTypes().includes(mimeType)
}

/**
 * Format bytes to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get file extension from file name
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : ''
}

/**
 * Validate a single file
 */
export function validateFile(file: File): FileValidationError | null {
  // Check file type
  if (!isAllowedFileType(file.type)) {
    const extension = getFileExtension(file.name)
    return {
      code: 'INVALID_TYPE',
      message: `Tipo de arquivo não permitido: .${extension || 'desconhecido'}`,
      fileName: file.name,
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `Arquivo muito grande: ${formatFileSize(file.size)}. Máximo: ${formatFileSize(MAX_FILE_SIZE)}`,
      fileName: file.name,
    }
  }

  return null
}

/**
 * Validate multiple files including count limit
 */
export function validateFiles(
  files: File[],
  existingCount = 0
): FileValidationResult {
  const errors: FileValidationError[] = []
  const validFiles: File[] = []
  const seenNames = new Set<string>()
  let filesToValidate = files

  // Check total count first
  const totalAfterAdd = existingCount + files.length
  if (totalAfterAdd > MAX_ATTACHMENTS) {
    const canAdd = Math.max(0, MAX_ATTACHMENTS - existingCount)
    errors.push({
      code: 'TOO_MANY_FILES',
      message: `Máximo de ${MAX_ATTACHMENTS} arquivos permitido. Você pode adicionar mais ${canAdd}.`,
    })
    // Only process files up to the limit
    filesToValidate = files.slice(0, canAdd)
  }

  for (const file of filesToValidate) {
    // Check for duplicates by name
    if (seenNames.has(file.name)) {
      errors.push({
        code: 'DUPLICATE_FILE',
        message: `Arquivo duplicado: ${file.name}`,
        fileName: file.name,
      })
      continue
    }

    const error = validateFile(file)
    if (error) {
      errors.push(error)
    } else {
      validFiles.push(file)
      seenNames.add(file.name)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validFiles,
  }
}

/**
 * Get allowed file types description for UI
 */
export function getAllowedTypesDescription(): string {
  const imageExts = ['PNG', 'JPG', 'GIF', 'WebP']
  const videoExts = ['WebM', 'MP4']
  const docExts = ['PDF', 'TXT', 'CSV']

  return `Imagens (${imageExts.join(', ')}), Vídeos (${videoExts.join(', ')}), Documentos (${docExts.join(', ')})`
}

/**
 * Get icon name for file type
 */
export function getFileIcon(mimeType: string): 'image' | 'video' | 'file-text' | 'file' {
  const category = getFileCategory(mimeType)
  switch (category) {
    case 'image':
      return 'image'
    case 'video':
      return 'video'
    case 'document':
      return 'file-text'
    default:
      return 'file'
  }
}
