# Implementation Plan: Hybrid Supabase Architecture Migration

**Branch**: `007-hybrid-supabase-architecture` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-hybrid-supabase-architecture/spec.md`

## Summary

Migrate XTYL Creativity Machine from a Python-backend-intermediary architecture to a hybrid architecture where CRUD operations (Workspaces, Projects, Documents, Folders, Templates, User Preferences, Conversations) go directly from Frontend to Supabase Client, while AI/LLM operations (Chat, Image Generation, Workflow Execution, RAG) remain routed through the Python backend for secret protection and complex orchestration.

**Key Technical Decisions**:
- Big-bang migration: All CRUD endpoints migrated simultaneously
- Immediate cleanup: Deprecated Python CRUD routes removed post-migration
- RLS enforcement: Row Level Security policies for data access control

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend), Python 3.11 (Backend)
**Primary Dependencies**:
- Frontend: Next.js 14, @supabase/supabase-js, React 18, Zustand
- Backend: FastAPI, SQLAlchemy, Supabase Python (for RLS policy management only)
**Storage**: Supabase PostgreSQL (with RLS), Supabase Storage (files)
**Testing**: Jest + React Testing Library (Frontend), pytest (Backend)
**Target Platform**: Web (Desktop/Mobile responsive)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: CRUD operations < 500ms (down from 3-5s), AI operations maintain current latency
**Constraints**: JWT token validation, RLS policy enforcement, no downtime during migration
**Scale/Scope**: 100+ concurrent users per workspace, 7 entity types to migrate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ PASS | AI operations remain in Python backend with streaming support |
| II. API-First Architecture | ⚠️ MODIFIED | CRUD moves to Supabase Client (justified by performance requirement) |
| III. User Experience Excellence | ✅ PASS | Improves responsiveness (500ms vs 3-5s), maintains premium UX |
| IV. Production-Ready Deployments | ✅ PASS | Docker Compose unchanged, RLS deployment via Supabase Dashboard |
| V. Data Integrity & Security | ✅ PASS | RLS enforces data isolation, JWT auth maintained |
| VI. Scalability & Performance | ✅ PASS | Direct DB access improves latency, reduces backend load |
| VII. Testing & Quality Assurance | ✅ PASS | Integration tests updated for new data paths |

**Gate Status**: PASS (with justified API-First modification)

## Project Structure

### Documentation (this feature)

```text
specs/007-hybrid-supabase-architecture/
├── plan.md              # This file
├── research.md          # Phase 0: RLS patterns, Supabase Client best practices
├── data-model.md        # Phase 1: Entity-RLS mapping
├── quickstart.md        # Phase 1: Migration guide
├── contracts/           # Phase 1: Frontend service interfaces
│   ├── supabase-services.ts
│   └── rls-policies.sql
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   ├── chat.py          # KEEP: AI chat operations
│   ├── image_generation.py # KEEP: Image generation
│   ├── executions.py    # KEEP: Workflow execution + SSE
│   ├── workflows.py     # KEEP: Workflow management
│   ├── workspaces.py    # REMOVE: Migrate to Supabase
│   ├── projects.py      # REMOVE: Migrate to Supabase
│   ├── documents.py     # REMOVE (CRUD only): Keep file upload
│   ├── folders.py       # REMOVE: Migrate to Supabase
│   ├── templates.py     # REMOVE: Migrate to Supabase
│   ├── preferences.py   # REMOVE: Migrate to Supabase
│   └── conversations.py # REMOVE (metadata): Keep chat content routes
└── services/
    └── [AI services remain]

frontend/
├── src/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # NEW: Supabase client singleton
│   │   │   ├── workspaces.ts    # NEW: Workspace CRUD
│   │   │   ├── projects.ts      # NEW: Project CRUD
│   │   │   ├── documents.ts     # NEW: Document CRUD
│   │   │   ├── folders.ts       # NEW: Folder CRUD
│   │   │   ├── templates.ts     # NEW: Template CRUD
│   │   │   ├── preferences.ts   # NEW: User preferences
│   │   │   └── conversations.ts # NEW: Conversation metadata
│   │   └── api.ts               # MODIFY: Keep AI-only routes
│   ├── hooks/
│   │   └── use-supabase-*.ts    # NEW: React Query hooks for Supabase
│   └── components/
│       └── [UI components unchanged]
└── tests/
    └── integration/
        └── supabase/            # NEW: Supabase integration tests
```

**Structure Decision**: Web application with frontend Supabase services layer added alongside existing API client (which will be reduced to AI-only operations).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| API-First modification | Performance requirement (500ms target) | Backend intermediary adds 2-4s latency per request due to user lookup and serialization overhead |
| Big-bang migration | Cleaner codebase, no dual maintenance | Progressive migration requires maintaining both code paths, increases testing complexity |
| Immediate route removal | Avoid confusion, reduce attack surface | Keeping deprecated routes creates maintenance burden and potential security risk |
