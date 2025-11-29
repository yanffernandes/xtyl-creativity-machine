/**
 * Workspace Service
 *
 * Handles all workspace-related CRUD operations via Supabase Client.
 * Replaces backend/routers/workspaces.py for direct database access.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US1 - Fast Project Listing
 */

import { supabase } from './client'
import type {
  Workspace,
  WorkspaceInsert,
  WorkspaceUpdate,
  WorkspaceUser,
} from '@/types/supabase'
import type { ServiceResult, WorkspaceMember } from '@/types/supabase-services'

export const workspaceService = {
  /**
   * List all workspaces the current user has access to
   */
  async list(): Promise<ServiceResult<Workspace[]>> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get a single workspace by ID
   */
  async get(id: string): Promise<ServiceResult<Workspace>> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
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
   * Create a new workspace (user becomes owner)
   */
  async create(workspace: WorkspaceInsert): Promise<ServiceResult<Workspace>> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create workspace
      const { data, error } = await supabase
        .from('workspaces')
        .insert(workspace)
        .select()
        .single()

      if (error) throw error

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('workspace_users')
        .insert({
          workspace_id: data.id,
          user_id: user.id,
          role: 'owner'
        })

      if (memberError) {
        // Rollback workspace creation if member insertion fails
        await supabase.from('workspaces').delete().eq('id', data.id)
        throw memberError
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Update workspace settings (owner only)
   */
  async update(id: string, workspace: WorkspaceUpdate): Promise<ServiceResult<Workspace>> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update(workspace)
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
   * Delete workspace (owner only)
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List workspace members with user details
   */
  async listMembers(workspaceId: string): Promise<ServiceResult<WorkspaceMember[]>> {
    try {
      const { data, error } = await supabase
        .from('workspace_users')
        .select(`
          workspace_id,
          user_id,
          role,
          users:user_id (
            id,
            email,
            full_name
          )
        `)
        .eq('workspace_id', workspaceId)

      if (error) throw error

      // Transform the result to flatten the user data
      // Supabase returns the joined user as an object (not array) when using foreign key relationship
      const members: WorkspaceMember[] = (data || []).map((item: any) => ({
        workspace_id: item.workspace_id,
        user_id: item.user_id,
        role: item.role,
        user: item.users ? {
          id: item.users.id,
          email: item.users.email,
          full_name: item.users.full_name
        } : undefined
      }))

      return { data: members, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Add member to workspace (owner/admin only)
   */
  async addMember(
    workspaceId: string,
    userId: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<ServiceResult<WorkspaceUser>> {
    try {
      const { data, error } = await supabase
        .from('workspace_users')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role
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
   * Remove member from workspace (owner/admin only)
   */
  async removeMember(workspaceId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('workspace_users')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  }
}

export default workspaceService
