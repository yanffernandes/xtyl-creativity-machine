# Implementation Tasks: Image Studio Evolution - fal.ai Migration

**Feature Branch**: `029-fal-ai-migration`
**Generated**: 2026-01-24
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Task Summary

| Priority | Story | Tasks | Status |
|----------|-------|-------|--------|
| P0 | US1: Mask/Brush Editing | 18 | Pending |
| P1 | US2: Natural Language Editing | 8 | Pending |
| P1 | US3: Quick Functions | 12 | Pending |
| P1 | US4: Improved Generation | 10 | Pending |
| P2 | US5: Video Preparation | 4 | Pending |
| - | Infrastructure | 14 | Pending |
| - | Testing | 12 | Pending |
| **Total** | | **78** | |

---

## Phase 0: Infrastructure (Blocking)

These tasks must be completed before any user story implementation.

### Database Migration

- [x] [INF-001] [P0] Create migration file `supabase/migrations/032_add_fal_ai_support.sql`
- [x] [INF-002] [P0] Create `image_operations` table with all columns and constraints
- [x] [INF-003] [P0] Create `fal_model_configs` table with model configuration schema
- [x] [INF-004] [P0] Add `processing_status` and `source_operation_id` columns to `documents` table
- [x] [INF-005] [P0] Create indexes for image_operations (document_id, project_id, user_id, status)
- [x] [INF-006] [P0] Seed initial fal.ai models into `fal_model_configs` table

### Backend Core Service

- [x] [INF-007] [P0] Create `backend/services/fal_ai_service.py` with FalAIService class
- [x] [INF-008] [P0] Implement fal.ai authentication with `FAL_API_KEY` environment variable
- [x] [INF-009] [P0] Implement `_make_request()` with retry logic (exponential backoff, 3 attempts)
- [x] [INF-010] [P0] Implement error handling with clear user-facing messages
- [x] [INF-011] [P0] Add logging for all fal.ai operations (request/response/errors)

### Configuration

- [x] [INF-012] [P0] Add `FAL_API_KEY` to `.env.example` with documentation
- [ ] [INF-013] [P0] Add fal.ai configuration section to `backend/config.py`
- [ ] [INF-014] [P0] Update `docker-compose.yml` with FAL_API_KEY environment variable

---

## US1: Mask/Brush Editing (P0) - Primary Migration Goal

The core functionality that motivated the migration - pixel-perfect inpainting with user-drawn masks.

### Backend - Inpaint Endpoint

- [x] [US1-001] [P0] Create `InpaintRequest` schema in `backend/schemas.py`
  - Fields: image_url, mask_url, prompt, project_id, model, guidance_scale, num_inference_steps
- [x] [US1-002] [P0] Create `InpaintResponse` schema in `backend/schemas.py`
- [x] [US1-003] [P0] Add `inpaint()` method to FalAIService calling `fal-ai/flux-pro/v1/fill`
- [x] [US1-004] [P0] Create `POST /image-generation/inpaint` endpoint in `backend/routers/image_generation.py`
- [x] [US1-005] [P0] Validate mask format (PNG with dimensions matching input image)
- [x] [US1-006] [P0] Save operation to `image_operations` table with status tracking
- [x] [US1-007] [P0] Create output document and return with file_url and thumbnail_url

### Frontend - Brush Canvas Component

- [x] [US1-008] [P0] Create `frontend/src/components/image-studio/BrushCanvas.tsx`
  - HTML5 Canvas with image as background
  - Drawing overlay for mask creation
- [x] [US1-009] [P0] Implement mouse/touch drawing with pointer events
- [x] [US1-010] [P0] Implement brush size adjustment (5-50px via slider)
- [x] [US1-011] [P0] Implement eraser mode (toggle brush/eraser)
- [x] [US1-012] [P0] Implement undo (Ctrl+Z) with history stack (max 20 states)
- [x] [US1-013] [P0] Implement redo (Ctrl+Y)
- [x] [US1-014] [P0] Implement clear all (reset mask)
- [x] [US1-015] [P0] Implement `exportMask()` returning PNG with white/black color scheme
- [x] [US1-016] [P0] Ensure 60fps performance (<16ms per frame) using requestAnimationFrame

