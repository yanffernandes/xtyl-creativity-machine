-- =============================================================================
-- WORKSPACE MIGRATION SQL SCRIPTS
-- Feature: 016-workspaces-migration
-- Generated: 2025-12-13
-- =============================================================================
--
-- INSTRUCOES:
-- 1. Execute cada secao separadamente no Supabase SQL Editor
-- 2. Verifique o resultado de cada secao antes de prosseguir
-- 3. Em caso de erro, execute o rollback (secao no final do arquivo)
--
-- ORDEM DE EXECUCAO:
-- 1. PART 1: Criar novas tabelas
-- 2. PART 2: Alterar tabelas existentes
-- 3. PART 3: Criar RLS policies
-- 4. PART 4: Migrar dados existentes
-- 5. PART 5: Validar migracao
--
-- =============================================================================

-- =============================================================================
-- PART 1: CRIAR NOVAS TABELAS
-- =============================================================================
-- Execute esta secao primeiro. Cria as tabelas fundamentais do workspace.

-- -----------------------------------------------------------------------------
-- T005: Criar tabela workspaces
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificacao
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,

  -- Configuracoes
  settings JSONB DEFAULT '{}',

  -- Limites (por plano)
  max_projects INTEGER DEFAULT 5,
  max_members INTEGER DEFAULT 3,
  max_articles_per_month INTEGER DEFAULT 100,

  -- Billing (referencia futura - nullable pois plans pode nao existir)
  plan_id UUID,
  billing_email TEXT,

  -- Dono original (para fallback e billing)
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- Indice para busca por slug (unico apenas para nao-deletados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug) WHERE deleted_at IS NULL;

-- Indice para owner
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspaces_updated_at ON workspaces;
CREATE TRIGGER trigger_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspaces_updated_at();

-- -----------------------------------------------------------------------------
-- T006: Criar tabela workspace_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role e permissoes
  role TEXT NOT NULL DEFAULT 'member',
  -- 'owner': controle total, billing, pode deletar workspace
  -- 'admin': pode gerenciar membros, projetos, configuracoes
  -- 'member': pode criar/editar conteudo, nao gerencia
  -- 'viewer': apenas visualizacao

  -- Permissoes granulares (override do role)
  permissions JSONB DEFAULT '{}',

  -- Convite
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending': convite enviado
  -- 'active': membro ativo
  -- 'suspended': acesso suspenso
  -- 'left': saiu voluntariamente

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(workspace_id, user_id)
);

-- Indices para queries comuns
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_status ON workspace_members(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_workspace_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER trigger_workspace_members_updated_at
  BEFORE UPDATE ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_members_updated_at();

-- -----------------------------------------------------------------------------
-- T007: Criar tabela workspace_invitations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Email do convidado (pode nao ter conta ainda)
  email TEXT NOT NULL,

  -- Role que tera ao aceitar
  role TEXT NOT NULL DEFAULT 'member',

  -- Token unico para aceitar convite
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Quem convidou
  invited_by UUID NOT NULL REFERENCES auth.users(id),

  -- Expiracao
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending': aguardando aceite
  -- 'accepted': aceito
  -- 'expired': expirou
  -- 'cancelled': cancelado

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);

