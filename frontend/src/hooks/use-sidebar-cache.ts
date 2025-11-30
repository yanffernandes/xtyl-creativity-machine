/**
 * Sidebar Cache Hook
 *
 * Provides cached sidebar data with background refresh and loading state.
 * Implements stale-while-revalidate pattern for instant UI updates.
 *
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
  type SidebarProject,
  type SidebarDocument,
  type SidebarVisualAsset
} from '@/lib/sidebar-cache'

// ============================================================================
// T006: Hook skeleton with TypeScript interface
// ============================================================================

/**
 * Return type for the useSidebarCache hook
 */
export interface UseSidebarCacheResult {
  /** Cached workspace metadata */
  workspace: SidebarCacheEntry['workspace'] | null
  /** Cached projects with their documents and visual assets */
  projects: SidebarProject[]
  /** True when background refresh is in progress */
  isRefreshing: boolean
  /** True on first load when no cache exists */
  isInitialLoad: boolean
  /** Manually trigger a refresh */
  refresh: () => void
  /** Clear cache and trigger refresh (for data modifications) */
  invalidate: () => void
}

/**
 * Custom hook for managing sidebar cache with background refresh
 *
 * @param workspaceId - The workspace UUID to load sidebar data for
 * @returns Cached sidebar data, loading states, and control functions
 *
 * @example
 * ```tsx
 * const { workspace, projects, isRefreshing, invalidate } = useSidebarCache(workspaceId)
 *
 * // Show cached data immediately, spinner while refreshing
 * return (
 *   <div>
 *     <h2>{workspace?.name} {isRefreshing && <Spinner />}</h2>
 *     {projects.map(p => <Project key={p.id} project={p} />)}
 *   </div>
 * )
 * ```
 */
export function useSidebarCache(workspaceId: string): UseSidebarCacheResult {
  // ============================================================================
  // T007: Initial state loading from localStorage cache
  // ============================================================================

  // Track if component has mounted (for SSR hydration safety)
  const [hasMounted, setHasMounted] = useState(false)

  // Start with null on server, load from cache after mount on client
  const [cachedData, setCachedData] = useState<SidebarCacheEntry | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Always start with true for SSR consistency, update after mount
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Refs to prevent race conditions and infinite loops
  const isFetchingRef = useRef(false)
  const prevWorkspaceIdRef = useRef(workspaceId)

  // ============================================================================
  // T008: Background refresh logic using existing hooks
  // ============================================================================

  // Use existing React Query hooks for fresh data
  const { data: workspace, refetch: refetchWorkspace } = useWorkspace(workspaceId)
  const { data: projects, refetch: refetchProjects } = useProjects(workspaceId)

  // ============================================================================
  // T009: fetchProjectsWithDocs helper
  // ============================================================================

  /**
   * Fetch documents and visual assets for all projects in parallel
   */
  const fetchProjectsWithDocs = useCallback(async (projectList: any[]): Promise<SidebarProject[]> => {
    if (!projectList || projectList.length === 0) return []

    const projectsData = await Promise.all(
      projectList.map(async (project) => {
        try {
          // Fetch documents and assets in parallel for each project
          const [docsResult, assetsResult] = await Promise.allSettled([
            documentService.listForSidebar(project.id),
            api.get(`/projects/${project.id}/assets`)
          ])

          // Process documents
          const documents: SidebarDocument[] =
            docsResult.status === 'fulfilled' && docsResult.value.data
              ? docsResult.value.data
                  .filter((doc: any) => !doc.is_reference_asset)
                  .map((doc: any) => ({
                    id: doc.id,
                    title: doc.title,
                    status: doc.status || 'draft',
                    media_type: doc.media_type || 'text',
                    is_reference_asset: doc.is_reference_asset
                  }))
              : []

          // Process visual assets
          const visualAssets: SidebarVisualAsset[] =
            assetsResult.status === 'fulfilled'
              ? (assetsResult.value.data.assets || []).map((asset: any) => ({
                  id: asset.id,
                  title: asset.title,
                  asset_type: asset.asset_type
                }))
              : []

          return {
            id: project.id,
            name: project.name,
            description: project.description || null,
            documents,
            visualAssets
          }
        } catch {
          // On error, return project with empty arrays
          return {
            id: project.id,
            name: project.name,
            description: project.description || null,
            documents: [],
            visualAssets: []
          }
        }
      })
    )

    return projectsData
  }, [])

  // ============================================================================
  // T010 & T012: Background refresh with cache save
  // ============================================================================

  /**
   * Refresh sidebar data from the server and update cache
   */
  const refresh = useCallback(async () => {
    if (isFetchingRef.current || !workspaceId) return
    isFetchingRef.current = true
    setIsRefreshing(true)

    try {
      // Refetch fresh data from React Query
      const [workspaceResult, projectsResult] = await Promise.all([
        refetchWorkspace(),
        refetchProjects()
      ])

      const freshWorkspace = workspaceResult.data
      const freshProjects = projectsResult.data

      if (freshWorkspace && freshProjects) {
        // Fetch documents for all projects
        const projectsWithDocs = await fetchProjectsWithDocs(freshProjects)

        // Create new cache entry
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

        // Save to localStorage and update state
        setSidebarCache(newCache)
        setCachedData(newCache)
      }
    } finally {
      isFetchingRef.current = false
      setIsRefreshing(false)
      setIsInitialLoad(false)
    }
  }, [workspaceId, refetchWorkspace, refetchProjects, fetchProjectsWithDocs])

  /**
   * Clear cache and trigger refresh (use after data modifications)
   */
  const invalidate = useCallback(() => {
    clearSidebarCache(workspaceId)
    refresh()
  }, [workspaceId, refresh])

  // ============================================================================
  // SSR Hydration Safety: Load cache only after mount
  // ============================================================================

  useEffect(() => {
    // After mount, load from localStorage (client-only)
    // This runs once on mount to load initial cache state
    const cached = workspaceId ? getSidebarCache(workspaceId) : null
    setCachedData(cached)
    setIsInitialLoad(!cached)
    if (workspaceId) {
      prevWorkspaceIdRef.current = workspaceId
    }
    setHasMounted(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only once on mount - workspaceId is stable from URL params

  // ============================================================================
  // T011: Workspace change handling
  // ============================================================================

  // Handle workspace change - load new cache immediately (after initial mount)
  useEffect(() => {
    if (!hasMounted) return // Skip until mounted
    if (workspaceId !== prevWorkspaceIdRef.current) {
      prevWorkspaceIdRef.current = workspaceId
      const cached = getSidebarCache(workspaceId)
      setCachedData(cached)
      setIsInitialLoad(!cached)
    }
  }, [workspaceId, hasMounted])

  // Trigger background refresh on mount and workspace change
  useEffect(() => {
    if (!hasMounted) return // Skip until mounted
    if (workspaceId) {
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, hasMounted]) // Intentionally not including refresh to avoid loops

  // ============================================================================
  // T012: Export hook return value
  // ============================================================================

  return {
    workspace: cachedData?.workspace || null,
    projects: cachedData?.projects || [],
    isRefreshing,
    isInitialLoad,
    refresh,
    invalidate
  }
}
