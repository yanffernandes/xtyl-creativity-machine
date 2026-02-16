/**
 * Conversation Service (Supabase Direct)
 *
 * Provides CRUD operations for chat_conversations table via Supabase client.
 * Used by ChatSidebar for conversation persistence.
 *
 * Ported from: frontend/src/lib/supabase/conversations.ts
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface ConversationRecord {
  id: string;
  user_id: string;
  workspace_id: string;
  project_id: string | null;
  title: string | null;
  summary: string | null;
  messages_json: unknown[];
  model_used: string | null;
  document_ids_context: string[];
  folder_ids_context: string[];
  created_document_ids: string[];
  is_archived: boolean;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ConversationInsert {
  workspace_id: string;
  project_id?: string | null;
  title?: string;
  summary?: string | null;
  messages_json?: unknown[];
  model_used?: string | null;
  document_ids_context?: string[];
  folder_ids_context?: string[];
  created_document_ids?: string[];
  is_archived?: boolean;
  message_count?: number;
  last_message_at?: string | null;
}

export interface ConversationUpdate {
  title?: string | null;
  summary?: string | null;
  messages_json?: unknown[];
  model_used?: string | null;
  document_ids_context?: string[];
  folder_ids_context?: string[];
  created_document_ids?: string[];
  is_archived?: boolean;
  message_count?: number;
  last_message_at?: string | null;
}

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ============================================================================
// Conversation Service
// ============================================================================

export const conversationService = {
  async create(data: ConversationInsert): Promise<ServiceResult<ConversationRecord>> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('chat_conversations')
        .insert({
          ...data,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: result as ConversationRecord, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async update(
    id: string,
    data: ConversationUpdate
  ): Promise<ServiceResult<ConversationRecord>> {
    try {
      const { data: result, error } = await supabase
        .from('chat_conversations')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: result as ConversationRecord, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async get(id: string): Promise<ServiceResult<ConversationRecord>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as ConversationRecord, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async list(
    workspaceId: string,
    options?: { limit?: number }
  ): Promise<ServiceResult<ConversationRecord[]>> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: (data ?? []) as ConversationRecord[], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async listByProject(
    projectId: string
  ): Promise<ServiceResult<ConversationRecord[]>> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return { data: (data ?? []) as ConversationRecord[], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async listArchived(
    workspaceId: string
  ): Promise<ServiceResult<ConversationRecord[]>> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', workspaceId)
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { data: (data ?? []) as ConversationRecord[], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async archive(id: string): Promise<ServiceResult<ConversationRecord>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          is_archived: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as ConversationRecord, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async restore(id: string): Promise<ServiceResult<ConversationRecord>> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .update({
          is_archived: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as ConversationRecord, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },

  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },
};
