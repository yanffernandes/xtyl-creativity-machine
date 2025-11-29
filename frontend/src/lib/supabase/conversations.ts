/**
 * Chat Conversations Service
 *
 * Handles all conversation metadata operations via Supabase Client.
 * Note: Actual chat messages may still be handled by Python backend for AI processing.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US6 - Preferences & Conversations
 */

import { supabase } from './client'
import type {
  ChatConversation,
  ChatConversationInsert,
  ChatConversationUpdate,
} from '@/types/supabase'
import type { ServiceResult } from '@/types/supabase-services'

export const conversationService = {
  /**
   * List all conversations for the current user
   */
  async list(): Promise<ServiceResult<ChatConversation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List conversations in a workspace
   */
  async listByWorkspace(workspaceId: string): Promise<ServiceResult<ChatConversation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List conversations in a project
   */
  async listByProject(projectId: string): Promise<ServiceResult<ChatConversation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get a single conversation by ID
   */
  async get(id: string): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
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
   * Create a new conversation
   */
  async create(conversation: Omit<ChatConversationInsert, 'user_id'>): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          ...conversation,
          user_id: user.id,
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
   * Update conversation metadata (title, model, etc.)
   */
  async update(id: string, conversation: ChatConversationUpdate): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          ...conversation,
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
   * Update conversation title
   */
  async updateTitle(id: string, title: string): Promise<ServiceResult<ChatConversation>> {
    return this.update(id, { title })
  },

  /**
   * Move conversation to a different project
   */
  async moveToProject(id: string, projectId: string | null): Promise<ServiceResult<ChatConversation>> {
    return this.update(id, { project_id: projectId })
  },

  /**
   * Archive a conversation (soft delete)
   */
  async archive(id: string): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          archived_at: new Date().toISOString(),
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
   * Restore an archived conversation
   */
  async restore(id: string): Promise<ServiceResult<ChatConversation>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          archived_at: null,
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
   * List archived conversations
   */
  async listArchived(): Promise<ServiceResult<ChatConversation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Permanently delete a conversation
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

export default conversationService
