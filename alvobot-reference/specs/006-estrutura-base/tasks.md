# Tasks: 006 - Estrutura de Base ✅ FINALIZADO

**Status**: ✅ **COMPLETO** - Todas as User Stories implementadas
**Input**: Design documents from `/specs/006-estrutura-base/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths follow monorepo structure per plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, database setup, and backend module structure

- [X] T001 Create backend module folder structure in `backend/src/modules/base-structure/`
- [X] T002 [P] Create base-structure types in `backend/src/modules/base-structure/types/index.ts`
- [X] T003 [P] Create DTOs in `backend/src/modules/base-structure/dto/generate-niches.dto.ts`
- [X] T004 [P] Create DTOs in `backend/src/modules/base-structure/dto/generate-categories.dto.ts`
- [X] T005 [P] Create DTOs in `backend/src/modules/base-structure/dto/generate-titles.dto.ts`
- [X] T006 [P] Create DTOs in `backend/src/modules/base-structure/dto/save-structure.dto.ts`
- [X] T007 Add OpenAI SDK dependency to `backend/package.json`
- [X] T008 Add OPENAI_API_KEY to `backend/.env.example` and configure in ConfigModule

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create AI prompts service in `backend/src/modules/base-structure/services/prompts.service.ts`
- [X] T010 Create AI service with OpenAI integration in `backend/src/modules/base-structure/services/ai.service.ts`
- [X] T011 Create WordPress service for API calls in `backend/src/modules/base-structure/services/wordpress.service.ts`
- [X] T012 Create base-structure service in `backend/src/modules/base-structure/base-structure.service.ts`
- [X] T013 Create base-structure controller in `backend/src/modules/base-structure/base-structure.controller.ts`
- [X] T014 Create base-structure module and register in `backend/src/modules/base-structure/base-structure.module.ts`
- [X] T015 Register BaseStructureModule in `backend/src/app.module.ts`
- [X] T016 Create frontend feature folder structure in `frontend/src/features/base-structure/`
- [X] T017 [P] Create frontend types in `frontend/src/features/base-structure/types/index.ts`
- [X] T018 Create Zustand wizard store in `frontend/src/features/base-structure/store/wizardStore.ts`
- [X] T019 Create API client utilities in `frontend/src/features/base-structure/api/client.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Wizard Navigation (Priority: P1) 🎯 MVP

**Goal**: Navigate through the 5-step wizard with validation, back navigation, and step indicators

**Independent Test**: Open wizard, navigate forward/backward, verify validation prevents skipping steps

### Implementation for User Story 1

- [X] T020 [US1] Create wizard container component in `frontend/src/features/base-structure/components/BaseStructureWizard.tsx`
- [X] T021 [US1] Create stepper/progress indicator component in `frontend/src/features/base-structure/components/Stepper.tsx`
- [X] T022 [US1] Create wizard navigation hook in `frontend/src/features/base-structure/hooks/useWizardNavigation.ts`
- [X] T023 [US1] Create step validation utilities in `frontend/src/features/base-structure/utils/validation.ts`
- [X] T024 [US1] Create main page component in `frontend/src/features/base-structure/pages/BaseStructurePage.tsx`
- [X] T025 [US1] Add route for base-structure page in `frontend/src/routes/` or main router file
- [X] T026 [US1] Add sidebar navigation link for "Estrutura de Base" in layout component

**Checkpoint**: At this point, User Story 1 should be fully functional - wizard shell with navigation

---

## Phase 4: User Story 2 - Seleção de Projeto (Priority: P1)

**Goal**: Select an existing project or create a new one directly from the wizard

**Independent Test**: Open wizard, see project dropdown, select project, create new project inline

### Implementation for User Story 2

- [X] T027 [P] [US2] Create project selection query hook in `frontend/src/features/base-structure/api/queries.ts`
- [X] T028 [US2] Create Step 1 component in `frontend/src/features/base-structure/components/StepSelectProject.tsx`
- [X] T029 [US2] Create inline "New Project" modal in `frontend/src/features/base-structure/components/CreateProjectModal.tsx`
- [X] T030 [US2] Create project mutation hook for inline creation in `frontend/src/features/base-structure/api/mutations.ts`
- [X] T031 [US2] Integrate Step 1 with wizard store and navigation validation

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - wizard with project selection

