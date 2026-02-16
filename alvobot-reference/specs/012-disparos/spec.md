# Feature Specification: Disparos (Message Dispatches)

**Feature Branch**: `012-disparos`
**Created**: 2025-12-11
**Status**: ✅ Implementado
**Input**: Feature request for message dispatch monitoring with real-time updates, external API integration, and delivery metrics.

## Clarifications

### Session 2025-12-11

- Q: Qual método de atualização em tempo real? → A: Polling inicial (5s) com possibilidade futura de WebSocket
- Q: Quais canais de disparo são suportados? → A: Messenger, WhatsApp, Email, SMS
- Q: Como tratar falhas na API externa? → A: Retry automático (backend) + retry manual (usuário)
- Q: Métricas devem ser agregadas ou por disparo? → A: Ambos - overview agregado + detalhes por disparo
- Q: Limites de paginação? → A: 50 disparos por página, com scroll infinito opcional

## Overview

Sistema de monitoramento e gerenciamento de disparos de mensagens que integra com APIs externas de envio (Messenger, WhatsApp, Email, SMS). Permite visualização em tempo real do status de envio, métricas de entrega, filtros avançados, e retry de disparos com falha.

### Architecture Pattern

**Approach**: Hybrid Architecture - Frontend accessa Supabase diretamente para leitura (com RLS), Backend sincroniza com APIs externas e executa ações privilegiadas.

```
Frontend (React)
    ↓ READ: Supabase queries com RLS
    ↓ WRITE: Backend API para ações (retry, sync)
Supabase (BaaS)
    - Table: dispatches (status, recipient, channel, metadata)
    - RLS policies (user can view own project dispatches)
Backend (NestJS)
    - Sync com API externa de disparo
    - Webhook receiver (status updates)
    - Retry logic (exponential backoff)
    - Service_role para updates privilegiados
```

### Current State

- **Disparos**: Não existe funcionalidade de monitoramento de disparos
- **Integrações**: Existem conexões com serviços externos (table: connections)
- **Projects**: Sistema de projetos já implementado

### Target State

- **Frontend**: Página de listagem com filtros, detalhes em modal, atualização em tempo real (polling)
- **Backend**: Módulo NestJS para sync com APIs externas, webhooks, e retry logic
- **Database**: Nova tabela `dispatches` com RLS policies
- **Realtime**: Polling a cada 5 segundos para disparos "em andamento"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualizar Lista de Disparos (Priority: P1)

Usuários podem visualizar todos os disparos de mensagens do seu projeto com status, destinatário, canal, e timestamp em tempo real.

**Why this priority**: Visualização básica é essencial para monitorar envios. Sem isso, usuários não têm visibilidade sobre o que foi enviado.

**Independent Test**: Pode ser testado criando disparos via backend seed e verificando se aparecem na lista com dados corretos.

**Acceptance Scenarios**:

1. **Given** um usuário logado visualizando a página de disparos, **When** a página carrega, **Then** ele vê uma lista de disparos com status, destinatário, canal, data/hora, e projeto
2. **Given** um usuário com disparos em diferentes status, **When** visualiza a lista, **Then** cada disparo exibe badge colorido correto (pendente=amarelo, enviando=azul, concluído=verde, erro=vermelho)
3. **Given** um usuário com mais de 50 disparos, **When** rola até o fim da lista, **Then** a próxima página é carregada automaticamente (infinite scroll)
4. **Given** um usuário visualizando disparos, **When** existem disparos "em andamento", **Then** a lista atualiza automaticamente a cada 5 segundos

---

### User Story 2 - Filtrar e Buscar Disparos (Priority: P1)

Usuários podem filtrar disparos por status, canal, data, e buscar por destinatário para encontrar envios específicos rapidamente.

**Why this priority**: Com muitos disparos, filtros são essenciais para encontrar informações relevantes. Isso impacta diretamente a usabilidade.

**Independent Test**: Pode ser testado aplicando diferentes combinações de filtros e verificando se os resultados são corretos.

**Acceptance Scenarios**:

1. **Given** um usuário na página de disparos, **When** seleciona filtro "Status: Erro", **Then** apenas disparos com erro são exibidos
2. **Given** um usuário com disparos em múltiplos canais, **When** filtra por "Canal: WhatsApp", **Then** apenas disparos do WhatsApp aparecem
3. **Given** um usuário buscando destinatário, **When** digita parte do nome/email, **Then** lista filtra em tempo real (debounced 300ms)
4. **Given** um usuário com filtros ativos, **When** clica "Limpar filtros", **Then** todos os filtros são removidos e lista completa é exibida

