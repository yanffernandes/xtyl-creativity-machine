/**
 * Documents Cache Utilities
 *
 * Provides localStorage persistence for project documents (Kanban).
 * Implements stale-while-revalidate pattern for instant UI updates.
 *
 * Feature: 013-sidebar-cache (extension)
 */

const CACHE_KEY = 'documents-cache-v3'
const CURRENT_VERSION = 3
const MAX_PROJECTS = 20

// ============================================================================
// Types
// ============================================================================

// V3: Cached attachment for preview thumbnails in kanban cards
export interface CachedAttachment {
  id: string
  image_id: string
  is_primary: boolean
  attachment_order: number
  image?: {
    id: string
    title: string
    file_url?: string
    thumbnail_url?: string
  }
}

export interface CachedDocument {
  id: string
  title: string
  status: string
  created_at: string
  media_type?: string
  is_context?: boolean
  is_reference_asset?: boolean
  // V2: Add thumbnail and file URLs for image previews in kanban
  thumbnail_url?: string
  file_url?: string
  image_url?: string
  // V3: Add attachments for kanban card previews
  attachments?: CachedAttachment[]
}

export interface DocumentsCacheEntry {
  projectId: string
  documents: CachedDocument[]
  timestamp: number
}

interface DocumentsCacheStorage {
  version: number
  entries: Record<string, DocumentsCacheEntry>
}

// ============================================================================
// Storage utilities
// ============================================================================

function loadStorage(): DocumentsCacheStorage {
  if (typeof window === 'undefined') {
    return { version: CURRENT_VERSION, entries: {} }
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { version: CURRENT_VERSION, entries: {} }

    const parsed = JSON.parse(raw)

    if (parsed.version !== CURRENT_VERSION) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[documents-cache] Version mismatch, clearing cache`)
      }
      localStorage.removeItem(CACHE_KEY)
      return { version: CURRENT_VERSION, entries: {} }
    }

    return parsed
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[documents-cache] Cache corrupted, clearing:', error)
    }
    localStorage.removeItem(CACHE_KEY)
    return { version: CURRENT_VERSION, entries: {} }
  }
}

function saveStorage(storage: DocumentsCacheStorage): void {
  if (typeof window === 'undefined') return

  try {
    // LRU eviction
    const entries = Object.entries(storage.entries)
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, MAX_PROJECTS)

    const trimmed: DocumentsCacheStorage = {
      version: CURRENT_VERSION,
      entries: Object.fromEntries(entries)
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      const entries = Object.entries(storage.entries)
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, MAX_PROJECTS / 2)

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          version: CURRENT_VERSION,
          entries: Object.fromEntries(entries)
        }))
      } catch {
        localStorage.removeItem(CACHE_KEY)
      }
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get cached documents for a project
 */
export function getDocumentsCache(projectId: string): CachedDocument[] | null {
  const storage = loadStorage()
  return storage.entries[projectId]?.documents || null
}

/**
 * Save documents to cache
 */
export function setDocumentsCache(projectId: string, documents: CachedDocument[]): void {
  const storage = loadStorage()
  storage.entries[projectId] = {
    projectId,
    documents,
    timestamp: Date.now()
  }
  saveStorage(storage)
}

/**
 * Clear cache for a specific project
 */
export function clearDocumentsCache(projectId: string): void {
  const storage = loadStorage()
  delete storage.entries[projectId]
  saveStorage(storage)
}

/**
 * Clear all documents cache
 */
export function clearAllDocumentsCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY)
  }
}
