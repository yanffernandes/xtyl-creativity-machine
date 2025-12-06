# Tasks: Voice Input for Assistant

**Input**: Design documents from `/specs/021-voice-input-assistant/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/transcription-api.yaml, quickstart.md

**Tests**: Not explicitly requested in specification - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/` at repository root
- **Frontend**: `frontend/src/` at repository root
- Paths follow existing codebase structure per plan.md

---

## Phase 1: Setup (No new infrastructure needed)

**Purpose**: This feature integrates into existing project structure - minimal setup required

- [x] T001 Verify OpenRouter API key supports audio-capable models in .env configuration
- [x] T002 [P] Add Mic, Square icons import verification in frontend/src/components/ChatSidebar.tsx

**Note**: No new project initialization needed - feature adds to existing ChatSidebar and chat router.

---

## Phase 2: Foundational (Backend Transcription Service)

**Purpose**: Backend infrastructure that MUST be complete before frontend integration

**⚠️ CRITICAL**: Frontend voice recording depends on backend transcription endpoint

- [x] T003 Create transcription service module at backend/transcription_service.py with transcribe_audio() function
- [x] T004 Add TranscriptionRequest and TranscriptionResponse schemas to backend/schemas.py
- [x] T005 Add /chat/transcribe POST endpoint to backend/routers/chat.py with file upload handling
- [x] T006 Add audio validation constants (ALLOWED_AUDIO_TYPES, MAX_AUDIO_SIZE) to backend/routers/chat.py
- [x] T007 Test backend endpoint manually with curl command from quickstart.md

**Checkpoint**: Backend transcription endpoint ready - `/chat/transcribe` accepts audio and returns text

---

## Phase 3: User Story 1 - Voice Recording and Transcription (Priority: P1) 🎯 MVP

**Goal**: User clicks microphone button, records audio, and transcribed text appears in input field

**Independent Test**: Click mic button, speak "Olá mundo", verify text appears in input field

### Implementation for User Story 1

- [x] T008 [US1] Create useVoiceRecording hook at frontend/src/hooks/useVoiceRecording.ts with MediaRecorder integration
- [x] T009 [US1] Add transcribeAudio() API function to frontend/src/lib/api.ts for POST /chat/transcribe
- [x] T010 [US1] Import useVoiceRecording hook in frontend/src/components/ChatSidebar.tsx
- [x] T011 [US1] Add microphone button to ChatSidebar button row (after Templates, Anexar buttons) in frontend/src/components/ChatSidebar.tsx
- [x] T012 [US1] Implement handleVoiceInput() toggle function in frontend/src/components/ChatSidebar.tsx
- [x] T013 [US1] Connect transcription result to setInput() with space separator logic in frontend/src/components/ChatSidebar.tsx
- [x] T014 [US1] Add formatDuration() helper function for timer display in frontend/src/components/ChatSidebar.tsx

**Checkpoint**: User Story 1 complete - basic voice recording and transcription works end-to-end

---

## Phase 4: User Story 2 - Recording State Visual Feedback (Priority: P2)

**Goal**: User sees clear visual feedback for idle, recording, processing, and success states

**Independent Test**: Start recording and observe button changes to red stop icon with pulsing dot and timer

### Implementation for User Story 2

- [x] T015 [US2] Add AnimatePresence wrapper for microphone button states in frontend/src/components/ChatSidebar.tsx
- [x] T016 [US2] Implement idle state UI (Mic icon) with Framer Motion in frontend/src/components/ChatSidebar.tsx
- [x] T017 [US2] Implement recording state UI (Square icon + duration timer + pulsing red dot) in frontend/src/components/ChatSidebar.tsx
- [x] T018 [US2] Implement processing state UI (Loader2 spinner) in frontend/src/components/ChatSidebar.tsx
- [x] T019 [US2] Add button variant change (outline → destructive) when recording in frontend/src/components/ChatSidebar.tsx
- [x] T020 [US2] Add success toast notification after transcription completes in frontend/src/components/ChatSidebar.tsx

**Checkpoint**: User Story 2 complete - all visual states are clear and elegant

---

## Phase 5: User Story 3 - Error Handling and Browser Compatibility (Priority: P3)

**Goal**: Graceful error handling for unsupported browsers, permission denied, and API failures

**Independent Test**: Deny microphone permission and verify helpful error message appears

### Implementation for User Story 3