---

## Phase 5: User Story 3 - Geração de Nicho via IA (Priority: P1)

**Goal**: Generate niche suggestions via AI (backend), select one, or enter custom niche

**Independent Test**: Select project, click generate, see loading, view suggestions, select or type custom

### Backend Implementation for User Story 3

- [X] T032 [US3] Implement generateNiches prompt in `backend/src/modules/base-structure/services/prompts.service.ts`
- [X] T033 [US3] Implement generateNiches method in `backend/src/modules/base-structure/services/ai.service.ts`
- [X] T034 [US3] Implement POST /base-structure/generate-niches endpoint in controller

### Frontend Implementation for User Story 3

- [X] T035 [P] [US3] Create useGenerateNiches mutation hook in `frontend/src/features/base-structure/api/mutations.ts`
- [X] T036 [US3] Create Step 2 component in `frontend/src/features/base-structure/components/StepGenerateNiches.tsx`
- [X] T037 [US3] Create niche suggestion card component in `frontend/src/features/base-structure/components/NicheSuggestionCard.tsx`
- [X] T038 [US3] Add loading state and error handling for AI generation in Step 2
- [X] T039 [US3] Integrate Step 2 with wizard store, allow custom niche input

**Checkpoint**: At this point, User Stories 1-3 should work - wizard through niche selection

---

## Phase 6: User Story 4 - Geração e Seleção de Categorias (Priority: P1)

**Goal**: Generate categories based on niche, reorder via drag-drop, select minimum 3

**Independent Test**: Generate categories, reorder by drag, select/deselect, add manual category

### Backend Implementation for User Story 4

- [X] T040 [US4] Implement generateCategories prompt in `backend/src/modules/base-structure/services/prompts.service.ts`
- [X] T041 [US4] Implement generateCategories method in `backend/src/modules/base-structure/services/ai.service.ts`
- [X] T042 [US4] Implement POST /base-structure/generate-categories endpoint in controller

### Frontend Implementation for User Story 4

- [X] T043 [P] [US4] Create useGenerateCategories mutation hook in `frontend/src/features/base-structure/api/mutations.ts`
- [X] T044 [US4] Create Step 3 component in `frontend/src/features/base-structure/components/StepSelectCategories.tsx`
- [X] T045 [US4] Create category card component with checkbox in `frontend/src/features/base-structure/components/CategoryCard.tsx`
- [X] T046 [US4] Implement drag-and-drop for category reordering using dnd-kit
- [X] T047 [US4] Create manual category input component in `frontend/src/features/base-structure/components/AddCategoryInput.tsx`
- [X] T048 [US4] Add validation: minimum 3 categories required to proceed
- [X] T049 [US4] Integrate Step 3 with wizard store

**Checkpoint**: At this point, User Stories 1-4 should work - wizard through category selection

---

## Phase 7: User Story 5 - Tipo de Instalação (Priority: P2)

**Goal**: Choose between quick installation (all defaults) or custom (configure toggles)

**Independent Test**: Select "Rápida" to skip options, select "Customizada" to see toggles

### Implementation for User Story 5

- [X] T050 [US5] Create Step 4 component in `frontend/src/features/base-structure/components/StepInstallationType.tsx`
- [X] T051 [US5] Create installation toggle component in `frontend/src/features/base-structure/components/InstallationToggle.tsx`
- [X] T052 [US5] Integrate quick vs custom logic with wizard store
- [X] T053 [US5] Add toggle states: authorToggle, logoToggle, titleToggle to wizard store

**Checkpoint**: At this point, User Stories 1-5 should work independently

---

## Phase 8: User Story 6 - Geração de Títulos e Salvamento (Priority: P2)

**Goal**: Generate article titles (30-45) via AI, select/deselect, save everything to WordPress and Supabase

**Independent Test**: Generate titles, view list, uncheck unwanted, click "Finalizar" to save

### Backend Implementation for User Story 6

