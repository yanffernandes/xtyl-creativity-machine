# Tasks: Hybrid Architecture Migration

**Input**: Design documents from `/specs/001-hybrid-architecture/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are NOT included in this implementation as they were not explicitly requested in the specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`
- Paths follow monorepo structure defined in plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and monorepo structure creation

- [ ] T001 Create pre-migration backup branch and tag at migration-v0
- [ ] T002 [P] Create .env.example file at project root with all required environment variables
- [ ] T003 [P] Create .gitignore entries for .env files and node_modules at project root
- [ ] T004 [P] Update README.md at project root with monorepo structure documentation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Create monorepo directory structure: frontend/, backend/, docker-compose.yml at project root
- [ ] T006 Move all Vue.js files to frontend/ directory using git mv (preserves history)
- [ ] T007 Update frontend/vite.config.js to work from subdirectory
- [ ] T008 Update frontend/package.json scripts and dependencies
- [ ] T009 [P] Create frontend/.env.example with Vite environment variables
- [ ] T010 Test frontend builds successfully: cd frontend && npm install && npm run build
- [ ] T011 Test frontend dev server starts: cd frontend && npm run dev

**Checkpoint**: Frontend confirmed working from new location - user story implementation can begin

---

## Phase 3: User Story 1 - Existing Features Continue Working (Priority: P1) 🎯 MVP

**Goal**: Verify all current AlvoBot features work identically after monorepo migration

**Independent Test**: Run through all user workflows (login, blogs, projects, articles, keyword mining, file upload) and verify identical behavior

### Validation for User Story 1

- [ ] T012 [P] [US1] Test login with existing Supabase credentials and verify authentication
- [ ] T013 [P] [US1] Verify dashboard loads with existing blogs and projects data
- [ ] T014 [P] [US1] Create new blog post and verify it saves to Supabase directly
- [ ] T015 [P] [US1] Run keyword mining (10x feature) and verify results match pre-migration
- [ ] T016 [P] [US1] Test Artigos Flecha feature generates content correctly
- [ ] T017 [P] [US1] Upload file to Supabase Storage and verify accessibility
- [ ] T018 [P] [US1] Check browser console for errors (should be none)
- [ ] T019 [P] [US1] Verify WeWeb components in frontend/src/_front/, frontend/src/_common/, frontend/src/wwLib/ are preserved
- [ ] T020 [US1] Compare frontend build output with pre-migration build (bundle sizes should match)
- [ ] T021 [US1] Verify all frontend import paths resolve correctly
- [ ] T022 [US1] Document validation results in specs/001-hybrid-architecture/VALIDATION_REPORT.md

**Checkpoint**: User Story 1 complete - existing features confirmed working. This is the MVP.

---

## Phase 4: User Story 2 - Monorepo Structure Established (Priority: P1)

**Goal**: Create complete monorepo with backend skeleton and Docker Compose orchestration

**Independent Test**: Verify directory structure exists, both services run independently, Docker Compose starts all services

### Backend Initialization for User Story 2

- [ ] T023 [P] [US2] Initialize NestJS project in backend/ directory using @nestjs/cli
- [ ] T024 [P] [US2] Create backend/package.json with NestJS 10.x dependencies
- [ ] T025 [P] [US2] Create backend/tsconfig.json with ES2020+ target
- [ ] T026 [P] [US2] Create backend/.env.example with backend environment variables
- [ ] T027 [P] [US2] Create backend/src/main.ts with basic NestJS bootstrap
- [ ] T028 [P] [US2] Create backend/src/app.module.ts as root module
- [ ] T029 [P] [US2] Add CORS configuration in backend/src/main.ts

### Docker Configuration for User Story 2

- [ ] T030 [P] [US2] Create frontend/Dockerfile with multi-stage build (Node builder + Nginx)
- [ ] T031 [P] [US2] Create frontend/nginx.conf for SPA routing and API proxying
- [ ] T032 [P] [US2] Create backend/Dockerfile with multi-stage build (dependencies + build + production)
- [ ] T033 [US2] Create docker-compose.yml at project root with frontend, backend, redis services
- [ ] T034 [US2] Configure service health checks in docker-compose.yml
- [ ] T035 [US2] Configure named volumes for Redis persistence in docker-compose.yml
- [ ] T036 [US2] Set up Docker networking in docker-compose.yml

