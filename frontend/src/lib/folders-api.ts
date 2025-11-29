/**
 * Folders & Documents API
 *
 * Uses Supabase Client for folders and documents.
 * Activity API still uses backend.
 *
 * Feature: 007-hybrid-supabase-architecture
 */

import api from './api'
import { folderService } from './supabase/folders'
import { documentService } from './supabase/documents'

export interface Folder {
  id: string
  name: string
  parent_folder_id: string | null
  project_id: string
  created_at: string
  updated_at?: string | null
  deleted_at?: string | null
}

export interface ArchivedItem {
  id: string
  title?: string
  name?: string
  type: 'document' | 'folder'
  deleted_at: string
  folder_id?: string
  parent_folder_id?: string
}

export interface Activity {
  id: string
  entity_type: 'document' | 'folder'
  entity_id: string
  entity_name?: string
  action: string
  actor_type: 'human' | 'ai'
  user_id: string | null
  changes: any
  created_at: string
}

// Folder API - now uses Supabase
export const foldersApi = {
  // Create folder
  create: async (projectId: string, name: string, parentFolderId?: string) => {
    const { data, error } = await folderService.create({
      name,
      project_id: projectId,
      parent_folder_id: parentFolderId || null
    })
    if (error) throw error
    return data
  },

  // List folders in project
  list: async (projectId: string, parentFolderId?: string) => {
    if (parentFolderId) {
      const { data, error } = await folderService.listByParent(projectId, parentFolderId)
      if (error) throw error
      return data || []
    }
    const { data, error } = await folderService.listByProject(projectId)
    if (error) throw error
    return data || []
  },

  // Get single folder
  get: async (folderId: string) => {
    const { data, error } = await folderService.get(folderId)
    if (error) throw error
    return data
  },

  // Update folder name
  update: async (folderId: string, name: string) => {
    const { data, error } = await folderService.update(folderId, { name })
    if (error) throw error
    return data
  },

  // Move folder
  move: async (folderId: string, newParentId: string | null) => {
    const { data, error } = await folderService.move(folderId, newParentId)
    if (error) throw error
    return data
  },

  // Delete (archive) folder
  delete: async (folderId: string, cascade: boolean = true) => {
    const { error } = await folderService.archive(folderId)
    if (error) throw error
    return { success: true }
  },

  // Restore folder
  restore: async (folderId: string, restoreContents: boolean = false) => {
    const { data, error } = await folderService.restore(folderId)
    if (error) throw error
    return data
  },

  // List archived folders
  listArchived: async (projectId: string) => {
    const { data, error } = await folderService.listArchived(projectId)
    if (error) throw error
    return data || []
  }
}

// Document API extensions - now uses Supabase
export const documentsApi = {
  // Move document
  move: async (documentId: string, folderId: string | null) => {
    const { data, error } = await documentService.move(documentId, folderId)
    if (error) throw error
    return data
  },

  // Restore document
  restore: async (documentId: string) => {
    const { data, error } = await documentService.restore(documentId)
    if (error) throw error
    return data
  },

  // List archived documents
  listArchived: async (projectId: string) => {
    const { data, error } = await documentService.listArchived(projectId)
    if (error) throw error
    return data || []
  }
}

// Activity API - still uses backend (not migrated)
export const activityApi = {
  // Get entity history
  getHistory: async (entityType: 'document' | 'folder', entityId: string) => {
    const response = await api.get(`/activity/${entityType}/${entityId}`)
    return response.data
  },

  // Get recent project activity
  getProjectRecent: async (projectId: string, limit: number = 50) => {
    const response = await api.get(`/activity/project/${projectId}/recent?limit=${limit}`)
    return response.data
  },

  // Get user activity
  getUserRecent: async (userId: string, limit: number = 50) => {
    const response = await api.get(`/activity/user/${userId}/recent?limit=${limit}`)
    return response.data
  },

  // Get AI vs Human stats
  getStats: async (projectId: string) => {
    const response = await api.get(`/activity/stats/ai-vs-human/${projectId}`)
    return response.data
  }
}
