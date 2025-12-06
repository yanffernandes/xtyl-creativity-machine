/**
 * Query Keys Factory
 *
 * Centralized query key definitions for React Query.
 * Enables granular cache invalidation instead of broad invalidations.
 *
 * Feature: 023-performance-optimization
 * User Story: US4 - Granular Cache Invalidation
 *
 * Usage:
 * - Query: useQuery({ queryKey: queryKeys.documents.byProject(projectId), ... })
 * - Invalidate: queryClient.invalidateQueries({ queryKey: queryKeys.documents.byProject(projectId) })
 */

export const queryKeys = {
  // T033: Workspace keys
  workspaces: {
    all: ['workspaces'] as const,
    lists: () => [...queryKeys.workspaces.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.workspaces.all, 'detail', id] as const,
    members: (id: string) => [...queryKeys.workspaces.all, 'members', id] as const,
  },

  // T034: Project keys
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    byWorkspace: (workspaceId: string) => [...queryKeys.projects.lists(), 'workspace', workspaceId] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
    settings: (id: string) => [...queryKeys.projects.all, 'settings', id] as const,
  },

  // T035: Document keys
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    byProject: (projectId: string) => [...queryKeys.documents.lists(), 'project', projectId] as const,
    byFolder: (projectId: string, folderId: string | null) =>
      [...queryKeys.documents.lists(), 'project', projectId, 'folder', folderId] as const,
    archived: (projectId: string) => [...queryKeys.documents.lists(), 'project', projectId, 'archived'] as const,
    detail: (id: string) => [...queryKeys.documents.all, 'detail', id] as const,
    shared: (shareToken: string) => [...queryKeys.documents.all, 'shared', shareToken] as const,
  },

  // T036: Template keys
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    byWorkspace: (workspaceId: string) => [...queryKeys.templates.lists(), 'workspace', workspaceId] as const,
    system: () => [...queryKeys.templates.lists(), 'system'] as const,
    user: () => [...queryKeys.templates.lists(), 'user'] as const,
    byCategory: (category: string) => [...queryKeys.templates.lists(), 'category', category] as const,
    detail: (id: string) => [...queryKeys.templates.all, 'detail', id] as const,
  },

  // T037: User preferences keys
  preferences: {
    all: ['preferences'] as const,
    byUser: (userId: string) => [...queryKeys.preferences.all, 'user', userId] as const,
  },

  // Additional keys for completeness
  visualAssets: {
    all: ['visualAssets'] as const,
    byProject: (projectId: string) => [...queryKeys.visualAssets.all, 'project', projectId] as const,
    detail: (id: string) => [...queryKeys.visualAssets.all, 'detail', id] as const,
  },

  conversations: {
    all: ['conversations'] as const,
    byProject: (projectId: string) => [...queryKeys.conversations.all, 'project', projectId] as const,
    detail: (id: string) => [...queryKeys.conversations.all, 'detail', id] as const,
  },

  workflows: {
    all: ['workflows'] as const,
    byProject: (projectId: string) => [...queryKeys.workflows.all, 'project', projectId] as const,
    detail: (id: string) => [...queryKeys.workflows.all, 'detail', id] as const,
    executions: (workflowId: string) => [...queryKeys.workflows.all, 'executions', workflowId] as const,
  },
}

export default queryKeys
