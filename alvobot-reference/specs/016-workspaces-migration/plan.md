# Implementation Plan: Workspaces & Project-Based Connections

**Feature**: 016-workspaces-migration
**Spec**: [spec.md](./spec.md)
**Data Model**: [data-model.md](./data-model.md)
**Status**: Ready for Implementation

## Technical Context

### Stack
- **Database**: Supabase PostgreSQL with RLS
- **Backend**: NestJS (TypeScript)
- **Frontend**: React + TanStack Query + Zustand
- **Auth**: Supabase Auth

### Key Constraints
1. **Zero Breaking Changes**: WeWeb legado deve continuar funcionando
2. **Additive Only**: Apenas adicionar colunas/policies, nunca remover
3. **Nullable Foreign Keys**: Novos campos sao nullable para compatibilidade
4. **Fallback Logic**: Se workspace_id = NULL, usa user_id

### Dependencies
- Supabase service_role para migracao de dados
- Sistema de email para convites (futuro)

---

## Phase 0: Preparacao

**Objetivo**: Preparar ambiente e garantir rollback seguro

### Tasks

#### 0.1 Criar branch e backup
```bash
git checkout -b 016-workspaces-migration
```
- [ ] Criar branch dedicada
- [ ] Documentar estado atual das RLS policies
- [ ] Criar script de rollback (DROP das novas tabelas/colunas)

#### 0.2 Ambiente de teste
- [ ] Criar projeto Supabase de teste (ou usar staging)
- [ ] Clonar schema atual para teste
- [ ] Preparar dados de teste representativos

**Deliverables**: Branch criada, rollback script pronto

---

## Phase 1: Database Schema

**Objetivo**: Criar estrutura de dados sem quebrar sistema existente

### Tasks

#### 1.1 Criar novas tabelas

```sql
-- workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  max_projects INTEGER DEFAULT 5,
  max_members INTEGER DEFAULT 3,
  max_articles_per_month INTEGER DEFAULT 100,
  plan_id UUID REFERENCES plans(id),
  billing_email TEXT,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_workspaces_slug ON workspaces(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_workspaces_owner ON workspaces(owner_user_id);
```

- [ ] Criar tabela `workspaces`
- [ ] Criar tabela `workspace_members`
- [ ] Criar tabela `workspace_invitations`
- [ ] Criar tabela `workspace_keywords`

#### 1.2 Adicionar colunas em tabelas existentes

```sql
-- projects
ALTER TABLE projects ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL;
CREATE INDEX idx_projects_workspace ON projects(workspace_id);

-- connections
ALTER TABLE connections ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX idx_connections_project ON connections(project_id);

-- message_triggers
ALTER TABLE message_triggers ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE message_triggers ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE;
CREATE INDEX idx_triggers_workspace ON message_triggers(workspace_id);
CREATE INDEX idx_triggers_project ON message_triggers(project_id);

-- tasks
ALTER TABLE tasks ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
```

- [ ] Adicionar `workspace_id` em `projects`
- [ ] Adicionar `project_id` em `connections`
- [ ] Adicionar `workspace_id` e `project_id` em `message_triggers`
- [ ] Adicionar `workspace_id` em `tasks`

#### 1.3 Criar RLS Policies (ADITIVAS)

- [ ] RLS para `workspaces` (select, insert, update, delete)
- [ ] RLS para `workspace_members`
- [ ] RLS expandido para `projects` (workspace OR user_id)
- [ ] RLS expandido para `connections` (project OR user_id)
- [ ] RLS expandido para `message_triggers` (workspace OR project OR owner_user_id)
- [ ] RLS expandido para `tasks` (workspace OR user_id)

#### 1.4 Executar migracao de dados

```sql
-- Script de migracao (ver spec.md para script completo)
-- 1. Criar workspaces para usuarios com projetos
-- 2. Adicionar owners como membros
-- 3. Vincular projetos aos workspaces
-- 4. Vincular conexoes aos projetos (quando possivel)
-- 5. Vincular triggers aos workspaces
-- 6. Vincular tasks aos workspaces
```

- [ ] Executar script de migracao
- [ ] Validar integridade dos dados
- [ ] Testar que WeWeb continua funcionando

**Deliverables**: Schema atualizado, dados migrados, WeWeb funcionando

---

## Phase 2: Backend - Core Workspace

**Objetivo**: API para gerenciamento de workspaces

### Tasks

#### 2.1 Modulo Workspace

```
backend/src/modules/workspace/
├── workspace.module.ts
├── workspace.controller.ts
├── workspace.service.ts
├── dto/
│   ├── create-workspace.dto.ts
│   ├── update-workspace.dto.ts
│   ├── invite-member.dto.ts
│   └── update-member.dto.ts
├── guards/
│   └── workspace-role.guard.ts
└── interfaces/
    └── workspace.interface.ts
```

