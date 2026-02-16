# Tasks: Bug Report System

**Input**: Design documents from `/specs/021-bug-report-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested. Test tasks NOT included.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Paths follow web app structure: `frontend/src/`, `backend/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, dependencies, and database setup

- [ ] T001 Install html2canvas dependency in frontend/package.json
- [ ] T002 Create database migration file in database/migrations/003_bug_reports.sql
- [ ] T003 [P] Create Supabase Storage bucket "bug-reports" with policies
- [ ] T004 [P] Create feature module structure at frontend/src/features/bug-report/
- [ ] T005 [P] Create backend module structure at backend/src/modules/bug-report/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, hooks, and API infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Define TypeScript types in frontend/src/features/bug-report/types/index.ts
- [ ] T007 [P] Implement useConsoleErrors hook in frontend/src/features/bug-report/hooks/useConsoleErrors.ts
- [ ] T008 [P] Implement useBrowserInfo hook in frontend/src/features/bug-report/hooks/useBrowserInfo.ts
- [ ] T009 Create bugReportStore (Zustand) in frontend/src/features/bug-report/stores/bugReportStore.ts
- [ ] T010 [P] Add queryKeys for bug-reports in frontend/src/shared/utils/queryKeys.ts
- [ ] T011 [P] Implement queries (useBugReports, useBugReport, useBugReportSettings) in frontend/src/features/bug-report/api/queries.ts
- [ ] T012 [P] Implement mutations (useCreateBugReport, useUpdateStatus, useUploadAttachment) in frontend/src/features/bug-report/api/mutations.ts
- [ ] T013 Create barrel export in frontend/src/features/bug-report/api/index.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Reportar Bug com Screenshot Automático (Priority: P1) 🎯 MVP

**Goal**: Usuário pode reportar bug com screenshot automático capturado quando abre o modal

**Independent Test**: Clicar no botão de bug, verificar screenshot capturado, preencher form, enviar e confirmar no Supabase

### Implementation for User Story 1

- [ ] T014 [P] [US1] Implement useScreenshot hook in frontend/src/features/bug-report/hooks/useScreenshot.ts
- [ ] T015 [P] [US1] Create screenshot utility functions in frontend/src/features/bug-report/utils/screenshot.ts
- [ ] T016 [P] [US1] Create ScreenshotPreview component in frontend/src/features/bug-report/components/ScreenshotPreview/
- [ ] T017 [US1] Create BugReportForm component (description, severity, type) in frontend/src/features/bug-report/components/BugReportForm/
- [ ] T018 [US1] Create BugReportModal component in frontend/src/features/bug-report/components/BugReportModal/
- [ ] T019 [US1] Create BugReportButton component (floating button with collapse) in frontend/src/features/bug-report/components/BugReportButton/
- [ ] T020 [US1] Create components barrel export in frontend/src/features/bug-report/components/index.ts
- [ ] T021 [US1] Add BugReportButton to MainLayout in frontend/src/shared/layouts/MainLayout/MainLayout.tsx

**Checkpoint**: User Story 1 complete - users can report bugs with auto screenshot

---

## Phase 4: User Story 2 - Gravar Vídeo da Tela (Priority: P2)

**Goal**: Usuário pode gravar vídeo da tela para demonstrar bugs complexos

**Independent Test**: Iniciar gravação, realizar ações, parar gravação, verificar vídeo anexado ao report

### Implementation for User Story 2

- [ ] T022 [P] [US2] Implement useVideoRecorder hook in frontend/src/features/bug-report/hooks/useVideoRecorder.ts
- [ ] T023 [US2] Create VideoRecorder component in frontend/src/features/bug-report/components/VideoRecorder/
- [ ] T024 [US2] Create RecordingIndicator component (floating indicator during recording) in frontend/src/features/bug-report/components/RecordingIndicator/
- [ ] T025 [US2] Integrate VideoRecorder into BugReportModal in frontend/src/features/bug-report/components/BugReportModal/
- [ ] T026 [US2] Add video preview capability to modal in frontend/src/features/bug-report/components/BugReportModal/

