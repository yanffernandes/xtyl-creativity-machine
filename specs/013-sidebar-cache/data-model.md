# Data Model: Sidebar Cache

**Feature**: 013-sidebar-cache
**Date**: 2025-11-30

## Overview

This document defines the data structures for the sidebar caching feature. All data is stored client-side in localStorage - no backend changes required.

---

## Entities

### SidebarCacheEntry

Represents cached sidebar data for a single workspace.

| Field | Type | Description |
|-------|------|-------------|
| workspaceId | string | UUID of the workspace |
| workspace | WorkspaceData | Cached workspace metadata |
| projects | ProjectWithDocs[] | Cached projects with their documents |
| timestamp | number | Unix timestamp (ms) when cache was created/updated |

```typescript
interface SidebarCacheEntry {
  workspaceId: string
  workspace: {
    id: string
    name: string
    description: string | null
  }
  projects: Array<{
    id: string
    name: string
    description: string | null
    documents: Array<{
      id: string
      title: string
      status: string
      media_type: 'text' | 'image' | 'pdf'
      is_reference_asset: boolean
    }>
    visualAssets: Array<{
      id: string
      title: string
      asset_type: string
    }>
  }>
  timestamp: number
}
```

### SidebarCacheStorage

Root storage object persisted to localStorage.

| Field | Type | Description |
|-------|------|-------------|
| version | number | Cache schema version for migrations |
| entries | Record<string, SidebarCacheEntry> | Map of workspaceId → cache entry |

```typescript
interface SidebarCacheStorage {
  version: number
  entries: Record<string, SidebarCacheEntry>
}
```

### RefreshState

Runtime state tracking background refresh status (not persisted).

| Field | Type | Description |
|-------|------|-------------|
| isRefreshing | boolean | True when background fetch is in progress |
| lastRefreshAt | number \| null | Timestamp of last successful refresh |
| error | Error \| null | Error from last refresh attempt (if any) |

```typescript
interface RefreshState {
  isRefreshing: boolean
  lastRefreshAt: number | null
  error: Error | null
}
```

---

## Storage Details

### localStorage Key

```
sidebar-cache-v1
```

### Size Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Max workspaces cached | 10 | Prevent unbounded growth |
| Max projects per workspace | 50 | UI performance limit |
| Max documents per project | 20 (sidebar view) | Only sidebar-relevant fields |
| Estimated size per workspace | ~35KB | Well under 5MB localStorage limit |
| Total estimated size | ~350KB | 10 workspaces × 35KB |

### Eviction Policy

**LRU (Least Recently Used)**: When saving a new workspace cache, if the total number of cached workspaces exceeds 10, the oldest entries (by timestamp) are removed.

### Version Migration

When `version` changes, the entire cache is cleared to prevent schema mismatches.

```typescript
const CURRENT_VERSION = 1

function loadCache(): SidebarCacheStorage {
  const raw = localStorage.getItem('sidebar-cache-v1')
  if (!raw) return { version: CURRENT_VERSION, entries: {} }

  const parsed = JSON.parse(raw)
  if (parsed.version !== CURRENT_VERSION) {
    // Version mismatch - clear and start fresh
    return { version: CURRENT_VERSION, entries: {} }
  }
  return parsed
}
```

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         Page Navigation                          │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                     useSidebarCache Hook                         │
│  1. Read from localStorage (instant)                             │
│  2. Return cached data immediately                               │
│  3. Trigger background refetch                                   │
└─────────────────────────────┬────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Display cached data   │     │   Background fetch      │
│   (instant render)      │     │   (isFetching = true)   │
└─────────────────────────┘     └────────────┬────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │   On fetch complete:        │
                              │   1. Update React Query     │
                              │   2. Save to localStorage   │
                              │   3. Re-render sidebar      │
                              │   4. isFetching = false     │
                              └─────────────────────────────┘
```

---

## Relationships

```
SidebarCacheStorage
    │
    └── entries: Record<workspaceId, SidebarCacheEntry>
              │
              └── SidebarCacheEntry
                    │
                    ├── workspace (1:1)
                    │
                    └── projects (1:N)
                          │
                          ├── documents (1:N)
                          │
                          └── visualAssets (1:N)
```

---

## Validation Rules

| Rule | Validation |
|------|------------|
| workspaceId | Must be valid UUID format |
| timestamp | Must be positive integer (Unix ms) |
| version | Must match CURRENT_VERSION |
| projects.length | Max 50 per workspace |
| Cache integrity | JSON.parse must not throw |

### Corruption Handling

If cache data fails to parse or validate:
1. Clear the corrupted entry
2. Return null (trigger fresh fetch)
3. Log warning to console (dev only)