- [ ] Criar estrutura do modulo
- [ ] Implementar DTOs com validacao

#### 2.2 Endpoints CRUD Workspace

```typescript
// GET /workspaces - Listar workspaces do usuario
// POST /workspaces - Criar novo workspace
// GET /workspaces/:id - Detalhes do workspace
// PATCH /workspaces/:id - Atualizar workspace
// DELETE /workspaces/:id - Soft delete workspace
```

- [ ] `GET /workspaces` - Listar workspaces
- [ ] `POST /workspaces` - Criar workspace
- [ ] `GET /workspaces/:id` - Detalhes
- [ ] `PATCH /workspaces/:id` - Atualizar
- [ ] `DELETE /workspaces/:id` - Soft delete

#### 2.3 Endpoints de Membros

```typescript
// GET /workspaces/:id/members - Listar membros
// POST /workspaces/:id/members/invite - Convidar por email
// PATCH /workspaces/:id/members/:userId - Alterar role
// DELETE /workspaces/:id/members/:userId - Remover membro
// POST /workspaces/invitations/:token/accept - Aceitar convite
```

- [ ] `GET /workspaces/:id/members` - Listar membros
- [ ] `POST /workspaces/:id/members/invite` - Convidar
- [ ] `PATCH /workspaces/:id/members/:userId` - Alterar role
- [ ] `DELETE /workspaces/:id/members/:userId` - Remover
- [ ] `POST /workspaces/invitations/:token/accept` - Aceitar convite

#### 2.4 Guards de Permissao

```typescript
@UseGuards(WorkspaceRoleGuard)
@WorkspaceRoles('owner', 'admin')
@Patch(':id')
async updateWorkspace() { ... }
```

- [ ] Criar `WorkspaceRoleGuard`
- [ ] Criar decorator `@WorkspaceRoles()`
- [ ] Implementar validacao de membership

**Deliverables**: API de workspaces funcional

---

## Phase 3: Frontend - Workspace Context

**Objetivo**: Integrar workspaces no React

### Tasks

#### 3.1 Store e Context

```typescript
// stores/workspaceStore.ts
interface WorkspaceState {
  currentWorkspace: Workspace | null
  workspaces: Workspace[]
  setCurrentWorkspace: (workspace: Workspace) => void
  // ...
}

// hooks/useWorkspace.ts
export function useWorkspace() {
  const store = useWorkspaceStore()
  const { data: workspaces } = useWorkspaces()
  // ...
}
```

- [ ] Criar `workspaceStore.ts` (Zustand)
- [ ] Criar `useWorkspace` hook
- [ ] Criar `useWorkspaces` query
- [ ] Criar `useWorkspaceMembers` query

#### 3.2 Workspace Switcher

```
src/shared/components/WorkspaceSwitcher/
├── WorkspaceSwitcher.tsx
├── WorkspaceSwitcher.module.css
└── index.ts
```

- [ ] Criar componente `WorkspaceSwitcher`
- [ ] Integrar no `Header` (apenas se 2+ workspaces)
- [ ] Persistir ultimo workspace no localStorage

#### 3.3 Pagina de Configuracoes

```
src/features/workspace/
├── pages/
│   └── WorkspaceSettingsPage.tsx
├── components/
│   ├── WorkspaceInfo.tsx
│   ├── MembersList.tsx
│   ├── InviteMemberModal.tsx
│   └── MemberRoleSelect.tsx
└── api/
    ├── useWorkspaces.ts
    ├── useWorkspaceMembers.ts
    └── mutations.ts
```

- [ ] Criar `WorkspaceSettingsPage`
- [ ] Criar `MembersList` component
- [ ] Criar `InviteMemberModal` component
- [ ] Adicionar rota `/settings/workspace`

#### 3.4 Atualizar Queries Existentes

- [ ] Atualizar `useProjects` para filtrar por workspace
- [ ] Atualizar `useTriggers` para filtrar por workspace
- [ ] Atualizar `useTasks` para filtrar por workspace
- [ ] Manter fallback para user_id quando workspace = null

**Deliverables**: UI de workspaces funcional, switching implementado

---

## Phase 4: Conexoes por Projeto

**Objetivo**: Vincular conexoes a projetos

### Tasks

#### 4.1 Atualizar UI de Conexoes

- [ ] Adicionar campo `project_id` no form de conexao
- [ ] Exibir projeto vinculado na lista de conexoes
- [ ] Permitir mover conexao entre projetos

#### 4.2 Atualizar TriggerModal

