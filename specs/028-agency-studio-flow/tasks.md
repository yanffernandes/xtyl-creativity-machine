# Tasks: Agency-Scale Studio Flow + Brush Selection

**Feature**: 028-agency-studio-flow
**Branch**: `028-image-architecture-refactor`
**Date**: 2025-01-14
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Summary

8 User Stories | 54 Tasks | Estimated parallel opportunities: 12 groups

## Phase 1: Setup

> Project initialization and shared infrastructure

- [x] T001 Create database migration in backend/migrations/031_agency_studio.sql
- [x] T002 [P] Add CopyLibraryItem model in backend/models.py
- [x] T003 [P] Add CampaignPackage model in backend/models.py
- [x] T004 [P] Add ImageMask model in backend/models.py
- [x] T005 [P] Extend Document model with campaign_id, tags, channel, version_history, current_version in backend/models.py
- [x] T006 Add Pydantic schemas for CopyLibraryItem in backend/schemas.py
- [x] T007 [P] Add Pydantic schemas for CampaignPackage in backend/schemas.py
- [x] T008 [P] Add Pydantic schemas for ImageMask in backend/schemas.py
- [x] T009 [P] Add Pydantic schemas for DocumentVersion in backend/schemas.py
- [x] T010 Create TypeScript types for agency-studio in frontend/src/types/agency-studio.ts

## Phase 2: Foundational

> Blocking prerequisites for all user stories

- [x]T011 Run migration 031_agency_studio.sql and verify tables created
- [x] T012 Add RLS policies for copy_library_items, campaign_packages, image_masks tables
- [x] T013 Register new routers in backend/main.py (copies, campaigns)

---

## Phase 3: US-01 - Gerar imagens a partir de copies do Kanban

> **Goal**: Select multiple copies in Kanban and generate images in batch
> **Independent Test**: Select 3 copies in Kanban, click "Gerar Imagens", verify Studio opens with copies queued

- [x] T014 [US1] Create KanbanMultiSelect.tsx component in frontend/src/components/kanban/
- [x] T015 [US1] Add multi-select state to Kanban view (Shift+click, Ctrl+click)
- [x] T016 [US1] Add "Gerar Imagens" floating action button when multiple cards selected
- [x] T017 [US1] Create BatchCopyQueue.tsx component in frontend/src/components/image-studio/
- [x] T018 [US1] Modify Studio page to accept copies array from query params or state
- [x] T019 [US1] Implement batch generation loop: iterate copies, call generate-batch for each
- [x] T020 [US1] Display batch status per copy in BatchCopyQueue (pending, generating, complete, error)
- [x] T021 [US1] Link generated images to original document via result metadata

---

## Phase 4: US-02 - Biblioteca de copy reutilizavel

> **Goal**: Save copies to a workspace-level library for reuse
> **Independent Test**: Create copy in library, verify it appears in list, use "Usar como Prompt"

- [x] T022 [P] [US2] Create copies router in backend/routers/copies.py
- [x] T023 [US2] Implement GET /workspaces/{workspace_id}/copies endpoint
- [x] T024 [US2] Implement POST /workspaces/{workspace_id}/copies endpoint
- [x] T025 [P] [US2] Implement PUT /workspaces/{workspace_id}/copies/{copy_id} endpoint
- [x] T026 [P] [US2] Implement DELETE /workspaces/{workspace_id}/copies/{copy_id} endpoint
- [x] T027 [US2] Create useCopyLibrary hook in frontend/src/hooks/useCopyLibrary.ts
- [x] T028 [US2] Create CopyLibraryDrawer.tsx component in frontend/src/components/copy-library/
- [x] T029 [US2] Create CopyLibraryCard.tsx component in frontend/src/components/copy-library/
- [x] T030 [US2] Add "Usar como Prompt" action to copy card (populates Studio prompt)
- [x] T031 [US2] Add "Adicionar à Biblioteca" action to document context menu

---

## Phase 5: US-03 - Contexto visual manual aplicado no batch

> **Goal**: Apply selected visual assets to batch generation
> **Independent Test**: Select assets in Visual Context, generate batch, verify assets influence output

- [x] T032 [US3] Extend ImageBatchRequest schema with reference_assets[], asset_mode in backend/schemas.py
- [x] T033 [US3] Modify generate_image_batch to fetch and include reference assets in prompt
- [x] T034 [US3] Add asset selection UI to Studio (reuse VisualContextSelector)
- [x] T035 [US3] Pass selected assets to generateImageBatch API call
- [x] T036 [US3] Log which assets were used in batch metadata

---

## Phase 6: US-04 - Enriquecimento de prompt no batch

> **Goal**: Apply brand context (colors, typography, voice) to batch prompts
> **Independent Test**: Enable brand context, generate batch, verify enriched prompt in logs

- [x] T037 [US4] Add apply_brand_context boolean to ImageBatchRequest schema
- [x] T038 [US4] Integrate prompt enrichment service in batch generation flow
- [x] T039 [US4] Add toggle "Aplicar Brand Context" in Studio UI
- [x] T040 [US4] Log whether brand context was applied in batch metadata

---

## Phase 7: US-05 - Pacotes de campanha

> **Goal**: Group copies and images by campaign/channel
> **Independent Test**: Create campaign, associate document, filter by campaign

