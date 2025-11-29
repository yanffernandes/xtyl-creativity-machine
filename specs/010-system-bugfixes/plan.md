# Implementation Plan: System Bugfixes - Pre-Launch Corrections

**Branch**: `010-system-bugfixes` | **Date**: 2025-11-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-system-bugfixes/spec.md`

## Summary

This feature addresses 6 critical bugs/improvements needed before production launch:
1. **P1**: Conversation history not being persisted/displayed
2. **P1**: Visual assets incorrectly appearing in Kanban board
3. **P2**: Activity history not displayed in UI (backend exists)
4. **P2**: Project name not syncing when Client Name is changed
5. **P2**: CommandPalette accessibility warning (missing DialogTitle)
6. **P3**: Profile page not displaying user email

Technical approach: Fix existing implementations rather than creating new systems. Most issues are filtering bugs or missing UI integrations.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, Radix UI
**Storage**: Supabase PostgreSQL (existing tables: ChatConversation, Document, ActivityLog, Project, User)
**Testing**: Manual testing (pre-launch validation)
**Target Platform**: Web application (Docker deployment)
**Project Type**: Web (frontend + backend)
**Performance Goals**: <1s response time for all fixes
**Constraints**: Must not break existing functionality
**Scale/Scope**: 6 bug fixes, estimated 10-15 file changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ Pass | Chat history persists AI interactions |
| II. API-First Architecture | ✅ Pass | Using existing REST endpoints |
| III. User Experience Excellence | ✅ Pass | Fixes improve UX (accessibility, data display) |
| IV. Production-Ready Deployments | ✅ Pass | No infrastructure changes |
| V. Data Integrity & Security | ✅ Pass | Using existing auth, no new data exposure |
| VI. Scalability & Performance | ✅ Pass | Scroll infinito with pagination |
| VII. Testing & Quality Assurance | ✅ Pass | Each fix independently testable |

## Project Structure

### Documentation (this feature)

```text
specs/010-system-bugfixes/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Codebase exploration findings
├── data-model.md        # Data model documentation
├── quickstart.md        # Quick reference for implementation
├── contracts/           # API contracts (if new endpoints needed)
│   └── api-changes.yaml
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
backend/
├── routers/
│   ├── chat.py              # [MODIFY] Save messages to ChatConversation
│   ├── conversations.py     # [MODIFY] Add list/load endpoints
│   ├── projects.py          # [MODIFY] Sync project.name with client_name
│   └── auth.py              # [VERIFY] /auth/me endpoint returns email
├── models.py                # [VERIFY] Existing models sufficient
└── schemas.py               # [MODIFY] Add conversation list schema

frontend/
├── src/
│   ├── components/
│   │   ├── CommandPalette.tsx    # [MODIFY] Add DialogTitle for accessibility
│   │   ├── KanbanBoard.tsx       # [MODIFY] Filter out is_reference_asset
│   │   ├── ChatHistory.tsx       # [CREATE] Conversation history sidebar
│   │   └── ActivityHistory.tsx   # [CREATE] Activity log display
│   ├── components/ui/
│   │   └── command.tsx           # [MODIFY] Add VisuallyHidden DialogTitle
│   └── app/workspace/[id]/
│       ├── project/[projectId]/
│       │   └── page.tsx          # [MODIFY] Integrate ChatHistory
│       └── profile/
│           └── page.tsx          # [VERIFY] Email display from user object
```

**Structure Decision**: Web application with existing frontend/backend structure. No new directories needed, only modifications to existing files and 2 new components.

## Complexity Tracking

> No Constitution Check violations. All fixes align with existing patterns.

| Area | Complexity | Rationale |
|------|------------|-----------|
| Chat History | Medium | Requires backend save + frontend UI |
| Kanban Filter | Low | Single line filter addition |
| Activity UI | Medium | New component, existing API |
| Project Sync | Low | Backend logic change |
| Accessibility | Low | Add VisuallyHidden component |
| Profile Email | Low | Verify endpoint, may be working |
