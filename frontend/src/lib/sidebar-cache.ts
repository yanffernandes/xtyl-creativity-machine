/**
 * Sidebar Cache Utilities
 *
 * Provides localStorage persistence for sidebar data with LRU eviction.
 * Feature: 013-sidebar-cache
 */

const CACHE_KEY = 'sidebar-cache-v1'
const CURRENT_VERSION = 1
const MAX_WORKSPACES = 10

// ============================================================================
// T001: Cache storage interfaces and types
// ============================================================================

export interface SidebarDocument {
  id: string
  title: string
  status: string
  media_type: 'text' | 'image' | 'pdf'
  is_reference_asset?: boolean
}

export interface SidebarVisualAsset {
  id: string
  title: string
  asset_type?: string
}

export interface SidebarProject {
  id: string
  name: string
  description: string | null
  documents: SidebarDocument[]
  visualAssets: SidebarVisualAsset[]
}

export interface SidebarCacheEntry {
  workspaceId: string
  workspace: {
    id: string
    name: string
    description: string | null
  }
  projects: SidebarProject[]
  timestamp: number
}

interface SidebarCacheStorage {
  version: number
  entries: Record<string, SidebarCacheEntry>
}

// ============================================================================
// T002: localStorage load/save utilities with JSON parsing
// ============================================================================

/**
 * Load entire cache from localStorage
 * Handles SSR, corrupted data, and version mismatches
 */
function loadStorage(): SidebarCacheStorage {
  // T030: SSR safety check
  if (typeof window === 'undefined') {
    return { version: CURRENT_VERSION, entries: {} }
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { version: CURRENT_VERSION, entries: {} }

    const parsed = JSON.parse(raw)

    // Version mismatch - clear cache for clean migration
    if (parsed.version !== CURRENT_VERSION) {
      // T029: Development mode warning
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[sidebar-cache] Version mismatch: found ${parsed.version}, expected ${CURRENT_VERSION}. Clearing cache.`)
      }
      localStorage.removeItem(CACHE_KEY)
      return { version: CURRENT_VERSION, entries: {} }
    }

    return parsed
  } catch (error) {
    // T029: Development mode warning for corruption
    if (process.env.NODE_ENV === 'development') {
      console.warn('[sidebar-cache] Cache corrupted, clearing:', error)
    }
    // Corrupted cache - clear it
    localStorage.removeItem(CACHE_KEY)
    return { version: CURRENT_VERSION, entries: {} }
  }
}

/**
 * Save cache to localStorage with LRU eviction
 */
function saveStorage(storage: SidebarCacheStorage): void {
  // T030: SSR safety check
  if (typeof window === 'undefined') return

  try {
    // T003: LRU eviction - keep only most recent workspaces
    const entries = Object.entries(storage.entries)
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, MAX_WORKSPACES)

    const trimmed: SidebarCacheStorage = {
      version: CURRENT_VERSION,
      entries: Object.fromEntries(entries)
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    // T004: Quota exceeded handling with graceful degradation
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[sidebar-cache] Quota exceeded, clearing oldest entries')
      }

      // Keep only half the entries and retry
      const entries = Object.entries(storage.entries)
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, Math.floor(MAX_WORKSPACES / 2))

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          version: CURRENT_VERSION,
          entries: Object.fromEntries(entries)
        }))
      } catch {
        // Give up - clear everything
        if (process.env.NODE_ENV === 'development') {
          console.warn('[sidebar-cache] Failed to save even after eviction, clearing all')
        }
        localStorage.removeItem(CACHE_KEY)
      }
    }
  }
}

// ============================================================================
// T005: Export public API functions
// ============================================================================

/**
 * Get cached sidebar data for a workspace
 * @param workspaceId - The workspace UUID to retrieve cache for
 * @returns Cached entry or null if not found/expired
 */
export function getSidebarCache(workspaceId: string): SidebarCacheEntry | null {
  const storage = loadStorage()
  return storage.entries[workspaceId] || null
}

/**
 * Save sidebar data to cache
 * @param entry - The cache entry to save (timestamp will be updated)
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
 * @param workspaceId - The workspace UUID to clear
 */
export function clearSidebarCache(workspaceId: string): void {
  const storage = loadStorage()
  delete storage.entries[workspaceId]
  saveStorage(storage)
}

/**
 * Clear all sidebar cache (e.g., on logout or for debugging)
 */
export function clearAllSidebarCache(): void {
  // T030: SSR safety check
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY)
  }
}
