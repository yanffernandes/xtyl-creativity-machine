import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerWorkspaceIdGetter } from '@/shared/utils/api'
import type { WorkspaceWithMembership } from '../types'

interface WorkspaceState {
  currentWorkspace: WorkspaceWithMembership | null
  workspaces: WorkspaceWithMembership[]
  isLoading: boolean
}

interface WorkspaceActions {
  setCurrentWorkspace: (workspace: WorkspaceWithMembership | null) => void
  setWorkspaces: (workspaces: WorkspaceWithMembership[]) => void
  setLoading: (isLoading: boolean) => void
  clearWorkspace: () => void
}

type WorkspaceStore = WorkspaceState & WorkspaceActions

const initialState: WorkspaceState = {
  currentWorkspace: null,
  workspaces: [],
  isLoading: false,
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, _get) => ({
      ...initialState,

      setCurrentWorkspace: (workspace) => {
        set({ currentWorkspace: workspace })
      },

      setWorkspaces: (workspaces) => {
        set({ workspaces })

        if (workspaces.length === 0) {
          set({ currentWorkspace: null })
          return
        }

        const state = _get()
        const currentId = state.currentWorkspace?.id

        // Check if current workspace is still valid (exists in the new list)
        const currentStillValid = currentId
          ? workspaces.some((w) => w.id === currentId)
          : false

        // If current workspace is not set or no longer valid, select one
        if (!currentStillValid) {
          // Try to find a persisted workspace ID
          const storedId = localStorage.getItem('lastWorkspaceId')
          const matched = storedId
            ? workspaces.find((w) => w.id === storedId)
            : null
          set({ currentWorkspace: matched || workspaces[0] })
        }
      },

      setLoading: (isLoading) => {
        set({ isLoading })
      },

      clearWorkspace: () => {
        set(initialState)
        localStorage.removeItem('lastWorkspaceId')
        localStorage.removeItem('workspace-storage') // Also clear persisted store
      },
    }),
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        currentWorkspace: state.currentWorkspace,
      }),
      onRehydrateStorage: () => (state) => {
        // Save last workspace ID for persistence
        if (state?.currentWorkspace?.id) {
          localStorage.setItem('lastWorkspaceId', state.currentWorkspace.id)
        }
      },
    }
  )
)

// Register workspace ID getter for ApiClient auto-injection
registerWorkspaceIdGetter(() => useWorkspaceStore.getState().currentWorkspace?.id)

// Selector hooks for convenience
export const useCurrentWorkspace = () =>
  useWorkspaceStore((state) => state.currentWorkspace)

export const useWorkspaces = () =>
  useWorkspaceStore((state) => state.workspaces)

export const useWorkspaceId = () =>
  useWorkspaceStore((state) => state.currentWorkspace?.id)

export const useWorkspaceRole = () =>
  useWorkspaceStore((state) => state.currentWorkspace?.membership?.role)

export const useIsWorkspaceAdmin = () => {
  const role = useWorkspaceStore((state) => state.currentWorkspace?.membership?.role)
  return role === 'owner' || role === 'admin'
}

export const useIsWorkspaceOwner = () => {
  const role = useWorkspaceStore((state) => state.currentWorkspace?.membership?.role)
  return role === 'owner'
}
