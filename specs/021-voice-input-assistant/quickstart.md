# Quickstart: Voice Input for Assistant

**Feature**: 021-voice-input-assistant
**Date**: 2025-12-05

## Overview

This guide provides implementation details for adding voice-to-text input to the AI assistant chat interface.

## Prerequisites

- Existing `ChatSidebar.tsx` component
- Backend chat router (`backend/routers/chat.py`)
- OpenRouter API key configured in `.env`
- Supabase authentication working

## Implementation Steps

### Step 1: Backend Transcription Service

Create `backend/transcription_service.py`:

```python
import base64
import httpx
import os
import time
from typing import Optional

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
TRANSCRIPTION_MODEL = "openai/gpt-4o-audio-preview"

def get_api_key():
    return os.getenv("OPENROUTER_API_KEY")

async def transcribe_audio(
    audio_data: bytes,
    audio_format: str,
    language_hint: Optional[str] = None
) -> dict:
    """
    Transcribe audio using OpenRouter's audio-capable model.

    Args:
        audio_data: Raw audio bytes
        audio_format: MIME type (e.g., "audio/webm")
        language_hint: Optional ISO 639-1 language code

    Returns:
        dict with text, duration_seconds, language, processing_time_ms
    """
    api_key = get_api_key()
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not configured")

    start_time = time.time()

    # Encode audio as base64
    audio_base64 = base64.b64encode(audio_data).decode("utf-8")

    # Build prompt with optional language hint
    system_prompt = "Transcreva o áudio exatamente como falado, sem adicionar pontuação extra ou formatação."
    if language_hint:
        system_prompt += f" O áudio está em {language_hint}."

    messages = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "input_audio",
                    "input_audio": {
                        "data": audio_base64,
                        "format": audio_format.split("/")[1]  # "webm" from "audio/webm"
                    }
                }
            ]
        }
    ]

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{OPENROUTER_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://xtyl.com",
                "X-Title": "XTYL Creativity Machine"
            },
            json={
                "model": TRANSCRIPTION_MODEL,
                "messages": messages,
                "max_tokens": 4096
            }
        )
        response.raise_for_status()
        result = response.json()

    processing_time = int((time.time() - start_time) * 1000)
    transcribed_text = result["choices"][0]["message"]["content"]

    return {
        "text": transcribed_text.strip(),
        "duration_seconds": 0.0,  # Would need audio analysis library for accurate duration
        "language": language_hint or "auto",
        "processing_time_ms": processing_time
    }
```

### Step 2: Backend API Endpoint

Add to `backend/routers/chat.py`:

```python
from fastapi import UploadFile, File, Form
from transcription_service import transcribe_audio

ALLOWED_AUDIO_TYPES = {
    "audio/webm", "audio/mp3", "audio/mpeg", "audio/wav",
    "audio/m4a", "audio/mp4", "audio/x-m4a"
}
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25MB

@router.post("/transcribe")
async def transcribe_audio_endpoint(
    audio: UploadFile = File(...),
    language_hint: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """Transcribe audio file to text."""

    # Validate content type
    content_type = audio.content_type or ""
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "invalid_format",
                "message": "Formato de áudio não suportado. Use WebM, MP3, WAV ou M4A."
            }
        )

    # Read and validate size
    audio_data = await audio.read()
    if len(audio_data) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "file_too_large",
                "message": "Arquivo de áudio muito grande. Máximo: 25MB."
            }
        )

    if len(audio_data) == 0:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "empty_audio",
                "message": "Nenhum áudio detectado no arquivo."
            }
        )

    try:
        result = await transcribe_audio(
            audio_data=audio_data,
            audio_format=content_type,
            language_hint=language_hint
        )
        return result
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "api_error",
                "message": "Serviço de transcrição indisponível."
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "transcription_failed",
                "message": "Falha ao transcrever áudio. Tente novamente."
            }
        )
```

### Step 3: Frontend Voice Recording Hook

Create `frontend/src/hooks/useVoiceRecording.ts`:

