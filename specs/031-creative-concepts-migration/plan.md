# Implementation Plan: Creative Concepts Migration

**Branch**: `031-creative-concepts-migration` | **Date**: 2026-02-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/031-creative-concepts-migration/spec.md`

## Summary

Migrate the `style_presets` table and all associated code to `creative_concepts`. This is a **rename + simplification** that removes the visual_style/layout type distinction, deletes the 8 visual style presets, retains the 12 layout presets as concepts, adds new Alvo Bot-inspired concept seed data, and introduces `prompt_template`/`template_variables` columns for dynamic template variable resolution. All backend models, schemas, routers, and frontend types, components, hooks are updated in a clean break (no legacy endpoints).

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic (Backend); Next.js 14, React 18, Shadcn/UI (Frontend)
**Storage**: Supabase PostgreSQL, Cloudflare R2 (thumbnails)
**Testing**: Manual verification (no automated test suite for this feature scope)
**Target Platform**: Web application (desktop + mobile responsive)
**Project Type**: Web (backend + frontend)
**Performance Goals**: Concept list loads in single request, < 5s total page load
**Constraints**: Clean break - no legacy endpoint support needed (internal API)
**Scale/Scope**: ~20-25 concept rows, 24 files affected across backend and frontend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | PASS | Creative concepts directly enhance AI image generation prompts |
| II. API-First Architecture | PASS | Clean REST endpoint rename, backend logic stays in services |
| III. User Experience Excellence | PASS | Simplifies UI from 2 categories to 1 flat list, premium card design preserved |
| IV. Production-Ready Deployments | PASS | Database migration is atomic and reversible |
| V. Data Integrity & Security | PASS | Historical generation_metadata preserved, no data loss |
| VI. Scalability & Performance | PASS | Single query for all concepts, no performance regression |
| VII. Testing & Quality Assurance | PASS | Type safety maintained, migration tested |
| Database Practices | PASS | Migration atomic and reversible, timestamps preserved |
| API Design | PASS | Clean endpoint with proper response schema |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/031-creative-concepts-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── creative-concepts-api.yaml
└── tasks.md             # Phase 2 output (speckit.tasks)
```

### Source Code (files to modify)

```text
backend/
├── models.py                              # StylePreset → CreativeConcept model
├── schemas.py                             # StylePreset → CreativeConcept schemas
├── routers/
│   ├── image_generation.py                # Endpoint rename + logic update
│   └── projects.py                        # Bootstrap response update
└── scripts/
    └── generate_preset_thumbnails.py      # Table name update

frontend/src/
├── types/
│   ├── image-studio.ts                    # StylePreset → CreativeConcept types
│   └── supabase.ts                        # StylePreset type update
├── components/image-studio/
│   ├── StylePresetCard.tsx → ConceptCard.tsx    # Rename component
│   ├── StylePresetGrid.tsx → ConceptGrid.tsx    # Rename component
│   ├── CreateMode.tsx                            # Update imports + usage
│   └── index.ts                                  # Update exports
├── hooks/
│   └── useImageStudio.ts                  # Update preset → concept state
└── app/workspace/[id]/project/[projectId]/
    └── studio/page.tsx                    # Update bootstrap data usage

supabase/migrations/
└── 031_creative_concepts_migration.sql    # Database migration
```

**Structure Decision**: Web application with existing backend/frontend split. No new directories needed - this is a rename/refactor within existing structure.

## Constitution Re-Check (Post Phase 1 Design)

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. AI-First | PASS | Template variables enrich AI prompts with project context |
| II. API-First | PASS | OpenAPI contract defined in `contracts/creative-concepts-api.yaml` |
| III. UX Excellence | PASS | Simplified from 2 grids to 1, premium card design maintained |
| IV. Production-Ready | PASS | Single atomic SQL migration, reversible |
| V. Data Integrity | PASS | No data loss, historical metadata preserved, no FK impact |
| VI. Performance | PASS | Same query pattern, fewer rows (removed 8 visual styles) |
| VII. Testing | PASS | Type safety on both sides, manual verification checklist in quickstart |
| Database Practices | PASS | Migration atomic, indexes renamed, timestamps preserved |
| API Design | PASS | Clean REST endpoint, proper schema, OpenAPI documented |

All gates pass. No violations introduced by Phase 1 design.