```typescript
// Opcao 1: Selecionar projeto (todas as paginas automaticamente)
// Opcao 2: Selecionar paginas manualmente (comportamento atual)

interface TriggerFormData {
  project_id?: string // Se preenchido, usa todas as paginas do projeto
  page_ids?: string[] // Se project_id null, selecao manual
}
```

- [ ] Adicionar select de projeto no `TriggerModal`
- [ ] Quando projeto selecionado, ocultar selecao de paginas
- [ ] Exibir badge "Todas as paginas do projeto"
- [ ] Manter selecao manual como fallback

#### 4.3 Backend - Resolver Paginas

```typescript
// Quando trigger tem project_id, buscar todas paginas do projeto
async getTriggeredPages(trigger: Trigger): Promise<string[]> {
  if (trigger.project_id) {
    const connections = await this.getProjectConnections(trigger.project_id)
    return connections.flatMap(c => c.page_ids)
  }
  return trigger.page_ids || []
}
```

- [ ] Criar service para resolver paginas por projeto
- [ ] Atualizar logica de disparo de triggers

**Deliverables**: Conexoes vinculadas a projetos, triggers simplificados

---

## Phase 5: Testes & Polish

**Objetivo**: Garantir qualidade e compatibilidade

### Tasks

#### 5.1 Testes de Compatibilidade WeWeb

- [ ] Testar login via WeWeb
- [ ] Testar listagem de projetos
- [ ] Testar criacao de projeto
- [ ] Testar triggers existentes
- [ ] Testar conexoes existentes

#### 5.2 Testes de Workspace

- [ ] Testar criacao de workspace
- [ ] Testar convite de membro
- [ ] Testar aceite de convite
- [ ] Testar alteracao de role
- [ ] Testar remocao de membro
- [ ] Testar troca de workspace

#### 5.3 Testes de Performance

- [ ] Medir latencia de queries com novo RLS
- [ ] Otimizar se necessario (indices, materializar)
- [ ] Testar com volume de dados realista

#### 5.4 Documentacao

- [ ] Documentar mudancas para equipe WeWeb
- [ ] Atualizar CLAUDE.md com novos patterns
- [ ] Criar guia de migracao para usuarios

**Deliverables**: Sistema testado, documentado, pronto para producao

---

## API Contracts

### Workspaces

```typescript
// GET /workspaces
interface ListWorkspacesResponse {
  workspaces: Workspace[]
}

// POST /workspaces
interface CreateWorkspaceRequest {
  name: string
  slug?: string // auto-generated if not provided
  description?: string
}

// PATCH /workspaces/:id
interface UpdateWorkspaceRequest {
  name?: string
  description?: string
  settings?: WorkspaceSettings
}
```

### Members

```typescript
// POST /workspaces/:id/members/invite
interface InviteMemberRequest {
  email: string
  role: 'admin' | 'member' | 'viewer'
}

// PATCH /workspaces/:id/members/:userId
interface UpdateMemberRequest {
  role: 'admin' | 'member' | 'viewer'
}

// POST /workspaces/invitations/:token/accept
interface AcceptInvitationResponse {
  workspace: Workspace
  member: WorkspaceMember
}
```

---

## Rollback Plan

Se algo der errado, executar na ordem:

```sql
-- 1. Remover novas policies (nao afeta as existentes)
DROP POLICY IF EXISTS "projects_workspace_access" ON projects;
DROP POLICY IF EXISTS "connections_project_access" ON connections;
DROP POLICY IF EXISTS "triggers_workspace_access" ON message_triggers;
-- ... outras policies novas

-- 2. Remover novas colunas
ALTER TABLE projects DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE connections DROP COLUMN IF EXISTS project_id;
ALTER TABLE message_triggers DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE message_triggers DROP COLUMN IF EXISTS project_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS workspace_id;

-- 3. Remover novas tabelas
DROP TABLE IF EXISTS workspace_keywords;
DROP TABLE IF EXISTS workspace_invitations;
DROP TABLE IF EXISTS workspace_members;
DROP TABLE IF EXISTS workspaces;
```

---

## Success Checklist

- [ ] WeWeb funciona 100% apos deploy
- [ ] Usuarios existentes veem seus projetos
- [ ] Novos usuarios criam workspace automaticamente
- [ ] Convites funcionam end-to-end
- [ ] Triggers com projeto selecionam todas paginas
- [ ] Performance < 10% degradacao
- [ ] Zero vazamento de dados entre workspaces

---

## Timeline Estimado

| Phase | Descricao | Duracao |
|-------|-----------|---------|
| 0 | Preparacao | 1 dia |
| 1 | Database Schema | 2 dias |
| 2 | Backend Core | 2 dias |
| 3 | Frontend Context | 2 dias |
| 4 | Conexoes por Projeto | 2 dias |
| 5 | Testes & Polish | 2 dias |
| **Total** | | **~11 dias** |
