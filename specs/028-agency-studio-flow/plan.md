# Implementation Plan: Agency-Scale Studio Flow + Brush Selection

**Branch**: `028-image-architecture-refactor` | **Date**: 2025-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/028-agency-studio-flow/spec.md`

## Summary

Expand the Visual Generation Studio for agency-scale production by connecting the Kanban (copies) to batch image generation, creating a reusable copy library at workspace level, applying manual visual context to batches, adding campaign packages for organization, and implementing brush/mask selection for localized image refinement using Gemini 3 Pro inpainting capabilities.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, React Query, Canvas API (brush)
**Storage**: PostgreSQL (Supabase) with pgvector, Cloudflare R2 (images, masks)
**Testing**: pytest (backend), Vitest (frontend)
**Target Platform**: Web application (desktop-first, responsive)
**Project Type**: Web (frontend + backend)
**Performance Goals**: No SLA defined; metrics logged for analysis
**Constraints**: Max 20 copies per batch, 10 versions per document (FIFO), OpenRouter-first for inpainting
**Scale/Scope**: Agency users producing campaigns at scale (10-20 copies/batch typical)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ PASS | Batch generation, inpainting are core AI features with streaming SSE |
| II. API-First Architecture | ✅ PASS | REST APIs for library, campaigns, batch; OpenAPI documented |
| III. User Experience Excellence | ✅ PASS | Progressive complexity (novice: single copy, expert: batch 20), premium brush UI |
| IV. Production-Ready Deployments | ✅ PASS | Uses existing Docker setup, no new services |
| V. Data Integrity & Security | ✅ PASS | Workspace-scoped library, project-scoped campaigns, auth required |
| VI. Scalability & Performance | ✅ PASS | Async batch processing, SSE streaming, R2 for masks |
| VII. Testing & Quality Assurance | ⚠️ TODO | Integration tests needed for batch flow |

**Gate Status**: ✅ PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/028-agency-studio-flow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   ├── image_generation.py  # Extend: batch with assets, refine with mask
│   ├── copies.py            # NEW: Copy library CRUD
│   └── campaigns.py         # NEW: Campaign packages CRUD
├── models.py                # Add: CopyLibraryItem, CampaignPackage, DocumentVersion, ImageMask
├── schemas.py               # Add: Pydantic schemas for new models
├── services/
│   └── inpainting_service.py # NEW: Mask processing, Gemini inpainting
└── migrations/
    └── 031_agency_studio.sql # NEW: Tables for library, campaigns, versions, masks

frontend/
├── src/
│   ├── components/
│   │   ├── kanban/
│   │   │   └── KanbanMultiSelect.tsx    # NEW: Multi-select overlay
│   │   ├── image-studio/
│   │   │   ├── BrushCanvas.tsx          # NEW: Canvas for mask drawing
│   │   │   ├── BrushToolbar.tsx         # NEW: Brush size, clear, undo
│   │   │   └── BatchCopyQueue.tsx       # NEW: Copy queue from Kanban
│   │   ├── copy-library/
│   │   │   ├── CopyLibraryDrawer.tsx    # NEW: Library browser
│   │   │   └── CopyLibraryCard.tsx      # NEW: Individual copy card
│   │   └── campaigns/
│   │       ├── CampaignPicker.tsx       # NEW: Campaign selector
│   │       └── CampaignManager.tsx      # NEW: Campaign CRUD UI
│   ├── hooks/
│   │   ├── useCopyLibrary.ts            # NEW: Library operations
│   │   ├── useCampaigns.ts              # NEW: Campaign operations
│   │   ├── useBrushCanvas.ts            # NEW: Brush state and mask export
│   │   └── useDocumentVersions.ts       # NEW: Version history
│   └── types/
│       └── agency-studio.ts             # NEW: TypeScript types
└── tests/
```

**Structure Decision**: Extends existing web application structure. New routers for copies and campaigns. Brush functionality uses HTML5 Canvas API in a dedicated component.

## Complexity Tracking

> No constitution violations to justify.

| Area | Complexity | Justification |
|------|------------|---------------|
| Brush/Mask UI | Medium | Canvas API is standard; mask exported as PNG base64 |
| Multi-select Kanban | Low | Checkbox overlay on existing cards |
| Copy Library | Low | Standard CRUD with workspace scope |
| Campaigns | Low | Standard CRUD with project scope |
| Versioning | Medium | JSONB array with FIFO limit logic |

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | [research.md](./research.md) | Technical decisions and rationale |
| Data Model | [data-model.md](./data-model.md) | Entity definitions and migrations |
| API Contracts | [contracts/api.yaml](./contracts/api.yaml) | OpenAPI 3.0 specification |
| Quickstart | [quickstart.md](./quickstart.md) | Test scenarios and curl examples |

## Next Steps

Run `/speckit.tasks` to generate the implementation task list based on this plan.
