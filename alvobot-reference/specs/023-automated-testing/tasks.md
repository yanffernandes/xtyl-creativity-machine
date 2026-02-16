# Tasks: Sistema de Testes Automatizados

**Input**: Design documents from `/specs/023-automated-testing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/`, `frontend/vitest.config.ts`
- **Backend**: `backend/src/`, `backend/test/`
- **E2E**: `e2e/` at repository root
- **RLS Tests**: `supabase/tests/rls/`
- **CI**: `.github/workflows/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install testing dependencies and create base configuration files

- [ ] T001 [P] Install Vitest and testing dependencies in `frontend/package.json`
- [ ] T002 [P] Install nock and faker dependencies in `backend/package.json`
- [ ] T003 [P] Create e2e project with Playwright in `e2e/package.json`
- [ ] T004 Create Vitest configuration in `frontend/vitest.config.ts`
- [ ] T005 Create test setup file in `frontend/src/test/setup.ts`
- [ ] T006 [P] Create test scripts in `frontend/package.json` (test, test:ui, test:coverage)
- [ ] T007 [P] Create Playwright configuration in `e2e/playwright.config.ts`
- [ ] T008 Create directory structure for `frontend/src/test/mocks/`
- [ ] T009 Create directory structure for `frontend/src/test/factories/`
- [ ] T010 Create directory structure for `frontend/src/test/utils/`
- [ ] T011 Create directory structure for `backend/test/mocks/`
- [ ] T012 Create directory structure for `e2e/fixtures/`
- [ ] T013 Create directory structure for `e2e/pages/`
- [ ] T014 Create directory structure for `e2e/utils/`
- [ ] T015 Create directory structure for `supabase/tests/rls/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core mocks and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T016 Create Supabase client mock in `frontend/src/test/mocks/supabase.ts`
- [ ] T017 Create MSW server setup in `frontend/src/test/mocks/server.ts`
- [ ] T018 Create MSW handlers for Supabase REST API in `frontend/src/test/mocks/handlers.ts`
- [ ] T019 Create custom render with providers in `frontend/src/test/utils/render.tsx`
- [ ] T020 Create test utilities (waitFor, screen helpers) in `frontend/src/test/utils/test-utils.ts`
- [ ] T021 Create user factory in `frontend/src/test/factories/user.factory.ts`
- [ ] T022 Create project factory in `frontend/src/test/factories/project.factory.ts`
- [ ] T023 Create factories barrel export in `frontend/src/test/factories/index.ts`
- [ ] T024 Create external APIs mock (nock) in `backend/test/mocks/external-apis.ts`
- [ ] T025 Create E2E Supabase helpers in `e2e/utils/supabase-helpers.ts`
- [ ] T026 Create E2E test data utilities in `e2e/utils/test-data.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Testes Unitários Frontend (Priority: P1) 🎯 MVP

**Goal**: Desenvolvedores podem executar testes unitários do frontend com `npm run test` e ver cobertura de código

**Independent Test**: Execute `cd frontend && npm run test` - deve rodar testes e mostrar cobertura

### Implementation for User Story 1

- [ ] T027 [US1] Create Button component test in `frontend/src/shared/components/Button/Button.test.tsx`
- [ ] T028 [P] [US1] Create Input component test in `frontend/src/shared/components/Input/Input.test.tsx`
- [ ] T029 [P] [US1] Create Modal component test in `frontend/src/shared/components/Modal/Modal.test.tsx`
- [ ] T030 [P] [US1] Create Select component test in `frontend/src/shared/components/Select/Select.test.tsx`
- [ ] T031 [P] [US1] Create Spinner component test in `frontend/src/shared/components/Spinner/Spinner.test.tsx`
- [ ] T032 [US1] Create useAuth hook test in `frontend/src/features/auth/hooks/__tests__/useAuth.test.ts`
- [ ] T033 [P] [US1] Create useProjects query test in `frontend/src/features/projects/api/__tests__/queries.test.ts`
- [ ] T034 [P] [US1] Create auth mutations test in `frontend/src/features/auth/api/__tests__/mutations.test.ts`
- [ ] T035 [US1] Verify coverage threshold meets 70% minimum in `frontend/vitest.config.ts`
- [ ] T036 [US1] Document frontend testing in `frontend/README.md` (testing section)

**Checkpoint**: Frontend unit tests working - developers can run `npm run test` successfully

---

## Phase 4: User Story 2 - Testes Unitários Backend (Priority: P1)

**Goal**: Desenvolvedores podem executar testes unitários do backend com `npm run test`

**Independent Test**: Execute `cd backend && npm run test` - deve rodar testes Jest

### Implementation for User Story 2

- [ ] T037 [US2] Create AuthService unit test in `backend/src/modules/auth/auth.service.spec.ts`
- [ ] T038 [P] [US2] Create JwtStrategy unit test in `backend/src/modules/auth/jwt.strategy.spec.ts`
- [ ] T039 [P] [US2] Create SupabaseService unit test in `backend/src/common/supabase/supabase.service.spec.ts`
- [ ] T040 [US2] Create BaseStructureService unit test in `backend/src/modules/base-structure/base-structure.service.spec.ts`
- [ ] T041 [P] [US2] Create BaseStructureController unit test in `backend/src/modules/base-structure/base-structure.controller.spec.ts`
- [ ] T042 [P] [US2] Create MetaService unit test in `backend/src/modules/meta/meta.service.spec.ts`
- [ ] T043 [US2] Configure coverage thresholds in `backend/package.json` (jest config)
- [ ] T044 [US2] Document backend testing in `backend/README.md` (testing section)

**Checkpoint**: Backend unit tests working - developers can run `npm run test` successfully

---

## Phase 5: User Story 3 - Testes de Integração (Priority: P2)

**Goal**: Desenvolvedores podem executar testes de integração do backend contra banco real

**Independent Test**: Execute `cd backend && npm run test:e2e` - deve testar endpoints com banco

### Implementation for User Story 3

- [ ] T045 [US3] Create E2E test setup in `backend/test/setup-e2e.ts`
- [ ] T046 [US3] Create auth E2E test in `backend/test/modules/auth.e2e-spec.ts`
- [ ] T047 [P] [US3] Create health E2E test in `backend/test/modules/health.e2e-spec.ts`
- [ ] T048 [P] [US3] Create projects E2E test in `backend/test/modules/projects.e2e-spec.ts`
- [ ] T049 [US3] Update jest-e2e.json with proper configuration in `backend/test/jest-e2e.json`
- [ ] T050 [US3] Create database cleanup utilities in `backend/test/utils/db-cleanup.ts`

**Checkpoint**: Integration tests working - endpoints tested with real database

---

## Phase 6: User Story 4 - Testes E2E Playwright (Priority: P2)

**Goal**: Desenvolvedores podem executar testes E2E que simulam usuário no navegador

**Independent Test**: Execute `cd e2e && npm run test` - deve rodar testes no navegador

### Implementation for User Story 4

- [ ] T051 [US4] Create auth fixture in `e2e/fixtures/auth.fixture.ts`
- [ ] T052 [P] [US4] Create database fixture in `e2e/fixtures/database.fixture.ts`
- [ ] T053 [US4] Create login page object in `e2e/pages/login.page.ts`
- [ ] T054 [P] [US4] Create dashboard page object in `e2e/pages/dashboard.page.ts`
- [ ] T055 [P] [US4] Create projects page object in `e2e/pages/projects.page.ts`
- [ ] T056 [US4] Create login E2E test in `e2e/tests/auth/login.spec.ts`
- [ ] T057 [P] [US4] Create signup E2E test in `e2e/tests/auth/signup.spec.ts`
- [ ] T058 [US4] Create projects CRUD E2E test in `e2e/tests/projects/crud.spec.ts`
- [ ] T059 [US4] Configure test scripts in `e2e/package.json`

**Checkpoint**: E2E tests working - browser automation validates user flows

---

## Phase 7: User Story 5 - Pipeline CI/CD (Priority: P2)

**Goal**: Testes executam automaticamente em cada PR via GitHub Actions

**Independent Test**: Abrir um PR e verificar que workflows executam e reportam resultados

### Implementation for User Story 5

- [ ] T060 [US5] Create GitHub Actions workflow in `.github/workflows/test.yml`
- [ ] T061 [US5] Configure frontend test job in `.github/workflows/test.yml`
- [ ] T062 [US5] Configure backend unit test job in `.github/workflows/test.yml`
- [ ] T063 [US5] Configure backend integration test job in `.github/workflows/test.yml`
- [ ] T064 [US5] Configure E2E test job in `.github/workflows/test.yml`
- [ ] T065 [US5] Add coverage reporting to workflow in `.github/workflows/test.yml`
- [ ] T066 [US5] Configure branch protection rules documentation in `docs/CI_SETUP.md`

**Checkpoint**: CI pipeline running - PRs blocked if tests fail

---

## Phase 8: User Story 6 - Mocks e Helpers Adicionais (Priority: P3)

**Goal**: Desenvolvedores têm acesso a mocks e factories adicionais para escrever testes rapidamente

**Independent Test**: Importar mocks em novo teste e verificar que funcionam sem configuração adicional

### Implementation for User Story 6

- [ ] T067 [P] [US6] Create workspace factory in `frontend/src/test/factories/workspace.factory.ts`
- [ ] T068 [P] [US6] Create article factory in `frontend/src/test/factories/article.factory.ts`
- [ ] T069 [P] [US6] Create MSW handlers for backend API in `frontend/src/test/mocks/api-handlers.ts`
- [ ] T070 [US6] Create OpenAI mock in `backend/test/mocks/openai.mock.ts`
- [ ] T071 [P] [US6] Create Meta API mock in `backend/test/mocks/meta.mock.ts`
- [ ] T072 [P] [US6] Create Google Ads mock in `backend/test/mocks/google-ads.mock.ts`
- [ ] T073 [P] [US6] Create WordPress mock in `backend/test/mocks/wordpress.mock.ts`
- [ ] T074 [US6] Update factories barrel export in `frontend/src/test/factories/index.ts`

**Checkpoint**: All mocks and factories available - easy to write new tests

---

## Phase 9: User Story 7 - Testes RLS Supabase (Priority: P3)

**Goal**: Desenvolvedores podem validar políticas RLS executando scripts SQL

**Independent Test**: Executar scripts SQL contra Supabase local e verificar que assertions passam

### Implementation for User Story 7

- [ ] T075 [US7] Create RLS test for projects table in `supabase/tests/rls/projects.test.sql`
- [ ] T076 [P] [US7] Create RLS test for articles table in `supabase/tests/rls/articles.test.sql`
- [ ] T077 [P] [US7] Create RLS test for system_prompts table in `supabase/tests/rls/system-prompts.test.sql`
- [ ] T078 [P] [US7] Create RLS test for workspaces table in `supabase/tests/rls/workspaces.test.sql`
- [ ] T079 [US7] Create RLS test runner script in `supabase/tests/run-rls-tests.sh`
- [ ] T080 [US7] Add RLS tests to CI pipeline in `.github/workflows/test.yml`

**Checkpoint**: RLS policies validated - security enforced at database level

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and final validation

- [ ] T081 [P] Create comprehensive testing documentation in `docs/TESTING.md`
- [ ] T082 [P] Update CLAUDE.md with testing conventions
- [ ] T083 Run quickstart.md validation - execute all documented commands
- [ ] T084 Verify all coverage thresholds are met (70%+)
- [ ] T085 Create example test files for each type in `docs/examples/`
- [ ] T086 Final code review and cleanup of all test files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Setup - BLOCKS all user stories
- **Phases 3-4 (US1, US2)**: Can run in parallel after Foundational (both P1)
- **Phases 5-7 (US3, US4, US5)**: Can run in parallel after Foundational (all P2)
- **Phases 8-9 (US6, US7)**: Can run in parallel after Foundational (both P3)
- **Phase 10 (Polish)**: Depends on all user stories complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (Frontend Unit) | Foundational | US2, US3, US4, US5, US6, US7 |
| US2 (Backend Unit) | Foundational | US1, US3, US4, US5, US6, US7 |
| US3 (Integration) | Foundational | US1, US2, US4, US5, US6, US7 |
| US4 (E2E) | Foundational | US1, US2, US3, US5, US6, US7 |
| US5 (CI/CD) | US1, US2 (para ter testes para rodar) | US3, US4, US6, US7 |
| US6 (Mocks) | Foundational | US1, US2, US3, US4, US5, US7 |
| US7 (RLS) | Foundational | US1, US2, US3, US4, US5, US6 |

### Within Each User Story

- Setup tasks before implementation tasks
- Core mocks/utilities before tests that use them
- Tests validate implementation works

---

## Parallel Examples

### Setup Phase (All parallel)

```bash
# Can run all setup tasks simultaneously:
T001: Install Vitest in frontend
T002: Install nock in backend
T003: Create e2e project
```

### User Stories in Parallel

```bash
# After Foundational phase, can work on multiple stories:
Developer A: US1 (Frontend Unit Tests)
Developer B: US2 (Backend Unit Tests)
Developer C: US4 (E2E Tests)
```

### Within User Story 1

```bash
# Parallel component tests:
T028: Input test
T029: Modal test
T030: Select test
T031: Spinner test
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Frontend Unit Tests)
4. **STOP and VALIDATE**: Run `npm run test` in frontend
5. Developers can now write component tests

