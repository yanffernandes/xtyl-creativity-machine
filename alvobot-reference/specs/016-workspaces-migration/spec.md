# Feature Specification: Workspaces & Project-Based Connections

**Feature Branch**: `016-workspaces-migration`
**Created**: 2025-12-13
**Status**: ✅ **Implementado**
**Priority**: Critical (Architectural Foundation)

## Overview

Esta spec define a migração do modelo atual **user-centric** (onde tudo pertence diretamente a um usuario) para um modelo **workspace-centric** com duas mudancas fundamentais:

1. **Workspaces**: Espacos de trabalho colaborativos onde multiplos usuarios podem participar com diferentes niveis de permissao
2. **Conexoes por Projeto**: Conexoes (Meta Pages, Google Accounts) atreladas a projetos ao inves de usuarios, permitindo que um blog com 300 paginas do Facebook seja gerenciado como uma unidade

### Objetivo Principal

Permitir colaboracao em equipe mantendo **compatibilidade total** com o sistema WeWeb existente que usa o mesmo banco de dados em producao.

### Modelo Atual vs Novo Modelo

```
MODELO ATUAL (User-Centric):
================================
User
├── Projects (user_id)
├── Connections (user_id)
│   └── Meta Pages (connection_id)
├── Triggers (owner_user_id)
├── Tasks (user_id)
├── Keywords (users_keywords junction)
└── Articles (user_id + project_id)

NOVO MODELO (Workspace-Centric):
================================
Workspace
├── Members (workspace_members)
│   ├── User A (role: owner)
│   ├── User B (role: admin)
│   └── User C (role: member)
├── Projects (workspace_id)
│   ├── Connections (project_id) ← MUDANCA
│   │   └── Meta Pages (connection_id)
│   ├── Triggers (project_id) ← MUDANCA
│   ├── Flows (project_id) ✓ ja existe
│   └── Articles (project_id)
├── Tasks (workspace_id)
└── Keywords (workspace_keywords junction)
```

## Estrategia de Compatibilidade

### Principio Fundamental: ZERO REMOCAO

O sistema WeWeb (legado) continuara funcionando com o mesmo banco de dados. Para isso:

1. **NENHUMA coluna existente sera removida** - apenas novas adicionadas
2. **NENHUMA RLS policy existente sera removida** - apenas novas adicionadas
3. **NENHUM indice existente sera removido** - apenas novos adicionados
4. **Migracao de dados via script** - usuarios existentes ganham workspace automaticamente
5. **Fallback para user_id** - se workspace_id nao existir, usa user_id

### Colunas que CONTINUAM EXISTINDO (nunca remover)

| Tabela | Coluna | Motivo |
|--------|--------|--------|
| `projects` | `user_id` | WeWeb usa para filtrar projetos do usuario |
| `connections` | `user_id` | WeWeb usa para filtrar conexoes |
| `message_triggers` | `owner_user_id` | WeWeb usa para ownership |
| `tasks` | `user_id` | WeWeb usa para filtrar tarefas |
| `articles` | `user_id` | WeWeb usa para filtrar artigos |
| `meta_pages` | `user_id` | WeWeb usa para filtrar paginas |

### Colunas NOVAS (adicionadas, nullable)

| Tabela | Nova Coluna | Tipo | Default |
|--------|-------------|------|---------|
| `projects` | `workspace_id` | UUID | NULL |
| `connections` | `project_id` | INTEGER | NULL |
| `message_triggers` | `workspace_id` | UUID | NULL |
| `message_triggers` | `project_id` | INTEGER | NULL |
| `tasks` | `workspace_id` | UUID | NULL |

### Coexistencia de Modelos

```sql
-- Exemplo de RLS expandido (nao substitui, adiciona)
CREATE POLICY "projects_workspace_access" ON projects
FOR ALL USING (
  -- Novo modelo: acesso via workspace
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
  OR
  -- Modelo legado: acesso direto por user_id
  user_id = auth.uid()
);
```

## Database Schema

### Novas Tabelas

