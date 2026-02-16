# Feature Specification: Sistema de Logs e Atividades

**Feature Branch**: `015-logs-atividades`
**Created**: 2025-12-11
**Status**: ✅ Implementado
**Priority**: P2 (Medium - Enhances user experience and provides audit trail)

## Overview

Sistema completo de registro de logs e atividades do usuário no AlvoBot, permitindo rastreamento de ações, auditoria de segurança e melhor compreensão do histórico de uso. O sistema registra automaticamente eventos importantes e os exibe de forma estruturada no dashboard e em uma página dedicada de histórico.

### Context

Currently, AlvoBot lacks a comprehensive activity tracking system. Users cannot see their recent actions, troubleshoot issues, or understand system events. This feature will provide transparency, improve debugging, and enhance user confidence by showing a clear audit trail of their work.

### User Value

- **Transparência**: Usuários podem ver exatamente o que aconteceu em sua conta
- **Auditoria**: Rastreamento completo para fins de segurança e compliance
- **Troubleshooting**: Facilita identificação de problemas através do histórico
- **Engajamento**: Widget de atividades recentes aumenta sensação de progresso
- **Confiança**: Sistema transparente aumenta confiança na plataforma

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualização de Atividades Recentes no Dashboard (Priority: P1)

Como usuário, quero ver minhas atividades recentes no dashboard para acompanhar rapidamente o que aconteceu na minha conta.

**Why this priority**: O widget de atividades recentes é a feature mais visível e de maior impacto imediato na experiência do usuário. Implementar isto primeiro demonstra valor rapidamente.

**Independent Test**: Pode ser testado realizando várias ações (login, criar projeto, criar artigo) e verificando se aparecem no widget do dashboard.

**Acceptance Scenarios**:

1. **Given** um usuário logado visualizando o dashboard, **When** a página carrega, **Then** o widget exibe as últimas 10 atividades com ícone, descrição, timestamp relativo e link (quando aplicável)
2. **Given** um usuário realiza uma nova ação (ex: cria um projeto), **When** retorna ao dashboard, **Then** a nova atividade aparece no topo da lista
3. **Given** um usuário sem atividades recentes, **When** visualiza o dashboard, **Then** vê uma mensagem "Nenhuma atividade recente"
4. **Given** um usuário clica em uma atividade no widget, **When** a atividade tem link associado, **Then** é redirecionado para o recurso relacionado

---

### User Story 2 - Página de Histórico Completo (Priority: P2)

Como usuário, quero acessar uma página com histórico completo de atividades para investigar ações passadas e entender o que aconteceu em períodos específicos.

**Why this priority**: Complementa o widget do dashboard com funcionalidades avançadas de pesquisa e filtragem. Útil para troubleshooting e auditoria detalhada.

**Independent Test**: Pode ser testado acessando a página de histórico, aplicando filtros (tipo, data, projeto) e verificando se os resultados são corretos.

**Acceptance Scenarios**:

1. **Given** um usuário acessa a página de histórico, **When** a página carrega, **Then** vê uma lista paginada de atividades com 50 itens por página
2. **Given** um usuário na página de histórico, **When** aplica filtro por tipo de atividade (ex: "artigos"), **Then** vê apenas atividades desse tipo
3. **Given** um usuário na página de histórico, **When** aplica filtro por data (ex: últimos 7 dias), **Then** vê apenas atividades nesse período
4. **Given** um usuário na página de histórico, **When** usa a busca por texto (ex: "projeto marketing"), **Then** vê atividades que contenham esse texto na descrição
5. **Given** um usuário com mais de 50 atividades, **When** navega entre páginas, **Then** a paginação funciona corretamente mantendo os filtros aplicados

---

### User Story 3 - Registro Automático de Eventos (Priority: P1)

Como sistema, quero registrar automaticamente eventos importantes para que usuários possam consultar seu histórico sem esforço manual.

**Why this priority**: É a fundação do sistema. Sem registro automático, não há dados para exibir. Deve ser implementado junto com as queries de leitura.

**Independent Test**: Pode ser testado realizando ações específicas e verificando se os logs foram criados corretamente no banco de dados.

