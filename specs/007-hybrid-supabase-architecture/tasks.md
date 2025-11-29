# Tasks: Hybrid Supabase Architecture Migration

**Input**: Design documents from `/specs/007-hybrid-supabase-architecture/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/supabase-services.ts, contracts/rls-policies.sql

**Tests**: Not explicitly requested - tests are omitted from this task list.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/`
- **Backend**: `backend/`
- **Specs**: `specs/007-hybrid-supabase-architecture/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and Supabase Client configuration

- [x] T001 Install @supabase/ssr and @supabase/supabase-js dependencies in frontend/package.json
- [x] T002 Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local
- [x] T003 Create Supabase client singleton in frontend/src/lib/supabase/client.ts
- [x] T004 [P] Generate TypeScript types from database schema in frontend/src/types/supabase.ts
- [x] T005 [P] Copy service type definitions from contracts/supabase-services.ts to frontend/src/types/supabase-services.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database RLS policies and indexes that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Enable RLS on all tables (workspaces, workspace_users, projects, documents, folders, templates, user_preferences, chat_conversations) via Supabase SQL Editor
- [x] T007 Create helper functions (user_is_workspace_member, user_is_workspace_admin, user_has_document_access) via Supabase SQL Editor per contracts/rls-policies.sql
- [x] T008 Create performance indexes (idx_workspace_users_user_workspace, idx_projects_workspace, idx_documents_project, idx_folders_project) via Supabase SQL Editor
- [x] T009 Apply RLS policies for workspace_users table via Supabase SQL Editor
- [x] T010 Apply RLS policies for workspaces table via Supabase SQL Editor
- [x] T011 Apply RLS policies for projects table via Supabase SQL Editor
- [x] T012 [P] Apply RLS policies for documents table via Supabase SQL Editor
- [x] T013 [P] Apply RLS policies for folders table via Supabase SQL Editor
- [x] T014 [P] Apply RLS policies for templates table via Supabase SQL Editor
- [x] T015 [P] Apply RLS policies for user_preferences table via Supabase SQL Editor
- [x] T016 [P] Apply RLS policies for chat_conversations table via Supabase SQL Editor
- [x] T017 Test RLS policies with different user roles via Supabase SQL Editor

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Fast Project Listing (Priority: P1) MVP

**Goal**: Users see workspaces and projects instantly (<500ms) when navigating to workspace page

**Independent Test**: Navigate to workspace page, measure time to display projects. Target: <500ms (down from 3-5s)

### Implementation for User Story 1

- [x] T018 [P] [US1] Implement workspaceService.list() in frontend/src/lib/supabase/workspaces.ts
- [x] T019 [P] [US1] Implement workspaceService.get() in frontend/src/lib/supabase/workspaces.ts
- [x] T020 [P] [US1] Implement workspaceService.create() in frontend/src/lib/supabase/workspaces.ts
- [x] T021 [P] [US1] Implement workspaceService.update() in frontend/src/lib/supabase/workspaces.ts
- [x] T022 [P] [US1] Implement workspaceService.delete() in frontend/src/lib/supabase/workspaces.ts
- [x] T023 [US1] Implement workspaceService.listMembers() in frontend/src/lib/supabase/workspaces.ts
- [x] T024 [US1] Implement workspaceService.addMember() in frontend/src/lib/supabase/workspaces.ts
- [x] T025 [US1] Implement workspaceService.removeMember() in frontend/src/lib/supabase/workspaces.ts
- [x] T026 [P] [US1] Implement projectService.listByWorkspace() in frontend/src/lib/supabase/projects.ts
- [x] T027 [P] [US1] Implement projectService.get() in frontend/src/lib/supabase/projects.ts
- [x] T028 [P] [US1] Implement projectService.create() in frontend/src/lib/supabase/projects.ts
- [x] T029 [P] [US1] Implement projectService.update() in frontend/src/lib/supabase/projects.ts
- [x] T030 [P] [US1] Implement projectService.delete() in frontend/src/lib/supabase/projects.ts
- [x] T031 [US1] Create useWorkspaces hook with React Query in frontend/src/hooks/use-workspaces.ts
- [x] T032 [US1] Create useProjects hook with React Query in frontend/src/hooks/use-projects.ts
- [x] T033 [US1] Update workspace list component to use useWorkspaces hook instead of API call
- [x] T034 [US1] Update project list component to use useProjects hook instead of API call
- [x] T035 [US1] Add optimistic updates for workspace/project create operations
- [x] T036 [US1] Add error handling and toast notifications for workspace/project operations

**Checkpoint**: User Story 1 complete - workspaces and projects load via Supabase Client

---

## Phase 4: User Story 2 - Responsive Document Management (Priority: P1)

**Goal**: Users create, edit, and organize documents without noticeable delays (<300ms)

**Independent Test**: Create a new document, verify it appears in list within 200ms. Edit document metadata and confirm instant UI update.

### Implementation for User Story 2

- [x] T037 [P] [US2] Implement documentService.listByProject() in frontend/src/lib/supabase/documents.ts
- [x] T038 [P] [US2] Implement documentService.listByFolder() in frontend/src/lib/supabase/documents.ts
- [x] T039 [P] [US2] Implement documentService.listArchived() in frontend/src/lib/supabase/documents.ts
- [x] T040 [P] [US2] Implement documentService.get() in frontend/src/lib/supabase/documents.ts
- [x] T041 [P] [US2] Implement documentService.create() in frontend/src/lib/supabase/documents.ts
- [x] T042 [P] [US2] Implement documentService.update() in frontend/src/lib/supabase/documents.ts
- [x] T043 [US2] Implement documentService.move() in frontend/src/lib/supabase/documents.ts
- [x] T044 [US2] Implement documentService.archive() in frontend/src/lib/supabase/documents.ts
- [x] T045 [US2] Implement documentService.restore() in frontend/src/lib/supabase/documents.ts
- [x] T046 [US2] Implement documentService.delete() in frontend/src/lib/supabase/documents.ts
- [x] T047 [US2] Implement documentService.createShareLink() in frontend/src/lib/supabase/documents.ts
- [x] T048 [US2] Implement documentService.revokeShareLink() in frontend/src/lib/supabase/documents.ts
- [x] T049 [US2] Implement documentService.getShared() in frontend/src/lib/supabase/documents.ts
- [x] T050 [US2] Create useDocuments hook with React Query in frontend/src/hooks/use-documents.ts
- [ ] T051 [US2] Update document list component to use useDocuments hook instead of API call
- [x] T052 [US2] Add optimistic updates for document create/update/move operations
- [ ] T053 [US2] Update document detail component to use Supabase for metadata
- [x] T054 [US2] Add error handling and toast notifications for document operations

**Checkpoint**: User Story 2 complete - documents CRUD via Supabase Client

---

## Phase 5: User Story 3 - Seamless AI Operations (Priority: P2)

**Goal**: AI chat and image generation work reliably through Python backend (no migration needed)

**Independent Test**: Start AI chat conversation, verify streaming responses. Generate image, confirm progress feedback.

### Implementation for User Story 3

- [x] T055 [US3] Verify AI chat routes remain functional in backend/routers/chat.py
- [x] T056 [US3] Verify image generation routes remain functional in backend/routers/image_generation.py
- [x] T057 [US3] Verify workflow execution routes remain functional in backend/routers/executions.py
- [ ] T058 [US3] Update frontend/src/lib/api.ts to remove CRUD routes, keep only AI-related routes
- [x] T059 [US3] Ensure SSE streaming continues working for workflow execution

**Checkpoint**: User Story 3 complete - AI operations unchanged, backend routes verified

---

## Phase 6: User Story 4 - Folder Organization (Priority: P2)

**Goal**: Users create and manage folders instantly (<200ms)

**Independent Test**: Create a folder, verify it appears within 200ms. Move items between folders, confirm instant updates.

### Implementation for User Story 4

- [x] T060 [P] [US4] Implement folderService.listByProject() in frontend/src/lib/supabase/folders.ts
- [x] T061 [P] [US4] Implement folderService.listByParent() in frontend/src/lib/supabase/folders.ts
- [x] T062 [P] [US4] Implement folderService.listArchived() in frontend/src/lib/supabase/folders.ts
- [x] T063 [P] [US4] Implement folderService.get() in frontend/src/lib/supabase/folders.ts
- [x] T064 [P] [US4] Implement folderService.create() in frontend/src/lib/supabase/folders.ts
- [x] T065 [P] [US4] Implement folderService.update() in frontend/src/lib/supabase/folders.ts
- [x] T066 [US4] Implement folderService.move() in frontend/src/lib/supabase/folders.ts
- [x] T067 [US4] Implement folderService.archive() in frontend/src/lib/supabase/folders.ts
- [x] T068 [US4] Implement folderService.restore() in frontend/src/lib/supabase/folders.ts
- [x] T069 [US4] Implement folderService.delete() in frontend/src/lib/supabase/folders.ts
- [x] T070 [US4] Create useFolders hook with React Query in frontend/src/hooks/use-folders.ts
- [x] T071 [US4] Update folder tree component to use useFolders hook instead of API call
- [x] T072 [US4] Add optimistic updates for folder create/update/move operations
- [x] T073 [US4] Add error handling and toast notifications for folder operations

**Checkpoint**: User Story 4 complete - folders CRUD via Supabase Client

---

## Phase 7: User Story 5 - Template Access (Priority: P3)

**Goal**: Users browse and use templates quickly (<400ms)

**Independent Test**: Open templates panel, verify templates load within 400ms. Use a template to create document.

### Implementation for User Story 5

- [x] T074 [P] [US5] Implement templateService.listSystem() in frontend/src/lib/supabase/templates.ts
- [x] T075 [P] [US5] Implement templateService.listUserTemplates() in frontend/src/lib/supabase/templates.ts
- [x] T076 [P] [US5] Implement templateService.listByWorkspace() in frontend/src/lib/supabase/templates.ts
- [x] T077 [P] [US5] Implement templateService.get() in frontend/src/lib/supabase/templates.ts
- [x] T078 [P] [US5] Implement templateService.create() in frontend/src/lib/supabase/templates.ts
- [x] T079 [P] [US5] Implement templateService.update() in frontend/src/lib/supabase/templates.ts
- [x] T080 [US5] Implement templateService.delete() in frontend/src/lib/supabase/templates.ts
- [x] T081 [US5] Implement templateService.duplicate() in frontend/src/lib/supabase/templates.ts
- [x] T082 [US5] Create useTemplates hook with React Query in frontend/src/hooks/use-templates.ts
- [x] T083 [US5] Update templates panel component to use useTemplates hook instead of API call
- [x] T084 [US5] Add error handling and toast notifications for template operations

**Checkpoint**: User Story 5 complete - templates CRUD via Supabase Client

---

## Phase 8: User Story 6 - User Preferences & Conversations (Priority: P3)

**Goal**: Settings save instantly (<200ms), conversation metadata accessible via Supabase

**Independent Test**: Change a preference, verify it persists across page refresh.

### Implementation for User Story 6

- [x] T085 [P] [US6] Implement preferencesService.get() in frontend/src/lib/supabase/preferences.ts
- [x] T086 [P] [US6] Implement preferencesService.update() in frontend/src/lib/supabase/preferences.ts
- [x] T087 [P] [US6] Implement conversationService.list() in frontend/src/lib/supabase/conversations.ts
- [x] T088 [P] [US6] Implement conversationService.get() in frontend/src/lib/supabase/conversations.ts
- [x] T089 [P] [US6] Implement conversationService.create() in frontend/src/lib/supabase/conversations.ts
- [x] T090 [US6] Implement conversationService.update() in frontend/src/lib/supabase/conversations.ts
- [x] T091 [US6] Implement conversationService.archive() in frontend/src/lib/supabase/conversations.ts
- [x] T092 [US6] Implement conversationService.restore() in frontend/src/lib/supabase/conversations.ts
- [x] T093 [US6] Implement conversationService.delete() in frontend/src/lib/supabase/conversations.ts
- [x] T094 [US6] Create usePreferences hook with React Query in frontend/src/hooks/use-preferences.ts
- [x] T095 [US6] Create useConversations hook with React Query in frontend/src/hooks/use-conversations.ts
- [x] T096 [US6] Update settings page to use usePreferences hook instead of API call
- [x] T097 [US6] Update conversation list to use useConversations hook instead of API call
- [x] T098 [US6] Add error handling for preferences and conversation operations

**Checkpoint**: User Story 6 complete - preferences and conversations via Supabase Client

---

## Phase 9: Backend Cleanup & Polish

**Purpose**: Remove deprecated CRUD routes from Python backend, final integration

- [x] T099 Remove workspace CRUD routes from backend/routers/workspaces.py (file deleted)
- [x] T100 Remove project routes from backend/main.py router registration (handled by workspaces.py removal)
- [x] T101 Documents router keeps upload/export - CRUD via Supabase
- [x] T102 Remove folder routes from backend/routers/folders.py (file deleted)
- [x] T103 Simplify template routes - kept only /init endpoint
- [x] T104 Remove preferences routes from backend/routers/preferences.py (file deleted)
- [x] T105 Simplify conversation routes - kept only /messages and /add-document endpoints
- [x] T106 Update backend/main.py to remove deprecated router imports
- [ ] T107 Run performance benchmarks: measure CRUD latency (target <500ms)
- [ ] T108 Validate all user stories pass acceptance criteria per spec.md
- [ ] T109 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5 → US6)
- **Backend Cleanup (Phase 9)**: Depends on ALL user story phases being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Verification only, no migration
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Service implementation before hooks
- Hooks before component updates
- Core implementation before optimistic updates
- Integration before error handling

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T012-T016 can run in parallel (different table policies)

**Phase 3 (US1)**:
- T018-T022 can run in parallel (different workspace methods)
- T026-T030 can run in parallel (different project methods)

**Phase 4 (US2)**:
- T037-T042 can run in parallel (different document methods)

**Phase 6 (US4)**:
- T060-T065 can run in parallel (different folder methods)

**Phase 7 (US5)**:
- T074-T079 can run in parallel (different template methods)

**Phase 8 (US6)**:
- T085-T089 can run in parallel (different methods)

---

## Parallel Example: User Story 1

```bash
# Launch all workspace service methods in parallel:
Task: "Implement workspaceService.list() in frontend/src/lib/supabase/workspaces.ts"
Task: "Implement workspaceService.get() in frontend/src/lib/supabase/workspaces.ts"
Task: "Implement workspaceService.create() in frontend/src/lib/supabase/workspaces.ts"
Task: "Implement workspaceService.update() in frontend/src/lib/supabase/workspaces.ts"
Task: "Implement workspaceService.delete() in frontend/src/lib/supabase/workspaces.ts"

# Launch all project service methods in parallel:
Task: "Implement projectService.listByWorkspace() in frontend/src/lib/supabase/projects.ts"
Task: "Implement projectService.get() in frontend/src/lib/supabase/projects.ts"
Task: "Implement projectService.create() in frontend/src/lib/supabase/projects.ts"
Task: "Implement projectService.update() in frontend/src/lib/supabase/projects.ts"
Task: "Implement projectService.delete() in frontend/src/lib/supabase/projects.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Fast Project Listing)
4. **STOP and VALIDATE**: Test workspace/project listing latency (<500ms)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Verify AI operations → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Add User Story 6 → Test independently → Deploy/Demo
8. Backend Cleanup → Final validation → Production release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + User Story 2 (P1 priority, document focus)
   - Developer B: User Story 4 + User Story 5 (folder + template focus)
   - Developer C: User Story 6 + Backend Cleanup (preferences + cleanup)
3. User Story 3 is verification only - can be done by any developer

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Big-bang migration: All CRUD migrates at once, then backend routes removed
- RLS policies in Phase 2 are critical - test thoroughly before proceeding
