# Implementation Plan: Hybrid Architecture Migration

**Branch**: `001-hybrid-architecture` | **Date**: 2025-12-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-hybrid-architecture/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature migrates the AlvoBot application from a single Vue.js frontend connected directly to Supabase into a hybrid monorepo architecture. The migration establishes separate frontend and backend services while maintaining 100% backward compatibility with existing features (blogs, projects, articles, keyword mining, authentication, storage). The backend foundation (NestJS + TypeScript + Prisma + Redis + BullMQ) will enable future complex integrations like OAuth flows, webhooks, and automated workflows without disrupting current CRUD operations which remain Supabase-direct.

## Technical Context

**Language/Version**:
- Frontend: JavaScript (ES2020+) with Vue.js 3.5.13
- Backend: TypeScript 5.x with Node.js 20 LTS

**Primary Dependencies**:
- Frontend: Vue.js 3, Vite 6, Pinia 3, Vue Router 4, Axios 1.9, @supabase/supabase-js 2.50
- Backend: NestJS 10.x, Prisma 5.x, @supabase/supabase-js, BullMQ 5.x, class-validator, class-transformer
- Infrastructure: Docker, Docker Compose, Nginx, Redis 7

**Storage**:
- Primary: Supabase PostgreSQL (existing, maintained)
- Cache/Queue: Redis 7 (new, for backend job processing)
- Files: Supabase Storage (existing, maintained)

**Testing**:
- Frontend: Existing test setup (if any from WeWeb)
- Backend: Jest (NestJS default), Supertest for E2E
- Integration: Docker Compose based tests

**Target Platform**:
- Frontend: Web browsers (Chrome, Firefox, Safari, Edge - modern versions)
- Backend: Linux server (Docker containers on EasyPanel)
- Development: macOS/Linux/WSL2

**Project Type**: Web application (monorepo with frontend + backend)

**Performance Goals**:
- Frontend build time: < 5 minutes
- Backend health check: < 200ms response
- Docker Compose startup: < 2 minutes for all services
- Concurrent users: 1000+ with < 2s response times
- Token validation: 100/sec without degradation
- Database queries: < 100ms
- Redis connection: < 5s on startup

**Constraints**:
- Zero downtime: Existing features must work during migration
- Zero feature regression: 100% functional compatibility required
- Preserve WeWeb code: All exported components/helpers must remain
- No frontend refactor: JavaScript stays, no TypeScript migration
- Direct Supabase: Frontend CRUD remains unproxied by backend
- EasyPanel deployment: Must work with Docker Compose orchestration

**Scale/Scope**:
- Users: Currently supporting multiple users, targeting 1000+ concurrent
- Codebase: Vue.js app with WeWeb components (~100+ files)
- Services: 3 Docker containers (frontend, backend, redis)
- Endpoints: Initial backend ~5 endpoints (health, auth validation, docs)
- Future expansion: Foundation for Meta Ads, Google Ads, webhooks, workflows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: No project constitution found - using default software engineering best practices:

✅ **PASS - Code Organization**: Monorepo structure follows industry standards (frontend/, backend/, docker-compose.yml)

✅ **PASS - Separation of Concerns**: Frontend and backend clearly separated, each with distinct responsibilities

✅ **PASS - Testing Strategy**: Plan includes test infrastructure setup (Jest, Supertest, Docker-based integration tests)

✅ **PASS - Documentation**: Includes API documentation (Swagger/OpenAPI), environment variables, quickstart guide

✅ **PASS - Maintainability**: Uses established frameworks (NestJS, Prisma) with strong community support and patterns

✅ **PASS - Security**: Backend implements auth validation, environment variable management, CORS configuration

✅ **PASS - Scalability**: Redis + BullMQ for async processing, Docker for horizontal scaling, health checks for monitoring

**No violations** - Plan aligns with standard architectural principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-hybrid-architecture/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── backend-api.yaml # OpenAPI specification
├── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
├── checklists/
│   └── requirements.md  # Specification validation checklist
└── reference/
    └── PLANO_ARQUITETURA_HIBRIDA.md  # Original architecture plan
