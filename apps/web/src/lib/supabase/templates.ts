/**
 * Template Service
 *
 * Handles all template-related CRUD operations via Supabase Client.
 * Replaces backend/routers/templates.py for direct database access.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US5 - Template Access
 */

import { supabase } from './client'
import type {
  Template,
  TemplateInsert,
  TemplateUpdate,
} from '@/types/supabase'
import type { ServiceResult } from '@/types/supabase-services'

export const templateService = {
  /**
   * List all templates accessible to the current user
   * Includes: system templates, user's own templates, and workspace templates
   */
  async list(workspaceId?: string): Promise<ServiceResult<Template[]>> {
    try {
      let query = supabase
        .from('templates')
        .select('*')
        .order('name', { ascending: true })

      // Filter by workspace if provided
      if (workspaceId) {
        query = query.or(`is_system.eq.true,workspace_id.eq.${workspaceId}`)
      }

      const { data, error } = await query

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List only system templates (available to all users)
   */
  async listSystem(): Promise<ServiceResult<Template[]>> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_system', true)
        .order('name', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List templates owned by the current user
   */
  async listUserTemplates(): Promise<ServiceResult<Template[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_system', false)
        .order('name', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List templates shared with a workspace
   */
  async listWorkspaceTemplates(workspaceId: string): Promise<ServiceResult<Template[]>> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_system', false)
        .order('name', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List templates by category
   */
  async listByCategory(category: string): Promise<ServiceResult<Template[]>> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('category', category)
        .order('name', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get a single template by ID
   */
  async get(id: string): Promise<ServiceResult<Template>> {
    try {
      const { data, error } = await supabase
        .from('templates')
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
   * Create a new template (user-owned, non-system)
   */
  async create(template: Omit<TemplateInsert, 'user_id' | 'is_system'>): Promise<ServiceResult<Template>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('templates')
        .insert({
          ...template,
          user_id: user.id,
          is_system: false,
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Update a template (only owner can update, not system templates)
   */
  async update(id: string, template: TemplateUpdate): Promise<ServiceResult<Template>> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .update({
          ...template,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('is_system', false) // Can't update system templates
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Share template with a workspace
   */
  async shareWithWorkspace(id: string, workspaceId: string): Promise<ServiceResult<Template>> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .update({
          workspace_id: workspaceId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('is_system', false)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Unshare template from workspace (make it private)
   */
  async unshareFromWorkspace(id: string): Promise<ServiceResult<Template>> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .update({
          workspace_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('is_system', false)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Duplicate a template (create a copy owned by current user)
   */
  async duplicate(id: string, newName?: string): Promise<ServiceResult<Template>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get the original template
      const { data: original, error: getError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .single()

      if (getError) throw getError
      if (!original) throw new Error('Template not found')

      // Create the copy
      const { data, error } = await supabase
        .from('templates')
        .insert({
          name: newName || `${original.name} (Copy)`,
          description: original.description,
          content: original.content,
          category: original.category,
          variables: original.variables,
          user_id: user.id,
          is_system: false,
          workspace_id: null, // Don't copy workspace association
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Delete a template (only owner can delete, not system templates)
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id)
        .eq('is_system', false) // Can't delete system templates

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Increment usage count for a template
   */
  async incrementUsageCount(id: string): Promise<ServiceResult<void>> {
    try {
      // Use RPC or direct update with increment
      const { error } = await supabase.rpc('increment_template_usage', { template_id: id })

      // Fallback to manual increment if RPC doesn't exist
      if (error && error.message.includes('function')) {
        const { data: template } = await supabase
          .from('templates')
          .select('usage_count')
          .eq('id', id)
          .single()

        if (template) {
          await supabase
            .from('templates')
            .update({ usage_count: (template.usage_count || 0) + 1 })
            .eq('id', id)
        }
      } else if (error) {
        throw error
      }

      return { data: null, error: null }
    } catch (error) {
      // Don't throw on usage count errors - not critical
      console.error('Failed to increment usage count:', error)
      return { data: null, error: null }
    }
  },
}

export default templateService
