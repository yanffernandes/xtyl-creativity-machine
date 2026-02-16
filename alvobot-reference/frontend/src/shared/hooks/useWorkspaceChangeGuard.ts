/**
 * Workspace Change Guard System
 *
 * Provides 3 layers of protection when switching workspaces:
 *
 * 1. **Registry Pattern** - Stores register themselves as workspace-dependent
 *    and get automatically reset on workspace change.
 *
 * 2. **Dirty State Detection** - Stores can register "dirty" state checkers
 *    that prevent accidental workspace switches (shows confirmation modal).
 *
 * 3. **Cleanup Effect** - A hook that runs cleanup logic (reset stores,
 *    invalidate queries) on workspace change. The page stays where it is
 *    and re-renders with fresh data from the new workspace.
 *
 * Usage:
 *
 *   // In a store file (module-level registration):
 *   workspaceDependentRegistry.register('metaAdsWizard', {
 *     reset: () => useMetaAdsWizardStore.getState().reset(),
 *     isDirty: () => useMetaAdsWizardStore.getState().currentStep !== 'articles',
 *     dirtyMessage: 'Você tem uma campanha Meta em andamento.',
 *   })
 *
 *   // In WorkspaceSwitcher:
 *   const { requestWorkspaceChange } = useWorkspaceChangeGuard()
 *   requestWorkspaceChange(workspace) // Shows confirm if dirty, then resets all
 *
 *   // In MainLayout:
 *   useWorkspaceChangeEffect() // Handles post-switch cleanup
 */

import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import type { WorkspaceWithMembership } from '@/features/workspace/types'

// ========================
// Registry for workspace-dependent stores
// ========================

interface WorkspaceDependentEntry {
  /** Reset the store to its initial state */
  reset: () => void
  /** Check if the store has unsaved/in-progress state */
  isDirty?: () => boolean
  /** User-facing message describing the dirty state */
  dirtyMessage?: string
}

class WorkspaceDependentRegistry {
  private entries = new Map<string, WorkspaceDependentEntry>()

  /**
   * Register a store as workspace-dependent.
   * Called once per store, typically at module level.
   */
  register(id: string, entry: WorkspaceDependentEntry): void {
    this.entries.set(id, entry)
  }

  /**
   * Unregister a store (rarely needed, but available for cleanup).
   */
  unregister(id: string): void {
    this.entries.delete(id)
  }

  /**
   * Reset all registered stores.
   */
  resetAll(): void {
    for (const [id, entry] of this.entries) {
      try {
        entry.reset()
      } catch (err) {
        console.warn(`[WorkspaceGuard] Failed to reset store "${id}":`, err)
      }
    }
  }

  /**
   * Check if any registered store has dirty/unsaved state.
   * Returns messages for all dirty stores.
   */
  getDirtyState(): { isDirty: boolean; messages: string[] } {
    const messages: string[] = []

    for (const entry of this.entries.values()) {
      if (entry.isDirty?.()) {
        messages.push(entry.dirtyMessage || 'Existem alterações não salvas.')
      }
    }

    return {
      isDirty: messages.length > 0,
      messages,
    }
  }
}

/** Singleton registry - import this in store files to register */
export const workspaceDependentRegistry = new WorkspaceDependentRegistry()

// ========================
// Pages that are considered "creation/editing" pages
// where workspace switching needs extra confirmation
// ========================

const WORKSPACE_SENSITIVE_ROUTES = [
  '/alvoads-meta/criar',
  '/alvoads-meta/editar',
  '/alvoads-meta/wizard',
  '/alvoads-google/wizard',
  '/alvoads-google/bulk',
  '/alvoads-google/import',
  '/alvoads-google/duplicate',
  '/flows/',
  '/base-structure',
  '/articles/',
]

/**
 * Check if the current route is a workspace-sensitive page
 * (wizard, editor, or creation page).
 */
function isOnSensitiveRoute(pathname: string): boolean {
  return WORKSPACE_SENSITIVE_ROUTES.some((route) => pathname.includes(route))
}

// ========================
// Hook: useWorkspaceChangeGuard
// Used by WorkspaceSwitcher to gate workspace changes
// ========================

interface WorkspaceChangeGuardResult {
  /**
   * Request a workspace change. If there's dirty state on a sensitive page,
   * returns `{ needsConfirmation: true, messages }` so the caller can show
   * a confirmation dialog. Otherwise, performs the switch immediately.
   */
  requestWorkspaceChange: (
    workspace: WorkspaceWithMembership
  ) => { switched: boolean; needsConfirmation: boolean; messages: string[] }

  /**
   * Confirm the workspace change after user accepted the confirmation.
   * Resets all stores and performs the switch.
   */
  confirmWorkspaceChange: (workspace: WorkspaceWithMembership) => void
}

export function useWorkspaceChangeGuard(): WorkspaceChangeGuardResult {
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace)
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id)
  const location = useLocation()

  const performSwitch = useCallback(
    (workspace: WorkspaceWithMembership) => {
      // Reset all workspace-dependent stores
      workspaceDependentRegistry.resetAll()

      // Update workspace
      setCurrentWorkspace(workspace)
      localStorage.setItem('lastWorkspaceId', workspace.id)
    },
    [setCurrentWorkspace]
  )

  const requestWorkspaceChange = useCallback(
    (workspace: WorkspaceWithMembership) => {
      // Same workspace, no-op
      if (workspace.id === currentWorkspaceId) {
        return { switched: false, needsConfirmation: false, messages: [] }
      }

      // Check if we're on a sensitive route
      const onSensitiveRoute = isOnSensitiveRoute(location.pathname)

      // Check if any store has dirty state
      const { isDirty, messages } = workspaceDependentRegistry.getDirtyState()

      // If on a sensitive route OR has dirty state, require confirmation
      if (onSensitiveRoute || isDirty) {
        const allMessages = [...messages]
        if (onSensitiveRoute && allMessages.length === 0) {
          allMessages.push('Você está em uma página de criação/edição.')
        }
        return { switched: false, needsConfirmation: true, messages: allMessages }
      }

      // No dirty state, switch immediately
      performSwitch(workspace)
      return { switched: true, needsConfirmation: false, messages: [] }
    },
    [currentWorkspaceId, location.pathname, performSwitch]
  )

  const confirmWorkspaceChange = useCallback(
    (workspace: WorkspaceWithMembership) => {
      performSwitch(workspace)
    },
    [performSwitch]
  )

  return { requestWorkspaceChange, confirmWorkspaceChange }
}

// ========================
// Hook: useWorkspaceChangeEffect
// Mounted in MainLayout to handle post-switch cleanup
// ========================

export function useWorkspaceChangeEffect() {
  const workspaceId = useWorkspaceStore((s) => s.currentWorkspace?.id)
  const queryClient = useQueryClient()
  const previousWorkspaceIdRef = useRef(workspaceId)

  useEffect(() => {
    const previousId = previousWorkspaceIdRef.current
    previousWorkspaceIdRef.current = workspaceId

    // Skip on initial mount or if workspace didn't actually change
    if (!previousId || previousId === workspaceId) {
      return
    }

    // Invalidate all queries so data refetches for the new workspace.
    // The page stays where it is - stores were already reset by the registry,
    // and the query invalidation triggers re-renders with fresh data.
    queryClient.invalidateQueries()
  }, [workspaceId, queryClient])
}
