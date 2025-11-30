/**
 * Supabase Services Contract
 *
 * TypeScript interfaces defining the frontend Supabase service layer.
 * These interfaces specify the contract between UI components and Supabase Client.
 *
 * Feature: 007-hybrid-supabase-architecture
 * Date: 2025-11-28
 */

import type { Database } from '@/types/supabase'

// =============================================================================
// BASE TYPES
// =============================================================================

type Tables = Database['public']['Tables']

export type Workspace = Tables['workspaces']['Row']
export type WorkspaceInsert = Tables['workspaces']['Insert']
export type WorkspaceUpdate = Tables['workspaces']['Update']

export type Project = Tables['projects']['Row']
export type ProjectInsert = Tables['projects']['Insert']
export type ProjectUpdate = Tables['projects']['Update']

export type Document = Tables['documents']['Row']
export type DocumentInsert = Tables['documents']['Insert']
export type DocumentUpdate = Tables['documents']['Update']

export type Folder = Tables['folders']['Row']
export type FolderInsert = Tables['folders']['Insert']
export type FolderUpdate = Tables['folders']['Update']

export type Template = Tables['templates']['Row']
export type TemplateInsert = Tables['templates']['Insert']
export type TemplateUpdate = Tables['templates']['Update']

export type UserPreferences = Tables['user_preferences']['Row']
export type UserPreferencesInsert = Tables['user_preferences']['Insert']
export type UserPreferencesUpdate = Tables['user_preferences']['Update']

export type ChatConversation = Tables['chat_conversations']['Row']
export type ChatConversationInsert = Tables['chat_conversations']['Insert']
export type ChatConversationUpdate = Tables['chat_conversations']['Update']

export type WorkspaceUser = Tables['workspace_users']['Row']
export type WorkspaceUserInsert = Tables['workspace_users']['Insert']

// =============================================================================
// SERVICE RESPONSE TYPES
// =============================================================================

export interface ServiceResult<T> {
  data: T | null
  error: Error | null
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// =============================================================================
// WORKSPACE SERVICE
// =============================================================================

export interface IWorkspaceService {
  /**
   * List all workspaces the current user has access to
   */
  list(): Promise<ServiceResult<Workspace[]>>

  /**
   * Get a single workspace by ID
   */
  get(id: string): Promise<ServiceResult<Workspace>>

  /**
   * Create a new workspace (user becomes owner)
   */
  create(data: WorkspaceInsert): Promise<ServiceResult<Workspace>>

  /**
   * Update workspace settings (owner only)
   */
  update(id: string, data: WorkspaceUpdate): Promise<ServiceResult<Workspace>>

  /**
   * Delete workspace (owner only)
   */
  delete(id: string): Promise<ServiceResult<void>>

  /**
   * List workspace members
   */
  listMembers(workspaceId: string): Promise<ServiceResult<WorkspaceUser[]>>

  /**
   * Add member to workspace (owner/admin only)
   */
  addMember(workspaceId: string, userId: string, role: 'admin' | 'member'): Promise<ServiceResult<WorkspaceUser>>

  /**
   * Remove member from workspace (owner/admin only)
   */
  removeMember(workspaceId: string, userId: string): Promise<ServiceResult<void>>
}

// =============================================================================
// PROJECT SERVICE
// =============================================================================

export interface IProjectService {
  /**
   * List all projects in a workspace
   */
  listByWorkspace(workspaceId: string): Promise<ServiceResult<Project[]>>

  /**
   * Get a single project by ID
   */
  get(id: string): Promise<ServiceResult<Project>>

  /**
   * Create a new project in a workspace
   */
  create(data: ProjectInsert): Promise<ServiceResult<Project>>

  /**
   * Update project details
   */
  update(id: string, data: ProjectUpdate): Promise<ServiceResult<Project>>

  /**
   * Delete project (owner/admin only)
   */
  delete(id: string): Promise<ServiceResult<void>>
}

// =============================================================================
// DOCUMENT SERVICE
// =============================================================================

export interface IDocumentService {
  /**
   * List all documents in a project (excludes deleted)
   */
  listByProject(projectId: string): Promise<ServiceResult<Document[]>>

  /**
   * List documents in a specific folder (null for root)
   */
  listByFolder(projectId: string, folderId: string | null): Promise<ServiceResult<Document[]>>

  /**
   * List archived (soft-deleted) documents
   */
  listArchived(projectId: string): Promise<ServiceResult<Document[]>>

  /**
   * Get a single document by ID
   */
  get(id: string): Promise<ServiceResult<Document>>

  /**
   * Create a new document
   */
  create(data: DocumentInsert): Promise<ServiceResult<Document>>

  /**
   * Update document content/metadata
   */
  update(id: string, data: DocumentUpdate): Promise<ServiceResult<Document>>

  /**
   * Move document to a folder (null for root)
   */
  move(id: string, folderId: string | null): Promise<ServiceResult<Document>>

  /**
   * Soft delete (archive) a document
   */
  archive(id: string): Promise<ServiceResult<Document>>

  /**
   * Restore an archived document
   */
  restore(id: string): Promise<ServiceResult<Document>>

  /**
   * Permanently delete a document
   */
  delete(id: string): Promise<ServiceResult<void>>