-- -----------------------------------------------------------------------------
-- T008: Criar tabela workspace_keywords (juncao)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_keywords (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (workspace_id, keyword_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_keywords_workspace ON workspace_keywords(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_keywords_keyword ON workspace_keywords(keyword_id);


-- =============================================================================
-- PART 2: ALTERAR TABELAS EXISTENTES (ADITIVO APENAS)
-- =============================================================================
-- Adiciona novas colunas. NAO remove colunas existentes.

-- -----------------------------------------------------------------------------
-- T009: Adicionar workspace_id em projects
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- T010: Adicionar project_id em connections
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'connections' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE connections ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- T011: Adicionar workspace_id em message_triggers
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_triggers' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE message_triggers ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- T012: Adicionar project_id em message_triggers
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'message_triggers' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE message_triggers ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- T013: Adicionar workspace_id em tasks
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- T014: Criar indices para novas colunas
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_connections_project ON connections(project_id);
CREATE INDEX IF NOT EXISTS idx_triggers_workspace ON message_triggers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_triggers_project ON message_triggers(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);


-- =============================================================================
-- PART 3: RLS POLICIES (ADITIVAS)
-- =============================================================================
-- Adiciona novas policies SEM remover as existentes.
-- Usa OR para permitir acesso tanto pelo novo modelo quanto pelo legado.

-- -----------------------------------------------------------------------------
-- T015: Habilitar RLS em workspaces
-- -----------------------------------------------------------------------------
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- T015: workspaces_member_select - Usuarios veem workspaces onde sao membros
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspaces_member_select" ON workspaces;
CREATE POLICY "workspaces_member_select" ON workspaces
FOR SELECT USING (
  id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR owner_user_id = auth.uid()
);

-- -----------------------------------------------------------------------------
-- T016: workspaces_admin_update - Apenas owners/admins podem atualizar
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspaces_admin_update" ON workspaces;
CREATE POLICY "workspaces_admin_update" ON workspaces
FOR UPDATE USING (
  id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin')
  )
);

-- -----------------------------------------------------------------------------
-- T017: workspaces_insert - Qualquer usuario autenticado pode criar
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
CREATE POLICY "workspaces_insert" ON workspaces
FOR INSERT WITH CHECK (owner_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- T018: workspaces_owner_delete - Apenas owner pode deletar
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "workspaces_owner_delete" ON workspaces;
CREATE POLICY "workspaces_owner_delete" ON workspaces
FOR DELETE USING (owner_user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- T019: RLS para workspace_members
-- -----------------------------------------------------------------------------
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Membros podem ver outros membros do mesmo workspace
DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
CREATE POLICY "workspace_members_select" ON workspace_members
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  )
  OR user_id = auth.uid() -- usuario pode ver seu proprio registro
);

-- Admins podem inserir membros
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
CREATE POLICY "workspace_members_insert" ON workspace_members
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin')
  )
  OR user_id = auth.uid() -- usuario pode aceitar convite para si
);

-- Admins podem atualizar membros
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
CREATE POLICY "workspace_members_update" ON workspace_members
FOR UPDATE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin')
  )
  OR user_id = auth.uid() -- usuario pode atualizar seu proprio status
);

-- Admins podem remover membros
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;
CREATE POLICY "workspace_members_delete" ON workspace_members
FOR DELETE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin')
  )
);

-- -----------------------------------------------------------------------------
-- RLS para workspace_invitations
-- -----------------------------------------------------------------------------
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Admins podem ver convites do workspace
DROP POLICY IF EXISTS "workspace_invitations_select" ON workspace_invitations;
CREATE POLICY "workspace_invitations_select" ON workspace_invitations
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin')
  )
);

-- Admins podem criar convites
DROP POLICY IF EXISTS "workspace_invitations_insert" ON workspace_invitations;
CREATE POLICY "workspace_invitations_insert" ON workspace_invitations
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin')
  )
);

-- Admins podem cancelar convites
DROP POLICY IF EXISTS "workspace_invitations_delete" ON workspace_invitations;
CREATE POLICY "workspace_invitations_delete" ON workspace_invitations
FOR DELETE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin')
  )
);

-- -----------------------------------------------------------------------------
-- RLS para workspace_keywords
-- -----------------------------------------------------------------------------
ALTER TABLE workspace_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_keywords_select" ON workspace_keywords;
CREATE POLICY "workspace_keywords_select" ON workspace_keywords
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid() AND wm.status = 'active'
  )
);

DROP POLICY IF EXISTS "workspace_keywords_insert" ON workspace_keywords;
CREATE POLICY "workspace_keywords_insert" ON workspace_keywords
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin', 'member')
  )
);

DROP POLICY IF EXISTS "workspace_keywords_delete" ON workspace_keywords;
CREATE POLICY "workspace_keywords_delete" ON workspace_keywords
FOR DELETE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin')
  )
);

-- -----------------------------------------------------------------------------
-- T020: projects_workspace_access - Acesso via workspace OU user_id (legado)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "projects_workspace_access" ON projects;
CREATE POLICY "projects_workspace_access" ON projects
FOR ALL USING (
  -- Novo: acesso via workspace membership
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  -- Legado: acesso direto por user_id (mantido para WeWeb)
  user_id = auth.uid()
);

