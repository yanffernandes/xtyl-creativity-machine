# Tasks: Production Infrastructure Migration

**Input**: Design documents from `/specs/006-production-infrastructure/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - manual integration testing via health checks and quickstart.md validation.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/`
- **Frontend**: `frontend/src/`
- **Root**: Repository root for Docker/env files

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment configuration and documentation for production deployment

- [x] T001 Create .env.production.example with all required variables at repository root
- [x] T002 [P] Add boto3 to backend/requirements.txt for R2 S3-compatible storage
- [x] T003 [P] Add @supabase/supabase-js to frontend/package.json for auth
- [x] T004 [P] Add PyJWT to backend/requirements.txt for Supabase token validation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure changes that MUST be complete before user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create docker-compose.prod.yml with only frontend, backend, celery-worker, redis services at repository root
- [x] T006 Update backend/Dockerfile.prod to include new dependencies (boto3, PyJWT)
- [x] T007 Update frontend/Dockerfile.prod to accept NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY build args

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 5 - Database Connection to Supabase (Priority: P1) 🎯 MVP

**Goal**: Backend connects to Supabase PostgreSQL, all existing operations work unchanged

**Independent Test**: Run database migrations against Supabase and verify CRUD operations work

### Implementation for User Story 5

- [x] T008 [US5] Verify backend/database.py reads DATABASE_URL from environment (no code change if already env-based)
- [x] T009 [US5] Update backend/models.py User model: change id to UUID type, remove hashed_password and is_active columns
- [x] T010 [US5] Create Supabase migration SQL file at specs/006-production-infrastructure/contracts/user-migration.sql
- [x] T011 [US5] Validate pgvector extension works with Supabase by testing RAG service connection (MANUAL: enable pgvector in Supabase Dashboard)

**Checkpoint**: Database connection working, models compatible with Supabase

---

## Phase 4: User Story 3 - File Storage via Cloudflare R2 (Priority: P1)

**Goal**: Replace MinIO with Cloudflare R2 for all file storage operations

**Independent Test**: Upload a file via the API and verify it's accessible at R2 public URL

### Implementation for User Story 3

- [ ] T012 [US3] Create backend/storage_service.py with boto3 S3-compatible client for R2
- [ ] T013 [US3] Implement upload_file function in backend/storage_service.py returning public URL
- [ ] T014 [US3] Implement download_file function in backend/storage_service.py
- [ ] T015 [US3] Implement delete_file function in backend/storage_service.py
- [ ] T016 [US3] Implement list_files function in backend/storage_service.py
- [ ] T017 [US3] Update backend/image_generation_service.py to use storage_service instead of minio_service
- [ ] T018 [US3] Update backend/rag_service.py to use storage_service instead of minio_service
- [ ] T019 [US3] Update backend/routers/visual_assets.py to use storage_service instead of minio_service
- [ ] T020 [US3] Update backend/routers/chat.py to use storage_service instead of minio_service
- [ ] T021 [US3] Update backend/main.py to remove MinIO initialization, add R2 config validation
- [ ] T022 [US3] Delete backend/minio_service.py (replaced by storage_service.py)

**Checkpoint**: All file operations use R2, MinIO code removed

---

## Phase 5: User Story 2 - User Authentication via Supabase (Priority: P1)

**Goal**: Frontend uses Supabase Auth SDK for all authentication flows

**Independent Test**: Register new user, login, logout, and request password reset via frontend

### Implementation for User Story 2

- [ ] T023 [US2] Create frontend/src/lib/supabase.ts with Supabase client initialization
- [ ] T024 [US2] Update frontend/src/lib/store.ts to use Supabase session instead of custom token storage
- [ ] T025 [US2] Update frontend/src/lib/api.ts to get access token from Supabase session
- [ ] T026 [US2] Rewrite frontend/src/app/login/page.tsx to use Supabase Auth signInWithPassword
- [ ] T027 [US2] Rewrite frontend/src/app/register/page.tsx to use Supabase Auth signUp
- [ ] T028 [US2] Update frontend/src/app/forgot-password/page.tsx to use Supabase Auth resetPasswordForEmail
- [ ] T029 [US2] Create frontend/src/app/auth/callback/page.tsx for Supabase auth redirects
- [ ] T030 [US2] Add Supabase onAuthStateChange listener in frontend/src/lib/store.ts for session refresh

**Checkpoint**: Frontend auth fully migrated to Supabase

---

## Phase 6: User Story 4 - Backend Auth Validation (Priority: P2)

**Goal**: Backend validates Supabase JWT tokens on all protected endpoints

**Independent Test**: Send API request with valid/invalid Supabase token and verify 200/401 response

**Dependencies**: Requires User Story 2 (frontend auth) to generate valid tokens for testing

### Implementation for User Story 4

- [ ] T031 [US4] Create backend/supabase_auth.py with get_current_user dependency using PyJWT
- [ ] T032 [US4] Update backend/routers/workspaces.py to use supabase_auth.get_current_user instead of auth.get_current_user
- [ ] T033 [US4] Update backend/routers/projects.py to use supabase_auth.get_current_user
- [ ] T034 [US4] Update backend/routers/documents.py to use supabase_auth.get_current_user
- [ ] T035 [US4] Update backend/routers/chat.py to use supabase_auth.get_current_user
- [ ] T036 [US4] Update backend/routers/workflows.py to use supabase_auth.get_current_user
- [ ] T037 [US4] Update backend/routers/executions.py to use supabase_auth.get_current_user
- [ ] T038 [US4] Update backend/routers/visual_assets.py to use supabase_auth.get_current_user
- [ ] T039 [US4] Update backend/routers/preferences.py to use supabase_auth.get_current_user
- [ ] T040 [US4] Delete backend/routers/auth.py (custom auth endpoints no longer needed)
- [ ] T041 [US4] Delete backend/auth.py (custom JWT implementation replaced)
- [ ] T042 [US4] Update backend/main.py to remove auth router, add SUPABASE_JWT_SECRET validation

