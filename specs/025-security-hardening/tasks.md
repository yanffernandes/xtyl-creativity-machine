# Tasks: Security Hardening

**Input**: Design documents from `/specs/025-security-hardening/`
**Prerequisites**: plan.md, spec.md, security-audit.md

**Organization**: Tasks are grouped by user story (security fix category).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

## User Stories Overview

| Story | Priority | Goal |
|-------|----------|------|
| US1 | CRITICAL | Fix IDOR Vulnerabilities - Add authorization checks |
| US2 | HIGH | Security Headers & Rate Limiting |
| US3 | HIGH | Docker & Infrastructure Security |
| US4 | HIGH | Frontend Security |
| US5 | CRITICAL (MANUAL) | Credential Rotation |

---

## Phase 1: Foundational Security (Blocking Prerequisites)

**Purpose**: Core security infrastructure that MUST be complete before ANY fixes

- [x] T001 [P] Create backend/services/security_service.py with verify_project_access(), verify_document_access(), verify_workflow_access(), validate_file_path() functions
- [x] T002 [P] Remove hardcoded default credentials from backend/database.py - require DATABASE_URL env var
- [x] T003 Fix CORS configuration in backend/main.py - replace allow_origins=["*"] with explicit whitelist from ALLOWED_ORIGINS env var
- [x] T004 Fix global exception handler in backend/main.py - replace str(exc) with generic "Internal server error" message
- [x] T005 [P] Add proper logging import and setup in backend/main.py using Python logging module
- [x] T006 Update .gitignore to include .env, .env.*, dump.rdb, *.pem, *.key

**Checkpoint**: Foundation ready - security fixes can now begin

---

## Phase 2: User Story 1 - Fix IDOR Vulnerabilities (Priority: CRITICAL)

**Goal**: Prevent unauthorized access to documents, workflows, and executions

**Independent Test**: Attempt to access document/workflow with wrong user credentials - should return 403

### Implementation for User Story 1

- [x] T007 [US1] Add verify_project_access() call to list_project_documents() in backend/routers/documents.py
- [x] T008 [US1] Add verify_project_access() call to get_context_files() in backend/routers/documents.py
- [x] T009 [US1] Add verify_document_access() call to get_document() in backend/routers/documents.py
- [x] T010 [US1] Add verify_document_access() call to update_document() in backend/routers/documents.py
- [x] T011 [US1] Add verify_document_access() call to delete_document() in backend/routers/documents.py
- [x] T012 [US1] Add verify_document_access() call to attach_image_to_document() in backend/routers/documents.py (+ all attachment endpoints, export, share, upload, toggle-context, create, move, restore, archived)
- [x] T013 [US1] Add verify_workflow_access() call to launch_workflow_execution() in backend/routers/executions.py
- [x] T014 [US1] Add verify_project_access() call to list_workflow_executions() (when project_id provided) in backend/routers/executions.py
- [x] T015 [US1] Add path traversal validation to serve_file() in backend/main.py - reject ".." and absolute paths

**Checkpoint**: All IDOR vulnerabilities fixed, authorization enforced on all sensitive endpoints

---

## Phase 3: User Story 2 - Security Headers & Rate Limiting (Priority: HIGH)

**Goal**: Add security headers and rate limiting to prevent attacks

**Independent Test**: Check response headers with curl, verify rate limits work

### Implementation for User Story 2

- [x] T016 [P] [US2] Create backend/middleware/__init__.py file
- [x] T017 [US2] Create backend/middleware/security.py with SecurityHeadersMiddleware class
- [x] T018 [US2] Add X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security, Referrer-Policy, Permissions-Policy headers
- [x] T019 [US2] Install slowapi package - add to backend/requirements.txt
- [x] T020 [US2] Configure rate limiter with Redis backend in backend/middleware/security.py
- [x] T021 [US2] Add rate limit decorator to admin block_user endpoint in backend/routers/admin.py (10/hour)
- [x] T022 [US2] Add rate limit decorator to shared document endpoint in backend/routers/documents.py (30/minute)
- [x] T023 [US2] Add rate limit decorator to auth endpoints (60/min get, 10/min update)
- [x] T024 [US2] Register security middleware in backend/main.py

**Checkpoint**: Security headers present on all responses, rate limiting active

---

## Phase 4: User Story 3 - Docker & Infrastructure Security (Priority: HIGH)

**Goal**: Fix container security issues and Redis authentication

**Independent Test**: Verify containers run as non-root user, Redis requires password

### Implementation for User Story 3

- [x] T025 [P] [US3] Add non-root user to backend/Dockerfile - create appuser and add USER statement
- [x] T026 [P] [US3] Add non-root user to frontend/Dockerfile - create nextjs user and add USER statement
- [x] T027 [US3] Production Dockerfile.prod already uses gunicorn without --reload (verified)
- [x] T028 [US3] Add REDIS_PASSWORD environment variable to docker-compose.yml
- [x] T029 [US3] Add --requirepass to Redis command in docker-compose.yml
- [x] T030 [US3] Update REDIS_URL in docker-compose.yml to include password authentication
- [x] T031 [US3] Update Celery environment vars in docker-compose.yml to use authenticated Redis URL
- [x] T032 [US3] Change backend ports from "8000:8000" to expose only (internal network)