```typescript
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
}

const MAX_DURATION = 300 // 5 minutes in seconds
const WARNING_DURATION = 285 // 4:45 in seconds

export function useVoiceRecording(
  onWarning?: () => void
): UseVoiceRecordingReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const isSupported = typeof navigator !== 'undefined'
    && 'mediaDevices' in navigator
    && 'MediaRecorder' in window

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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4'
      })

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
            mediaRecorder.stop()
          }

          return newDuration
        })
      }, 1000)

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
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
    cancelRecording
  }
}
```

### Step 4: Frontend API Function

Add to `frontend/src/lib/api.ts`:

```typescript
export async function transcribeAudio(
  audioBlob: Blob,
  languageHint?: string
): Promise<{ text: string; duration_seconds: number; language: string; processing_time_ms: number }> {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recording.webm')
  if (languageHint) {
    formData.append('language_hint', languageHint)
  }

  const response = await api.post('/chat/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })

  return response.data
}
```

### Step 5: Integrate into ChatSidebar

Key additions to `ChatSidebar.tsx`:

```tsx
import { Mic, Square, Loader2 } from 'lucide-react'
import { useVoiceRecording } from '@/hooks/useVoiceRecording'
import { transcribeAudio } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

// Inside component:
const {
  status: recordingStatus,
  duration: recordingDuration,
  error: recordingError,
  isSupported: isRecordingSupported,
  startRecording,
  stopRecording,
  cancelRecording
} = useVoiceRecording(() => {
  toast({
    title: "Aviso",
    description: "A gravação será encerrada em 15 segundos.",
    variant: "default"
  })
})

const handleVoiceInput = async () => {
  if (recordingStatus === 'recording') {
    const audioBlob = await stopRecording()
    if (audioBlob) {
      try {
        const result = await transcribeAudio(audioBlob)
        setInput(prev => prev ? `${prev} ${result.text}` : result.text)
        toast({
          title: "Transcrição concluída",
          description: `${result.processing_time_ms}ms`
        })
      } catch (err: any) {
        toast({
          title: "Erro na transcrição",
          description: err.response?.data?.message || "Tente novamente.",
          variant: "destructive"
        })
      }
    }
  } else {
    await startRecording()
  }
}

// In JSX, add microphone button near other action buttons:
{isRecordingSupported && (
  <Button
    type="button"
    size="sm"
    variant={recordingStatus === 'recording' ? 'destructive' : 'outline'}
    onClick={handleVoiceInput}
    disabled={isLoading || recordingStatus === 'processing'}
    className="gap-2"
  >
    <AnimatePresence mode="wait">
      {recordingStatus === 'recording' ? (
        <motion.div
          key="recording"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="flex items-center gap-2"
        >
          <Square className="h-4 w-4" />
          <span className="tabular-nums">{formatDuration(recordingDuration)}</span>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="h-2 w-2 rounded-full bg-red-500"
          />
        </motion.div>
      ) : recordingStatus === 'processing' ? (
        <motion.div key="processing">
          <Loader2 className="h-4 w-4 animate-spin" />
        </motion.div>
      ) : (
        <motion.div key="idle">
          <Mic className="h-4 w-4" />
        </motion.div>
      )}
    </AnimatePresence>
  </Button>
)}

// Helper function:
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
```

## Testing

### Manual Testing Checklist

1. [ ] Click mic button starts recording with visual feedback
2. [ ] Duration timer counts up correctly
3. [ ] Click stop button ends recording and shows processing state
4. [ ] Transcribed text appears in input field
5. [ ] Existing text is preserved (new text appends with space)
6. [ ] Error toast appears on failure
7. [ ] Recording auto-stops at 5 minutes
8. [ ] Warning appears at 4:45
9. [ ] Denying permission shows helpful message
10. [ ] Navigating away cancels recording

### API Testing

```bash
# Test transcription endpoint
curl -X POST http://localhost:8000/chat/transcribe \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -F "audio=@test.webm" \
  -F "language_hint=pt"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Seu navegador não suporta" | Update browser or use Chrome/Firefox/Edge |
| "Permissão negada" | Check browser settings, ensure HTTPS in production |
| "Serviço indisponível" | Check OpenRouter API key and account status |
| Recording doesn't start | Check microphone is connected and not in use |
| Empty transcription | Speak louder, check microphone input level |
