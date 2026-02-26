/**
 * Models Cache Utilities
 *
 * Provides localStorage persistence for AI models list.
 * Implements stale-while-revalidate pattern for instant UI updates.
 *
 * Feature: 013-sidebar-cache (extension)
 */

const CACHE_KEY = 'models-cache-v1'
const CURRENT_VERSION = 1
const CACHE_TTL = 1000 * 60 * 60 // 1 hour - models don't change frequently

// ============================================================================
// Types
// ============================================================================

export interface CachedModel {
  id: string
  name: string
}

interface ModelsCacheStorage {
  version: number
  models: CachedModel[]
  timestamp: number
}

// ============================================================================
// Storage utilities
// ============================================================================

function loadStorage(): ModelsCacheStorage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)

    if (parsed.version !== CURRENT_VERSION) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[models-cache] Version mismatch, clearing cache`)
      }
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return parsed
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[models-cache] Cache corrupted, clearing:', error)
    }
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

function saveStorage(storage: ModelsCacheStorage): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(storage))
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[models-cache] Failed to save:', e)
    }
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get cached models list
 */
export function getModelsCache(): CachedModel[] | null {
  const storage = loadStorage()
  if (!storage) return null

  // Check if cache is still valid (within TTL)
  const age = Date.now() - storage.timestamp
  if (age > CACHE_TTL) {
    // Cache expired, but still return it for stale-while-revalidate
    // The consumer should trigger a refresh
    return storage.models
  }

  return storage.models
}

/**
 * Check if cache is stale (expired but still usable)
 */
export function isModelsCacheStale(): boolean {
  const storage = loadStorage()
  if (!storage) return true

  const age = Date.now() - storage.timestamp
  return age > CACHE_TTL
}

/**
 * Save models to cache
 */
export function setModelsCache(models: CachedModel[]): void {
  const storage: ModelsCacheStorage = {
    version: CURRENT_VERSION,
    models,
    timestamp: Date.now()
  }
  saveStorage(storage)
}

/**
 * Clear models cache
 */
export function clearModelsCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CACHE_KEY)
  }
}
