# Implementation Plan: Default System Templates Migration

**Branch**: `019-default-templates` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-default-templates/spec.md`

## Summary

Create a database migration to seed the platform with 45+ professional marketing templates (30-40 AI assistant templates + 15-20 workflow automation templates) across 6 categories. Templates will use expert marketing frameworks (AIDA, PAS, BAB, StoryBrand) and be written in Portuguese (Brazilian) to serve digital marketing agencies and paid traffic specialists. The migration will be idempotent using name+category duplicate detection and deterministic UUID generation.

## Technical Context

**Language/Version**: Python 3.11 (Backend migration script)
**Primary Dependencies**: Alembic (database migrations), SQLAlchemy (ORM), uuid (deterministic ID generation)
**Storage**: PostgreSQL (Supabase) - tables: `templates`, `workflow_templates`
**Testing**: Manual testing of migration execution + template validation
**Target Platform**: Linux server (Supabase PostgreSQL database)
**Project Type**: Web application (backend database migration)
**Performance Goals**: Migration completes in under 60 seconds for 45+ templates
**Constraints**: Idempotent execution (no duplicates on re-run), deterministic UUIDs (name+category hash)
**Scale/Scope**: 30-40 AI templates + 15-20 workflow templates across 6 categories each

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: AI-First Development
- ✅ **PASS**: Templates encode expert AI prompt engineering techniques (AIDA, PAS, BAB, StoryBrand)
- ✅ **PASS**: Templates designed for AI content generation workflows
- ✅ **PASS**: Industry expert frameworks ensure high-quality AI outputs

### Principle II: API-First Architecture
- ✅ **PASS**: No new APIs required - uses existing template retrieval endpoints
- ✅ **PASS**: Backend-only change (database seeding)
- N/A: No API contracts to define

### Principle III: User Experience Excellence
- ✅ **PASS**: Templates serve progressive complexity (novice → expert users)
- ✅ **PASS**: Template descriptions provide contextual help
- ✅ **PASS**: Templates reduce time-to-first-content from 30min → 2min (success criteria)
- ✅ **PASS**: Templates organized by category for easy discovery

### Principle IV: Production-Ready Deployments
- ✅ **PASS**: Migration runs via standard Alembic deployment process
- ✅ **PASS**: Idempotent design allows safe re-execution
- ✅ **PASS**: No Docker changes required (database-only)

### Principle V: Data Integrity & Security
- ✅ **PASS**: System templates have `workspace_id=null`, `is_system=true` (globally accessible)
- ✅ **PASS**: No user data involved (system templates only)
- ✅ **PASS**: Deterministic UUIDs prevent ID collisions

### Principle VI: Scalability & Performance
- ✅ **PASS**: Templates are static data (no runtime performance impact)
- ✅ **PASS**: Existing indexes on `is_system` and `category` support template queries
- N/A: No heavy operations or caching requirements

### Principle VII: Testing & Quality Assurance
- ⚠️ **PARTIAL**: Manual testing required for template quality validation
- ✅ **PASS**: Migration is testable (can run on test database)
- ✅ **PASS**: Idempotent design prevents migration errors

**Overall Status**: ✅ **PASSES** all applicable constitution checks

## Project Structure

### Documentation (this feature)

```text
specs/019-default-templates/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (already exists)
├── research.md          # Phase 0 output (marketing frameworks research)
├── data-model.md        # Phase 1 output (template schema documentation)
├── quickstart.md        # Phase 1 output (migration execution guide)
├── contracts/           # Phase 1 output (template JSON examples)
│   ├── ai-template-examples.json
│   └── workflow-template-examples.json
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```text
backend/
├── migrations/
│   └── versions/
│       └── <timestamp>_seed_default_templates.py  # NEW: Alembic migration script
├── models.py                                      # EXISTING: Template, WorkflowTemplate models
├── schemas.py                                     # EXISTING: Template schemas
└── routers/
    ├── templates.py                               # EXISTING: AI template endpoints
    └── workflows.py                               # EXISTING: Workflow template endpoints

frontend/
├── src/
│   └── app/
│       └── workspace/[id]/
│           ├── templates/page.tsx                 # EXISTING: AI template browsing UI
│           └── workflows/page.tsx                 # EXISTING: Workflow template browsing UI
```

**Structure Decision**: This is a backend-only feature (database migration). The migration script will be created in `backend/migrations/versions/` following standard Alembic conventions. No frontend changes are required as the UI already supports displaying system templates (verified in spec assumptions).

## Complexity Tracking

> No constitution violations - this section is not required.

