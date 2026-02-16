import { useState, useCallback } from 'react'
import {
  captureScreenshot,
  blobToDataUrl,
  blobToFile,
  resizeIfNeeded,
  type CaptureOptions,
} from '../utils/screenshot'
import type { ScreenshotState } from '../types'

interface UseScreenshotReturn {
  screenshot: ScreenshotState
  capture: (options?: CaptureOptions) => Promise<File | null>
  clear: () => void
  isCapturing: boolean
}

/**
 * Hook to capture screenshots of the current page
 */
export function useScreenshot(): UseScreenshotReturn {
  const [screenshot, setScreenshot] = useState<ScreenshotState>({
    isCapturing: false,
    blob: null,
    dataUrl: null,
    error: null,
  })

  const capture = useCallback(
    async (options?: CaptureOptions): Promise<File | null> => {
      setScreenshot((prev) => ({
        ...prev,
        isCapturing: true,
        error: null,
      }))

      try {
        // Capture the screenshot
        let blob = await captureScreenshot(options)

        // Resize if needed to stay under 10MB
        blob = await resizeIfNeeded(blob)

        // Convert to data URL for preview
        const dataUrl = await blobToDataUrl(blob)

        setScreenshot({
          isCapturing: false,
          blob,
          dataUrl,
          error: null,
        })

        // Return as File for upload
        return blobToFile(blob)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to capture screenshot'

        setScreenshot({
          isCapturing: false,
          blob: null,
          dataUrl: null,
          error: errorMessage,
        })

        console.error('Screenshot capture failed:', err)
        return null
      }
    },
    []
  )

  const clear = useCallback(() => {
    setScreenshot({
      isCapturing: false,
      blob: null,
      dataUrl: null,
      error: null,
    })
  }, [])

  return {
    screenshot,
    capture,
    clear,
    isCapturing: screenshot.isCapturing,
  }
}
