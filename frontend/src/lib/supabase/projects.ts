/**
 * Project Service
 *
 * Handles all project-related CRUD operations via Supabase Client.
 * Replaces backend/routers/projects.py for direct database access.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US1 - Fast Project Listing
 */

import { supabase } from './client'
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
} from '@/types/supabase'
import type { ServiceResult } from '@/types/supabase-services'

export const projectService = {
  /**
   * List all projects in a workspace
   */
  async listByWorkspace(workspaceId: string): Promise<ServiceResult<Project[]>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get a single project by ID
   */
  async get(id: string): Promise<ServiceResult<Project>> {
    try {
      const { data, error } = await supabase
        .from('projects')
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
   * Create a new project in a workspace
   */
  async create(project: ProjectInsert): Promise<ServiceResult<Project>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Update project details
   */
  async update(id: string, project: ProjectUpdate): Promise<ServiceResult<Project>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(project)
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
   * Delete project (owner/admin only)
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}

export default projectService