### Frontend - Brush Toolbar

- [x] [US1-017] [P0] Create `frontend/src/components/image-studio/BrushToolbar.tsx`
  - Brush size slider
  - Brush/eraser toggle
  - Clear button
  - Undo/redo buttons
  - Brush size preview circle
- [x] [US1-018] [P0] Create `frontend/src/hooks/useBrushCanvas.ts` for state management

---

## US2: Natural Language Editing (P1)

Edit images using text instructions without explicit masks.

### Backend - Edit Endpoint

- [x] [US2-001] [P1] Create `EditRequest` schema in `backend/schemas.py`
  - Fields: image_url, prompt, project_id, model, preserve_elements, guidance_scale
- [x] [US2-002] [P1] Add `edit()` method to FalAIService calling `fal-ai/flux-pro/kontext`
- [x] [US2-003] [P1] Create `POST /image-generation/edit` endpoint in `backend/routers/image_generation.py`
- [x] [US2-004] [P1] Handle `preserve_elements` array for element preservation

### Frontend - Edit Mode

- [x] [US2-005] [P1] Create `frontend/src/components/image-studio/EditMode.tsx`
  - Image selector from project gallery
  - Mode toggle (brush vs instruction)
  - Instruction text input
- [x] [US2-006] [P1] Add instruction input field with example prompts
- [x] [US2-007] [P1] Implement before/after preview (side-by-side or slider)
- [x] [US2-008] [P1] Add `editImage()` function to `frontend/src/lib/api.ts`

---

## US3: Quick Functions (P1)

Utility functions for common image operations.

### Backend - Remove Background

- [x] [US3-001] [P1] Create `RemoveBackgroundRequest` schema in `backend/schemas.py`
- [x] [US3-002] [P1] Add `remove_background()` method to FalAIService calling `fal-ai/bria/background/remove`
- [x] [US3-003] [P1] Create `POST /image-generation/remove-background` endpoint
- [x] [US3-004] [P1] Ensure output is PNG with alpha channel transparency

### Backend - Upscale

- [x] [US3-005] [P1] Create `UpscaleRequest` schema in `backend/schemas.py`
  - Fields: image_url, project_id, scale_factor (2 or 4), model
- [x] [US3-006] [P1] Add `upscale()` method to FalAIService calling `fal-ai/clarity-upscaler`
- [x] [US3-007] [P1] Create `POST /image-generation/upscale` endpoint

### Backend - Enhance

- [x] [US3-008] [P1] Create `EnhanceRequest` schema in `backend/schemas.py`
  - Fields: image_url, project_id, enhancement_type (auto/faces/details/colors)
- [x] [US3-009] [P1] Add `enhance()` method to FalAIService
- [x] [US3-010] [P1] Create `POST /image-generation/enhance` endpoint

### Frontend - Quick Actions Bar

- [x] [US3-011] [P1] Create `frontend/src/components/image-studio/QuickActionsBar.tsx`
  - Buttons: Remove BG, Upscale 2x, Enhance, Download
  - Individual loading states per action
  - Tooltips with descriptions
- [x] [US3-012] [P1] Add API functions to `frontend/src/lib/api.ts`:
  - `removeBackground()`
  - `upscaleImage()`
  - `enhanceImage()`

---

## US4: Improved Generation (P1)

Migrate image generation from OpenRouter to fal.ai.

### Backend - Generation Migration

- [ ] [US4-001] [P1] Add `generate_image()` method to FalAIService
- [ ] [US4-002] [P1] Update existing `/image-generation/generate` endpoint to use FalAIService
- [ ] [US4-003] [P1] Update `/image-generation/refine` endpoint to use FalAIService
- [ ] [US4-004] [P1] Update batch generation to use FalAIService
- [ ] [US4-005] [P1] Maintain SSE streaming for progress updates
- [ ] [US4-006] [P1] Add `provider: "fal.ai"` to generation metadata

