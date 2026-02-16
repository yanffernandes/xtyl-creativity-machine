# Feature Specification: Meus Fluxos

**Feature Branch**: `011-meus-fluxos`
**Status**: ✅ Implementado

## 1. Overview

### 1.1 Feature Description
Tela de listagem e gerenciamento de fluxos de automação do usuário, permitindo visualizar, filtrar, ativar/pausar e acompanhar métricas de performance dos fluxos criados.

### 1.2 Business Value
- Centralizar o gerenciamento de todos os fluxos de automação
- Facilitar monitoramento de status e performance
- Permitir ações rápidas sem precisar navegar para múltiplas telas
- Melhorar visibilidade de problemas e execuções

### 1.3 User Stories

**US-011-01**: Como usuário, quero ver todos os meus fluxos em uma lista organizada para ter uma visão geral das minhas automações.

**US-011-02**: Como usuário, quero filtrar fluxos por projeto e status para encontrar rapidamente o que preciso.

**US-011-03**: Como usuário, quero ativar/pausar fluxos rapidamente para controlar minhas automações sem perder tempo.

**US-011-04**: Como usuário, quero ver métricas de cada fluxo (última execução, total de execuções) para monitorar performance.

**US-011-05**: Como usuário, quero ver detalhes completos de um fluxo em um modal para analisar configurações e histórico.

### 1.4 Success Metrics
- Tempo médio para encontrar e ativar/pausar um fluxo < 5 segundos
- Taxa de uso dos filtros > 40%
- Taxa de abertura do modal de detalhes > 30%
- Redução de 50% no tempo de diagnóstico de problemas

---

## 2. Technical Architecture

### 2.1 Architecture Pattern
**Frontend → Supabase** (maioria das operações)
- CRUD de fluxos via Supabase com RLS
- Leitura de métricas e histórico via Supabase

**Frontend → Backend → n8n/Supabase** (operações específicas)
- Ativação/pausa de fluxos (pode envolver sincronização com n8n)
- Execuções complexas ou que exigem service_role

### 2.2 Data Model

#### Database Tables

##### `flows` (já existe, pode precisar de ajustes)
```sql
CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'paused', -- 'active', 'paused', 'error'
  n8n_workflow_id VARCHAR(255), -- ID do workflow no n8n
  config JSONB DEFAULT '{}', -- Configurações específicas
  last_execution_at TIMESTAMP WITH TIME ZONE,
  last_execution_status VARCHAR(50), -- 'success', 'error', 'running'
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_flows_user_id ON flows(user_id);
CREATE INDEX idx_flows_project_id ON flows(project_id);
CREATE INDEX idx_flows_status ON flows(status);
CREATE INDEX idx_flows_last_execution_at ON flows(last_execution_at DESC);

-- RLS Policies
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flows"
  ON flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flows"
  ON flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flows"
  ON flows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flows"
  ON flows FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

##### `flow_executions` (histórico de execuções)
```sql
CREATE TABLE flow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- 'running', 'success', 'error', 'cancelled'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER, -- Duração em milissegundos
  error_message TEXT,
  error_stack TEXT,
  input_data JSONB, -- Dados de entrada
  output_data JSONB, -- Dados de saída
  logs JSONB DEFAULT '[]', -- Logs da execução
  n8n_execution_id VARCHAR(255), -- ID da execução no n8n
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_flow_executions_flow_id ON flow_executions(flow_id);
CREATE INDEX idx_flow_executions_user_id ON flow_executions(user_id);
CREATE INDEX idx_flow_executions_status ON flow_executions(status);
CREATE INDEX idx_flow_executions_started_at ON flow_executions(started_at DESC);

-- RLS Policies
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flow executions"
  ON flow_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flow executions"
  ON flow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

##### Materialized View para métricas (opcional, para performance)
```sql
CREATE MATERIALIZED VIEW flow_metrics AS
SELECT
  f.id AS flow_id,
  f.user_id,
  f.name,
  f.status,
  f.last_execution_at,
  f.total_executions,
  f.successful_executions,
  f.failed_executions,
  CASE
    WHEN f.total_executions > 0
    THEN ROUND((f.successful_executions::DECIMAL / f.total_executions) * 100, 2)
    ELSE 0
  END AS success_rate,
  COUNT(fe.id) FILTER (WHERE fe.started_at > NOW() - INTERVAL '24 hours') AS executions_last_24h,
  COUNT(fe.id) FILTER (WHERE fe.started_at > NOW() - INTERVAL '7 days') AS executions_last_7d,
  AVG(fe.duration_ms) FILTER (WHERE fe.status = 'success') AS avg_duration_ms
FROM flows f
LEFT JOIN flow_executions fe ON f.id = fe.flow_id
GROUP BY f.id;

-- Refresh periodically (via cron job or trigger)
CREATE INDEX idx_flow_metrics_user_id ON flow_metrics(user_id);
```

