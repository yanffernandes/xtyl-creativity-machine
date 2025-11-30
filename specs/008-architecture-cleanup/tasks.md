# Tasks: Architecture Cleanup for Hybrid Supabase Migration

**Input**: Design documents from `/specs/008-architecture-cleanup/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Not required for this cleanup feature (documentation and configuration changes only)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## User Story Mapping

| Story | Priority | Description |
|-------|----------|-------------|
| US1 | P1 | Clean Development Environment Setup |
| US2 | P1 | Accurate Production Deployment |
| US3 | P2 | Clear Project History |
| US4 | P2 | Consistent Development Scripts |

---

## Phase 1: Setup (Reference Verification)

**Purpose**: Verify current state and reference files before making changes

- [x] T001 Review `docker-compose.prod.yml` to confirm it correctly reflects hybrid architecture (no changes needed - reference only)
- [x] T002 Review `.env.production.example` to confirm it has all correct Supabase/R2 variables (no changes needed - reference only)
- [x] T003 Create backup reference of current file states by noting git commit SHA: 52d36921d197cf02ce20013b453c54a251e913a5

---

## Phase 2: Foundational (Environment Templates)

**Purpose**: Update environment configuration first - this is the foundation for all other changes

**⚠️ CRITICAL**: Environment template must be correct before documentation and scripts reference it

- [x] T004 [US1] Update `.env.example` - Add Supabase configuration section with NEXT_PUBLIC_SUPABASE_URL placeholder
- [x] T005 [US1] Update `.env.example` - Add NEXT_PUBLIC_SUPABASE_ANON_KEY placeholder
- [x] T006 [US1] Update `.env.example` - Add SUPABASE_JWT_SECRET placeholder
- [x] T007 [US1] Update `.env.example` - Add Cloudflare R2 configuration section (R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET, R2_PUBLIC_URL)
- [x] T008 [US1] Update `.env.example` - Remove MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY variables entirely
- [x] T009 [US1] Update `.env.example` - Remove deprecated custom JWT auth variables (SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS)
- [x] T010 [US1] Update `.env.example` - Add section comments and reference to `.env.production.example` for production setup

**Checkpoint**: Environment template now reflects hybrid Supabase architecture

---

## Phase 3: User Story 1 - Clean Development Environment Setup (Priority: P1) 🎯 MVP

**Goal**: New developers can set up development environment without MinIO confusion

**Independent Test**: Copy `.env.example` to `.env`, run `./dev.sh setup`, verify no MinIO errors

### Docker Compose Updates for US1

- [x] T011 [P] [US1] Update `docker-compose.yml` - Remove entire `minio` service definition (lines 209-234)
- [x] T012 [P] [US1] Update `docker-compose.yml` - Remove `minio_data` volume from volumes section
- [x] T013 [US1] Update `docker-compose.yml` - Remove `minio` from backend `depends_on` section
- [x] T014 [US1] Update `docker-compose.yml` - Remove `minio` from celery-worker `depends_on` section
- [x] T015 [US1] Update `docker-compose.yml` - Remove MinIO fallback defaults from R2 environment variables (remove `:-http://minio:9000`, `:-minioadmin` defaults)
- [x] T016 [P] [US1] Update `docker-compose.dev.yml` - Remove entire `minio` service definition (lines 71-85)
- [x] T017 [P] [US1] Update `docker-compose.dev.yml` - Remove `minio_data` volume from volumes section
- [x] T018 [US1] Update `docker-compose.dev.yml` - Remove `minio` from backend `depends_on` section
- [x] T019 [US1] Update `docker-compose.dev.yml` - Remove MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY from backend environment section (lines 35-37)
- [x] T020 [US1] Update `docker-compose.dev.yml` - Add comment noting this file uses Supabase cloud services

### Documentation Updates for US1

- [x] T021 [P] [US1] Update `README.md` - Remove MinIO Console URL reference (line 34: `http://localhost:9001`)
- [x] T022 [P] [US1] Update `README.md` - Update Docker commands section to reference Supabase-first development
- [x] T023 [US1] Update `README.md` - Add Supabase setup instructions (create account, get project URL and anon key)
- [x] T024 [US1] Update `README.md` - Add reference to `.env.production.example` for production deployments
- [x] T025 [P] [US1] Update `QUICKSTART.md` - Remove any MinIO references
- [x] T026 [US1] Update `QUICKSTART.md` - Add Supabase setup steps before running application