  /**
   * Generate public share link
   */
  createShareLink(id: string, expiresInDays?: number): Promise<ServiceResult<{ shareToken: string; shareUrl: string }>>

  /**
   * Revoke public share link
   */
  revokeShareLink(id: string): Promise<ServiceResult<void>>

  /**
   * Get shared document (public endpoint)
   */
  getShared(shareToken: string): Promise<ServiceResult<Document>>
}

// =============================================================================
// FOLDER SERVICE
// =============================================================================

export interface IFolderService {
  /**
   * List all folders in a project (excludes deleted)
   */
  listByProject(projectId: string): Promise<ServiceResult<Folder[]>>

  /**
   * List folders under a parent (null for root level)
   */
  listByParent(projectId: string, parentId: string | null): Promise<ServiceResult<Folder[]>>

  /**
   * List archived (soft-deleted) folders
   */
  listArchived(projectId: string): Promise<ServiceResult<Folder[]>>

  /**
   * Get a single folder by ID
   */
  get(id: string): Promise<ServiceResult<Folder>>

  /**
   * Create a new folder
   */
  create(data: FolderInsert): Promise<ServiceResult<Folder>>

  /**
   * Update folder name
   */
  update(id: string, data: FolderUpdate): Promise<ServiceResult<Folder>>

  /**
   * Move folder to new parent (null for root)
   */
  move(id: string, newParentId: string | null): Promise<ServiceResult<Folder>>

  /**
   * Soft delete (archive) a folder and optionally its contents
   */
  archive(id: string, cascade?: boolean): Promise<ServiceResult<Folder>>

  /**
   * Restore an archived folder
   */
  restore(id: string, restoreContents?: boolean): Promise<ServiceResult<Folder>>

  /**
   * Permanently delete a folder
   */
  delete(id: string): Promise<ServiceResult<void>>
}

// =============================================================================
// TEMPLATE SERVICE
// =============================================================================

export interface ITemplateService {
  /**
   * List all system templates
   */
  listSystem(): Promise<ServiceResult<Template[]>>

  /**
   * List user's custom templates
   */
  listUserTemplates(): Promise<ServiceResult<Template[]>>

  /**
   * List workspace templates
   */
  listByWorkspace(workspaceId: string): Promise<ServiceResult<Template[]>>

  /**
   * Get a single template by ID
   */
  get(id: string): Promise<ServiceResult<Template>>

  /**
   * Create a custom template
   */
  create(data: TemplateInsert): Promise<ServiceResult<Template>>

  /**
   * Update a custom template (user-owned only)
   */
  update(id: string, data: TemplateUpdate): Promise<ServiceResult<Template>>

  /**
   * Delete a custom template (user-owned only)
   */
  delete(id: string): Promise<ServiceResult<void>>

  /**
   * Increment usage count
   */
  incrementUsage(id: string): Promise<ServiceResult<void>>
}

// =============================================================================
// USER PREFERENCES SERVICE
// =============================================================================

export interface IUserPreferencesService {
  /**
   * Get current user's preferences (creates default if not exists)
   */
  get(): Promise<ServiceResult<UserPreferences>>

  /**
   * Update current user's preferences
   */
  update(data: UserPreferencesUpdate): Promise<ServiceResult<UserPreferences>>
}

// =============================================================================
// CONVERSATION SERVICE
// =============================================================================

export interface IConversationService {
  /**
   * List conversations for a workspace (optionally filtered by project)
   */
  list(
    workspaceId: string,
    options?: {
      projectId?: string
      isArchived?: boolean
      page?: number
      pageSize?: number
    }
  ): Promise<ServiceResult<PaginatedResult<ChatConversation>>>

  /**
   * Get a single conversation by ID
   */
  get(id: string): Promise<ServiceResult<ChatConversation>>

  /**
   * Create a new conversation
   */
  create(data: ChatConversationInsert): Promise<ServiceResult<ChatConversation>>

  /**
   * Update conversation (messages, title, etc.)
   */
  update(id: string, data: ChatConversationUpdate): Promise<ServiceResult<ChatConversation>>

  /**
   * Archive a conversation
   */
  archive(id: string): Promise<ServiceResult<ChatConversation>>

  /**
   * Unarchive a conversation
   */
  unarchive(id: string): Promise<ServiceResult<ChatConversation>>

  /**
   * Delete a conversation permanently
   */
  delete(id: string): Promise<ServiceResult<void>>
}

// =============================================================================
// REALTIME SUBSCRIPTIONS
// =============================================================================

export interface IRealtimeService {
  /**
   * Subscribe to document changes in a project
   */
  subscribeToDocuments(
    projectId: string,
    onInsert: (doc: Document) => void,
    onUpdate: (doc: Document) => void,
    onDelete: (id: string) => void
  ): () => void // Returns unsubscribe function

  /**
   * Subscribe to folder changes in a project
   */
  subscribeToFolders(
    projectId: string,
    onInsert: (folder: Folder) => void,
    onUpdate: (folder: Folder) => void,
    onDelete: (id: string) => void
  ): () => void

  /**
   * Subscribe to project changes in a workspace
   */
  subscribeToProjects(
    workspaceId: string,
    onInsert: (project: Project) => void,
    onUpdate: (project: Project) => void,
    onDelete: (id: string) => void
  ): () => void
}
