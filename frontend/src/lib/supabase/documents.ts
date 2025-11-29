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

export const documentService = {
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
   */
  async listByProject(projectId: string): Promise<ServiceResult<Document[]>> {
    try {
      // First get documents
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
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