#### 1. `workspaces` - Espaco de trabalho

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificacao
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly: "minha-empresa"
  description TEXT,
  logo_url TEXT,

  -- Configuracoes
  settings JSONB DEFAULT '{}',
  -- {
  --   "default_language": "pt-BR",
  --   "timezone": "America/Sao_Paulo",
  --   "features_enabled": ["flows", "triggers", "articles"]
  -- }

  -- Limites (por plano)
  max_projects INTEGER DEFAULT 5,
  max_members INTEGER DEFAULT 3,
  max_articles_per_month INTEGER DEFAULT 100,

  -- Billing (referencia futura)
  plan_id UUID REFERENCES plans(id),
  billing_email TEXT,

  -- Dono original (para fallback e billing)
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- Indice para busca por slug
CREATE UNIQUE INDEX idx_workspaces_slug ON workspaces(slug) WHERE deleted_at IS NULL;

-- Indice para owner
CREATE INDEX idx_workspaces_owner ON workspaces(owner_user_id);
```

#### 2. `workspace_members` - Membros do workspace

```sql
CREATE TABLE workspace_members (
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
  -- {
  --   "can_manage_members": false,
  --   "can_manage_projects": true,
  --   "can_manage_billing": false,
  --   "can_delete_content": true,
  --   "projects_access": ["uuid1", "uuid2"] -- null = todos
  -- }

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
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_status ON workspace_members(status);
```

#### 3. `workspace_invitations` - Convites pendentes

```sql
CREATE TABLE workspace_invitations (
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

CREATE INDEX idx_workspace_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_workspace_invitations_email ON workspace_invitations(email);
```

### Alteracoes em Tabelas Existentes

#### 1. `projects` - Adicionar workspace_id

```sql
-- Adicionar coluna workspace_id (nullable para compatibilidade)
ALTER TABLE projects
ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;

-- Indice para queries por workspace
CREATE INDEX idx_projects_workspace ON projects(workspace_id);

-- IMPORTANTE: NAO remover user_id - manter para compatibilidade
-- user_id continua sendo o "criador" do projeto
```

#### 2. `connections` - Mover de user para project

```sql
-- Adicionar project_id (conexao atrelada a projeto)
ALTER TABLE connections
ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- Indice para queries por projeto
CREATE INDEX idx_connections_project ON connections(project_id);

-- IMPORTANTE: NAO remover user_id - manter para compatibilidade
-- Conexoes antigas continuam funcionando via user_id
```

#### 3. `message_triggers` - Adicionar workspace_id e project_id

```sql
-- Adicionar workspace_id para triggers compartilhados
ALTER TABLE message_triggers
ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Adicionar project_id para triggers especificos de projeto
ALTER TABLE message_triggers
ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;

-- Indices
CREATE INDEX idx_triggers_workspace ON message_triggers(workspace_id);
CREATE INDEX idx_triggers_project ON message_triggers(project_id);

-- IMPORTANTE: owner_user_id continua existindo para compatibilidade
```

#### 4. `tasks` - Adicionar workspace_id

```sql
ALTER TABLE tasks
ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
```

#### 5. `keywords` - Nova tabela de juncao workspace

```sql
-- Nova tabela de juncao (adicional, nao substitui users_keywords)
CREATE TABLE workspace_keywords (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  keyword_id INTEGER NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (workspace_id, keyword_id)
);
```

### RLS Policies Expandidas

```sql
-- =====================================================
-- WORKSPACES
-- =====================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Usuarios podem ver workspaces onde sao membros
CREATE POLICY "workspaces_member_select" ON workspaces
FOR SELECT USING (
  id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
  OR owner_user_id = auth.uid()
);

-- Apenas owners/admins podem atualizar
CREATE POLICY "workspaces_admin_update" ON workspaces
FOR UPDATE USING (
  id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin')
  )
);

-- Qualquer usuario autenticado pode criar workspace
CREATE POLICY "workspaces_insert" ON workspaces
FOR INSERT WITH CHECK (owner_user_id = auth.uid());

-- Apenas owner pode deletar
CREATE POLICY "workspaces_owner_delete" ON workspaces
FOR DELETE USING (owner_user_id = auth.uid());

-- =====================================================
-- WORKSPACE_MEMBERS
-- =====================================================

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Membros podem ver outros membros do mesmo workspace
CREATE POLICY "workspace_members_select" ON workspace_members
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Admins podem gerenciar membros
CREATE POLICY "workspace_members_admin_manage" ON workspace_members
FOR ALL USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin')
  )
);

