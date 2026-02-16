# Tasks: Creative Concepts Migration

**Input**: Design documents from `/specs/031-creative-concepts-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/creative-concepts-api.yaml, quickstart.md

**Tests**: Not requested - no test tasks included.

**Organization**: Tasks grouped by user story. US1 (Select Concept) and US2 (Remove Visual Styles) are combined into one phase since they share 100% of the same files and are both P1 priority - the migration, endpoint rename, and frontend update serve both stories simultaneously.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Database Migration)

**Purpose**: Create the SQL migration that renames the table, updates columns, seeds new data, and removes visual styles.

- [x] T001 Create SQL migration file `supabase/migrations/031_creative_concepts_migration.sql` that: (1) renames `style_presets` table to `creative_concepts`, (2) drops `preset_type` and `category` columns, (3) adds `prompt_template TEXT`, `template_variables JSONB`, and `updated_at TIMESTAMPTZ` nullable columns, (4) deletes the 8 visual style rows (photographic, watercolor, 3d-render, illustration, minimalist, vibrant, vintage, cinematic), (5) inserts 6 new concept rows (question-hook, before-after, social-proof-stats, step-by-step, comparison-table, simulator-ui) with prompt_modifier text per data-model.md — for the `question-hook` row, also set `prompt_template = 'An attention-grabbing image with a bold question about {{client_name}}, designed for {{target_audience}}. Clean typography, contrasting background.'` and `template_variables = '["client_name", "target_audience"]'::jsonb`, (6) renames indexes from `idx_style_presets_*` to `idx_creative_concepts_*`, (7) adds new index `idx_creative_concepts_sort` on `sort_order`. See data-model.md for full seed data and column definitions.

---

## Phase 2: Foundational (Backend Model + Schema)

**Purpose**: Update SQLAlchemy model and Pydantic schemas. MUST complete before any router or frontend work.

**CRITICAL**: No router or frontend work can begin until this phase is complete.

- [x] T002 Rename `StylePreset` model to `CreativeConcept` in `backend/models.py` (~line 567-585): change class name to `CreativeConcept`, update `__tablename__` to `"creative_concepts"`, remove `category` and `preset_type` columns, add `prompt_template = Column(Text, nullable=True)`, `template_variables = Column(JSONB, nullable=True)`, and `updated_at = Column(DateTime(timezone=True), nullable=True)` columns. Keep all other columns (id, name, name_pt, slug, prompt_modifier, thumbnail_url, sort_order, is_active, created_at).

- [x] T003 Update Pydantic schemas in `backend/schemas.py`: (1) Rename `StylePreset` class (~line 1569) to `CreativeConcept`, remove `category` and `preset_type` fields, add `prompt_template: Optional[str] = None` and `template_variables: Optional[List[str]] = None` fields. (2) Rename `StylePresetList` (~line 1587) to `CreativeConceptList`, change field from `presets` to `concepts: List[CreativeConcept]`. (3) In `ImageBatchRequest` (~line 1515): replace `visual_style`, `layout`, and `style_preset` fields with single `creative_concept: Optional[str] = None` field. (4) In `BootstrapData` (~line 1604): rename `style_presets` field to `creative_concepts`. (5) In `ImageBatchRequestExtended` (~line 1778): replace `style_preset` field with `creative_concept`.

**Checkpoint**: Backend model and schemas updated - router and frontend work can begin.

---

## Phase 3: US1 + US2 - Core Migration (Priority: P1) MVP

**Goal**: Replace the entire style_presets system with creative_concepts across backend routers and frontend. Users see a single flat list of creative concepts (no visual_style/layout split) and no visual style presets appear.

**Independent Test**: Open image studio → see single concept grid (not two grids) → select a concept → generate image → concept's prompt_modifier is prepended to user prompt. No photographic/watercolor/cinematic presets visible.

### Backend Router Changes

- [x] T004 [US1] Update `GET /image-generation/style-presets` endpoint in `backend/routers/image_generation.py` (~line 818-843): (1) rename route to `@router.get("/creative-concepts")`, (2) change response_model to `CreativeConceptList`, (3) update import from `models.py` to use `CreativeConcept`, (4) update import from `schemas.py` to use `CreativeConcept as CreativeConceptSchema, CreativeConceptList`, (5) query `CreativeConcept` instead of `StylePreset`, (6) return flat list `CreativeConceptList(concepts=[...], total=len(concepts))` instead of separated visual_styles/layouts.

- [x] T005 [US1] Update batch generation logic in `backend/routers/image_generation.py` (~line 1154-1174): (1) replace the dual visual_style + layout preset lookup with single concept lookup: `if request.creative_concept: concept = db.query(CreativeConcept).filter(CreativeConcept.slug == request.creative_concept, CreativeConcept.is_active == True).first()`, (2) if concept found, set `style_modifier_base = concept.prompt_modifier`, (3) prepend to user prompt: `final_prompt = f"{style_modifier_base}. {prompt}" if style_modifier_base else prompt`. Remove all references to `visual_style`, `layout`, and `style_preset` variables.

- [x] T006 [P] [US1] Update bootstrap endpoint in `backend/routers/projects.py` (~line 552-585): (1) change import from `StylePreset` to `CreativeConcept`, (2) change schema import from `StylePreset as StylePresetSchema` to `CreativeConcept as CreativeConceptSchema`, (3) rename query variable from `style_presets` to `creative_concepts`, (4) query `CreativeConcept` instead of `StylePreset`, (5) update `BootstrapData` construction to use `creative_concepts=concepts_response` instead of `style_presets=style_presets_response`.

- [x] T007 [P] [US1] Update thumbnail generation script `backend/scripts/generate_preset_thumbnails.py` (~line 98-128): replace all SQL references from `style_presets` to `creative_concepts` in the raw SQL queries (`FROM style_presets` → `FROM creative_concepts`, `UPDATE style_presets` → `UPDATE creative_concepts`).

### Frontend Type Changes

- [x] T008 [P] [US1] Update types in `frontend/src/types/image-studio.ts`: (1) remove `PresetType` type (~line 10), (2) rename `StylePreset` interface to `CreativeConcept` (~line 12-24), remove `category` and `preset_type` fields, add `prompt_template?: string | null` and `template_variables?: string[] | null`, (3) rename `StylePresetList` to `CreativeConceptList` with fields `concepts: CreativeConcept[]` and `total: number`, (4) in `BootstrapData` (~line 137): rename `style_presets` to `creative_concepts: CreativeConcept[]`, (5) in `ImageBatchRequest` (~line 147): replace `style_preset`, `visual_style`, `layout` with `creative_concept?: string | null`, (6) in `ImageStudioState` (~line 209): replace `stylePreset` with `concept: string | null`, (7) in `ImageStudioActions` (~line 224): replace `setStylePreset` with `setConcept: (slug: string | null) => void`.

- [x] T009 [P] [US1] Update types in `frontend/src/types/supabase.ts` (~line 544-559): rename `StylePreset` interface references, remove `preset_type` field, align with new `CreativeConcept` shape.

### Frontend Component Changes

- [x] T010 [US1] Rename `frontend/src/components/image-studio/StylePresetCard.tsx` to `ConceptCard.tsx`: (1) rename the file, (2) update component name from `StylePresetCard` to `ConceptCard`, (3) update prop type from `StylePreset` to `CreativeConcept`, (4) update import path for the type. Keep all visual design (thumbnail, name_pt label, selection state) identical.

- [x] T011 [US1] Rename `frontend/src/components/image-studio/StylePresetGrid.tsx` to `ConceptGrid.tsx`: (1) rename the file, (2) update component name from `StylePresetGrid` to `ConceptGrid`, (3) update interface from `StylePresetGridProps` to `ConceptGridProps`, (4) rename prop `presets` to `concepts`, `selectedPresetSlug` to `selectedConceptSlug`, `onSelectPreset` to `onSelectConcept`, (5) update import to use `ConceptCard` and `CreativeConcept` type. Keep horizontal scrollable grid, "None" option, and sort behavior.

- [x] T012 [US1] Update exports in `frontend/src/components/image-studio/index.ts`: replace `export { StylePresetGrid }` and `export { StylePresetCard }` with `export { ConceptGrid }` and `export { ConceptCard }`.

- [x] T013 [US1] Update `frontend/src/components/image-studio/CreateMode.tsx` (~line 204-226): (1) update imports to use `ConceptGrid` and `CreativeConcept`, (2) replace the TWO `StylePresetGrid` instances (one for "Estilo Visual", one for "Diagramacao") with a SINGLE `ConceptGrid` instance, (3) update props: `concepts={concepts}`, `selectedConceptSlug={studio.concept}`, `onSelectConcept={studio.setConcept}`, (4) update title to "Conceito Criativo" with appropriate icon, (5) remove `visualStylePresets` and `layoutPresets` props, replace with single `concepts` prop.

- [x] T014 [US1] Update `frontend/src/hooks/useImageStudio.ts`: (1) replace `visualStyleSlug`/`layoutSlug` state with single `conceptSlug` state (`useState<string | null>(null)`), (2) replace `setVisualStyle`/`setLayout` setters with single `setConcept`, (3) remove the `allVisualStyles`/`allLayouts` computed variables, replace with `concepts` from props, (4) in `generate()` function (~line 325): replace `visual_style: visualStyleSlug` and `layout: layoutSlug` with `creative_concept: conceptSlug`, (5) update return object to expose `concept`, `setConcept` instead of `visualStyle`, `layout`, `setVisualStyle`, `setLayout`, (6) update `UseImageStudioOptions` interface: replace `visualStylePresets`/`layoutPresets`/`stylePresets` with single `concepts?: CreativeConcept[]`, (7) update imports.

- [x] T015 [US1] Update `frontend/src/app/workspace/[id]/project/[projectId]/studio/page.tsx`: (1) update bootstrap data consumption from `style_presets` to `creative_concepts`, (2) pass `concepts={bootstrapData.creative_concepts}` to the studio component instead of separate `visualStylePresets`/`layoutPresets`, (3) update any type references.

**Checkpoint**: US1 + US2 complete. Users see a single concept grid, no visual styles. Concept prompt_modifier prepended to user prompt during generation.

---

## Phase 4: US3 - Template Variable Resolution (Priority: P2)

**Goal**: Concepts with `prompt_template` containing `{{variable}}` syntax are automatically resolved from project settings before prompt composition.

**Independent Test**: Select the "question-hook" concept (which has `prompt_template` with `{{client_name}}`), generate an image in a project that has `client_name` set in settings → the resolved prompt should include the actual client name instead of `{{client_name}}`.

### Implementation

- [x] T016 [US3] Add template variable resolution logic to batch generation in `backend/routers/image_generation.py`: after looking up the concept in T005's code, add resolution logic: (1) if `concept.prompt_template` is not None, build a variable map from project settings (`project.settings.get('client_name')`, `project.settings.get('description')`, `project.settings.get('target_audience')`, etc.) plus `project.name` as `project_name`, (2) attempt to resolve all `{{var}}` placeholders in `prompt_template` using simple string replacement, (3) if ALL variables resolve successfully (no empty/missing values), use the resolved template as `concept_text`, (4) if ANY variable fails to resolve, fall back to `concept.prompt_modifier`, (5) prepend `concept_text` to user prompt as before. Import `re` for regex-based `{{var}}` detection.

**Checkpoint**: US3 complete. Concepts with prompt_template have their variables resolved from project settings. Fallback to prompt_modifier when variables can't be resolved.

---

## Phase 5: US4 - Backward Compatibility Verification (Priority: P2)

**Goal**: Ensure existing documents with historical `style_preset` references in `generation_metadata` are preserved and display correctly.

**Independent Test**: Query a document with `generation_metadata` containing `style_preset: "photographic"` → metadata should be intact and displayed as-is.

### Implementation

- [x] T017 [US4] Verify backward compatibility: (1) check that no code in the codebase attempts to JOIN or lookup `generation_metadata.style_preset` against the renamed table - search for any queries that reference `generation_metadata` + `style_preset`, (2) if the frontend displays generation_metadata (e.g., in a document detail view), ensure it renders the raw string value without attempting to resolve it against the concepts table, (3) document any findings - this should be a verification-only task with no code changes needed since `generation_metadata` is a JSONB field with no foreign keys.

**Checkpoint**: US4 verified. Historical metadata preserved, no data loss.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation across all stories.

- [x] T018 Search entire codebase for remaining references to `style_presets`, `StylePreset`, `style-presets`, `style_preset`, `preset_type`, `visual_style`, `layoutPresets`, `visualStylePresets` and fix any missed occurrences. Check: backend/, frontend/src/, and any config files.

- [x] T019 Run the quickstart.md verification checklist to confirm all items pass: (1) migration runs without errors, (2) `GET /image-generation/creative-concepts` returns flat concept list, (3) `POST /image-generation/batch` accepts `creative_concept` slug, (4) bootstrap returns `creative_concepts`, (5) frontend shows single concept grid, (6) selecting concept + generating works, (7) concept text prepended to prompt, (8) no `style_presets` references remain, (9) existing documents display correctly.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (migration must be written first for reference)
- **Phase 3 (US1+US2)**: Depends on Phase 2 (model + schema must be ready)
- **Phase 4 (US3)**: Depends on Phase 3 (batch generation logic must exist to extend)
- **Phase 5 (US4)**: Can run in parallel with Phase 4 (verification only, no code changes)
- **Phase 6 (Polish)**: Depends on Phases 3, 4, 5 completion

### Within Phase 3 (US1+US2)

```
T004 (endpoint rename) ──┐
T005 (batch logic)    ────┤── Sequential (same file: image_generation.py)
                          │
