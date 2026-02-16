# Tasks: Andromeda Creative Diversity System

**Input**: Design documents from `/specs/20260203-andromeda-creative-diversity/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Manual testing (visual verification) + unit tests for prompt composition, niche detection, and quota handling.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`
- **Frontend**: `frontend/src/`
- **Migrations**: `supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations and core types that all user stories depend on

- [X] T001 Create migration for creative_concepts table (includes `prompt_template_json`, `example_images[]`, `works_for_niches`) in `supabase/migrations/20260203001_creative_concepts.sql`
- [X] T002 [P] Create migration for visual_groups table in `supabase/migrations/20260203002_visual_groups.sql`
- [X] T003 [P] Create migration for niche_templates table in `supabase/migrations/20260203003_niche_templates.sql`
- [X] T004 [P] Create migration for generation_sessions table in `supabase/migrations/20260203004_generation_sessions.sql`
- [X] T005 Create migration to extend creative_library table (add `model_used`, `concept_id`, `background_used`, `diversity_metadata`) in `supabase/migrations/20260203005_extend_creative_library.sql`
- [X] T006 Create seed data migration for 8 universal concepts (including `prompt_template_json`) in `supabase/migrations/20260203006_seed_universal_concepts.sql`
- [X] T007 [P] Create seed data migration for 28 financial concepts (including `prompt_template_json`) in `supabase/migrations/20260203007_seed_financial_concepts.sql`
- [X] T008 [P] Create seed data migration for 8 visual groups (A-H) in `supabase/migrations/20260203008_seed_visual_groups.sql`
- [X] T009 [P] Create seed data migration for financial niche template in `supabase/migrations/20260203009_seed_niche_templates.sql`
- [ ] T009A [P] Generate 10 example images per concept (manual curl) and store URLs in `example_images[]` via `supabase/migrations/20260203012_seed_example_images.sql`
- [X] T009B [P] Create migration for creative_backgrounds table in `supabase/migrations/20260203010_creative_backgrounds.sql`
- [X] T009C [P] Create seed data migration for Andromeda-safe background palette in `supabase/migrations/20260203011_seed_backgrounds.sql`
- [X] T010 Run migrations and verify tables created in Supabase

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend services and frontend types that MUST be complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T011 Add concept types to `frontend/src/features/alvoads-meta/types/creative.ts` (CreativeConcept, VisualGroup, CreativeBackground, NicheTemplate, GenerationSession, GenerationMode)
- [X] T012 [P] Create DTO types for generate-creatives contract in `backend/src/modules/meta/dto/generate-creative.dto.ts`
- [X] T013 [P] Extend ImageGenerationConfig interface in store types with generationMode and conceptSelections fields
- [X] T014 Create PromptComposerService scaffold in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T015 [P] Create NicheDetectorService scaffold in `backend/src/modules/meta/services/niche-detector.service.ts`
- [X] T016 Register new services in `backend/src/modules/meta/meta.module.ts`
- [X] T017 Extend metaAdsWizardStore with generationMode, conceptSelections, and session tracking in `frontend/src/features/alvoads-meta/stores/metaAdsWizardStore.ts`
- [X] T017A Add OpenRouter quota handling (throttle + backoff + concurrency caps) in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T017B Add external integration logging (success/error + timestamps) for OpenRouter calls in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T017C Enforce OpenRouter as the only provider (guard/validation) in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T017D Implement prompt composition priority order (FR-012F) in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [ ] T017E Add unit tests for prompt priority order and free-mode ranking in `backend/tests/unit/meta/prompt-composer.spec.ts`
- [ ] T017F Add unit tests for niche detection keywords (finance/jobs/ecommerce/health) in `backend/tests/unit/meta/niche-detector.spec.ts`
- [ ] T017G Add unit tests for rate-limit/backoff behavior in `backend/tests/unit/meta/ai-creative.spec.ts`
- [X] T017H Add OpenRouter request timeout (30s) + user-facing timeout error in `backend/src/modules/meta/services/ai-creative.service.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Geração de Criativos Diversificados (Priority: P1) 🎯 MVP

**Goal**: Generate visually DISTINCT creatives using concept-based prompts that avoid Andromeda penalties

**Independent Test**: Generate 5 creatives for same article, verify each uses different concept (visual inspection)

### Implementation for User Story 1

