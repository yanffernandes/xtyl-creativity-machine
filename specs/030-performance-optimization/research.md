# Research: Performance Optimization

**Feature**: 030-performance-optimization
**Date**: 2026-01-25
**Status**: Complete

## Research Areas

### 1. React Query Cache Configuration

**Decision**: Configure `gcTime: 30 * 60 * 1000` (30 minutes) and `staleTime: 15000` (15 seconds) globally via QueryClient defaults.

**Rationale**:
- Default gcTime (5 minutes) is too aggressive for document-heavy workflows
- 30 minutes matches typical user session length without excessive memory use
- staleTime of 15 seconds balances freshness with reduced API calls
- Stale-while-revalidate pattern ensures cached data appears instantly

**Alternatives Considered**:
- Per-query gcTime: Rejected - adds complexity, most queries have similar access patterns
- Infinite gcTime: Rejected - memory concerns for long sessions
- Shorter staleTime (5s): Rejected - unnecessary API calls during rapid navigation

**Implementation**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 30 * 60 * 1000,  // 30 minutes
      staleTime: 15000,         // 15 seconds
      refetchOnWindowFocus: false,
    },
  },
})
```

---

### 2. Query Key Consolidation Strategy

**Decision**: Remove `documentKeys` from `use-documents.ts`, use only `queryKeys.documents` from `query-keys.ts`.

**Rationale**:
- Two separate key factories cause cache misses on invalidation
- Centralized keys enable consistent invalidation patterns
- Single source of truth reduces bugs

**Alternatives Considered**:
- Keep both, add alias: Rejected - doesn't fix invalidation issues, adds confusion
- Create new unified key system: Rejected - unnecessary rework, existing queryKeys is well-structured

**Migration Path**:
1. Update all imports to use `queryKeys` from `@/lib/query-keys`
2. Replace `documentKeys.list(projectId)` with `queryKeys.documents.byProject(projectId)`
3. Remove `documentKeys` export from `use-documents.ts`
4. Update all invalidation calls to use correct keys

---

### 3. Component Memoization Strategy

**Decision**: Apply `React.memo()` to list item components with custom comparison for complex props.

**Rationale**:
- VariationCard, StylePresetCard render in lists with 10-50+ items
- Parent state changes (modals, selections) trigger unnecessary child re-renders
- memo() with default shallow comparison sufficient for most props

**Alternatives Considered**:
- useMemo for all child props: Rejected - over-optimization, harder to maintain
- Virtualization only: Rejected - doesn't fix re-render issue, just hides it
- No memoization, rely on React Compiler: Rejected - Compiler not yet stable in production

**Pattern**:
```typescript
const VariationCard = memo(function VariationCard({
  image,
  onSelect,
  onSave
}: VariationCardProps) {
  // component implementation
}, (prevProps, nextProps) => {
  // Custom comparison only if needed for callback stability
  return prevProps.image.id === nextProps.image.id &&
         prevProps.isSelected === nextProps.isSelected
})
```

---

### 4. Zustand UI State Store Design

**Decision**: Create dedicated `ui-store.ts` for modal states and transient UI state.

**Rationale**:
- 33 useState calls in page.tsx cause cascading re-renders
- Modal open/close states don't need to persist across navigation
- Zustand selectors enable granular subscriptions (only re-render on specific state change)

**Alternatives Considered**:
- Context API: Rejected - still causes full subtree re-renders
- Jotai atoms: Rejected - adds new dependency, Zustand already in use
- Consolidate into objects with useState: Rejected - doesn't solve re-render issue

**Store Structure**:
```typescript
interface UIStore {
  // Modal states
  modals: {
    assets: boolean
    archive: boolean
    activity: boolean
    settings: boolean
    imageGenerator: boolean
    share: boolean
    attachImage: boolean
    unsavedChanges: boolean
  }
  openModal: (name: keyof UIStore['modals']) => void
  closeModal: (name: keyof UIStore['modals']) => void
  closeAllModals: () => void

