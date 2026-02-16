# Google AdSense Integration

## Overview

This feature adds Google AdSense integration to AlvoBot, following the same pattern established by Google Ads and Ad Manager. The integration includes OAuth authentication, connection management, and a unified revenue dashboard that combines Ad Manager and AdSense data.

## Problem Statement

Currently, users can only view Ad Manager revenue data. Many users also use Google AdSense to monetize their sites and need a unified view of all their ad revenue sources. Additionally, the current connection modal structure separates Google services (Google, Ad Manager) when they should be grouped under a single "Google" category for better organization.

## Goals

1. Add Google AdSense OAuth connection support
2. Reorganize the connection modal to group all Google services together
3. Rename "Ad Manager" sidebar item to "Receita" (Revenue) with a currency icon
4. Create a unified revenue dashboard showing both Ad Manager and AdSense data
5. Allow filtering between Ad Manager and AdSense data sources

## Non-Goals

- Advanced AdSense reporting features beyond basic metrics
- AdSense account management (creating/editing ad units)
- Real-time data (will use same caching strategy as Ad Manager)

## User Stories

### US-1: Connect Google AdSense Account
**As a** user
**I want to** connect my Google AdSense account
**So that** I can view my AdSense revenue data in AlvoBot

**Acceptance Criteria:**
- User can select "Google AdSense" as a connection type
- OAuth flow authenticates with Google AdSense API scopes
- Connection is stored with proper metadata
- User can reconnect expired connections

### US-2: Organized Google Connection Selection
**As a** user
**I want to** see all Google services grouped together when connecting
**So that** I can easily find and select the Google service I need

**Acceptance Criteria:**
- Connection modal shows only "Meta" and "Google" in step 2
- Selecting "Google" shows a sub-selection with: Google Ads, Google AdSense, Google Ad Manager
- Each Google service has a distinct icon and description
- Selection flows seamlessly to OAuth

### US-3: View Unified Revenue Dashboard
**As a** user
**I want to** see my Ad Manager and AdSense revenue in one place
**So that** I can understand my total ad revenue

**Acceptance Criteria:**
- Sidebar shows "Receita" with $ icon instead of "Ad Manager"
- Dashboard displays both Ad Manager and AdSense data
- User can filter by source (All, Ad Manager only, AdSense only)
- Metrics are clearly labeled by source
- Connection selector shows both Ad Manager and AdSense connections

### US-4: AdSense Metrics Display
**As a** user
**I want to** see my AdSense performance metrics
**So that** I can analyze my AdSense revenue

**Acceptance Criteria:**
- Display: Revenue, Impressions, Clicks, CTR, CPC, RPM
- Data can be filtered by date range
- Data can be grouped by site/domain
- Currency is displayed in original account currency (no conversion between currencies)

## Technical Design

### 1. Database Changes

#### 1.1 Connections Table Updates
No schema changes needed. AdSense connections will use existing `connections` table with:
```typescript
{
  plataform_name: 'google',
  metadata: {
    type: 'adsense',  // New type alongside 'ads' and 'ad_manager'
    user_name: string,
    user_email: string,
    user_picture?: string,
    scopes: string,
    account_id?: string,  // AdSense account ID
    currency_code?: string
  }
}
```

### 2. Backend Changes

#### 2.1 New Module: AdSense OAuth Service
**Location:** `backend/src/modules/adsense/`

**Files:**
- `adsense.module.ts` - NestJS module definition
- `adsense.controller.ts` - HTTP endpoints
- `adsense-oauth.service.ts` - OAuth flow handling
- `adsense-api.service.ts` - AdSense Reporting API integration

**Endpoints:**
```typescript
POST /adsense/oauth/initiate
  Input: { connectionName, workspaceId, reconnectConnectionId? }
  Output: { authUrl }

GET /adsense/oauth/callback
  Query: { code, state }
  Redirects to: ${FRONTEND_URL}/callback/adsense?success=true&connection_id=...

POST /adsense/accounts
  Input: { connectionId }
  Output: { accounts: AdSenseAccount[] }

POST /adsense/report
  Input: { connectionId, accountId, startDate, endDate, dimensions?, metrics? }
  Output: { rows: ReportRow[], totals: MetricsTotals }
```