---

### User Story 3 - Ver Detalhes de Disparo (Priority: P2)

Usuários podem clicar em um disparo e ver detalhes completos em modal, incluindo conteúdo da mensagem, timestamps, tentativas, e logs de erro.

**Why this priority**: Detalhes são necessários para debug e auditoria, mas a lista principal já fornece valor. Modal evita navegação desnecessária.

**Independent Test**: Pode ser testado clicando em um disparo e verificando se todos os campos de metadata são exibidos corretamente.

**Acceptance Scenarios**:

1. **Given** um usuário visualizando lista de disparos, **When** clica em um disparo, **Then** modal abre com detalhes completos (destinatário, canal, conteúdo, timestamps, tentativas)
2. **Given** um usuário visualizando disparo com erro, **When** abre detalhes, **Then** vê mensagem de erro completa e stack trace (se disponível)
3. **Given** um usuário no modal de detalhes, **When** clica "Fechar" ou ESC, **Then** modal fecha e foco retorna à lista
4. **Given** um disparo com múltiplas tentativas, **When** usuário visualiza detalhes, **Then** vê histórico completo de tentativas com timestamps

---

### User Story 4 - Retry Manual de Disparos com Erro (Priority: P2)

Usuários podem tentar reenviar disparos que falharam através de ação manual (botão no modal de detalhes ou ação em massa).

**Why this priority**: Retry é importante para recuperar de falhas temporárias, mas não é bloqueante para visualização e monitoramento.

**Independent Test**: Pode ser testado forçando um disparo a falhar e usando o botão de retry para reenviá-lo.

**Acceptance Scenarios**:

1. **Given** um usuário visualizando disparo com status "erro", **When** clica "Tentar Novamente", **Then** backend reenvia o disparo e status muda para "enviando"
2. **Given** um usuário com múltiplos disparos com erro, **When** seleciona vários e clica "Retry em Massa", **Then** todos são reenviados em batch
3. **Given** um retry em andamento, **When** usuário visualiza o disparo, **Then** vê indicador de loading e botão "Retry" desabilitado
4. **Given** um disparo que falhou 3 vezes, **When** usuário tenta retry novamente, **Then** recebe aviso "Máximo de tentativas atingido" e opção de "Forçar Retry"

---

### User Story 5 - Visualizar Métricas de Entrega (Priority: P3)

Usuários podem ver métricas agregadas de entrega (total enviado, taxa de sucesso, taxa de erro, distribuição por canal) em dashboard overview.

**Why this priority**: Métricas agregadas são valiosas para análise, mas não são críticas para operação diária. Podem ser implementadas após funcionalidades core.

**Independent Test**: Pode ser testado verificando se os números de métricas batem com a contagem real de disparos no banco.

**Acceptance Scenarios**:

1. **Given** um usuário na página de disparos, **When** visualiza o topo da página, **Then** vê cards com métricas: Total Enviado, Taxa de Sucesso %, Taxa de Erro %, Média de Tempo de Entrega
2. **Given** um usuário com filtros ativos, **When** métricas são exibidas, **Then** refletem apenas os disparos filtrados
3. **Given** um usuário visualizando métricas, **When** clica em "Taxa de Erro %", **Then** lista é automaticamente filtrada para mostrar apenas erros
4. **Given** um projeto com disparos em múltiplos canais, **When** usuário visualiza métricas, **Then** vê gráfico de pizza com distribuição por canal

---

### Edge Cases