### 2.3 API Endpoints

#### Frontend → Supabase (Direct)

**GET flows** (via Supabase client)
```typescript
// Lista todos os fluxos do usuário com filtros
const { data, error } = await supabase
  .from('flows')
  .select(`
    *,
    project:projects(id, name, color)
  `)
  .order('last_execution_at', { ascending: false, nullsFirst: false })
  .order('created_at', { ascending: false })
```

**GET flow/:id** (via Supabase client)
```typescript
// Detalhes de um fluxo específico
const { data, error } = await supabase
  .from('flows')
  .select(`
    *,
    project:projects(id, name, color),
    executions:flow_executions(
      id,
      status,
      started_at,
      finished_at,
      duration_ms,
      error_message
    )
  `)
  .eq('id', flowId)
  .single()
```

**GET flow_executions** (via Supabase client)
```typescript
// Histórico de execuções de um fluxo
const { data, error } = await supabase
  .from('flow_executions')
  .select('*')
  .eq('flow_id', flowId)
  .order('started_at', { ascending: false })
  .limit(50)
```

#### Frontend → Backend → n8n (Complex Operations)

**POST /api/flows/:id/activate**
```typescript
// Request
{
  // Sem body necessário
}

// Response
{
  id: string
  status: 'active'
  n8n_workflow_id: string
  updated_at: string
}
```

**POST /api/flows/:id/pause**
```typescript
// Request
{
  // Sem body necessário
}

// Response
{
  id: string
  status: 'paused'
  updated_at: string
}
```

**POST /api/flows/:id/execute**
```typescript
// Request
{
  input_data?: Record<string, any>
}

// Response
{
  execution_id: string
  status: 'running'
  started_at: string
}
```

### 2.4 Frontend Structure

```
frontend/src/features/flows/
├── api/
│   ├── useFlows.ts              # Lista de fluxos
│   ├── useFlow.ts               # Detalhes de um fluxo
│   ├── useFlowExecutions.ts     # Histórico de execuções
│   ├── useActivateFlow.ts       # Ativar fluxo (backend)
│   ├── usePauseFlow.ts          # Pausar fluxo (backend)
│   ├── useExecuteFlow.ts        # Executar fluxo manualmente (backend)
│   └── useDeleteFlow.ts         # Deletar fluxo
├── components/
│   ├── FlowCard.tsx             # Card de fluxo individual
│   ├── FlowStatusBadge.tsx      # Badge de status
│   ├── FlowMetrics.tsx          # Métricas do fluxo
│   ├── FlowFilters.tsx          # Filtros (projeto, status)
│   ├── FlowDetailsModal.tsx     # Modal de detalhes
│   ├── FlowExecutionsList.tsx   # Lista de execuções
│   └── FlowActionMenu.tsx       # Menu de ações rápidas
├── pages/
│   └── FlowsPage.tsx            # Página principal
└── types/
    ├── flow.types.ts            # Tipos do fluxo
    └── execution.types.ts       # Tipos de execução
```

### 2.5 State Management

#### URL State (React Router)
```typescript
// Filtros na URL para compartilhamento
/flows?project=uuid&status=active&search=nome
```

#### Component State (useState)
```typescript
// Estado local para UI
const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
```

#### Server State (TanStack Query)
```typescript
// Cache de dados do servidor
queryKey: ['flows', filters]
queryKey: ['flow', flowId]
queryKey: ['flow-executions', flowId]
```

---

## 3. User Interface

### 3.1 Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                       │
│ Meus Fluxos                                        [+ Novo]  │
├─────────────────────────────────────────────────────────────┤
│ Filters                                                      │
│ [Buscar...]  [Projeto ▼]  [Status ▼]  [Limpar filtros]     │
├─────────────────────────────────────────────────────────────┤
│ Content                                                      │
│                                                              │
│ ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ │
│ │ Flow Card 1     │ │ Flow Card 2     │ │ Flow Card 3    │ │
│ │                 │ │                 │ │                │ │
│ │ [Status] Nome   │ │ [Status] Nome   │ │ [Status] Nome  │ │
│ │ Projeto         │ │ Projeto         │ │ Projeto        │ │
│ │ Última exec.    │ │ Última exec.    │ │ Última exec.   │ │
│ │ 50 execuções    │ │ 120 execuções   │ │ 8 execuções    │ │
│ │ [⋮]             │ │ [⋮]             │ │ [⋮]            │ │
│ └─────────────────┘ └─────────────────┘ └────────────────┘ │
│                                                              │
│ ┌─────────────────┐ ┌─────────────────┐                    │
│ │ Flow Card 4     │ │ Flow Card 5     │                    │
│ │ ...             │ │ ...             │                    │
│ └─────────────────┘ └─────────────────┘                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Footer / Pagination                                          │
│                                    [1] [2] [3] ... [10]     │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Components Specification