**Checkpoint**: All backend endpoints validate Supabase tokens

---

## Phase 7: User Story 1 - System Deployment (Priority: P1)

**Goal**: Deploy complete system to Easypanel with all services healthy

**Independent Test**: Deploy to Easypanel, verify all health checks pass, access frontend

**Dependencies**: Requires all previous user stories complete

### Implementation for User Story 1

- [ ] T043 [US1] Update backend health check endpoint to verify Supabase DB connection in backend/main.py
- [ ] T044 [US1] Update backend health check to verify R2 connection in backend/main.py
- [ ] T045 [US1] Add environment variable validation on startup in backend/main.py for all required vars
- [ ] T046 [US1] Run Supabase trigger SQL from contracts/supabase-trigger.sql in Supabase SQL Editor
- [ ] T047 [US1] Configure Supabase Auth settings (disable email verification) via dashboard
- [ ] T048 [US1] Configure R2 bucket as public via Cloudflare dashboard
- [ ] T049 [US1] Deploy docker-compose.prod.yml to Easypanel
- [ ] T050 [US1] Verify all services healthy via Easypanel dashboard

**Checkpoint**: Production deployment complete and verified

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and validation across all stories

- [ ] T051 [P] Remove unused MINIO_* environment variables from docker-compose.yml
- [ ] T052 [P] Remove unused SECRET_KEY environment variable from docker-compose.yml
- [ ] T053 [P] Update backend/crud.py to remove password-related functions (create_user with hashing, verify_password)
- [ ] T054 [P] Update backend/schemas.py to remove password fields from UserCreate schema
- [ ] T055 Run quickstart.md validation - complete end-to-end test of deployment
- [ ] T056 Verify all acceptance scenarios from spec.md pass manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 5 (Phase 3)**: Database - can start after Foundational
- **User Story 3 (Phase 4)**: Storage - can start after Foundational, parallel with US5
- **User Story 2 (Phase 5)**: Frontend Auth - can start after Foundational, parallel with US5/US3
- **User Story 4 (Phase 6)**: Backend Auth - depends on US2 for testing tokens
- **User Story 1 (Phase 7)**: Deployment - depends on ALL previous user stories
- **Polish (Phase 8)**: Depends on US1 (deployment) complete

### User Story Dependencies

```
Setup → Foundational → ┬→ US5 (Database) ────────────────┬→ US1 (Deploy) → Polish
                       ├→ US3 (Storage)  ────────────────┤
                       └→ US2 (Frontend Auth) → US4 (Backend Auth) ─┘
```

### Parallel Opportunities

**After Foundational (Phase 2) completes:**
- US5 (Database), US3 (Storage), US2 (Frontend Auth) can run in parallel

**Within User Story 3 (Storage):**
- T012-T016 can run in parallel (storage_service.py functions)
- T017-T020 can run in parallel (updating consumers)

**Within User Story 4 (Backend Auth):**
- T032-T039 can run in parallel (updating routers)

---

## Parallel Example: Storage Migration (US3)

```bash
# Launch storage service functions in parallel:
Task: "Implement upload_file function in backend/storage_service.py"
Task: "Implement download_file function in backend/storage_service.py"
Task: "Implement delete_file function in backend/storage_service.py"
Task: "Implement list_files function in backend/storage_service.py"

# After storage_service.py complete, update consumers in parallel:
Task: "Update backend/image_generation_service.py to use storage_service"
Task: "Update backend/rag_service.py to use storage_service"
Task: "Update backend/routers/visual_assets.py to use storage_service"
Task: "Update backend/routers/chat.py to use storage_service"
```

---

## Implementation Strategy

### MVP First (Database + Storage + Auth)

1. Complete Phase 1: Setup (env file, dependencies)
2. Complete Phase 2: Foundational (docker-compose.prod.yml)
3. Complete Phase 3: US5 - Database Connection
4. Complete Phase 4: US3 - File Storage
5. Complete Phase 5: US2 - Frontend Auth
6. Complete Phase 6: US4 - Backend Auth
7. **STOP and VALIDATE**: Test all auth flows locally
8. Complete Phase 7: US1 - Deploy to Easypanel
9. Complete Phase 8: Polish

### Suggested MVP Scope

**Minimum Viable Production**: All user stories are required for production deployment.
- US5 (Database) - Required: connects to Supabase
- US3 (Storage) - Required: stores files in R2
- US2 (Frontend Auth) - Required: users can login
- US4 (Backend Auth) - Required: APIs are protected
- US1 (Deploy) - Required: runs on Easypanel

This feature is infrastructure migration - all components must work together.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Commit after each task or logical group
- Test locally before deployment (Phase 7)
- Supabase dashboard configuration (T046-T048) requires manual steps
- Avoid: modifying files being actively used, breaking existing dev environment