### Backend - Model Management

- [ ] [US4-007] [P1] Create `GET /image-generation/models` endpoint returning fal.ai models
- [ ] [US4-008] [P1] Filter models by category (generation, editing, utility, video)
- [ ] [US4-009] [P1] Cache model list with 1-hour TTL

### Frontend - Model Selector

- [ ] [US4-010] [P1] Update model selector to group by category and show pricing

---

## US5: Video Preparation (P2)

Prepare architecture for future video generation without implementation.

### Frontend - Video Tab Placeholder

- [ ] [US5-001] [P2] Add "Vídeo" tab to ImageStudio (disabled state)
- [ ] [US5-002] [P2] Create placeholder content with "Em breve" message
- [ ] [US5-003] [P2] Add video category to fal_model_configs seed data

### Backend - Video Preparation

- [ ] [US5-004] [P2] Add video models to fal_model_configs (Veo 3.1, Kling 2.6, LTX-2)

---

## UI Structure (P0)

Tab-based restructure of Image Studio.

### Frontend - Tab Navigation

- [ ] [UI-001] [P0] Refactor `frontend/src/components/image-studio/ImageStudio.tsx` with tab navigation
  - Tabs: Criar (default), Editar, Ajustar, Vídeo
- [ ] [UI-002] [P0] Create `frontend/src/components/image-studio/CreateMode.tsx` (extract existing)
- [x] [UI-003] [P0] Create `frontend/src/components/image-studio/AdjustMode.tsx`
  - Grid of quick functions
  - Before/after preview
- [ ] [UI-004] [P0] Maintain state between tab switches (selected image, mask, etc.)

### Frontend - Hook Updates

- [ ] [UI-005] [P0] Update `frontend/src/hooks/useImageStudio.ts`:
  - Add `currentOperation` state
  - Add `inpaint()` method
  - Add `edit()` method
  - Add `removeBg()` method
  - Add `upscale()` method
  - Add `enhance()` method
  - Per-operation loading states

---

## Testing (Blocking for Release)

### Backend Tests

- [ ] [TEST-001] Unit tests for `fal_ai_service.py` in `backend/tests/test_fal_ai_service.py`
  - Test authentication
  - Test retry logic
  - Test error handling
- [ ] [TEST-002] Integration test for `/inpaint` endpoint
- [ ] [TEST-003] Integration test for `/edit` endpoint
- [ ] [TEST-004] Integration test for `/remove-background` endpoint
- [ ] [TEST-005] Integration test for `/upscale` endpoint
- [ ] [TEST-006] Integration test for `/enhance` endpoint
- [ ] [TEST-007] Test error responses (400, 401, 402, 500)
- [ ] [TEST-008] Test retry behavior with mocked failures

### Frontend Tests

- [ ] [TEST-009] Component tests for BrushCanvas in `frontend/tests/image-studio/brush-canvas.test.tsx`
  - Drawing functionality
  - Undo/redo
  - Mask export
- [ ] [TEST-010] Test mask export format (PNG with correct colors)
- [ ] [TEST-011] Test API integration with MSW mocks
- [ ] [TEST-012] Test loading states and error handling

---

## Documentation & Cleanup

### Documentation

- [ ] [DOC-001] Update CLAUDE.md with fal.ai service information
- [ ] [DOC-002] Add API documentation for new endpoints
- [ ] [DOC-003] Create troubleshooting guide for common fal.ai errors

### Cleanup

- [ ] [CLN-001] Remove OpenRouter image generation code after migration verified
- [ ] [CLN-002] Remove unused image model fallback logic
- [ ] [CLN-003] Clean up unused imports in modified files

---

## Dependency Graph

