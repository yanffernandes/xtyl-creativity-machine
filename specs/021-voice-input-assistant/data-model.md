# Data Model: Voice Input for Assistant

**Feature**: 021-voice-input-assistant
**Date**: 2025-12-05

## Overview

This feature does not introduce persistent database entities. Audio is processed in memory and transcribed text is returned immediately. The data model focuses on request/response schemas for the API.

## Schemas

### TranscriptionRequest

Request payload for audio transcription.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| audio | File (binary) | Yes | Audio file in supported format (webm, mp3, wav, m4a, mp4, mpeg, mpga) |
| language_hint | string | No | ISO 639-1 language code hint (e.g., "pt", "en"). Improves accuracy for specific languages. Default: auto-detect |

**Constraints**:
- Maximum file size: 25MB
- Maximum duration: 5 minutes (300 seconds)
- Supported MIME types: `audio/webm`, `audio/mp3`, `audio/wav`, `audio/m4a`, `audio/mp4`, `audio/mpeg`

### TranscriptionResponse

Response payload containing transcribed text.

| Field | Type | Description |
|-------|------|-------------|
| text | string | Transcribed text from audio |
| duration_seconds | float | Duration of processed audio in seconds |
| language | string | Detected or specified language code |
| processing_time_ms | int | Server-side processing time in milliseconds |

**Example Response**:
```json
{
  "text": "Olá, como posso ajudar você hoje?",
  "duration_seconds": 3.2,
  "language": "pt",
  "processing_time_ms": 1847
}
```

### TranscriptionError

Error response for transcription failures.

| Field | Type | Description |
|-------|------|-------------|
| error | string | Error type identifier |
| message | string | Human-readable error message in Portuguese |
| details | object | Optional additional error details |

**Error Types**:
| Error | HTTP Status | Message |
|-------|-------------|---------|
| `invalid_format` | 400 | "Formato de áudio não suportado. Use WebM, MP3, WAV ou M4A." |
| `file_too_large` | 413 | "Arquivo de áudio muito grande. Máximo: 25MB." |
| `duration_exceeded` | 400 | "Duração máxima excedida. Máximo: 5 minutos." |
| `empty_audio` | 400 | "Nenhum áudio detectado no arquivo." |
| `transcription_failed` | 500 | "Falha ao transcrever áudio. Tente novamente." |
| `api_error` | 502 | "Serviço de transcrição indisponível." |

## Frontend State Model

### VoiceRecordingState

React hook state for managing recording lifecycle.

| Field | Type | Description |
|-------|------|-------------|
| status | enum | Current recording state: `idle`, `recording`, `processing`, `error` |
| duration | number | Current recording duration in seconds (0-300) |
| error | string \| null | Error message if status is `error` |
| audioBlob | Blob \| null | Recorded audio data when available |

**State Transitions**:
```
idle → recording (user clicks mic button)
recording → processing (user clicks stop or max duration reached)
processing → idle (transcription successful, text inserted)
processing → error (transcription failed)
error → idle (user dismisses error or retries)
recording → idle (user cancels or navigates away)
```

### RecordingPermissionState

Browser permission state for microphone access.

| Field | Type | Description |
|-------|------|-------------|
| status | enum | Permission state: `prompt`, `granted`, `denied`, `unsupported` |
| canRecord | boolean | Whether recording is possible |

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend                                  │
│  ┌──────────────────┐     ┌──────────────────┐                  │
│  │ ChatSidebar      │────▶│ useVoiceRecording│                  │
│  │ (Component)      │     │ (Hook)           │                  │
│  └──────────────────┘     └────────┬─────────┘                  │
│                                    │                             │
│                           ┌────────▼─────────┐                  │
│                           │ MediaRecorder    │                  │
│                           │ (Browser API)    │                  │
│                           └────────┬─────────┘                  │
└────────────────────────────────────┼────────────────────────────┘
                                     │ Audio Blob
                            ┌────────▼─────────┐
                            │ POST /chat/      │
                            │ transcribe       │
                            └────────┬─────────┘
┌────────────────────────────────────┼────────────────────────────┐
│                        Backend     │                             │
│                           ┌────────▼─────────┐                  │
│                           │ chat.py          │                  │
│                           │ (Router)         │                  │
│                           └────────┬─────────┘                  │
│                                    │                             │
│                           ┌────────▼─────────┐                  │
│                           │ transcription_   │                  │
│                           │ service.py       │                  │
│                           └────────┬─────────┘                  │
│                                    │                             │
│                           ┌────────▼─────────┐                  │
│                           │ OpenRouter API   │                  │
│                           │ (gpt-4o-audio)   │                  │
│                           └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

## Validation Rules

### Audio File Validation

1. **MIME type check**: Must be in allowed list before processing
2. **File size check**: Must be ≤ 25MB
3. **Duration check**: Extracted from audio metadata, must be ≤ 300 seconds
4. **Non-empty check**: Audio must contain actual audio data (not silence-only)

### Security Considerations

1. Audio files are validated server-side before processing
2. Audio is not persisted to disk or database
3. Memory is cleared after transcription completes
4. Rate limiting should be applied to prevent abuse (future enhancement)
5. Authentication is required (existing JWT middleware)
