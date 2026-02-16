-- =============================================================================
-- REMOVER RLS POLICIES DE WORKSPACE (TEMPORÁRIO)
-- =============================================================================
-- Execute este script no Supabase SQL Editor para remover as políticas
-- que estão causando recursão infinita.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Remover políticas de workspace_members (causando recursão)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

-- -----------------------------------------------------------------------------
-- 2. Remover políticas de workspaces
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspaces_member_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_admin_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_owner_delete" ON workspaces;

-- -----------------------------------------------------------------------------
-- 3. Remover políticas de workspace_invitations
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspace_invitations_select" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete" ON workspace_invitations;

-- -----------------------------------------------------------------------------
-- 4. Remover políticas de workspace_keywords
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspace_keywords_select" ON workspace_keywords;
DROP POLICY IF EXISTS "workspace_keywords_insert" ON workspace_keywords;
DROP POLICY IF EXISTS "workspace_keywords_delete" ON workspace_keywords;

-- -----------------------------------------------------------------------------
-- 5. Remover políticas híbridas adicionadas em tabelas existentes
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "projects_workspace_access" ON projects;
DROP POLICY IF EXISTS "connections_project_access" ON connections;
DROP POLICY IF EXISTS "triggers_workspace_access" ON message_triggers;
DROP POLICY IF EXISTS "tasks_workspace_access" ON tasks;

-- -----------------------------------------------------------------------------
-- 6. Desabilitar RLS nas novas tabelas (temporário)
-- -----------------------------------------------------------------------------
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_keywords DISABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 7. Verificar que as políticas foram removidas
-- -----------------------------------------------------------------------------
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN (
  'workspaces',
  'workspace_members',
  'workspace_invitations',
  'workspace_keywords',
  'projects',
  'connections',
  'message_triggers',
  'tasks'
)
ORDER BY tablename, policyname;

-- =============================================================================
-- RESULTADO ESPERADO:
-- As tabelas de workspace não devem ter políticas RLS listadas.
-- As tabelas existentes (projects, connections, etc) devem manter suas
-- políticas originais (user_id based), sem as novas políticas workspace_*.
-- =============================================================================