-- -----------------------------------------------------------------------------
-- T021: connections_project_access - Acesso via projeto OU user_id (legado)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "connections_project_access" ON connections;
CREATE POLICY "connections_project_access" ON connections
FOR ALL USING (
  -- Novo: acesso via projeto (que pertence a workspace)
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  OR
  -- Legado: acesso direto por user_id
  user_id = auth.uid()
);

-- -----------------------------------------------------------------------------
-- T022: triggers_workspace_access - Acesso via workspace/projeto OU owner (legado)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "triggers_workspace_access" ON message_triggers;
CREATE POLICY "triggers_workspace_access" ON message_triggers
FOR ALL USING (
  -- Novo: acesso via workspace
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  -- Novo: acesso via projeto
  project_id IN (
    SELECT p.id FROM projects p
    WHERE p.workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  OR
  -- Legado: acesso direto por owner_user_id
  owner_user_id = auth.uid()
);

-- -----------------------------------------------------------------------------
-- T023: tasks_workspace_access - Acesso via workspace OU user_id (legado)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_workspace_access" ON tasks;
CREATE POLICY "tasks_workspace_access" ON tasks
FOR ALL USING (
  -- Novo: acesso via workspace
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR
  -- Legado: acesso direto por user_id
  user_id = auth.uid()
);


-- =============================================================================
-- PART 4: MIGRACAO DE DADOS
-- =============================================================================
-- Cria workspaces para usuarios existentes e vincula dados.
-- Script idempotente - pode ser executado multiplas vezes.

-- -----------------------------------------------------------------------------
-- T024: Criar workspaces para usuarios existentes com projetos
-- -----------------------------------------------------------------------------
INSERT INTO workspaces (name, slug, owner_user_id, max_projects, max_members)
SELECT
  COALESCE(u.raw_user_meta_data->>'name', u.email, 'Meu Workspace') as name,
  LOWER(REGEXP_REPLACE(
    COALESCE(
      u.raw_user_meta_data->>'name',
      SPLIT_PART(u.email, '@', 1),
      u.id::text
    ),
    '[^a-zA-Z0-9]', '-', 'g'
  )) || '-' || SUBSTRING(u.id::text, 1, 8) as slug,
  u.id as owner_user_id,
  10 as max_projects,
  5 as max_members
FROM auth.users u
WHERE EXISTS (SELECT 1 FROM projects p WHERE p.user_id = u.id)
AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.owner_user_id = u.id)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- T025: Adicionar owners como membros do proprio workspace
-- -----------------------------------------------------------------------------
INSERT INTO workspace_members (workspace_id, user_id, role, status, accepted_at)
SELECT w.id, w.owner_user_id, 'owner', 'active', NOW()
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_user_id
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- T026: Vincular projetos aos workspaces
-- -----------------------------------------------------------------------------
UPDATE projects p
SET workspace_id = (
  SELECT w.id FROM workspaces w
  WHERE w.owner_user_id = p.user_id
  LIMIT 1
)
WHERE p.workspace_id IS NULL
AND EXISTS (
  SELECT 1 FROM workspaces w WHERE w.owner_user_id = p.user_id
);

-- -----------------------------------------------------------------------------
-- T027: Vincular conexoes aos projetos (quando possivel inferir)
-- Conexoes de usuarios com apenas 1 projeto vao para esse projeto
-- -----------------------------------------------------------------------------
UPDATE connections c
SET project_id = (
  SELECT p.id FROM projects p
  WHERE p.user_id = c.user_id
  AND (p.is_deleted = false OR p.is_deleted IS NULL)
  LIMIT 1
)
WHERE c.project_id IS NULL
AND (
  SELECT COUNT(*) FROM projects p
  WHERE p.user_id = c.user_id
  AND (p.is_deleted = false OR p.is_deleted IS NULL)
) = 1;

-- -----------------------------------------------------------------------------
-- T028: Vincular triggers aos workspaces
-- -----------------------------------------------------------------------------
UPDATE message_triggers t
SET workspace_id = (
  SELECT w.id FROM workspaces w
  WHERE w.owner_user_id = t.owner_user_id
  LIMIT 1
)
WHERE t.workspace_id IS NULL
AND EXISTS (
  SELECT 1 FROM workspaces w WHERE w.owner_user_id = t.owner_user_id
);

