/**
 * Screenshot utility using native Screen Capture API
 * Falls back to html2canvas if native API is not available
 */

export interface CaptureOptions {
  /** Elements to ignore during capture (by class name) - only for html2canvas fallback */
  ignoreClasses?: string[]
  /** Scale factor for the screenshot (default: 1) */
  scale?: number
  /** Quality for JPEG output (0-1, default: 0.9) */
  quality?: number
  /** Output format (default: 'image/png') */
  format?: 'image/png' | 'image/jpeg' | 'image/webp'
}

const DEFAULT_OPTIONS: Required<CaptureOptions> = {
  ignoreClasses: ['bug-report-button', 'bug-report-modal'],
  scale: 1,
  quality: 0.9,
  format: 'image/png',
}

/**
 * Check if the native Screen Capture API is available
 */
export function isScreenCaptureSupported(): boolean {
  return !!(navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices)
}

/**
 * Capture screenshot using native Screen Capture API
 * This prompts the user to select what to share
 */
async function captureWithNativeAPI(opts: Required<CaptureOptions>): Promise<Blob> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'browser',
    },
    audio: false,
    // @ts-expect-error - preferCurrentTab is not in the type definitions yet
    preferCurrentTab: true,
  })

  try {
    const track = stream.getVideoTracks()[0]
    // ImageCapture is a browser API that may not have TypeScript definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imageCapture = new (window as any).ImageCapture(track)
    const bitmap = await imageCapture.grabFrame()

    // Create canvas and draw the bitmap
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width * opts.scale
    canvas.height = bitmap.height * opts.scale
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob from canvas'))
          }
        },
        opts.format,
        opts.quality
      )
    })
  } finally {
    // Stop all tracks to release the stream
    stream.getTracks().forEach((track) => track.stop())
  }
}

/**
 * Capture the visible area of the current tab as a screenshot
 * Uses native Screen Capture API (requires user permission)
 */
export async function captureScreenshot(
  options: CaptureOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (!isScreenCaptureSupported()) {
    throw new Error(
      'Seu navegador não suporta captura de tela. ' +
        'Por favor, anexe uma imagem manualmente.'
    )
  }

  return await captureWithNativeAPI(opts)
}

/**
 * Convert a Blob to a data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert blob to data URL'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Convert a data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64Data] = dataUrl.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'

  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return new Blob([bytes], { type: mimeType })
}

/**
 * Create a File object from a Blob with a generated filename
 */
export function blobToFile(blob: Blob, prefix = 'screenshot'): File {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const extension = blob.type.split('/')[1] || 'png'
  const filename = `${prefix}-${timestamp}.${extension}`

  return new File([blob], filename, { type: blob.type })
}

/**
 * Get estimated file size as human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Check if a file is within the allowed size limit
 */
export function isFileSizeValid(
  bytes: number,
  maxBytes = 10 * 1024 * 1024
): boolean {
  return bytes <= maxBytes
}

/**
 * Resize a screenshot if it exceeds the maximum size
 * Returns the original blob if within limits
 */
export async function resizeIfNeeded(
  blob: Blob,
  maxBytes = 10 * 1024 * 1024
): Promise<Blob> {
  if (blob.size <= maxBytes) {
    return blob
  }

  // Calculate approximate scale factor needed
  const scaleFactor = Math.sqrt(maxBytes / blob.size) * 0.9 // 10% margin

  const dataUrl = await blobToDataUrl(blob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      canvas.width = Math.floor(img.width * scaleFactor)
      canvas.height = Math.floor(img.height * scaleFactor)

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (resizedBlob) => {
          if (resizedBlob) {
            resolve(resizedBlob)
          } else {
            reject(new Error('Failed to resize image'))
          }
        },
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => reject(new Error('Failed to load image for resizing'))
    img.src = dataUrl
  })
}