T006 (bootstrap)      ────┤── [P] Parallel (different file: projects.py)
T007 (thumbnails)     ────┤── [P] Parallel (different file: generate_preset_thumbnails.py)
T008 (types)          ────┤── [P] Parallel (different file: image-studio.ts)
T009 (supabase types) ────┘── [P] Parallel (different file: supabase.ts)

Then sequential (depends on types + components):
T010 (ConceptCard)    → T011 (ConceptGrid) → T012 (exports) → T013 (CreateMode) → T014 (hook) → T015 (page)
```

### Parallel Opportunities

```bash
# After T003 completes, launch these in parallel:
T004+T005  # image_generation.py (sequential within, same file)
T006       # projects.py
T007       # generate_preset_thumbnails.py
T008       # image-studio.ts
T009       # supabase.ts

# After T008+T009 complete, launch component renames:
T010       # ConceptCard.tsx
T011       # ConceptGrid.tsx (depends on T010 for import)

# Then sequential UI integration:
T012 → T013 → T014 → T015
```

---

## Implementation Strategy

### MVP First (Phase 1-3: US1 + US2)

1. Complete Phase 1: Database migration SQL
2. Complete Phase 2: Backend model + schema
3. Complete Phase 3: Routers + frontend
4. **STOP and VALIDATE**: Single concept grid visible, generation works, no visual styles
5. This is a fully functional MVP

### Incremental Delivery

1. Phase 1-3 → MVP with static concepts (prompt_modifier only)
2. Phase 4 → Add template variable intelligence (prompt_template)
3. Phase 5 → Verify backward compatibility
4. Phase 6 → Final cleanup and validation

---

## Notes

- [P] tasks = different files, no dependencies
- US1 and US2 are combined because they modify the exact same files (removing visual styles IS the same migration as adding concepts)
- US3 (template variables) is additive - it extends the batch generation logic without changing the core concept system
- US4 is verification-only - the migration preserves data by design (JSONB metadata has no FKs)
- Total: 19 tasks across 6 phases
- The migration SQL (T001) should be written first but applied LAST (after all code changes are ready, to avoid runtime errors)