#### FlowCard
```typescript
interface FlowCardProps {
  flow: Flow
  onActivate: (id: string) => void
  onPause: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewDetails: (id: string) => void
}

// Visual states:
// - Active: green accent
// - Paused: gray accent
// - Error: red accent
// - Hover: shadow + scale
```

**Layout do Card:**
```
┌─────────────────────────────────────┐
│ [🟢 Active]              [⋮ Menu]  │
│                                     │
│ Nome do Fluxo                       │
│ Descrição curta...                  │
│                                     │
│ 📁 Projeto Marketing                │
│                                     │
│ ⏱️ Última execução: há 2 horas      │
│ ✅ 45/50 execuções bem-sucedidas    │
│                                     │
│ ┌─────────┐ ┌─────────┐            │
│ │ 90% ✓   │ │ 50 exec │            │
│ │ Taxa    │ │ Total   │            │
│ └─────────┘ └─────────┘            │
└─────────────────────────────────────┘
```

#### FlowStatusBadge
```typescript
type FlowStatus = 'active' | 'paused' | 'error'

interface FlowStatusBadgeProps {
  status: FlowStatus
  size?: 'sm' | 'md' | 'lg'
}

// Visual:
// - active: green background, "Ativo"
// - paused: gray background, "Pausado"
// - error: red background, "Erro"
```

#### FlowFilters
```typescript
interface FlowFiltersProps {
  filters: FlowFilters
  onFiltersChange: (filters: FlowFilters) => void
  projects: Project[]
}

interface FlowFilters {
  search?: string
  projectId?: string
  status?: FlowStatus | 'all'
}
```

#### FlowDetailsModal
```typescript
interface FlowDetailsModalProps {
  flowId: string
  isOpen: boolean
  onClose: () => void
}

// Tabs:
// 1. Visão Geral (info, métricas)
// 2. Histórico de Execuções (últimas 50)
// 3. Configurações (JSON config)
```

**Modal Layout:**
```
┌───────────────────────────────────────────────────┐
│ ✕                  Detalhes do Fluxo              │
├───────────────────────────────────────────────────┤
│ [Visão Geral] [Histórico] [Configurações]         │
├───────────────────────────────────────────────────┤
│                                                    │
│ Nome do Fluxo                                      │
│ Descrição completa do fluxo...                    │
│                                                    │
│ Status: [🟢 Active]                                │
│ Projeto: Marketing                                 │
│ Criado em: 15/01/2025                             │
│ Última atualização: 20/01/2025                    │
│                                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐│
│ │ Total Exec.  │ │ Sucesso      │ │ Taxa        ││
│ │ 150          │ │ 135          │ │ 90%         ││
│ └──────────────┘ └──────────────┘ └─────────────┘│
│                                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ Gráfico de execuções (últimos 7 dias)       │ │
│ │ [Chart placeholder]                          │ │
│ └──────────────────────────────────────────────┘ │
│                                                    │
│                        [Editar] [Fechar]          │
└───────────────────────────────────────────────────┘
```

### 3.3 Interactions

#### Ativar/Pausar Fluxo
1. Usuário clica no menu ⋮ do card
2. Seleciona "Ativar" ou "Pausar"
3. Sistema mostra loading no card
4. Chama backend para sincronizar com n8n
5. Atualiza status no Supabase
6. Mostra toast de sucesso/erro
7. Atualiza UI

#### Ver Detalhes
1. Usuário clica no card (exceto menu)
2. Modal abre com loading
3. Carrega dados do fluxo + execuções
4. Exibe informações em tabs
5. Usuário pode fechar com ✕ ou ESC

#### Filtrar Fluxos
1. Usuário digita no campo de busca
2. OU seleciona projeto no dropdown
3. OU seleciona status no dropdown
4. Sistema aplica filtros com debounce (300ms)
5. URL atualiza com query params
6. TanStack Query refetch com novos filtros

#### Deletar Fluxo
1. Usuário clica em "Deletar" no menu
2. Modal de confirmação aparece
3. Usuário confirma
4. Sistema deleta do Supabase (cascata para execuções)
5. Pode precisar deletar do n8n (backend)
6. Lista atualiza

### 3.4 Responsive Behavior

**Desktop (≥1024px)**
- Grid com 3 cards por linha
- Filtros em linha horizontal
- Modal com 800px largura

**Tablet (768px - 1023px)**
- Grid com 2 cards por linha
- Filtros empilhados
- Modal com 90% largura