- [X] T018 [US1] Create useConcepts hook to fetch concepts from Supabase in `frontend/src/features/alvoads-meta/api/useConcepts.ts`
- [X] T019 [US1] Implement getConceptById and getConceptsByNiche methods in PromptComposerService in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T020 [US1] Implement composeConceptPrompt method that combines concept template + article context + user directions in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T021 [US1] Add getNextConcept method with diversity window (no repeat last 3) in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T021A [US1] Implement background selection using `creative_backgrounds` palette + no repeat last 4 in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T022 [US1] Extend generateImageWithConfiguredModel in ai-creative.service.ts to accept concept parameter in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T023 [US1] Add concept tracking to generation flow (used_concepts array) in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T024 [US1] Update saveToLibrary to include concept_id, background_used, `model_used`, and diversity_metadata in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T025 [US1] Add POST /meta/creatives/generate endpoint supporting concept-based generation in `backend/src/modules/meta/controllers/creative.controller.ts`
- [X] T026 [US1] Update useGenerateImages mutation to pass concept selections in `frontend/src/features/alvoads-meta/api/useCreatives.ts`
- [X] T027 [US1] Update StepCreatives.tsx to display concept used for each generated image in `frontend/src/features/alvoads-meta/components/wizard/StepCreatives.tsx`

**Checkpoint**: User Story 1 complete - diverse creatives can be generated with concept-based prompts

---

## Phase 4: User Story 2 - Modos de Geração: Preset vs Livre (Priority: P2)

**Goal**: Allow users to choose between Preset mode (select concepts + quantities) or Free mode (AI decides)

**Independent Test**: Toggle between modes, verify Preset respects exact quantities, Free mode auto-selects

### Implementation for User Story 2

- [X] T028 [US2] Create ModeToggle component with Preset/Livre options in `frontend/src/features/alvoads-meta/components/wizard/ModeToggle.tsx`
- [X] T029 [US2] Create ModeToggle.module.css with active state styling in `frontend/src/features/alvoads-meta/components/wizard/ModeToggle.module.css`
- [X] T030 [US2] Create ConceptSelector component with concept cards and quantity controls in `frontend/src/features/alvoads-meta/components/wizard/ConceptSelector.tsx`
- [X] T031 [US2] Create ConceptSelector.module.css with card grid and quantity picker styles in `frontend/src/features/alvoads-meta/components/wizard/ConceptSelector.module.css`
- [X] T032 [US2] Create ConceptCard subcomponent with icon, name, description, quantity in `frontend/src/features/alvoads-meta/components/wizard/ConceptCard.tsx`
- [X] T033 [US2] Add setGenerationMode and setConceptSelections actions to store in `frontend/src/features/alvoads-meta/stores/metaAdsWizardStore.ts`
- [X] T034 [US2] Add validateConceptSelections helper (sum must equal required count) in `frontend/src/features/alvoads-meta/stores/metaAdsWizardStore.ts`
- [X] T035 [US2] Implement preset mode logic in backend - generate exact quantities per concept in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T036 [US2] Implement free mode logic in backend - AI ranks concepts by relevance + logs selected concept in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T037 [US2] Update generate endpoint to handle mode parameter in `backend/src/modules/meta/controllers/creative.controller.ts`
- [X] T038 [US2] Integrate ModeToggle and ConceptSelector into StepCreatives.tsx in `frontend/src/features/alvoads-meta/components/wizard/StepCreatives.tsx`
- [X] T039 [US2] Add conditional rendering: show ConceptSelector only in Preset mode in `frontend/src/features/alvoads-meta/components/wizard/StepCreatives.tsx`

**Checkpoint**: User Story 2 complete - users can switch between Preset and Free modes

---

## Phase 5: User Story 3 - Estratégias para Nichos Estratégicos (Priority: P3)

**Goal**: Auto-detect financial/jobs niches and apply specialized templates + visual groups

**Independent Test**: Generate creatives for article with "empréstimo" keyword, verify financial template applied

### Implementation for User Story 3