- **O que acontece se a API externa estiver offline durante retry?** (Backend retorna erro graceful, disparo mantém status "erro", usuário é notificado)
- **Como lidar com disparos órfãos (sem projeto associado)?** (RLS impede visualização, admin endpoint para limpeza)
- **O que acontece se múltiplos usuários do mesmo projeto tentarem retry do mesmo disparo?** (Backend usa lock otimista, primeiro request vence, segundo recebe "já em andamento")
- **Como tratar webhooks duplicados da API externa?** (Backend valida idempotência via `external_id` único)
- **O que acontece se usuário sair da página durante polling ativo?** (Cleanup no unmount do componente, requests cancelados)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE listar disparos do projeto do usuário logado com paginação (50 por página)
- **FR-002**: Sistema DEVE exibir status do disparo com badge colorido (pendente, enviando, concluído, erro)
- **FR-003**: Sistema DEVE atualizar automaticamente disparos "em andamento" a cada 5 segundos via polling
- **FR-004**: Sistema DEVE permitir filtrar disparos por status, canal, e intervalo de data
- **FR-005**: Sistema DEVE permitir busca por destinatário (nome, email, telefone) com debounce de 300ms
- **FR-006**: Sistema DEVE exibir detalhes completos de disparo em modal (conteúdo, timestamps, tentativas, erros)
- **FR-007**: Sistema DEVE permitir retry manual de disparos com erro (individual ou em massa)
- **FR-008**: Sistema DEVE impedir retry de disparos que excederam limite de tentativas (3x) sem confirmação explícita
- **FR-009**: Sistema DEVE calcular e exibir métricas agregadas (total, taxa de sucesso, taxa de erro, tempo médio)
- **FR-010**: Backend DEVE sincronizar status de disparos com API externa via polling ou webhooks
- **FR-011**: Backend DEVE implementar retry automático com exponential backoff (1s, 2s, 4s)
- **FR-012**: Backend DEVE validar idempotência de webhooks usando `external_id` único
- **FR-013**: Sistema DEVE aplicar RLS para garantir que usuários vejam apenas disparos de seus projetos
- **FR-014**: Sistema DEVE cancelar requests de polling quando componente for desmontado

### Non-Functional Requirements

- **NFR-001**: Listagem DEVE carregar em menos de 2 segundos para 1000 disparos
- **NFR-002**: Polling DEVE consumir menos de 10KB de dados por request
- **NFR-003**: Filtros DEVEM responder em menos de 500ms
- **NFR-004**: Retry DEVE completar em menos de 10 segundos (chamada síncrona ou job assíncrono)
- **NFR-005**: Modal de detalhes DEVE abrir em menos de 200ms
- **NFR-006**: Sistema DEVE suportar 100 usuários simultâneos fazendo polling sem degradação

### Data Model

#### Table: `dispatches`

```sql
CREATE TABLE dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Dispatch Info
  status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
  channel TEXT NOT NULL CHECK (channel IN ('messenger', 'whatsapp', 'email', 'sms')),
  recipient_name TEXT,
  recipient_identifier TEXT NOT NULL, -- email, phone, messenger_id

  -- Content
  message_content JSONB NOT NULL, -- flexible structure per channel

  -- External API Integration
  external_id TEXT UNIQUE, -- ID from external dispatch API
  external_service TEXT, -- 'twilio', 'sendgrid', 'meta', etc.

  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Retry Logic
  attempt_count INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  last_error TEXT,
  error_details JSONB,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dispatches_project_id ON dispatches(project_id);
CREATE INDEX idx_dispatches_user_id ON dispatches(user_id);
CREATE INDEX idx_dispatches_status ON dispatches(status);
CREATE INDEX idx_dispatches_channel ON dispatches(channel);
CREATE INDEX idx_dispatches_created_at ON dispatches(created_at DESC);
CREATE INDEX idx_dispatches_external_id ON dispatches(external_id) WHERE external_id IS NOT NULL;

-- RLS Policies
ALTER TABLE dispatches ENABLE ROW LEVEL SECURITY;

-- Users can view dispatches from their projects
CREATE POLICY "Users can view own project dispatches"
  ON dispatches FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert dispatches (via backend will use service_role)
CREATE POLICY "Service role can insert dispatches"
  ON dispatches FOR INSERT
  WITH CHECK (true); -- Backend uses service_role

-- Only backend can update (service_role)
CREATE POLICY "Service role can update dispatches"
  ON dispatches FOR UPDATE
  USING (true); -- Backend uses service_role
```

#### TypeScript Types

