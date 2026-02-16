# 031 - Unified Ads Dashboard

## Resumo Executivo

Unificar o gerenciamento de campanhas Google Ads e Meta Ads em uma única página `/ads` com 4 abas consistentes:
- **Campanhas**: Templates/rascunhos + campanhas publicadas
- **Performance**: Métricas em tempo real de ambas plataformas
- **Automações**: Regras de otimização automática
- **Histórico**: Log de todas as ações (manual + automação)

---

## Análise Atual

### Google Ads (`/alvoads-google`)
| Feature | Status |
|---------|--------|
| Templates/Campanhas | ✅ Implementado |
| Performance (métricas) | ✅ Implementado |
| Automações | ✅ Implementado |
| Histórico | ✅ Implementado |
| 4 abas integradas | ✅ Implementado |

### Meta Ads (`/alvoads-meta`)
| Feature | Status |
|---------|--------|
| Templates/Campanhas | ✅ Implementado |
| Performance (métricas) | ❌ Não existe |
| Automações | ❌ Não existe |
| Histórico | ❌ Não existe |
| Abas | ❌ Só tem 2 seções fixas |

---

## Arquitetura Proposta

### Padrão: Platform Adapter Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                   UnifiedAdsDashboard                        │
│  ┌─────────────┐ ┌─────────────────────────────────────┐    │
│  │ Platform    │ │ Tabs: Campanhas | Performance |     │    │
│  │ Selector    │ │       Automações | Histórico        │    │
│  └─────────────┘ └─────────────────────────────────────┘    │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Unified Components Layer                   │    │
│  │  UnifiedCampaignTable | MetricCards | HistoryList   │    │
│  └─────────────────────────────────────────────────────┘    │
│                              ↓                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Platform Adapters                       │    │
│  │  ┌────────────────┐    ┌────────────────┐           │    │
│  │  │ GoogleAdapter  │    │  MetaAdapter   │           │    │
│  │  │ (existing API) │    │  (new API)     │           │    │
│  │  └────────────────┘    └────────────────┘           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Pastas

```
frontend/src/features/ads-unified/
├── pages/
│   └── UnifiedAdsDashboard.tsx          # Página principal (/ads)
├── components/
│   ├── PlatformSelector/                # Toggle Google | Meta | Ambos
│   ├── UnifiedCampaignTable/            # Tabela de campanhas unificada
│   ├── UnifiedPerformanceView/          # Métricas agregadas
│   ├── UnifiedAutomationView/           # Lista de automações
│   ├── UnifiedHistoryView/              # Log de ações
│   ├── MetricCard/                      # Card de métrica individual
│   └── PlatformBadge/                   # Badge Google/Meta
├── adapters/
│   ├── types.ts                         # Interfaces unificadas
│   ├── GoogleAdsAdapter.ts              # Wrapper hooks Google existentes
│   └── MetaAdsAdapter.ts                # Wrapper novos hooks Meta
├── api/
│   ├── queries.ts                       # Hooks de query unificados
│   └── mutations.ts                     # Hooks de mutation unificados
├── stores/
│   └── unifiedAdsStore.ts               # Estado: plataforma selecionada
└── types/
    └── index.ts                         # Tipos TypeScript
```

---

## Interfaces Unificadas

```typescript
// Campanha normalizada (Google + Meta)
interface UnifiedCampaign {
  id: string
  name: string
  platform: 'google' | 'meta'
  status: 'ENABLED' | 'PAUSED' | 'REMOVED' | 'DRAFT'
  budget: number
  budgetType: 'daily' | 'lifetime'
  // Métricas comuns
  impressions: number
  clicks: number
  ctr: number
  cost: number
  conversions: number
  cpa: number
  roas?: number
  // Dados originais da plataforma
  platformData: GoogleCampaignMetrics | MetaCampaignMetrics
  connectionId: string
  connectionName: string
}

// Interface do Adapter
interface PlatformAdapter {
  platform: 'google' | 'meta'

  fetchCampaigns(params): Promise<UnifiedCampaign[]>
  fetchAutomations(connectionId): Promise<UnifiedAutomationRule[]>
  fetchHistory(params): Promise<UnifiedActionLog[]>

  pauseCampaign(campaignId): Promise<void>
  enableCampaign(campaignId): Promise<void>
  updateBudget(campaignId, budget): Promise<void>

  features: {
    hasAutomations: boolean
    hasHistory: boolean
    hasBidManagement: boolean
  }
}
```

---

## Fases de Implementação

### Fase 1: Foundation (2-3 dias)
**Objetivo**: Dashboard shell com navegação funcionando

- [ ] Criar estrutura `ads-unified/`
- [ ] Implementar `unifiedAdsStore.ts` (Zustand)
- [ ] Criar `PlatformSelector` component
- [ ] Criar `UnifiedAdsDashboard` com 4 abas (conteúdo stub)
- [ ] Adicionar rota `/ads` no router
- [ ] Atualizar sidebar ("AlvoAds Google" → "Campanhas")