- [X] T040 [US3] Implement detectNiche method with keyword analysis in `backend/src/modules/meta/services/niche-detector.service.ts`
- [X] T041 [US3] Add financial niche keywords (empréstimo, crédito, financiamento, dinheiro) to detector in `backend/src/modules/meta/services/niche-detector.service.ts`
- [X] T042 [US3] Add jobs niche keywords (emprego, vaga, trabalho, contratação) to detector in `backend/src/modules/meta/services/niche-detector.service.ts`
- [X] T042A [US3] Add ecommerce niche keywords (loja, comprar, frete, desconto, carrinho) to detector in `backend/src/modules/meta/services/niche-detector.service.ts`
- [X] T042B [US3] Add health niche keywords (saúde, clínico, tratamento, consulta, bem-estar) to detector in `backend/src/modules/meta/services/niche-detector.service.ts`
- [X] T042C [US3] Ensure default fallback to `generic` when no niche is detected in `backend/src/modules/meta/services/niche-detector.service.ts`
- [X] T043 [US3] Implement getNicheTemplate method to fetch template from database in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T044 [US3] Implement getVisualGroups method to fetch visual groups for niche in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T045 [US3] Implement selectRandomVisualGroup with rotation to avoid repeats in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T045A [US3] Implement category-balanced selection for financial concepts (5 categories distribution) in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T046 [US3] Extend composeConceptPrompt to apply niche template when detected in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T047 [US3] Add prohibited words filter to prompt composition (per FR-016) in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T048 [US3] Add required elements validation for financial niche in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T049 [US3] Add POST /meta/creatives/detect-niche endpoint in `backend/src/modules/meta/controllers/creative.controller.ts`
- [X] T050 [US3] Create useDetectNiche hook for frontend in `frontend/src/features/alvoads-meta/api/useCreatives.ts`
- [X] T051 [US3] Add niche indicator banner to StepCreatives when financial detected in `frontend/src/features/alvoads-meta/components/wizard/StepCreatives.tsx`
- [X] T052 [US3] Display specialized concepts UI for financial niche (categories view) in `frontend/src/features/alvoads-meta/components/wizard/ConceptSelector.tsx`

**Checkpoint**: User Story 3 complete - financial niche detected and templates applied

---

## Phase 6: User Story 4 - Rotação Automática de Modelos de IA (Priority: P4)

**Goal**: Alternate between Nano Banana Pro and GPT Image 1.5 for visual diversity

**Independent Test**: Generate 4+ creatives, verify metadata shows both models used

### Implementation for User Story 4

- [X] T053 [US4] Add model rotation constants (AVAILABLE_MODELS array) in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T054 [US4] Implement getNextModel method with round-robin rotation in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T055 [US4] Add used_models tracking to generation session in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T056 [US4] Extend generateImageWithConfiguredModel to use rotated model in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T057 [US4] Implement model fallback when primary model fails in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T057A [US4] Ensure credits are only consumed on successful image generation (no credits if all models fail) in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T058 [US4] Add model used to generation response DTO in `backend/src/modules/meta/dto/generate-creative.dto.ts`
- [X] T059 [US4] Display model badge on generated image cards in `frontend/src/features/alvoads-meta/components/wizard/StepCreatives.tsx`
- [X] T060 [US4] Display model_used in creative library list and add optional filter in `frontend/src/features/alvoads-meta/components/wizard/CreativeLibraryModal.tsx`

**Checkpoint**: User Story 4 complete ✅ - models rotate automatically for each generation

---

## Phase 7: User Story 5 - Preview de Diversidade (Priority: P5)

**Goal**: Show diversity score and visual tags before publishing

**Independent Test**: Generate 5 creatives, verify diversity score displayed with concept/model tags

### Implementation for User Story 5

- [X] T061 [US5] Implement calculateDiversityScore function (concepts 50%, backgrounds 30%, models 20%) in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T062 [US5] Add diversity_score to generation session and response in `backend/src/modules/meta/services/ai-creative.service.ts`
- [X] T063 [US5] Create DiversityPreview component scaffold in `frontend/src/features/alvoads-meta/components/wizard/DiversityPreview.tsx`
- [X] T064 [US5] Create DiversityPreview.module.css with score gauge and tag styles in `frontend/src/features/alvoads-meta/components/wizard/DiversityPreview.module.css`
- [X] T065 [US5] Implement DiversityScoreGauge subcomponent (0-100 visual) in `frontend/src/features/alvoads-meta/components/wizard/DiversityPreview.tsx`
- [X] T066 [US5] Implement ConceptTags subcomponent showing unique concepts used in `frontend/src/features/alvoads-meta/components/wizard/DiversityPreview.tsx`
- [X] T067 [US5] Implement ModelTags subcomponent showing models used in `frontend/src/features/alvoads-meta/components/wizard/DiversityPreview.tsx`
- [X] T068 [US5] Add low diversity warning alert (score < 70%) in `frontend/src/features/alvoads-meta/components/wizard/DiversityPreview.tsx`
- [X] T069 [US5] Integrate DiversityPreview into StepCreatives results section in `frontend/src/features/alvoads-meta/components/wizard/StepCreatives.tsx`
- [X] T070 [US5] Add diversity preview to review step before publish in `frontend/src/features/alvoads-meta/components/wizard/ReviewStep.tsx`

