# Tasks: Custom Alert Dialogs

**Input**: Design documents from `/specs/014-custom-alerts/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested - manual testing specified in plan.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` (frontend-only feature)
- All paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Create the confirm-dialog directory structure

- [x] T001 Create confirm-dialog directory at frontend/src/components/confirm-dialog/

---

## Phase 2: Foundational (Imperative API Infrastructure)

**Purpose**: Build the core infrastructure that BOTH user stories depend on (US3 in spec)

**⚠️ CRITICAL**: No migration work can begin until this phase is complete

### Confirmation Dialog API

- [x] T002 Create ConfirmOptions interface and types in frontend/src/components/confirm-dialog/types.ts
- [x] T003 Create ConfirmDialogProvider component with AlertDialog + Promise-based state management in frontend/src/components/confirm-dialog/ConfirmDialogProvider.tsx
- [x] T004 Create useConfirm hook that returns confirm() function in frontend/src/components/confirm-dialog/useConfirm.ts
- [x] T005 Create index.ts exports for confirm-dialog module in frontend/src/components/confirm-dialog/index.ts

### Toast Type Variants

- [x] T006 [P] Add success, warning, info variants to toastVariants in frontend/src/components/ui/toast.tsx
- [x] T007 [P] Add icon support (CheckCircle, AlertTriangle, Info, XCircle) per variant in frontend/src/components/ui/toaster.tsx

### Provider Integration

- [x] T008 Add ConfirmDialogProvider to root layout in frontend/src/app/layout.tsx

**Checkpoint**: Imperative APIs ready - `useConfirm()` and `toast()` with variants available for use

---

## Phase 3: User Story 1 - Delete Confirmation Dialogs (Priority: P1) 🎯 MVP

**Goal**: Replace all native `confirm()` calls with custom styled confirmation dialogs

**Independent Test**: Attempt to delete any item and verify custom dialog appears with glassmorphism styling, title, message, and destructive button

### Implementation for User Story 1

- [x] T009 [P] [US1] Replace confirm() in frontend/src/components/ShareDialog.tsx (revoke sharing)
- [x] T010 [P] [US1] Replace confirm() in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx (delete item)
- [x] T011 [P] [US1] Replace confirm() in frontend/src/components/FolderTree.tsx (archive folder)
- [x] T012 [P] [US1] Replace confirm() in frontend/src/app/workspace/[id]/project/[projectId]/workflows/page.tsx (delete workflow)
- [x] T013 [P] [US1] Replace confirm() in frontend/src/app/workspace/[id]/settings/page.tsx (remove member)
- [x] T014 [P] [US1] Replace confirm() in frontend/src/app/workspace/[id]/project/[projectId]/workflows/[workflowId]/page.tsx (delete workflow)
- [x] T015 [P] [US1] Replace confirm() in frontend/src/components/ConversationsList.tsx (delete conversation)
- [x] T016 [P] [US1] Replace confirm() in frontend/src/app/workspace/[id]/workflows/executions/[executionId]/page.tsx (stop workflow)
- [x] T017 [P] [US1] Replace confirm() in frontend/src/components/document/DocumentAttachments.tsx (remove image)
- [x] T018 [P] [US1] Replace confirm() in frontend/src/components/ImageViewer.tsx (archive image)
- [x] T019 [P] [US1] Replace confirm() in frontend/src/components/workflow/ActiveWorkflowsPanel.tsx (stop workflow)

**Checkpoint**: All 10 confirm() calls replaced - delete/archive confirmations show custom dialogs

---

## Phase 4: User Story 2 - Toast Notifications (Priority: P2)

**Goal**: Replace all native `alert()` calls with styled toast notifications

**Independent Test**: Trigger any error condition (e.g., attach more than 20 images) and verify styled toast appears with appropriate variant (warning/error)

### Implementation for User Story 2

- [x] T020 [P] [US2] Replace alert() calls in frontend/src/components/document/AttachImageModal.tsx (4 occurrences - image limits and errors)
- [x] T021 [P] [US2] Replace alert() calls in frontend/src/components/workflow/ActiveWorkflowsPanel.tsx (3 occurrences - pause/resume/stop failures)