**Acceptance Scenarios**:

1. **Given** um usuário faz login, **When** autenticação é bem-sucedida, **Then** um log de tipo "auth" com ação "login" é criado
2. **Given** um usuário cria um projeto, **When** o projeto é salvo, **Then** um log de tipo "project" com ação "created" é criado com referência ao projeto
3. **Given** um usuário deleta um artigo, **When** a exclusão é confirmada, **Then** um log de tipo "article" com ação "deleted" é criado (sem referência, pois foi deletado)
4. **Given** ocorre um erro em uma operação, **When** o erro é capturado, **Then** um log de tipo "error" é criado com nível "error" e detalhes sanitizados
5. **Given** um usuário executa um fluxo, **When** o fluxo completa, **Then** um log de tipo "flow" com ação "executed" e status de sucesso/falha é criado

---

### User Story 4 - Níveis de Severidade e Tratamento de Erros (Priority: P2)

Como desenvolvedor e usuário, quero que logs tenham níveis de severidade apropriados para que eu possa filtrar por importância e entender a criticidade de cada evento.

**Why this priority**: Melhora a organização e permite priorização de investigação. Especialmente importante para logs de erro.

**Independent Test**: Pode ser testado verificando se diferentes tipos de eventos geram logs com níveis corretos (info, warning, error).

**Acceptance Scenarios**:

1. **Given** uma operação normal é concluída, **When** o log é criado, **Then** tem nível "info"
2. **Given** ocorre uma situação que não impede a operação mas merece atenção, **When** o log é criado, **Then** tem nível "warning"
3. **Given** ocorre um erro que impede uma operação, **When** o log é criado, **Then** tem nível "error"
4. **Given** um erro contém informações sensíveis (API keys, tokens), **When** o log é criado, **Then** detalhes sensíveis são omitidos/sanitizados
5. **Given** um usuário filtra por nível "error", **When** visualiza o histórico, **Then** vê apenas logs de erro

---

### Edge Cases

- **O que acontece quando um usuário tem milhares de logs?** → Paginação eficiente com índices no banco, limitação de retenção (90 dias)
- **Como tratar referências a recursos deletados?** → Logs mantêm descrição textual mesmo se recurso for deletado; link fica inativo
- **O que fazer se o registro de log falhar?** → Não deve quebrar a operação principal; log failure é silencioso mas monitorado
- **Como garantir performance ao registrar logs em alta frequência?** → Usar batch inserts quando possível; considerar async logging
- **Como evitar logs duplicados?** → Registrar apenas em pontos estratégicos (após confirmação de sucesso)
- **O que mostrar se o servidor estiver com timestamp diferente do cliente?** → Usar server timestamps (UTC) e converter para timezone do usuário no frontend

## Requirements *(mandatory)*

### Functional Requirements

#### Core Logging
- **FR-001**: Sistema DEVE registrar automaticamente eventos de autenticação (login, logout, reset password)
- **FR-002**: Sistema DEVE registrar automaticamente operações CRUD em projetos (create, update, delete)
- **FR-003**: Sistema DEVE registrar automaticamente operações CRUD em artigos (create, update, delete, publish)
- **FR-004**: Sistema DEVE registrar automaticamente execuções de fluxos com status de sucesso/falha
- **FR-005**: Sistema DEVE registrar automaticamente disparos de mensagens (email, webhook, etc.)
- **FR-006**: Sistema DEVE registrar automaticamente erros capturados com stack trace sanitizado
- **FR-007**: Sistema DEVE associar cada log ao usuário que executou a ação (user_id)
- **FR-008**: Sistema DEVE registrar timestamp de cada evento em UTC

#### Data Model
- **FR-009**: Cada log DEVE ter: id, user_id, type, action, level, description, metadata (JSON), resource_type, resource_id, created_at
- **FR-010**: Sistema DEVE suportar níveis: "info", "warning", "error"
- **FR-011**: Sistema DEVE suportar tipos: "auth", "project", "article", "flow", "dispatch", "task", "keyword", "connection", "system", "error"
- **FR-012**: Metadata DEVE permitir armazenar dados adicionais específicos por tipo (ex: flow_id, article_title, error_code)