### Environment Configuration for User Story 2

- [ ] T037 [P] [US2] Update root .env.example with all service environment variables
- [ ] T038 [P] [US2] Document Supabase credentials setup in frontend/.env.example
- [ ] T039 [P] [US2] Document backend environment variables in backend/.env.example

### Validation for User Story 2

- [ ] T040 [US2] Test backend starts: cd backend && npm install && npm run start:dev
- [ ] T041 [US2] Test Docker Compose builds all services: docker-compose build
- [ ] T042 [US2] Test Docker Compose starts all services: docker-compose up -d
- [ ] T043 [US2] Verify frontend accessible at http://localhost:8080 via Docker
- [ ] T044 [US2] Verify backend accessible at http://localhost:3000 via Docker
- [ ] T045 [US2] Verify Redis container running: docker-compose ps
- [ ] T046 [US2] Test services restart correctly: docker-compose restart

**Checkpoint**: User Story 2 complete - monorepo structure established, Docker orchestration working

---

## Phase 5: User Story 3 - Backend Foundation Ready (Priority: P2)

**Goal**: Implement functional NestJS backend with health checks, auth validation, Supabase/Redis connections

**Independent Test**: Call health endpoint, validate JWT token, verify database and Redis connections

### Health Check Module for User Story 3

- [ ] T047 [P] [US3] Create backend/src/modules/health/health.module.ts
- [ ] T048 [P] [US3] Create backend/src/modules/health/health.controller.ts with GET /health endpoint
- [ ] T049 [P] [US3] Implement health check logic with Redis and Supabase status in health.controller.ts
- [ ] T050 [P] [US3] Add GET /health/live liveness probe endpoint in health.controller.ts
- [ ] T051 [P] [US3] Add GET /health/ready readiness probe endpoint in health.controller.ts
- [ ] T052 [US3] Register HealthModule in backend/src/app.module.ts

### Authentication Module for User Story 3

- [ ] T053 [P] [US3] Install Passport dependencies: @nestjs/passport, passport, passport-jwt
- [ ] T054 [P] [US3] Create backend/src/modules/auth/auth.module.ts
- [ ] T055 [P] [US3] Create backend/src/modules/auth/jwt.strategy.ts with Supabase JWT validation
- [ ] T056 [P] [US3] Create backend/src/modules/auth/auth.guard.ts for protected routes
- [ ] T057 [P] [US3] Create backend/src/modules/auth/auth.controller.ts with POST /auth/validate and GET /auth/user endpoints
- [ ] T058 [US3] Register AuthModule in backend/src/app.module.ts

### Prisma Setup for User Story 3

- [ ] T059 [P] [US3] Install Prisma dependencies: @prisma/client, prisma (dev)
- [ ] T060 [P] [US3] Initialize Prisma: npx prisma init in backend/
- [ ] T061 [P] [US3] Create backend/prisma/schema.prisma with Supabase datasource config
- [ ] T062 [P] [US3] Add Blog, Project, Article, Keyword models to backend/prisma/schema.prisma (mirroring Supabase)
- [ ] T063 [P] [US3] Create backend/src/database/prisma.service.ts as PrismaClient wrapper
- [ ] T064 [P] [US3] Create backend/src/database/database.module.ts
- [ ] T065 [US3] Generate Prisma Client: npx prisma generate in backend/
- [ ] T066 [US3] Register DatabaseModule in backend/src/app.module.ts

### Redis and BullMQ Setup for User Story 3

- [ ] T067 [P] [US3] Install BullMQ dependencies: bullmq, ioredis, @nestjs/bullmq
- [ ] T068 [P] [US3] Create backend/src/common/config/bullmq.config.ts with Redis connection
- [ ] T069 [P] [US3] Create backend/src/modules/queue/queue.module.ts
- [ ] T070 [P] [US3] Register BullModule.forRoot() in backend/src/app.module.ts
- [ ] T071 [US3] Test Redis connection in health check endpoint

### Error Handling and Logging for User Story 3

- [ ] T072 [P] [US3] Create backend/src/common/filters/http-exception.filter.ts for global error handling
- [ ] T073 [P] [US3] Create backend/src/common/interceptors/logging.interceptor.ts for request/response logging
- [ ] T074 [P] [US3] Create backend/src/common/decorators/user.decorator.ts for extracting user from request
- [ ] T075 [US3] Register global filters and interceptors in backend/src/main.ts

