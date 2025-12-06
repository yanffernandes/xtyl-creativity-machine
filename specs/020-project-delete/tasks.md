# Tasks: Project Deletion with Soft Delete

**Input**: Design documents from `/specs/020-project-delete/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.yaml

**Tests**: Not explicitly requested in spec - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/` (Python/FastAPI)
- **Frontend**: `frontend/src/` (Next.js/React)

---

## Phase 1: Setup (Database Migration)

**Purpose**: Add soft delete columns to database tables

- [x] T001 Create database migration file in backend/migrations/023_add_project_soft_delete.sql with deleted_at columns for projects, workflow_templates, and workflow_executions tables plus indexes

---

## Phase 2: Foundational (Backend Model & CRUD Updates)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Add deleted_at column to Project model in backend/models.py
- [x] T003 [P] Add deleted_at column to WorkflowTemplate model in backend/models.py
- [x] T004 [P] Add deleted_at column to WorkflowExecution model in backend/models.py
- [x] T005 Add soft_delete_project() function with cascade logic in backend/crud.py
- [x] T006 Update get_workspace_projects() to filter deleted_at IS NULL in backend/crud.py
- [x] T007 [P] Update any other project queries to filter soft-deleted records in backend/crud.py

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Delete a Project with Confirmation (Priority: P1) 🎯 MVP

**Goal**: Users can delete projects through the settings page with two-step confirmation

**Independent Test**: Navigate to project settings, click delete, complete confirmations, verify project disappears from workspace

### Backend Implementation for User Story 1

- [x] T008 [US1] Add authorization check function can_delete_project() in backend/crud.py (checks workspace owner/admin role)
- [x] T009 [US1] Add DELETE /projects/{project_id} endpoint in backend/routers/projects.py with auth check and soft delete call
- [x] T010 [US1] Add DeleteProjectResponse schema in backend/schemas.py with cascade_summary

### Frontend Implementation for User Story 1

- [x] T011 [US1] Add deleted_at field to Project type in frontend/src/types/supabase.ts
- [x] T012 [US1] Add deleteProject() API function in frontend/src/lib/api.ts
- [x] T013 [US1] Create DeleteProjectDialog component with two-step confirmation in frontend/src/components/project/DeleteProjectDialog.tsx
- [x] T014 [US1] Add Danger Zone section to ProjectSettingsForm in frontend/src/components/project/ProjectSettingsForm.tsx
- [x] T015 [US1] Update useDeleteProject mutation in frontend/src/hooks/use-projects.ts to call backend API and invalidate cache
- [x] T016 [US1] Add project name display to settings page header in frontend/src/app/workspace/[id]/project/[projectId]/settings/page.tsx

**Checkpoint**: User Story 1 complete - users can delete projects with confirmation flow

---

## Phase 4: User Story 2 - Recover from Accidental Deletion (Priority: P2)

**Goal**: Soft-deleted data remains recoverable in database for admin recovery

**Independent Test**: Delete a project via UI, query database to verify project and child records have deleted_at timestamps

### Implementation for User Story 2

- [x] T017 [US2] Verify cascade updates documents deleted_at in soft_delete_project() in backend/crud.py
- [x] T018 [US2] Verify cascade updates folders deleted_at in soft_delete_project() in backend/crud.py
- [x] T019 [US2] Verify cascade updates workflow_templates deleted_at in soft_delete_project() in backend/crud.py
- [x] T020 [US2] Verify cascade updates workflow_executions deleted_at in soft_delete_project() in backend/crud.py
- [x] T021 [US2] Add activity logging for project deletion in backend/crud.py using log_activity()

**Checkpoint**: User Story 2 complete - all soft-deleted data is recoverable

---

## Phase 5: User Story 3 - Cancel Deletion Mid-Process (Priority: P3)

**Goal**: Users can safely cancel at any confirmation step without changes

**Independent Test**: Start deletion flow, click cancel at each step, verify project unchanged

### Implementation for User Story 3

- [x] T022 [US3] Add Cancel button with onClose handler to step 1 dialog in frontend/src/components/project/DeleteProjectDialog.tsx
- [x] T023 [US3] Add Cancel button with onClose handler to step 2 dialog in frontend/src/components/project/DeleteProjectDialog.tsx
- [x] T024 [US3] Ensure dialog state resets on cancel (clear input, reset step) in frontend/src/components/project/DeleteProjectDialog.tsx

**Checkpoint**: User Story 3 complete - cancel flow works at all stages

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T025 [P] Add error handling for delete failures with user-friendly messages in frontend/src/components/project/DeleteProjectDialog.tsx
- [x] T026 [P] Add loading state during delete operation in frontend/src/components/project/DeleteProjectDialog.tsx
- [x] T027 [P] Add success toast notification after deletion in frontend/src/components/project/DeleteProjectDialog.tsx
- [x] T028 Implement redirect to workspace home after successful deletion in frontend/src/components/project/DeleteProjectDialog.tsx
- [x] T029 Run migration on development database and verify soft delete works end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on migration (T001) being run
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Can start after Foundational, mostly verification tasks
- **User Story 3 (Phase 5)**: Can start after User Story 1 (needs dialog to exist)
- **Polish (Phase 6)**: Depends on User Story 1 being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (Phase 2) - Core delete flow
- **User Story 2 (P2)**: Depends on Foundational (Phase 2) - Verifies cascade behavior
- **User Story 3 (P3)**: Depends on User Story 1 (Phase 3) - Requires dialog component

### Within Each Phase

- Backend tasks before frontend tasks (API must exist before UI calls it)
- Models/schemas before endpoints
- CRUD functions before router endpoints
- API function before React component that uses it

### Parallel Opportunities

- T003 and T004 can run in parallel (different model sections)
- T006 and T007 can run in parallel (different query functions)
- T011 and T012 can run in parallel (different files)
- T017, T018, T019, T020 can run in parallel (verification tasks)
- T022, T023 can run in parallel (different dialog steps)
- T025, T026, T027 can run in parallel (different concerns)

---

## Parallel Example: Foundational Phase

```bash
# After T002 completes, launch T003 and T004 in parallel:
Task: "Add deleted_at column to WorkflowTemplate model in backend/models.py"
Task: "Add deleted_at column to WorkflowExecution model in backend/models.py"

# After T005 completes, launch T006 and T007 in parallel:
Task: "Update get_workspace_projects() to filter deleted_at IS NULL in backend/crud.py"
Task: "Update any other project queries to filter soft-deleted records in backend/crud.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (migration)
2. Complete Phase 2: Foundational (models + CRUD)
3. Complete Phase 3: User Story 1 (delete flow)
4. **STOP and VALIDATE**: Test delete flow end-to-end
5. Deploy if ready

### Incremental Delivery

1. Setup + Foundational → Database and models ready
2. User Story 1 → Core delete functionality (MVP!)
3. User Story 2 → Verify cascade behavior
4. User Story 3 → Polish cancel flow
5. Polish → Error handling, loading states, notifications

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (Tasks T001-T016)**

This delivers the core delete functionality that users need. User Stories 2 and 3 are enhancements.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable after completion
- Migration (T001) must be run before backend can work with new columns
- Frontend relies on backend API existing first
- Commit after each task or logical group
