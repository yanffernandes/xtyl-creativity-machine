import { useState, useRef, useCallback, useEffect } from 'react'

type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error'

interface UseVoiceRecordingReturn {
  status: RecordingStatus
  duration: number
  error: string | null
  isSupported: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  cancelRecording: () => void
  setStatus: (status: RecordingStatus) => void
  setError: (error: string | null) => void
}

const MAX_DURATION = 300 // 5 minutes in seconds
const WARNING_DURATION = 285 // 4:45 in seconds

// Check if browser supports audio recording (client-side only)
function checkIsSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'mediaDevices' in navigator && 'MediaRecorder' in window
}

export function useVoiceRecording(
  onWarning?: () => void
): UseVoiceRecordingReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  // Start with false to match SSR, then update on mount
  const [isSupported, setIsSupported] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Check support on mount (client-side only)
  useEffect(() => {
    setIsSupported(checkIsSupported())
  }, [])

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
    setDuration(0)
  }, [])

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Seu navegador não suporta gravação de áudio.')
      setStatus('error')
      return
    }

    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Determine the best supported MIME type
      let mimeType = 'audio/webm'
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus'
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm'
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4'
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg'
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start(1000) // Collect data every second
      setStatus('recording')
      setDuration(0)

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1

          // Warning at 4:45
          if (newDuration === WARNING_DURATION && onWarning) {
            onWarning()
          }

          // Auto-stop at 5 minutes
          if (newDuration >= MAX_DURATION) {
            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop()
            }
          }

          return newDuration
        })
      }, 1000)

    } catch (err: unknown) {
      const errorObj = err as Error & { name?: string }
      if (errorObj.name === 'NotAllowedError') {
        setError('Permissão de microfone negada. Habilite nas configurações do navegador.')
      } else {
        setError('Não foi possível iniciar a gravação.')
      }
      setStatus('error')
    }
  }, [isSupported, onWarning])

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        cleanup()
        resolve(null)
        return
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        cleanup()
        setStatus('processing')
        resolve(blob)
      }

      mediaRecorder.stop()
    })
  }, [cleanup])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    cleanup()
    setStatus('idle')
    setError(null)
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  return {
    status,
    duration,
    error,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    setStatus,
    setError
  }
}