**Checkpoint**: User Story 5 complete ✅ - diversity feedback visible before publishing

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T071 Validate observability logs for OpenRouter calls (success/error + timestamps) in staging
- [ ] T072 Add error handling for OpenRouter failures with user-friendly messages in `backend/src/modules/meta/services/ai-creative.service.ts`
- [ ] T074 [P] Implement localization rules (currency from targeting.countries) in `backend/src/modules/meta/services/prompt-composer.service.ts`
- [X] T075 [P] Add index barrel exports for new components in `frontend/src/features/alvoads-meta/components/wizard/index.ts`
- [X] T076 [P] Update useCreatives exports in `frontend/src/features/alvoads-meta/api/index.ts`
- [ ] T077 Validate quickstart.md scenarios work end-to-end
- [ ] T078 Manual testing: verify all 5 user stories work independently

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup (T010) completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational (Phase 2) completion
  - US1 (P1) can start immediately after Foundational
  - US2 (P2) depends on US1 completion (needs concept-based generation working)
  - US3 (P3) depends on US1 completion (extends prompt composition)
  - US4 (P4) depends on US1 completion (modifies generation flow)
  - US5 (P5) depends on US1 + US4 completion (needs session tracking + model info)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Foundational (Phase 2)
        │
        ▼
    US1 (P1) ─────────────────────────┐
        │                              │
        ├──────┬──────┬────────────────┤
        ▼      ▼      ▼                ▼
    US2(P2) US3(P3) US4(P4)           │
                       │               │
                       └───────────────┤
                                       ▼
                                   US5 (P5)
```

### Within Each User Story

- Backend services before controllers
- Controllers before frontend API hooks
- API hooks before components
- Core implementation before UI integration

### Parallel Opportunities

- T001-T009: Migration files can be written in parallel (but run sequentially)
- T011-T013: Type definitions in parallel
- T014-T015: Service scaffolds in parallel
- T028-T032: Mode toggle and concept selector components in parallel
- T040-T043: Niche detector methods in parallel
- T063-T067: Diversity preview subcomponents in parallel
- T071-T076: Polish tasks in parallel

---

## Parallel Example: Phase 1 Setup

```bash
# Write all migration files in parallel:
Task: "Create migration for creative_concepts table"
Task: "Create migration for visual_groups table"
Task: "Create migration for niche_templates table"
Task: "Create migration for generation_sessions table"

# Then run migrations sequentially (T010)
```

## Parallel Example: User Story 2 Components

```bash
# Launch all component creation in parallel:
Task: "Create ModeToggle component"
Task: "Create ConceptSelector component"
Task: "Create ConceptCard subcomponent"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 2: Foundational (T011-T017)
3. Complete Phase 3: User Story 1 (T018-T027)
4. **STOP and VALIDATE**: Generate 5 creatives, verify diversity
5. Deploy/demo if ready - core value delivered

### Incremental Delivery

1. Setup + Foundational → Database ready, types defined
2. Add US1 → Diverse creatives work (MVP!)
3. Add US2 → Mode selection UI (user control)
4. Add US3 → Niche templates (financial optimization)
5. Add US4 → Model rotation (more diversity)
6. Add US5 → Diversity preview (user feedback)

### Suggested Order

1. **Week 1**: Phase 1 + 2 + US1 (MVP)
2. **Week 2**: US2 + US3 (mode selection + niche detection)
3. **Week 3**: US4 + US5 + Polish (model rotation + preview)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story should be independently testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance: All concepts from database (no hardcode)
- **Jobs niche**: Keywords exist (T042) but no template/concepts defined - planned for Phase 2 expansion

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Setup | T001-T010 (+ T009A) | Database migrations, seed data, docs |
| Foundational | T011-T017 | Types, DTOs, service scaffolds |
| US1 (P1) | T018-T027 | Core concept-based generation |
| US2 (P2) | T028-T039 | Preset/Free mode UI |
| US3 (P3) | T040-T052 | Niche detection + templates |
| US4 (P4) | T053-T060 | Model rotation |
| US5 (P5) | T061-T070 | Diversity preview |
| Polish | T071-T078 | Logging, error handling, validation |

**Total Tasks**: 79
**MVP Scope**: T001-T027 + T009A (28 tasks for US1 delivery)
