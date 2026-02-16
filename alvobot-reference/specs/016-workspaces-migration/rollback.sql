-- =============================================================================
-- ROLLBACK SCRIPT - WORKSPACE MIGRATION
-- Feature: 016-workspaces-migration
-- Generated: 2025-12-13
-- =============================================================================
--
-- AVISO: Este script reverte TODAS as mudancas da migracao de workspaces.
-- Execute APENAS em caso de problemas graves.
-- Apos executar, o sistema voltara ao estado anterior (user-centric).
--
-- =============================================================================

-- =============================================================================
-- STEP 1: Remover novas RLS policies
-- =============================================================================

-- Policies em tabelas existentes (expandidas)
DROP POLICY IF EXISTS "projects_workspace_access" ON projects;
DROP POLICY IF EXISTS "connections_project_access" ON connections;
DROP POLICY IF EXISTS "triggers_workspace_access" ON message_triggers;
DROP POLICY IF EXISTS "tasks_workspace_access" ON tasks;

-- Policies em workspaces
DROP POLICY IF EXISTS "workspaces_member_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_admin_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_owner_delete" ON workspaces;

-- Policies em workspace_members
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

-- Policies em workspace_invitations
DROP POLICY IF EXISTS "workspace_invitations_select" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete" ON workspace_invitations;

-- Policies em workspace_keywords
DROP POLICY IF EXISTS "workspace_keywords_select" ON workspace_keywords;
DROP POLICY IF EXISTS "workspace_keywords_insert" ON workspace_keywords;
DROP POLICY IF EXISTS "workspace_keywords_delete" ON workspace_keywords;


-- =============================================================================
-- STEP 2: Remover indices das novas colunas
-- =============================================================================

DROP INDEX IF EXISTS idx_projects_workspace;
DROP INDEX IF EXISTS idx_connections_project;
DROP INDEX IF EXISTS idx_triggers_workspace;
DROP INDEX IF EXISTS idx_triggers_project;
DROP INDEX IF EXISTS idx_tasks_workspace;


-- =============================================================================
-- STEP 3: Remover novas colunas de tabelas existentes
-- =============================================================================

ALTER TABLE projects DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE connections DROP COLUMN IF EXISTS project_id;
ALTER TABLE message_triggers DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE message_triggers DROP COLUMN IF EXISTS project_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS workspace_id;


-- =============================================================================
-- STEP 4: Remover novas tabelas (ordem importa por FKs)
-- =============================================================================

DROP TABLE IF EXISTS workspace_keywords;
DROP TABLE IF EXISTS workspace_invitations;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;


-- =============================================================================
-- STEP 5: Remover functions e triggers
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_workspaces_updated_at ON workspaces;
DROP TRIGGER IF EXISTS trigger_workspace_members_updated_at ON workspace_members;
DROP FUNCTION IF EXISTS update_workspaces_updated_at();
DROP FUNCTION IF EXISTS update_workspace_members_updated_at();


-- =============================================================================
-- STEP 6: Verificar rollback
-- =============================================================================

-- Verificar que tabelas foram removidas
SELECT 'workspaces existe' as check_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspaces') as existe;

SELECT 'workspace_members existe' as check_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_members') as existe;

-- Verificar que colunas foram removidas
SELECT 'projects.workspace_id existe' as check_name,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'workspace_id') as existe;

SELECT 'connections.project_id existe' as check_name,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'connections' AND column_name = 'project_id') as existe;