  // Transient UI state
  editingTitle: string | null
  setEditingTitle: (id: string | null) => void
}
```

---

### 5. List Virtualization Library

**Decision**: Use `@tanstack/react-virtual` for image grid virtualization.

**Rationale**:
- Maintained by TanStack (same team as React Query) - consistent ecosystem
- Headless design works with any styling approach (Tailwind, styled-components)
- Supports variable-size items (different aspect ratios)
- Grid virtualization built-in (not just lists)
- Smaller bundle than react-virtualized

**Alternatives Considered**:
- react-window: Rejected - lacks grid support, would need react-window-grid addon
- react-virtualized: Rejected - larger bundle, more complex API
- CSS content-visibility: Rejected - browser support incomplete, less control

**Implementation Pattern**:
```typescript
const virtualizer = useVirtualizer({
  count: images.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 200, // estimated item height
  overscan: 5,
})
```

---

### 6. PostgreSQL Index Strategy

**Decision**: Create 5 partial composite indexes with WHERE clauses for soft-delete filtering.

**Rationale**:
- Partial indexes (WHERE deleted_at IS NULL) are smaller and faster
- Composite indexes match exact query patterns
- Column order matches filter selectivity (most selective first)

**Alternatives Considered**:
- Single-column indexes: Rejected - less efficient for multi-column filters
- Full indexes (no WHERE): Rejected - larger, includes deleted rows
- Covering indexes: Rejected - overkill for these query patterns

**Index Definitions**:
```sql
-- FR-013: Context files
CREATE INDEX CONCURRENTLY idx_documents_context
ON documents(project_id, is_context)
WHERE deleted_at IS NULL;

-- FR-014: Original image relationships
CREATE INDEX CONCURRENTLY idx_documents_original_image
ON documents(original_image_id)
WHERE deleted_at IS NULL;

-- FR-015: Reference assets
CREATE INDEX CONCURRENTLY idx_documents_reference_asset
ON documents(project_id, is_reference_asset)
WHERE deleted_at IS NULL;

-- FR-016: Attachment lookups
CREATE INDEX CONCURRENTLY idx_attachments_image
ON document_attachments(image_id);

-- FR-017: Share token lookups
CREATE INDEX CONCURRENTLY idx_documents_share_token
ON documents(share_token)
WHERE is_public = TRUE AND deleted_at IS NULL;
```

---

### 7. Redis Batch Progress Schema

**Decision**: Use Redis hashes with TTL for batch progress tracking.

**Rationale**:
- Hashes allow atomic field updates (HSET/HINCRBY)
- TTL auto-cleans abandoned batches (1 hour)
- Pub/sub can notify SSE connections of updates
- Survives server restarts unlike in-memory dict

**Alternatives Considered**:
- PostgreSQL table: Rejected - too slow for frequent updates, adds DB load
- Redis strings with JSON: Rejected - requires full read-modify-write cycle
- Redis streams: Rejected - overkill for simple progress tracking

**Key Schema**:
```
batch:{batch_id}:progress (HASH)
  - total: int
  - completed: int
  - failed: int
  - status: "pending" | "processing" | "completed" | "failed"
  - created_at: ISO timestamp
  - TTL: 3600 (1 hour)

batch:{batch_id}:images (LIST)
  - JSON objects with individual image status
  - TTL: 3600 (1 hour)
```

---

### 8. API Rate Limiting with asyncio.Semaphore

**Decision**: Use `asyncio.Semaphore(3)` to limit concurrent fal.ai requests.

**Rationale**:
- Native Python asyncio - no additional dependencies
- Semaphore provides natural queuing behavior
- Max 3 concurrent matches observed fal.ai rate limits
- Simple to implement and reason about

**Alternatives Considered**:
- aiolimiter: Rejected - adds dependency for simple use case
- Token bucket: Rejected - more complex, unnecessary for batch operations
- Queue with workers: Rejected - overkill, semaphore handles this naturally

**Implementation Pattern**:
```python
semaphore = asyncio.Semaphore(3)

async def generate_with_limit(params):
    async with semaphore:
        return await call_fal_api(params)

# Usage in batch
results = await asyncio.gather(*[
    generate_with_limit(p) for p in batch_params
])
```

---

### 9. Async Thumbnail Generation

**Decision**: Fire-and-forget background task for thumbnail generation using `asyncio.create_task()`.

**Rationale**:
- Thumbnail generation is CPU-bound but not blocking when offloaded
- Response can return immediately with original URL
- Background task updates document with thumbnail URL when ready
- No need for Celery/RQ - simple task is sufficient

**Alternatives Considered**:
- Celery task queue: Rejected - adds Redis dependency complexity for simple operation
- Synchronous in endpoint: Rejected - blocks response, poor UX
- Client-side generation: Rejected - inconsistent quality, increases bandwidth

**Implementation Pattern**:
```python
async def create_image_document(db, image_url, ...):
    # Create document with original URL
    doc = create_document(...)

    # Fire and forget thumbnail generation
    asyncio.create_task(
        generate_and_update_thumbnail(db, doc.id, image_url)
    )

    return doc  # Return immediately
```

---

## Summary

All technical decisions use existing dependencies where possible (React Query, Zustand, asyncio) and follow established patterns in the codebase. New dependencies are minimal:
- `@tanstack/react-virtual` (frontend) - TanStack ecosystem, well-maintained
- `redis`/`aioredis` (backend) - Required per clarification, industry standard

No NEEDS CLARIFICATION items remain. Ready for Phase 1.