#### 2.2 OAuth Scopes
```typescript
const ADSENSE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/adsense.readonly'
];
```

#### 2.3 AdSense Reporting API Integration
Use Google AdSense Management API v2:
- `GET /accounts` - List AdSense accounts
- `POST /accounts/{accountId}/reports:generate` - Generate reports

**Report Dimensions:**
- DATE
- DOMAIN_NAME (site)
- URL_CHANNEL_NAME

**Report Metrics:**
- ESTIMATED_EARNINGS
- IMPRESSIONS
- CLICKS
- CLICK_THROUGH_RATE
- COST_PER_CLICK
- PAGE_VIEWS_RPM

### 3. Frontend Changes

#### 3.1 Connection Modal Reorganization
**Location:** `frontend/src/features/connections/pages/ConnectionsPage.tsx`

**Current Flow:**
```
Step 1: Name → Step 2: [Meta, Google, Ad Manager] → Step 3: (Meta only)
```

**New Flow:**
```
Step 1: Name → Step 2: [Meta, Google] → Step 3: [Google Ads, AdSense, Ad Manager] (if Google) or [Messages, Ads] (if Meta)
```

**Google Sub-Selection UI:**
```typescript
const googleServices = [
  {
    id: 'ads',
    label: 'Google Ads',
    icon: <Megaphone />,
    description: 'Gerencie suas campanhas de anúncios'
  },
  {
    id: 'adsense',
    label: 'Google AdSense',
    icon: <DollarSign />,
    description: 'Visualize receitas do AdSense'
  },
  {
    id: 'ad_manager',
    label: 'Google Ad Manager',
    icon: <LayoutGrid />,
    description: 'Análise avançada de inventário'
  }
];
```

#### 3.2 AdSense Callback Page
**Location:** `frontend/src/features/connections/pages/AdSenseCallbackPage.tsx`

Similar to `GoogleCallbackPage.tsx` but for AdSense OAuth callback.

#### 3.3 Sidebar Update
**Location:** `frontend/src/shared/layouts/MainLayout/Sidebar.tsx`

Change:
```typescript
// From:
{ path: '/ad-manager', label: 'Ad Manager', icon: <LayoutGrid /> }

// To:
{ path: '/receita', label: 'Receita', icon: <DollarSign /> }
```

#### 3.4 Revenue Dashboard (Renamed from Ad Manager)
**Location:** `frontend/src/features/revenue-dashboard/` (rename from `ad-manager-dashboard`)

**New Features:**
- Source filter: "Todas", "Ad Manager", "AdSense"
- Connection selector shows both Ad Manager and AdSense connections
- Unified metrics display with source indicator
- Separate API calls merged in frontend

**Component Updates:**
- `RevenueDashboardPage.tsx` - Main page with source filter
- `RevenueSourceFilter.tsx` - New component for source selection
- `AdSenseMetricsTable.tsx` - AdSense-specific table (similar to Ad Manager)
- `UnifiedRevenueView.tsx` - Combined view when "Todas" is selected

#### 3.5 AdSense API Hooks
**Location:** `frontend/src/features/revenue-dashboard/api/`

```typescript
// queries.ts
export function useAdSenseAccounts(connectionId: string) { ... }
export function useAdSenseReport(params: AdSenseReportParams) { ... }

// types.ts
interface AdSenseReportParams {
  connectionId: string;
  accountId: string;
  startDate: string;
  endDate: string;
}

interface AdSenseReportRow {
  date?: string;
  domain?: string;
  url?: string;
  revenue: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  rpm: number;
}
```

### 4. Route Changes

**New Routes:**
```typescript
// Public callback
'/callback/adsense' → AdSenseCallbackPage

// Rename route
'/ad-manager' → '/receita' (with redirect for backwards compatibility)
```