**Mobile (<768px)**
- Lista vertical (1 card por linha)
- Filtros em accordion/drawer
- Modal fullscreen

---

## 4. Business Logic

### 4.1 Flow States

```typescript
type FlowStatus = 'active' | 'paused' | 'error'

// Transições permitidas:
// paused → active (ativar)
// active → paused (pausar)
// error → paused (resetar)
// error → active (ativar e resetar)

// Regras:
// - Fluxo em 'error' pode ser ativado (tenta resetar)
// - Fluxo deletado remove também do n8n
// - Execuções mantém histórico mesmo após deleção
```

### 4.2 Execution Status

```typescript
type ExecutionStatus = 'running' | 'success' | 'error' | 'cancelled'

// running: execução em andamento
// success: concluída com sucesso
// error: falhou com erro
// cancelled: cancelada pelo usuário
```

### 4.3 Metrics Calculation

```typescript
// Taxa de sucesso
success_rate = (successful_executions / total_executions) * 100

// Duração média
avg_duration = SUM(duration_ms) / COUNT(executions WHERE status = 'success')

// Execuções por período
executions_last_24h = COUNT(WHERE started_at > NOW() - 24h)
executions_last_7d = COUNT(WHERE started_at > NOW() - 7d)
```

### 4.4 Validation Rules

**Flow Creation/Update**
- `name`: obrigatório, min 3 chars, max 255
- `description`: opcional, max 1000 chars
- `project_id`: deve existir e pertencer ao usuário
- `status`: apenas valores permitidos

**Flow Activation**
- Fluxo deve ter `n8n_workflow_id` (criado no n8n)
- Config deve ser válido
- Projeto deve estar ativo (se associado)

### 4.5 Error Handling

**Errors from Supabase**
```typescript
- PGRST116: Row not found → "Fluxo não encontrado"
- 23503: Foreign key violation → "Projeto inválido"
- 23505: Unique violation → "Nome já existe"
```

**Errors from Backend/n8n**
```typescript
- 404: Workflow not found → "Fluxo não encontrado no n8n"
- 500: n8n error → "Erro ao comunicar com n8n"
- Network error → "Erro de conexão"
```

---

## 5. Implementation Details

### 5.1 Frontend Implementation

#### API Hooks

**useFlows.ts** (Supabase direct)
```typescript
import { supabase } from '@/shared/utils/supabase'
import { useQuery } from '@tanstack/react-query'
import type { Flow, FlowFilters } from '../types/flow.types'

export function useFlows(filters?: FlowFilters) {
  return useQuery({
    queryKey: ['flows', filters],
    queryFn: async () => {
      let query = supabase
        .from('flows')
        .select(`
          *,
          project:projects(id, name, color)
        `)

      // Apply filters
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      query = query
        .order('last_execution_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data as Flow[]
    },
  })
}
```

**useActivateFlow.ts** (Backend)
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'

export function useActivateFlow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (flowId: string) => {
      const { data } = await api.post(`/flows/${flowId}/activate`)
      return data
    },
    onSuccess: (data) => {
      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['flow', data.id] })
    },
  })
}
```

**usePauseFlow.ts** (Backend)
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/utils/api'

export function usePauseFlow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (flowId: string) => {
      const { data } = await api.post(`/flows/${flowId}/pause`)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['flows'] })
      queryClient.invalidateQueries({ queryKey: ['flow', data.id] })
    },
  })
}
```

**useFlowExecutions.ts** (Supabase direct)
```typescript
import { supabase } from '@/shared/utils/supabase'
import { useQuery } from '@tanstack/react-query'
import type { FlowExecution } from '../types/execution.types'

export function useFlowExecutions(flowId: string, limit = 50) {
  return useQuery({
    queryKey: ['flow-executions', flowId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flow_executions')
        .select('*')
        .eq('flow_id', flowId)
        .order('started_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as FlowExecution[]
    },
    enabled: !!flowId,
  })
}
```

#### Components