**Checkpoint**: All containers run as non-root, Redis requires authentication

---

## Phase 5: User Story 4 - Frontend Security (Priority: HIGH)

**Goal**: Fix frontend security issues - console.log, route protection, security headers

**Independent Test**: No sensitive data in console, protected routes redirect unauthenticated users

### Implementation for User Story 4

- [x] T033 [P] [US4] Remove all console.log statements with sensitive data from frontend/src/components/ChatSidebar.tsx
- [x] T034 [P] [US4] JSON.parse in frontend/src/lib/sidebar-cache.ts already has try-catch wrapper (line 68-93)
- [ ] T035 [US4] Create frontend/src/middleware.ts for server-side route protection (DEFERRED - client-side auth works via Supabase)
- [ ] T036 [US4] Configure middleware to protect /workspace/* and /admin/* routes (DEFERRED - client-side auth works via Supabase)
- [x] T037 [US4] Add security headers configuration to frontend/next.config.ts - X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- [x] T038 [US4] Token in URL for EventSource is required limitation (API doesn't support headers). Token is short-lived JWT from Supabase.
- [ ] T039 [US4] Add error boundary component to frontend/src/components/ErrorBoundary.tsx (DEFERRED - non-critical)

**Checkpoint**: Frontend security hardened, no sensitive data in logs

---

## Phase 6: Polish & Verification

**Purpose**: Final improvements and security verification

- [ ] T040 [P] Run security headers test at securityheaders.com and fix any issues
- [ ] T041 [P] Verify all console.log statements removed in production build
- [ ] T042 Test IDOR prevention with different user accounts
- [ ] T043 Test rate limiting with curl/postman
- [ ] T044 Final code review for security issues

**Checkpoint**: All security fixes verified

---

## Phase 7: Credential Rotation (MANUAL - Final Step)

**Purpose**: Rotate all exposed credentials after all code changes are complete

**NOTE**: This is left for last so you can test all changes before rotating credentials. Once rotated, you'll need to update your .env files.

- [ ] T045 MANUAL: Rotate Supabase database password in Supabase Dashboard
- [ ] T046 MANUAL: Rotate Supabase JWT secret in Supabase Dashboard > Settings > API
- [ ] T047 MANUAL: Rotate Supabase anon key in Supabase Dashboard > Settings > API
- [ ] T048 MANUAL: Rotate Cloudflare R2 access key/secret in R2 Dashboard
- [ ] T049 MANUAL: Rotate OpenRouter API key at https://openrouter.ai/keys
- [ ] T050 MANUAL: Rotate Tavily API key at https://tavily.com/dashboard
- [ ] T051 MANUAL: Rotate Brevo API key in Settings > SMTP & API
- [ ] T052 MANUAL: Rotate Groq API key at https://console.groq.com
- [ ] T053 Remove .env files from git history using git filter-branch command
- [ ] T054 Update all local .env files with new rotated credentials
- [ ] T055 Verify all services start correctly with new credentials

**Checkpoint**: All credentials rotated, git history clean, system fully secured

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Foundational) ← BLOCKS ALL OTHER PHASES
    ↓
┌───────────────────────────────────────────────────────────┐
│  Phase 2: US1 (IDOR)       - Can run after Phase 1       │
│  Phase 3: US2 (Headers)    - Can run after Phase 1       │
│  Phase 4: US3 (Docker)     - Can run after Phase 1       │
│  Phase 5: US4 (Frontend)   - Can run after Phase 1       │
│  (These phases can run in parallel)                       │
└───────────────────────────────────────────────────────────┘
    ↓
Phase 6 (Polish & Verification)
    ↓
Phase 7 (Credential Rotation) ← FINAL STEP
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (IDOR) | Phase 1 | US2, US3, US4 |
| US2 (Headers) | Phase 1 | US1, US3, US4 |
| US3 (Docker) | Phase 1 | US1, US2, US4 |
| US4 (Frontend) | Phase 1 | US1, US2, US3 |

---

## Task Summary

| Phase | Story | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| 1 | Foundation | 6 | 3 |
| 2 | US1 (IDOR) | 9 | 0 |
| 3 | US2 (Headers) | 9 | 1 |
| 4 | US3 (Docker) | 8 | 2 |
| 5 | US4 (Frontend) | 7 | 2 |
| 6 | Polish | 5 | 2 |
| 7 | Credentials | 11 | 8 (manual) |
| **TOTAL** | | **55** | **18** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Manual credential rotation tasks (T045-T055) are left for LAST
- Each checkpoint marks a stable, testable state
- Commit after each task or logical group