**Checkpoint**: User Story 2 complete - video recording works independently

---

## Phase 5: User Story 3 - Anexar Arquivos Manualmente (Priority: P2)

**Goal**: Usuário pode anexar arquivos adicionais (logs, PDFs, imagens extras) ao report

**Independent Test**: Anexar múltiplos arquivos de tipos diferentes, verificar validações de tamanho e quantidade

### Implementation for User Story 3

- [ ] T027 [P] [US3] Create file validation utilities in frontend/src/features/bug-report/utils/fileValidation.ts
- [ ] T028 [US3] Create AttachmentList component in frontend/src/features/bug-report/components/AttachmentList/
- [ ] T029 [US3] Create FileUploader component in frontend/src/features/bug-report/components/FileUploader/
- [ ] T030 [US3] Integrate AttachmentList and FileUploader into BugReportModal in frontend/src/features/bug-report/components/BugReportModal/
- [ ] T031 [US3] Add file upload mutation with progress tracking in frontend/src/features/bug-report/api/mutations.ts

**Checkpoint**: User Story 3 complete - file attachments work independently

---

## Phase 6: User Story 4 - Configurar Email do ClickUp (Priority: P3)

**Goal**: Usuário pode configurar email do ClickUp para criar tasks automaticamente

**Independent Test**: Configurar email nas settings, criar bug report, verificar task criada no ClickUp

### Backend Implementation for User Story 4

- [ ] T032 [P] [US4] Create DTOs in backend/src/modules/bug-report/dto/send-clickup-email.dto.ts
- [ ] T033 [US4] Create BugReportService in backend/src/modules/bug-report/bug-report.service.ts
- [ ] T034 [US4] Create BugReportController in backend/src/modules/bug-report/bug-report.controller.ts
- [ ] T035 [US4] Create BugReportModule in backend/src/modules/bug-report/bug-report.module.ts
- [ ] T036 [US4] Register BugReportModule in backend/src/app.module.ts

### Frontend Implementation for User Story 4

- [ ] T037 [US4] Create BugReportSettings component in frontend/src/features/bug-report/components/BugReportSettings/
- [ ] T038 [US4] Add useSendToClickUp mutation in frontend/src/features/bug-report/api/mutations.ts
- [ ] T039 [US4] Add useUpdateBugReportSettings mutation in frontend/src/features/bug-report/api/mutations.ts
- [ ] T040 [US4] Integrate settings into Settings page in frontend/src/features/settings/pages/SettingsPage.tsx
- [ ] T041 [US4] Add ClickUp send logic to BugReportModal submit flow

**Checkpoint**: User Story 4 complete - ClickUp integration works independently

---

## Phase 7: User Story 5 - Visualizar Histórico de Reports (Priority: P3)

**Goal**: Usuário pode ver histórico de reports com filtros e detalhes

**Independent Test**: Criar alguns reports, acessar página de histórico, testar filtros, visualizar detalhes

### Implementation for User Story 5

- [ ] T042 [P] [US5] Create BugReportList component in frontend/src/features/bug-report/components/BugReportList/
- [ ] T043 [P] [US5] Create BugReportCard component in frontend/src/features/bug-report/components/BugReportCard/
- [ ] T044 [US5] Create BugReportFilters component in frontend/src/features/bug-report/components/BugReportFilters/
- [ ] T045 [US5] Create BugReportDetailModal component in frontend/src/features/bug-report/components/BugReportDetailModal/
- [ ] T046 [US5] Create BugReportsPage in frontend/src/features/bug-report/pages/BugReportsPage.tsx
- [ ] T047 [US5] Add route for /bug-reports in frontend/src/app/router.tsx
- [ ] T048 [US5] Add sidebar menu item for Bug Reports (admin only) in frontend/src/shared/layouts/Sidebar/

**Checkpoint**: User Story 5 complete - history page works independently

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final integrations and edge case handling

