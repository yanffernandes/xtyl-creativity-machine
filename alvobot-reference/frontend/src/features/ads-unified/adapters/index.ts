/**
 * Platform Adapters Factory
 *
 * Provides a unified interface to get platform-specific adapters
 * and combine data from multiple platforms.
 */

import { useMemo } from 'react'
import { GoogleAdsAdapter } from './GoogleAdsAdapter'
import { MetaAdsAdapter } from './MetaAdsAdapter'
import { AdapterNotAvailableError } from './types'
import type {
  AdsPlatform,
  PlatformAdapter,
  PlatformFeatures,
  UnifiedAutomationRule,
  UnifiedActionLog,
  FetchHistoryParams,
} from '../types'

// ============================================
// Adapter Registry
// ============================================

const adapters: Record<AdsPlatform, PlatformAdapter> = {
  google: GoogleAdsAdapter,
  meta: MetaAdsAdapter,
}

// ============================================
// Adapter Factory Functions
// ============================================

/**
 * Get a single platform adapter
 */
export function getAdapter(platform: AdsPlatform): PlatformAdapter {
  const adapter = adapters[platform]
  if (!adapter) {
    throw new AdapterNotAvailableError(platform)
  }
  return adapter
}

/**
 * Get multiple platform adapters
 */
export function getAdapters(platforms: AdsPlatform[]): PlatformAdapter[] {
  return platforms.map(getAdapter)
}

/**
 * Get combined features from multiple platforms
 */
export function getCombinedFeatures(platforms: AdsPlatform[]): PlatformFeatures {
  const adapterList = getAdapters(platforms)

  return {
    hasPerformance: adapterList.some((a) => a.features.hasPerformance),
    hasAutomations: adapterList.some((a) => a.features.hasAutomations),
    hasHistory: adapterList.some((a) => a.features.hasHistory),
    hasBidManagement: adapterList.some((a) => a.features.hasBidManagement),
  }
}

// ============================================
// Data Fetching Utilities
// ============================================

/**
 * Fetch automations from multiple platforms and merge results
 */
export async function fetchUnifiedAutomations(
  platforms: AdsPlatform[],
  connectionId?: string
): Promise<UnifiedAutomationRule[]> {
  const adapterList = getAdapters(platforms)

  const results = await Promise.allSettled(
    adapterList.map((adapter) => adapter.fetchAutomations(connectionId))
  )

  const automations: UnifiedAutomationRule[] = []

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      automations.push(...result.value)
    } else {
      console.error(`Failed to fetch automations from ${platforms[index]}:`, result.reason)
    }
  })

  return automations
}

/**
 * Fetch history from multiple platforms and merge results
 */
export async function fetchUnifiedHistory(
  platforms: AdsPlatform[],
  params: FetchHistoryParams
): Promise<{
  actions: UnifiedActionLog[]
  pagination: { page: number; totalPages: number; total: number }
}> {
  const adapterList = getAdapters(platforms)

  const results = await Promise.allSettled(adapterList.map((adapter) => adapter.fetchHistory(params)))

  const allActions: UnifiedActionLog[] = []
  let totalItems = 0

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allActions.push(...result.value.actions)
      totalItems += result.value.pagination.total
    } else {
      console.error(`Failed to fetch history from ${platforms[index]}:`, result.reason)
    }
  })

  // Sort by executedAt descending (most recent first)
  allActions.sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())

  // Apply pagination to merged results
  const page = params.page || 1
  const limit = params.limit || 20
  const startIndex = (page - 1) * limit
  const paginatedActions = allActions.slice(startIndex, startIndex + limit)

  return {
    actions: paginatedActions,
    pagination: {
      page,
      totalPages: Math.ceil(totalItems / limit),
      total: totalItems,
    },
  }
}

// ============================================
// React Hooks
// ============================================

/**
 * Hook to get platform adapter(s) based on selected platforms
 */
export function usePlatformAdapters(platforms: AdsPlatform[]) {
  return useMemo(
    () => ({
      adapters: getAdapters(platforms),
      features: getCombinedFeatures(platforms),
      hasBothPlatforms: platforms.length > 1,
      hasGoogle: platforms.includes('google'),
      hasMeta: platforms.includes('meta'),
    }),
    [platforms]
  )
}

// ============================================
// Re-exports
// ============================================

export { GoogleAdsAdapter } from './GoogleAdsAdapter'
export { MetaAdsAdapter } from './MetaAdsAdapter'
export * from './types'
