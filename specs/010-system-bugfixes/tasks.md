# Tasks: System Bugfixes - Pre-Launch Corrections

**Input**: Design documents from `/specs/010-system-bugfixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested - manual testing per bug fix

**Organization**: Tasks grouped by user story (bug) to enable independent fixes and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/routers/`, `backend/schemas.py`
- **Frontend**: `frontend/src/components/`, `frontend/src/app/`

---

## Phase 1: Setup

**Purpose**: No setup needed - all infrastructure exists

> ✅ Skip to Phase 2 - this is a bugfix feature, no new infrastructure required

---

## Phase 2: Foundational (Quick Fixes First)

**Purpose**: Low-effort fixes that unblock other work and provide immediate value

- [ ] T001 [P] Add VisuallyHidden DialogTitle to CommandDialog in frontend/src/components/ui/command.tsx
- [ ] T002 [P] Add is_reference_asset filter to KanbanBoard in frontend/src/components/KanbanBoard.tsx
- [ ] T003 [P] Verify /auth/me endpoint returns email field in backend/routers/auth.py

**Checkpoint**: Quick wins complete - US2, US5, US6 potentially done

---

## Phase 3: User Story 5 - Dialog Accessibility Fix (Priority: P2)

**Goal**: Remove accessibility warning from CommandPalette (Cmd+K)

**Independent Test**: Open DevTools console, press Cmd+K, verify no "DialogTitle" warning appears

### Implementation for User Story 5

- [ ] T004 [US5] Import VisuallyHidden from @radix-ui/react-visually-hidden in frontend/src/components/ui/command.tsx
- [ ] T005 [US5] Add DialogTitle wrapped in VisuallyHidden inside CommandDialog content in frontend/src/components/ui/command.tsx
- [ ] T006 [US5] Test CommandPalette opens without console warnings

**Checkpoint**: Accessibility warning eliminated

---

## Phase 4: User Story 2 - Visual Assets Separate from Kanban (Priority: P1)

**Goal**: Visual assets (is_reference_asset=true) should NOT appear in Kanban board

**Independent Test**: Upload image to Assets Visuais, verify it doesn't appear in Kanban

### Implementation for User Story 2

- [ ] T007 [US2] Add filter to exclude is_reference_asset documents in frontend/src/components/KanbanBoard.tsx
- [ ] T008 [US2] Verify Kanban only shows work documents (status-based filtering preserved)
- [ ] T009 [US2] Test upload to Assets Visuais doesn't pollute Kanban

**Checkpoint**: Kanban shows only work documents

---

## Phase 5: User Story 6 - Profile Email Display (Priority: P3)

**Goal**: Display user email on profile page

**Independent Test**: Navigate to profile page, verify email is displayed

### Implementation for User Story 6

- [ ] T010 [US6] Verify backend /auth/me endpoint returns email from Supabase user in backend/routers/auth.py
- [ ] T011 [US6] Verify frontend profile page correctly reads user.email in frontend/src/app/workspace/[id]/profile/page.tsx
- [ ] T012 [US6] Add fallback message "Email não disponível" when email is null

**Checkpoint**: Email displays on profile (or appropriate fallback)

---

## Phase 6: User Story 4 - Project Name and Client Name Sync (Priority: P2)

**Goal**: When client_name changes in settings, project.name should sync automatically

**Independent Test**: Change Client Name in settings, verify project name updates in sidebar

### Implementation for User Story 4

- [ ] T013 [US4] Modify PUT /projects/{id}/settings to also update project.name in backend/routers/projects.py
- [ ] T014 [US4] Return updated project_name in settings response
- [ ] T015 [US4] Update frontend to refresh project name after settings save in frontend/src/components/project/ProjectSettingsForm.tsx
- [ ] T016 [US4] Verify sidebar reflects new project name immediately

**Checkpoint**: Project name syncs with Client Name

---

## Phase 7: User Story 3 - Activity History Tracking (Priority: P2)

**Goal**: Display activity log in UI (backend API already exists)

**Independent Test**: Create a document, verify "Document created" appears in Activity History

### Implementation for User Story 3