```
Phase 0: Infrastructure
    INF-001 → INF-002 → INF-003 → INF-004 → INF-005 → INF-006
    INF-007 → INF-008 → INF-009 → INF-010 → INF-011
    INF-012, INF-013, INF-014 (parallel)

US1: Mask/Brush (depends on Phase 0)
    Backend: US1-001 → US1-002 → US1-003 → US1-004 → US1-005 → US1-006 → US1-007
    Frontend: US1-008 → US1-009 → US1-010/US1-011/US1-012/US1-013 (parallel) → US1-014 → US1-015 → US1-016
    US1-017 → US1-018

UI Structure (depends on Phase 0, parallel with US1 backend)
    UI-001 → UI-002 → UI-003 → UI-004 → UI-005

US2: Natural Language (depends on Phase 0)
    Backend: US2-001 → US2-002 → US2-003 → US2-004
    Frontend: US2-005 → US2-006 → US2-007 → US2-008

US3: Quick Functions (depends on Phase 0)
    Remove BG: US3-001 → US3-002 → US3-003 → US3-004
    Upscale: US3-005 → US3-006 → US3-007
    Enhance: US3-008 → US3-009 → US3-010
    Frontend: US3-011 → US3-012 (after backend complete)

US4: Generation (depends on Phase 0)
    Backend: US4-001 → US4-002 → US4-003 → US4-004 → US4-005 → US4-006
    Models: US4-007 → US4-008 → US4-009
    Frontend: US4-010 (after models)

US5: Video Prep (can be done anytime)
    US5-001 → US5-002
    US5-003, US5-004 (parallel)

Testing (after implementation)
    Backend: TEST-001 → TEST-002..TEST-008 (parallel)
    Frontend: TEST-009 → TEST-010 → TEST-011 → TEST-012

Cleanup (after testing verified)
    CLN-001 → CLN-002 → CLN-003
```

---

## Implementation Order (Recommended)

1. **Week 1**: Infrastructure (INF-*) + Database Migration
2. **Week 2**: US1 Backend (Inpaint endpoint) + US4 (Generation migration)
3. **Week 3**: US1 Frontend (BrushCanvas, Toolbar) + UI Structure
4. **Week 4**: US2 (Natural Language Edit) + US3 (Quick Functions)
5. **Week 5**: Testing + US5 (Video Prep) + Documentation
6. **Week 6**: Cleanup + Final QA + Release

---

## Files Modified/Created Summary

### New Files

| File | Purpose |
|------|---------|
| `backend/services/fal_ai_service.py` | fal.ai API client |
| `supabase/migrations/032_add_fal_ai_support.sql` | Database migration |
| `frontend/src/components/image-studio/BrushCanvas.tsx` | Mask drawing canvas |
| `frontend/src/components/image-studio/BrushToolbar.tsx` | Brush controls |
| `frontend/src/components/image-studio/QuickActionsBar.tsx` | Utility buttons |
| `frontend/src/components/image-studio/EditMode.tsx` | Edit tab content |
| `frontend/src/components/image-studio/AdjustMode.tsx` | Adjust tab content |
| `frontend/src/components/image-studio/CreateMode.tsx` | Extract existing |
| `frontend/src/hooks/useBrushCanvas.ts` | Canvas state management |
| `backend/tests/test_fal_ai_service.py` | Service unit tests |
| `frontend/tests/image-studio/brush-canvas.test.tsx` | Canvas component tests |

### Modified Files

| File | Changes |
|------|---------|
| `backend/routers/image_generation.py` | Add 5 new endpoints |
| `backend/schemas.py` | Add new request/response schemas |
| `backend/models.py` | Add ImageOperation, FalModelConfig models |
| `frontend/src/components/image-studio/ImageStudio.tsx` | Add tab navigation |
| `frontend/src/hooks/useImageStudio.ts` | Add operation methods |
| `frontend/src/lib/api.ts` | Add new API functions |
| `.env.example` | Add FAL_API_KEY |
| `docker-compose.yml` | Add FAL_API_KEY env |
| `CLAUDE.md` | Document fal.ai integration |
