/**
 * Document Service
 *
 * Handles all document-related CRUD operations via Supabase Client.
 * Replaces backend/routers/documents.py CRUD operations (keeps upload/export in backend).
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US2 - Responsive Document Management
 */

import { supabase } from './client'
import type {
  Document,
  DocumentInsert,
  DocumentUpdate,
} from '@/types/supabase'
import type { ServiceResult, ShareLinkResult } from '@/types/supabase-services'

// Generate a random share token
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// T028: Utility function to group items by a key
function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const groupKey = String(item[key])
    if (!acc[groupKey]) {
      acc[groupKey] = []
    }
    acc[groupKey].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// Document with attachments type for optimized queries
export interface DocumentWithAttachments extends Document {
  document_attachments?: {
    id: string
    attachment_type: string
    visual_assets?: {
      id: string
      thumbnail_url: string | null
      file_name: string | null
    } | null
  }[]
}

// Partial document for optimized list queries (only essential fields)
export interface DocumentListItem {
  id: string
  title: string | null
  document_type: string | null
  status: string | null
  media_type: string | null
  folder_id?: string | null
  board_id?: string | null
  board_column_id?: string | null
  created_at: string | null
  updated_at: string | null
  project_id?: string
  is_reference_asset?: boolean
  document_attachments?: {
    id: string
    attachment_type: string
    visual_assets?: {
      id: string
      thumbnail_url: string | null
      title: string | null
    }[] | null
  }[]
}

