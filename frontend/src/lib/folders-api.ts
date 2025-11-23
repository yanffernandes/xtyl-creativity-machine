import api from './api'

export interface Folder {
  id: string
  name: string
  parent_folder_id: string | null
  project_id: string
  created_at: string
  updated_at?: string
  deleted_at?: string
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

// Folder API
export const foldersApi = {
  // Create folder
  create: async (projectId: string, name: string, parentFolderId?: string) => {
    const response = await api.post('/folders/', {
      name,
      project_id: projectId,
      parent_folder_id: parentFolderId || null
    })
    return response.data
  },

  // List folders in project
  list: async (projectId: string, parentFolderId?: string) => {
    const params = new URLSearchParams()
    if (parentFolderId) {
      params.append('parent_folder_id', parentFolderId)
    }
    const response = await api.get(`/folders/project/${projectId}?${params}`)
    return response.data
  },

  // Get single folder
  get: async (folderId: string) => {
    const response = await api.get(`/folders/${folderId}`)
    return response.data
  },

  // Update folder name
  update: async (folderId: string, name: string) => {
    const response = await api.put(`/folders/${folderId}`, { name })
    return response.data
  },

  // Move folder
  move: async (folderId: string, newParentId: string | null) => {
    const response = await api.post(`/folders/${folderId}/move`, {
      new_parent_id: newParentId
    })
    return response.data
  },

  // Delete (archive) folder
  delete: async (folderId: string, cascade: boolean = true) => {
    const response = await api.delete(`/folders/${folderId}?cascade=${cascade}`)
    return response.data
  },

  // Restore folder
  restore: async (folderId: string, restoreContents: boolean = false) => {
    const response = await api.post(`/folders/${folderId}/restore?restore_contents=${restoreContents}`)
    return response.data
  },

  // List archived folders
  listArchived: async (projectId: string) => {
    const response = await api.get(`/folders/project/${projectId}/archived`)
    return response.data
  }
}

// Document API extensions
export const documentsApi = {
  // Move document
  move: async (documentId: string, folderId: string | null) => {
    const params = new URLSearchParams()
    if (folderId) {
      params.append('folder_id', folderId)
    }
    const response = await api.post(`/documents/${documentId}/move?${params}`)
    return response.data
  },

  // Restore document
  restore: async (documentId: string) => {
    const response = await api.post(`/documents/${documentId}/restore`)
    return response.data
  },

  // List archived documents
  listArchived: async (projectId: string) => {
    const response = await api.get(`/documents/projects/${projectId}/archived`)
    return response.data
  }
}

// Activity API
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