### Swagger/OpenAPI Documentation for User Story 3

- [ ] T076 [P] [US3] Install Swagger dependencies: @nestjs/swagger, swagger-ui-express
- [ ] T077 [P] [US3] Configure Swagger in backend/src/main.ts with API title, version, and bearer auth
- [ ] T078 [P] [US3] Add @ApiTags, @ApiOperation decorators to health.controller.ts
- [ ] T079 [P] [US3] Add @ApiTags, @ApiOperation, @ApiBearerAuth decorators to auth.controller.ts
- [ ] T080 [US3] Verify Swagger UI accessible at http://localhost:3000/api/docs

### Validation for User Story 3

- [ ] T081 [US3] Test GET /health returns 200 OK with status: healthy
- [ ] T082 [US3] Test GET /health includes Redis and Supabase dependency status
- [ ] T083 [US3] Test POST /auth/validate with valid Supabase JWT token returns user info
- [ ] T084 [US3] Test POST /auth/validate with invalid token returns 401 Unauthorized
- [ ] T085 [US3] Test Prisma connects to Supabase and executes sample query
- [ ] T086 [US3] Test Redis connection establishes within 5 seconds
- [ ] T087 [US3] Test BullMQ can add and process a test job
- [ ] T088 [US3] Verify Swagger documentation displays all endpoints correctly
- [ ] T089 [US3] Test backend health check responds in under 200ms
- [ ] T090 [US3] Verify error responses include proper HTTP status codes and messages

**Checkpoint**: User Story 3 complete - backend foundation fully functional with all core services

---

## Phase 6: User Story 4 - Production Deployment Configured (Priority: P2)

**Goal**: Configure Docker Compose for production deployment on EasyPanel with all services running reliably

**Independent Test**: Deploy to EasyPanel, verify all services running, confirm frontend and backend accessible

### Production Docker Configuration for User Story 4

- [ ] T091 [P] [US4] Update frontend/Dockerfile with production optimizations (multi-stage, Alpine, non-root user)
- [ ] T092 [P] [US4] Update backend/Dockerfile with production optimizations (multi-stage, Alpine, non-root user, dumb-init)
- [ ] T093 [P] [US4] Add health check commands to frontend/Dockerfile
- [ ] T094 [P] [US4] Add health check commands to backend/Dockerfile
- [ ] T095 [P] [US4] Configure Redis persistence (AOF) in docker-compose.yml
- [ ] T096 [P] [US4] Add restart policies (restart: always) to all services in docker-compose.yml
- [ ] T097 [US4] Configure resource limits for services in docker-compose.yml

### Environment Management for User Story 4

- [ ] T098 [P] [US4] Create deployment guide in specs/001-hybrid-architecture/DEPLOYMENT.md
- [ ] T099 [P] [US4] Document required EasyPanel environment variables in DEPLOYMENT.md
- [ ] T100 [P] [US4] Document domain configuration (app.alvobot.ai, api.alvobot.ai) in DEPLOYMENT.md
- [ ] T101 [P] [US4] Create production .env.example template in DEPLOYMENT.md

### Validation for User Story 4

- [ ] T102 [US4] Test production build: docker-compose -f docker-compose.yml build
- [ ] T103 [US4] Test services start in correct order with health checks
- [ ] T104 [US4] Verify frontend serves static assets correctly via Nginx
- [ ] T105 [US4] Verify frontend proxies /api requests to backend
- [ ] T106 [US4] Test Redis data persists after container restart
- [ ] T107 [US4] Verify backend logs are accessible: docker-compose logs backend
- [ ] T108 [US4] Test environment variables load correctly in all services
- [ ] T109 [US4] Verify CORS configuration allows frontend domain
- [ ] T110 [US4] Test health checks return correct status during startup and runtime

**Checkpoint**: User Story 4 complete - production deployment ready for EasyPanel

---

## Phase 7: User Story 5 - Foundation for Complex Features (Priority: P3)

**Goal**: Implement additional infrastructure for future complex integrations (POC webhook, enhanced auth, job processing)

**Independent Test**: Create test webhook receiver, queue sample job, verify auth guard rejects invalid tokens

### Enhanced Authentication for User Story 5