#### Display - Dashboard Widget
- **FR-013**: Dashboard DEVE exibir widget com as últimas 10 atividades do usuário
- **FR-014**: Cada atividade no widget DEVE mostrar: ícone representativo, descrição em português, timestamp relativo (ex: "há 5 minutos")
- **FR-015**: Atividades com recurso existente DEVEM ter link clicável para o recurso
- **FR-016**: Widget DEVE atualizar automaticamente quando usuário retorna ao dashboard
- **FR-017**: Widget DEVE mostrar empty state quando não há atividades

#### Display - History Page
- **FR-018**: Sistema DEVE ter página dedicada de histórico acessível via menu
- **FR-019**: Página de histórico DEVE exibir lista paginada com 50 itens por página
- **FR-020**: Sistema DEVE permitir filtro por tipo de atividade (dropdown multi-select)
- **FR-021**: Sistema DEVE permitir filtro por nível (info, warning, error)
- **FR-022**: Sistema DEVE permitir filtro por período (últimas 24h, 7 dias, 30 dias, 90 dias, customizado)
- **FR-023**: Sistema DEVE permitir busca por texto livre na descrição e metadata
- **FR-024**: Filtros DEVEM ser combinados com lógica AND
- **FR-025**: Sistema DEVE manter filtros ao navegar entre páginas
- **FR-026**: Cada item na lista DEVE mostrar: ícone, tipo, descrição, timestamp completo, nível (badge colorido)

#### Data Retention & Performance
- **FR-027**: Sistema DEVE reter logs por 90 dias (configurável)
- **FR-028**: Sistema DEVE ter job automático para limpeza de logs antigos
- **FR-029**: Sistema DEVE usar índices em user_id, created_at, type, level para performance
- **FR-030**: Queries de logs DEVEM ter limite máximo de 1000 registros por página

#### Security & Privacy
- **FR-031**: Logs DEVEM ter RLS habilitado - usuários veem apenas seus próprios logs
- **FR-032**: Logs de erro DEVEM omitir informações sensíveis (API keys, passwords, tokens)
- **FR-033**: Admin users PODEM ter acesso a logs agregados para monitoramento (out of scope inicial)

### Non-Functional Requirements

- **NFR-001**: Registro de log NÃO DEVE impactar tempo de resposta da operação principal (< 50ms overhead)
- **NFR-002**: Widget de atividades DEVE carregar em < 500ms
- **NFR-003**: Página de histórico DEVE carregar primeira página em < 1s
- **NFR-004**: Filtros DEVEM aplicar em < 300ms
- **NFR-005**: Sistema DEVE suportar 1000 logs/minuto por usuário sem degradação
- **NFR-006**: Descrições DEVEM estar em português claro e amigável

### Key Entities

#### ActivityLog (Nova Entidade)
```typescript
interface ActivityLog {
  id: string                    // UUID
  user_id: string               // FK to auth.users
  type: ActivityType            // Categoria da atividade
  action: string                // Verbo (created, updated, deleted, executed, etc.)
  level: LogLevel               // Severidade
  description: string           // Texto legível em português
  metadata: Record<string, any> // Dados adicionais (JSON)
  resource_type?: string        // Tipo de recurso (project, article, etc.)
  resource_id?: string          // ID do recurso (nullable se deletado)
  created_at: Date              // Timestamp UTC
}

type ActivityType =
  | 'auth'
  | 'project'
  | 'article'
  | 'flow'
  | 'dispatch'
  | 'task'
  | 'keyword'
  | 'connection'
  | 'system'
  | 'error'

type LogLevel = 'info' | 'warning' | 'error'
```

#### Example Logs

