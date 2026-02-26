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
import { boardService } from '@/lib/supabase/boards'
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
  // T009 & T030: fetchProjectsWithDocs helper - OPTIMIZED with batch loading
  // ============================================================================

  /**
   * T030: Fetch documents for all projects in a SINGLE batch query
   * Replaces N requests with 1 request using fetchAllProjectsDocuments
   */
  const fetchProjectsWithDocs = useCallback(async (projectList: any[]): Promise<SidebarProject[]> => {
    if (!projectList || projectList.length === 0) return []

    try {
      // T030: Single batch query for all projects' documents
      const projectIds = projectList.map(p => p.id)
      const [
        { data: allDocs, error: docsError },
        { data: allBoards, error: boardsError }
      ] = await Promise.all([
        documentService.fetchAllProjectsDocuments(projectIds),
        boardService.fetchAllProjectsBoards(projectIds)
      ])

      if (docsError) {
        console.warn('Failed to batch fetch documents:', docsError)
      }
      if (boardsError) {
        console.warn('Failed to batch fetch boards:', boardsError)
      }

      // Map projects with their documents
      return projectList.map(project => {
        const projectDocs = allDocs?.[project.id] || []

        const documents: SidebarDocument[] = projectDocs
          .filter((doc: any) => !doc.is_reference_asset)
          .map((doc: any) => ({
            id: doc.id,
            title: doc.title,
            status: doc.status || 'draft',
            media_type: doc.media_type || 'text',
            is_reference_asset: doc.is_reference_asset,
            folder_id: (doc as any).folder_id || null,
            board_id: (doc as any).board_id || null,
            board_column_id: (doc as any).board_column_id || null,
          }))

        return {
          id: project.id,
          name: project.name,
          description: project.description || null,
          documents,
          visualAssets: [], // Visual assets can be lazy loaded if needed
          boards: (allBoards?.[project.id] || []).map(board => ({
            id: board.id,
            name: board.name,
            description: board.description,
            position: board.position,
            folder_id: board.folder_id
          }))
        }
      })
    } catch (error) {
      console.error('Error fetching projects with docs:', error)
      // Fallback: return projects with empty documents
      return projectList.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || null,
        documents: [],
        visualAssets: []
      }))
    }
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
