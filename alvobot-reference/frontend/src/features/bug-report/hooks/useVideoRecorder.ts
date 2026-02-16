import { useState, useCallback, useRef, useEffect } from 'react'
import { MAX_VIDEO_DURATION, type RecordingState  } from '../types'

interface VideoRecordingResult {
  blob: Blob
  duration: number
  file: File
}

interface UseVideoRecorderReturn {
  state: RecordingState
  isSupported: boolean
  startRecording: () => Promise<boolean>
  stopRecording: () => Promise<VideoRecordingResult | null>
  pauseRecording: () => void
  resumeRecording: () => void
  cancelRecording: () => void
  error: string | null
}

/**
 * Check if the browser supports screen recording
 */
function isScreenRecordingSupported(): boolean {
  return !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
}

/**
 * Get the best supported MIME type for video recording
 */
function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return 'video/webm'
}

/**
 * Hook to record screen video for bug reports
 */
export function useVideoRecorder(): UseVideoRecorderReturn {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    stream: null,
  })
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const pausedTimeRef = useRef<number>(0)
  const timerRef = useRef<number | null>(null)
  const maxDurationTimerRef = useRef<number | null>(null)

  const isSupported = isScreenRecordingSupported()

  // Update duration every second while recording
  const startDurationTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = window.setInterval(() => {
      setState((prev) => {
        if (!prev.isRecording || prev.isPaused) return prev
        const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000)
        return { ...prev, duration: elapsed }
      })
    }, 1000)
  }, [])

  const stopDurationTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDurationTimer()
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current)
      }
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [state.stream, stopDurationTimer])

  const startRecording = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Gravação de tela não é suportada neste navegador')
      return false
    }

    setError(null)
    chunksRef.current = []

    try {
      // Request screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })

      // Handle user stopping the screen share via browser UI
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          stream: null,
        }))
        stopDurationTimer()
      })

      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1300000, // 1.3 Mbps for ~10MB per minute
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = () => {
        setError('Erro durante a gravação')
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
        }))
        stopDurationTimer()
      }

      mediaRecorderRef.current = mediaRecorder
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0

      // Start recording with timeslice for more frequent data collection
      mediaRecorder.start(1000)

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        stream,
      })

      startDurationTimer()

      // Auto-stop after max duration
      maxDurationTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          // Will trigger onstop which user should handle
          setError(`Gravação limitada a ${MAX_VIDEO_DURATION} segundos`)
        }
      }, MAX_VIDEO_DURATION * 1000)

      return true
    } catch (err) {
      // User cancelled or permission denied
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permissão de gravação negada')
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma tela disponível para gravação')
        } else {
          setError(err.message || 'Erro ao iniciar gravação')
        }
      } else {
        setError('Erro desconhecido ao iniciar gravação')
      }
      return false
    }
  }, [isSupported, startDurationTimer, stopDurationTimer])

  const stopRecording = useCallback(async (): Promise<VideoRecordingResult | null> => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current)
      maxDurationTimerRef.current = null
    }

    stopDurationTimer()

    const mediaRecorder = mediaRecorderRef.current
    const stream = state.stream

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      return null
    }

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        // Stop all tracks
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }

        const finalDuration = Math.floor(
          (Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000
        )

        if (chunksRef.current.length === 0) {
          setState({
            isRecording: false,
            isPaused: false,
            duration: 0,
            stream: null,
          })
          resolve(null)
          return
        }

        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const file = new File([blob], `screen-recording-${timestamp}.webm`, {
          type: blob.type,
        })

        setState({
          isRecording: false,
          isPaused: false,
          duration: 0,
          stream: null,
        })

        resolve({
          blob,
          duration: finalDuration,
          file,
        })
      }

      mediaRecorder.stop()
    })
  }, [state.stream, stopDurationTimer])

  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      pausedTimeRef.current = Date.now()
      setState((prev) => ({ ...prev, isPaused: true }))
    }
  }, [])

  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      // Accumulate paused time
      pausedTimeRef.current = Date.now() - pausedTimeRef.current
      mediaRecorder.resume()
      setState((prev) => ({ ...prev, isPaused: false }))
    }
  }, [])

  const cancelRecording = useCallback(() => {
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current)
      maxDurationTimerRef.current = null
    }

    stopDurationTimer()

    const mediaRecorder = mediaRecorderRef.current
    const stream = state.stream

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    chunksRef.current = []

    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      stream: null,
    })

    setError(null)
  }, [state.stream, stopDurationTimer])

  return {
    state,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    error,
  }
}