-- =====================================================
-- PROJECTS (Expandido)
-- =====================================================

-- Adicionar policy para acesso via workspace (NAO remove policies existentes)
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

-- =====================================================
-- CONNECTIONS (Expandido)
-- =====================================================

-- Adicionar policy para acesso via projeto
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

-- =====================================================
-- MESSAGE_TRIGGERS (Expandido)
-- =====================================================

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
```

## Migracao de Dados

### Script de Migracao Automatica

Usuarios existentes recebem workspace automaticamente:

```sql
-- =====================================================
-- MIGRACAO: Criar workspaces para usuarios existentes
-- =====================================================

-- 1. Criar workspace para cada usuario que tem projetos
INSERT INTO workspaces (name, slug, owner_user_id, max_projects, max_members)
SELECT
  COALESCE(u.name, u.email, 'Meu Workspace') as name,
  LOWER(REGEXP_REPLACE(
    COALESCE(u.name, SPLIT_PART(u.email, '@', 1), u.id::text),
    '[^a-zA-Z0-9]', '-', 'g'
  )) || '-' || SUBSTRING(u.id::text, 1, 8) as slug,
  u.id as owner_user_id,
  10 as max_projects, -- limite generoso para migracao
  5 as max_members
FROM auth.users u
WHERE EXISTS (SELECT 1 FROM projects p WHERE p.user_id = u.id)
ON CONFLICT DO NOTHING;

-- 2. Adicionar owner como membro do proprio workspace
INSERT INTO workspace_members (workspace_id, user_id, role, status, accepted_at)
SELECT w.id, w.owner_user_id, 'owner', 'active', NOW()
FROM workspaces w
ON CONFLICT DO NOTHING;

-- 3. Vincular projetos aos workspaces
UPDATE projects p
SET workspace_id = (
  SELECT w.id FROM workspaces w
  WHERE w.owner_user_id = p.user_id
  LIMIT 1
)
WHERE p.workspace_id IS NULL;

-- 4. Vincular conexoes aos projetos (quando possivel inferir)
-- Conexoes de usuarios com apenas 1 projeto vao para esse projeto
UPDATE connections c
SET project_id = (
  SELECT p.id FROM projects p
  WHERE p.user_id = c.user_id
  AND p.is_deleted = false
  LIMIT 1
)
WHERE c.project_id IS NULL
AND (SELECT COUNT(*) FROM projects p WHERE p.user_id = c.user_id AND p.is_deleted = false) = 1;

-- 5. Vincular triggers aos workspaces
UPDATE message_triggers t
SET workspace_id = (
  SELECT w.id FROM workspaces w
  WHERE w.owner_user_id = t.owner_user_id
  LIMIT 1
)
WHERE t.workspace_id IS NULL;

