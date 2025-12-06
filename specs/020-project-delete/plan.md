# Implementation Plan: Project Deletion with Soft Delete

**Branch**: `020-project-delete` | **Date**: 2025-12-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-project-delete/spec.md`

## Summary

Add a project deletion feature to the project settings page with a two-step confirmation process (warning dialog + type-to-confirm). Implement soft delete by adding a `deleted_at` timestamp to projects and cascading to all child entities (documents, folders, workflows, executions). Filter soft-deleted projects from all user-facing queries.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, Supabase (direct client)
**Storage**: Supabase PostgreSQL (existing Project, Document, Folder, WorkflowTemplate, WorkflowExecution tables)
**Testing**: pytest (Backend), Vitest (Frontend)
**Target Platform**: Web application (Docker Compose deployment)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Delete operation completes in <2 seconds including cascade
**Constraints**: Atomic transaction for cascade (all-or-nothing), no partial deletes
**Scale/Scope**: Single workspace with multiple projects, each with potentially hundreds of documents/workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ N/A | Feature doesn't affect AI capabilities |
| II. API-First Architecture | ✅ Pass | Will add DELETE endpoint to backend, frontend consumes API |
| III. User Experience Excellence | ✅ Pass | Two-step confirmation prevents accidents, clear visual hierarchy with Danger Zone |
| IV. Production-Ready Deployments | ✅ Pass | No new services, extends existing models |
| V. Data Integrity & Security | ✅ Pass | Soft delete preserves data, authorization check for owner/admin |
| VI. Scalability & Performance | ✅ Pass | Batch update for cascade, single transaction |
| VII. Testing & Quality Assurance | ✅ Pass | Will add integration tests for delete flow |
| Database Practices (Soft Delete) | ✅ Pass | Constitution explicitly allows: "Soft deletes MAY be used for user-facing content (deleted_at column)" |

**Gate Result**: PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/020-project-delete/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.yaml         # OpenAPI spec for delete endpoint
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── models.py                    # Add deleted_at to Project, WorkflowTemplate, WorkflowExecution
├── crud.py                      # Add soft_delete_project(), cascade functions
├── routers/
│   └── projects.py              # Add DELETE /projects/{project_id} endpoint
└── migrations/
    └── 023_add_project_soft_delete.sql  # Migration for deleted_at columns

frontend/
├── src/
│   ├── components/
│   │   └── project/
│   │       ├── ProjectSettingsForm.tsx    # Add Danger Zone section
│   │       └── DeleteProjectDialog.tsx    # New: Two-step confirmation dialog
│   ├── hooks/
│   │   └── use-projects.ts                # Update useDeleteProject mutation
│   ├── lib/
│   │   ├── api.ts                         # Add deleteProject API function
│   │   └── supabase/
│   │       └── projects.ts                # Update to call backend API instead of direct delete
│   └── types/
│       └── supabase.ts                    # Add deleted_at to Project type
└── tests/
    └── project-delete.test.ts             # New: Delete flow tests
```

**Structure Decision**: Web application structure (Option 2) - extends existing backend/frontend split with new components and API endpoints.

## Complexity Tracking

> No violations - all changes align with existing patterns and constitution principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Design Alignment |
|-----------|--------|------------------|
| I. AI-First Development | ✅ N/A | No AI functionality affected |
| II. API-First Architecture | ✅ Pass | DELETE endpoint documented in contracts/api.yaml |
| III. User Experience Excellence | ✅ Pass | Two-step dialog with clear feedback, danger zone styling |
| IV. Production-Ready Deployments | ✅ Pass | Migration script provided, no new services |
| V. Data Integrity & Security | ✅ Pass | Atomic transaction, authorization enforced |
| VI. Scalability & Performance | ✅ Pass | Batch updates, indexed queries |
| VII. Testing & Quality Assurance | ✅ Pass | Test plan in quickstart.md |
| Error Handling Standards | ✅ Pass | Clear error messages in API contract |
| Database Practices | ✅ Pass | Soft delete pattern, indexes, migration |

**Post-Design Gate Result**: PASS - Ready for task generation

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | [research.md](./research.md) | Technical decisions and rationale |
| Data Model | [data-model.md](./data-model.md) | Entity changes and migration |
| API Contract | [contracts/api.yaml](./contracts/api.yaml) | OpenAPI specification |
| Quickstart | [quickstart.md](./quickstart.md) | Implementation guide and testing |

## Next Steps

Run `/speckit.tasks` to generate the implementation task list.