- [ ] T017 [P] [US3] Create ActivityHistory component skeleton in frontend/src/components/ActivityHistory.tsx
- [ ] T018 [US3] Implement API call to GET /activity/project/{projectId}/recent
- [ ] T019 [US3] Display activity items with action icon, entity name, timestamp, user
- [ ] T020 [US3] Add scroll infinito pagination for large activity lists
- [ ] T021 [US3] Integrate ActivityHistory into project page sidebar or tab
- [ ] T022 [US3] Style ActivityHistory with design system tokens (surface-secondary, text-primary, etc.)

**Checkpoint**: Activity history displays user actions

---

## Phase 8: User Story 1 - Conversation History Persistence (Priority: P1)

**Goal**: Save chat messages and display conversation history with scroll infinito

**Independent Test**: Send chat message, reload page, click "Histórico de Conversas", verify message appears

### Backend Implementation for User Story 1

- [ ] T023 [US1] Add ConversationListItem and ConversationListResponse schemas in backend/schemas.py
- [ ] T024 [US1] Add GET /conversations endpoint with pagination in backend/routers/conversations.py
- [ ] T025 [US1] Add GET /conversations/{id} endpoint to load full conversation
- [ ] T026 [US1] Modify chat completion to save messages to ChatConversation in backend/routers/chat.py
- [ ] T027 [US1] Implement get_or_create_conversation helper function
- [ ] T028 [US1] Update conversation title/summary after first exchange

### Frontend Implementation for User Story 1

- [ ] T029 [P] [US1] Create ChatHistory component skeleton in frontend/src/components/ChatHistory.tsx
- [ ] T030 [US1] Implement conversation list with scroll infinito pagination
- [ ] T031 [US1] Display conversation preview (title, date, message count)
- [ ] T032 [US1] Implement conversation selection to load messages
- [ ] T033 [US1] Integrate ChatHistory into project page chat panel
- [ ] T034 [US1] Style ChatHistory with design system tokens
- [ ] T035 [US1] Add "Nova Conversa" button to start fresh conversation

**Checkpoint**: Conversation history fully functional with persistence

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T036 Verify all 6 bugs fixed with manual testing per quickstart.md
- [ ] T037 Remove any debug console.log statements added during development
- [ ] T038 Ensure no TypeScript/Python linting errors introduced

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Skipped - no new infrastructure
- **Foundational (Phase 2)**: Quick parallel fixes, no dependencies
- **User Stories (Phase 3-8)**: Can proceed after foundational, ordered by effort (quick first)
- **Polish (Phase 9)**: Depends on all user stories complete

### User Story Dependencies

- **US5 (Accessibility)**: No dependencies - isolated to command.tsx
- **US2 (Kanban Filter)**: No dependencies - isolated to KanbanBoard.tsx
- **US6 (Profile Email)**: No dependencies - isolated to profile page
- **US4 (Project Sync)**: No dependencies - backend + frontend coordination
- **US3 (Activity History)**: No dependencies - new component + existing API
- **US1 (Chat History)**: Most complex - backend + frontend + new component

### Parallel Opportunities

```
Phase 2 (all can run in parallel):
├── T001 (command.tsx)
├── T002 (KanbanBoard.tsx)
└── T003 (auth.py verification)

US5 + US2 + US6 can run in parallel (different files)
US4 can run in parallel with US3
US1 is largest - can run while others complete
```

---

## Implementation Strategy

### Recommended Order (Quick Wins First)

1. **T001-T003**: Foundational quick fixes (~15 min total)
2. **US5 + US2 + US6**: Low effort, high visibility (~30 min total)
3. **US4**: Project sync (~30 min)
4. **US3**: Activity history UI (~1 hour)
5. **US1**: Conversation history (~2 hours)
6. **T036-T038**: Final validation (~15 min)

**Total Estimated**: ~4-5 hours

### MVP First (Minimal Viable Fix)

1. Complete Phase 2 (quick fixes) → 3 bugs fixed immediately
2. Complete US4 (project sync) → 4 bugs fixed
3. **STOP and VALIDATE**: Core UX bugs resolved
4. Continue with US3, US1 as time permits

### Parallel Team Strategy

With 2 developers:
- **Dev A**: US5 → US2 → US6 → US4 → Polish
- **Dev B**: US3 → US1

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each bug fix is independently testable
- Commit after each completed user story phase
- Test each fix immediately after implementation
- Design system tokens: surface-primary, surface-secondary, text-primary, text-secondary, accent-primary, border-primary
