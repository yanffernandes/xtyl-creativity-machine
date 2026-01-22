# Tasks: Visual Generation Studio

**Input**: Design documents from `/specs/027-visual-generation-studio/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: No automated tests requested for this feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/` (Python/FastAPI)
- **Frontend**: `frontend/src/` (TypeScript/Next.js)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations and basic structure for the feature

- [ ] T001 Create migration file for style_presets table in backend/migrations/027_style_presets.sql
- [ ] T002 Run migration to create style_presets table and populate initial data
- [ ] T003 [P] Add StylePreset model to backend/models.py
- [ ] T004 [P] Add StylePreset schema to backend/schemas.py

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create bootstrap endpoint GET /projects/{id}/bootstrap in backend/routers/projects.py
- [ ] T006 [P] Create style-presets endpoint GET /image-generation/style-presets in backend/routers/image_generation.py
- [ ] T007 [P] Create generate-batch endpoint POST /image-generation/generate-batch in backend/routers/image_generation.py
- [ ] T008 [P] Create batch stream endpoint GET /image-generation/batch/{batch_id}/stream in backend/routers/image_generation.py
- [ ] T009 Create useProjectBootstrap hook in frontend/src/hooks/useProjectBootstrap.ts
- [ ] T010 Create TypeScript types for BootstrapData, StylePreset, ImageBatchRequest in frontend/src/types/image-studio.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 6 - Carregar página rapidamente (Priority: P1) 🎯 MVP

**Goal**: Reduzir requests de 8+ para 2 no carregamento, meta <1s

**Independent Test**: Abrir projeto e verificar network tab mostra apenas 2 requests (auth + bootstrap)

### Implementation for User Story 6

- [ ] T011 [US6] Refactor project page to use useProjectBootstrap instead of multiple hooks in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx
- [ ] T012 [US6] Add skeleton loading states for project page in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx
- [ ] T013 [US6] Cache bootstrap data with TanStack Query (staleTime: 5min) in frontend/src/hooks/useProjectBootstrap.ts
- [ ] T014 [US6] Remove redundant API calls (settings, memories, visual-context) from project page

**Checkpoint**: Project page loads with 2 requests in <1s

---

## Phase 4: User Story 4 - Usar presets de estilo (Priority: P2)

**Goal**: Permitir seleção de estilos predefinidos com preview visual

**Independent Test**: Visualizar grid de 8 presets com thumbnails, selecionar um e ver destaque visual

### Implementation for User Story 4

- [ ] T015 [P] [US4] Create StylePresetGrid component in frontend/src/components/image-studio/StylePresetGrid.tsx
- [ ] T016 [P] [US4] Create StylePresetCard component in frontend/src/components/image-studio/StylePresetCard.tsx
- [ ] T017 [US4] Add preset selection state to useImageStudio hook in frontend/src/hooks/useImageStudio.ts
- [ ] T018 [US4] Style presets with glassmorphism design (border blue when selected) in StylePresetGrid.tsx

**Checkpoint**: Style presets grid renders and selection works

---

## Phase 5: User Story 1 - Gerar imagens com controles visuais (Priority: P3)

**Goal**: Interface completa com prompt, estilos, formatos, modelo e slider de criatividade

**Independent Test**: Configurar todos os controles e clicar "Gerar 4 Variações" - ver request no network

### Implementation for User Story 1

- [ ] T019 [P] [US1] Create ImageStudio container component in frontend/src/components/image-studio/ImageStudio.tsx
- [ ] T020 [P] [US1] Create PromptInput component with textarea in frontend/src/components/image-studio/PromptInput.tsx
- [ ] T021 [P] [US1] Create FormatSelector component (1:1, 16:9, 9:16, 4:3) in frontend/src/components/image-studio/FormatSelector.tsx
- [ ] T022 [P] [US1] Create ModelSelector dropdown component in frontend/src/components/image-studio/ModelSelector.tsx
- [ ] T023 [P] [US1] Create CreativitySlider component (0-100%) in frontend/src/components/image-studio/CreativitySlider.tsx
- [ ] T024 [US1] Create useImageStudio hook with all state and actions in frontend/src/hooks/useImageStudio.ts
- [ ] T025 [US1] Wire up ImageStudio to call generate-batch API endpoint
- [ ] T026 [US1] Create GenerateButton component with loading state in frontend/src/components/image-studio/GenerateButton.tsx

**Checkpoint**: All controls work and generate button triggers API call

---

