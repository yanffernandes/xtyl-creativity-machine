# Data Model: Hybrid Supabase Architecture

**Date**: 2025-11-28 | **Feature**: 007-hybrid-supabase-architecture

## Entity Overview

### Entities Migrating to Supabase Client (CRUD)

| Entity | Table | RLS Pattern | Access Control |
|--------|-------|-------------|----------------|
| Workspace | `workspaces` | Owner only | User must be workspace owner |
| WorkspaceUser | `workspace_users` | Membership | User must be member/owner |
| Project | `projects` | Workspace membership | User must have workspace access |
| Document | `documents` | Workspace membership (via project) | User must have workspace access |
| Folder | `folders` | Workspace membership (via project) | User must have workspace access |
| Template | `templates` | Owner + system | User owns or is_system=true |
| UserPreferences | `user_preferences` | Owner only | User owns record |
| ChatConversation | `chat_conversations` | Owner only | User owns conversation |

### Entities Remaining in Python Backend (AI/LLM)

| Entity | Table | Reason |
|--------|-------|--------|
| WorkflowTemplate | `workflow_templates` | Execution logic in backend |
| WorkflowExecution | `workflow_executions` | SSE streaming, orchestration |
| AgentJob | `agent_jobs` | Backend-managed execution |
| NodeOutput | `node_outputs` | Backend-managed execution |
| AIUsageLog | `ai_usage_log` | Backend tracks API costs |
| ActivityLog | `activity_log` | Backend audit trail |

---

## Entity-RLS Mapping

### 1. Workspaces

**Access Pattern**: User can only see workspaces they belong to.

```sql
-- SELECT: User is a member
CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = workspaces.id
        AND user_id = auth.uid()::TEXT
    )
  );

-- INSERT: Any authenticated user can create
CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only owners can update
CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = workspaces.id
        AND user_id = auth.uid()::TEXT
        AND role = 'owner'
    )
  );

-- DELETE: Only owners can delete
CREATE POLICY "workspaces_delete" ON workspaces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = workspaces.id
        AND user_id = auth.uid()::TEXT
        AND role = 'owner'
    )
  );
```

---

### 2. Workspace Users (Membership)

**Access Pattern**: Members can see other members; owners can manage membership.

```sql
-- SELECT: User is a member of the workspace
CREATE POLICY "workspace_users_select" ON workspace_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_users wu
      WHERE wu.workspace_id = workspace_users.workspace_id
        AND wu.user_id = auth.uid()::TEXT
    )
  );

-- INSERT: Only owners/admins can add members
CREATE POLICY "workspace_users_insert" ON workspace_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = workspace_users.workspace_id
        AND user_id = auth.uid()::TEXT
        AND role IN ('owner', 'admin')
    )
  );

-- DELETE: Owners/admins can remove members (except owner)
CREATE POLICY "workspace_users_delete" ON workspace_users
  FOR DELETE USING (
    workspace_users.role != 'owner' AND
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = workspace_users.workspace_id
        AND user_id = auth.uid()::TEXT
        AND role IN ('owner', 'admin')
    )
  );
```

---

### 3. Projects

**Access Pattern**: User has access if they're a member of the parent workspace.

```sql
-- SELECT: User is workspace member
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = projects.workspace_id
        AND user_id = auth.uid()::TEXT
    )
  );

-- INSERT: User is workspace member
CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = projects.workspace_id
        AND user_id = auth.uid()::TEXT
    )
  );

-- UPDATE: User is workspace member
CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = projects.workspace_id
        AND user_id = auth.uid()::TEXT
    )
  );

-- DELETE: User is workspace owner/admin
CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = projects.workspace_id
        AND user_id = auth.uid()::TEXT
        AND role IN ('owner', 'admin')
    )
  );
```

---

### 4. Documents

**Access Pattern**: User has access if they're a member of the workspace (via project).

```sql
-- Helper function for document workspace access
CREATE OR REPLACE FUNCTION public.user_has_document_access(document_project_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_users wu ON wu.workspace_id = p.workspace_id
    WHERE p.id = document_project_id
      AND wu.user_id = auth.uid()::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SELECT: Workspace member OR public document
CREATE POLICY "documents_select" ON documents
  FOR SELECT USING (
    user_has_document_access(project_id)
    OR (is_public = TRUE AND (share_expires_at IS NULL OR share_expires_at > NOW()))
  );

-- INSERT: Workspace member
CREATE POLICY "documents_insert" ON documents
  FOR INSERT WITH CHECK (
    user_has_document_access(project_id)
  );

-- UPDATE: Workspace member
CREATE POLICY "documents_update" ON documents
  FOR UPDATE USING (
    user_has_document_access(project_id)
  );

-- DELETE: Workspace member
CREATE POLICY "documents_delete" ON documents
  FOR DELETE USING (
    user_has_document_access(project_id)
  );
```

---

### 5. Folders

**Access Pattern**: Same as documents - workspace membership via project.

