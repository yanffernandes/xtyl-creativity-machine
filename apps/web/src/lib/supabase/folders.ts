/**
 * Folder Service
 *
 * Handles all folder-related CRUD operations via Supabase Client.
 * Replaces backend/routers/folders.py for direct database access.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US4 - Folder Organization
 */

import { supabase } from './client'
import type {
  Folder,
  FolderInsert,
  FolderUpdate,
} from '@/types/supabase'
import type { ServiceResult } from '@/types/supabase-services'

export const folderService = {
  /**
   * List all folders in a project (excludes deleted)
   */
  async listByProject(projectId: string): Promise<ServiceResult<Folder[]>> {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List folders under a parent (null for root level)
   */
  async listByParent(projectId: string, parentId: string | null): Promise<ServiceResult<Folder[]>> {
    try {
      let query = supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (parentId === null) {
        query = query.is('parent_folder_id', null)
      } else {
        query = query.eq('parent_folder_id', parentId)
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List archived (soft-deleted) folders
   */
  async listArchived(projectId: string): Promise<ServiceResult<Folder[]>> {
    try {
      const { data, error } = await supabase
        .from('folders')
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
   * Get a single folder by ID
   */
  async get(id: string): Promise<ServiceResult<Folder>> {
    try {
      const { data, error } = await supabase
        .from('folders')
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
   * Create a new folder
   */
  async create(folder: FolderInsert): Promise<ServiceResult<Folder>> {
    try {
      const { data, error } = await supabase
        .from('folders')
        .insert(folder)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Update folder name
   */
  async update(id: string, folder: FolderUpdate): Promise<ServiceResult<Folder>> {
    try {
      const { data, error } = await supabase
        .from('folders')
        .update({
          ...folder,
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
   * Move folder to new parent (null for root)
   */
  async move(id: string, newParentId: string | null): Promise<ServiceResult<Folder>> {
    try {
      // Check for circular reference
      if (newParentId) {
        const { data: targetFolder } = await supabase
          .from('folders')
          .select('parent_folder_id')
          .eq('id', newParentId)
          .single()

        // Simple check - doesn't handle deep nesting
        if (targetFolder?.parent_folder_id === id) {
          throw new Error('Cannot move folder into its own child')
        }
      }

      const { data, error } = await supabase
        .from('folders')
        .update({
          parent_folder_id: newParentId,
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
   * Soft delete (archive) a folder and optionally its contents
   */
  async archive(id: string, cascade: boolean = true): Promise<ServiceResult<Folder>> {
    try {
      const deletedAt = new Date().toISOString()

      if (cascade) {
        // Get the folder to find its project_id
        const { data: folder } = await supabase
          .from('folders')
          .select('project_id')
          .eq('id', id)
          .single()

        if (folder) {
          // Archive all documents in this folder
          await supabase
            .from('documents')
            .update({ deleted_at: deletedAt })
            .eq('folder_id', id)
            .is('deleted_at', null)

          // Archive child folders (direct children only)
          await supabase
            .from('folders')
            .update({ deleted_at: deletedAt })
            .eq('parent_folder_id', id)
            .is('deleted_at', null)
        }
      }

      // Archive the folder itself
      const { data, error } = await supabase
        .from('folders')
        .update({ deleted_at: deletedAt })
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
   * Restore an archived folder
   */
  async restore(id: string, restoreContents: boolean = false): Promise<ServiceResult<Folder>> {
    try {
      // Restore the folder
      const { data, error } = await supabase
        .from('folders')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      if (restoreContents && data) {
        // Restore documents in this folder
        await supabase
          .from('documents')
          .update({ deleted_at: null })
          .eq('folder_id', id)

        // Restore direct child folders
        await supabase
          .from('folders')
          .update({ deleted_at: null })
          .eq('parent_folder_id', id)
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Permanently delete a folder
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

export default folderService