**Checkpoint**: All 7 alert() calls replaced - errors show as toast notifications

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Styling enhancements and final verification

- [x] T022 Apply glassmorphism styling to AlertDialogContent in frontend/src/components/ui/alert-dialog.tsx (backdrop-blur, semi-transparent bg, soft shadows)
- [x] T023 Apply glassmorphism styling to Toast component in frontend/src/components/ui/toast.tsx
- [x] T024 Verify keyboard navigation works (Escape to cancel, Tab between buttons) in confirmation dialogs
- [x] T025 Verify toast stacking behavior when multiple toasts are triggered
- [x] T026 Test all 17 migrated locations to ensure styling is consistent

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS all user stories)
    ↓
Phase 3: US1 (Confirmations) ←→ Phase 4: US2 (Toasts)  [Can run in parallel]
    ↓
Phase 5: Polish (after US1 and US2 complete)
```

### User Story Dependencies

- **User Story 1 (P1)**: Depends on T002-T005, T008 (confirm dialog infrastructure)
- **User Story 2 (P2)**: Depends on T006-T007, T008 (toast variants)
- **User Story 3 (P3)**: Implemented as Foundational phase - no user story tasks needed

### Within Each Phase

- Phase 2 tasks T002→T003→T004→T005 must be sequential (types → provider → hook → exports)
- Phase 2 tasks T006 and T007 can run in parallel with each other
- Phase 3 tasks T009-T019 can ALL run in parallel (different files)
- Phase 4 tasks T020-T021 can ALL run in parallel (different files)

### Parallel Opportunities

```
# Phase 2 - Toast and Confirm infrastructure in parallel:
T006 ←→ T007  (toast variants parallel)
T002-T005 (confirm dialog sequential)
Both streams can run in parallel

# Phase 3 - All confirm migrations in parallel:
T009 ←→ T010 ←→ T011 ←→ T012 ←→ T013 ←→ T014 ←→ T015 ←→ T016 ←→ T017 ←→ T018 ←→ T019

# Phase 4 - All alert migrations in parallel:
T020 ←→ T021
```

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, launch ALL confirm() migrations together:
Task: "Replace confirm() in frontend/src/components/ShareDialog.tsx"
Task: "Replace confirm() in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx"
Task: "Replace confirm() in frontend/src/components/FolderTree.tsx"
Task: "Replace confirm() in frontend/src/app/workspace/[id]/project/[projectId]/workflows/page.tsx"
# ... all 11 tasks can run simultaneously
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (1 task)
2. Complete Phase 2: Foundational - confirm dialog parts only (T002-T005, T008)
3. Complete Phase 3: User Story 1 (11 tasks - all parallel)
4. **STOP and VALIDATE**: Test all delete/archive confirmations
5. Deploy/demo with custom confirmation dialogs

### Full Implementation

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (all 7 tasks)
3. Complete Phase 3: User Story 1 (confirmations) - **parallel with Phase 4**
4. Complete Phase 4: User Story 2 (toasts)
5. Complete Phase 5: Polish
6. Final verification of all 17 migrated locations

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 (confirmations) → Test → Deploy (MVP!)
3. Add US2 (toasts) → Test → Deploy
4. Polish → Final release

---

## Task Summary

| Phase | Tasks | Parallel Opportunities |
|-------|-------|----------------------|
| Phase 1: Setup | 1 | None |
| Phase 2: Foundational | 7 | T006 ∥ T007 |
| Phase 3: US1 (Confirmations) | 11 | All 11 parallel |
| Phase 4: US2 (Toasts) | 2 | Both parallel |
| Phase 5: Polish | 5 | T022 ∥ T023 |
| **Total** | **26** | **17 parallelizable** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story (US1, US2)
- US3 (imperative API) is implemented as Phase 2 Foundational - it's infrastructure, not a user-facing story
- All migrations preserve existing message text (Portuguese and English)
- Commit after each phase or logical group of parallel tasks
- Stop at any checkpoint to validate independently
