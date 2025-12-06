# Implementation Plan: Performance Optimization

**Feature ID**: 023-performance-optimization
**Date**: 2025-12-06
**Status**: Ready for Implementation

---

## Technical Context

### Unknowns & Clarifications

| Item | Status | Resolution |
|------|--------|------------|
| Current staleTime values in hooks | RESOLVED | Default 30s in QueryProvider, no overrides in hooks |
| Session cache race conditions | RESOLVED | Use auth state change listener to invalidate |
| Supabase JOIN syntax for nested relations | RESOLVED | Use `table(fields, nested_table(...))` syntax |
| Impact of disabling refetchOnWindowFocus | RESOLVED | Low risk - mutations still invalidate cache |

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| @tanstack/react-query | 5.x | Query caching and state management |
| @supabase/supabase-js | 2.x | Database client with relation support |
| axios | 1.x | HTTP client with interceptors |

### Integration Points

| System | Integration Type | Notes |
|--------|-----------------|-------|
| Supabase Auth | Session caching | Cache token with TTL, invalidate on auth events |
| React Query | Configuration | Global defaults + per-hook overrides |
| API Interceptor | Token injection | Use cached session instead of getSession() |

---

## Constitution Check

### Principle Compliance

| Principle | Status | Implementation |
|-----------|--------|----------------|
| III. User Experience Excellence | ✅ COMPLIANT | Performance as UX - targeting < 1s load time |
| VI. Scalability & Performance | ✅ COMPLIANT | Caching, optimized queries, reduced requests |
| VII. Testing & Quality Assurance | ✅ COMPLIANT | Manual testing checklist included |

### Performance as UX (Constitution III)

> "Initial page load MUST be under 2 seconds on 3G connection"
> "Interactions MUST feel instant (optimistic updates, prefetching)"

**Current State**: 2-4s initial load, 50-100ms overhead per request
**Target State**: < 1s initial load, < 10ms overhead per request

### Scalability & Performance (Constitution VI)

> "Caching MUST be used for frequently accessed data (Redis)"
> "Database queries MUST use indexes on frequently searched columns"

**Implementation**:
- React Query cache with appropriate staleTime per data type
- Supabase JOINs to reduce N+1 queries
- Session caching to reduce auth overhead

---

## Gate Evaluation

### Gate 1: Scope Validation ✅ PASS

- [ ] Feature aligns with constitution principles: **YES**
- [ ] No fundamental architecture changes: **YES**
- [ ] Estimated effort reasonable: **12-18 hours across 4 phases**

### Gate 2: Technical Feasibility ✅ PASS

- [ ] All dependencies available: **YES** (React Query, Supabase already in use)
- [ ] No blocking unknowns: **YES** (all clarified)
- [ ] Integration points documented: **YES**

### Gate 3: Risk Assessment ✅ PASS

| Risk | Mitigation |
|------|------------|
| Cache stale data | Mutations invalidate cache, manual refresh available |
| Auth issues with session cache | 30s TTL, invalidate on auth events |
| Regression in existing features | Phase-by-phase testing, rollback plan |

---

## Phase 0: Research Summary

### React Query Best Practices

**Decision**: Use per-hook staleTime overrides instead of global-only
**Rationale**: Different data types have different staleness tolerances
**Alternatives Considered**:
- Global staleTime only - rejected (too rigid)
- Manual caching - rejected (reinventing the wheel)

### Session Caching Pattern