```typescript
// Login
{
  type: 'auth',
  action: 'login',
  level: 'info',
  description: 'Login realizado com sucesso',
  metadata: { ip: '192.168.1.1', user_agent: '...' }
}

// Create Project
{
  type: 'project',
  action: 'created',
  level: 'info',
  description: 'Projeto "Blog de Marketing" criado',
  resource_type: 'project',
  resource_id: 'uuid-123',
  metadata: { project_name: 'Blog de Marketing', blog_id: 'uuid-456' }
}

// Flow Execution Error
{
  type: 'flow',
  action: 'executed',
  level: 'error',
  description: 'Falha ao executar fluxo "Publicação Automática"',
  resource_type: 'flow',
  resource_id: 'uuid-789',
  metadata: {
    flow_name: 'Publicação Automática',
    error_message: 'Connection timeout',
    step_failed: 'publish_to_wordpress'
  }
}

// Article Deleted
{
  type: 'article',
  action: 'deleted',
  level: 'info',
  description: 'Artigo "Como fazer marketing digital" excluído',
  resource_type: 'article',
  resource_id: null, // Deletado
  metadata: {
    article_title: 'Como fazer marketing digital',
    project_id: 'uuid-123'
  }
}
```

## Technical Design

### Database Schema

```sql
-- Activity Logs table
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  level VARCHAR(20) NOT NULL DEFAULT 'info',
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  resource_type VARCHAR(50),
  resource_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_type ON activity_logs(type);
CREATE INDEX idx_activity_logs_level ON activity_logs(level);
CREATE INDEX idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_activity_logs_user_type_created ON activity_logs(user_id, type, created_at DESC);

-- RLS Policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON activity_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE for users (immutable audit trail)

-- Function for automatic cleanup (90 days retention)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Scheduled job (via pg_cron or Supabase Edge Functions)
-- SELECT cron.schedule('cleanup-old-logs', '0 2 * * *', 'SELECT cleanup_old_activity_logs()');
```

### Frontend Architecture

```
frontend/src/features/activity-logs/
├── api/
│   ├── queries.ts           # useActivityLogs, useRecentActivity
│   └── mutations.ts         # useCreateActivityLog
├── components/
│   ├── ActivityWidget.tsx   # Dashboard widget
│   ├── ActivityList.tsx     # Full list with filters
│   ├── ActivityItem.tsx     # Single activity display
│   ├── ActivityFilters.tsx  # Filter controls
│   └── ActivityIcon.tsx     # Icon mapping by type
├── pages/
│   └── HistoryPage.tsx      # Full history page
├── types/
│   └── activity.types.ts    # TypeScript interfaces
└── utils/
    ├── activityLogger.ts    # Helper to create logs
    └── formatters.ts        # Format timestamps, descriptions
```

### Implementation Strategy

**Fase 1: Database & Core Logic (Backend/Supabase)**
1. Criar tabela `activity_logs` com schema completo
2. Configurar RLS policies
3. Criar índices para performance
4. Implementar função de limpeza automática
5. Testar queries de leitura com filtros

**Fase 2: Logging Infrastructure (Frontend)**
1. Criar types TypeScript (`activity.types.ts`)
2. Implementar helper `activityLogger.ts` para criar logs facilmente
3. Criar mutation `useCreateActivityLog`
4. Integrar logging nos pontos principais:
   - Auth: login/logout
   - Projects: create/update/delete
   - Articles: create/update/delete
5. Testar criação de logs via frontend

**Fase 3: Dashboard Widget**
1. Criar query `useRecentActivity` (últimas 10)
2. Criar componente `ActivityIcon` com mapeamento de ícones
3. Criar componente `ActivityItem` para display individual
4. Criar componente `ActivityWidget` para dashboard
5. Integrar widget no dashboard
6. Testar responsividade e empty states

**Fase 4: History Page**
1. Criar query `useActivityLogs` com suporte a filtros e paginação
2. Criar componente `ActivityFilters` com todos os filtros
3. Criar componente `ActivityList` com paginação
4. Criar página `HistoryPage` integrando tudo
5. Adicionar rota no router
6. Testar filtros, paginação e performance

**Fase 5: Extended Logging Coverage**
1. Adicionar logs para flows, dispatches, tasks
2. Adicionar logs de erro (error boundaries)
3. Implementar sanitização de dados sensíveis
4. Testar cobertura completa

**Fase 6: Polishing & Optimization**
1. Ajustar descrições em português
2. Otimizar queries com base em métricas reais
3. Adicionar testes unitários
4. Documentar padrões de logging para o time

### API Examples

#### Frontend: Creating a Log (Helper)