**FlowCard.tsx**
```typescript
import { Flow } from '../types/flow.types'
import { FlowStatusBadge } from './FlowStatusBadge'
import { FlowMetrics } from './FlowMetrics'
import { FlowActionMenu } from './FlowActionMenu'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FlowCardProps {
  flow: Flow
  onActivate: (id: string) => void
  onPause: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewDetails: (id: string) => void
}

export function FlowCard({
  flow,
  onActivate,
  onPause,
  onEdit,
  onDelete,
  onViewDetails,
}: FlowCardProps) {
  const successRate = flow.total_executions > 0
    ? Math.round((flow.successful_executions / flow.total_executions) * 100)
    : 0

  return (
    <div
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer border border-gray-200"
      onClick={() => onViewDetails(flow.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <FlowStatusBadge status={flow.status} />
        <FlowActionMenu
          flow={flow}
          onActivate={() => onActivate(flow.id)}
          onPause={() => onPause(flow.id)}
          onEdit={() => onEdit(flow.id)}
          onDelete={() => onDelete(flow.id)}
          onClick={(e) => e.stopPropagation()} // Prevent card click
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {flow.name}
      </h3>
      {flow.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {flow.description}
        </p>
      )}

      {flow.project && (
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: flow.project.color || '#6B7280' }}
          />
          <span className="text-sm text-gray-700">{flow.project.name}</span>
        </div>
      )}

      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Última execução:</span>
          {flow.last_execution_at ? (
            <span>
              {formatDistanceToNow(new Date(flow.last_execution_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          ) : (
            <span className="text-gray-400">Nunca executado</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Execuções:</span>
          <span>
            {flow.successful_executions}/{flow.total_executions} bem-sucedidas
          </span>
        </div>
      </div>

      <FlowMetrics
        successRate={successRate}
        totalExecutions={flow.total_executions}
      />
    </div>
  )
}
```

**FlowsPage.tsx**
```typescript
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFlows } from '../api/useFlows'
import { useActivateFlow } from '../api/useActivateFlow'
import { usePauseFlow } from '../api/usePauseFlow'
import { useDeleteFlow } from '../api/useDeleteFlow'
import { FlowCard } from '../components/FlowCard'
import { FlowFilters } from '../components/FlowFilters'
import { FlowDetailsModal } from '../components/FlowDetailsModal'
import { useProjects } from '@/features/projects/api/useProjects'
import { toast } from 'sonner'

export function FlowsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)

  // Parse filters from URL
  const filters = {
    search: searchParams.get('search') || undefined,
    projectId: searchParams.get('project') || undefined,
    status: (searchParams.get('status') as any) || 'all',
  }

  const { data: flows, isLoading, error } = useFlows(filters)
  const { data: projects } = useProjects()
  const activateFlow = useActivateFlow()
  const pauseFlow = usePauseFlow()
  const deleteFlow = useDeleteFlow()

  const handleFiltersChange = (newFilters: typeof filters) => {
    const params = new URLSearchParams()
    if (newFilters.search) params.set('search', newFilters.search)
    if (newFilters.projectId) params.set('project', newFilters.projectId)
    if (newFilters.status && newFilters.status !== 'all') {
      params.set('status', newFilters.status)
    }
    setSearchParams(params)
  }

  const handleActivate = async (id: string) => {
    try {
      await activateFlow.mutateAsync(id)
      toast.success('Fluxo ativado com sucesso!')
    } catch (error) {
      toast.error('Erro ao ativar fluxo')
    }
  }

  const handlePause = async (id: string) => {
    try {
      await pauseFlow.mutateAsync(id)
      toast.success('Fluxo pausado com sucesso!')
    } catch (error) {
      toast.error('Erro ao pausar fluxo')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este fluxo?')) return

    try {
      await deleteFlow.mutateAsync(id)
      toast.success('Fluxo deletado com sucesso!')
    } catch (error) {
      toast.error('Erro ao deletar fluxo')
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-600">Erro ao carregar fluxos</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Meus Fluxos</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          onClick={() => {/* TODO: navigate to create flow */}}
        >
          + Novo Fluxo
        </button>
      </div>

      <FlowFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        projects={projects || []}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : flows && flows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onActivate={handleActivate}
              onPause={handlePause}
              onEdit={(id) => {/* TODO: navigate to edit */}}
              onDelete={handleDelete}
              onViewDetails={setSelectedFlowId}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-lg mb-2">Nenhum fluxo encontrado</p>
          <p className="text-sm">Crie seu primeiro fluxo para começar!</p>
        </div>
      )}

      {selectedFlowId && (
        <FlowDetailsModal
          flowId={selectedFlowId}
          isOpen={!!selectedFlowId}
          onClose={() => setSelectedFlowId(null)}
        />
      )}
    </div>
  )
}
```

### 5.2 Backend Implementation

#### NestJS Module Structure
```
backend/src/modules/flows/
├── flows.module.ts
├── flows.controller.ts
├── flows.service.ts
├── dto/
│   ├── activate-flow.dto.ts
│   └── execute-flow.dto.ts
└── interfaces/
    └── flow.interface.ts
```

#### flows.controller.ts
```typescript
import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { FlowsService } from './flows.service'

@Controller('flows')
@UseGuards(JwtAuthGuard)
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Post(':id/activate')
  async activateFlow(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.flowsService.activateFlow(id, userId)
  }

  @Post(':id/pause')
  async pauseFlow(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.flowsService.pauseFlow(id, userId)
  }

  @Post(':id/execute')
  async executeFlow(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { input_data?: Record<string, any> },
  ) {
    return this.flowsService.executeFlow(id, userId, body.input_data)
  }
}
```

