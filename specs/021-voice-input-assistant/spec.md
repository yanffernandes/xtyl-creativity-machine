# Feature Specification: Voice Input for Assistant

**Feature Branch**: `021-voice-input-assistant`
**Created**: 2025-12-05
**Status**: Draft
**Input**: User description: "Adicionar a opção de usar a voz para escrever no assistente. Ou seja, ele vai transcrever, use a api do openrouter mesmo, o wisper, veja uma forma bonita e elegante de aplicar isso ao input do assistente IA. Não é pra remover nada que já existe, é uma função adicional."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voice Recording and Transcription (Priority: P1)

A user wants to dictate their message to the AI assistant instead of typing. They click a microphone button next to the text input, speak their message, and the audio is automatically transcribed and inserted into the input field.

**Why this priority**: This is the core functionality that delivers the main value of voice input - enabling hands-free message composition and faster input for users who prefer speaking over typing.

**Independent Test**: Can be fully tested by clicking the microphone button, speaking a phrase, and verifying the transcribed text appears in the input field. Delivers immediate value for voice-first users.

**Acceptance Scenarios**:

1. **Given** the chat interface is visible and microphone permission is granted, **When** user clicks the microphone button, **Then** the system starts recording audio with visual feedback indicating recording state
2. **Given** the user is recording audio, **When** user clicks the microphone button again (toggle mode), **Then** recording stops, audio is sent for transcription, and the transcribed text is inserted at the cursor position in the input field
3. **Given** the user has transcribed text in the input field, **When** user clicks send, **Then** the message is sent normally (voice input integrates seamlessly with existing flow)

---

### User Story 2 - Recording State Visual Feedback (Priority: P2)

A user needs clear visual indication of when they are recording, when the audio is being processed, and when transcription is complete. The UI provides elegant glassmorphism-styled feedback that matches the existing design system.

**Why this priority**: Visual feedback is essential for users to understand the system state, preventing confusion about whether their voice is being captured.

**Independent Test**: Can be tested by initiating recording and observing visual changes (button color, animation, waveform). Delivers confidence to users that the system is working.

**Acceptance Scenarios**:

1. **Given** user initiates voice recording, **When** recording starts, **Then** the microphone button changes to a stop state with pulsing animation and recording indicator
2. **Given** user stops recording, **When** transcription is processing, **Then** a loading indicator appears showing processing state
3. **Given** transcription completes successfully, **When** text is inserted, **Then** visual feedback briefly indicates success before returning to idle state

---

### User Story 3 - Error Handling and Browser Compatibility (Priority: P3)

A user on an unsupported browser or without microphone permission attempts to use voice input. The system gracefully handles these cases with helpful error messages.

**Why this priority**: Error handling ensures users understand why the feature might not work and prevents frustration from silent failures.

**Independent Test**: Can be tested by denying microphone permission or using an unsupported browser, verifying appropriate error messages appear.

**Acceptance Scenarios**:

1. **Given** user's browser does not support audio recording, **When** user attempts to use voice input, **Then** system displays helpful message explaining the limitation
2. **Given** user denies microphone permission, **When** user clicks microphone button, **Then** system prompts user to grant permission with clear instructions
3. **Given** transcription fails (network error, API error), **When** processing completes, **Then** user sees error message and can retry without losing any previously typed content

---

### Edge Cases

- What happens when user speaks in silence (no audio detected)? System should handle gracefully, either showing "No audio detected" or inserting empty string
- What happens when transcription returns empty result? Input field remains unchanged, brief notification shown
- What happens when user is already in recording state and navigates away? Recording should be canceled
- What happens during slow network conditions? Loading state persists with timeout message if too long (30 seconds)
- What happens if user starts typing while recording? Recording continues, transcribed text appends to existing text
- What happens when there's already text in the input field? Transcribed text is appended with a space separator

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a microphone button in the chat input area that initiates voice recording when clicked
- **FR-002**: System MUST capture audio using the browser's MediaRecorder API when recording is active
- **FR-003**: System MUST send captured audio to the backend transcription endpoint when recording stops
- **FR-004**: Backend MUST transcribe audio using OpenRouter's Whisper API integration
- **FR-005**: System MUST insert transcribed text into the input field, appending to any existing content with appropriate spacing
- **FR-006**: System MUST provide visual feedback for all states: idle, recording, processing, success, and error
- **FR-007**: System MUST handle microphone permission requests gracefully with user-friendly prompts
- **FR-008**: System MUST maintain all existing chat input functionality (typing, attachments, templates, keyboard shortcuts)
- **FR-009**: System MUST disable the send button and voice button while transcription is processing
- **FR-010**: System MUST support audio formats compatible with Whisper API (webm, mp3, wav preferred)
- **FR-011**: System MUST enforce a maximum recording duration of 5 minutes, auto-stopping with a warning notification at 4:45

### Key Entities

- **AudioRecording**: Represents captured audio data before transcription - includes blob data, duration, format, and timestamp
- **TranscriptionRequest**: Request to backend containing audio data and optional parameters (language hint)
- **TranscriptionResponse**: Response containing transcribed text, confidence score (if available), and processing metadata

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete voice-to-text input in under 5 seconds for messages under 30 seconds of speech
- **SC-002**: Transcription accuracy matches Whisper API baseline (95%+ for clear speech in Portuguese and English)
- **SC-003**: 95% of voice input attempts complete successfully under normal network conditions
- **SC-004**: Voice input button is discoverable - users can locate and understand its purpose within 3 seconds of viewing the chat interface
- **SC-005**: Zero regression in existing chat functionality - all current features (typing, attachments, templates, send) continue working identically

## Clarifications

### Session 2025-12-05

- Q: How should the user interact with the microphone button to record? → A: Click to start, click again to stop (toggle mode)
- Q: Should there be a maximum recording duration limit? → A: 5 minutes maximum (auto-stop with warning at 4:45)

## Assumptions

- Users have modern browsers that support MediaRecorder API (Chrome 49+, Firefox 25+, Safari 14.1+, Edge 79+)
- OpenRouter provides Whisper API access through the existing API key configuration
- Backend can handle audio file uploads up to 25MB (Whisper limit)
- Portuguese and English are the primary languages for transcription
- Users are willing to grant microphone permission for the voice feature
- The existing glassmorphism design system provides sufficient flexibility for the recording UI state