export const documentService = {
  /**
   * T021-T024: Optimized document list with JOINs
   * Fetches documents with attachments and visual assets in a single query
   * Replaces N+1 pattern with Supabase relation syntax
   */
  async listByProjectOptimized(projectId: string): Promise<ServiceResult<DocumentListItem[]>> {
    try {
      // T022-T024: Single query with JOINs - specific fields only
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          document_type,
          status,
          media_type,
          created_at,
          updated_at,
          document_attachments (
            id,
            attachment_type,
            visual_assets:image_id (
              id,
              thumbnail_url,
              title
            )
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data as DocumentListItem[], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * T027: Batch fetch documents for multiple projects (sidebar optimization)
   * Single query for all projects instead of N queries
   */
  async fetchAllProjectsDocuments(projectIds: string[]): Promise<ServiceResult<Record<string, DocumentListItem[]>>> {
    try {
      if (projectIds.length === 0) {
        return { data: {}, error: null }
      }

      // T029: Limit to 100 documents for sidebar performance
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          project_id,
          status,
          media_type,
          folder_id,
          board_id,
          board_column_id,
          is_reference_asset,
          created_at
        `)
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      // Group documents by project_id
      const grouped = groupBy(data || [], 'project_id' as keyof typeof data[0])
      return { data: grouped as Record<string, DocumentListItem[]>, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List all context files in a project (is_context = true)
   */
  async listContextFiles(projectId: string): Promise<ServiceResult<Document[]>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_context', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Toggle is_context flag for a document
   */
  async toggleContext(id: string): Promise<ServiceResult<Document>> {
    try {
      // First get current state
      const { data: doc, error: getError } = await supabase
        .from('documents')
        .select('is_context')
        .eq('id', id)
        .single()

      if (getError) throw getError
      if (!doc) throw new Error('Document not found')

      // Toggle the value
      const newValue = !doc.is_context
      const { data, error } = await supabase
        .from('documents')
        .update({
          is_context: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List all documents in a project (excludes deleted)
   * Includes attachments with their image data for Kanban preview
   * @param projectId - Project ID
   * @param campaignId - Optional campaign ID to filter by (Feature 028)
   */
  async listByProject(projectId: string, campaignId?: string | null): Promise<ServiceResult<Document[]>> {
    try {
      // First get documents
      let query = supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      // Feature 028: Filter by campaign if specified
      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }

      const { data: documents, error: docsError } = await query
        .order('created_at', { ascending: false })

      if (docsError) throw docsError
      if (!documents) return { data: [], error: null }

      // Get all document IDs to fetch their attachments
      const docIds = documents.map(d => d.id)

      if (docIds.length === 0) {
        return { data: documents, error: null }
      }

      // Fetch attachments for all documents
      const { data: attachments, error: attError } = await supabase
        .from('document_attachments')
        .select('id, document_id, image_id, is_primary, attachment_order')
        .in('document_id', docIds)

      if (attError) {
        console.warn('Failed to fetch attachments:', attError)
        // Return documents without attachments if fetch fails
        return { data: documents, error: null }
      }

      // Get unique image IDs to fetch image details
      const imageIds = [...new Set(attachments?.map(a => a.image_id) || [])]

      let imageMap: Record<string, any> = {}
      if (imageIds.length > 0) {
        const { data: images, error: imgError } = await supabase
          .from('documents')
          .select('id, title, file_url, thumbnail_url')
          .in('id', imageIds)

        if (!imgError && images) {
          imageMap = Object.fromEntries(images.map(img => [img.id, img]))
        }
      }

      // Merge attachments with image data into documents
      const documentsWithAttachments = documents.map(doc => ({
        ...doc,
        attachments: (attachments || [])
          .filter(att => att.document_id === doc.id)
          .map(att => ({
            ...att,
            image: imageMap[att.image_id] || null
          }))
      }))

      return { data: documentsWithAttachments, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List documents for sidebar (optimized - only essential fields)
   * Excludes images that are attached to other documents
   */
  async listForSidebar(projectId: string): Promise<ServiceResult<Pick<Document, 'id' | 'title' | 'status' | 'media_type' | 'is_reference_asset'>[]>> {
    try {
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('id, title, status, media_type, is_reference_asset')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (docsError) throw docsError
      if (!documents) return { data: [], error: null }

      // Get all document IDs to check for attachments
      const docIds = documents.map(d => d.id)
      if (docIds.length === 0) {
        return { data: documents, error: null }
      }

      // Fetch all attachments to find which images are attached to documents
      const { data: attachments } = await supabase
        .from('document_attachments')
        .select('image_id')
        .in('document_id', docIds)

      // Create set of attached image IDs for fast lookup
      const attachedImageIds = new Set(attachments?.map(a => a.image_id) || [])

      // Filter out images that are attached to documents
      const filteredDocuments = documents.filter(doc => {
        // If it's an image and it's attached to some document, hide it from sidebar
        if (doc.media_type === 'image' && attachedImageIds.has(doc.id)) {
          return false
        }
        return true
      })

      return { data: filteredDocuments, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List documents in a specific folder (null for root)
   */
  async listByFolder(projectId: string, folderId: string | null): Promise<ServiceResult<Document[]>> {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (folderId === null) {
        query = query.is('folder_id', null)
      } else {
        query = query.eq('folder_id', folderId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List archived (soft-deleted) documents
   */
  async listArchived(projectId: string): Promise<ServiceResult<Document[]>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get a single document by ID
   */
  async get(id: string): Promise<ServiceResult<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Create a new document
   */
  async create(document: DocumentInsert): Promise<ServiceResult<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert(document)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Update document content/metadata
   */
  async update(id: string, document: DocumentUpdate): Promise<ServiceResult<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          ...document,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Move document to a folder (null for root)
   */
  async move(id: string, folderId: string | null): Promise<ServiceResult<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          folder_id: folderId,
          board_id: null,
          board_column_id: null,
          board_position: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async moveToBoard(
    id: string,
    boardId: string | null,
    boardColumnId: string | null,
    boardPosition: number | null = null
  ): Promise<ServiceResult<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          folder_id: null,
          board_id: boardId,
          board_column_id: boardColumnId,
          board_position: boardPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Soft delete (archive) a document
   */
  async archive(id: string): Promise<ServiceResult<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Restore an archived document
   */
  async restore(id: string): Promise<ServiceResult<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Permanently delete a document
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Generate public share link
   */
  async createShareLink(id: string, expiresInDays?: number): Promise<ServiceResult<ShareLinkResult>> {
    try {
      const shareToken = generateShareToken()
      const shareExpiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null

      const { error } = await supabase
        .from('documents')
        .update({
          is_public: true,
          share_token: shareToken,
          share_expires_at: shareExpiresAt,
        })
        .eq('id', id)

      if (error) throw error

      return {
        data: {
          shareToken,
          shareUrl: `/documents/shared/${shareToken}`,
          expiresAt: shareExpiresAt || undefined,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Revoke public share link
   */
  async revokeShareLink(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          is_public: false,
          share_token: null,
          share_expires_at: null,
        })
        .eq('id', id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get shared document (public endpoint via RLS policy)
   */
  async getShared(shareToken: string): Promise<ServiceResult<Document>> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('share_token', shareToken)
        .eq('is_public', true)
        .is('deleted_at', null)
        .single()

      if (error) throw error

      // Check expiration
      if (data?.share_expires_at && new Date(data.share_expires_at) < new Date()) {
        throw new Error('Share link has expired')
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

export default documentService