#### flows.service.ts
```typescript
import { Injectable, NotFoundException } from '@nestjs/common'
import { SupabaseService } from '@/common/services/supabase.service'
import { N8nService } from '@/common/services/n8n.service'

@Injectable()
export class FlowsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly n8n: N8nService,
  ) {}

  async activateFlow(flowId: string, userId: string) {
    // 1. Get flow from Supabase (with service_role)
    const { data: flow, error } = await this.supabase.client
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .eq('user_id', userId)
      .single()

    if (error || !flow) {
      throw new NotFoundException('Flow not found')
    }

    // 2. Activate workflow in n8n
    if (flow.n8n_workflow_id) {
      await this.n8n.activateWorkflow(flow.n8n_workflow_id)
    }

    // 3. Update status in Supabase
    const { data: updated, error: updateError } = await this.supabase.client
      .from('flows')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', flowId)
      .select()
      .single()

    if (updateError) throw updateError

    return updated
  }

  async pauseFlow(flowId: string, userId: string) {
    // Similar to activateFlow, but deactivate in n8n
    const { data: flow, error } = await this.supabase.client
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .eq('user_id', userId)
      .single()

    if (error || !flow) {
      throw new NotFoundException('Flow not found')
    }

    if (flow.n8n_workflow_id) {
      await this.n8n.deactivateWorkflow(flow.n8n_workflow_id)
    }

    const { data: updated, error: updateError } = await this.supabase.client
      .from('flows')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', flowId)
      .select()
      .single()

    if (updateError) throw updateError

    return updated
  }

  async executeFlow(
    flowId: string,
    userId: string,
    inputData?: Record<string, any>,
  ) {
    // Get flow
    const { data: flow, error } = await this.supabase.client
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .eq('user_id', userId)
      .single()

    if (error || !flow) {
      throw new NotFoundException('Flow not found')
    }

    // Execute in n8n
    const execution = await this.n8n.executeWorkflow(
      flow.n8n_workflow_id,
      inputData,
    )

    // Create execution record
    const { data: executionRecord } = await this.supabase.client
      .from('flow_executions')
      .insert({
        flow_id: flowId,
        user_id: userId,
        status: 'running',
        started_at: new Date().toISOString(),
        n8n_execution_id: execution.id,
        input_data: inputData,
      })
      .select()
      .single()

    return executionRecord
  }
}
```

### 5.3 Database Migrations

**Migration: Create flows and flow_executions tables**
```sql
-- migrations/20250120_create_flows_tables.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create flows table
CREATE TABLE flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'paused' CHECK (status IN ('active', 'paused', 'error')),
  n8n_workflow_id VARCHAR(255),
  config JSONB DEFAULT '{}',
  last_execution_at TIMESTAMP WITH TIME ZONE,
  last_execution_status VARCHAR(50) CHECK (last_execution_status IN ('success', 'error', 'running')),
  total_executions INTEGER DEFAULT 0 CHECK (total_executions >= 0),
  successful_executions INTEGER DEFAULT 0 CHECK (successful_executions >= 0),
  failed_executions INTEGER DEFAULT 0 CHECK (failed_executions >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_flows_user_id ON flows(user_id);
CREATE INDEX idx_flows_project_id ON flows(project_id);
CREATE INDEX idx_flows_status ON flows(status);
CREATE INDEX idx_flows_last_execution_at ON flows(last_execution_at DESC NULLS LAST);

-- Create flow_executions table
CREATE TABLE flow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'success', 'error', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER CHECK (duration_ms >= 0),
  error_message TEXT,
  error_stack TEXT,
  input_data JSONB,
  output_data JSONB,
  logs JSONB DEFAULT '[]',
  n8n_execution_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_flow_executions_flow_id ON flow_executions(flow_id);
CREATE INDEX idx_flow_executions_user_id ON flow_executions(user_id);
CREATE INDEX idx_flow_executions_status ON flow_executions(status);
CREATE INDEX idx_flow_executions_started_at ON flow_executions(started_at DESC);

-- Enable RLS
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for flows
CREATE POLICY "Users can view own flows"
  ON flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flows"
  ON flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flows"
  ON flows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flows"
  ON flows FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for flow_executions
CREATE POLICY "Users can view own flow executions"
  ON flow_executions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flow executions"
  ON flow_executions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for flows
CREATE TRIGGER update_flows_updated_at
  BEFORE UPDATE ON flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update flow metrics on execution completion
CREATE OR REPLACE FUNCTION update_flow_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('success', 'error') AND (OLD.status IS NULL OR OLD.status = 'running') THEN
    UPDATE flows
    SET
      last_execution_at = NEW.finished_at,
      last_execution_status = NEW.status,
      total_executions = total_executions + 1,
      successful_executions = CASE WHEN NEW.status = 'success' THEN successful_executions + 1 ELSE successful_executions END,
      failed_executions = CASE WHEN NEW.status = 'error' THEN failed_executions + 1 ELSE failed_executions END
    WHERE id = NEW.flow_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update flow metrics
CREATE TRIGGER update_flow_metrics_on_execution
  AFTER INSERT OR UPDATE ON flow_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_flow_metrics();
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Frontend**
```typescript
// FlowCard.test.tsx
describe('FlowCard', () => {
  it('renders flow information correctly', () => {})
  it('shows correct status badge', () => {})
  it('calculates success rate correctly', () => {})
  it('calls onActivate when activate is clicked', () => {})
  it('calls onPause when pause is clicked', () => {})
  it('opens details modal on click', () => {})
})

