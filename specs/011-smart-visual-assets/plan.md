# Implementation Plan: Smart Visual Assets

**Branch**: `011-smart-visual-assets` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-smart-visual-assets/spec.md`

## Summary

Implement automatic AI-powered classification of visual assets on upload (category + tags) and intelligent visual context configuration for the AI assistant. The feature expands the existing reference_assets system with new metadata fields (category, tags, ai_description) and adds configuration UI for selecting which assets are automatically included in image generation requests.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI
**Storage**: Supabase PostgreSQL (extends existing Project/Document models), Cloudflare R2
**Testing**: pytest (backend), manual testing (frontend)
**Target Platform**: Web application (Linux server backend, browser frontend)
**Project Type**: Web (frontend + backend)
**Performance Goals**: Image analysis ≤5 seconds, UI interactions instant
**Constraints**: Max 100 assets per project, max 5 assets per generation, max 10MB per image, 30-day usage history retention
**Scale/Scope**: Per-project settings, existing user base

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ PASS | Uses existing vision_service for AI classification, integrates with AI image generation |
| II. API-First Architecture | ✅ PASS | Backend endpoints for classification, settings CRUD; frontend consumes APIs |
| III. User Experience Excellence | ✅ PASS | Premium UI with glassmorphism, immediate feedback, graceful error handling |
| IV. Production-Ready Deployments | ✅ PASS | Uses existing Docker infrastructure, no new services |
| V. Data Integrity & Security | ✅ PASS | Extends existing models, user-scoped data, file validation |
| VI. Scalability & Performance | ✅ PASS | Async image analysis, configurable limits (100 assets, 5 per gen) |
| VII. Testing & Quality Assurance | ✅ PASS | Type safety maintained, error handling for AI failures |

**Gate Result**: PASSED - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/011-smart-visual-assets/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contracts.yaml
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   └── visual_assets.py       # New: Asset classification & settings endpoints
├── models.py                   # Extended: ReferenceAsset, new settings tables
├── schemas.py                  # Extended: Asset classification schemas
├── vision_service.py           # Existing: Used for image analysis
├── visual_asset_service.py     # New: Classification & rotation logic
└── migrations/
    └── 015_add_visual_asset_fields.sql  # New DB fields

frontend/
├── src/
│   ├── app/workspace/[id]/project/[projectId]/assets/
│   │   └── page.tsx            # Enhanced: Upload with classification UI
│   ├── components/
│   │   ├── visual-assets/
│   │   │   ├── AssetUploadModal.tsx      # New: Upload with AI classification
│   │   │   ├── AssetClassificationCard.tsx # New: Classification preview/edit
│   │   │   └── VisualContextSettings.tsx  # New: Assistant settings panel
│   │   └── chat/
│   │       └── ImageGenerationModal.tsx   # Enhanced: Pre-selected assets
│   └── lib/
│       └── api.ts              # Extended: New endpoints
└── tests/
```

**Structure Decision**: Web application structure following existing patterns. Backend adds new router and service, extends existing models. Frontend adds new components in visual-assets folder, enhances existing modals.
