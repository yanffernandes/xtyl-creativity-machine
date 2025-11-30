# Implementation Plan: Production Infrastructure Migration

**Branch**: `006-production-infrastructure` | **Date**: 2025-11-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-production-infrastructure/spec.md`

## Summary

Migrate the application infrastructure from local Docker services (PostgreSQL, MinIO) to managed cloud services (Supabase PostgreSQL + Auth, Cloudflare R2) while maintaining the Docker Compose deployment for stateless services (frontend, backend, celery, redis) on Easypanel. This enables production-ready deployment with managed backups, auth, and storage.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, Supabase JS SDK, boto3 (S3-compatible)
**Storage**: Supabase PostgreSQL (external), Cloudflare R2 (S3-compatible, external), Redis (Docker)
**Testing**: Manual integration testing, health check endpoints
**Target Platform**: Easypanel (Docker Compose), Supabase (managed), Cloudflare R2 (managed)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: 200ms response time for standard operations, 100 concurrent users
**Constraints**: Zero downtime for stateless services, external service dependencies
**Scale/Scope**: Single production environment, ~10 API routes affected, 2 frontend auth pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ PASS | No changes to AI services, only infrastructure |
| II. API-First Architecture | ✅ PASS | Backend validates Supabase JWT, maintains REST APIs |
| III. User Experience Excellence | ✅ PASS | Auth UX via Supabase SDK maintains quality |
| IV. Production-Ready Deployments | ✅ PASS | Docker Compose maintained for Easypanel |
| V. Data Integrity & Security | ✅ PASS | Supabase Auth + JWT validation, R2 public bucket for assets |
| VI. Scalability & Performance | ✅ PASS | Managed services scale better than self-hosted |
| VII. Testing & Quality Assurance | ✅ PASS | Health checks, manual integration testing |

**Constitution Note**: The constitution mentions "MinIO/S3" for storage - Cloudflare R2 is S3-compatible, so this is compliant. Auth changes from custom JWT to Supabase Auth are acceptable as JWT validation is still present.

## Project Structure

### Documentation (this feature)

```text
specs/006-production-infrastructure/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (minimal - mostly config changes)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── auth.py                    # REMOVE: Custom auth implementation
├── supabase_auth.py           # NEW: Supabase JWT validation
├── storage_service.py         # NEW: Replaces minio_service.py (R2-compatible)
├── minio_service.py           # REMOVE: Replaced by storage_service.py
├── routers/
│   └── auth.py                # MODIFY: Remove custom endpoints, add Supabase validation
├── database.py                # MODIFY: Connection string from Supabase
└── main.py                    # MODIFY: Remove MinIO init, add Supabase config

frontend/
├── src/
│   ├── lib/
│   │   ├── store.ts           # MODIFY: Replace custom auth with Supabase session
│   │   ├── supabase.ts        # NEW: Supabase client initialization
│   │   └── api.ts             # MODIFY: Use Supabase session token
│   └── app/
│       ├── login/page.tsx     # MODIFY: Use Supabase Auth
│       ├── register/page.tsx  # MODIFY: Use Supabase Auth
│       └── forgot-password/   # MODIFY: Use Supabase Auth

docker-compose.prod.yml        # NEW: Production compose without db/minio
.env.production.example        # NEW: Production environment template
```

**Structure Decision**: Web application structure maintained. Changes are primarily configuration and service replacements, not structural.

## Complexity Tracking

> No constitution violations detected. All changes align with existing principles.

| Area | Complexity | Justification |
|------|------------|---------------|
| Auth Migration | Medium | Replacing custom JWT with Supabase Auth requires frontend + backend changes |
| Storage Migration | Low | R2 is S3-compatible, minimal code changes to minio_service.py |
| Database Migration | Low | Only connection string changes, SQLAlchemy unchanged |
| Docker Compose | Low | Remove services, update env vars |
