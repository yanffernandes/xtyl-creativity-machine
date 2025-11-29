/**
 * Supabase Database Types
 *
 * TypeScript type definitions for the Supabase PostgreSQL database schema.
 * Used for type-safe queries with the Supabase client.
 *
 * Feature: 007-hybrid-supabase-architecture
 */

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          description: string | null
          default_text_model: string | null
          default_vision_model: string | null
          attachment_analysis_model: string | null
          available_models: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          default_text_model?: string | null
          default_vision_model?: string | null
          attachment_analysis_model?: string | null
          available_models?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          default_text_model?: string | null
          default_vision_model?: string | null
          attachment_analysis_model?: string | null
          available_models?: string[] | null
          created_at?: string
        }
      }
      workspace_users: {
        Row: {
          workspace_id: string
          user_id: string
          role: string
        }
        Insert: {
          workspace_id: string
          user_id: string
          role?: string
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          workspace_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          workspace_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          workspace_id?: string
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          title: string
          content: string | null
          status: string
          project_id: string
          folder_id: string | null
          media_type: string
          file_url: string | null
          thumbnail_url: string | null
          generation_metadata: Record<string, unknown> | null
          is_reference_asset: boolean
          asset_type: string | null
          asset_metadata: Record<string, unknown> | null
          is_public: boolean
          share_token: string | null
          share_expires_at: string | null
          is_context: boolean
          created_at: string
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          status?: string
          project_id: string
          folder_id?: string | null
          media_type?: string
          file_url?: string | null
          thumbnail_url?: string | null
          generation_metadata?: Record<string, unknown> | null
          is_reference_asset?: boolean
          asset_type?: string | null
          asset_metadata?: Record<string, unknown> | null
          is_public?: boolean
          share_token?: string | null
          share_expires_at?: string | null
          is_context?: boolean
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          status?: string
          project_id?: string
          folder_id?: string | null
          media_type?: string
          file_url?: string | null
          thumbnail_url?: string | null
          generation_metadata?: Record<string, unknown> | null
          is_reference_asset?: boolean
          asset_type?: string | null
          asset_metadata?: Record<string, unknown> | null
          is_public?: boolean
          share_token?: string | null
          share_expires_at?: string | null
          is_context?: boolean
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      folders: {
        Row: {
          id: string
          name: string
          parent_folder_id: string | null
          project_id: string
          created_at: string
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          parent_folder_id?: string | null
          project_id: string
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          parent_folder_id?: string | null
          project_id?: string
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      templates: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string | null
          name: string
          description: string | null
          category: string
          icon: string | null
          prompt: string
          is_system: boolean
          is_active: boolean
          tags: string[] | null
          usage_count: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          name: string
          description?: string | null
          category: string
          icon?: string | null
          prompt: string
          is_system?: boolean
          is_active?: boolean
          tags?: string[] | null
          usage_count?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string | null
          user_id?: string | null
          name?: string
          description?: string | null
          category?: string
          icon?: string | null
          prompt?: string
          is_system?: boolean
          is_active?: boolean
          tags?: string[] | null
          usage_count?: number
          created_at?: string
          updated_at?: string | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          theme: 'light' | 'dark' | 'system'
          language: string
          notifications_enabled: boolean
          email_notifications: boolean
          default_workspace_id: string | null
          autonomous_mode: boolean
          max_iterations: number
          default_model: string | null
          use_rag_by_default: boolean
          settings: Record<string, unknown>
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          theme?: 'light' | 'dark' | 'system'
          language?: string
          notifications_enabled?: boolean
          email_notifications?: boolean
          default_workspace_id?: string | null
          autonomous_mode?: boolean
          max_iterations?: number
          default_model?: string | null
          use_rag_by_default?: boolean
          settings?: Record<string, unknown>
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          theme?: 'light' | 'dark' | 'system'
          language?: string
          notifications_enabled?: boolean
          email_notifications?: boolean
          default_workspace_id?: string | null
          autonomous_mode?: boolean
          max_iterations?: number
          default_model?: string | null
          use_rag_by_default?: boolean
          settings?: Record<string, unknown>
          created_at?: string
          updated_at?: string | null
        }
      }
      chat_conversations: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          workspace_id: string
          title: string | null
          summary: string | null
          messages_json: Array<{ role: string; content: string }>
          model_used: string | null
          document_ids_context: string[]
          folder_ids_context: string[]
          created_document_ids: string[]
          is_archived: boolean
          message_count: number
          last_message_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          workspace_id: string
          title?: string | null
          summary?: string | null
          messages_json?: Array<{ role: string; content: string }>
          model_used?: string | null
          document_ids_context?: string[]
          folder_ids_context?: string[]
          created_document_ids?: string[]
          is_archived?: boolean
          message_count?: number
          last_message_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          workspace_id?: string
          title?: string | null
          summary?: string | null
          messages_json?: Array<{ role: string; content: string }>
          model_used?: string | null
          document_ids_context?: string[]
          folder_ids_context?: string[]
          created_document_ids?: string[]
          is_archived?: boolean
          message_count?: number
          last_message_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
    }
  }
}

// Convenience type exports
export type Tables = Database['public']['Tables']

export type Workspace = Tables['workspaces']['Row']
export type WorkspaceInsert = Tables['workspaces']['Insert']
export type WorkspaceUpdate = Tables['workspaces']['Update']

export type WorkspaceUser = Tables['workspace_users']['Row']
export type WorkspaceUserInsert = Tables['workspace_users']['Insert']

export type Project = Tables['projects']['Row']
export type ProjectInsert = Tables['projects']['Insert']
export type ProjectUpdate = Tables['projects']['Update']

export type Document = Tables['documents']['Row']
export type DocumentInsert = Tables['documents']['Insert']
export type DocumentUpdate = Tables['documents']['Update']

export type Folder = Tables['folders']['Row']
export type FolderInsert = Tables['folders']['Insert']
export type FolderUpdate = Tables['folders']['Update']

export type Template = Tables['templates']['Row']
export type TemplateInsert = Tables['templates']['Insert']
export type TemplateUpdate = Tables['templates']['Update']

export type UserPreferences = Tables['user_preferences']['Row']
export type UserPreferencesInsert = Tables['user_preferences']['Insert']
export type UserPreferencesUpdate = Tables['user_preferences']['Update']

export type ChatConversation = Tables['chat_conversations']['Row']
export type ChatConversationInsert = Tables['chat_conversations']['Insert']
export type ChatConversationUpdate = Tables['chat_conversations']['Update']

export type User = Tables['users']['Row']