-- -----------------------------------------------------------------------------
-- T029: Vincular tasks aos workspaces
-- -----------------------------------------------------------------------------
UPDATE tasks t
SET workspace_id = (
  SELECT w.id FROM workspaces w
  WHERE w.owner_user_id = t.user_id
  LIMIT 1
)
WHERE t.workspace_id IS NULL
AND EXISTS (
  SELECT 1 FROM workspaces w WHERE w.owner_user_id = t.user_id
);


-- =============================================================================
-- PART 5: VALIDACAO
-- =============================================================================
-- Execute estas queries para validar a migracao.

-- T030: Validar integridade dos dados
-- -----------------------------------------------------------------------------

-- Verificar workspaces criados
SELECT 'Workspaces criados' as check_name, COUNT(*) as count FROM workspaces;

-- Verificar membros criados
SELECT 'Membros criados' as check_name, COUNT(*) as count FROM workspace_members;

-- Verificar projetos vinculados
SELECT 'Projetos vinculados' as check_name,
  COUNT(*) FILTER (WHERE workspace_id IS NOT NULL) as vinculados,
  COUNT(*) FILTER (WHERE workspace_id IS NULL) as nao_vinculados,
  COUNT(*) as total
FROM projects;

-- Verificar conexoes vinculadas
SELECT 'Conexoes vinculadas' as check_name,
  COUNT(*) FILTER (WHERE project_id IS NOT NULL) as vinculadas,
  COUNT(*) FILTER (WHERE project_id IS NULL) as nao_vinculadas,
  COUNT(*) as total
FROM connections;

-- Verificar triggers vinculados
SELECT 'Triggers vinculados' as check_name,
  COUNT(*) FILTER (WHERE workspace_id IS NOT NULL) as vinculados,
  COUNT(*) FILTER (WHERE workspace_id IS NULL) as nao_vinculados,
  COUNT(*) as total
FROM message_triggers;

-- Verificar tasks vinculadas
SELECT 'Tasks vinculadas' as check_name,
  COUNT(*) FILTER (WHERE workspace_id IS NOT NULL) as vinculadas,
  COUNT(*) FILTER (WHERE workspace_id IS NULL) as nao_vinculadas,
  COUNT(*) as total
FROM tasks;

-- Verificar se todos owners sao membros
SELECT 'Owners sem membership' as check_name, COUNT(*) as count
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_user_id
);


-- =============================================================================
-- ROLLBACK SCRIPT (EMERGENCIA)
-- =============================================================================
-- Execute APENAS em caso de problemas graves.
-- NAO execute se a migracao foi bem sucedida.

/*
-- 1. Remover novas policies
DROP POLICY IF EXISTS "projects_workspace_access" ON projects;
DROP POLICY IF EXISTS "connections_project_access" ON connections;
DROP POLICY IF EXISTS "triggers_workspace_access" ON message_triggers;
DROP POLICY IF EXISTS "tasks_workspace_access" ON tasks;

DROP POLICY IF EXISTS "workspaces_member_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_admin_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_owner_delete" ON workspaces;

DROP POLICY IF EXISTS "workspace_members_select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON workspace_members;

DROP POLICY IF EXISTS "workspace_invitations_select" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert" ON workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete" ON workspace_invitations;

DROP POLICY IF EXISTS "workspace_keywords_select" ON workspace_keywords;
DROP POLICY IF EXISTS "workspace_keywords_insert" ON workspace_keywords;
DROP POLICY IF EXISTS "workspace_keywords_delete" ON workspace_keywords;

-- 2. Remover indices das novas colunas
DROP INDEX IF EXISTS idx_projects_workspace;
DROP INDEX IF EXISTS idx_connections_project;
DROP INDEX IF EXISTS idx_triggers_workspace;
DROP INDEX IF EXISTS idx_triggers_project;
DROP INDEX IF EXISTS idx_tasks_workspace;

-- 3. Remover novas colunas
ALTER TABLE projects DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE connections DROP COLUMN IF EXISTS project_id;
ALTER TABLE message_triggers DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE message_triggers DROP COLUMN IF EXISTS project_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS workspace_id;

-- 4. Remover novas tabelas (ordem importa por FKs)
DROP TABLE IF EXISTS workspace_keywords;
DROP TABLE IF EXISTS workspace_invitations;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;

-- 5. Remover functions
DROP FUNCTION IF EXISTS update_workspaces_updated_at();
DROP FUNCTION IF EXISTS update_workspace_members_updated_at();
*/
