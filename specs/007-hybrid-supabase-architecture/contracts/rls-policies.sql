-- =============================================================================
-- RLS Policies for Hybrid Supabase Architecture
--
-- Feature: 007-hybrid-supabase-architecture
-- Date: 2025-11-28
--
-- IMPORTANT: Run this script in the Supabase SQL Editor
-- Execute in order: 1) Enable RLS, 2) Create functions, 3) Create indexes, 4) Create policies
-- =============================================================================

-- =============================================================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 2: HELPER FUNCTIONS
-- =============================================================================

-- Note: Creating overloaded functions to handle both UUID and VARCHAR column types
-- PostgreSQL will automatically match the correct function based on the column type

-- Check if user is member of a workspace (UUID version)
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(workspace_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_users
    WHERE workspace_id::TEXT = workspace_id_param::TEXT
      AND user_id::TEXT = auth.uid()::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is member of a workspace (VARCHAR/TEXT version)
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(workspace_id_param VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_users
    WHERE workspace_id::TEXT = workspace_id_param::TEXT
      AND user_id::TEXT = auth.uid()::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is owner/admin of a workspace (UUID version)
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(workspace_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_users
    WHERE workspace_id::TEXT = workspace_id_param::TEXT
      AND user_id::TEXT = auth.uid()::TEXT
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is owner/admin of a workspace (VARCHAR/TEXT version)
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(workspace_id_param VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_users
    WHERE workspace_id::TEXT = workspace_id_param::TEXT
      AND user_id::TEXT = auth.uid()::TEXT
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has access to a document via project/workspace membership (UUID version)
CREATE OR REPLACE FUNCTION public.user_has_document_access(document_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_users wu ON wu.workspace_id::TEXT = p.workspace_id::TEXT
    WHERE p.id::TEXT = document_project_id::TEXT
      AND wu.user_id::TEXT = auth.uid()::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has access to a document via project/workspace membership (VARCHAR/TEXT version)
CREATE OR REPLACE FUNCTION public.user_has_document_access(document_project_id VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_users wu ON wu.workspace_id::TEXT = p.workspace_id::TEXT
    WHERE p.id::TEXT = document_project_id::TEXT
      AND wu.user_id::TEXT = auth.uid()::TEXT
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Critical index for workspace membership lookups (used in all RLS policies)
CREATE INDEX IF NOT EXISTS idx_workspace_users_user_workspace
  ON workspace_users(user_id, workspace_id);

-- Project lookup by workspace
CREATE INDEX IF NOT EXISTS idx_projects_workspace
  ON projects(workspace_id);

-- Document lookup by project
CREATE INDEX IF NOT EXISTS idx_documents_project
  ON documents(project_id);

-- Document lookup by folder
CREATE INDEX IF NOT EXISTS idx_documents_folder
  ON documents(folder_id);

-- Soft delete filter
CREATE INDEX IF NOT EXISTS idx_documents_deleted
  ON documents(deleted_at) WHERE deleted_at IS NULL;

-- Folder lookup by project
CREATE INDEX IF NOT EXISTS idx_folders_project
  ON folders(project_id);

-- Folder soft delete filter
CREATE INDEX IF NOT EXISTS idx_folders_deleted
  ON folders(deleted_at) WHERE deleted_at IS NULL;

-- Template lookups
CREATE INDEX IF NOT EXISTS idx_templates_user
  ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_workspace
  ON templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_templates_system
  ON templates(is_system) WHERE is_system = TRUE;

-- User preferences lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON user_preferences(user_id);

-- Conversation lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_workspace
  ON chat_conversations(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_project
  ON chat_conversations(project_id);

-- =============================================================================
-- STEP 4: RLS POLICIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- WORKSPACE_USERS POLICIES
-- -----------------------------------------------------------------------------

-- SELECT: User can see members of workspaces they belong to
CREATE POLICY "workspace_users_select_policy" ON workspace_users
  FOR SELECT USING (
    user_is_workspace_member(workspace_id)
  );

-- INSERT: Only owners/admins can add members
CREATE POLICY "workspace_users_insert_policy" ON workspace_users
  FOR INSERT WITH CHECK (
    user_is_workspace_admin(workspace_id)
  );

-- UPDATE: Only owners/admins can change roles
CREATE POLICY "workspace_users_update_policy" ON workspace_users
  FOR UPDATE USING (
    user_is_workspace_admin(workspace_id)
  );

-- DELETE: Owners/admins can remove members (except owner)
CREATE POLICY "workspace_users_delete_policy" ON workspace_users
  FOR DELETE USING (
    role != 'owner' AND user_is_workspace_admin(workspace_id)
  );

-- -----------------------------------------------------------------------------
-- WORKSPACES POLICIES
-- -----------------------------------------------------------------------------

-- SELECT: User is a member
CREATE POLICY "workspaces_select_policy" ON workspaces
  FOR SELECT USING (
    user_is_workspace_member(id)
  );

-- INSERT: Any authenticated user can create (they become owner via trigger/application)
CREATE POLICY "workspaces_insert_policy" ON workspaces
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE: Only owners can update
CREATE POLICY "workspaces_update_policy" ON workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id::TEXT = workspaces.id::TEXT
        AND user_id::TEXT = auth.uid()::TEXT
        AND role = 'owner'
    )
  );

-- DELETE: Only owners can delete
CREATE POLICY "workspaces_delete_policy" ON workspaces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_users
      WHERE workspace_id::TEXT = workspaces.id::TEXT
        AND user_id::TEXT = auth.uid()::TEXT
        AND role = 'owner'
    )
  );

-- -----------------------------------------------------------------------------
-- PROJECTS POLICIES
-- -----------------------------------------------------------------------------

-- SELECT: User is workspace member
CREATE POLICY "projects_select_policy" ON projects
  FOR SELECT USING (
    user_is_workspace_member(workspace_id)
  );

-- INSERT: User is workspace member
CREATE POLICY "projects_insert_policy" ON projects
  FOR INSERT WITH CHECK (
    user_is_workspace_member(workspace_id)
  );

-- UPDATE: User is workspace member
CREATE POLICY "projects_update_policy" ON projects
  FOR UPDATE USING (
    user_is_workspace_member(workspace_id)
  );

-- DELETE: User is workspace owner/admin
CREATE POLICY "projects_delete_policy" ON projects
  FOR DELETE USING (
    user_is_workspace_admin(workspace_id)
  );

-- -----------------------------------------------------------------------------
-- DOCUMENTS POLICIES
-- -----------------------------------------------------------------------------

-- SELECT: Workspace member OR public document with valid share
CREATE POLICY "documents_select_policy" ON documents
  FOR SELECT USING (
    user_has_document_access(project_id)
    OR (
      is_public = TRUE
      AND (share_expires_at IS NULL OR share_expires_at > NOW())
    )
  );

-- INSERT: Workspace member
CREATE POLICY "documents_insert_policy" ON documents
  FOR INSERT WITH CHECK (
    user_has_document_access(project_id)
  );

-- UPDATE: Workspace member
CREATE POLICY "documents_update_policy" ON documents
  FOR UPDATE USING (
    user_has_document_access(project_id)
  );

-- DELETE: Workspace member
CREATE POLICY "documents_delete_policy" ON documents
  FOR DELETE USING (
    user_has_document_access(project_id)
  );

-- -----------------------------------------------------------------------------
-- FOLDERS POLICIES
-- -----------------------------------------------------------------------------

-- SELECT: Workspace member (via project)
CREATE POLICY "folders_select_policy" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_users wu ON wu.workspace_id::TEXT = p.workspace_id::TEXT
      WHERE p.id::TEXT = folders.project_id::TEXT
        AND wu.user_id::TEXT = auth.uid()::TEXT
    )
  );

-- INSERT: Workspace member
CREATE POLICY "folders_insert_policy" ON folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_users wu ON wu.workspace_id::TEXT = p.workspace_id::TEXT
      WHERE p.id::TEXT = folders.project_id::TEXT
        AND wu.user_id::TEXT = auth.uid()::TEXT
    )
  );

