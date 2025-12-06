# Implementation Plan: Security Hardening

**Branch**: `025-security-hardening` | **Date**: 2025-12-06 | **Spec**: [spec.md](./spec.md)
**Input**: Security Audit Report (48 vulnerabilities identified)

## Summary

This plan addresses critical security vulnerabilities identified in a comprehensive audit of the XTYL Creativity Machine. Implementation is organized by severity and dependency order.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, slowapi
**Storage**: Supabase PostgreSQL, Redis, Cloudflare R2
**Target Platform**: Linux server (Docker), Web browsers
**Project Type**: Web application (frontend + backend)

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| V. Data Integrity & Security | REQUIRES FIXES | 48 vulnerabilities identified |
| II. API-First Architecture | PARTIAL | CORS misconfigured |
| IV. Production-Ready Deployments | PARTIAL | Containers as root |

## Project Structure

### Source Code Changes

```text
backend/
├── services/
│   └── security_service.py     # NEW: Authorization helpers
├── middleware/
│   ├── __init__.py             # NEW
│   └── security.py             # NEW: Security headers, rate limiting
├── routers/
│   ├── documents.py            # FIX: Add authorization checks
│   ├── executions.py           # FIX: Add authorization checks
│   └── admin.py                # FIX: Add rate limiting
├── database.py                 # FIX: Remove hardcoded credentials
└── main.py                     # FIX: CORS, exception handler, logging

frontend/
├── src/
│   ├── middleware.ts           # NEW: Route protection
│   ├── components/
│   │   ├── ChatSidebar.tsx     # FIX: Remove console.log
│   │   └── ErrorBoundary.tsx   # NEW: Error boundary
│   ├── hooks/
│   │   └── useWorkflowExecution.ts  # FIX: Token handling
│   └── lib/
│       └── sidebar-cache.ts    # FIX: JSON.parse error handling
└── next.config.ts              # FIX: Security headers

docker/
├── Dockerfile                  # FIX: Non-root user
├── frontend/Dockerfile         # FIX: Non-root user
└── docker-compose.yml          # FIX: Redis auth, port exposure
```

## Implementation Phases

### Phase 1: Foundational Security (Blocking)

**Purpose**: Core security infrastructure that MUST be complete before other fixes.

1. **Create security_service.py**
   - `verify_project_access()` - Check user owns/is member of project
   - `verify_document_access()` - Check user has access to document's project
   - `verify_workflow_access()` - Check user has access to workflow's project
   - `validate_file_path()` - Prevent path traversal

2. **Remove hardcoded credentials** (database.py)
   - Fail-fast if DATABASE_URL not set

3. **Fix CORS configuration** (main.py)
   - Replace `allow_origins=["*"]` with whitelist
   - Use `ALLOWED_ORIGINS` environment variable

4. **Fix exception handler** (main.py)
   - Return generic "Internal server error"
   - Log actual error with proper logging

5. **Add proper logging** (main.py)
   - Setup Python logging module
   - Configure log levels

6. **Update .gitignore**
   - Add `.env`, `.env.*`, `dump.rdb`, `*.pem`, `*.key`

### Phase 2: IDOR Fixes (US1 - CRITICAL)

**Purpose**: Prevent unauthorized access to documents, workflows, executions.

7-15. Add `verify_*_access()` calls to:
   - `list_project_documents()` in documents.py
   - `get_context_files()` in documents.py
   - `get_document()` in documents.py
   - `update_document()` in documents.py
   - `delete_document()` in documents.py
   - `attach_image_to_document()` in documents.py
   - `launch_workflow_execution()` in executions.py
   - `get_workflow_results()` in executions.py
   - Add path traversal validation to `serve_file()`

### Phase 3: Security Headers & Rate Limiting (US2 - HIGH)

**Purpose**: Add security headers and rate limiting.

16-24. Security middleware:
   - Create `backend/middleware/__init__.py`
   - Create `backend/middleware/security.py`
   - Add security headers middleware
   - Install slowapi
   - Configure rate limiter with Redis
   - Add rate limits to admin endpoints
   - Add rate limits to share endpoints
   - Add rate limits to auth endpoints
   - Register middleware in main.py

### Phase 4: Docker & Infrastructure (US3 - HIGH)

**Purpose**: Harden Docker containers and Redis.

25-32. Infrastructure fixes:
   - Add non-root user to backend Dockerfile
   - Add non-root user to frontend Dockerfile
   - Remove --reload from production
   - Add REDIS_PASSWORD to docker-compose
   - Configure Redis requirepass
   - Update Redis URL with password
   - Update Celery Redis URL
   - Restrict backend ports

### Phase 5: Frontend Security (US4 - HIGH)

**Purpose**: Fix frontend security issues.

33-39. Frontend fixes:
   - Remove sensitive console.log from ChatSidebar
   - Add try-catch to JSON.parse in sidebar-cache
   - Create middleware.ts for route protection
   - Configure protected routes
   - Add security headers to next.config.ts
   - Fix token handling in useWorkflowExecution
   - Add ErrorBoundary component

### Phase 6: Credential Rotation (US5 - MANUAL)

**Purpose**: Rotate all exposed credentials.

40-50. Manual credential rotation:
   - Rotate Supabase database password
   - Rotate Supabase JWT secret
   - Rotate Supabase anon key
   - Rotate Cloudflare R2 access key
   - Rotate OpenRouter API key
   - Rotate Tavily API key
   - Rotate Brevo API key
   - Rotate Groq API key
   - Remove .env from git history
   - Update local .env files
   - Verify services work

## Dependencies

```
Phase 1 (Foundational) ← BLOCKS ALL
    ↓
Phase 2 (IDOR) ←─────────┐
    ↓                     │ Can run in parallel
Phase 3 (Headers) ←──────┤
    ↓                     │
Phase 4 (Docker) ←───────┤
    ↓                     │
Phase 5 (Frontend) ←─────┘
    ↓
Phase 6 (Credentials) ← FINAL STEP
```

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing auth | Test all endpoints after CORS changes |
| Credential rotation breaks services | Rotate one at a time, verify each |
| Rate limiting too aggressive | Start with generous limits, adjust |
| Middleware performance impact | Benchmark before/after |

## Success Criteria

### Security
- [ ] All 6 CRITICAL vulnerabilities fixed
- [ ] All 22 HIGH vulnerabilities fixed
- [ ] Security headers pass securityheaders.com test
- [ ] No credentials in git history
- [ ] IDOR prevention verified

### Testing
- [ ] Authorization tests pass
- [ ] Rate limiting tests pass
- [ ] Frontend security tests pass

---

**Next Step**: Run `/speckit.tasks` to generate detailed task list from this plan.