```

### Source Code (repository root)

```text
# Web application structure (frontend + backend monorepo)

frontend/                      # Vue.js 3 application (moved from root)
├── src/
│   ├── _front/               # WeWeb frontend components (preserved)
│   │   ├── components/
│   │   ├── views/
│   │   ├── use/
│   │   └── main.js
│   ├── _common/              # WeWeb shared utilities (preserved)
│   │   ├── helpers/
│   │   ├── plugins/
│   │   ├── store/
│   │   └── use/
│   ├── wwLib/                # WeWeb library services (preserved)
│   │   └── services/
│   └── components/           # Custom components
│       ├── elements/
│       ├── sections/
│       └── plugins/
├── public/
│   ├── data/                 # WeWeb configuration files
│   ├── manifest.json
│   └── serviceworker.js
├── package.json
├── vite.config.js
├── Dockerfile                # New: Frontend container
└── .env.example              # New: Environment variables template

backend/                       # New: NestJS application
├── src/
│   ├── main.ts               # Application entry point
│   ├── app.module.ts         # Root module
│   ├── modules/
│   │   ├── health/           # Health check module
│   │   │   ├── health.controller.ts
│   │   │   └── health.module.ts
│   │   └── auth/             # Authentication module
│   │       ├── auth.controller.ts
│   │       ├── auth.service.ts
│   │       ├── auth.guard.ts
│   │       └── auth.module.ts
│   ├── common/
│   │   ├── guards/           # Shared guards
│   │   ├── interceptors/     # Logging, transform
│   │   ├── filters/          # Error handling
│   │   ├── decorators/       # Custom decorators
│   │   └── config/           # Configuration management
│   └── database/
│       └── prisma.service.ts # Prisma client wrapper
├── prisma/
│   ├── schema.prisma         # Database schema (mirrors Supabase)
│   └── migrations/           # Database migrations (if needed)
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── package.json
├── tsconfig.json
├── nest-cli.json
├── Dockerfile                # Backend container
└── .env.example

docker-compose.yml             # New: Service orchestration
.env.example                   # New: Root environment variables
README.md                      # Updated: Migration documentation
```

**Structure Decision**: Selected **Option 2: Web application** structure because:
1. Feature explicitly requires frontend + backend separation
2. Monorepo approach maintains code cohesion while enabling independent deployment
3. Frontend directory preserves all WeWeb exported code without modification
4. Backend directory follows NestJS conventions with modular architecture
5. Docker Compose enables local development parity with production deployment

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected - this section is not applicable.

---

## Phase Completion Status

### Phase 0: Research ✅ COMPLETE
- **Output**: [research.md](research.md)
- **Status**: All technical unknowns resolved
- **Key Decisions**: NestJS, Prisma, Passport JWT, BullMQ, Docker multi-stage, git mv migration

### Phase 1: Design & Contracts ✅ COMPLETE
- **Output**:
  - [data-model.md](data-model.md) - Infrastructure and existing data entities documented
  - [contracts/backend-api.yaml](contracts/backend-api.yaml) - OpenAPI 3.0 specification
  - [quickstart.md](quickstart.md) - Developer onboarding guide
  - [CLAUDE.md](../../CLAUDE.md) - Agent context updated
- **Status**: Design artifacts generated and validated

### Phase 2: Task Generation ⏭️ NEXT STEP
- **Command**: `/speckit.tasks`
- **Purpose**: Generate dependency-ordered implementation tasks
- **Input**: This plan + specification

---

## Planning Summary

**Branch**: 001-hybrid-architecture
**Plan Status**: ✅ Complete - Ready for task generation
**Next Command**: `/speckit.tasks`

**Artifacts Generated**:
1. ✅ plan.md (this file)
2. ✅ research.md - Technical research findings
3. ✅ data-model.md - Data structures and relationships
4. ✅ contracts/backend-api.yaml - OpenAPI specification
5. ✅ quickstart.md - Developer setup guide
6. ✅ CLAUDE.md - Agent context updated

**Ready to Proceed**: Yes - All planning phases complete
