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
    // Feature 028 T059: Version history
    versions: (documentId: string) => [...queryKeys.documents.all, 'versions', documentId] as const,
    // Visual Studio: Paginated media (images)
    media: (projectId: string) => [...queryKeys.documents.all, 'media', projectId] as const,
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

  // Feature 024: User Memory System
  memories: {
    all: (projectId: string) => ['memories', 'project', projectId] as const,
    lists: (projectId: string) => [...queryKeys.memories.all(projectId), 'list'] as const,
    list: (projectId: string, options?: Record<string, unknown>) =>
      [...queryKeys.memories.lists(projectId), options] as const,
    detail: (projectId: string, memoryId: string) =>
      [...queryKeys.memories.all(projectId), 'detail', memoryId] as const,
    search: (projectId: string, query: string) =>
      [...queryKeys.memories.all(projectId), 'search', query] as const,
  },

  // Feature 027: Visual Generation Studio
  bootstrap: {
    all: ['bootstrap'] as const,
    byProject: (projectId: string, options?: unknown) =>
      [...queryKeys.bootstrap.all, 'project', projectId, options ?? {}] as const,
  },

  creativeConcepts: {
    all: ['creativeConcepts'] as const,
    list: () => [...queryKeys.creativeConcepts.all, 'list'] as const,
    active: () => [...queryKeys.creativeConcepts.all, 'active'] as const,
  },

  // Feature: Supabase Direct Migration - System Messages
  systemMessages: {
    all: ['systemMessages'] as const,
    active: () => [...queryKeys.systemMessages.all, 'active'] as const,
  },

  // Feature: Supabase Direct Migration - Visual Settings
  visualSettings: {
    all: ['visualSettings'] as const,
    byProject: (projectId: string) => [...queryKeys.visualSettings.all, 'project', projectId] as const,
  },

  // Feature: Supabase Direct Migration - Asset Selections
  assetSelections: {
    all: ['assetSelections'] as const,
    byProject: (projectId: string) => [...queryKeys.assetSelections.all, 'project', projectId] as const,
  },

  imageBatch: {
    all: ['imageBatch'] as const,
    status: (batchId: string) => [...queryKeys.imageBatch.all, 'status', batchId] as const,
  },

  // Feature 028: Image Architecture Refactor
  images: {
    all: ['images'] as const,
    lists: () => [...queryKeys.images.all, 'list'] as const,
    byProject: (projectId: string) => [...queryKeys.images.lists(), 'project', projectId] as const,
    detail: (imageId: string) => [...queryKeys.images.all, 'detail', imageId] as const,
    byVariationSet: (variationSetId: string) => [...queryKeys.images.all, 'variationSet', variationSetId] as const,
  },

  // Feature 028: Document attachments
  documentAttachments: {
    all: ['documentAttachments'] as const,
    byDocument: (documentId: string) => [...queryKeys.documentAttachments.all, 'document', documentId] as const,
  },

  // Feature 028: Copy Library
  copyLibrary: {
    all: ['copyLibrary'] as const,
    lists: () => [...queryKeys.copyLibrary.all, 'list'] as const,
    byWorkspace: (workspaceId: string) => [...queryKeys.copyLibrary.lists(), 'workspace', workspaceId] as const,
    list: (workspaceId: string, options?: Record<string, unknown>) =>
      [...queryKeys.copyLibrary.byWorkspace(workspaceId), options] as const,
    detail: (workspaceId: string, copyId: string) =>
      [...queryKeys.copyLibrary.all, 'detail', workspaceId, copyId] as const,
  },

  // Feature 028: Campaigns
  campaigns: {
    all: ['campaigns'] as const,
    lists: () => [...queryKeys.campaigns.all, 'list'] as const,
    byProject: (projectId: string) => [...queryKeys.campaigns.lists(), 'project', projectId] as const,
    detail: (projectId: string, campaignId: string) =>
      [...queryKeys.campaigns.all, 'detail', projectId, campaignId] as const,
  },
}

// Export memory keys separately for easier import
export const memoryKeys = queryKeys.memories

/**
 * Document Keys (Legacy Pattern)
 *
 * Feature 030-performance-optimization: Consolidate query keys
 * These keys maintain backward compatibility with existing hooks.
 * Prefer using queryKeys.documents for new code.
 */
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (projectId: string) => [...documentKeys.lists(), projectId] as const,
  folder: (projectId: string, folderId: string | null) =>
    [...documentKeys.lists(), projectId, 'folder', folderId] as const,
  campaign: (projectId: string, campaignId: string | null) =>
    [...documentKeys.lists(), projectId, 'campaign', campaignId] as const,
  archived: (projectId: string) => [...documentKeys.lists(), projectId, 'archived'] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  shared: (shareToken: string) => [...documentKeys.all, 'shared', shareToken] as const,
}

export default queryKeys