**Checkpoint**: User Story 1 complete - new developers can set up environment without MinIO errors

---

## Phase 4: User Story 2 - Accurate Production Deployment (Priority: P1)

**Goal**: DevOps engineers can deploy using accurate documentation

**Independent Test**: Read DEPLOYMENT.md and verify all referenced services/variables match docker-compose.prod.yml

### Documentation Updates for US2

- [x] T027 [P] [US2] Update `DEPLOYMENT.md` - Remove all MinIO references from production checklist
- [x] T028 [P] [US2] Update `DEPLOYMENT.md` - Update environment variable list to match `.env.production.example`
- [x] T029 [US2] Update `DEPLOYMENT.md` - Add Cloudflare R2 setup instructions section
- [x] T030 [US2] Update `DEPLOYMENT.md` - Add Supabase project setup instructions section
- [x] T031 [US2] Update `DEPLOYMENT.md` - Verify all referenced docker services match `docker-compose.prod.yml`
- [x] T032 [P] [US2] Update `TROUBLESHOOTING.md` - Remove MinIO troubleshooting section (port 9001, MinIO connectivity)
- [x] T033 [US2] Update `TROUBLESHOOTING.md` - Add Supabase connection troubleshooting section
- [x] T034 [US2] Update `TROUBLESHOOTING.md` - Add R2 storage troubleshooting section
- [x] T035 [P] [US2] Update `WORKFLOW_SETUP.md` - Remove MinIO from prerequisites section
- [x] T036 [US2] Update `WORKFLOW_SETUP.md` - Update storage configuration references for R2

**Checkpoint**: User Story 2 complete - production deployment documentation is accurate

---

## Phase 5: User Story 3 - Clear Project History (Priority: P2)

**Goal**: Developers can identify which specifications are current vs historical

**Independent Test**: Browse specs folder and verify each spec 002-006 has clear status indicating completion/supersession

### Historical Specification Updates

- [x] T037 [P] [US3] Update `specs/002-autonomous-workflow-system/spec.md` - Change Status to "Completed", add completion date 2025-11-28, add note referencing 007 for current architecture
- [x] T038 [P] [US3] Update `specs/003-workflow-enhancement/spec.md` - Change Status to "Completed", add completion date 2025-11-28, add note referencing 007 for current architecture
- [x] T039 [P] [US3] Update `specs/004-agent-tools-enhancement/spec.md` - Change Status to "Completed", add completion date 2025-11-28, add note referencing 007 for current architecture
- [x] T040 [P] [US3] Update `specs/005-workflow-visual-redesign/spec.md` - Change Status to "Completed", add completion date 2025-11-28, add note referencing 007 for current architecture
- [x] T041 [P] [US3] Update `specs/006-production-infrastructure/spec.md` - Change Status to "Superseded", add "Superseded by: 007-hybrid-supabase-architecture" with link

**Checkpoint**: User Story 3 complete - all historical specs clearly marked

---

## Phase 6: User Story 4 - Consistent Development Scripts (Priority: P2)

**Goal**: Development scripts work without MinIO errors or confusion

**Independent Test**: Run `./dev.sh start` and verify no MinIO-related errors or service starts

### Shell Script Updates

- [x] T042 [US4] Update `dev.sh` - Remove `start_infra_legacy()` function (lines 94-105)
- [x] T043 [US4] Update `dev.sh` - Remove `stop_infra_legacy()` function (lines 107-112)
- [x] T044 [US4] Update `dev.sh` - Remove `infra-legacy` case from command handler
- [x] T045 [US4] Update `dev.sh` - Remove `infra-legacy-stop` case from command handler
- [x] T046 [US4] Update `dev.sh` - Update help text to remove legacy commands section (lines 329-331)
- [x] T047 [US4] Delete `start-dev.sh` - File is obsolete (uses MinIO architecture, `dev.sh` provides all functionality)

### Deprecation Marking

- [x] T048 [US4] Update `docker-compose.infra.yml` - Add DEPRECATED header comment at top of file explaining it's kept for historical reference only
- [x] T049 [US4] Update `docker-compose.infra.yml` - Add note that this file should not be used for new development

**Checkpoint**: User Story 4 complete - development scripts work without MinIO

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation across all stories

### Agent Context Update