- [ ] T111 [P] [US5] Add role-based authorization support to auth.guard.ts
- [ ] T112 [P] [US5] Create backend/src/common/decorators/roles.decorator.ts
- [ ] T113 [P] [US5] Add user role validation in JWT strategy
- [ ] T114 [US5] Test protected endpoint rejects request without valid token (401)

### Job Processing Infrastructure for User Story 5

- [ ] T115 [P] [US5] Create backend/src/modules/queue/processors/example.processor.ts
- [ ] T116 [P] [US5] Create backend/src/modules/queue/queue.service.ts for job management
- [ ] T117 [P] [US5] Register example queue in backend/src/modules/queue/queue.module.ts
- [ ] T118 [US5] Test job can be enqueued and processed asynchronously
- [ ] T119 [US5] Test job retry logic with exponential backoff
- [ ] T120 [US5] Verify failed jobs are logged correctly

### Proof-of-Concept Webhook Receiver for User Story 5

- [ ] T121 [P] [US5] Create backend/src/modules/webhooks/webhooks.module.ts
- [ ] T122 [P] [US5] Create backend/src/modules/webhooks/webhooks.controller.ts with POST /webhooks/test endpoint
- [ ] T123 [P] [US5] Implement webhook signature validation in webhooks.controller.ts
- [ ] T124 [P] [US5] Add webhook payload logging
- [ ] T125 [US5] Register WebhooksModule in backend/src/app.module.ts
- [ ] T126 [US5] Test webhook endpoint receives POST requests correctly
- [ ] T127 [US5] Test webhook rejects invalid signatures

### Enhanced Logging and Monitoring for User Story 5

- [ ] T128 [P] [US5] Add structured logging with log levels (info, warn, error) to all services
- [ ] T129 [P] [US5] Create backend/src/common/interceptors/performance.interceptor.ts to track request timing
- [ ] T130 [P] [US5] Add correlation IDs to requests for distributed tracing
- [ ] T131 [US5] Verify logs include timestamps, request IDs, and user context

### Validation for User Story 5

- [ ] T132 [US5] Test auth guard properly rejects invalid/missing tokens
- [ ] T133 [US5] Test role-based authorization works for protected endpoints
- [ ] T134 [US5] Verify BullMQ processes jobs correctly with retry logic
- [ ] T135 [US5] Test webhook endpoint receives and validates payloads
- [ ] T136 [US5] Verify logs capture all request/response cycles
- [ ] T137 [US5] Test Prisma executes queries successfully against Supabase
- [ ] T138 [US5] Verify backend can handle 100 JWT validations per second

**Checkpoint**: User Story 5 complete - backend infrastructure ready for complex features

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and documentation updates

- [ ] T139 [P] Update root README.md with architecture overview and getting started guide
- [ ] T140 [P] Create CONTRIBUTING.md at project root with development workflow
- [ ] T141 [P] Verify all environment variables documented in .env.example files
- [ ] T142 [P] Add npm scripts to root package.json for running both services
- [ ] T143 [P] Create specs/001-hybrid-architecture/MIGRATION_REPORT.md documenting completion
- [ ] T144 [P] Verify frontend bundle size matches pre-migration baseline
- [ ] T145 [P] Run security audit: npm audit in frontend/ and backend/
- [ ] T146 [P] Update backend/package.json with proper version and metadata
- [ ] T147 [P] Update frontend/package.json with proper version and metadata
- [ ] T148 Run complete validation from quickstart.md guide
- [ ] T149 Document any deviations from plan in MIGRATION_REPORT.md
- [ ] T150 Create rollback procedure in specs/001-hybrid-architecture/ROLLBACK.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - **US1 (P1)**: Can start immediately after Foundational - no dependencies on other stories
  - **US2 (P1)**: Can start after US1 validation - builds on US1 structure
  - **US3 (P2)**: Can start after US2 - requires monorepo structure from US2
  - **US4 (P2)**: Can start after US3 - requires backend foundation from US3
  - **US5 (P3)**: Can start after US3 - requires backend foundation from US3 (can run parallel with US4)
- **Polish (Phase 8)**: Depends on all user stories completion

### User Story Dependencies

- **User Story 1 (P1)**: Must complete first - validates existing features work
- **User Story 2 (P1)**: Depends on US1 validation - creates monorepo structure
- **User Story 3 (P2)**: Depends on US2 - implements backend using monorepo structure
- **User Story 4 (P2)**: Depends on US3 - configures deployment using backend foundation
- **User Story 5 (P3)**: Depends on US3 - adds advanced features to backend foundation (can run parallel with US4)