-- UPDATE: Workspace member
CREATE POLICY "folders_update_policy" ON folders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_users wu ON wu.workspace_id::TEXT = p.workspace_id::TEXT
      WHERE p.id::TEXT = folders.project_id::TEXT
        AND wu.user_id::TEXT = auth.uid()::TEXT
    )
  );

-- DELETE: Workspace member
CREATE POLICY "folders_delete_policy" ON folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_users wu ON wu.workspace_id::TEXT = p.workspace_id::TEXT
      WHERE p.id::TEXT = folders.project_id::TEXT
        AND wu.user_id::TEXT = auth.uid()::TEXT
    )
  );

-- -----------------------------------------------------------------------------
-- TEMPLATES POLICIES
-- -----------------------------------------------------------------------------

-- SELECT: System templates visible to all, user templates to owner, workspace templates to members
CREATE POLICY "templates_select_policy" ON templates
  FOR SELECT USING (
    is_system = TRUE
    OR user_id::TEXT = auth.uid()::TEXT
    OR (workspace_id IS NOT NULL AND user_is_workspace_member(workspace_id::VARCHAR))
  );

-- INSERT: Authenticated users can create (non-system only)
CREATE POLICY "templates_insert_policy" ON templates
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND is_system = FALSE
    AND user_id::TEXT = auth.uid()::TEXT
  );

