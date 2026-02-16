# Implementation Plan: Frontend Modernization

**Branch**: `002-frontend-modernization` | **Date**: 2025-12-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-frontend-modernization/spec.md`

## Summary

Refactor the AlvoBot frontend from WeWeb-based architecture to modern feature-based Vue 3 structure. This includes:
- Migrating ~11,668 lines of WeWeb-specific code to native Vue implementations
- Consolidating 28+ HTML entry points into a single SPA with Vue Router
- Removing all WeWeb dependencies (wwLib, plugins, environment variables)
- Migrating Vuex stores to Pinia (consolidating duplicate state management)
- Reorganizing code from UUID-named components to semantic feature-based directories
- Implementing big-bang migration with comprehensive testing strategy

## Technical Context

**Language/Version**: Vue.js 3.5.13, TypeScript (configured), JavaScript ES2022+
**Primary Dependencies**:
- Vue 3.5.13 + Composition API
- Vite 6.3.5 (build tool)
- Vue Router 4.5.1 (routing)
- Pinia 3.0.2 (state management, replacing Vuex 4.1.0)
- Supabase JS 2.50.3 (database/auth)
- TipTap 2.8.0 (rich text editor)
- AG Grid Vue3 33.2.4 (data tables)
- Axios 1.12.2 (HTTP client)

**Storage**: Supabase PostgreSQL (via @supabase/supabase-js), Supabase Storage (files)
**Testing**: Manual testing checklist + automated smoke tests (framework TBD)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge - modern versions)
**Project Type**: Web application (monorepo with frontend/ and backend/)

**Performance Goals**:
- Build time: < 5 minutes (20% improvement target from SC-008)
- Page load: < 2 seconds (from DEPLOYMENT.md benchmark)
- Route transitions: < 200ms (no full page reloads per FR-003)

**Constraints**:
- Zero regression requirement (FR-012, SC-010): 100% functionality preservation
- Big-bang migration: Single release with extensive pre-release testing
- Rollback window: 24 hours post-deployment
- Staging validation required before production

**Scale/Scope**:
- Current: ~30,000+ lines of frontend code
- WeWeb code to replace: ~11,668 lines
- Features: 15+ domains (auth, tasks, articles, projects, calendar, flows, runs, settings, etc.)
- Components: 39 UUID-named custom elements + 2 sections to reorganize
- Pages: 33 route configurations to migrate
- Entry points: 28+ HTML files → 1 index.html

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASSED - No project constitution exists yet. This is the second feature (001-hybrid-architecture was foundational setup).

**Rationale**: The frontend modernization aligns with general software engineering best practices:
- Feature-based architecture improves maintainability (industry standard)
- Single SPA reduces complexity compared to 28+ entry points
- Pinia consolidation removes duplicate state management
- WeWeb removal eliminates vendor lock-in and technical debt
- Big-bang migration with testing gates ensures quality

**Re-evaluation Post-Design**: Will verify that the final architecture doesn't introduce unnecessary complexity or violate emerging project patterns from 001-hybrid-architecture.

## Project Structure

### Documentation (this feature)

```text
specs/002-frontend-modernization/
├── spec.md              # Feature specification (/speckit.specify output)
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 research (WeWeb replacement strategies)
├── data-model.md        # Phase 1 architecture design (feature structure)
├── quickstart.md        # Phase 1 migration execution guide
├── contracts/           # Phase 1 contracts (N/A for frontend refactoring)
├── checklists/          # Validation checklists
│   └── requirements.md  # Spec quality validation (completed)
└── tasks.md             # Phase 2 implementation tasks (not yet created)
```

### Source Code (repository root)

```text
# Current Structure (Before Migration)
frontend/
├── src/
│   ├── _common/              # WeWeb utilities (5,961 lines) - REMOVE
│   ├── _front/               # WeWeb runtime (3,304 lines) - REMOVE
│   ├── wwLib/                # WeWeb services (2,403 lines) - REMOVE
│   ├── components/           # UUID-named elements - REORGANIZE
│   ├── pages/                # UUID-named pages - REORGANIZE
│   ├── pinia/                # Pinia stores - KEEP & EXPAND
│   ├── store/                # Vuex stores - MIGRATE TO PINIA
│   ├── helpers/              # Utilities - REORGANIZE TO shared/
│   └── assets/               # Static assets - KEEP
├── index.html                # Main entry - KEEP
├── login/index.html          # Auth entry - REMOVE (consolidate)
├── tasks/index.html          # Tasks entry - REMOVE (consolidate)
├── articles/index.html       # Articles entry - REMOVE (consolidate)
├── [... 24+ more HTML files] # - REMOVE ALL (consolidate to single SPA)
└── package.json              # Dependencies - UPDATE

