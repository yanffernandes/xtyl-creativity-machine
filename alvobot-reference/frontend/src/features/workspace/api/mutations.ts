import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { useWorkspaceStore } from '../stores/workspaceStore'
import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  InviteMemberRequest,
  UpdateMemberRequest,
  WorkspaceResponse,
  InvitationResponse,
  MemberResponse,
  WorkspaceWithMembership,
} from '../types'

/**
 * Create a new workspace
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient()
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace)

  return useMutation({
    mutationFn: async (data: CreateWorkspaceRequest): Promise<WorkspaceWithMembership> => {
      const response = await api.post<WorkspaceResponse>('/workspaces', data)
      return response.workspace
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
      // Automatically switch to the new workspace
      setCurrentWorkspace({
        ...workspace,
        membership: { role: 'owner', status: 'active' },
      })
    },
  })
}

/**
 * Update a workspace
 */
export function useUpdateWorkspace() {
  const queryClient = useQueryClient()
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace)

  return useMutation({
    mutationFn: async ({
      workspaceId,
      data,
    }: {
      workspaceId: string
      data: UpdateWorkspaceRequest
    }): Promise<WorkspaceWithMembership> => {
      const response = await api.patch<WorkspaceResponse>(`/workspaces/${workspaceId}`, data)
      return response.workspace
    },
    onSuccess: (workspace) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspace.id) })
      // Update current workspace if it's the one being edited
      if (currentWorkspace?.id === workspace.id) {
        setCurrentWorkspace({
          ...workspace,
          membership: currentWorkspace.membership,
        })
      }
    },
  })
}

/**
 * Delete a workspace (soft delete)
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const setCurrentWorkspace = useWorkspaceStore((state) => state.setCurrentWorkspace)

  return useMutation({
    mutationFn: async (workspaceId: string): Promise<void> => {
      await api.delete(`/workspaces/${workspaceId}`)
    },
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
      // If deleted workspace was current, clear it
      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(null)
      }
    },
  })
}

/**
 * Invite a member to workspace
 */
export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workspaceId,
      data,
    }: {
      workspaceId: string
      data: InviteMemberRequest
    }) => {
      const response = await api.post<InvitationResponse>(
        `/workspaces/${workspaceId}/members/invite`,
        data
      )
      return response.invitation
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.members(variables.workspaceId),
      })
    },
  })
}

/**
 * Accept an invitation
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await api.post<MemberResponse>(
        `/workspaces/invitations/${token}/accept`,
        {}
      )
      return response.member
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
    },
  })
}

/**
 * Update a member's role/permissions
 */
export function useUpdateMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
      data,
    }: {
      workspaceId: string
      userId: string
      data: UpdateMemberRequest
    }) => {
      const response = await api.patch<MemberResponse>(
        `/workspaces/${workspaceId}/members/${userId}`,
        data
      )
      return response.member
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.members(variables.workspaceId),
      })
    },
  })
}

/**
 * Remove a member from workspace
 */
export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
    }: {
      workspaceId: string
      userId: string
    }): Promise<void> => {
      await api.delete(`/workspaces/${workspaceId}/members/${userId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.members(variables.workspaceId),
      })
    },
  })
}

/**
 * Resend an invitation email
 */
export function useResendInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workspaceId,
      invitationId,
    }: {
      workspaceId: string
      invitationId: string
    }) => {
      const response = await api.post<InvitationResponse>(
        `/workspaces/${workspaceId}/invitations/${invitationId}/resend`,
        {}
      )
      return response.invitation
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.invitations(variables.workspaceId),
      })
    },
  })
}

/**
 * Cancel a pending invitation
 */
export function useCancelInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      workspaceId,
      invitationId,
    }: {
      workspaceId: string
      invitationId: string
    }): Promise<void> => {
      await api.delete(`/workspaces/${workspaceId}/invitations/${invitationId}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.invitations(variables.workspaceId),
      })
    },
  })
}