// useFlows.test.ts
describe('useFlows', () => {
  it('fetches flows with filters', async () => {})
  it('handles errors correctly', () => {})
  it('applies search filter', async () => {})
  it('applies project filter', async () => {})
})
```

**Backend**
```typescript
// flows.service.spec.ts
describe('FlowsService', () => {
  it('activates flow in n8n', async () => {})
  it('updates flow status in database', async () => {})
  it('throws error if flow not found', async () => {})
  it('pauses flow in n8n', async () => {})
  it('executes flow with input data', async () => {})
})
```

### 6.2 Integration Tests

```typescript
// flows.integration.test.ts
describe('Flows Integration', () => {
  it('creates, activates, and executes a flow', async () => {
    // 1. Create flow
    // 2. Activate via API
    // 3. Verify status in Supabase
    // 4. Execute flow
    // 5. Check execution record
  })

  it('filters flows by project', async () => {
    // 1. Create flows in different projects
    // 2. Filter by project
    // 3. Verify correct flows returned
  })
})
```

### 6.3 E2E Tests (Playwright)

```typescript
// flows.e2e.test.ts
test('user can manage flows', async ({ page }) => {
  // Login
  await page.goto('/login')
  await login(page)

  // Go to flows page
  await page.goto('/flows')

  // Filter by status
  await page.selectOption('[data-testid="status-filter"]', 'active')
  await expect(page.locator('.flow-card')).toHaveCount(3)

  // Activate a paused flow
  await page.locator('.flow-card').first().locator('[data-testid="menu"]').click()
  await page.locator('[data-testid="activate"]').click()
  await expect(page.locator('.toast')).toHaveText(/Fluxo ativado/)

  // View details
  await page.locator('.flow-card').first().click()
  await expect(page.locator('[data-testid="flow-modal"]')).toBeVisible()
  await expect(page.locator('[data-testid="executions-tab"]')).toBeVisible()
})
```

---

## 7. Security Considerations

### 7.1 Authentication & Authorization

- **RLS Policies**: Garantir que usuários só vejam seus próprios fluxos
- **JWT Validation**: Backend valida tokens do Supabase
- **Service Role**: Apenas backend usa `service_role` key

### 7.2 Data Validation

- **Input Sanitization**: Validar todos os inputs antes de salvar
- **SQL Injection**: RLS + Prepared statements protegem
- **XSS**: React escapa automaticamente, mas validar HTML em descrições

### 7.3 Rate Limiting

```typescript
// Backend: limitar ativações/execuções por minuto
@Throttle(10, 60) // 10 requests per 60 seconds
@Post(':id/execute')
async executeFlow() {}
```

### 7.4 Sensitive Data

- **Logs**: Não salvar dados sensíveis em logs
- **Executions**: Mascarar dados sensíveis em `input_data`/`output_data`
- **n8n Credentials**: Nunca expor credenciais do n8n no frontend

---

## 8. Performance Optimization

### 8.1 Database Optimization

- **Indexes**: Criar índices em colunas filtradas (user_id, project_id, status)
- **Pagination**: Limitar resultados com `.limit()` e `.offset()`
- **Materialized Views**: Cache de métricas para fluxos com muitas execuções

### 8.2 Frontend Optimization

- **TanStack Query**: Cache automático de 5 minutos
- **Virtual Scrolling**: Para listas muito grandes (>100 items)
- **Debounce**: Search input com 300ms debounce
- **Lazy Loading**: Modal só carrega detalhes ao abrir

### 8.3 Backend Optimization

- **Caching**: Cache de workflows do n8n (Redis se necessário)
- **Batch Operations**: Ativar múltiplos fluxos em paralelo
- **Queue**: Executar fluxos via fila para evitar timeout

---

## 9. Deployment & DevOps

### 9.1 Environment Variables

**Frontend**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_API_URL=https://api.alvobot.com
```

