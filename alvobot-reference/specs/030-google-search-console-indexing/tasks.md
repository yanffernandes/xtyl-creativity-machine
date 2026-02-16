# Tasks: Google Search Console - Indexação e Acompanhamento

**Input**: Design documents from `/specs/030-google-search-console-indexing/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not requested in spec (only NFR validation script is required).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create Search Console module skeleton in `backend/src/modules/search-console/search-console.module.ts`
- [x] T002 [P] Add Search Console DTOs directory and base files in `backend/src/modules/search-console/dto/`
- [x] T003 [P] Add frontend API client scaffold in `frontend/src/shared/utils/searchConsoleApi.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create Supabase migration with tables/RLS in `supabase/migrations/20260125_search_console.sql`
- [x] T005 [P] Register module and config in `backend/src/app.module.ts`
- [x] T006 [P] Add config/env validation in `backend/src/config/search-console.config.ts` (include `INDEXING_QUOTA_DAILY=200`, `INSPECTION_QUOTA_DAILY=2000`)
- [x] T007 Implement repository layer for connections/properties/status/requests in `backend/src/modules/search-console/search-console.repository.ts`
- [x] T008 Add quota helpers for per-connection usage in `backend/src/modules/search-console/search-console.quota.ts`
- [x] T009 Add inspection quota checks in `backend/src/modules/search-console/search-console.quota.ts`
- [x] T010 Add daily duplicate request guard in `backend/src/modules/search-console/search-console.repository.ts`
- [x] T011 Add integration logging helper in `backend/src/modules/search-console/search-console.logger.ts`
- [x] T012 [P] Add error handling for edge cases (connection expired, property not verified, canonical mismatch, "cannot be indexed" state) in `backend/src/modules/search-console/search-console.errors.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Visualizar status de indexação no datatable de artigos (Priority: P1) 🎯 MVP

**Goal**: Exibir status de indexação por URL no datatable de artigos com cache 24h e refresh sob demanda.

**Independent Test**: Abrir `frontend/src/features/articles/pages/ArticlesPage.tsx` com artigos e verificar status exibido e refresh respeitando cache.

### Implementation for User Story 1

- [x] T013 [P] [US1] Implement endpoint to fetch status by URL in `backend/src/modules/search-console/search-console.controller.ts`
- [x] T014 [US1] Implement URL Inspection service and persistence in `backend/src/modules/search-console/search-console.service.ts`
- [x] T015 [US1] Persist inspection history in `backend/src/modules/search-console/search-console.repository.ts`
- [x] T016 [US1] Enforce inspection quota before refresh in `backend/src/modules/search-console/search-console.service.ts`
- [x] T017 [P] [US1] Add articles status query hook in `frontend/src/features/articles/api/queries.ts`
- [x] T018 [US1] Render status column + refresh action in `frontend/src/features/articles/pages/ArticlesPage.tsx`
- [x] T019 [US1] Add status badge styles in `frontend/src/features/articles/pages/ArticlesPage.module.css`
- [x] T020 [US1] Add 24h cache + refresh bypass in `backend/src/modules/search-console/search-console.service.ts`

**Checkpoint**: User Story 1 functional and testable independently

---

## Phase 4: User Story 2 - Solicitar indexação individual e em massa (Priority: P1)

**Goal**: Permitir solicitação de indexação individual e em massa, enfileirando no backend e retornando feedback imediato.

**Independent Test**: Selecionar artigos em `ArticlesPage.tsx` e confirmar criação de pedidos e status de fila.

### Implementation for User Story 2

- [x] T021 [P] [US2] Implement single index request endpoint in `backend/src/modules/search-console/search-console.controller.ts`
- [x] T022 [P] [US2] Implement batch index request endpoint in `backend/src/modules/search-console/search-console.controller.ts`
- [x] T023 [US2] Add eligibility validation (verify `JobPosting`/`BroadcastEvent` schema type) + publish quota check in `backend/src/modules/search-console/search-console.service.ts`
- [x] T024 [US2] Block ineligible URL requests in `backend/src/modules/search-console/search-console.service.ts`
- [x] T025 [US2] Implement queue persistence and status updates in `backend/src/modules/search-console/search-console.service.ts`
- [x] T026 [P] [US2] Add request actions hook in `frontend/src/features/articles/api/mutations.ts`
- [x] T027 [US2] Add single + batch actions UI with feedback in `frontend/src/features/articles/pages/ArticlesPage.tsx`
- [x] T028 [US2] Add error/toast messaging for blocked/ineligible URLs and edge case errors (expired connection, unverified property, canonical mismatch) in `frontend/src/features/articles/components/IndexingErrorToast.tsx`

**Checkpoint**: User Stories 1 and 2 both functional and independently testable

---

## Phase 5: User Story 3 - Automação leve de envio diário (Priority: P2)

**Goal**: Executar rotina automática diária por conexão para enviar URLs não indexadas sem bloquear a UI.

**Independent Test**: Acionar rotina manual e verificar enfileiramento por conexão respeitando quota.

### Implementation for User Story 3

- [x] T029 [P] [US3] Add scheduled job for daily auto-run in `backend/src/modules/search-console/search-console.jobs.ts`
- [x] T030 [US3] Implement auto-run logic per connection in `backend/src/modules/search-console/search-console.service.ts`
- [x] T031 [US3] Prioritize most recent URLs in `backend/src/modules/search-console/search-console.service.ts`
- [x] T032 [US3] Add endpoint to trigger manual auto-run in `backend/src/modules/search-console/search-console.controller.ts`
- [x] T033 [P] [US3] Add toggle controls in settings UI `frontend/src/features/settings/pages/SettingsPage.tsx`
- [x] T034 [US3] Persist auto-run setting per connection in `backend/src/modules/search-console/search-console.repository.ts`

**Checkpoint**: All user stories functional and independently testable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T035 [P] Add integration documentation in `docs/integrations/google-search-console.md` covering: OAuth flow, property management, quotas (200 indexing/day, 2000 inspection/day), error codes, and troubleshooting
- [x] T036 [P] Wire quota visibility in UI `frontend/src/features/connections/pages/ConnectionsPage.tsx`
- [x] T036a [P] Display account details in connection config modal (email, authorized properties list, token expiry) in `frontend/src/features/connections/pages/ConnectionsPage.tsx`
- [x] T037 [P] Add correlation id to logs in `backend/src/modules/search-console/search-console.controller.ts`
- [x] T038 [P] Run quickstart validation and update notes in `specs/030-google-search-console-indexing/quickstart.md`

---

## Phase 7: Performance & NFR Validation

**Purpose**: Ensure non-functional requirements are met

- [x] T039 [P] Add batch inspection with concurrency limit (max 10 parallel) for p95 < 2s on 50 URLs in `backend/src/modules/search-console/search-console.service.ts`
- [x] T040 [P] Add load test script for NFR validation (200 URLs < 10 min) in `backend/test/load/search-console.load.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
- **Polish (Phase 6)**: Depends on all desired user stories being complete
- **Performance (Phase 7)**: Can run in parallel with Polish after user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - independent but integrates with shared status/queue
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - relies on queue and quota tracking

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel
- Phase 2: T005, T006, T012 can run in parallel
- US1: T013 and T017 can run in parallel
- US2: T021 and T022 can run in parallel; T026 can run after T021/T022
- US3: T029 and T033 can run in parallel
- Phase 7: T039 and T040 can run in parallel

---

## Parallel Example: User Story 1

```bash
Task: "Implement endpoint to fetch status by URL in backend/src/modules/search-console/search-console.controller.ts"
Task: "Add articles status query hook in frontend/src/features/articles/api/queries.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Implement single index request endpoint in backend/src/modules/search-console/search-console.controller.ts"
Task: "Implement batch index request endpoint in backend/src/modules/search-console/search-console.controller.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add scheduled job for daily auto-run in backend/src/modules/search-console/search-console.jobs.ts"
Task: "Add toggle controls in settings UI frontend/src/features/settings/pages/SettingsPage.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add Polish tasks as needed