- [x] T041 [P] [US5] Create campaigns router in backend/routers/campaigns.py
- [x] T042 [US5] Implement GET /projects/{project_id}/campaigns endpoint
- [x] T043 [US5] Implement POST /projects/{project_id}/campaigns endpoint
- [x] T044 [P] [US5] Implement PUT /projects/{project_id}/campaigns/{campaign_id} endpoint
- [x] T045 [P] [US5] Implement DELETE /projects/{project_id}/campaigns/{campaign_id} endpoint
- [x] T046 [US5] Create useCampaigns hook in frontend/src/hooks/useCampaigns.ts
- [x] T047 [US5] Create CampaignPicker.tsx component in frontend/src/components/campaigns/
- [x] T048 [US5] Create CampaignManager.tsx component in frontend/src/components/campaigns/
- [x] T049 [US5] Add campaign_id to ImageBatchRequest and link generated docs to campaign
- [x] T050 [US5] Add campaign filter to document gallery/list view

---

## Phase 8: US-06 - Metadados e filtros

> **Goal**: Add tags and channel metadata to documents for filtering
> **Independent Test**: Add tags to document, filter by tag, verify results

- [x] T051 [US6] Add tags and channel fields to document update endpoint
- [x] T052 [US6] Create TagInput.tsx component for editing document tags
- [x] T053 [US6] Add tags display to document cards in gallery
- [x] T054 [US6] Implement tag filter in document list/gallery
- [x] T055 [US6] Implement channel filter in document list/gallery

---

## Phase 9: US-07 - Versionamento basico

> **Goal**: Track document edit history and allow restore
> **Independent Test**: Edit document twice, view 2 versions in history, restore first version

- [x] T056 [US7] Implement version history FIFO logic in document update service
- [x] T057 [US7] Implement GET /documents/{document_id}/versions endpoint
- [x] T058 [US7] Implement POST /documents/{document_id}/versions/{version}/restore endpoint
- [x] T059 [US7] Create useDocumentVersions hook in frontend/src/hooks/useDocumentVersions.ts
- [x] T060 [US7] Create VersionHistoryPanel.tsx component in frontend/src/components/document/
- [x] T061 [US7] Add "Ver Histórico" action to document editor

---

## Phase 10: US-08 - Pincel de seleção para refinamento

> **Goal**: Use brush to mask region and refine with inpainting
> **Independent Test**: Draw mask on image, enter prompt, generate refined image with only masked area changed

- [x]T062 [US8] Create inpainting_service.py in backend/services/
- [x]T063 [US8] Implement POST /image-generation/refine-with-mask endpoint
- [x]T064 [US8] Upload mask PNG to R2 and store in image_masks table
- [x]T065 [US8] Create useBrushCanvas hook in frontend/src/hooks/useBrushCanvas.ts
- [x]T066 [US8] Create BrushCanvas.tsx component in frontend/src/components/image-studio/
- [x]T067 [US8] Create BrushToolbar.tsx component (brush size, clear, undo)
- [x]T068 [US8] Add "Refinar com Pincel" action to VariationCard
- [x]T069 [US8] Export mask as base64 PNG and call refine-with-mask API
- [x]T070 [US8] Display refined result linked to original image

---

## Phase 11: Polish & Cross-Cutting

> Final polish, error handling, and integration validation

- [x] T071 Add loading states and error toasts for all new API calls
- [x] T072 Add i18n translations for new UI strings (pt-BR, en) [pt-BR inline, consistent with codebase]
- [x] T073 Validate all new endpoints return proper error responses (400, 404, 500)
- [x] T074 Add keyboard shortcuts: Escape to cancel multi-select, Enter to confirm

---

## Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational)
    │
    ├──────────────────────────────────────────────────────────────┐
    │                                                               │
    ▼                                                               ▼
Phase 3 (US-01: Kanban→Studio)                    Phase 4 (US-02: Copy Library)
    │                                                               │
    │                                                               ▼
    │                                               Phase 7 (US-05: Campaigns)
    │                                                               │
    ▼                                                               ▼
Phase 5 (US-03: Visual Context)                   Phase 8 (US-06: Tags/Filters)
    │
    ▼
Phase 6 (US-04: Brand Context)
    │
    ▼
Phase 9 (US-07: Versioning) ──────────────────────────────────────┐
                                                                   │
                                                                   ▼
                                                   Phase 10 (US-08: Brush/Mask)
                                                                   │
                                                                   ▼
                                                   Phase 11 (Polish)
```

## Parallel Execution Opportunities

| Group | Tasks | Description |
|-------|-------|-------------|
| Setup Models | T002, T003, T004, T005 | All models can be added in parallel |
| Setup Schemas | T006, T007, T008, T009 | All schemas can be added in parallel |
| US2 CRUD | T022, T025, T026 | Independent CRUD endpoints |
| US5 CRUD | T041, T044, T045 | Independent CRUD endpoints |

## MVP Scope Recommendation

**MVP (First Increment)**: Phase 1-4 (US-01 + US-02)
- Enables core agency workflow: select copies → generate batch → save to library
- Delivers value immediately without all 8 user stories

**Increment 2**: Phase 5-6 (US-03 + US-04)
- Adds brand consistency: visual assets + brand context in batch

**Increment 3**: Phase 7-8 (US-05 + US-06)
- Organization features: campaigns, tags, filters

**Increment 4**: Phase 9-10 (US-07 + US-08)
- Advanced features: versioning, brush/mask refinement

---

## Validation Checklist

- [x] All tasks have checkbox, ID, and file path
- [x] User story tasks have [USn] label
- [x] Parallelizable tasks have [P] marker
- [x] Each phase has clear goal and independent test criteria
- [x] Dependencies section shows story completion order
- [x] MVP scope defined (Phases 1-4)
