# Tasks: Project Settings & Context Information

**Input**: Design documents from `/specs/009-project-settings/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Database migration and schema setup

- [x] T001 Create migration file `backend/migrations/014_add_project_settings.sql` with settings JSONB column
- [x] T002 Run migration to add settings column to projects table
- [x] T003 [P] Create ProjectSettings Pydantic schemas in `backend/schemas.py`

---

## Phase 2: Foundational (Backend API)

**Purpose**: Core API endpoints that ALL user stories depend on

**⚠️ CRITICAL**: Frontend work cannot begin until this phase is complete

- [x] T004 Add GET `/projects/{project_id}/settings` endpoint in `backend/routers/projects.py`
- [x] T005 Add PUT `/projects/{project_id}/settings` endpoint in `backend/routers/projects.py`
- [x] T006 Implement validation for required client_name field in settings endpoint
- [x] T007 [P] Add settings API functions in `frontend/src/lib/api.ts` (getProjectSettings, updateProjectSettings)

**Checkpoint**: API ready - frontend implementation can now begin

---

## Phase 3: User Story 1 - Configure Basic Project Information (Priority: P1) 🎯 MVP

**Goal**: Users can define and save basic project information (client name, description, target audience)

**Independent Test**: Create a project, fill settings form, save, reload page, verify data persists

### Implementation for User Story 1

- [x] T008 [US1] Create settings page at `frontend/src/app/workspace/[id]/project/[projectId]/settings/page.tsx`
- [x] T009 [US1] Create ProjectSettingsForm component in `frontend/src/components/project/ProjectSettingsForm.tsx`
- [x] T010 [P] [US1] Add client_name input field with required validation in ProjectSettingsForm
- [x] T011 [P] [US1] Add description textarea field in ProjectSettingsForm
- [x] T012 [P] [US1] Add target_audience textarea field in ProjectSettingsForm
- [x] T013 [US1] Implement form submit handler with API call in ProjectSettingsForm
- [x] T014 [US1] Add save button with loading state in ProjectSettingsForm
- [x] T015 [US1] Add success/error toast notifications on save in ProjectSettingsForm
- [x] T016 [US1] Add "Settings" link to project header in `frontend/src/app/workspace/[id]/project/[projectId]/page.tsx`
- [x] T017 [US1] Display client name in project header/sidebar when configured

**Checkpoint**: User Story 1 complete - users can configure and save basic project settings

---

## Phase 4: User Story 2 - AI Assistant Uses Project Context (Priority: P1) 🎯 MVP

**Goal**: AI assistant automatically uses project settings as context for all responses

**Independent Test**: Configure settings, chat with AI, verify response reflects project context without explicit mention

### Implementation for User Story 2

- [x] T018 [US2] Create `format_project_context()` function in `backend/routers/chat.py` to format settings as prompt context
- [x] T019 [US2] Modify chat endpoint to fetch project settings before LLM call in `backend/routers/chat.py`
- [x] T020 [US2] Inject formatted project context into system prompt in `backend/routers/chat.py`
- [x] T021 [US2] Handle case when project has no settings (use neutral defaults) in `backend/routers/chat.py`
- [x] T022 [US2] Ensure user prompt overrides take precedence over project context in `backend/routers/chat.py`

**Checkpoint**: User Story 2 complete - AI conversations automatically use project context

---

## Phase 5: User Story 3 - Extended Project Information Fields (Priority: P2)

**Goal**: Users can add detailed information (brand voice, key messages, competitors, notes)

**Independent Test**: Add extended fields, request AI content, verify output incorporates details

### Implementation for User Story 3

- [x] T023 [US3] Add brand_voice select field with predefined options in `frontend/src/components/project/ProjectSettingsForm.tsx`
- [x] T024 [US3] Add brand_voice_custom text field (shown when "custom" selected) in ProjectSettingsForm
- [x] T025 [P] [US3] Add key_messages array field with add/remove functionality in ProjectSettingsForm
- [x] T026 [P] [US3] Add competitors array field with add/remove functionality in ProjectSettingsForm
- [x] T027 [US3] Add custom_notes textarea field in ProjectSettingsForm
- [x] T028 [US3] Group extended fields in collapsible "Advanced Settings" section in ProjectSettingsForm
- [x] T029 [US3] Update `format_project_context()` to include extended fields in `backend/routers/chat.py`

**Checkpoint**: User Story 3 complete - extended fields available and used by AI

---

## Phase 6: User Story 4 - View and Copy Project Context (Priority: P3)

**Goal**: Users can preview and copy the exact context sent to AI

**Independent Test**: Configure settings, click "View AI Context", verify formatted preview, copy to clipboard

### Implementation for User Story 4

- [x] T030 [US4] Add GET `/projects/{project_id}/settings/context` endpoint in `backend/routers/projects.py`
- [x] T031 [US4] Create ProjectContextPreview component in `frontend/src/components/project/ProjectContextPreview.tsx`
- [x] T032 [US4] Add "View AI Context" button to settings page
- [x] T033 [US4] Display formatted context in modal/panel in ProjectContextPreview
- [x] T034 [US4] Add "Copy to Clipboard" functionality in ProjectContextPreview
- [x] T035 [US4] Show suggestions for missing fields that would improve AI responses in ProjectContextPreview

**Checkpoint**: User Story 4 complete - users can preview and copy AI context

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: UI polish and final improvements

- [x] T036 [P] Apply liquid glass design to settings page
- [x] T037 [P] Add loading skeleton while fetching settings
- [x] T038 Test responsive layout on mobile devices
- [x] T039 Validate all edge cases from spec (long descriptions, empty required fields, etc.)
- [x] T040 Run quickstart.md validation scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all frontend work
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Independent of US1 (different files)
- **User Story 3 (P2)**: Builds on US1 form - Best done after US1 complete
- **User Story 4 (P3)**: Independent component - Can parallel with US3

### Parallel Opportunities

Within Phase 3 (US1):
- T010, T011, T012 can run in parallel (different form fields)

Within Phase 5 (US3):
- T025, T026 can run in parallel (different array fields)

Within Phase 7:
- T036, T037 can run in parallel (different concerns)

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007)
3. Complete Phase 3: User Story 1 (T008-T017)
4. Complete Phase 4: User Story 2 (T018-T022)
5. **STOP and VALIDATE**: Basic settings + AI integration working
6. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → API ready
2. Add User Story 1 → Settings UI functional (MVP Part 1)
3. Add User Story 2 → AI uses context (MVP Complete)
4. Add User Story 3 → Extended fields available
5. Add User Story 4 → Context preview available
6. Polish → Production ready

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | T001-T003 (3) | Database migration, schemas |
| Phase 2: Foundational | T004-T007 (4) | Backend API endpoints |
| Phase 3: US1 (P1) | T008-T017 (10) | Basic settings form |
| Phase 4: US2 (P1) | T018-T022 (5) | AI context injection |
| Phase 5: US3 (P2) | T023-T029 (7) | Extended fields |
| Phase 6: US4 (P3) | T030-T035 (6) | Context preview |
| Phase 7: Polish | T036-T040 (5) | Final improvements |
| **Total** | **40 tasks** | |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Stories 1 + 2 form the MVP (basic settings + AI integration)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
