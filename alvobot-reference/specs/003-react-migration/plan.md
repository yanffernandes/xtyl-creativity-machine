# Implementation Plan: React Migration

**Branch**: `003-react-migration` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-react-migration/spec.md`

## Summary

Complete migration of AlvoBot frontend from Vue.js 3 to React 18+ using a Big Bang approach. The React application will use Zustand for UI state and TanStack Query for server state/caching. All 176 Vue components across 14 feature modules will be rewritten while maintaining the existing Supabase backend integration and CSS design system. Visual enhancements will be subtle, focusing on micro-interactions and premium feel.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18.2+
**Primary Dependencies**: React, React Router v6, Zustand, TanStack Query, Tiptap React, React Flow, AG Grid React
**Storage**: Supabase PostgreSQL (unchanged), Supabase Storage for files
**Testing**: Vitest + React Testing Library (unit), Playwright (E2E)
**Target Platform**: Web (Chrome, Firefox, Safari, Edge - latest 2 versions)
**Project Type**: Web application (frontend-only migration)
**Performance Goals**: Page load <3s on 3G, 60fps interactions, route transitions <200ms
**Constraints**: Must maintain 100% API compatibility with existing Supabase queries
**Scale/Scope**: 14 feature modules, ~176 components, ~42,000 lines to migrate

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Since the constitution template is not configured for this project, we apply standard software engineering principles:

| Principle | Status | Notes |
|-----------|--------|-------|
| Feature Parity | PASS | All Vue features mapped to React equivalents |
| No Backend Changes | PASS | Supabase/NestJS remain unchanged |
| Incremental Testing | PASS | Each module testable independently |
| Code Quality | PASS | TypeScript, ESLint, Prettier enforced |

**Gate Status**: PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/003-react-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/                    # App-level setup
│   │   ├── App.tsx            # Root component
│   │   ├── main.tsx           # Entry point
│   │   ├── router.tsx         # React Router config
│   │   └── providers.tsx      # Context providers
│   │
│   ├── features/               # Feature modules (14 total)
│   │   ├── auth/
│   │   │   ├── pages/         # LoginPage, SignupPage, etc.
│   │   │   ├── components/    # Feature-specific components
│   │   │   ├── hooks/         # useAuth, useSession
│   │   │   ├── stores/        # authStore (Zustand)
│   │   │   └── api/           # TanStack Query hooks
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── articles/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── flows/
│   │   ├── runs/
│   │   ├── keywords/
│   │   ├── scraper/
│   │   ├── connections/
│   │   ├── settings/
│   │   └── users/
│   │
│   ├── shared/                 # Shared code (3+ features rule)
│   │   ├── components/        # Base components (11)
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   ├── Table/
│   │   │   ├── Select/
│   │   │   ├── Card/
│   │   │   ├── Alert/
│   │   │   ├── Spinner/
│   │   │   ├── EmptyState/
│   │   │   ├── Checkbox/
│   │   │   └── Textarea/
│   │   ├── hooks/             # Shared hooks
│   │   ├── utils/             # Helper functions
│   │   │   └── supabase.ts    # Supabase client
│   │   ├── layouts/           # MainLayout
│   │   └── types/             # Shared TypeScript types
│   │
│   └── assets/
│       ├── styles/
│       │   └── variables.css  # CSS custom properties (unchanged)
│       └── images/
│
├── tests/
│   ├── unit/                   # Vitest + RTL
│   └── e2e/                    # Playwright
│
├── package.json
├── vite.config.ts
├── tsconfig.json
└── playwright.config.ts
```

**Structure Decision**: Feature-based architecture mirroring the existing Vue structure. Each feature is self-contained with its own pages, components, hooks, stores, and API layer. Shared components follow the "3+ features" rule.

## Complexity Tracking

No constitution violations requiring justification.

## Migration Mapping

### Component Mapping (Vue → React)

| Vue Pattern | React Equivalent |
|-------------|------------------|
| `<template>` | JSX/TSX |
| `<script setup>` | Function component |
| `ref()` / `reactive()` | `useState()` |
| `computed()` | `useMemo()` |
| `watch()` / `watchEffect()` | `useEffect()` |
| `onMounted()` | `useEffect(() => {}, [])` |
| `defineProps()` | Props interface + destructuring |
| `defineEmits()` | Callback props |
| `v-if` / `v-else` | Conditional rendering `{condition && ...}` |
| `v-for` | `.map()` |
| `v-model` | `value` + `onChange` |
| `v-bind:class` | `className` with clsx/cn |
| `<slot>` | `children` prop |
| Pinia store | Zustand store |
| Vue Router | React Router v6 |

### Library Mapping

| Vue Library | React Library | Notes |
|-------------|---------------|-------|
| Pinia | Zustand | Similar API, easier migration |
| Vue Router | React Router v6 | Different API, manual migration |
| Vue Flow | React Flow | Same maintainers, similar API |
| Tiptap Vue 3 | Tiptap React | Same package, different bindings |
| AG Grid Vue | AG Grid React | Same package, different bindings |
| VueDatePicker | React DatePicker | Different library, similar features |
| Lucide Vue | Lucide React | Same icons, different package |

## Implementation Phases

### Phase 1: Foundation (P1 Features)

1. **Project Setup**
   - Initialize React + Vite + TypeScript
   - Configure path aliases matching Vue (`@/`)
   - Setup ESLint, Prettier, Vitest
   - Copy CSS variables and assets

2. **Shared Components**
   - Migrate 11 base components
   - Implement same props/variants
   - Add unit tests

3. **Auth Module**
   - Zustand auth store (mirror Pinia)
   - Supabase client setup (remove WeWeb dependency)
   - Login, Signup, ForgotPassword, ResetPassword pages
   - Route guards

4. **Layout & Navigation**
   - MainLayout with sidebar
   - React Router configuration
   - Dashboard page

### Phase 2: Core Features (P2)

5. **Projects Module**
   - ProjectsPage, ProjectDetailPage
   - CRUD operations with TanStack Query
   - Project store

6. **Articles Module**
   - ArticlesPage, ArticleEditPage
   - Tiptap React editor integration
   - Rich text with all extensions

7. **Tasks Module**
   - TasksPage
   - Task CRUD

8. **Calendar Module**
   - CalendarPage
   - Date navigation
   - Task integration

### Phase 3: Advanced Features (P3)

9. **Flows Module**
   - FlowsPage, FlowEditorPage
   - React Flow integration
   - Node types, connections

10. **Keywords Module**
    - KeywordsPage
    - Search and data display

11. **Scraper Module**
    - ScraperPage
    - Form handling

12. **Runs Module**
    - RunsPage, RunDetailPage
    - Execution history

13. **Connections Module**
    - ConnectionsPage
    - Integration management

14. **Settings & Users Modules**
    - SettingsPage
    - UsersPage (admin only)

### Phase 4: Polish & Verification

15. **Visual Enhancements**
    - Micro-interactions
    - Improved shadows
    - Subtle animations

16. **Testing & QA**
    - Complete E2E test suite
    - Cross-browser testing
    - Performance verification

17. **Deployment Preparation**
    - Build optimization
    - Final parity check