```typescript
// Shared type (frontend + backend)
export enum DispatchStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum DispatchChannel {
  MESSENGER = 'messenger',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms',
}

export interface Dispatch {
  id: string
  project_id: string
  user_id: string
  status: DispatchStatus
  channel: DispatchChannel
  recipient_name?: string
  recipient_identifier: string
  message_content: Record<string, any>
  external_id?: string
  external_service?: string
  sent_at?: string
  delivered_at?: string
  failed_at?: string
  attempt_count: number
  max_attempts: number
  last_error?: string
  error_details?: Record<string, any>
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

// Frontend specific
export interface DispatchFilters {
  status?: DispatchStatus[]
  channel?: DispatchChannel[]
  dateFrom?: string
  dateTo?: string
  search?: string // recipient name/identifier
  projectId?: string
}

export interface DispatchMetrics {
  total: number
  completed: number
  failed: number
  pending: number
  sending: number
  successRate: number
  errorRate: number
  averageDeliveryTime?: number // in seconds
  byChannel: Record<DispatchChannel, number>
}

// Backend specific
export interface CreateDispatchDto {
  project_id: string
  channel: DispatchChannel
  recipient_identifier: string
  recipient_name?: string
  message_content: Record<string, any>
  metadata?: Record<string, any>
}

export interface RetryDispatchDto {
  dispatchId: string
  forceRetry?: boolean // bypass max_attempts check
}

export interface SyncDispatchStatusDto {
  external_id: string
  status: DispatchStatus
  delivered_at?: string
  error?: string
  error_details?: Record<string, any>
}
```

### API Endpoints

#### Frontend → Backend

```typescript
// GET /api/dispatches (optional - if not using Supabase direct)
// Query params: ?status=failed&channel=whatsapp&page=1&limit=50
GET /api/dispatches/metrics?projectId={id}&filters={...}
POST /api/dispatches/{id}/retry
POST /api/dispatches/retry-batch (body: { dispatchIds: string[] })
POST /api/dispatches/sync-all?projectId={id} // force sync with external API

// POST /api/dispatches (create new dispatch - for future)
POST /api/dispatches
```

#### External API → Backend (Webhooks)

```typescript
// Webhook receiver for status updates
POST /api/webhooks/dispatch-status
// Body: { external_id, status, delivered_at?, error? }
```

### Key Entities

- **Dispatch**: Registro de envio de mensagem com status, destinatário, canal, tentativas
- **Project**: Projeto ao qual o disparo pertence (já existe)
- **User**: Usuário dono do projeto (já existe)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuário consegue visualizar lista completa de disparos com status correto em menos de 2 segundos
- **SC-002**: Filtros por status, canal, e data retornam resultados corretos em menos de 500ms
- **SC-003**: Polling atualiza status de disparos "em andamento" sem degradação de performance (< 10KB por request)
- **SC-004**: Retry manual de disparo com erro completa em menos de 10 segundos e atualiza status na UI
- **SC-005**: Métricas agregadas exibem números corretos (± 0 de margem de erro)
- **SC-006**: Modal de detalhes carrega todos os campos (content, timestamps, tentativas, erros) em menos de 200ms
- **SC-007**: RLS policies impedem usuários de ver disparos de outros projetos (0 vazamentos)
- **SC-008**: Backend sincroniza status com API externa sem perda de dados (100% de confiabilidade)
- **SC-009**: Webhooks duplicados são ignorados corretamente (idempotência validada)
- **SC-010**: Sistema suporta 100 usuários simultâneos fazendo polling sem timeout

## Assumptions

- API externa de disparo fornece endpoint de retry e webhook para status updates
- API externa retorna `external_id` único para cada disparo criado
- Webhooks da API externa chegam em até 60 segundos após mudança de status
- Projetos já existem e têm conexões configuradas com serviços de disparo
- Usuários têm permissão para disparar mensagens via suas conexões
- Polling a cada 5 segundos é aceitável (não requer WebSocket por enquinte)
- Limite de 3 tentativas automáticas é suficiente antes de exigir intervenção manual

## Out of Scope

- Criação de disparos via UI (apenas visualização e retry)
- Integração com novos canais além de Messenger, WhatsApp, Email, SMS
- Agendamento de disparos (envio futuro)
- Templates de mensagens
- Segmentação de destinatários
- A/B testing de conteúdo
- Analytics avançado (taxa de abertura, cliques)
- Exportação de relatórios
- Notificações push quando disparo completa
- WebSocket para atualização em tempo real (usar polling inicialmente)
- Disparo em massa via upload de CSV

## Technical Implementation Notes

### Frontend Structure

