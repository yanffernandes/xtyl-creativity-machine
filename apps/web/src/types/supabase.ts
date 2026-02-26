/**
 * Supabase Database Types
 *
 * TypeScript type definitions for the Supabase PostgreSQL database schema.
 * Used for type-safe queries with the Supabase client.
 *
 * Feature: 007-hybrid-supabase-architecture
 */

// Template variable definition for dynamic forms
export interface TemplateVariable {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select'
  placeholder?: string
  required?: boolean
  options?: string[]  // For select type
}

// Brand identity for project settings
export interface BrandIdentity {
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
    text?: string
    additional?: string[]
  }
  fonts?: {
    heading?: string
    body?: string
    accent?: string
  }
  logo_url?: string
  logo_thumbnail?: string
}

// Project settings JSONB structure
export interface ProjectSettings {
  client_name?: string
  description?: string | null
  target_audience?: string | null
  brand_voice?: string | null
  brand_voice_custom?: string | null
  key_messages?: string[] | null
  competitors?: string[] | null
  custom_notes?: string | null
  brand_identity?: BrandIdentity | null
}

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
          settings: ProjectSettings | null  // JSONB project settings
          created_at: string
          deleted_at: string | null  // Soft delete timestamp (Feature 020)
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          workspace_id: string
          settings?: ProjectSettings | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          workspace_id?: string
          settings?: ProjectSettings | null
          created_at?: string
          deleted_at?: string | null
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
          board_id: string | null
          board_column_id: string | null
          board_position: number | null
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
          board_id?: string | null
          board_column_id?: string | null
          board_position?: number | null
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
          board_id?: string | null
          board_column_id?: string | null
          board_position?: number | null
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
      boards: {
        Row: {
          id: string
          project_id: string
          folder_id: string | null
          name: string
          description: string | null
          position: number
          created_at: string
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          folder_id?: string | null
          name: string
          description?: string | null
          position?: number
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          folder_id?: string | null
          name?: string
          description?: string | null
          position?: number
          created_at?: string
          updated_at?: string | null
          deleted_at?: string | null
        }
      }
      board_columns: {
        Row: {
          id: string
          board_id: string
          name: string
          color: string | null
          position: number
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          board_id: string
          name: string
          color?: string | null
          position?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          board_id?: string
          name?: string
          color?: string | null
          position?: number
          created_at?: string
          updated_at?: string | null
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
          variables: TemplateVariable[] | null
          initial_message: string | null
          expert_name: string | null
          estimated_outputs: string | null
          is_system: boolean
          is_active: boolean
          is_featured: boolean
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
          variables?: TemplateVariable[] | null
          initial_message?: string | null
          expert_name?: string | null
          estimated_outputs?: string | null
          is_system?: boolean
          is_active?: boolean
          is_featured?: boolean
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
          variables?: TemplateVariable[] | null
          initial_message?: string | null
          expert_name?: string | null
          estimated_outputs?: string | null
          is_system?: boolean
          is_active?: boolean
          is_featured?: boolean
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

export type Board = Tables['boards']['Row']
export type BoardInsert = Tables['boards']['Insert']
export type BoardUpdate = Tables['boards']['Update']

export type BoardColumn = Tables['board_columns']['Row']
export type BoardColumnInsert = Tables['board_columns']['Insert']
export type BoardColumnUpdate = Tables['board_columns']['Update']

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

// ============================================================================
// USER MEMORIES (Feature 024 - Migração Supabase Direto)
// ============================================================================

export type MemoryCategory = 'personal' | 'professional' | 'preference' | 'plan' | 'health' | 'other'

export interface UserMemory {
  id: string
  user_id: string
  project_id: string
  content: string
  content_hash: string
  embedding?: number[] | null
  category: MemoryCategory
  source_conversation_id: string | null
  created_at: string
  updated_at: string
}

export interface UserMemoryInsert {
  id?: string
  user_id: string
  project_id: string
  content: string
  content_hash?: string
  category?: MemoryCategory
  source_conversation_id?: string | null
}

export interface UserMemoryUpdate {
  content?: string
  category?: MemoryCategory
}

// ============================================================================
// SYSTEM CONFIG (Feature 016 - System Messages)
// ============================================================================

export interface SystemConfig {
  id: string
  key: string
  value: Record<string, unknown>
  description: string | null
  updated_at: string
  updated_by: string | null
}

export interface SystemMessage {
  id: string
  type: 'maintenance' | 'announcement' | 'warning' | 'info'
  title: string
  content: string
  priority: number
  starts_at: string | null
  ends_at: string | null
  dismissible: boolean
}

// ============================================================================
// ASSISTANT VISUAL SETTINGS (Feature 011)
// ============================================================================

export interface AssistantVisualSettings {
  id: string
  project_id: string
  is_enabled: boolean
  mode: 'manual' | 'auto'
  assets_per_category: number
  created_at: string
  updated_at: string | null
}

export interface AssistantVisualSettingsInsert {
  id?: string
  project_id: string
  is_enabled?: boolean
  mode?: 'manual' | 'auto'
  assets_per_category?: number
}

export interface AssistantVisualSettingsUpdate {
  is_enabled?: boolean
  mode?: 'manual' | 'auto'
  assets_per_category?: number
}

export interface AssistantAssetSelection {
  id: string
  settings_id: string
  asset_id: string
  is_enabled: boolean
  created_at: string
}

// ============================================================================
// CREATIVE CONCEPTS (Feature 031)
// ============================================================================

export interface CreativeConcept {
  id: string
  name: string
  name_pt: string
  slug: string
  description: string | null
  prompt_modifier: string
  thumbnail_url: string | null
  prompt_template: string | null
  prompt_template_json: Record<string, unknown> | null
  template_variables: string[] | null
  icon: string | null
  category: string | null
  niche: string | null
  works_for_niches: string[] | null
  example_images: unknown[] | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string | null
}

// ============================================================================
// DOCUMENT ATTACHMENTS
// ============================================================================

export interface DocumentAttachment {
  id: string
  document_id: string
  image_id: string
  is_primary: boolean
  attachment_order: number
  created_by_workflow_id: string | null
  created_at: string
}

export interface DocumentAttachmentInsert {
  id?: string
  document_id: string
  image_id: string
  is_primary?: boolean
  attachment_order?: number
  created_by_workflow_id?: string | null
}

// ============================================================================
// ASSET USAGE HISTORY
// ============================================================================

export interface AssetUsageHistory {
  id: string
  asset_id: string
  generation_id: string | null
  used_at: string
}
