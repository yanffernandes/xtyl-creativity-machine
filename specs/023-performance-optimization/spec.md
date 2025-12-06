# Feature Spec: Performance Optimization - Supabase & React Query

**Feature ID**: 023-performance-optimization
**Date**: 2025-12-06
**Status**: Draft

## Overview

Otimização de performance do sistema focando na integração com Supabase e configurações do React Query. O objetivo é reduzir significativamente o tempo de carregamento inicial e melhorar a responsividade geral da aplicação.

## Problem Statement

O sistema apresenta lentidão perceptível ao usuário devido a:

1. **Token refresh síncrono** em toda requisição API (+50-100ms por request)
2. **N+1 queries** em documentos e sidebar (cascata de requests sequenciais)
3. **Configurações agressivas do React Query** (refetch no window focus, staleTime curto)
4. **Over-fetching** com `.select('*')` retornando dados desnecessários
5. **Waterfall patterns** onde requests aguardam desnecessariamente

## Goals

| Métrica | Atual (estimado) | Meta |
|---------|------------------|------|
| Tempo inicial de carregamento | 2-4s | < 1s |
| Latência por API request | +50-100ms overhead | < 10ms overhead |
| Requests na troca de tab | Todos refetch | Zero refetch |
| Payload médio de queries | ~100KB | < 30KB |

## Non-Goals

- Migração para outro banco de dados
- Implementação de SSR/SSG
- Mudanças na arquitetura de autenticação
- Paginação virtual (será feature separada)

---

## User Stories

### US1: Quick Wins - React Query Settings (P0)
**Como** usuário, **quero** que a aplicação não recarregue dados desnecessariamente **para** ter uma experiência mais fluida.

**Acceptance Criteria:**
- [ ] Aplicação não refaz queries ao voltar de outra aba
- [ ] Dados estáticos (workspaces, projects) permanecem em cache por mais tempo
- [ ] Invalidação de cache é específica por entidade, não global

### US2: Session Cache - Eliminar Overhead de Auth (P0)
**Como** desenvolvedor, **quero** cachear a sessão do Supabase **para** eliminar o overhead de 50-100ms por request.

**Acceptance Criteria:**
- [ ] `getSession()` é chamado apenas 1x por intervalo de tempo (ex: 30s)
- [ ] Token é reutilizado entre requests dentro do intervalo
- [ ] Refresh automático quando token está próximo de expirar

### US3: Otimização de Queries - Eliminar N+1 (P1)
**Como** usuário, **quero** que a sidebar carregue rapidamente **para** navegar entre projetos sem espera.

**Acceptance Criteria:**
- [ ] Documentos e attachments são buscados em uma única query com JOIN
- [ ] Sidebar não faz N requests para N projetos
- [ ] Campos desnecessários não são retornados (select específico)

### US4: Invalidação Inteligente de Cache (P2)
**Como** desenvolvedor, **quero** que invalidações de cache sejam granulares **para** evitar refetches desnecessários.

**Acceptance Criteria:**
- [ ] Atualizar um documento invalida apenas aquele documento
- [ ] Criar documento invalida apenas a lista do projeto afetado
- [ ] Preferências do usuário têm cache separado e estável

---

## Technical Design

### Phase 1: Quick Wins (Baixo Risco, Alto Impacto)

#### 1.1 React Query Configuration
**Arquivo:** `frontend/src/components/providers/QueryProvider.tsx`

```typescript
// ANTES
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 segundos
      refetchOnWindowFocus: true,   // Refetch ao voltar
    },
  },
})

// DEPOIS
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutos para dados gerais
      gcTime: 30 * 60 * 1000,        // 30 minutos no garbage collector
      refetchOnWindowFocus: false,   // Sem refetch automático
      refetchOnReconnect: false,     // Sem refetch ao reconectar
      retry: 1,                       // Apenas 1 retry
    },
  },
})
```

#### 1.2 StaleTime por Tipo de Dado
**Arquivos:** Hooks individuais

| Tipo de Dado | staleTime Atual | staleTime Novo | Justificativa |
|--------------|-----------------|----------------|---------------|
| Workspaces | 30s | 10min | Raramente muda |
| Projects | 30s | 5min | Muda ocasionalmente |
| Documents List | 30s | 2min | Muda com frequência |
| Document Content | 30s | 1min | Pode ser editado |
| User Preferences | 5min | 30min | Quase nunca muda |
| Templates | 30s | 10min | Raramente muda |

### Phase 2: Session Cache

#### 2.1 Cached Auth Interceptor
**Arquivo:** `frontend/src/lib/api.ts`

```typescript
// Cache da sessão com TTL
let cachedSession: { session: Session | null; timestamp: number } | null = null
const SESSION_CACHE_TTL = 30 * 1000 // 30 segundos

async function getCachedSession(): Promise<Session | null> {
  const now = Date.now()

  // Retorna cache se válido
  if (cachedSession && (now - cachedSession.timestamp) < SESSION_CACHE_TTL) {
    return cachedSession.session
  }

  // Busca nova sessão
  const { data: { session } } = await supabase.auth.getSession()
  cachedSession = { session, timestamp: now }

  return session
}

// Interceptor atualizado
api.interceptors.request.use(async (config) => {
  const session = await getCachedSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})
```

#### 2.2 Invalidação do Cache em Eventos de Auth
```typescript
// Limpar cache quando auth muda
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    cachedSession = null
  }
})
```

