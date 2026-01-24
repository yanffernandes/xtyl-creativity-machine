# Implementation Plan: Image Studio Evolution - fal.ai Migration

**Branch**: `029-fal-ai-migration` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-fal-ai-migration/spec.md`

## Summary

Migrate image generation from OpenRouter to fal.ai to enable advanced editing capabilities (inpainting with masks, natural language editing), add utility functions (remove background, upscale, enhance), and prepare architecture for future video generation. OpenRouter remains for LLM/text operations.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, httpx, tenacity (Backend); Next.js 14, React 18, Shadcn/UI, HTML5 Canvas API (Frontend)
**Storage**: Supabase PostgreSQL + Cloudflare R2 (images/masks)
**Testing**: pytest, pytest-asyncio (Backend); Vitest, Playwright (Frontend)
**Target Platform**: Web application (Docker deployment)
**Project Type**: Web (frontend + backend)
**Performance Goals**: Canvas brush 60fps (<16ms), generation latency ≤ OpenRouter baseline, upscale <30s, remove-bg <10s
**Constraints**: fal.ai API rate limits, mask PNG format requirements, image size limits per model
**Scale/Scope**: Single provider integration, ~5 new endpoints, 1 new UI component (BrushCanvas), 4 tabs restructure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. AI-First Development** | ✅ PASS | fal.ai integration enhances AI capabilities; streaming not required for image ops |
| **II. API-First Architecture** | ✅ PASS | New endpoints follow REST patterns with Pydantic schemas |
| **III. User Experience Excellence** | ✅ PASS | Premium brush tool, elegant loading states, progressive disclosure (tabs) |
| **IV. Production-Ready Deployments** | ✅ PASS | FAL_API_KEY via env var, health checks maintained |
| **V. Data Integrity & Security** | ✅ PASS | API key in env, image validation, no secrets in code |
| **VI. Scalability & Performance** | ✅ PASS | Async operations, caching, retry with backoff |
| **VII. Testing & Quality Assurance** | ✅ PASS | Integration tests planned, TypeScript types defined |
| **Technology Stack** | ✅ PASS | Uses approved stack (FastAPI, Next.js, Shadcn/UI) |
| **External Services** | ✅ PASS | fal.ai is new but complementary to OpenRouter (not replacement for LLM) |

**Pre-Design Gate**: PASSED - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/029-fal-ai-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output - API research and decisions
├── data-model.md        # Phase 1 output - Database schemas
├── quickstart.md        # Phase 1 output - Quick implementation guide
├── contracts/           # Phase 1 output - OpenAPI schemas
│   └── image-operations.yaml
└── checklists/
    └── requirements.md  # Requirements checklist
```

### Source Code (repository root)

```text
backend/
├── services/
│   └── fal_ai_service.py     # NEW: fal.ai API client
├── routers/
│   └── image_generation.py   # MODIFY: Add new endpoints
├── schemas.py                # MODIFY: Add new Pydantic schemas
├── models.py                 # MODIFY: Add image_operations table
└── migrations/
    └── 032_add_fal_ai_support.sql  # NEW: Database migration

frontend/
├── src/
│   ├── components/
│   │   └── image-studio/
│   │       ├── ImageStudio.tsx       # MODIFY: Add tab structure
│   │       ├── BrushCanvas.tsx       # NEW: Mask drawing component
│   │       ├── BrushToolbar.tsx      # NEW: Brush controls
│   │       ├── QuickActionsBar.tsx   # NEW: Utility buttons
│   │       ├── EditMode.tsx          # NEW: Edit tab content
│   │       └── AdjustMode.tsx        # NEW: Adjust tab content
│   ├── hooks/
│   │   ├── useImageStudio.ts         # MODIFY: Add new methods
│   │   └── useBrushCanvas.ts         # NEW: Canvas state management
│   └── lib/
│       └── api.ts                    # MODIFY: Add new API functions
└── tests/
    └── image-studio/
        └── brush-canvas.test.tsx     # NEW: Canvas tests
```

**Structure Decision**: Web application structure (Option 2) - existing backend/frontend separation maintained. New files follow established patterns.

## Complexity Tracking

> No violations to justify - all requirements align with constitution.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

---

## Phase 0: Research Findings

See [research.md](./research.md) for detailed findings.

### Key Decisions

| Decision | Rationale | Alternatives Rejected |
|----------|-----------|----------------------|
| fal.ai as sole image provider | Unified API, best pricing, all features needed | Replicate (slower, more expensive), direct APIs (multiple integrations) |
| FLUX Fill Pro for inpainting | State-of-the-art quality, pixel-perfect masks | GPT Image (soft masks), Qwen (lower quality) |
| FLUX Kontext for text editing | 8x faster than GPT Image, good quality | GPT Image 1.5 (slower but more consistent) |
| Bria RMBG 2.0 for background removal | Enterprise-safe, best quality, fast | ESRGAN variants (lower quality) |
| Clarity Upscaler as default | Good balance quality/price | Topaz (expensive), ESRGAN (basic) |
| HTML5 Canvas for brush | Native, performant, no dependencies | Fabric.js (overkill), Konva (extra dependency) |

---

## Phase 1: Design Artifacts

### 1.1 Data Model

See [data-model.md](./data-model.md) for complete schemas.

**New Tables:**
- `image_operations` - Tracks all edit/utility operations
- `fal_model_configs` - Model configuration and pricing

**Modified Tables:**
- `documents` - Add `processing_status`, `source_operation_id`

### 1.2 API Contracts

See [contracts/image-operations.yaml](./contracts/image-operations.yaml) for OpenAPI spec.

**New Endpoints:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/image-generation/inpaint` | POST | Mask-based inpainting |
| `/image-generation/edit` | POST | Natural language editing |
| `/image-generation/remove-background` | POST | Background removal |
| `/image-generation/upscale` | POST | Image upscaling |
| `/image-generation/enhance` | POST | Image enhancement |

### 1.3 Component Architecture

```
ImageStudio (container)
├── TabNavigation
│   ├── CreateTab (existing, modified)
│   ├── EditTab (new)
│   │   ├── ImageSelector
│   │   ├── ModeToggle (brush/instruction)
│   │   ├── BrushCanvas (when brush mode)
│   │   │   └── BrushToolbar
│   │   └── InstructionInput (when instruction mode)
│   ├── AdjustTab (new)
│   │   └── QuickActionsGrid
│   └── VideoTab (placeholder)
├── PreviewArea
├── PromptInput
├── VariationGrid
└── AdvancedSettings
```

### 1.4 Quickstart

See [quickstart.md](./quickstart.md) for implementation guide.

---

## Phase 2: Implementation Tasks

> Generated by `/speckit.tasks` command - NOT part of this plan.

See [tasks.md](./tasks.md) (to be generated).

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| fal.ai downtime | Low | High | Circuit breaker, graceful degradation |
| Quality regression vs OpenRouter | Medium | High | A/B testing before full rollout |
| Brush canvas performance | Medium | Medium | RequestAnimationFrame, throttling |
| Cost overruns | Low | Medium | Spending alerts, usage monitoring |
| Breaking changes in fal.ai API | Low | High | Version pinning, contract tests |

---

## Post-Design Constitution Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| **III. User Experience Excellence** | ✅ PASS | Premium brush tool with 60fps target, elegant tabs, proper loading states |
| **VI. Scalability & Performance** | ✅ PASS | Async fal.ai calls, retry logic, caching |
| **VII. Testing & Quality Assurance** | ✅ PASS | Canvas tests, API integration tests planned |

**Post-Design Gate**: PASSED - Design aligns with constitution principles.