### 5. Environment Variables

**Backend (.env additions):**
```bash
# Google AdSense (uses same GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
# No additional env vars needed - same OAuth credentials
```

## UI/UX Specifications

### Connection List - Service Type Badges

Na lista de conexões, cada conexão Google exibirá um badge colorido indicando o tipo de serviço:

| Serviço | Badge | Cor |
|---------|-------|-----|
| Google Ads | `Ads` | Azul (#4285F4) |
| Google AdSense | `AdSense` | Verde (#34A853) |
| Google Ad Manager | `Ad Manager` | Laranja (#FBBC04) |

```
┌─────────────────────────────────────────────────────────┐
│  Conexões                                                │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ 🔵 Conta Principal Google    [Ads]        Ativo    │ │
│  │ 🟢 Meu AdSense              [AdSense]    Ativo    │ │
│  │ 🟠 Publisher Account        [Ad Manager] Ativo    │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Connection Modal - Google Sub-Selection

```
┌─────────────────────────────────────────┐
│  Selecione o serviço Google             │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📢 Google Ads                    │   │
│  │    Gerencie suas campanhas       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 💰 Google AdSense               │   │
│  │    Visualize receitas do AdSense │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📊 Google Ad Manager            │   │
│  │    Análise avançada de inventário│   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Voltar]                    [Conectar] │
└─────────────────────────────────────────┘
```

### Revenue Dashboard - Source Filter

```
┌───────────────────────────────────────────────────────────────┐
│  Receita                                                       │
│                                                                │
│  [Connection ▼] [Account ▼] [Todas ▼] [Últimos 7 dias ▼] [🔄] │
│                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐│
│  │ Receita Tot.│ │ Impressões  │ │ Cliques     │ │ RPM Médio ││
│  │   R$455     │ │   178.189   │ │   2.340     │ │   R$2.55  ││
│  │  ↑12% 7d    │ │  ↑8% 7d     │ │  ↑5% 7d     │ │  ↑3% 7d   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘│
│                                                                │
│  Source filter: [Todas ▼]                                      │
│                 • Todas                                        │
│                 • Ad Manager                                   │
│                 • AdSense                                      │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Site          │ Fonte      │ Receita │ RPM    │ Impr.   │ │
│  │───────────────┼────────────┼─────────┼────────┼─────────│ │
│  │ site1.com     │ Ad Manager │ R$150   │ R$2.50 │ 60,000  │ │
│  │ site2.com     │ AdSense    │ R$85    │ R$1.80 │ 47,222  │ │
│  │ site3.com     │ Ad Manager │ R$220   │ R$3.10 │ 70,967  │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Loading States

### Dashboard Loading Behavior

O dashboard utiliza **skeleton loaders** para proporcionar feedback visual durante o carregamento:

1. **Cards de Resumo:** Skeleton retangular com animação pulse enquanto carrega
2. **Tabela de Dados:** Skeleton rows (5-10 linhas) com colunas correspondentes
3. **Carregamento Paralelo:** Ad Manager e AdSense são carregados simultaneamente via `Promise.all`
4. **Merge de Dados:** Dados são combinados e ordenados após ambas as fontes responderem

```
┌───────────────────────────────────────────────────────────────┐
│  Receita                                                       │
│                                                                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐│
│  │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░ ││
│  │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░░░ │ │ ░░░░░░░░░ ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘│
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Conexões Loading

- Lista de conexões: Skeleton cards durante carregamento
- Modal de conexão: Spinner no botão "Conectar" durante OAuth redirect

## Edge Cases & Error Handling

### OAuth Errors

| Cenário | Mensagem | Ação |
|---------|----------|------|
| Usuário negou permissão | "Permissão negada. Autorize o acesso ao AdSense para continuar." | Botão "Tentar Novamente" |
| Token expirado durante reconexão | "Sessão expirada. Por favor, reconecte sua conta." | Botão "Reconectar" |
| Conta sem acesso AdSense | "Esta conta Google não possui acesso ao AdSense." | Botão "Usar outra conta" |
| Erro de rede/timeout | "Erro de conexão. Verifique sua internet e tente novamente." | Botão "Tentar Novamente" |
| Escopo insuficiente | "Permissões insuficientes. Autorize acesso de leitura ao AdSense." | Botão "Autorizar Novamente" |

### Dashboard Errors

| Cenário | Comportamento |
|---------|---------------|
| Conexão inativa | Mostrar aviso com link para reconectar |
| API AdSense indisponível | Mostrar dados em cache (se disponível) com aviso de "dados desatualizados" |
| Sem dados no período | Mostrar estado vazio com mensagem "Nenhum dado para o período selecionado" |
| Múltiplas moedas nos totais | Cards de resumo mostram aviso "Totais aproximados - múltiplas moedas" |

## Migration Strategy

1. **Backwards Compatibility:** Maintain `/ad-manager` route as redirect to `/receita`
2. **Existing Connections:** No migration needed - Ad Manager connections continue to work
3. **Feature Toggle:** None needed - additive feature

## Testing Strategy

### Unit Tests
- AdSense OAuth service token exchange
- AdSense API response parsing
- Revenue dashboard source filtering logic

### Integration Tests
- Complete OAuth flow for AdSense
- AdSense report generation API
- Connection modal flow with Google sub-selection

### E2E Tests
- Connect AdSense account flow
- View AdSense data in revenue dashboard
- Filter between sources

## Security Considerations

1. **OAuth Scopes:** Request only `adsense.readonly` - no write access needed
2. **Token Storage:** Same encrypted storage as existing Google connections
3. **RLS Policies:** Existing workspace-based policies apply
4. **API Keys:** No additional API keys needed - uses existing Google OAuth credentials

## Metrics & Monitoring

- Track AdSense connection success/failure rate
- Monitor AdSense API response times
- Log OAuth errors for debugging

## Rollout Plan

1. **Phase 1:** Backend AdSense OAuth and API integration
2. **Phase 2:** Connection modal reorganization
3. **Phase 3:** Sidebar rename and route changes
4. **Phase 4:** Revenue dashboard with unified view
5. **Phase 5:** Testing and bug fixes

## Clarifications

### Session 2026-01-16
- Q: Devemos mostrar totais combinados de ambas as fontes em cards de resumo? → A: Sim, mostrar cards de resumo com totais combinados (Receita Total, Impressões Totais, etc.) no topo do dashboard.
- Q: Como lidar com contas AdSense com moedas diferentes? → A: Exibir na moeda original de cada conta (sem conversão). Cada linha mostrará o símbolo da moeda correspondente.
- Q: A lista de conexões deve mostrar badge indicando o tipo de serviço Google? → A: Sim, mostrar badge colorido ao lado do nome (ex: "Minha Conta [AdSense]").
- Q: Como tratar erros de OAuth (permissão negada, token expirado, sem acesso AdSense)? → A: Mostrar mensagem de erro específica com botão "Tentar Novamente".
- Q: Qual o comportamento de loading no dashboard ao combinar múltiplas fontes? → A: Skeleton loaders nos cards e tabela, carregando fontes em paralelo.

## Open Questions

1. ~~Should we show combined totals from both sources in a summary card?~~ (Resolvido - ver Clarifications)
2. ~~Do we need to handle AdSense accounts with different currencies?~~ (Resolvido - ver Clarifications)
3. ~~Should the connection list show a badge indicating the Google service type?~~ (Resolvido - ver Clarifications)

## Dependencies

- Google AdSense Management API v2 access
- Existing Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- No additional third-party dependencies

## Appendix

### Google AdSense API Reference
- [AdSense Management API v2](https://developers.google.com/adsense/management/reference/rest)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)

### Related Features
- [026-ad-manager-dashboard](../026-ad-manager-dashboard/) - Ad Manager integration
- [025-google-ads-dashboard](../025-google-ads-dashboard/) - Google Ads integration