-- 6. Vincular tasks aos workspaces
UPDATE tasks t
SET workspace_id = (
  SELECT w.id FROM workspaces w
  WHERE w.owner_user_id = t.user_id
  LIMIT 1
)
WHERE t.workspace_id IS NULL;
```

## User Scenarios & Testing

### User Story 1 - Workspace Automatico (Priority: P0)

Usuarios existentes continuam usando o sistema normalmente, com workspace criado automaticamente.

**Acceptance Scenarios**:

1. **Given** usuario existente com projetos, **When** acessa sistema apos migracao, **Then** ve seus projetos normalmente com workspace implicito
2. **Given** novo usuario cadastrado, **When** cria primeiro projeto, **Then** workspace e criado automaticamente em background
3. **Given** usuario do WeWeb (legado), **When** acessa via WeWeb, **Then** sistema funciona identicamente (sem quebra)

---

### User Story 2 - Gerenciar Workspace (Priority: P1)

Usuarios podem visualizar e configurar seu workspace, incluindo nome e configuracoes.

**Acceptance Scenarios**:

1. **Given** usuario logado, **When** acessa configuracoes, **Then** ve secao "Workspace" com nome e configuracoes
2. **Given** owner do workspace, **When** edita nome/slug, **Then** alteracoes sao salvas e refletidas
3. **Given** membro comum, **When** tenta editar workspace, **Then** ve opcoes em modo somente leitura

---

### User Story 3 - Convidar Membros (Priority: P1)

Owners e admins podem convidar outros usuarios para o workspace.

**Acceptance Scenarios**:

1. **Given** owner do workspace, **When** clica "Convidar membro", **Then** ve modal com campo de email e selecao de role
2. **Given** convite enviado, **When** usuario aceita, **Then** aparece na lista de membros com role definido
3. **Given** email de usuario inexistente, **When** convite e aceito, **Then** usuario e criado e adicionado ao workspace
4. **Given** convite pendente ha 7+ dias, **When** tenta aceitar, **Then** ve erro "Convite expirado"

---

### User Story 4 - Gerenciar Membros (Priority: P1)

Owners e admins podem alterar roles e remover membros.

**Acceptance Scenarios**:

1. **Given** admin do workspace, **When** acessa lista de membros, **Then** ve todos membros com seus roles
2. **Given** owner visualizando membro, **When** altera role, **Then** permissoes sao atualizadas imediatamente
3. **Given** admin tentando alterar owner, **When** tenta, **Then** ve erro "Nao e possivel alterar owner"
4. **Given** membro removido, **When** tenta acessar recursos, **Then** perde acesso imediatamente

---

### User Story 5 - Conexoes por Projeto (Priority: P1)

Conexoes Meta/Google sao atreladas a projetos, nao usuarios.

**Acceptance Scenarios**:

1. **Given** projeto existente, **When** conecta pagina do Meta, **Then** conexao e vinculada ao projeto
2. **Given** projeto com 300 paginas Meta, **When** cria trigger, **Then** pode selecionar "Todas as paginas do projeto"
3. **Given** usuario membro do workspace, **When** visualiza projeto, **Then** ve conexoes do projeto (nao suas pessoais)
4. **Given** conexao antiga (user-level), **When** migra para projeto, **Then** funciona normalmente

---

### User Story 6 - Triggers por Projeto (Priority: P1)

Triggers podem ser associados a projetos para selecao automatica de paginas.

**Acceptance Scenarios**:

1. **Given** trigger vinculado a projeto, **When** novas paginas sao conectadas, **Then** trigger funciona para todas automaticamente
2. **Given** trigger sem projeto (global workspace), **When** seleciona paginas, **Then** selecao manual como antes
3. **Given** membro do workspace, **When** cria trigger, **Then** pode escolher projeto ou deixar global

---

### User Story 7 - Trocar de Workspace (Priority: P2)

Usuarios membros de multiplos workspaces podem alternar entre eles.

**Acceptance Scenarios**:

1. **Given** usuario em 2+ workspaces, **When** acessa sistema, **Then** ve seletor de workspace no header
2. **Given** workspace selecionado, **When** troca para outro, **Then** ve projetos/recursos daquele workspace
3. **Given** usuario em apenas 1 workspace, **When** acessa sistema, **Then** nao ve seletor (workspace implicito)

---

### User Story 8 - Criar Novo Workspace (Priority: P2)

Usuarios podem criar workspaces adicionais.

**Acceptance Scenarios**:

1. **Given** usuario logado, **When** clica "Criar novo workspace", **Then** ve formulario com nome e configuracoes
2. **Given** workspace criado, **When** completa, **Then** e automaticamente owner e pode convidar membros
3. **Given** usuario no limite de workspaces do plano, **When** tenta criar, **Then** ve upsell para upgrade

## Requirements

### Functional Requirements

#### Core Workspace

- **WS-001**: Sistema DEVE criar workspace automaticamente para usuarios existentes na migracao
- **WS-002**: Sistema DEVE criar workspace automaticamente quando novo usuario cria primeiro projeto
- **WS-003**: Sistema DEVE permitir renomear workspace (apenas owner/admin)
- **WS-004**: Sistema DEVE manter compatibilidade com WeWeb legado via RLS expandido
- **WS-005**: Sistema DEVE suportar soft delete de workspaces

#### Members & Permissions

- **WS-010**: Sistema DEVE suportar 4 roles: owner, admin, member, viewer
- **WS-011**: Sistema DEVE permitir convite por email com token unico
- **WS-012**: Sistema DEVE expirar convites apos 7 dias
- **WS-013**: Sistema DEVE permitir permissoes granulares via JSONB
- **WS-014**: Sistema DEVE impedir remocao do ultimo owner
- **WS-015**: Sistema DEVE notificar por email sobre convites e mudancas de role

#### Connections por Projeto

- **WS-020**: Sistema DEVE permitir vincular conexao a projeto especifico
- **WS-021**: Sistema DEVE manter conexoes user-level funcionando (compatibilidade)
- **WS-022**: Sistema DEVE permitir mover conexao de user-level para project-level
- **WS-023**: Sistema DEVE exibir todas paginas do projeto quando trigger vinculado a projeto
- **WS-024**: Sistema DEVE herdar permissoes de conexao do projeto/workspace

#### Triggers & Flows

- **WS-030**: Sistema DEVE adicionar campo project_id em triggers
- **WS-031**: Sistema DEVE permitir trigger "global" (workspace-level) ou "especifico" (project-level)
- **WS-032**: Sistema DEVE selecionar automaticamente todas paginas quando trigger vinculado a projeto
- **WS-033**: Sistema DEVE manter page_ids manual como fallback

#### UI/UX

- **WS-040**: Sistema DEVE exibir workspace switcher quando usuario em 2+ workspaces
- **WS-041**: Sistema DEVE persistir ultimo workspace selecionado
- **WS-042**: Sistema DEVE exibir badge de role do usuario no workspace
- **WS-043**: Sistema DEVE mostrar lista de membros com status e role

### Security Requirements

- **SEC-WS-001**: Sistema DEVE validar membership em todas operacoes de workspace
- **SEC-WS-002**: Sistema DEVE impedir escalacao de privilegios (member nao pode virar admin)
- **SEC-WS-003**: Sistema DEVE logar todas mudancas de membership
- **SEC-WS-004**: Sistema DEVE validar ownership antes de operacoes destrutivas
- **SEC-WS-005**: Sistema DEVE sanitizar tokens de convite

### Non-Functional Requirements

- **NFR-WS-001**: Migracao DEVE completar em < 5 minutos para base existente
- **NFR-WS-002**: RLS expandido DEVE adicionar < 10ms de latencia
- **NFR-WS-003**: Sistema DEVE suportar ate 50 membros por workspace
- **NFR-WS-004**: Sistema DEVE suportar usuario em ate 10 workspaces

## Key Entities

### Workspace

```typescript
interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  settings: WorkspaceSettings
  max_projects: number
  max_members: number
  max_articles_per_month: number
  plan_id?: string
  billing_email?: string
  owner_user_id: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