- [ ] T049 [P] Handle edge case: screenshot capture failure with fallback in useScreenshot.ts
- [ ] T050 [P] Handle edge case: browser without MediaRecorder support in useVideoRecorder.ts
- [ ] T051 [P] Handle edge case: upload failure with retry in mutations.ts
- [ ] T052 Add loading states and error boundaries to all components
- [ ] T053 Implement button collapse state persistence via localStorage
- [ ] T054 Update components barrel export with all new components in frontend/src/features/bug-report/components/index.ts
- [ ] T055 Run quickstart.md validation end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3-7 (User Stories)**: All depend on Phase 2 completion
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundational)
        │
        ├─────────┬──────────┬──────────┬──────────┐
        ▼         ▼          ▼          ▼          ▼
      US1       US2        US3        US4        US5
    (P1)🎯     (P2)       (P2)       (P3)       (P3)
  Screenshot  Video      Files    ClickUp    History
        │         │          │          │          │
        └─────────┴──────────┴──────────┴──────────┘
                              │
                              ▼
                        Phase 8 (Polish)
```

- **User Story 1 (P1)**: No dependencies on other stories - MVP standalone
- **User Story 2 (P2)**: No dependencies - video is independent feature
- **User Story 3 (P2)**: No dependencies - attachments are independent feature
- **User Story 4 (P3)**: No dependencies - ClickUp is optional integration
- **User Story 5 (P3)**: Depends on US1 data existing, but can be built independently

### Parallel Opportunities

**Phase 1 - Setup:**
```
T003 (storage bucket) || T004 (frontend structure) || T005 (backend structure)
```

**Phase 2 - Foundational:**
```
T007 (console errors) || T008 (browser info)
T010 (queryKeys) || T011 (queries) || T012 (mutations)
```

**Phase 3 - User Story 1:**
```
T014 (useScreenshot) || T015 (utils) || T016 (preview component)
```

**After Phase 2 - All User Stories:**
```
US1 || US2 || US3 || US4 || US5  (different developers can work in parallel)
```

---

## Parallel Example: User Story 1

```bash
# Launch all parallelizable US1 tasks:
Task: "T014 [P] [US1] Implement useScreenshot hook"
Task: "T015 [P] [US1] Create screenshot utility functions"
Task: "T016 [P] [US1] Create ScreenshotPreview component"

# Then sequentially:
Task: "T017 [US1] Create BugReportForm component"
Task: "T018 [US1] Create BugReportModal component"
Task: "T019 [US1] Create BugReportButton component"
Task: "T020 [US1] Create components barrel export"
Task: "T021 [US1] Add BugReportButton to MainLayout"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T013)
3. Complete Phase 3: User Story 1 (T014-T021)
4. **STOP and VALIDATE**: Test bug reporting with screenshot
5. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → MVP with screenshot ✓
3. Add User Story 2 → Video recording ✓
4. Add User Story 3 → File attachments ✓
5. Add User Story 4 → ClickUp integration ✓
6. Add User Story 5 → History page ✓
7. Polish → Edge cases and refinements

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1)**

This delivers:
- Floating bug report button
- Auto screenshot capture
- Bug report form (description, severity, type)
- Storage in Supabase
- Console errors capture
- Browser info capture

Total MVP tasks: 21 tasks

---

## Summary

| Phase | User Story | Priority | Tasks | Parallelizable |
|-------|------------|----------|-------|----------------|
| 1 | Setup | - | 5 | 3 |
| 2 | Foundational | - | 8 | 5 |
| 3 | US1 - Screenshot | P1 | 8 | 3 |
| 4 | US2 - Video | P2 | 5 | 1 |
| 5 | US3 - Files | P2 | 5 | 1 |
| 6 | US4 - ClickUp | P3 | 10 | 1 |
| 7 | US5 - History | P3 | 7 | 2 |
| 8 | Polish | - | 7 | 4 |
| **Total** | | | **55** | **20** |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- MVP delivers value with just User Story 1 (21 tasks)
- Each user story is independently testable after completion
- Backend only needed for User Story 4 (ClickUp email integration)
- Commit after each task or logical group