```typescript
// utils/activityLogger.ts
import { supabase } from '@/shared/utils/supabase'
import type { ActivityType, LogLevel } from '../types/activity.types'

interface CreateLogOptions {
  type: ActivityType
  action: string
  description: string
  level?: LogLevel
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, any>
}

export async function createActivityLog(options: CreateLogOptions) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  try {
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      type: options.type,
      action: options.action,
      level: options.level || 'info',
      description: options.description,
      resource_type: options.resourceType,
      resource_id: options.resourceId,
      metadata: options.metadata || {},
    })
  } catch (error) {
    // Silently fail - don't break main operation
    console.error('Failed to create activity log:', error)
  }
}

// Usage in feature code
export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Create activity log
      createActivityLog({
        type: 'project',
        action: 'created',
        description: `Projeto "${data.name}" criado`,
        resourceType: 'project',
        resourceId: data.id,
        metadata: { project_name: data.name, blog_id: data.blog_id }
      })

      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
```

#### Frontend: Reading Recent Activities

```typescript
// api/queries.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/utils/supabase'
import type { ActivityLog } from '../types/activity.types'

export function useRecentActivity(limit = 10) {
  return useQuery({
    queryKey: ['activity-logs', 'recent', limit],
    queryFn: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    },
    staleTime: 30000, // 30 seconds
  })
}

export function useActivityLogs(filters?: {
  type?: string[]
  level?: string[]
  dateRange?: { start: Date; end: Date }
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['activity-logs', 'list', filters],
    queryFn: async (): Promise<{ data: ActivityLog[]; total: number }> => {
      const page = filters?.page || 1
      const limit = filters?.limit || 50
      const offset = (page - 1) * limit

      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply filters
      if (filters?.type?.length) {
        query = query.in('type', filters.type)
      }
      if (filters?.level?.length) {
        query = query.in('level', filters.level)
      }
      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString())
      }
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`)
      }

      const { data, count, error } = await query
      if (error) throw error

      return { data: data || [], total: count || 0 }
    },
    keepPreviousData: true, // For smooth pagination
  })
}
```

#### Component Example: Activity Widget

```typescript
// components/ActivityWidget.tsx
import { useRecentActivity } from '../api/queries'
import { ActivityItem } from './ActivityItem'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { EmptyState } from '@/shared/components/EmptyState'