- [X] T054 [US6] Implement generateTitles prompt (4-layer technique) in `backend/src/modules/base-structure/services/prompts.service.ts`
- [X] T055 [US6] Implement generateTitles method in `backend/src/modules/base-structure/services/ai.service.ts`
- [X] T056 [US6] Implement POST /base-structure/generate-titles endpoint in controller
- [X] T057 [US6] Implement generateAuthor prompt in `backend/src/modules/base-structure/services/prompts.service.ts`
- [X] T058 [US6] Implement generateAuthor method in `backend/src/modules/base-structure/services/ai.service.ts`
- [X] T059 [US6] Implement generateLogoConfig prompt in `backend/src/modules/base-structure/services/prompts.service.ts`
- [X] T060 [US6] Implement generateLogoConfig method in `backend/src/modules/base-structure/services/ai.service.ts`
- [X] T061 [US6] Implement generateBlogTitle prompt in `backend/src/modules/base-structure/services/prompts.service.ts`
- [X] T062 [US6] Implement generateBlogTitleDescription method in `backend/src/modules/base-structure/services/ai.service.ts`
- [X] T063 [US6] Implement WordPress createCategories method in wordpress.service.ts
- [X] T064 [US6] Implement WordPress updateAuthor method in wordpress.service.ts
- [X] T065 [US6] Implement WordPress createLogo method in wordpress.service.ts
- [X] T066 [US6] Implement WordPress updateSettings method in wordpress.service.ts
- [X] T067 [US6] Implement saveStructure orchestration in base-structure.service.ts
- [X] T068 [US6] Implement POST /base-structure/save endpoint in controller

### Frontend Implementation for User Story 6

- [X] T069 [P] [US6] Create useGenerateTitles mutation hook in `frontend/src/features/base-structure/api/mutations.ts`
- [X] T070 [P] [US6] Create useSaveStructure mutation hook in `frontend/src/features/base-structure/api/mutations.ts`
- [X] T071 [US6] Create Step 5 component in `frontend/src/features/base-structure/components/StepGenerateTitles.tsx`
- [X] T072 [US6] Create article title list component with checkboxes in `frontend/src/features/base-structure/components/ArticleTitleList.tsx`
- [X] T073 [US6] Create loading state with progress feedback during AI generation
- [X] T074 [US6] Create summary section showing all wizard selections before save
- [X] T075 [US6] Implement "Finalizar" button that calls save mutation
- [X] T076 [US6] Add success/error feedback after save completes

**Checkpoint**: At this point, complete wizard flow should work - all 5 steps functional

---

## Phase 9: User Story 7 - Revisão e Feedback Final (Priority: P3)

**Goal**: Review structure before submitting, show validation checklist

**Independent Test**: Complete wizard, see checklist, verify all validations pass

### Implementation for User Story 7

- [X] T077 [US7] Create validation checklist component in `frontend/src/features/base-structure/components/ValidationChecklist.tsx`
- [X] T078 [US7] Add validation checks: min 3 categories, min 30 titles selected, project has URL/token
- [X] T079 [US7] Enhance Step 5 with summary view showing all selections
- [X] T080 [US7] Add confirmation dialog before final save

**Checkpoint**: All user stories should now be independently functional

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T081 [P] Add loading skeletons for all wizard steps
- [X] T082 [P] Add empty states for when no suggestions generated
- [X] T083 [P] Add error boundaries for each wizard step
- [X] T084 Implement retry logic for failed AI generations
- [X] T085 Add timeout handling (30s) for AI requests
- [X] T086 [P] Add responsive styles for mobile view
- [X] T087 Code cleanup and refactoring across all components
- [X] T088 Add Portuguese translations for all error messages

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 (Wizard Navigation): Can start first after Foundational
  - US2 (Project Selection): Depends on US1 (needs wizard shell)
  - US3 (Niche Generation): Depends on US2 (needs project context)
  - US4 (Categories): Depends on US3 (needs niche)
  - US5 (Installation Type): Depends on US4 (needs categories)
  - US6 (Titles/Save): Depends on US5 (needs installation config)
  - US7 (Review): Depends on US6 (needs complete flow)
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies (Sequential Flow)

Due to wizard nature, stories must be implemented in order:

```
US1 → US2 → US3 → US4 → US5 → US6 → US7
```

However, **backend endpoints** for US3, US4, US6 can be developed in parallel while frontend US1-US2 is being built.

### Within Each User Story

- Backend prompts before AI service methods
- AI service before controller endpoints
- Backend endpoints before frontend mutations
- Frontend hooks before components
- Components before integration with wizard

### Parallel Opportunities

**Backend (can all be parallelized):**
```bash
# After Phase 2 completion, these can run in parallel:
T032, T040, T054, T057, T059, T061 (All prompts)
T033, T041, T055, T058, T060, T062 (All AI service methods)
T063, T064, T065, T066 (All WordPress methods)
```

**Frontend (limited parallelization due to wizard flow):**
```bash
# Frontend step components depend on each other
# But frontend and backend work can be parallelized:
- Developer A: Backend endpoints (T032-T068)
- Developer B: Frontend wizard flow (T020-T076)
```

---

## Parallel Example: Backend Development

```bash
# All prompts can be written in parallel:
Task: T032 [US3] generateNiches prompt
Task: T040 [US4] generateCategories prompt
Task: T054 [US6] generateTitles prompt
Task: T057 [US6] generateAuthor prompt
Task: T059 [US6] generateLogoConfig prompt
Task: T061 [US6] generateBlogTitle prompt

# After prompts, all AI methods in parallel:
Task: T033 [US3] generateNiches method
Task: T041 [US4] generateCategories method
Task: T055 [US6] generateTitles method

# WordPress methods in parallel:
Task: T063 [US6] createCategories
Task: T064 [US6] updateAuthor
Task: T065 [US6] createLogo
Task: T066 [US6] updateSettings
```

---

## Implementation Strategy

### MVP First (User Stories 1-4)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US1 - Wizard Navigation
4. Complete Phase 4: US2 - Project Selection
5. Complete Phase 5: US3 - Niche Generation
6. Complete Phase 6: US4 - Category Selection
7. **STOP and VALIDATE**: Test complete wizard flow through categories
8. Deploy/demo if ready (partial MVP)

### Full MVP (Add US5-US6)

1. Complete Phase 7: US5 - Installation Type
2. Complete Phase 8: US6 - Title Generation + Save
3. **STOP and VALIDATE**: Test full save flow
4. Deploy/demo complete MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1-US2 → Wizard shell with project selection
3. Add US3 → AI niche generation working
4. Add US4 → Categories with drag-drop
5. Add US5 → Installation options
6. Add US6 → Full save to WordPress + Supabase (MVP Complete!)
7. Add US7 → Validation checklist (Polish)
8. Phase 10 → Final polish

### Parallel Team Strategy

With 2 developers:

1. **Developer A (Backend)**:
   - Phase 1-2: Setup and AI services
   - US3 Backend: T032-T034
   - US4 Backend: T040-T042
   - US6 Backend: T054-T068

2. **Developer B (Frontend)**:
   - Phase 1-2: Frontend setup
   - US1: T020-T026
   - US2: T027-T031
   - US3 Frontend: T035-T039
   - US4 Frontend: T043-T049
   - US5: T050-T053
   - US6 Frontend: T069-T076
   - US7: T077-T080

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable once complete
- Wizard is sequential but backend endpoints can be built in parallel
- AI prompts extracted from n8n JSONs - see plan.md for full prompt text
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- WordPress integration requires plugin "alvobot-pro" installed on target site

---

## Summary

- **Total Tasks**: 88
- **Phase 1 (Setup)**: 8 tasks
- **Phase 2 (Foundational)**: 11 tasks
- **US1 (Navigation)**: 7 tasks
- **US2 (Project)**: 5 tasks
- **US3 (Niche)**: 8 tasks
- **US4 (Categories)**: 10 tasks
- **US5 (Installation)**: 4 tasks
- **US6 (Titles/Save)**: 23 tasks
- **US7 (Review)**: 4 tasks
- **Phase 10 (Polish)**: 8 tasks

**Suggested MVP Scope**: Complete through US6 (76 tasks) for full functional wizard
**Partial MVP**: Complete through US4 (49 tasks) for wizard through category selection