```sql
-- SELECT: Workspace member
CREATE POLICY "folders_select" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_users wu ON wu.workspace_id = p.workspace_id
      WHERE p.id = folders.project_id
        AND wu.user_id = auth.uid()::TEXT
    )
  );

-- INSERT: Workspace member
CREATE POLICY "folders_insert" ON folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_users wu ON wu.workspace_id = p.workspace_id
      WHERE p.id = folders.project_id
        AND wu.user_id = auth.uid()::TEXT
    )
  );

-- UPDATE: Workspace member
CREATE POLICY "folders_update" ON folders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_users wu ON wu.workspace_id = p.workspace_id
      WHERE p.id = folders.project_id
        AND wu.user_id = auth.uid()::TEXT
    )
  );

-- DELETE: Workspace member
CREATE POLICY "folders_delete" ON folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_users wu ON wu.workspace_id = p.workspace_id
      WHERE p.id = folders.project_id
        AND wu.user_id = auth.uid()::TEXT
    )
  );
```

---

### 6. Templates

**Access Pattern**: User owns OR system template visible to all.

```sql
-- SELECT: User owns OR system template OR workspace template
CREATE POLICY "templates_select" ON templates
  FOR SELECT USING (
    is_system = TRUE
    OR user_id = auth.uid()::TEXT
    OR (workspace_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id = templates.workspace_id
        AND user_id = auth.uid()::TEXT
    ))
  );

-- INSERT: Authenticated user
CREATE POLICY "templates_insert" ON templates
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_system = FALSE
    AND user_id = auth.uid()::TEXT
  );

-- UPDATE: User owns
CREATE POLICY "templates_update" ON templates
  FOR UPDATE USING (
    is_system = FALSE AND user_id = auth.uid()::TEXT
  );

-- DELETE: User owns
CREATE POLICY "templates_delete" ON templates
  FOR DELETE USING (
    is_system = FALSE AND user_id = auth.uid()::TEXT
  );
```

---

### 7. User Preferences

**Access Pattern**: User can only access their own preferences.

```sql
-- SELECT: User owns
CREATE POLICY "user_preferences_select" ON user_preferences
  FOR SELECT USING (user_id = auth.uid()::TEXT);

-- INSERT: User owns
CREATE POLICY "user_preferences_insert" ON user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT);

-- UPDATE: User owns
CREATE POLICY "user_preferences_update" ON user_preferences
  FOR UPDATE USING (user_id = auth.uid()::TEXT);

-- No DELETE - preferences persist
```

---

### 8. Chat Conversations

**Access Pattern**: User can only access their own conversations.

```sql
-- SELECT: User owns
CREATE POLICY "chat_conversations_select" ON chat_conversations
  FOR SELECT USING (user_id = auth.uid()::TEXT);

-- INSERT: User owns
CREATE POLICY "chat_conversations_insert" ON chat_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid()::TEXT);

-- UPDATE: User owns
CREATE POLICY "chat_conversations_update" ON chat_conversations
  FOR UPDATE USING (user_id = auth.uid()::TEXT);

-- DELETE: User owns
CREATE POLICY "chat_conversations_delete" ON chat_conversations
  FOR DELETE USING (user_id = auth.uid()::TEXT);
```

---

## Required Database Indexes

```sql
-- Workspace membership lookup (critical for RLS performance)
CREATE INDEX IF NOT EXISTS idx_workspace_users_user_workspace
  ON workspace_users(user_id, workspace_id);

-- Project lookup by workspace
CREATE INDEX IF NOT EXISTS idx_projects_workspace
  ON projects(workspace_id);

-- Document lookup by project
CREATE INDEX IF NOT EXISTS idx_documents_project
  ON documents(project_id);

-- Folder lookup by project
CREATE INDEX IF NOT EXISTS idx_folders_project
  ON folders(project_id);

-- Template lookup
CREATE INDEX IF NOT EXISTS idx_templates_user
  ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_workspace
  ON templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_templates_system
  ON templates(is_system) WHERE is_system = TRUE;

-- User preferences lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON user_preferences(user_id);

-- Conversation lookup
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_workspace
  ON chat_conversations(user_id, workspace_id);
```

---

## TypeScript Type Definitions

```typescript
// types/supabase.ts - Generated from schema

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
        Insert: Omit<Database['public']['Tables']['workspaces']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['workspaces']['Insert']>
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          workspace_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
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
          created_at: string
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['folders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['folders']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['templates']['Row'], 'id' | 'created_at' | 'updated_at' | 'usage_count'>
        Update: Partial<Database['public']['Tables']['templates']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>
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
        Insert: Omit<Database['public']['Tables']['chat_conversations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['chat_conversations']['Insert']>
      }
      workspace_users: {
        Row: {
          workspace_id: string
          user_id: string
          role: string
        }
        Insert: Database['public']['Tables']['workspace_users']['Row']
        Update: Partial<Database['public']['Tables']['workspace_users']['Insert']>
      }
    }
  }
}
```

---

## Migration Sequence

1. **Enable RLS on all tables** (if not already enabled)
2. **Create helper functions** (`user_has_document_access`, etc.)
3. **Create indexes** for performance
4. **Apply RLS policies** in order:
   - `workspace_users` first (base membership)
   - `workspaces` second (depends on membership)
   - `projects` third (depends on workspace access)
   - `documents`, `folders` fourth (depend on project access)
   - `templates`, `user_preferences`, `chat_conversations` last (simpler ownership)
5. **Test policies** with different user roles
6. **Deploy frontend services** pointing to Supabase
