# Implementation Plan: Assistant Image Analysis & Refinement Tools

**Branch**: `023-assistant-image-tools` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-assistant-image-tools/spec.md`

## Summary

Add 4 new AI assistant tools for image operations: `list_document_images`, `analyze_image`, `analyze_document_images`, and `refine_image`. These tools enable users to interact with attached document images through natural language, including analysis (via vision API) and refinement (via image-to-image generation using existing `base_image_url` mechanism). Additionally, increase the default `max_iterations` from 15 to 25 for all users.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, OpenRouter API (vision + image generation), Next.js 14, React 18
**Storage**: Supabase PostgreSQL (existing tables: Document, DocumentAttachment, UserPreferences), Cloudflare R2 (images)
**Testing**: pytest (backend), Vitest (frontend)
**Target Platform**: Web application (Docker Compose deployment)
**Project Type**: web (frontend + backend)
**Performance Goals**: Image analysis < 10 seconds, refinement < 30 seconds
**Constraints**: Use existing vision_service.py and image_generation_service.py patterns
**Scale/Scope**: Adds 4 new tools to existing 17 tools in tools.py

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ PASS | Feature is core AI capability (vision analysis, image refinement) |
| II. API-First Architecture | ✅ PASS | Tools are backend functions exposed via existing chat API |
| III. User Experience Excellence | ✅ PASS | Natural language interface, streaming feedback for operations |
| IV. Production-Ready Deployments | ✅ PASS | No new services, uses existing Docker setup |
| V. Data Integrity & Security | ✅ PASS | Uses existing auth, file validation, storage patterns |
| VI. Scalability & Performance | ✅ PASS | Async operations, existing streaming patterns |
| VII. Testing & Quality Assurance | ✅ PASS | Will add tool-specific tests |

**Gate Result**: ✅ PASSED - No violations

## Project Structure

### Documentation (this feature)

```text
specs/023-assistant-image-tools/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── tool-definitions.yaml
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── tools.py                    # ADD: 4 new tool functions + definitions
├── vision_service.py           # REUSE: analyze_image_with_vision()
├── image_generation_service.py # REUSE: generate_and_store_image() with base_image_url
├── routers/chat.py             # MODIFY: system prompt to include attached images
├── schemas.py                  # MODIFY: max_iterations default 15→25
├── models.py                   # NO CHANGE: UserPreferences already has max_iterations
└── migrations/
    └── 024_update_max_iterations.sql  # ADD: migration to update existing users

frontend/
├── src/components/
│   └── ChatPanel.tsx           # MODIFY: display image thumbnails in tool results
└── src/lib/api.ts              # NO CHANGE: existing API client works
```

**Structure Decision**: Web application with backend tools extension. No new services or major architectural changes - extends existing tools.py pattern.

## Complexity Tracking

> No Constitution violations - table not needed.

## Phase 0: Research Summary

See [research.md](./research.md) for detailed findings.

### Key Decisions

1. **Vision API**: Use existing `vision_service.py` which already supports image analysis via OpenRouter
2. **Image Refinement**: Use existing `base_image_url` parameter in `generate_image_openrouter()` for image-to-image
3. **Tool Pattern**: Follow existing tool structure in `tools.py` (function + TOOL_DEFINITIONS entry + execute_tool case)
4. **Attachment Access**: Query `DocumentAttachment` table joined with `Document` to get image URLs

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](./data-model.md) for complete schema.

**Key Points**:
- No new tables needed
- Uses existing: `Document`, `DocumentAttachment`, `UserPreferences`
- Tool return types are dictionaries (not persisted entities)

### API Contracts

See [contracts/tool-definitions.yaml](./contracts/tool-definitions.yaml) for OpenAPI-style tool definitions.

**New Tools**:
1. `list_document_images(document_id)` → List of attached images with metadata
2. `analyze_image(image_id, prompt?)` → Vision analysis result
3. `analyze_document_images(document_id, prompt?)` → Batch analysis of all attached images
4. `refine_image(image_id, instructions, document_id?)` → New refined image document

### Quickstart

See [quickstart.md](./quickstart.md) for implementation guide.

## Dependencies

```text
Phase 1 artifacts:
├── research.md ─────────────┐
├── data-model.md ───────────┼── All required for /speckit.tasks
├── contracts/tool-definitions.yaml
└── quickstart.md ───────────┘
```

## Next Steps

1. Run `/speckit.tasks` to generate implementation tasks
2. Implement in order: tools.py → migration → chat.py context → frontend display
