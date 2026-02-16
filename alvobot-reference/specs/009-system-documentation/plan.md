# Implementation Plan: System Documentation & Improvements

**Branch**: `009-system-documentation` | **Date**: 2024-12-17 | **Spec**: [spec.md](./spec.md)
**Input**: Technical documentation from `/specs/009-system-documentation/spec.md`

**Note**: This plan addresses the improvements identified in the system documentation, focusing on completing incomplete features and fixing known issues.

## Summary

The AlvoBot 2 system documentation reveals several incomplete features and known issues that require implementation. This plan prioritizes:

1. **High Priority**: Create missing `notifications` table, implement credit system, complete Google Ads integration, implement email sending
2. **Medium Priority**: Migrate hardcoded colors to CSS variables, add Swagger documentation
3. **Low Priority**: Bundle optimization, PWA, i18n

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend & Backend)
**Primary Dependencies**:
- Frontend: React 18.2+, Vite 5.x, TanStack Query v5, Zustand 4.x
- Backend: NestJS 10.x, Passport 0.7.x, Temporal.io 1.x
**Storage**: Supabase PostgreSQL with RLS
**Testing**: Vitest (Frontend), Jest (Backend) - NEEDS IMPLEMENTATION
**Target Platform**: Web (SPA + API)
**Project Type**: web (frontend + backend monorepo)
**Performance Goals**: Standard web app performance (< 3s initial load, < 200ms API response)
**Constraints**: Must maintain RLS security model, OAuth tokens encrypted
**Scale/Scope**: Multi-tenant SaaS, 1000+ users expected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Project constitution not configured. Using default best practices:
- [x] Security: RLS policies documented and enforced
- [x] Architecture: Clear separation frontend/backend/database
- [x] Code quality: TypeScript strict mode enabled
- [ ] Testing: Test coverage NEEDS IMPLEMENTATION
- [x] Documentation: This spec provides comprehensive documentation

**Gate Status**: PASS (with testing debt acknowledged)

## Project Structure

### Documentation (this feature)

```text
specs/009-system-documentation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/                # JWT validation
│   │   ├── health/              # Health checks
│   │   ├── wordpress/           # WordPress API
│   │   ├── base-structure/      # AI generation (OpenAI)
│   │   ├── keywords/            # Keyword mining (RapidAPI)
│   │   ├── tasks/               # Task import
│   │   ├── workflows/           # Temporal workflows
│   │   ├── workspace/           # Workspace management
│   │   ├── meta/                # Meta OAuth
│   │   ├── google/              # Google OAuth (INCOMPLETE)
│   │   ├── notifications/       # Notifications (MISSING TABLE)
│   │   └── articles/            # Article operations
│   ├── common/
│   │   ├── guards/              # JwtAuthGuard
│   │   ├── decorators/          # @CurrentUser, etc
│   │   └── supabase/            # Service role client
│   └── temporal/
│       ├── worker.ts
│       ├── workflows/
│       └── activities/
└── tests/                       # NEEDS IMPLEMENTATION

frontend/
├── src/
│   ├── app/                     # App entry, routing, providers
│   ├── features/                # 25 feature modules
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── articles/
│   │   ├── arrow-articles/
│   │   ├── alvoads-meta/        # MOCK DATA
│   │   ├── settings/            # MOCK SAVE
│   │   └── [18 more features...]
│   ├── shared/
│   │   ├── components/          # 28 UI components
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   └── assets/styles/
│       └── variables.css        # 150+ CSS tokens
└── tests/                       # NEEDS IMPLEMENTATION
```

**Structure Decision**: Existing web application structure (frontend + backend) is well-organized. No structural changes needed.

## Complexity Tracking

> **No violations identified**. Existing architecture follows reasonable patterns for a multi-feature SaaS application.

## Implementation Priorities

### Priority 1: Critical Fixes (Blocking Issues)

| Issue | Location | Impact | Effort |
|-------|----------|--------|--------|
| Missing `notifications` table | Database | Backend errors | Low |
| Mock credits display | `CreateArrowArticleModal.tsx:138` | UX confusion | Medium |
| Settings save mock | `SettingsPage.tsx` | Data loss | Medium |

### Priority 2: Integration Completion

| Feature | Current State | Required Work |
|---------|---------------|---------------|
| Google Ads API | OAuth only | Implement campaign operations |
| Email sending | Not implemented | Integrate Resend/SendGrid |
| AlvoAds Meta | UI + partial API | Complete Meta Marketing API |

### Priority 3: Code Quality

| Issue | Files Affected | Effort |
|-------|----------------|--------|
| Hardcoded colors in Flow Editor | ~30 hex values | Medium |
| Sidebar color inconsistency | `#1a1a2e` | Low |
| Alert component mixed styles | Alert/ | Low |

### Priority 4: Developer Experience

| Item | Benefit | Effort |
|------|---------|--------|
| Swagger/OpenAPI docs | API discoverability | Medium |
| Test suite setup | Quality assurance | High |
| CI/CD pipeline | Deployment automation | Medium |

## Phase 0 Deliverable: research.md

Research needed for:
1. Email service selection (Resend vs SendGrid vs AWS SES)
2. Credit/subscription system architecture
3. Google Ads API integration patterns
4. Test framework setup (Vitest + Jest)

## Phase 1 Deliverables

1. **data-model.md**: Document missing tables (notifications, subscriptions, credits)
2. **contracts/**: OpenAPI spec for undocumented endpoints
3. **quickstart.md**: Development setup guide

## Next Steps

1. Run `/speckit.tasks` to generate actionable task list
2. Prioritize notification table creation (fixes backend errors)
3. Implement settings persistence (fixes data loss)
4. Complete email integration for workspace invites