interface WorkspaceSettings {
  default_language?: string
  timezone?: string
  features_enabled?: string[]
}
```

### WorkspaceMember

```typescript
interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  permissions: MemberPermissions
  invited_by?: string
  invited_at: string
  accepted_at?: string
  status: 'pending' | 'active' | 'suspended' | 'left'
  created_at: string
  updated_at: string

  // Joined
  user?: {
    id: string
    name: string
    email: string
    image?: string
  }
}

interface MemberPermissions {
  can_manage_members?: boolean
  can_manage_projects?: boolean
  can_manage_billing?: boolean
  can_delete_content?: boolean
  projects_access?: string[] | null // null = all
}
```

### WorkspaceInvitation

```typescript
interface WorkspaceInvitation {
  id: string
  workspace_id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  token: string
  invited_by: string
  expires_at: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  created_at: string
  accepted_at?: string
}
```

## Implementation Plan

### Phase 0: Preparacao (1 dia)

1. Criar branch `016-workspaces-migration`
2. Backup do banco de producao
3. Documentar estado atual das RLS policies
4. Criar ambiente de teste isolado

### Phase 1: Schema & Migracao (2 dias)

1. Criar tabelas `workspaces`, `workspace_members`, `workspace_invitations`
2. Adicionar colunas `workspace_id` e `project_id` nas tabelas existentes
3. Criar RLS policies expandidas (NAO remover existentes)
4. Executar script de migracao de dados
5. Validar que WeWeb continua funcionando

### Phase 2: Backend - Core Workspace (2 dias)

1. Criar modulo `workspace` no NestJS
2. Implementar CRUD de workspaces
3. Implementar gestao de membros
4. Implementar sistema de convites
5. Criar guards de permissao por workspace

### Phase 3: Frontend - Workspace Context (2 dias)

1. Criar `WorkspaceContext` e `useWorkspace` hook
2. Implementar workspace switcher no header
3. Atualizar todas queries para filtrar por workspace
4. Criar pagina de configuracoes do workspace
5. Criar UI de gestao de membros

### Phase 4: Conexoes por Projeto (2 dias)

1. Atualizar UI de conexoes para vincular a projeto
2. Atualizar TriggerModal para selecao por projeto
3. Implementar "selecionar todas paginas do projeto"
4. Migrar conexoes existentes quando possivel
5. Testar fluxos de criacao de trigger

### Phase 5: Testes & Polish (2 dias)

1. Testar cenarios de compatibilidade WeWeb
2. Testar todos fluxos de membership
3. Testar migracoes de dados edge cases
4. Otimizar performance de RLS
5. Documentar mudancas para equipe

## Risks & Mitigations

### Risk 1: Quebra do WeWeb em Producao

**Impact**: Critico - Sistema legado para de funcionar
**Probability**: Media
**Mitigation**:
- RLS policies aditivas (nunca substituir)
- Testes extensivos com dump do banco de producao
- Rollback plan com scripts prontos
- Manter user_id em todas tabelas

### Risk 2: Performance de RLS com Subqueries

**Impact**: Alto - Sistema lento
**Probability**: Media
**Mitigation**:
- Indices em todas foreign keys
- Cache de membership no frontend
- Monitorar query plans
- Materializar membership se necessario

### Risk 3: Migracao de Dados Inconsistente

**Impact**: Alto - Usuarios perdem acesso
**Probability**: Baixa
**Mitigation**:
- Script de migracao idempotente
- Validacao pos-migracao
- Fallback para user_id se workspace_id null

### Risk 4: Conflito de Permissoes

**Impact**: Medio - Usuarios veem dados que nao deveriam
**Probability**: Baixa
**Mitigation**:
- Testes automatizados de RLS
- Audit log de acessos
- Review de todas policies

## Success Criteria

- **SC-001**: WeWeb continua funcionando 100% apos migracao
- **SC-002**: Usuarios existentes veem seus projetos sem mudanca
- **SC-003**: Novo usuario cria projeto e workspace e criado automaticamente
- **SC-004**: Convite de membro funciona end-to-end
- **SC-005**: Trigger com projeto seleciona todas paginas automaticamente
- **SC-006**: Tempo de query aumenta < 10% com novo RLS
- **SC-007**: Zero dados vazados entre workspaces

## Out of Scope

- Billing/cobranca por workspace (futuro)
- Auditoria detalhada de acoes (futuro)
- Transferencia de ownership (v2)
- Merge de workspaces (v2)
- API publica de workspaces (v2)
- SSO/SAML por workspace (enterprise)
- Customizacao de branding por workspace (enterprise)

## Glossary

- **Workspace**: Espaco de trabalho compartilhado entre multiplos usuarios
- **Owner**: Dono do workspace, controle total incluindo billing e exclusao
- **Admin**: Pode gerenciar membros e projetos, mas nao billing/exclusao
- **Member**: Pode criar e editar conteudo
- **Viewer**: Apenas visualizacao, sem edicao
- **Project-level connection**: Conexao atrelada a um projeto especifico
- **User-level connection**: Conexao atrelada a um usuario (modelo legado)
- **RLS**: Row Level Security - politicas de acesso a nivel de linha no PostgreSQL
