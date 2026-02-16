# Tasks: Minhas Tarefas - Import Tasks Feature

**Input**: Design documents from `/specs/005-minhas-tarefas/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Tests are OPTIONAL - not included (not explicitly requested)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing structure and add necessary types

- [x] T001 Verify tasks feature structure exists in frontend/src/features/tasks/
- [x] T002 [P] Add ImportTasksInput and ImportTasksResponse types in frontend/src/features/tasks/types/index.ts
- [x] T003 [P] Add IMPORT_PHASES constant in frontend/src/features/tasks/constants.ts

---

## Phase 2: Foundational (Backend API)

**Purpose**: Create backend endpoint for task import (MUST complete before frontend import feature)

**⚠️ CRITICAL**: Import functionality depends on backend API being available

- [x] T004 Create tasks module structure in backend/src/modules/tasks/ (if not exists)
- [x] T005 Define task templates data structure for each phase (seu_blog_no_ar, mineracao, escala) in backend/src/modules/tasks/task-templates.ts
- [x] T006 Implement TasksService.importTasksForPhase() method in backend/src/modules/tasks/tasks.service.ts
- [x] T007 Create POST /api/tasks/import endpoint in backend/src/modules/tasks/tasks.controller.ts
- [x] T008 Register TasksModule in backend/src/app.module.ts
- [ ] T009 Test backend endpoint manually (curl/Postman) to verify it works

**Checkpoint**: Backend API ready - frontend implementation can now begin

---

## Phase 3: User Story 4 - Import Tasks Modal (Priority: P1) 🎯 MVP

**Goal**: Allow users to import tasks from predefined templates by selecting a project and phase

**Independent Test**: Open modal, select project and phase, click import, verify tasks appear in Kanban

### Implementation for User Story 4

- [x] T010 [P] [US4] Create useImportTasks mutation hook in frontend/src/features/tasks/api/useImportTasks.ts
- [x] T011 [P] [US4] Create ImportTasksModal.module.css with styling matching existing modals in frontend/src/features/tasks/components/ImportTasksModal.module.css
- [x] T012 [US4] Create ImportTasksModal component with project/phase dropdowns in frontend/src/features/tasks/components/ImportTasksModal.tsx
- [x] T013 [US4] Export ImportTasksModal from frontend/src/features/tasks/components/index.ts
- [x] T014 [US4] Add "Importar Tarefas" button and ImportTasksModal integration in frontend/src/features/tasks/pages/TasksPage.tsx
- [x] T015 [US4] Add success toast notification after successful import in frontend/src/features/tasks/pages/TasksPage.tsx
- [x] T016 [US4] Verify Kanban board refreshes automatically after import (TanStack Query invalidation)

**Checkpoint**: Import functionality complete and testable

---

## Phase 4: User Story 7 - Handle Empty State Enhancement (Priority: P2)

**Goal**: Enhance empty state to include import option

**Independent Test**: With no tasks, verify empty state shows both "Create" and "Import" buttons

### Implementation for User Story 7

- [x] T017 [US7] Add "Importar Tarefas" button to EmptyState in frontend/src/features/tasks/pages/TasksPage.tsx
- [x] T018 [US7] Ensure both buttons have proper spacing and styling in empty state

**Checkpoint**: Empty state with import option ready

---

## Phase 5: User Story 8 - Handle Import Errors (Priority: P2)

**Goal**: Provide clear feedback when task import fails

**Independent Test**: Simulate error, verify error toast appears with retry option

### Implementation for User Story 8

- [x] T019 [US8] Add error handling in useImportTasks hook for network/validation errors in frontend/src/features/tasks/api/useImportTasks.ts
- [x] T020 [US8] Display error toast with specific message when import fails in frontend/src/features/tasks/pages/TasksPage.tsx
- [x] T021 [US8] Add retry logic - keep modal open on error so user can retry

**Checkpoint**: Error handling complete

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T022 Verify modal accessibility (keyboard navigation, focus trap, ARIA labels)
- [ ] T023 Test responsive layout on mobile devices (modal should be full-width on mobile)
- [ ] T024 Verify all Portuguese text is correct ("Selecione o projeto e o estágio que deseja importar")
- [ ] T025 Manual E2E test: Create project → Open import modal → Select project → Select phase → Import → Verify tasks in Kanban

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS frontend import feature
- **User Story 4 (Phase 3)**: Depends on Foundational (backend API) - Core import functionality
- **User Story 7 (Phase 4)**: Depends on Phase 3 (needs ImportTasksModal to exist)
- **User Story 8 (Phase 5)**: Depends on Phase 3 (needs import flow to add error handling)
- **Polish (Phase 6)**: Depends on all user stories being complete

### Within Each Phase

- Types and constants (T002, T003) can run in parallel
- Backend tasks (T004-T009) are sequential
- Frontend tasks T010, T011 can run in parallel
- T012 depends on T010 (useImportTasks hook)
- T014 depends on T012, T013 (ImportTasksModal component)

### Parallel Opportunities

```bash
# Phase 1 - Run in parallel:
Task: T002 "Add ImportTasksInput types in frontend/src/features/tasks/types/index.ts"
Task: T003 "Add IMPORT_PHASES constant in frontend/src/features/tasks/constants.ts"

# Phase 3 - Run in parallel:
Task: T010 "Create useImportTasks mutation hook"
Task: T011 "Create ImportTasksModal.module.css"
```

---

## Implementation Strategy

### MVP First (User Story 4 Only)

1. Complete Phase 1: Setup (types and constants)
2. Complete Phase 2: Backend API (critical path)
3. Complete Phase 3: User Story 4 (Import Modal)
4. **STOP and VALIDATE**: Test import flow end-to-end
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Backend → Backend API ready
2. Add User Story 4 → Test independently → Deploy (MVP!)
3. Add User Story 7 → Empty state enhancement → Deploy
4. Add User Story 8 → Error handling → Deploy
5. Polish → Final QA → Release

---

## Task Templates Data (Reference)

The backend should return tasks like these for each phase:

### Seu Blog no Ar (Initial Setup)
- Verificar configuração do WordPress
- Instalar plugins essenciais
- Configurar tema
- Configurar SEO básico
- Verificar velocidade do site

### Mineração (Keyword Mining)
- Selecionar nicho de palavras-chave
- Pesquisar 10 palavras-chave principais
- Analisar concorrência
- Criar plano de conteúdo
- Definir categorias do blog

### Escala (Scaling)
- Conectar conta Meta Ads
- Configurar pixel do Facebook
- Criar primeira campanha
- Configurar automação de disparos
- Analisar métricas iniciais

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Existing Kanban UI should not be modified (only add import button to header)
- Use existing shared components (Modal, Select, Button) - do not create new ones
- Follow existing code patterns in the tasks feature folder