**Decision**: Cache session in module-level variable with TTL
**Rationale**: Simple, no external dependencies, easy to invalidate
**Alternatives Considered**:
- Store in localStorage - rejected (sync issues)
- Store in React context - rejected (unnecessary complexity)
- Use Supabase built-in caching - rejected (doesn't prevent getSession() calls)

### Supabase Query Optimization

**Decision**: Use Supabase relation syntax for JOINs
**Rationale**: Native support, automatic type inference, single round-trip
**Alternatives Considered**:
- Multiple queries with Promise.all - rejected (still N+1 for nested)
- Raw SQL - rejected (loses ORM benefits)
- GraphQL - rejected (requires schema changes)

---

## Phase 1: Design Artifacts

### Data Model Changes

**No database schema changes required.**

This feature optimizes query patterns and caching, not data structures.

### API Contracts

**No new API endpoints required.**

Changes are client-side only:
- React Query configuration
- Supabase query patterns
- API interceptor caching

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     QueryProvider                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ staleTime: 5min | gcTime: 30min | refetchOnFocus: ✗ │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ useWorkspace  │  │ useDocuments  │  │ useTemplates  │
│ staleTime:10m │  │ staleTime:2m  │  │ staleTime:10m │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Session Cache                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ getCachedSession() - 30s TTL - invalidate on auth   │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Client                        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Optimized queries with JOINs | Specific field select│ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Query Keys Structure

```typescript
// frontend/src/lib/query-keys.ts
export const queryKeys = {
  workspaces: {
    all: ['workspaces'] as const,
    detail: (id: string) => ['workspaces', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    byWorkspace: (wsId: string) => ['projects', 'workspace', wsId] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  documents: {
    all: ['documents'] as const,
    byProject: (pId: string) => ['documents', 'project', pId] as const,
    detail: (id: string) => ['documents', id] as const,
  },
  templates: {
    all: ['templates'] as const,
    byWorkspace: (wsId: string) => ['templates', 'workspace', wsId] as const,
  },
  preferences: {
    all: ['preferences'] as const,
    byUser: (userId: string) => ['preferences', userId] as const,
  },
}
```

---

## Quickstart

### Prerequisites

- Node.js 18+
- Running frontend dev server
- Access to Supabase project

### Phase 1 Implementation (Quick Wins)

```bash
# 1. Update QueryProvider
# frontend/src/components/providers/QueryProvider.tsx

# Change from:
staleTime: 30 * 1000,
refetchOnWindowFocus: true,

# To:
staleTime: 5 * 60 * 1000,
gcTime: 30 * 60 * 1000,
refetchOnWindowFocus: false,
refetchOnReconnect: false,
retry: 1,
```

### Phase 2 Implementation (Session Cache)

```typescript
// frontend/src/lib/session-cache.ts
import { Session } from '@supabase/supabase-js'
import { supabase } from './supabase/client'

let cachedSession: { session: Session | null; timestamp: number } | null = null
const SESSION_CACHE_TTL = 30 * 1000

export async function getCachedSession(): Promise<Session | null> {
  const now = Date.now()
  if (cachedSession && (now - cachedSession.timestamp) < SESSION_CACHE_TTL) {
    return cachedSession.session
  }
  const { data: { session } } = await supabase.auth.getSession()
  cachedSession = { session, timestamp: now }
  return session
}

export function invalidateSessionCache() {
  cachedSession = null
}

// Setup auth listener
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    invalidateSessionCache()
  }
})
```

### Testing Checklist

```markdown
## Phase 1 Tests
- [ ] Switch browser tabs and return - no network requests
- [ ] Navigate between pages - cache is used
- [ ] Wait 5+ minutes inactive - data refetches on next action

## Phase 2 Tests
- [ ] Make rapid API calls - only 1 getSession in Network tab
- [ ] Login - cache is set
- [ ] Logout - cache is cleared
- [ ] Token refresh - cache is invalidated

## Phase 3 Tests
- [ ] Load project page - single query with JOINs
- [ ] Sidebar loads all projects with minimal requests
- [ ] Document list shows attachments

## Phase 4 Tests
- [ ] Create document - only that project's list invalidates
- [ ] Edit document - only that document invalidates
- [ ] Delete document - removes from cache
```

---

## Complexity Tracking

| Added Complexity | Justification |
|------------------|---------------|
| Session cache module | Reduces 50-100ms overhead per request |
| Query keys factory | Enables granular cache invalidation |
| Optimized Supabase queries | Eliminates N+1 patterns |

---

## Next Steps

1. **Generate tasks.md**: Run `/speckit.tasks` to create detailed task list
2. **Create branch**: `git checkout -b 023-performance-optimization`
3. **Implement Phase 1**: Quick wins (2-3 hours)
4. **Test and validate**: Manual testing checklist
5. **Proceed to Phase 2-4**: Incremental improvements

---

## Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Feature Spec | `/specs/023-performance-optimization/spec.md` | ✅ Complete |
| Implementation Plan | `/specs/023-performance-optimization/plan.md` | ✅ Complete |
| Tasks | `/specs/023-performance-optimization/tasks.md` | ✅ Complete |
| Research | N/A | Embedded in plan (simple feature) |
| Data Model | N/A | No schema changes |
| API Contracts | N/A | No new endpoints |
