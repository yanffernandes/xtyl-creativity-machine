# Implementation Plan: Performance Optimization & System Speed Improvements

**Branch**: `030-performance-optimization` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/030-performance-optimization/spec.md`

## Summary

Comprehensive performance optimization addressing frontend re-render issues (33 useState in main page, no memo(), inconsistent query keys), backend query inefficiencies (N+1 patterns, missing indexes), and operational concerns (in-memory batch progress, unbatched API calls). Technical approach involves React Query gcTime configuration, component memoization, Zustand state consolidation, database index creation, Redis-backed progress tracking, and semaphore-controlled API concurrency.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, React Query v5, Zustand, Next.js 14, Shadcn/UI
**Storage**: PostgreSQL (Supabase with pgvector), Redis (required - new), Cloudflare R2 (images)
**Testing**: pytest, pytest-asyncio (Backend); Vitest, React Testing Library (Frontend)
**Target Platform**: Web application (desktop-first, responsive)
**Project Type**: Web (frontend + backend)
**Performance Goals**: 200ms cached navigation, 2s document list load, 50ms DB queries, 60fps scrolling
**Constraints**: 30min cache retention, max 3 parallel fal.ai calls, <5 re-renders per interaction
**Scale/Scope**: 500+ documents per project, 50+ images per session, single-user focus with multi-tab support

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | PASS | Feature improves AI image generation responsiveness (FR-021 to FR-026) |
| II. API-First Architecture | PASS | No API contract changes; backend optimizations only |
| III. User Experience Excellence | PASS | Directly addresses "Performance as UX" requirements (200ms interactions, no UI blocking) |
| IV. Production-Ready Deployments | PASS | Redis added as new service; Docker Compose update required |
| V. Data Integrity & Security | PASS | No changes to auth or data storage patterns |
| VI. Scalability & Performance | PASS | Primary focus: caching, indexing, async operations, resource limits |
| VII. Testing & Quality Assurance | PASS | Cache invalidation scenarios must be tested (Risk noted in spec) |

**Constitution Check Result**: ✅ All gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/030-performance-optimization/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (Redis schemas, index definitions)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (no new API endpoints)
│   └── redis-keys.md    # Redis key patterns documentation
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   ├── documents.py          # Query optimization (FR-018, FR-019, FR-020)
│   └── image_generation.py   # Rate limiting (FR-021-023), async ops (FR-024-026)
├── services/
│   ├── redis_service.py      # NEW: Redis client and batch progress (FR-026)
│   └── storage_service.py    # Async thumbnail generation (FR-024, FR-025)
├── crud.py                   # N+1 fix (FR-018)
└── requirements.txt          # Add redis, aioredis

frontend/
├── src/
│   ├── app/workspace/[id]/project/[projectId]/
│   │   └── page.tsx          # State consolidation (FR-007, FR-008)
│   ├── components/
│   │   └── image-studio/
│   │       ├── VariationCard.tsx     # memo() (FR-005)
│   │       ├── VariationGrid.tsx     # Virtualization (FR-012)
│   │       └── StylePresetCard.tsx   # memo() (FR-005)
│   ├── hooks/
│   │   ├── use-documents.ts          # gcTime, query keys (FR-001-004)
│   │   └── useImageStudio.ts         # Query key consolidation (FR-002)
│   ├── lib/
│   │   ├── query-keys.ts             # Consolidated keys (FR-002)
│   │   └── stores/
│   │       └── ui-store.ts           # NEW: Modal/UI state (FR-007)
│   └── package.json                  # Add @tanstack/react-virtual
└── tests/
    └── cache-invalidation.test.ts    # NEW: Cache scenario tests

supabase/
└── migrations/
    └── 034_performance_indexes.sql   # NEW: 5 indexes (FR-013-017)

docker-compose.yml                    # Add Redis service
```

**Structure Decision**: Web application with existing frontend/backend split. New files: Redis service, UI store, database migration. Modifications to existing query hooks, components, and routers.

## Complexity Tracking

> No Constitution violations. Table empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| - | - | - |