**Backend**
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
N8N_API_URL=https://n8n.alvobot.com
N8N_API_KEY=xxx
```

### 9.2 Database Migrations

```bash
# Apply migration
supabase db push

# Rollback if needed
supabase db reset
```

### 9.3 Monitoring

- **Sentry**: Capturar erros de execução
- **Logs**: Cloudwatch/LogRocket para debugging
- **Metrics**: Dashboards de execuções, taxa de sucesso, latência

---

## 10. Future Enhancements

### 10.1 Phase 2 Features

- **Bulk Actions**: Ativar/pausar múltiplos fluxos
- **Templates**: Duplicar fluxos como templates
- **Scheduling**: Agendar execuções de fluxos
- **Notifications**: Alertas quando fluxo falha

### 10.2 Phase 3 Features

- **Analytics Dashboard**: Gráficos de performance ao longo do tempo
- **Flow Dependencies**: Executar fluxos em sequência
- **Webhooks**: Disparar fluxos via webhooks externos
- **API Keys**: Gerar chaves para executar fluxos via API

---

## 11. Documentation

### 11.1 User Documentation

- **Guia de Início**: Como criar e ativar primeiro fluxo
- **FAQ**: Perguntas frequentes sobre fluxos
- **Troubleshooting**: Como resolver erros comuns

### 11.2 Developer Documentation

- **API Reference**: Endpoints do backend
- **Database Schema**: Estrutura das tabelas
- **Architecture Diagrams**: Fluxo de dados e interações

---

## 12. Acceptance Criteria

### 12.1 Must Have (MVP)

- [ ] Listagem de fluxos com cards informativos
- [ ] Filtros por projeto e status
- [ ] Busca por nome
- [ ] Ativação/pausa de fluxos
- [ ] Visualização de métricas básicas (total execuções, taxa sucesso)
- [ ] Modal de detalhes com histórico de execuções
- [ ] RLS implementado corretamente
- [ ] Responsivo (mobile, tablet, desktop)

### 12.2 Should Have

- [ ] Indicadores visuais de performance (gráficos)
- [ ] Deletar fluxo
- [ ] Executar fluxo manualmente
- [ ] Toast notifications para ações
- [ ] Loading states adequados

### 12.3 Nice to Have

- [ ] Filtros avançados (data de criação, última execução)
- [ ] Ordenação customizável
- [ ] Exportar lista de fluxos (CSV)
- [ ] Atalhos de teclado
- [ ] Drag & drop para reordenar

---

## 13. Timeline & Milestones

### Week 1: Database & Backend
- [ ] Criar migrations (flows, flow_executions)
- [ ] Implementar RLS policies
- [ ] Criar endpoints backend (activate, pause, execute)
- [ ] Integração com n8n service
- [ ] Testes backend

### Week 2: Frontend Core
- [ ] Criar estrutura de features/flows
- [ ] Implementar API hooks (useFlows, useActivateFlow, etc)
- [ ] Criar FlowCard component
- [ ] Criar FlowsPage
- [ ] Implementar filtros

### Week 3: Frontend Polish
- [ ] Criar FlowDetailsModal
- [ ] Implementar FlowExecutionsList
- [ ] Adicionar loading/error states
- [ ] Responsividade
- [ ] Testes frontend

### Week 4: Integration & Testing
- [ ] Testes de integração
- [ ] E2E tests
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Documentation

---

## 14. Dependencies

### 14.1 External Dependencies

- **n8n**: Para executar workflows
- **Supabase**: Database, Auth, RLS
- **TanStack Query**: Server state management

### 14.2 Internal Dependencies

- **Projects**: Fluxos podem estar associados a projetos
- **Auth**: Usuário deve estar autenticado

### 14.3 Optional Dependencies

- **Redis**: Para caching de workflows (se necessário)
- **Queue System**: Para execuções em background (se necessário)

---

## 15. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| n8n indisponível | Alto | Baixa | Retry logic + fallback para queue |
| Muitas execuções | Médio | Média | Pagination + rate limiting |
| RLS mal configurado | Alto | Baixa | Testes rigorosos + code review |
| Performance lenta | Médio | Média | Indexes + caching + lazy loading |
| Dados sensíveis expostos | Alto | Baixa | Validação + sanitização + logs seguros |

---

## 16. Glossary

- **Flow (Fluxo)**: Workflow de automação criado pelo usuário
- **Execution (Execução)**: Uma instância de execução de um fluxo
- **n8n**: Plataforma de automação usada para executar workflows
- **RLS**: Row Level Security (segurança a nível de linha no Supabase)
- **Service Role**: Chave do Supabase com permissões administrativas
- **Anon Key**: Chave pública do Supabase usada no frontend

---

**End of Specification**
