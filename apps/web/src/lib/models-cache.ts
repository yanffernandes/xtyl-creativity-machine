/**
 * Models Cache
 *
 * Simple localStorage cache for chat models to avoid
 * refetching on every page load.
 *
 * Ported from: frontend/src/lib/models-cache.ts
 */

export interface CachedModel {
  id: string;
  name: string;
}

const CACHE_KEY = 'xtyl_models_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getModelsCache(): CachedModel[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { models, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) return null;
    return models;
  } catch {
    return null;
  }
}

export function setModelsCache(models: CachedModel[]): void {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ models, timestamp: Date.now() })
  );
}

export function isModelsCacheStale(): boolean {
  return getModelsCache() === null;
}
