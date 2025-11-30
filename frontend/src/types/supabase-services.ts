/**
 * Supabase Services Types
 *
 * TypeScript types for service responses and interfaces.
 * Used by the Supabase service layer for type-safe operations.
 *
 * Feature: 007-hybrid-supabase-architecture
 */

import type {
  Workspace,
  WorkspaceInsert,
  WorkspaceUpdate,
  WorkspaceUser,
  Project,
  ProjectInsert,
  ProjectUpdate,
  Document,
  DocumentInsert,
  DocumentUpdate,
  Folder,
  FolderInsert,
  FolderUpdate,
  Template,
  TemplateInsert,
  TemplateUpdate,
  UserPreferences,
  UserPreferencesUpdate,
  ChatConversation,
  ChatConversationInsert,
  ChatConversationUpdate,
} from './supabase'

// Re-export entity types for convenience
export type {
  Workspace,
  WorkspaceInsert,
  WorkspaceUpdate,
  WorkspaceUser,
  Project,
  ProjectInsert,
  ProjectUpdate,
  Document,
  DocumentInsert,
  DocumentUpdate,
  Folder,
  FolderInsert,
  FolderUpdate,
  Template,
  TemplateInsert,
  TemplateUpdate,
  UserPreferences,
  UserPreferencesUpdate,
  ChatConversation,
  ChatConversationInsert,
  ChatConversationUpdate,
}

/**
 * Standard service result wrapper
 */
export interface ServiceResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Paginated result for list operations
 */
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * Share link result
 */
export interface ShareLinkResult {
  shareToken: string
  shareUrl: string
  expiresAt?: string
}

/**
 * Workspace member with user details
 */
export interface WorkspaceMember extends WorkspaceUser {
  user?: {
    id: string
    email: string
    full_name: string | null
  }
}