-- UPDATE: User owns the template (non-system only)
CREATE POLICY "templates_update_policy" ON templates
  FOR UPDATE USING (
    is_system = FALSE
    AND user_id::TEXT = auth.uid()::TEXT
  );

-- DELETE: User owns the template (non-system only)
CREATE POLICY "templates_delete_policy" ON templates
  FOR DELETE USING (
    is_system = FALSE
    AND user_id::TEXT = auth.uid()::TEXT
  );

-- -----------------------------------------------------------------------------
-- USER_PREFERENCES POLICIES
-- -----------------------------------------------------------------------------

-- SELECT: User owns
CREATE POLICY "user_preferences_select_policy" ON user_preferences
  FOR SELECT USING (
    user_id::TEXT = auth.uid()::TEXT
  );

-- INSERT: User owns
CREATE POLICY "user_preferences_insert_policy" ON user_preferences
  FOR INSERT WITH CHECK (
    user_id::TEXT = auth.uid()::TEXT
  );

-- UPDATE: User owns
CREATE POLICY "user_preferences_update_policy" ON user_preferences
  FOR UPDATE USING (
    user_id::TEXT = auth.uid()::TEXT
  );

-- No DELETE policy - preferences should persist

-- -----------------------------------------------------------------------------
-- CHAT_CONVERSATIONS POLICIES
-- -----------------------------------------------------------------------------

-- SELECT: User owns
CREATE POLICY "chat_conversations_select_policy" ON chat_conversations
  FOR SELECT USING (
    user_id::TEXT = auth.uid()::TEXT
  );

-- INSERT: User owns
CREATE POLICY "chat_conversations_insert_policy" ON chat_conversations
  FOR INSERT WITH CHECK (
    user_id::TEXT = auth.uid()::TEXT
  );

-- UPDATE: User owns
CREATE POLICY "chat_conversations_update_policy" ON chat_conversations
  FOR UPDATE USING (
    user_id::TEXT = auth.uid()::TEXT
  );

-- DELETE: User owns
CREATE POLICY "chat_conversations_delete_policy" ON chat_conversations
  FOR DELETE USING (
    user_id::TEXT = auth.uid()::TEXT
  );

-- =============================================================================
-- STEP 5: ENABLE REALTIME (Optional)
-- =============================================================================

-- Enable realtime for tables that need live updates
-- Run these only if realtime subscriptions are needed

-- ALTER PUBLICATION supabase_realtime ADD TABLE documents;
-- ALTER PUBLICATION supabase_realtime ADD TABLE folders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Test workspace membership function
-- SELECT user_is_workspace_member('your-workspace-id');

-- Test document access function
-- SELECT user_has_document_access('your-project-id');

-- List all RLS policies
-- SELECT tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';
