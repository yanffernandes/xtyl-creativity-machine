# Quickstart: Sidebar Cache Implementation

**Feature**: 013-sidebar-cache
**Date**: 2025-11-30

## Overview

This guide provides step-by-step instructions for implementing the sidebar cache feature. The implementation is frontend-only and requires no backend changes.

---

## Prerequisites

- Existing React Query setup (`@tanstack/react-query`)
- WorkspaceSidebar component using `useProjects` and `useWorkspace` hooks
- TypeScript configured

---

## Implementation Steps

### Step 1: Create Cache Utilities

Create `frontend/src/lib/sidebar-cache.ts`:

```typescript
/**
 * Sidebar Cache Utilities
 *
 * Provides localStorage persistence for sidebar data with LRU eviction.
 * Feature: 013-sidebar-cache
 */

const CACHE_KEY = 'sidebar-cache-v1'
const CURRENT_VERSION = 1
const MAX_WORKSPACES = 10

export interface SidebarDocument {
  id: string
  title: string
  status: string
  media_type: 'text' | 'image' | 'pdf'
  is_reference_asset: boolean
}

export interface SidebarProject {
  id: string
  name: string
  description: string | null
  documents: SidebarDocument[]
  visualAssets: Array<{ id: string; title: string; asset_type?: string }>
}

export interface SidebarCacheEntry {
  workspaceId: string
  workspace: { id: string; name: string; description: string | null }
  projects: SidebarProject[]
  timestamp: number
}

interface SidebarCacheStorage {
  version: number
  entries: Record<string, SidebarCacheEntry>
}

// Load entire cache from localStorage
function loadStorage(): SidebarCacheStorage {
  if (typeof window === 'undefined') {
    return { version: CURRENT_VERSION, entries: {} }
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { version: CURRENT_VERSION, entries: {} }

    const parsed = JSON.parse(raw)
    if (parsed.version !== CURRENT_VERSION) {
      // Version mismatch - clear cache
      localStorage.removeItem(CACHE_KEY)
      return { version: CURRENT_VERSION, entries: {} }
    }
    return parsed
  } catch {
    // Corrupted cache - clear it
    localStorage.removeItem(CACHE_KEY)
    return { version: CURRENT_VERSION, entries: {} }
  }
}

// Save cache to localStorage with LRU eviction
function saveStorage(storage: SidebarCacheStorage): void {
  if (typeof window === 'undefined') return

  try {
    // LRU eviction: keep only most recent workspaces
    const entries = Object.entries(storage.entries)
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, MAX_WORKSPACES)

    const trimmed: SidebarCacheStorage = {
      version: CURRENT_VERSION,
      entries: Object.fromEntries(entries)
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    // Quota exceeded - clear oldest entries and retry
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      const entries = Object.entries(storage.entries)
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, MAX_WORKSPACES / 2) // Keep only half

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          version: CURRENT_VERSION,
          entries: Object.fromEntries(entries)
        }))
      } catch {
        // Give up - clear everything
        localStorage.removeItem(CACHE_KEY)
      }
    }
  }
}

/**
 * Get cached sidebar data for a workspace
 */
export function getSidebarCache(workspaceId: string): SidebarCacheEntry | null {
  const storage = loadStorage()
  return storage.entries[workspaceId] || null
}

/**
 * Save sidebar data to cache
 */
export function setSidebarCache(entry: SidebarCacheEntry): void {
  const storage = loadStorage()
  storage.entries[entry.workspaceId] = {
    ...entry,
    timestamp: Date.now()
  }
  saveStorage(storage)
}

/**
 * Clear cache for a specific workspace (e.g., after data modification)
 */
export function clearSidebarCache(workspaceId: string): void {
  const storage = loadStorage()
  delete storage.entries[workspaceId]
  saveStorage(storage)
}

/**
 * Clear all sidebar cache
 */
export function clearAllSidebarCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY)
  }
}
```

### Step 2: Create Sidebar Cache Hook

Create `frontend/src/hooks/use-sidebar-cache.ts`:

```typescript
/**
 * Sidebar Cache Hook
 *
 * Provides cached sidebar data with background refresh and loading state.
 * Feature: 013-sidebar-cache
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useProjects } from './use-projects'
import { useWorkspace } from './use-workspaces'
import { documentService } from '@/lib/supabase/documents'
import api from '@/lib/api'
import {
  getSidebarCache,
  setSidebarCache,
  clearSidebarCache,
  type SidebarCacheEntry,
  type SidebarProject
} from '@/lib/sidebar-cache'

interface UseSidebarCacheResult {
  workspace: SidebarCacheEntry['workspace'] | null
  projects: SidebarProject[]
  isRefreshing: boolean
  isInitialLoad: boolean
  refresh: () => void
  invalidate: () => void
}

export function useSidebarCache(workspaceId: string): UseSidebarCacheResult {
  // Load cached data immediately (sync)
  const [cachedData, setCachedData] = useState<SidebarCacheEntry | null>(() =>
    getSidebarCache(workspaceId)
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(!cachedData)
  const isFetchingRef = useRef(false)
  const prevWorkspaceIdRef = useRef(workspaceId)

  // React Query hooks for fresh data
  const { data: workspace, refetch: refetchWorkspace } = useWorkspace(workspaceId)
  const { data: projects, refetch: refetchProjects } = useProjects(workspaceId)

  // Fetch documents for all projects
  const fetchProjectsWithDocs = useCallback(async (projectList: any[]): Promise<SidebarProject[]> => {
    if (!projectList || projectList.length === 0) return []

    const projectsData = await Promise.all(
      projectList.map(async (project) => {
        try {
          const [docsResult, assetsResult] = await Promise.allSettled([
            documentService.listForSidebar(project.id),
            api.get(`/projects/${project.id}/assets`)
          ])

          const documents = docsResult.status === 'fulfilled' && docsResult.value.data
            ? docsResult.value.data.filter((doc: any) => !doc.is_reference_asset)
            : []

          const visualAssets = assetsResult.status === 'fulfilled'
            ? assetsResult.value.data.assets || []
            : []

          return {
            id: project.id,
            name: project.name,
            description: project.description,
            documents,
            visualAssets
          }
        } catch {
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            documents: [],
            visualAssets: []
          }
        }
      })
    )

    return projectsData
  }, [])

  // Background refresh function
  const refresh = useCallback(async () => {
    if (isFetchingRef.current || !workspaceId) return
    isFetchingRef.current = true
    setIsRefreshing(true)

    try {
      // Refetch fresh data
      const [workspaceResult, projectsResult] = await Promise.all([
        refetchWorkspace(),
        refetchProjects()
      ])

      const freshWorkspace = workspaceResult.data
      const freshProjects = projectsResult.data

      if (freshWorkspace && freshProjects) {
        const projectsWithDocs = await fetchProjectsWithDocs(freshProjects)

        const newCache: SidebarCacheEntry = {
          workspaceId,
          workspace: {
            id: freshWorkspace.id,
            name: freshWorkspace.name,
            description: freshWorkspace.description || null
          },
          projects: projectsWithDocs,
          timestamp: Date.now()
        }

        setSidebarCache(newCache)
        setCachedData(newCache)
      }
    } finally {
      isFetchingRef.current = false
      setIsRefreshing(false)
      setIsInitialLoad(false)
    }
  }, [workspaceId, refetchWorkspace, refetchProjects, fetchProjectsWithDocs])

  // Invalidate cache and trigger refresh
  const invalidate = useCallback(() => {
    clearSidebarCache(workspaceId)
    refresh()
  }, [workspaceId, refresh])

  // Handle workspace change
  useEffect(() => {
    if (workspaceId !== prevWorkspaceIdRef.current) {
      prevWorkspaceIdRef.current = workspaceId
      const cached = getSidebarCache(workspaceId)
      setCachedData(cached)
      setIsInitialLoad(!cached)
    }
  }, [workspaceId])

  // Trigger background refresh on mount and workspace change
  useEffect(() => {
    if (workspaceId) {
      refresh()
    }
  }, [workspaceId]) // Intentionally not including refresh to avoid loops

  return {
    workspace: cachedData?.workspace || null,
    projects: cachedData?.projects || [],
    isRefreshing,
    isInitialLoad,
    refresh,
    invalidate
  }
}
```

### Step 3: Update WorkspaceSidebar Component

Modify `frontend/src/components/WorkspaceSidebar.tsx`:

**Key changes:**
1. Replace direct hook calls with `useSidebarCache`
2. Add loading indicator next to "Projetos" header
3. Call `invalidate()` after data-modifying operations

```tsx
// Add import
import { useSidebarCache } from '@/hooks/use-sidebar-cache'
import { Loader2 } from 'lucide-react' // Small spinner icon

// Replace existing data fetching with:
const {
  workspace,
  projects: projectsWithDocs,
  isRefreshing,
  isInitialLoad,
  invalidate
} = useSidebarCache(workspaceId)

// Update the "Projetos" header to show loading indicator:
<div className="flex justify-between items-center mb-3 px-2">
  <div className="flex items-center gap-2">
    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
      Projetos ({filteredProjects.length})
    </h3>
    {isRefreshing && (
      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
    )}
  </div>
  {/* ... rest of header */}
</div>

// Pass invalidate to handleRefresh:
const handleRefresh = useCallback(() => {
  invalidate()
}, [invalidate])
```

---

## Testing

### Manual Test Cases

1. **Cache hit on navigation**:
   - Navigate to workspace → sidebar shows
   - Navigate away → navigate back
   - ✅ Sidebar should show instantly (no loading)
   - ✅ Spinner appears next to "Projetos" briefly

2. **Fresh workspace (no cache)**:
   - Clear localStorage
   - Navigate to workspace
   - ✅ Loading skeleton shows
   - ✅ Data appears after fetch

3. **Background refresh**:
   - Open Network tab
   - Navigate between pages in workspace
   - ✅ API calls happen but sidebar never goes blank

4. **Cache invalidation**:
   - Create new project
   - ✅ Sidebar updates and cache is refreshed

---

## Rollback

If issues arise, the feature can be disabled by:

1. Reverting `WorkspaceSidebar.tsx` to use direct hooks
2. Removing the cache hook and utilities
3. Clearing localStorage: `localStorage.removeItem('sidebar-cache-v1')`