- [x] T021 [US3] Add isSupported check to conditionally render mic button in frontend/src/components/ChatSidebar.tsx
- [x] T022 [US3] Add permission denied error handling with toast message in useVoiceRecording hook
- [x] T023 [US3] Add unsupported browser error handling with toast message in useVoiceRecording hook
- [x] T024 [US3] Add API error handling with user-friendly Portuguese messages in handleVoiceInput()
- [x] T025 [US3] Add 5-minute max duration auto-stop with 4:45 warning toast in useVoiceRecording hook
- [x] T026 [US3] Add recording cancellation on component unmount in useVoiceRecording hook
- [x] T027 [US3] Disable send and voice buttons during processing state in frontend/src/components/ChatSidebar.tsx

**Checkpoint**: User Story 3 complete - all error cases handled gracefully

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final refinements and edge case handling

- [x] T028 [P] Verify existing chat functionality still works (typing, attachments, templates, send)
- [x] T029 [P] Test voice input appends to existing text with space separator
- [x] T030 [P] Test recording cancels when user navigates away from chat
- [x] T031 Verify button accessibility (keyboard navigation, aria labels) in frontend/src/components/ChatSidebar.tsx
- [x] T032 Run manual testing checklist from quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all frontend work
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 must complete before US2/US3 (they extend US1's implementation)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 (backend endpoint) - Creates core recording functionality
- **User Story 2 (P2)**: Depends on US1 - Adds visual feedback to existing recording flow
- **User Story 3 (P3)**: Depends on US1 - Adds error handling to existing recording flow

### Within Each User Story

- Backend must be ready before frontend integration
- Hook must exist before ChatSidebar integration
- Core functionality before visual polish
- Visual feedback before error handling

### Parallel Opportunities

**Phase 2 (Backend)**:
```bash
# These can be worked on in sequence but quickly:
Task: "Create transcription_service.py"
Task: "Add schemas to schemas.py"
Task: "Add endpoint to chat.py"
```

**Phase 3 (US1 - after T008, T009 complete)**:
```bash
# These modify same file (ChatSidebar.tsx) - do sequentially
```

**Phase 4 & 5 (US2 and US3)**:
```bash
# US2 and US3 both modify ChatSidebar.tsx
# Must be done sequentially to avoid conflicts
```

---

## Parallel Example: User Story 1

```bash
# Step 1: Create hook and API function in parallel:
Task: "Create useVoiceRecording hook at frontend/src/hooks/useVoiceRecording.ts"
Task: "Add transcribeAudio() API function to frontend/src/lib/api.ts"

# Step 2: After Step 1 completes, integrate into ChatSidebar:
Task: "Import useVoiceRecording hook in ChatSidebar.tsx"
Task: "Add microphone button to ChatSidebar"
Task: "Implement handleVoiceInput() toggle function"
Task: "Connect transcription result to setInput()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (quick verification)
2. Complete Phase 2: Foundational (backend service + endpoint)
3. Complete Phase 3: User Story 1 (basic recording and transcription)
4. **STOP and VALIDATE**: Test recording → transcription → text in input
5. Deploy/demo if ready - basic voice input works!

### Incremental Delivery

1. Phase 1 + 2 → Backend ready
2. Phase 3 (US1) → Basic voice input works → Demo MVP
3. Phase 4 (US2) → Beautiful visual feedback → Demo
4. Phase 5 (US3) → Bulletproof error handling → Demo
5. Phase 6 → Polish and final testing → Release

---

## Summary

| Phase | Tasks | Parallel Tasks | Description |
|-------|-------|----------------|-------------|
| Setup | 2 | 1 | Verify prerequisites |
| Foundational | 5 | 0 | Backend transcription service |
| US1 (P1) | 7 | 0 | Core voice recording |
| US2 (P2) | 6 | 0 | Visual feedback |
| US3 (P3) | 7 | 0 | Error handling |
| Polish | 5 | 3 | Final testing |
| **Total** | **32** | **4** | |

### Task Breakdown by User Story

- **User Story 1**: 7 tasks (T008-T014) - MVP
- **User Story 2**: 6 tasks (T015-T020) - Visual polish
- **User Story 3**: 7 tasks (T021-T027) - Error handling

### Suggested MVP Scope

Complete through Phase 3 (User Story 1) for a functional MVP with:
- Microphone button in chat interface
- Audio recording with MediaRecorder
- Transcription via OpenRouter
- Text insertion into input field

This delivers core value in ~14 tasks (T001-T014).

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story builds on previous but can be validated independently
- All ChatSidebar modifications are sequential to avoid merge conflicts
- Backend endpoint (T003-T007) must be complete before any frontend work
- Commit after each task or logical group