# Target Structure (After Migration)
frontend/
├── src/
│   ├── features/             # Feature-based modules (NEW)
│   │   ├── auth/             # Authentication feature
│   │   │   ├── components/   # Auth-specific components
│   │   │   ├── pages/        # Login, Signup, ForgotPassword, etc.
│   │   │   ├── stores/       # Auth Pinia store
│   │   │   ├── api/          # Auth API calls
│   │   │   └── types/        # Auth TypeScript types
│   │   ├── tasks/            # Task management
│   │   ├── articles/         # Content management
│   │   ├── projects/         # Project management
│   │   ├── calendar/         # Calendar/scheduling
│   │   ├── flows/            # Workflow automation
│   │   ├── runs/             # Execution history
│   │   ├── keywords/         # Keyword research
│   │   ├── settings/         # User settings
│   │   ├── connections/      # Integrations
│   │   ├── scraper/          # Ads transparency mining
│   │   └── users/            # User management
│   ├── shared/               # Shared across 3+ features (NEW)
│   │   ├── components/       # Reusable UI components
│   │   ├── composables/      # Vue composables
│   │   ├── utils/            # Utility functions
│   │   ├── constants/        # Global constants
│   │   └── types/            # Shared TypeScript types
│   ├── router/               # Vue Router configuration (NEW)
│   │   ├── index.ts          # Router setup
│   │   ├── routes.ts         # Route definitions
│   │   └── guards.ts         # Navigation guards
│   ├── stores/               # Global Pinia stores (NEW)
│   │   └── index.ts          # Store registration
│   ├── assets/               # Static assets (KEEP)
│   ├── App.vue               # Root component (NEW)
│   └── main.ts               # App entry point (NEW)
├── index.html                # Single SPA entry (KEEP & UPDATE)
├── ARCHITECTURE.md           # Architecture documentation (NEW)
├── .env.example              # Environment variables template (NEW)
└── package.json              # Updated dependencies