**Arquivos**:
```
frontend/src/features/ads-unified/
├── pages/UnifiedAdsDashboard.tsx
├── components/PlatformSelector/index.tsx
├── stores/unifiedAdsStore.ts
frontend/src/app/router.tsx (modificar)
frontend/src/shared/layouts/MainLayout/Sidebar.tsx (modificar)
```

---

### Fase 2: Adapters (1 dia)
**Objetivo**: Padrão adapter funcionando com Google

- [ ] Definir interfaces em `adapters/types.ts`
- [ ] Implementar `GoogleAdsAdapter.ts` (wrapper dos hooks existentes)
- [ ] Stub `MetaAdsAdapter.ts` (retorna arrays vazios)
- [ ] Testar padrão com dados Google reais

**Arquivos**:
```
frontend/src/features/ads-unified/adapters/
├── types.ts
├── GoogleAdsAdapter.ts
└── MetaAdsAdapter.ts
```

---

### Fase 3: Aba Campanhas (2-3 dias)
**Objetivo**: Tabela unificada de campanhas funcionando

- [ ] Criar `UnifiedCampaignTable` component
- [ ] Criar `PlatformBadge` component
- [ ] Implementar `useUnifiedCampaigns` hook
- [ ] Integrar na aba Campanhas
- [ ] Testar com campanhas Google reais
- [ ] Empty state para Meta (sem dados ainda)

**Arquivos**:
```
frontend/src/features/ads-unified/components/
├── UnifiedCampaignTable/index.tsx
├── PlatformBadge/index.tsx
frontend/src/features/ads-unified/api/queries.ts
```

---

### Fase 4: Backend Meta Performance (3-4 dias)
**Objetivo**: API Meta para métricas de campanhas

- [ ] Criar `MetaDashboardController`
- [ ] Implementar `MetaDashboardService` (Meta Marketing API)
- [ ] Criar DTOs para métricas Meta
- [ ] Migration: tabela `meta_action_logs`
- [ ] Testar endpoints com Postman
- [ ] Atualizar `MetaAdsAdapter` para chamar API real

**Arquivos Backend**:
```
backend/src/modules/meta/
├── controllers/meta-dashboard.controller.ts
├── services/meta-dashboard.service.ts
├── dto/meta-campaign-metrics.dto.ts
supabase/migrations/XXXX_meta_action_logs.sql
```

**Endpoints**:
```
GET  /meta/dashboard/campaigns           # Lista campanhas com métricas
POST /meta/dashboard/campaigns/:id/pause # Pausar campanha
POST /meta/dashboard/campaigns/:id/enable # Ativar campanha
POST /meta/dashboard/campaigns/:id/budget # Alterar orçamento
```

---

### Fase 5: Aba Performance (2 dias)
**Objetivo**: Métricas agregadas de ambas plataformas

- [ ] Criar `UnifiedPerformanceView` component
- [ ] Criar `MetricCard` component
- [ ] Lógica de agregação para modo "Ambos"
- [ ] Tabela breakdown por plataforma
- [ ] Integrar na aba Performance

**Arquivos**:
```
frontend/src/features/ads-unified/components/
├── UnifiedPerformanceView/index.tsx
├── MetricCard/index.tsx
```

---

### Fase 6: Aba Automações (1-2 dias)
**Objetivo**: Automações Google (Meta = "em breve")

- [ ] Criar `UnifiedAutomationView` component
- [ ] Se só Google: mostrar UI completa de automações
- [ ] Se só Meta: mostrar "Em breve"
- [ ] Se Ambos: mostrar Google + nota sobre Meta
- [ ] Reusar `AutomationList` e `AutomationForm` existentes

**Arquivos**:
```
frontend/src/features/ads-unified/components/
└── UnifiedAutomationView/index.tsx
```

---

### Fase 7: Aba Histórico (2-3 dias)
**Objetivo**: Log unificado de ações

- [ ] Criar `UnifiedHistoryView` component
- [ ] Filtro por plataforma (dropdown)
- [ ] Linhas expansíveis com detalhes
- [ ] Backend: endpoint `/meta/dashboard/history/actions`
- [ ] Backend: endpoint `/meta/dashboard/history/stats`
- [ ] Atualizar `MetaAdsAdapter.fetchHistory()`

**Arquivos**:
```
frontend/src/features/ads-unified/components/
└── UnifiedHistoryView/index.tsx

backend/src/modules/meta/controllers/meta-dashboard.controller.ts (adicionar)
```

---

### Fase 8: Polish & Migration (1-2 dias)
**Objetivo**: Finalização e migração

- [ ] Adicionar query keys em `queryKeys.ts`
- [ ] Aplicar estilos do design system
- [ ] Layout responsivo mobile
- [ ] Banner de deprecação nas rotas antigas
- [ ] Atualizar documentação (CLAUDE.md)
- [ ] Testes E2E (Playwright)