## Phase 6: User Story 2 - Visualizar e selecionar variações (Priority: P4)

**Goal**: Grid 2x2 mostrando 4 variações com ações contextuais

**Independent Test**: Gerar imagens e ver grid 2x2, hover mostra ações, clique expande

### Implementation for User Story 2

- [ ] T027 [P] [US2] Create VariationGrid component (2x2 grid) in frontend/src/components/image-studio/VariationGrid.tsx
- [ ] T028 [P] [US2] Create VariationCard component with image and actions in frontend/src/components/image-studio/VariationCard.tsx
- [ ] T029 [US2] Implement SSE connection for batch progress in frontend/src/hooks/useImageStudio.ts
- [ ] T030 [US2] Add loading skeleton for each variation slot in VariationCard.tsx
- [ ] T031 [US2] Create ImageExpandModal for full-size view in frontend/src/components/image-studio/ImageExpandModal.tsx
- [ ] T032 [US2] Add selection indicator (border/badge) for selected variation in VariationCard.tsx

**Checkpoint**: Grid shows 4 variations with hover actions and expand modal

---

## Phase 7: User Story 3 - Refinar uma variação específica (Priority: P5)

**Goal**: Refinar variação selecionada usando-a como referência

**Independent Test**: Clicar "Refinar Esta" em uma variação, ajustar prompt, gerar novamente

### Implementation for User Story 3

- [ ] T033 [US3] Add refine action handler to useImageStudio hook in frontend/src/hooks/useImageStudio.ts
- [ ] T034 [US3] Implement "Usar como Base" functionality in VariationCard.tsx
- [ ] T035 [US3] Add refinement state (referenceImage) to ImageStudio state
- [ ] T036 [US3] Show reference image preview when refining in ImageStudio.tsx
- [ ] T037 [US3] Implement generation history (last 5 sets) in useImageStudio hook

**Checkpoint**: Refine flow works end-to-end

---

## Phase 8: User Story 5 - Salvar imagens no projeto (Priority: P6)

**Goal**: Salvar variações diretamente no projeto com metadata

**Independent Test**: Clicar "Salvar no Projeto", escolher pasta, ver imagem no Kanban

### Implementation for User Story 5

- [ ] T038 [P] [US5] Add save action to VariationCard with folder picker in VariationCard.tsx
- [ ] T039 [P] [US5] Create FolderPickerModal component in frontend/src/components/image-studio/FolderPickerModal.tsx
- [ ] T040 [US5] Implement save document API call with metadata in useImageStudio.ts
- [ ] T041 [US5] Add success toast after saving image
- [ ] T042 [US5] Add download action (direct file download) to VariationCard.tsx

**Checkpoint**: Save and download actions work correctly

---

## Phase 9: Tab System Integration (Priority: P7)

**Goal**: Integrar ImageStudio como aba na página do projeto

**Independent Test**: Navegar entre abas Chat, Imagens, Docs, Assets sem perder estado

### Implementation for Tab System

- [ ] T043 [P] Create TabNavigation component in frontend/src/components/project/TabNavigation.tsx
- [ ] T044 [P] Create ChatTab wrapper component in frontend/src/components/project/tabs/ChatTab.tsx
- [ ] T045 [P] Create ImagesTab wrapper component in frontend/src/components/project/tabs/ImagesTab.tsx
- [ ] T046 [P] Create DocumentsTab wrapper component in frontend/src/components/project/tabs/DocumentsTab.tsx
- [ ] T047 [P] Create AssetsTab wrapper component in frontend/src/components/project/tabs/AssetsTab.tsx
- [ ] T048 Integrate tab system into project page in frontend/src/app/workspace/[id]/project/[projectId]/page.tsx
- [ ] T049 Extract ChatSidebar logic to ChatTab preserving all functionality
- [ ] T050 Add tab state persistence (remember last tab) via URL params or localStorage

**Checkpoint**: Tab navigation works, all tabs render correctly

---

## Phase 10: User Story 7 - Onboarding guiado (Priority: P8)

**Goal**: Tour interativo para novos usuários

**Independent Test**: Limpar localStorage, abrir projeto, ver tour aparecer com 5-7 passos

### Implementation for User Story 7

