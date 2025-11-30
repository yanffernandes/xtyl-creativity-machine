# Research: Sidebar Cache with Loading Indicator

**Feature**: 013-sidebar-cache
**Date**: 2025-11-30

## Research Task 1: React Query Persistence

### Decision: Use Custom localStorage Persistence (not @tanstack/query-sync-storage-persister)

### Rationale

The official `@tanstack/react-query-persist-client` package requires additional dependencies and complex setup. Since our requirements are simple (persist sidebar data only, not all queries), a lightweight custom solution using localStorage is more appropriate:

1. **No new dependencies** - Uses native localStorage API
2. **Selective caching** - Only persist sidebar-related queries, not all app data
3. **Simpler implementation** - Direct control over what gets cached
4. **Smaller bundle** - No additional library code

### Alternatives Considered

| Option | Pros | Cons | Rejected Because |
|--------|------|------|------------------|
| @tanstack/react-query-persist-client | Official solution, battle-tested | New dependency, persists ALL queries, complex setup | Over-engineered for our use case |
| IndexedDB | Larger storage quota, async | More complex API, overkill for small data | Sidebar data is <100KB, localStorage sufficient |
| Zustand persist | Already using Zustand | Would duplicate React Query's job | Creates cache inconsistency |

### Implementation Approach

```typescript
// Custom persister for sidebar data only
const CACHE_KEY = 'sidebar-cache-v1'

function saveSidebarCache(workspaceId: string, data: SidebarCacheData) {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  cache[workspaceId] = { data, timestamp: Date.now() }
  // LRU eviction: keep only 10 most recent workspaces
  const entries = Object.entries(cache).sort((a, b) => b[1].timestamp - a[1].timestamp)
  const trimmed = Object.fromEntries(entries.slice(0, 10))
  localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed))
}

function loadSidebarCache(workspaceId: string): SidebarCacheData | null {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  return cache[workspaceId]?.data || null
}
```

---

## Research Task 2: Stale-While-Revalidate Pattern in React Query 5.x

### Decision: Configure `staleTime: Infinity` + `gcTime` + Manual Invalidation

### Rationale

React Query 5.x provides the stale-while-revalidate pattern out of the box through configuration:

1. **`staleTime: Infinity`** - Data is never considered stale, always shown immediately
2. **`refetchOnMount: 'always'`** - Always fetch fresh data in background when component mounts
3. **`placeholderData`** - Show cached data while fetching (from our localStorage persister)

### Key React Query 5.x Behaviors

```typescript
useQuery({
  queryKey: ['sidebar', workspaceId],
  queryFn: fetchSidebarData,
  staleTime: Infinity,           // Never auto-refetch based on staleness
  gcTime: 1000 * 60 * 60 * 24,   // Keep in memory cache for 24 hours
  refetchOnMount: 'always',      // Always background refetch on mount
  refetchOnWindowFocus: true,    // Refresh when user returns to tab
  placeholderData: (previousData) => previousData, // Show previous data while loading
})
```

### `isFetching` vs `isLoading` Distinction

- **`isLoading`**: True only when there's NO cached data and fetching
- **`isFetching`**: True whenever a fetch is in progress (even with cached data)

For our loading indicator, we use `isFetching && !isLoading` to show the spinner only during background refreshes when we already have data to display.

---

## Research Task 3: localStorage Limits and LRU Eviction

### Decision: LRU Eviction with 10 Workspace Limit, ~100KB per Workspace

### Rationale

Browser localStorage typically provides 5-10MB of storage. Our sidebar data is relatively small:

**Estimated Data Size per Workspace:**
- 50 projects × 100 bytes = 5KB
- 500 documents (10 per project) × 50 bytes = 25KB
- Metadata overhead = 5KB
- **Total: ~35KB per workspace**

With 10 workspaces cached: ~350KB total - well under localStorage limits.

### LRU Implementation

```typescript
interface CacheEntry {
  data: SidebarCacheData
  timestamp: number  // Used for LRU ordering
}

interface SidebarCacheStorage {
  [workspaceId: string]: CacheEntry
  _version: number  // For cache migration
}

function evictOldestEntries(cache: SidebarCacheStorage, maxEntries: number): SidebarCacheStorage {
  const entries = Object.entries(cache)
    .filter(([key]) => key !== '_version')
    .sort((a, b) => (b[1] as CacheEntry).timestamp - (a[1] as CacheEntry).timestamp)

  const kept = entries.slice(0, maxEntries)
  return {
    _version: cache._version,
    ...Object.fromEntries(kept)
  }
}
```

### Storage Quota Handling

```typescript
function safeSaveToLocalStorage(key: string, data: string): boolean {
  try {
    localStorage.setItem(key, data)
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      // Clear oldest entries and retry
      clearOldestWorkspaces(5)
      try {
        localStorage.setItem(key, data)
        return true
      } catch {
        return false
      }
    }
    return false
  }
}
```

---

## Summary of Decisions

| Research Area | Decision | Key Benefit |
|---------------|----------|-------------|
| Persistence | Custom localStorage | No new dependencies, selective caching |
| Stale-While-Revalidate | React Query config | Built-in support, isFetching indicator |
| Storage Limits | LRU with 10 workspace limit | Prevents quota issues, predictable memory |

## Next Steps

1. Create `frontend/src/lib/sidebar-cache.ts` with persistence utilities
2. Create `frontend/src/hooks/use-sidebar-cache.ts` hook
3. Modify `WorkspaceSidebar.tsx` to use cache and show loading indicator