---

## Estimativa Total

| Fase | Dias |
|------|------|
| 1. Foundation | 2-3 |
| 2. Adapters | 1 |
| 3. Aba Campanhas | 2-3 |
| 4. Backend Meta | 3-4 |
| 5. Aba Performance | 2 |
| 6. Aba Automações | 1-2 |
| 7. Aba Histórico | 2-3 |
| 8. Polish | 1-2 |
| **Total** | **14-20 dias** |

---

## Banco de Dados

### Nova Tabela: `meta_action_logs`

```sql
CREATE TABLE meta_action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  connection_id UUID NOT NULL REFERENCES connections(id),
  workspace_id UUID REFERENCES workspaces(id),
  source TEXT NOT NULL CHECK (source IN ('manual', 'automation')),
  automation_rule_id UUID,
  meta_campaign_id TEXT NOT NULL,
  meta_campaign_name TEXT,
  action_type TEXT NOT NULL,
  action_details JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  metrics_snapshot JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE meta_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_can_view" ON meta_action_logs
FOR SELECT USING (
  user_id = auth.uid()
  OR workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
```

### Futura: `meta_automation_rules` (Fase posterior)

```sql
CREATE TABLE meta_automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  connection_id UUID NOT NULL REFERENCES connections(id),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('all', 'filter')),
  scope_filters JSONB,
  conditions JSONB NOT NULL,
  action_type TEXT NOT NULL,
  action_value DECIMAL,
  action_value_type TEXT CHECK (action_value_type IN ('absolute', 'percentage')),
  check_frequency_minutes INTEGER NOT NULL DEFAULT 60,
  cooldown_minutes INTEGER NOT NULL DEFAULT 60,
  max_executions INTEGER,
  current_executions INTEGER NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Rotas

### Novas
- `/ads` → `UnifiedAdsDashboard` (nova página principal)
- `/ads?platform=google` → Filtro Google
- `/ads?platform=meta` → Filtro Meta
- `/ads?tab=performance` → Aba Performance
- `/ads?tab=automations` → Aba Automações
- `/ads?tab=history` → Aba Histórico

### Coexistência (MVP)
- `/alvoads-google` → Mantida para wizard de criação e configurações avançadas
- `/alvoads-meta` → Mantida para wizard de criação e biblioteca de criativos

**Nota**: Redirects planejados para fase posterior após validação do dashboard unificado.

---

## Menu Sidebar

### Antes
```
├── AlvoAds Google
├── AlvoAds Meta
```

### Depois (Coexistência - MVP)
```
├── Central de Anúncios (/ads)    ← NOVA entrada unificada
├── AlvoADS Meta (/alvoads-meta)  ← Mantida para funcionalidades específicas
├── AlvoADS Google (/alvoads-google) ← Mantida para funcionalidades específicas
```

**Estratégia de Rotas**: Durante o MVP, as três rotas coexistem para permitir migração gradual. Usuários podem usar `/ads` para visão unificada ou as rotas específicas para funcionalidades avançadas (wizard de criação, configurações detalhadas). Redirects serão implementados em fase posterior após validação de que `/ads` cobre todos os casos de uso.

---

## Decisões de Design

### 1. Por que Platform Adapter Pattern?
- Google e Meta têm APIs completamente diferentes
- Código Google existente está maduro e testado
- Permite adicionar novas plataformas (TikTok, LinkedIn) no futuro
- Separa lógica de UI da lógica de plataforma

### 2. Por que não refatorar Google?
- Código funciona bem (~1400 linhas em `AlvoAdsGooglePage`)
- Risco de introduzir bugs em feature estável
- Melhor encapsular com adapter do que reescrever

### 3. Quando mostrar métricas agregadas?
- Se "Ambos" selecionado: mostrar totais + breakdown por plataforma
- Se plataforma única: mostrar só aquela plataforma
- Moeda: Converter tudo para USD (consistência)

### 4. E as Automações Meta?
- MVP: Mostrar "Em breve" para Meta
- Fase posterior: Implementar regras específicas Meta
- Diferença: Meta tem métricas diferentes (Reach, Frequency, etc)

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Meta API rate limits | Média | Alto | Cache 5min, retry exponential |
| Diferenças de métricas | Alta | Médio | Normalização no adapter |
| Complexidade de UI | Média | Médio | Componentes modulares |
| Performance com "Ambos" | Baixa | Médio | Parallel fetch, loading states |

---

## Checklist Final

- [ ] Fase 1: Foundation completa
- [ ] Fase 2: Adapters funcionando
- [ ] Fase 3: Campanhas unificadas
- [ ] Fase 4: Backend Meta implementado
- [ ] Fase 5: Performance agregada
- [ ] Fase 6: Automações (Google)
- [ ] Fase 7: Histórico unificado
- [ ] Fase 8: Polish e testes
- [ ] Documentação atualizada
- [ ] Rotas antigas redirecionando
- [ ] Menu sidebar atualizado