- [x] T050 [P] Update `CLAUDE.md` - Update Active Technologies section to reflect Supabase + R2 instead of MinIO
- [x] T051 [P] Update `CLAUDE.md` - Remove references to deleted files (`minio_service.py`, `auth.py`, deprecated routers)
- [x] T052 Update `CLAUDE.md` - Update Storage section to reflect Cloudflare R2 for production
- [x] T053 Update `CLAUDE.md` - Update authentication section to reflect Supabase Auth

### Verification Tasks

- [x] T054 Run verification: `grep -r "minio" docker-compose.yml docker-compose.dev.yml .env.example` - Should return no results
- [x] T055 Run verification: `grep -r "MinIO\|minio\|9001" README.md QUICKSTART.md DEPLOYMENT.md TROUBLESHOOTING.md` - Should return no results (except historical context)
- [ ] T056 Run verification: `./dev.sh setup` - Should complete without MinIO errors (manual verification required)
- [ ] T057 Run verification: `./dev.sh start` - Should start Redis + backend + frontend only (manual verification required)
- [x] T058 Run verification: Check all spec files 002-006 have updated status fields

### Final Documentation

- [x] T059 Update `specs/008-architecture-cleanup/plan.md` - Mark Tasks artifact as Complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - reference verification only
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories (environment template first)
- **User Story 1 (Phase 3)**: Depends on Phase 2 - Docker compose and dev documentation
- **User Story 2 (Phase 4)**: Depends on Phase 2 - Production documentation (can parallel with US1)
- **User Story 3 (Phase 5)**: Depends on Phase 2 - Historical specs (can parallel with US1, US2)
- **User Story 4 (Phase 6)**: Depends on Phase 3 (scripts reference docker-compose changes)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - parallel with US1
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - parallel with US1, US2
- **User Story 4 (P2)**: Should start after US1 (Phase 3) completes - scripts depend on compose files

### Parallel Opportunities

Within Phase 2 (Foundational):
- T004-T010 all modify `.env.example` - execute sequentially

Within Phase 3 (US1):
- T011, T012, T016, T017 - different docker-compose files - can parallel
- T021, T022, T025 - different documentation files - can parallel

Within Phase 4 (US2):
- T027, T032, T035 - different files - can parallel

Within Phase 5 (US3):
- T037, T038, T039, T040, T041 - all different spec files - can fully parallel

Within Phase 7 (Polish):
- T050, T051 - same file (CLAUDE.md) - sequential
- T054, T055, T056, T057, T058 - verification commands - can parallel

---

## Parallel Example: User Story 3 (Historical Specs)

```bash
# Launch all spec updates in parallel (all different files):
Task: "Update specs/002-autonomous-workflow-system/spec.md - Change Status to Completed"
Task: "Update specs/003-workflow-enhancement/spec.md - Change Status to Completed"
Task: "Update specs/004-agent-tools-enhancement/spec.md - Change Status to Completed"
Task: "Update specs/005-workflow-visual-redesign/spec.md - Change Status to Completed"
Task: "Update specs/006-production-infrastructure/spec.md - Change Status to Superseded"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup (reference verification)
2. Complete Phase 2: Foundational (environment template)
3. Complete Phase 3: User Story 1 (dev environment)
4. Complete Phase 4: User Story 2 (production docs)
5. **STOP and VALIDATE**: Test dev.sh, verify documentation accuracy
6. Deploy/demo if ready (developers can now onboard correctly)

### Incremental Delivery

1. Setup + Foundational → Environment template correct
2. Add User Story 1 → Docker compose clean → Test independently
3. Add User Story 2 → Production docs accurate → Test independently
4. Add User Story 3 → Historical specs marked → Verify status fields
5. Add User Story 4 → Scripts work → Test dev.sh
6. Polish → All verification passes

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Docker compose + README/QUICKSTART)
   - Developer B: User Story 2 (DEPLOYMENT + TROUBLESHOOTING + WORKFLOW_SETUP)
   - Developer C: User Story 3 (all historical specs - highly parallel)
3. After US1: Developer A → User Story 4 (scripts)
4. All → Polish and verification

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- This is a documentation/configuration cleanup - no application code changes
- All changes should be easily reversible via git if issues found
- Verify tests (T054-T058) should pass before considering cleanup complete
- `docker-compose.infra.yml` is deprecated not deleted - preserves history
- `start-dev.sh` is deleted - fully redundant with `dev.sh`