### Incremental Delivery

| Milestone | What's Delivered | Value |
|-----------|------------------|-------|
| After US1 | Frontend unit tests | Validate UI components |
| After US2 | Backend unit tests | Validate business logic |
| After US3 | Integration tests | Validate API endpoints |
| After US4 | E2E tests | Validate user flows |
| After US5 | CI pipeline | Automated quality gates |
| After US6 | More mocks | Easier to write new tests |
| After US7 | RLS tests | Security validation |

### Recommended Execution Order

**Priority 1 (Core)**:
1. Setup → Foundational → US1 → US2

**Priority 2 (Quality)**:
2. US5 (CI) → US3 → US4

**Priority 3 (Enhancement)**:
3. US6 → US7 → Polish

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 86 |
| Setup Tasks | 15 |
| Foundational Tasks | 11 |
| US1 Tasks (Frontend Unit) | 10 |
| US2 Tasks (Backend Unit) | 8 |
| US3 Tasks (Integration) | 6 |
| US4 Tasks (E2E) | 9 |
| US5 Tasks (CI/CD) | 7 |
| US6 Tasks (Mocks) | 8 |
| US7 Tasks (RLS) | 6 |
| Polish Tasks | 6 |
| Parallel Opportunities | 45 tasks marked [P] |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- MVP = Phase 1 + Phase 2 + Phase 3 (Frontend Unit Tests)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