```
frontend/src/features/dispatches/
├── api/
│   ├── useDispatches.ts         # TanStack Query hooks
│   ├── useDispatchMetrics.ts
│   ├── useRetryDispatch.ts
│   └── useSyncDispatches.ts
├── components/
│   ├── DispatchList.tsx         # Main list with infinite scroll
│   ├── DispatchFilters.tsx      # Status, channel, date filters
│   ├── DispatchCard.tsx         # Single dispatch item
│   ├── DispatchDetailsModal.tsx # Full details modal
│   ├── DispatchMetrics.tsx      # Metrics cards overview
│   └── RetryButton.tsx          # Retry action button
├── pages/
│   └── DispatchesPage.tsx       # Main page
├── types/
│   └── index.ts                 # TypeScript types
└── utils/
    ├── formatters.ts            # Format dates, status badges
    └── polling.ts               # Polling interval management
```

### Backend Structure

```
backend/src/modules/dispatches/
├── dispatches.module.ts
├── dispatches.controller.ts     # API endpoints
├── dispatches.service.ts        # Business logic
├── dto/
│   ├── create-dispatch.dto.ts
│   ├── retry-dispatch.dto.ts
│   └── sync-status.dto.ts
├── interfaces/
│   └── external-api.interface.ts
└── providers/
    ├── messenger-api.service.ts  # Messenger integration
    ├── whatsapp-api.service.ts   # WhatsApp integration
    ├── email-api.service.ts      # Email integration
    └── sms-api.service.ts        # SMS integration
```

### Polling Strategy

```typescript
// Frontend polling hook
function useDispatchPolling(filters: DispatchFilters) {
  const hasActiveDispatches = /* check if any pending/sending */

  return useQuery({
    queryKey: ['dispatches', filters],
    queryFn: () => fetchDispatches(filters),
    refetchInterval: hasActiveDispatches ? 5000 : false, // Only poll if needed
    refetchIntervalInBackground: false,
  })
}
```

### Retry Logic (Backend)

```typescript
// Exponential backoff retry
async retryDispatch(dispatchId: string, forceRetry = false) {
  const dispatch = await this.findById(dispatchId)

  if (!forceRetry && dispatch.attempt_count >= dispatch.max_attempts) {
    throw new Error('Max attempts reached')
  }

  const delays = [1000, 2000, 4000] // 1s, 2s, 4s
  const delay = delays[dispatch.attempt_count - 1] || 4000

  await this.wait(delay)

  try {
    const result = await this.externalApiService.send(dispatch)
    await this.updateStatus(dispatchId, 'completed', result)
  } catch (error) {
    await this.updateStatus(dispatchId, 'failed', null, error)
  }
}
```

## Dependencies

- **Frontend**: TanStack Query (already installed), React Hook Form (already installed)
- **Backend**: NestJS HTTP Module (already available), Supabase Admin Client (already installed)
- **External APIs**: Meta Graph API (Messenger), Twilio API (WhatsApp/SMS), SendGrid API (Email)

## Migration Path

1. **Phase 1**: Database schema (create `dispatches` table, RLS policies)
2. **Phase 2**: Backend module (CRUD endpoints, retry logic, webhook receiver)
3. **Phase 3**: Frontend list view (basic display, filters)
4. **Phase 4**: Polling implementation (real-time updates)
5. **Phase 5**: Details modal and retry actions
6. **Phase 6**: Metrics dashboard
7. **Phase 7**: Testing and optimization

## Security Considerations

- **RLS Enforcement**: Usuários só veem disparos de projetos que possuem
- **Service Role Protection**: Apenas backend pode criar/atualizar disparos via service_role
- **Webhook Validation**: Validar assinatura/token de webhooks externos
- **Rate Limiting**: Limitar retry manual a 5 requests/minuto por usuário
- **Input Sanitization**: Validar todos os inputs de filtros e busca
- **Error Exposure**: Não expor stack traces completos para frontend (apenas mensagens user-friendly)

## Performance Optimization

- **Indexes**: Criar indexes em `project_id`, `status`, `channel`, `created_at`
- **Pagination**: Limit 50 por página com cursor-based pagination (mais eficiente que offset)
- **Polling Optimization**: Apenas fazer polling quando há disparos ativos (pending/sending)
- **Query Optimization**: Usar `.select()` específico no Supabase, evitar `SELECT *`
- **Caching**: Cache de métricas agregadas com TTL de 30 segundos
- **Request Cancellation**: Cancelar polling requests ao desmontar componente
