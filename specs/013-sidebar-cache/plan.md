# Implementation Plan: Sidebar Cache with Loading Indicator

**Branch**: `013-sidebar-cache` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-sidebar-cache/spec.md`

## Summary

Implement persistent caching for the WorkspaceSidebar component to display cached projects and documents instantly on page navigation, with a visual indicator showing background refresh status. The solution leverages React Query's existing caching with localStorage persistence to ensure data survives page navigations and browser restarts.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend only)
**Primary Dependencies**: @tanstack/react-query 5.x, zustand 5.x, Next.js 16 (App Router)
**Storage**: localStorage (browser) for cache persistence
**Testing**: Manual testing (no test framework configured)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend-only changes)
**Performance Goals**: Sidebar content visible within 100ms of navigation
**Constraints**: Cache size <1MB per workspace, no additional npm dependencies
**Scale/Scope**: ~10 workspaces cached, ~50 projects per workspace max

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| III. User Experience Excellence | Loading states MUST be clear with elegant skeletons | ✅ Pass | Loading indicator next to "Projetos" |
| III. User Experience Excellence | Interactions MUST feel instant | ✅ Pass | Cache provides instant display |
| III. User Experience Excellence | Background work MUST never block the UI | ✅ Pass | Background refresh while showing cache |
| VI. Scalability & Performance | Caching MUST be used for frequently accessed data | ✅ Pass | Core feature requirement |
| VII. Testing & Quality Assurance | Type safety MUST be enforced | ✅ Pass | TypeScript interfaces for cache |

**Gate Result**: ✅ PASS - No violations

## Project Structure

### Documentation (this feature)

```text
specs/013-sidebar-cache/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   └── WorkspaceSidebar.tsx    # MODIFY: Add cache logic and loading indicator
│   ├── hooks/
│   │   ├── use-projects.ts         # MODIFY: Add persistence config
│   │   └── use-sidebar-cache.ts    # NEW: Cache management hook
│   └── lib/
│       └── sidebar-cache.ts        # NEW: localStorage persistence utilities
```

**Structure Decision**: Frontend-only feature modifying existing components and adding new cache utilities.

## Complexity Tracking

> No violations - table not needed.

---

## Phase 0: Research

### Research Tasks

1. **React Query Persistence**: Best practices for persisting React Query cache to localStorage
2. **Stale-While-Revalidate Pattern**: Implementation in React Query 5.x
3. **localStorage Limits**: Browser storage quotas and LRU eviction strategies

### Findings

See [research.md](./research.md) for detailed findings.

---

## Phase 1: Design

### Data Model

See [data-model.md](./data-model.md) for cache entity definitions.

### Contracts

No API changes required - this is a frontend-only caching layer.

### Quickstart

See [quickstart.md](./quickstart.md) for implementation guide.
