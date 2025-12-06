# Research: Voice Input for Assistant

**Feature**: 021-voice-input-assistant
**Date**: 2025-12-05
**Status**: Complete

## Research Questions

### 1. OpenRouter Audio Transcription API

**Question**: How does OpenRouter handle audio transcription? What endpoint and format should we use?

**Decision**: Use OpenRouter's chat completions endpoint with audio-capable models

**Rationale**:
- OpenRouter supports audio input through the standard `/api/v1/chat/completions` endpoint
- Audio is sent as base64-encoded data with `input_audio` content type
- The model `openai/gpt-4o-audio-preview` supports audio input and produces text output
- Pricing: $2.50/M input tokens, $10/M output tokens, $40/M audio tokens
- This approach is consistent with existing OpenRouter integration patterns in the codebase

**Alternatives considered**:
1. **Direct OpenAI Whisper API**: Rejected because it would require separate API key management and doesn't leverage existing OpenRouter infrastructure
2. **Self-hosted Whisper**: Rejected due to infrastructure complexity and additional deployment requirements
3. **Third-party transcription services (AssemblyAI, Deepgram)**: Rejected to maintain single provider relationship with OpenRouter

### 2. Audio Format and Encoding

**Question**: What audio format should the browser capture and how should it be transmitted?

**Decision**: Capture as WebM (Opus codec), transmit as base64-encoded multipart form data

**Rationale**:
- WebM with Opus is natively supported by all target browsers (Chrome, Firefox, Safari, Edge)
- MediaRecorder API defaults to webm/opus in most browsers
- Base64 encoding is required by OpenRouter's audio input format
- Multipart form data allows efficient upload of audio files up to 25MB
- OpenRouter/OpenAI supports: mp3, mp4, mpeg, mpga, m4a, wav, and webm

**Alternatives considered**:
1. **WAV format**: Better quality but much larger file sizes, slower uploads
2. **MP3 format**: Requires client-side encoding library (lamejs), adds complexity
3. **Raw PCM**: Not supported by OpenRouter, would require server-side conversion

### 3. Frontend Recording Implementation

**Question**: What browser API should be used for audio recording?

**Decision**: Use MediaRecorder API with getUserMedia

**Rationale**:
- Standard Web API with broad browser support (Chrome 49+, Firefox 25+, Safari 14.1+, Edge 79+)
- Handles audio capture, encoding, and chunking automatically
- Provides events for state management (start, stop, dataavailable, error)
- No external dependencies required
- Already used for similar features in modern web applications

**Alternatives considered**:
1. **Web Audio API + ScriptProcessorNode**: More control but deprecated, complex implementation
2. **Third-party libraries (RecordRTC, MediaStreamRecorder)**: Unnecessary abstraction, adds bundle size
3. **AudioWorklet**: Overkill for simple recording, poor Safari support

### 4. Recording UI/UX Pattern

**Question**: What UI pattern should be used for the recording interaction?

**Decision**: Toggle button with visual state feedback (clarified in spec: click-to-toggle)

**Rationale**:
- Consistent with spec clarification: "Click to start, click again to stop (toggle mode)"
- More accessible than press-and-hold for users with motor difficulties
- Works well on both desktop and mobile touch interfaces
- Visual states: idle (microphone icon) → recording (stop icon + pulse animation) → processing (spinner)
- Duration timer shows elapsed recording time

**Alternatives considered**:
1. **Push-to-talk (hold)**: Rejected in clarification session
2. **Voice activity detection (VAD)**: Adds complexity, may not work well in noisy environments
3. **Automatic silence detection**: Can prematurely stop recording

### 5. Error Handling Strategy

**Question**: How should transcription errors be handled?

**Decision**: Graceful degradation with user-friendly messages and retry capability

**Rationale**:
- Network errors: Show toast "Não foi possível transcrever. Verifique sua conexão e tente novamente."
- Permission denied: Show toast with instructions to enable microphone in browser settings
- Unsupported browser: Hide microphone button entirely with graceful fallback
- Empty transcription: Show toast "Nenhum áudio detectado" and keep input unchanged
- API errors: Show generic error with retry button, log details for debugging

**Alternatives considered**:
1. **Silent failure**: Poor UX, user doesn't know what went wrong
2. **Modal dialogs**: Too intrusive for transient errors
3. **Inline error messages**: Limited space in chat input area

### 6. Backend Service Architecture

**Question**: Should transcription be a separate service or integrated into existing chat router?

**Decision**: New endpoint in chat router with dedicated transcription service module

**Rationale**:
- `/chat/transcribe` endpoint keeps audio-related functionality grouped with chat
- Separate `transcription_service.py` follows existing pattern (llm_service.py, vision_service.py)
- Allows future expansion (language detection, speaker diarization) without bloating router
- Reuses existing authentication middleware from chat router
- Consistent with codebase architecture patterns

**Alternatives considered**:
1. **Inline in chat.py**: Would make the already large file even larger
2. **New router (audio.py)**: Overkill for single endpoint, fragments related functionality
3. **WebSocket streaming**: Unnecessary complexity for one-shot transcription

## Technology Decisions Summary

| Component | Technology | Justification |
|-----------|------------|---------------|
| Audio Capture | MediaRecorder API | Browser-native, broad support |
| Audio Format | WebM (Opus) | Native browser encoding, good compression |
| Transport | Multipart form data | Efficient for binary uploads |
| Backend API | POST /chat/transcribe | Consistent with existing patterns |
| Transcription | OpenRouter gpt-4o-audio-preview | Existing provider, good accuracy |
| State Management | React useState/useCallback hook | Simple, no external deps |
| UI Feedback | Framer Motion animations | Matches existing design system |

## Implementation Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Browser MediaRecorder inconsistencies | Medium | Medium | Feature detection, fallback messaging |
| OpenRouter audio API changes | Low | High | Abstract into service layer for easy updates |
| Large audio files slow to upload | Medium | Low | Progress indicator, 5-min max duration |
| Transcription accuracy issues | Low | Medium | User can edit text before sending |

## References

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter GPT-4o Audio Model](https://openrouter.ai/openai/gpt-4o-audio-preview)
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