### Within Each User Story

- Validation tasks can run in parallel after implementation tasks complete
- Tasks marked [P] can run simultaneously (different files, no conflicts)
- Backend module setup tasks can run in parallel
- Docker configuration tasks can run in parallel
- Documentation tasks can run in parallel

### Parallel Opportunities

**Phase 1 (Setup)**:
- Tasks T002, T003, T004 can run in parallel

**Phase 2 (Foundational)**:
- Task T009 can run parallel with T006-T008

**Phase 3 (US1 - Validation)**:
- All validation tasks T012-T019 can run in parallel after frontend migration

**Phase 4 (US2)**:
- Backend initialization tasks T023-T029 can run in parallel
- Docker configuration tasks T030-T032 can run in parallel
- Environment tasks T037-T039 can run in parallel

**Phase 5 (US3)**:
- Most module creation tasks within each subsection can run in parallel
- Health, Auth, Prisma, Redis modules can be developed in parallel by different developers

**Phase 6 (US4)**:
- Docker optimization tasks T091-T097 can run in parallel
- Documentation tasks T098-T101 can run in parallel

**Phase 7 (US5)**:
- All subsystem tasks can run in parallel (Auth, Jobs, Webhooks, Logging)

**Phase 8 (Polish)**:
- Tasks T139-T147 can run in parallel

---

## Parallel Example: User Story 3 (Backend Foundation)

```bash
# Different developers can work on these modules simultaneously:

Developer A:
Task T047-T052: "Implement Health Module"

Developer B:
Task T053-T058: "Implement Authentication Module"

Developer C:
Task T059-T066: "Setup Prisma and Database Module"

Developer D:
Task T067-T071: "Setup Redis and BullMQ"

Developer E:
Task T076-T080: "Configure Swagger Documentation"

# All modules independent, can be developed and tested in parallel
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T011) - Frontend migration
3. Complete Phase 3: User Story 1 (T012-T022) - Validate existing features
4. **STOP and VALIDATE**: Confirm all existing features work
5. Complete Phase 4: User Story 2 (T023-T046) - Establish monorepo
6. **STOP and VALIDATE**: Confirm Docker Compose works
7. Deploy/demo basic monorepo structure

**MVP Scope**: US1 + US2 = Monorepo with working frontend (zero feature regression)

### Incremental Delivery

1. MVP (US1-US2) → Monorepo with working frontend
2. Add US3 → Backend foundation with health checks and auth
3. Add US4 → Production-ready deployment configuration
4. Add US5 → Advanced backend capabilities for future features
5. Polish → Documentation and final improvements

Each increment is independently deployable and testable.

### Parallel Team Strategy

With multiple developers after Foundational phase:

1. Team completes Setup + Foundational together (T001-T011)
2. One developer handles US1 validation (T012-T022)
3. Once validated, split team:
   - Developer A: US2 Backend setup (T023-T029)
   - Developer B: US2 Docker setup (T030-T036)
   - Developer C: US2 Environment docs (T037-T039)
4. For US3, split into modules (Health, Auth, Prisma, Redis, Logging)
5. US4 and US5 can proceed in parallel (different focus areas)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Critical**: US1 must pass validation before proceeding - this confirms zero feature regression
- **Critical**: Frontend must work from /frontend directory before creating backend
- Use git mv to preserve file history during migration
- Test Docker Compose health checks at each phase
- Verify environment variables work in both development and Docker environments

---

## Task Summary

- **Total Tasks**: 150
- **Setup Phase**: 4 tasks
- **Foundational Phase**: 7 tasks (blocking)
- **User Story 1 (P1)**: 11 tasks (validation focused)
- **User Story 2 (P1)**: 24 tasks (monorepo structure)
- **User Story 3 (P2)**: 44 tasks (backend foundation)
- **User Story 4 (P2)**: 20 tasks (deployment)
- **User Story 5 (P3)**: 28 tasks (advanced features)
- **Polish Phase**: 12 tasks

**Parallel Opportunities**: 89 tasks marked [P] can run in parallel

**MVP Scope**: Phases 1-4 (User Stories 1-2) = 46 tasks for basic monorepo with validated frontend

**Suggested First Delivery**: Complete through US2 to establish working monorepo foundation
