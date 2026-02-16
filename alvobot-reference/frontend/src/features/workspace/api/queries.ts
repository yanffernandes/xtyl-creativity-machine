import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { useWorkspaceStore } from '../stores/workspaceStore'
import type {
  WorkspacesResponse,
  WorkspaceResponse,
  MembersResponse,
  InvitationsResponse,
  InvitationDetailsResponse,
  WorkspaceWithMembership,
  WorkspaceMember,
  WorkspaceInvitation,
} from '../types'

/**
 * Fetch all workspaces for the current user
 */
export function useWorkspacesQuery() {
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces)
  const setLoading = useWorkspaceStore((state) => state.setLoading)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const query = useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: async (): Promise<WorkspaceWithMembership[]> => {
      const response = await api.get<WorkspacesResponse>('/workspaces')
      return response.workspaces
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated, // Only fetch when authenticated
  })

  // Sync with store
  useEffect(() => {
    if (query.data) {
      setWorkspaces(query.data)
    }
    setLoading(query.isLoading)
  }, [query.data, query.isLoading, setWorkspaces, setLoading])

  return query
}

/**
 * Fetch a single workspace by ID
 */
export function useWorkspaceQuery(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workspaces.detail(workspaceId!),
    queryFn: async (): Promise<WorkspaceWithMembership> => {
      const response = await api.get<WorkspaceResponse>(`/workspaces/${workspaceId}`)
      return response.workspace
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Fetch members of a workspace
 */
export function useWorkspaceMembersQuery(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workspaces.members(workspaceId!),
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const response = await api.get<MembersResponse>(`/workspaces/${workspaceId}/members`)
      return response.members
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Get or create default workspace
 */
export function useDefaultWorkspaceQuery() {
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace)

  const query = useQuery({
    queryKey: [...queryKeys.workspaces.all, 'default'],
    queryFn: async (): Promise<WorkspaceWithMembership> => {
      const response = await api.get<WorkspaceResponse>('/workspaces/default')
      return response.workspace
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  // Auto-set as current if none is set (replaces onSuccess in v5)
  useEffect(() => {
    if (query.data) {
      const state = useWorkspaceStore.getState()
      if (!state.currentWorkspace) {
        setCurrentWorkspace(query.data)
      }
    }
  }, [query.data, setCurrentWorkspace])

  return query
}

/**
 * Fetch invitations for a workspace
 */
export function useWorkspaceInvitationsQuery(workspaceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.workspaces.invitations(workspaceId!),
    queryFn: async (): Promise<WorkspaceInvitation[]> => {
      const response = await api.get<InvitationsResponse>(`/workspaces/${workspaceId}/invitations`)
      return response.invitations
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Fetch invitation details by token (public - no auth required for viewing)
 */
export function useInvitationByTokenQuery(token: string | undefined) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: async (): Promise<InvitationDetailsResponse> => {
      const response = await api.get<InvitationDetailsResponse>(`/workspaces/invitations/${token}`)
      return response
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if invitation not found
  })
}