- [ ] T051 [P] [US7] Create useOnboarding hook in frontend/src/hooks/useOnboarding.ts
- [ ] T052 [P] [US7] Create TourOverlay component with spotlight in frontend/src/components/onboarding/TourOverlay.tsx
- [ ] T053 [P] [US7] Create TourTooltip component with navigation in frontend/src/components/onboarding/TourTooltip.tsx
- [ ] T054 [US7] Define 5-7 tour steps covering key features in useOnboarding.ts
- [ ] T055 [US7] Add data-tour attributes to target elements in ImageStudio and TabNavigation
- [ ] T056 [US7] Implement localStorage persistence for "tour completed" state
- [ ] T057 [US7] Add "Pular Tour" button always visible during tour

**Checkpoint**: Onboarding tour works for first-time users

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T058 [P] Add GenerationHistory sidebar component in frontend/src/components/image-studio/GenerationHistory.tsx
- [ ] T059 [P] Add ReferenceAssetPicker modal in frontend/src/components/image-studio/ReferenceAssetPicker.tsx
- [ ] T060 [P] Add skeleton states to all components (StylePresetGrid, VariationGrid, ImageStudio)
- [ ] T061 Performance testing: verify bootstrap <500ms, page load <1s
- [ ] T062 Add error handling and error toasts for all API calls
- [ ] T063 Add keyboard shortcuts (Enter to generate, Esc to close modals)
- [ ] T064 Mobile responsive adjustments for ImageStudio layout

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US6 (bootstrap) should be first - improves all subsequent work
  - US4 (presets) can parallel with US1 (controls)
  - US1 (controls) before US2 (grid) and US3 (refine)
  - US2 (grid) before US3 (refine) and US5 (save)
  - Tab System after US1-US5 core functionality works
  - US7 (onboarding) last - needs all features to exist
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Setup → Foundational → US6 (bootstrap) ──────────────────────────┐
                              │                                   │
                              ├──→ US4 (presets) ─────────────────┤
                              │                                   │
                              └──→ US1 (controls) ────→ US2 (grid)│──→ US3 (refine)
                                                              │   │
                                                              └───┴──→ US5 (save)
                                                                            │
                                                                            v
                                                                    Tab System
                                                                            │
                                                                            v
                                                                    US7 (onboarding)
                                                                            │
                                                                            v
                                                                        Polish
```

### Parallel Opportunities

**Setup Phase (all parallel):**
```
T001, T002 (sequential - migration)
T003, T004 (parallel - different files)
```

**Foundational Phase:**
```
T005 (bootstrap endpoint - critical path)
T006, T007, T008 (parallel - different endpoints)
T009, T010 (parallel - different files, after T005)
```

**User Story Phases:**
```
US4: T015, T016 (parallel)
US1: T019, T020, T021, T022, T023 (parallel)
US2: T027, T028 (parallel)
Tab: T043, T044, T045, T046, T047 (parallel)
US7: T051, T052, T053 (parallel)
```

---

## Implementation Strategy

### MVP First (US6 + US4 + US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US6 (bootstrap) - immediate performance win
4. Complete Phase 4: US4 (presets) + Phase 5: US1 (controls) in parallel
5. Complete Phase 6: US2 (grid)
6. **STOP and VALIDATE**: Basic image generation with controls works
7. Deploy/demo if ready - this is a functional MVP!

### Full Feature

1. MVP (above)
2. Add US3 (refine)
3. Add US5 (save)
4. Add Tab System
5. Add US7 (onboarding)
6. Polish phase

### Suggested MVP Scope

**Tasks T001-T032** deliver a working ImageStudio with:
- Fast page load (bootstrap)
- Style presets selection
- All visual controls (prompt, format, model, creativity)
- 4 variations grid with basic actions

This is ~32 tasks, approximately 60% of total.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tasks** | 64 |
| **Setup Phase** | 4 tasks |
| **Foundational Phase** | 6 tasks |
| **User Story Tasks** | 47 tasks |
| **Polish Tasks** | 7 tasks |
| **Parallel Opportunities** | 28 tasks marked [P] |
| **MVP Scope** | 32 tasks (Phases 1-6) |

### Tasks per User Story

| User Story | Task Count | Priority |
|------------|------------|----------|
| US6 - Bootstrap | 4 tasks | P1 (MVP) |
| US4 - Presets | 4 tasks | P2 (MVP) |
| US1 - Controls | 8 tasks | P3 (MVP) |
| US2 - Grid | 6 tasks | P4 (MVP) |
| US3 - Refine | 5 tasks | P5 |
| US5 - Save | 5 tasks | P6 |
| Tab System | 8 tasks | P7 |
| US7 - Onboarding | 7 tasks | P8 |
