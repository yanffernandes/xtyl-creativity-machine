# Implementation Plan: Admin Panel

**Branch**: `015-admin-panel` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-admin-panel/spec.md`

## Summary

Create a comprehensive Admin Panel for system administrators to:
1. **Configure all AI models** used across the system (chat, embeddings, vision, image generation, auto-naming) - eliminating all hardcoded model configurations
2. **Manage users and workspaces** with full CRUD operations, statistics, and blocking capabilities
3. **Monitor system health** via a dashboard with usage metrics and alerts
4. **Control system settings** including global limits, feature flags, and API key management

The implementation extends the existing FastAPI/Next.js stack with new database tables, a dedicated `/admin` route with role-based access control via `super_admin` flag.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Pydantic (Backend); Next.js 14, React 18, Shadcn/UI, Tailwind CSS (Frontend)
**Storage**: Supabase PostgreSQL with pgvector extension; JSONB for flexible configurations
**Testing**: Manual testing (following existing codebase pattern)
**Target Platform**: Web application (Docker-based deployment)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Dashboard loads <3s (SC-005); Model config changes apply immediately (SC-002)
**Constraints**: Zero hardcoded model values (SC-003); All admin actions audited (SC-006)
**Scale/Scope**: System-wide admin panel with 5 main sections; ~15 new API endpoints; ~8 new pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. AI-First Development ✅
- [x] AI capabilities as first-class citizens → Model configuration is the PRIMARY feature
- [x] AI services gracefully handle API failures → Fallback model system (FR-013a, FR-013b)
- [x] AI-generated content integrates with editor workflows → No change to existing integration

### II. API-First Architecture ✅
- [x] Backend APIs define the contract → New `/admin/*` endpoints with clear schemas
- [x] All business logic in backend services → Admin service layer for all operations
- [x] API contracts stable and versioned → RESTful endpoints with Pydantic schemas
- [x] OpenAPI documentation → FastAPI auto-generates `/docs`

### III. User Experience Excellence ✅
- [x] Premium visual design → Uses existing glassmorphism design system
- [x] Progressive complexity → Basic users never see admin; admin UI is power-user focused
- [x] Loading states → Dashboard with skeleton loaders and metrics animations
- [x] Error handling → User-friendly error messages (Constitution Error Standards)
- [x] Navigation intuitive → Separate `/admin` hierarchy with clear sections

### IV. Production-Ready Deployments ✅
- [x] Services use Docker → No change to Docker setup
- [x] Health check endpoints → Admin status can be part of existing `/health`
- [x] Environment variables for secrets → API keys stored via env vars

### V. Data Integrity & Security ✅
- [x] Authentication JWT-based → Extends existing Supabase Auth
- [x] Authorization enforced → New `super_admin` role with dedicated permission checks
- [x] API keys never in git → Stored in DB, protected by admin-only access
- [x] SQL injection prevented → Using SQLAlchemy ORM

### VI. Scalability & Performance ✅
- [x] Model config cached → System config loaded once, cached in memory
- [x] Dashboard queries indexed → Aggregate queries with proper indexes
- [x] Metrics async → Dashboard stats computed efficiently

### VII. Testing & Quality Assurance ⚠️
- [x] Type safety enforced → TypeScript frontend, Python type hints backend
- [x] Error handling logs → Audit log for all admin actions
- [ ] Integration tests → Manual testing (matches existing codebase pattern)

**Constitution Gate: PASS** - All critical requirements met. Testing follows existing manual pattern.

## Project Structure

### Documentation (this feature)

```text
specs/015-admin-panel/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
│   └── admin-api.yaml   # Admin API contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── models.py                    # EXTEND: Add User.is_super_admin, SystemConfig, AIModelConfig, AdminAuditLog
├── schemas.py                   # EXTEND: Add admin schemas
├── migrations/
│   └── 016_add_admin_tables.sql # NEW: Admin database schema
├── routers/
│   └── admin.py                 # NEW: Admin API endpoints
├── services/
│   ├── admin_service.py         # NEW: Admin business logic
│   └── model_config.py          # MODIFY: Read from DB instead of hardcoded
├── llm_service.py               # MODIFY: Use AIModelConfig from DB
├── image_generation_service.py  # MODIFY: Use AIModelConfig from DB
└── supabase_auth.py             # EXTEND: Add admin permission check

frontend/
├── src/app/
│   └── admin/                   # NEW: Admin UI
│       ├── layout.tsx           # Admin layout with sidebar
│       ├── page.tsx             # Dashboard (redirect or main view)
│       ├── dashboard/
│       │   └── page.tsx         # System metrics dashboard
│       ├── models/
│       │   └── page.tsx         # AI model configuration
│       ├── users/
│       │   ├── page.tsx         # User list
│       │   └── [id]/
│       │       └── page.tsx     # User details
│       ├── workspaces/
│       │   ├── page.tsx         # Workspace list
│       │   └── [id]/
│       │       └── page.tsx     # Workspace details
│       └── settings/
│           └── page.tsx         # System settings
├── src/components/admin/        # NEW: Admin-specific components
│   ├── AdminSidebar.tsx
│   ├── AdminHeader.tsx
│   ├── ModelConfigForm.tsx
│   ├── UserTable.tsx
│   ├── WorkspaceTable.tsx
│   ├── MetricsCards.tsx
│   └── AuditLogTable.tsx
├── src/hooks/
│   └── use-admin.ts             # NEW: Admin data hooks
└── src/lib/
    └── store.ts                 # EXTEND: Add is_super_admin to auth
```

**Structure Decision**: Web application (frontend + backend) using existing project structure. Admin functionality is a new module within the existing app, not a separate codebase.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