backend/
└── [unchanged - already modernized in 001-hybrid-architecture]
```

**Structure Decision**: Feature-based architecture with shared module for cross-cutting concerns. This structure was selected because:
1. Aligns with modern Vue 3 best practices (similar to Nuxt 3, Vite templates)
2. Enables clear feature isolation per User Story 1 acceptance criteria
3. Supports 3+ feature rule for shared components (clarified in Session 2025-12-04)
4. Mirrors backend NestJS structure (feature modules) for consistency
5. Simplifies onboarding (SC-007: 50% faster) and reduces merge conflicts (SC-009: 60% reduction)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations. No project-specific constitution defined yet.

---

## Phase 0: Research & Discovery

**Objective**: Resolve all unknowns about WeWeb functionality replacement and migration strategy.

### Research Tasks

1. **WeWeb Service Replacement Audit**
   - Map each wwLib service to native equivalent:
     - wwAuth → Supabase Auth direct
     - wwCollection → Pinia stores + Supabase queries
     - wwVariable → Pinia reactive state
     - wwWorkflow → Custom composables / utility functions
     - wwFormula → JavaScript utility functions
     - wwElement → Native Vue components
     - wwPageHelper → Vue Router navigation
     - wwPluginHelper → Remove or replace with native
   - Document replacement strategy for each

2. **WeWeb Plugin Migration Strategy**
   - **plugin-f9ef41c3** (Supabase): Already available via @supabase/supabase-js - DIRECT REPLACEMENT
   - **plugin-1fa0dd68** (Supabase Auth): Use Supabase Auth API directly - DIRECT REPLACEMENT
   - **plugin-9c40819b** (Charts): Keep Chart.js, remove WeWeb wrapper - WRAPPER REMOVAL
   - **plugin-832d6f7a** (Date): Use day.js directly (already in package.json) - DIRECT REPLACEMENT
   - **plugin-69d4a5bb** (NPM): Remove (just import packages directly) - DELETE
   - **plugin-2bd1c688** (REST API): Use axios directly (already in package.json) - DIRECT REPLACEMENT

3. **UUID Component Semantic Naming**
   - Audit 39 UUID-named custom elements
   - Create semantic naming map: `{UUID} → {FeatureName}Component`
   - Identify component purposes and feature assignments
   - Document cross-feature components (candidates for shared/)

4. **State Management Migration Path**
   - Map Vuex stores to Pinia equivalents:
     - `store/data` → `stores/data.ts` (Pinia)
     - `store/front` → `stores/app.ts` (Pinia)
     - `store/libraries` → Remove (WeWeb-specific)
     - `store/websiteData` → `stores/website.ts` (Pinia)
   - Document state shape transformations
   - Identify shared state vs feature-specific state

5. **Routing Consolidation Strategy**
   - Map 28+ HTML entry points to Vue Router routes
   - Identify route parameters, guards, and meta
   - Plan lazy-loaded route components for code splitting
   - Design authentication flow (redirect, guards)

6. **Testing Strategy Design**
   - Design manual testing checklist covering:
     - Auth flows (login, signup, password reset)
     - Task CRUD operations
     - Article management
     - Project management
     - Keyword mining
     - File uploads
     - Calendar operations
     - Workflow execution
   - Identify critical paths for automated smoke tests
   - Select testing framework (Vitest recommended for Vite)

### Research Deliverable

All findings documented in `research.md` with:
- Decision made
- Rationale for decision
- Alternatives considered and why rejected
- Implementation guidance

---

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete

### Deliverables

1. **data-model.md**: Frontend architecture design including:
   - Feature module structure (directory layout per feature)
   - Shared module organization
   - Component architecture patterns
   - State management architecture (Pinia store patterns)
   - Routing architecture (Vue Router setup)
   - File naming conventions
   - Import path conventions (@/ alias)

2. **contracts/** (N/A for this feature):
   - No API contracts needed (frontend refactoring only)
   - Backend API contracts already defined in 001-hybrid-architecture
   - Frontend will continue using existing backend endpoints

3. **quickstart.md**: Migration execution guide covering:
   - Pre-migration checklist (backup, branch strategy)
   - Phase-by-phase execution steps
   - WeWeb code removal sequence
   - Testing validation points
   - Rollback procedures
   - Production deployment steps

4. **Agent context update**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add frontend technologies:
     - Vue 3.5.13 (Composition API)
     - Vite 6.3.5
     - Pinia 3.0.2
     - Vue Router 4.5.1
   - Document feature-based architecture pattern

---

## Phase 2: Task Breakdown

**NOT INCLUDED IN THIS COMMAND** - Run `/speckit.tasks` after plan approval.

The tasks phase will generate `tasks.md` with:
- Dependency-ordered task list
- WeWeb audit tasks (identify all dependencies)
- Component migration tasks (UUID → semantic names)
- State migration tasks (Vuex → Pinia)
- Routing consolidation tasks (28 HTML → 1 SPA)
- Testing checklist creation tasks
- ARCHITECTURE.md documentation task
- Validation and deployment tasks

---

## Risk Assessment

### High-Risk Areas

1. **WeWeb Service Dependencies** (CRITICAL)
   - Risk: Unknown dependencies in ~11,668 lines of WeWeb code
   - Mitigation: Comprehensive audit in Phase 0, incremental testing
   - Rollback: Git tag before migration start

2. **State Management Migration** (HIGH)
   - Risk: State shape changes breaking functionality
   - Mitigation: Side-by-side Vuex/Pinia comparison, thorough testing
   - Rollback: 24-hour rollback window per Edge Case

3. **Routing Consolidation** (MEDIUM)
   - Risk: Breaking deep links or bookmarked URLs
   - Mitigation: URL compatibility layer, redirect rules
   - Rollback: Nginx/router-level fallback to old entry points

4. **Component Refactoring** (MEDIUM)
   - Risk: Breaking component contracts during reorganization
   - Mitigation: Maintain component APIs, test each component
   - Rollback: Component-level rollback if isolated issues

### Success Criteria Validation

From spec.md Success Criteria section:
- **SC-001**: File location in 10 seconds → Validated by feature/ structure
- **SC-002**: 100% feature isolation → Validated by no cross-feature imports
- **SC-003**: Zero WeWeb URLs → Validated by .env audit
- **SC-004**: One HTML file → Validated by build output
- **SC-005**: Zero Vuex dependencies → Validated by package.json
- **SC-006**: 40% faster code review → Measured post-migration
- **SC-007**: 50% faster onboarding → Measured with new developers
- **SC-008**: 20% build time improvement → Measured in CI/CD
- **SC-009**: 60% fewer merge conflicts → Measured over 3 months
- **SC-010**: Zero regressions → Validated by testing checklist + smoke tests

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Execute Phase 0**: Generate research.md (resolve unknowns)
3. **Execute Phase 1**: Generate data-model.md, quickstart.md
4. **Update agent context**: Add frontend technologies
5. **Proceed to tasks**: Run `/speckit.tasks` to generate task breakdown

**Estimated Timeline**:
- Phase 0 Research: 2-3 days (WeWeb audit, component mapping)
- Phase 1 Design: 1-2 days (architecture design, migration guide)
- Phase 2 Implementation: (determined after tasks.md generation)

**Dependencies**:
- No external dependencies (self-contained frontend refactoring)
- Backend remains unchanged (already modernized in 001)

**Blockers**:
- None identified (all tooling and frameworks already in place)