export function ActivityWidget() {
  const { data: activities, isLoading } = useRecentActivity(10)

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!activities?.length) {
    return (
      <EmptyState
        title="Nenhuma atividade recente"
        description="Suas ações aparecerão aqui"
      />
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Atividades Recentes</h2>
      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
      <div className="mt-4 text-center">
        <a href="/history" className="text-primary-600 hover:underline">
          Ver histórico completo →
        </a>
      </div>
    </div>
  )
}
```

### When to Use Backend vs Frontend

**Frontend → Supabase Direct** (✅ Recommended)
- Reading activity logs (with RLS protection)
- Creating activity logs from frontend actions
- Filtering and pagination

**Backend → NestJS** (Only if needed)
- Bulk log creation from backend operations
- Admin-level log aggregation/analytics
- Integration with external monitoring tools
- Operations requiring service_role (bypassing RLS)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos eventos críticos (auth, CRUD projects/articles, flows) são registrados automaticamente
- **SC-002**: Widget de atividades recentes carrega em < 500ms com 10 itens
- **SC-003**: Página de histórico carrega primeira página em < 1s com 50 itens
- **SC-004**: Filtros aplicam em < 300ms sem travar interface
- **SC-005**: Sistema suporta 1000 logs/minuto por usuário sem degradação
- **SC-006**: Logs de erro omitem 100% de informações sensíveis (verificado por testes)
- **SC-007**: Paginação funciona corretamente com 10.000+ logs
- **SC-008**: Job de limpeza remove logs com mais de 90 dias corretamente
- **SC-009**: RLS garante que usuários vejam apenas seus próprios logs (0% vazamento)
- **SC-010**: Widget exibe timestamps relativos corretos em PT-BR (ex: "há 5 minutos", "ontem")
- **SC-011**: Links para recursos funcionam corretamente ou mostram estado adequado se recurso foi deletado
- **SC-012**: Descrições estão 100% em português claro e amigável

### Testing Checklist

- [ ] Criar conta nova e verificar log de signup
- [ ] Fazer login e verificar log de login
- [ ] Criar projeto e verificar apareçe no widget
- [ ] Deletar artigo e verificar log mantém informação mesmo após deleção
- [ ] Simular erro e verificar sanitização de dados sensíveis
- [ ] Aplicar todos os filtros simultaneamente
- [ ] Navegar 10 páginas de histórico
- [ ] Verificar performance com 1000 logs
- [ ] Testar responsividade em mobile
- [ ] Verificar RLS (tentar acessar logs de outro usuário)
- [ ] Verificar job de limpeza (manualmente alterar data de logs antigos)

## Assumptions

- Supabase PostgreSQL suporta JSONB e índices GIN para metadata
- Retenção de 90 dias é suficiente para auditoria (pode ser ajustado)
- Usuários não precisam editar ou deletar logs (audit trail imutável)
- Frontend pode fazer insert direto via RLS (sem validação complexa)
- Timestamps em UTC são convertidos para timezone do usuário no display
- Icons podem ser mappeados usando biblioteca existente (Lucide, Phosphor)
- Não há necessidade de agregação/analytics avançada na v1

## Out of Scope

### Explicitamente NÃO incluído nesta feature:

- **Admin dashboard com analytics de logs**: Visualização agregada para admins (pode ser feature futura)
- **Exportação de logs**: Download CSV/JSON do histórico (pode ser feature futura)
- **Notificações baseadas em logs**: Alertas quando certos eventos ocorrem
- **Log de alterações granular (audit trail de campos)**: Rastreamento de quais campos mudaram em updates
- **Integração com ferramentas externas**: Sentry, DataDog, LogRocket, etc.
- **Logs de performance/métricas**: Tempo de carregamento, uso de recursos
- **Logs de visualização**: Rastrear quais páginas usuário visitou
- **Undo/redo baseado em logs**: Reverter ações através do histórico
- **Comparação de versões**: Diff entre estados antes/depois de alterações
- **Logs em tempo real (websockets)**: Updates live no widget
- **Filtros salvos**: Usuário salvar combinações de filtros favoritas
- **Compartilhamento de logs**: Enviar link para log específico
- **Anotações em logs**: Usuário adicionar comentários em eventos

## Dependencies

### Technical Dependencies
- Supabase PostgreSQL 15+
- Supabase RLS
- React Query (TanStack Query)
- date-fns (para formatação de datas relativas)
- Lucide React ou Phosphor Icons (ícones)

### Feature Dependencies
- **Blocker**: Auth system (precisa de user_id)
- **Nice to have**: Projects, Articles, Flows implementados (para testar logging completo)

### Migration Plan

1. **Database Migration**:
   - Criar tabela `activity_logs` via Supabase SQL Editor
   - Configurar RLS policies
   - Criar índices
   - Testar queries com dados de exemplo

2. **Frontend Implementation**:
   - Implementar na branch `015-logs-atividades`
   - Fase 1: Core infrastructure (types, helpers, mutations)
   - Fase 2: Dashboard widget
   - Fase 3: History page
   - Fase 4: Extended logging coverage

3. **Testing**:
   - Unit tests para helpers e formatters
   - Integration tests para queries
   - E2E tests para user flows
   - Performance tests com volume de dados

4. **Deployment**:
   - Deploy database changes primeiro (backward compatible)
   - Deploy frontend com feature flag (opcional)
   - Monitor logs e performance
   - Ativar para todos os usuários

## Future Enhancements (Post-MVP)

- **v1.1**: Exportação de logs (CSV, JSON)
- **v1.2**: Admin dashboard com analytics
- **v1.3**: Logs em tempo real (websockets)
- **v1.4**: Notificações baseadas em eventos críticos
- **v1.5**: Integração com Sentry para error tracking
- **v2.0**: Audit trail granular (campo por campo)

---

**Spec Version**: 1.0
**Last Updated**: 2025-12-11
**Author**: Claude Code (baseado em input do usuário)