### Phase 3: Query Optimization

#### 3.1 Documents com JOIN
**Arquivo:** `frontend/src/lib/supabase/documents.ts`

```typescript
// ANTES: N+1 queries
async function listByProject(projectId: string) {
  const { data: docs } = await supabase
    .from('documents')
    .select('*')  // Busca tudo
    .eq('project_id', projectId)

  // Depois busca attachments separado
  const { data: attachments } = await supabase
    .from('document_attachments')
    .select('*')
    .in('document_id', docs.map(d => d.id))

  // Depois busca imagens para cada attachment...
}

// DEPOIS: Query única com JOIN
async function listByProject(projectId: string) {
  const { data } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      document_type,
      created_at,
      updated_at,
      document_attachments (
        id,
        attachment_type,
        visual_assets (
          id,
          thumbnail_url,
          file_name
        )
      )
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return data
}
```

#### 3.2 Sidebar Batch Loading
**Arquivo:** `frontend/src/hooks/use-sidebar-cache.ts`

```typescript
// ANTES: Para cada projeto, 2 requests
const projectsData = await Promise.all(
  projectList.map(async (project) => {
    const [docsResult, assetsResult] = await Promise.allSettled([
      documentService.listForSidebar(project.id),
      api.get(`/projects/${project.id}/assets`)
    ])
    // ...
  })
)

// DEPOIS: Uma única query para todos os projetos
async function fetchAllProjectsData(projectIds: string[]) {
  const { data } = await supabase
    .from('documents')
    .select(`
      id,
      title,
      project_id,
      document_type,
      created_at
    `)
    .in('project_id', projectIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)  // Limitar para sidebar

  // Agrupar por projeto no cliente
  return groupBy(data, 'project_id')
}
```

### Phase 4: Granular Cache Invalidation

#### 4.1 Query Keys Estruturadas
**Arquivo:** `frontend/src/lib/query-keys.ts` (novo)

```typescript
export const queryKeys = {
  // Workspaces
  workspaces: {
    all: ['workspaces'] as const,
    detail: (id: string) => ['workspaces', id] as const,
  },

  // Projects
  projects: {
    all: ['projects'] as const,
    byWorkspace: (workspaceId: string) => ['projects', 'workspace', workspaceId] as const,
    detail: (id: string) => ['projects', id] as const,
  },

  // Documents
  documents: {
    all: ['documents'] as const,
    byProject: (projectId: string) => ['documents', 'project', projectId] as const,
    detail: (id: string) => ['documents', id] as const,
  },
}
```

#### 4.2 Invalidação Específica
```typescript
// ANTES: Invalida TUDO
queryClient.invalidateQueries({ queryKey: ['documents'] })

// DEPOIS: Invalida apenas o projeto afetado
queryClient.invalidateQueries({
  queryKey: queryKeys.documents.byProject(projectId)
})
```

---

## Implementation Phases

### Phase 1: Quick Wins (Estimativa: 2-4 horas)
- [ ] Atualizar QueryProvider com novas configurações
- [ ] Desabilitar refetchOnWindowFocus
- [ ] Aumentar staleTime para dados estáveis
- [ ] Testar comportamento básico

### Phase 2: Session Cache (Estimativa: 2-3 horas)
- [ ] Implementar getCachedSession()
- [ ] Atualizar interceptor de API
- [ ] Adicionar listener de auth state change
- [ ] Testar fluxo de login/logout

### Phase 3: Query Optimization (Estimativa: 4-6 horas)
- [ ] Refatorar listByProject com JOIN
- [ ] Criar listForSidebar otimizado
- [ ] Implementar batch loading para sidebar
- [ ] Adicionar campos específicos em selects

### Phase 4: Cache Invalidation (Estimativa: 3-4 horas)
- [ ] Criar arquivo query-keys.ts
- [ ] Atualizar todos os hooks para usar novas keys
- [ ] Implementar invalidação granular em mutations
- [ ] Testar cenários de CRUD

---

## Risks & Mitigations

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Cache stale causando dados desatualizados | Média | Alto | Adicionar botão "Atualizar" manual, manter invalidação em mutações |
| Session cache causando auth issues | Baixa | Alto | Invalidar cache em eventos de auth, TTL curto (30s) |
| JOINs complexos lentos no Supabase | Baixa | Médio | Monitorar performance, adicionar índices se necessário |
| Regressões em funcionalidades existentes | Média | Alto | Testes manuais extensivos após cada phase |

---

## Testing Checklist

### Phase 1
- [ ] Trocar de aba e voltar - não deve haver refetch
- [ ] Dados persistem após 1 minuto de inatividade
- [ ] Navegação entre páginas usa cache

### Phase 2
- [ ] Fazer múltiplos requests rápidos - apenas 1 getSession()
- [ ] Login/logout limpa cache corretamente
- [ ] Token refresh funciona automaticamente

### Phase 3
- [ ] Sidebar carrega em < 500ms
- [ ] Lista de documentos mostra attachments
- [ ] Network tab mostra menos requests

### Phase 4
- [ ] Criar documento invalida apenas lista do projeto
- [ ] Editar documento não invalida outras listas
- [ ] Deletar documento remove do cache corretamente

---

## Success Metrics

Após implementação completa:

1. **Lighthouse Performance Score**: > 90
2. **Time to Interactive**: < 2s
3. **Requests on page load**: < 5 (atualmente ~15-20)
4. **Cache hit rate**: > 80%
