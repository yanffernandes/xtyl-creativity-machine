# Feature Specification: Google Ad Manager Site Analysis Dashboard

**Feature Branch**: `026-ad-manager-dashboard`
**Created**: 2026-01-15
**Status**: Draft
**Input**: User description: "Integração com Google Ad Manager para visualizar métricas de sites, com tabela hierárquica por Site > Data > Request URI mostrando Revenue, RPS, eCPM, PMR, Viewability, CPC, CTR, Clicks, Impressions e Requests."

## Clarifications

### Session 2026-01-15

- Q: Como lidar com múltiplas redes Ad Manager por conta? → A: Dashboard único com filtro/seletor de rede na mesma tela, usuário escolhe qual rede visualizar
- Q: Qual o TTL do cache de dados no backend? → A: 15 minutos, com timestamp visível para o usuário saber quando os dados foram atualizados
- Q: Como integrar com sistema de conexões existente? → A: Novo provider 'ad_manager' no módulo de conexões existente (mesma tabela connections)
- Q: Como carregar níveis da hierarquia? → A: Lazy loading - carrega cada nível apenas quando usuário expande (chamada à API por expansão)
- Q: Usuário pode forçar refresh dos dados? → A: Sim, botão de refresh visível que ignora cache e busca dados frescos da API

## Overview

Esta feature permite aos usuários do AlvoBot visualizar métricas de monetização de seus sites diretamente no dashboard, usando a API do Google Ad Manager. A interface será uma tabela hierárquica expansível, similar à "Site Analysis" do Active View, permitindo análise detalhada por site, data e URL específica. O dashboard suporta múltiplas redes Ad Manager com seletor/filtro para alternar entre elas na mesma tela.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conectar Conta Google Ad Manager (Priority: P1)

Como usuário do AlvoBot, quero conectar minha conta do Google Ad Manager ao sistema, para poder visualizar as métricas de monetização dos meus sites.

**Why this priority**: Sem a conexão OAuth configurada, nenhuma outra funcionalidade é possível. É o pré-requisito fundamental.

**Independent Test**: Pode ser testado iniciando o fluxo OAuth, autorizando acesso e verificando se a conexão aparece na lista de conexões do usuário.

**Acceptance Scenarios**:

1. **Given** usuário está na página de Conexões, **When** clica em "Conectar Google Ad Manager", **Then** é redirecionado para o fluxo OAuth do Google
2. **Given** usuário completou o OAuth com sucesso, **When** é redirecionado de volta, **Then** a conexão aparece como "Ativa" na lista de conexões
3. **Given** usuário tem múltiplas redes Ad Manager, **When** acessa o dashboard, **Then** pode selecionar qual rede visualizar
4. **Given** token OAuth expirou, **When** usuário acessa o dashboard, **Then** sistema tenta refresh automático ou solicita reconexão

---

### User Story 2 - Visualizar Métricas por Site (Priority: P1)

Como usuário, quero visualizar todas as métricas de monetização agregadas por site em uma tabela clara, para entender rapidamente qual site está gerando mais receita.

**Why this priority**: Esta é a funcionalidade principal do dashboard. Fornece a visão macro necessária para tomada de decisão.

**Independent Test**: Pode ser testado acessando o dashboard com uma conexão ativa e verificando se todos os sites aparecem com métricas corretas.

**Acceptance Scenarios**:

1. **Given** usuário tem conexão Ad Manager ativa, **When** acessa o dashboard de Site Analysis, **Then** vê lista de todos os sites com métricas agregadas
2. **Given** dashboard está carregando, **When** dados são buscados da API, **Then** exibe loading state apropriado
3. **Given** usuário tem múltiplos sites, **When** visualiza a tabela, **Then** pode ordenar por qualquer coluna de métrica
4. **Given** usuário quer focar em um site, **When** usa o campo de busca, **Then** tabela filtra para mostrar apenas sites correspondentes

---

### User Story 3 - Expandir Hierarquia Site > Data > URL (Priority: P1)

Como usuário, quero expandir cada site para ver breakdown por data, e cada data para ver breakdown por Request URI, para identificar exatamente quais páginas estão performando melhor.

**Why this priority**: A hierarquia expansível é o diferencial desta visualização, permitindo drill-down granular sem sair da interface.

**Independent Test**: Pode ser testado clicando no botão de expandir de um site e verificando se as datas aparecem, e então expandindo uma data para ver as URIs.

**Acceptance Scenarios**:

1. **Given** usuário está na tabela de sites, **When** clica no ícone "+" de um site, **Then** expande para mostrar linhas agrupadas por data
2. **Given** site está expandido mostrando datas, **When** clica no "+" de uma data, **Then** expande para mostrar linhas individuais por Request URI
3. **Given** hierarquia está expandida, **When** clica no ícone "-", **Then** colapsa aquele nível mantendo outros níveis intactos
4. **Given** usuário expandiu múltiplos níveis, **When** busca por Request URI, **Then** filtra mostrando apenas URIs correspondentes

---

### User Story 4 - Filtrar por Período (Priority: P1)

Como usuário, quero filtrar os dados por diferentes períodos (hoje, 7 dias, 30 dias, personalizado), para analisar tendências e comparar performance ao longo do tempo.

**Why this priority**: Análise temporal é essencial para entender sazonalidade e impacto de mudanças nos sites.

**Independent Test**: Pode ser testado selecionando diferentes períodos e verificando se os dados e totais se atualizam corretamente.

**Acceptance Scenarios**:

1. **Given** usuário está no dashboard, **When** seleciona "Hoje", **Then** métricas mostram apenas dados do dia atual
2. **Given** usuário está no dashboard, **When** seleciona "Últimos 7 dias", **Then** métricas mostram agregado dos últimos 7 dias
3. **Given** usuário seleciona "Período personalizado", **When** define data início e fim, **Then** métricas refletem exatamente esse período
4. **Given** período selecionado não tem dados, **When** dashboard carrega, **Then** exibe mensagem "Sem dados para o período selecionado"

---

### User Story 5 - Alternar Agrupamento (Priority: P2)

Como usuário, quero alternar o agrupamento primário da tabela entre "Site" e "Request URI", para analisar dados de diferentes perspectivas.

**Why this priority**: Flexibilidade de análise é útil mas não essencial. A maioria dos usuários usará o agrupamento por Site.

**Independent Test**: Pode ser testado alternando o dropdown de agrupamento e verificando se a estrutura da tabela muda corretamente.

**Acceptance Scenarios**:

1. **Given** agrupamento está em "Site", **When** usuário muda para "Request URI", **Then** tabela mostra URIs no primeiro nível
2. **Given** agrupamento está em "Request URI", **When** expande uma URI, **Then** vê breakdown por Site > Data

---

### User Story 6 - Exportar Dados (Priority: P3)

Como usuário, quero exportar os dados visualizados para CSV, para análise posterior em planilhas ou compartilhamento.

**Why this priority**: Export é uma funcionalidade de conveniência. Usuários podem copiar dados manualmente se necessário.

**Independent Test**: Pode ser testado clicando no botão de export e verificando se um arquivo CSV é baixado com os dados corretos.

**Acceptance Scenarios**:

1. **Given** usuário está visualizando dados, **When** clica em "Exportar CSV", **Then** arquivo é baixado com todas as colunas visíveis
2. **Given** usuário aplicou filtros, **When** exporta, **Then** apenas dados filtrados são incluídos no CSV

---

### Edge Cases

- O que acontece quando a API do Ad Manager está indisponível? Sistema exibe mensagem de erro amigável e permite retry
- Como o sistema lida com sites removidos do Ad Manager? Remove da lista na próxima sincronização
- O que acontece se usuário não tem permissão para alguma rede? Exibe apenas redes autorizadas, mensagem para outras
- Como o sistema lida com rate limits da API? Implementa backoff exponencial, usa cache quando possível
- O que acontece com Request URIs muito longas? Trunca na exibição com tooltip mostrando URL completa
- Como o sistema lida com dados de datas futuras na API? Ignora, exibe apenas até data atual
- O que acontece se conexão OAuth é revogada externamente? Detecta erro 401, solicita reconexão

## Requirements *(mandatory)*

### Functional Requirements

**Conexão e Autenticação:**
- **FR-001**: Sistema DEVE suportar conexão OAuth com Google Ad Manager (escopo: `https://www.googleapis.com/auth/dfp`)
- **FR-002**: Sistema DEVE armazenar tokens OAuth de forma segura no backend (nunca no frontend)
- **FR-003**: Sistema DEVE implementar refresh automático de tokens expirados
- **FR-004**: Sistema DEVE listar todas as redes Ad Manager que o usuário tem acesso
- **FR-004a**: Sistema DEVE exibir seletor/filtro de rede na mesma tela do dashboard (não abas separadas)
- **FR-005**: Sistema DEVE permitir desconectar/reconectar conta Ad Manager

**Dashboard e Visualização:**
- **FR-006**: Sistema DEVE exibir tabela hierárquica com três níveis: Site > Data > Request URI
- **FR-007**: Sistema DEVE exibir as seguintes métricas por linha:
  - Revenue (receita em moeda da conta)
  - RPS (Revenue Per Session/Request)
  - eCPM (Effective Cost Per Mille)
  - PMR (Page-level Match Rate %)
  - Viewability (%)
  - CPC (Cost Per Click)
  - CTR (Click-Through Rate %)
  - Clicks (total de cliques)
  - Impressions (total de impressões)
  - Requests (total de requisições de anúncios)
- **FR-008**: Sistema DEVE permitir expandir/colapsar cada nível da hierarquia independentemente
- **FR-009**: Sistema DEVE mostrar contagem de itens filhos ao lado de cada linha expansível (ex: "gastronomia.com.br (3)")
- **FR-010**: Sistema DEVE permitir ordenação por qualquer coluna de métrica
- **FR-011**: Sistema DEVE implementar busca/filtro por Site e Request URI

**Filtros de Período:**
- **FR-012**: Sistema DEVE permitir filtrar por períodos pré-definidos: Hoje, Últimos 7 dias, Últimos 30 dias
- **FR-013**: Sistema DEVE permitir período personalizado com seleção de data início e fim
- **FR-014**: Sistema DEVE limitar período máximo a 90 dias (limitação da API)
- **FR-015**: Sistema DEVE exibir data/período selecionado no header do dashboard

**Dados e Performance:**
- **FR-016**: Sistema DEVE buscar dados diretamente da API Ad Manager (não persistir métricas localmente)
- **FR-017**: Sistema DEVE implementar cache de 15 minutos no backend para evitar chamadas excessivas
- **FR-017a**: Sistema DEVE exibir timestamp de "última atualização" visível para o usuário
- **FR-017b**: Sistema DEVE oferecer botão de refresh manual que ignora cache e busca dados frescos
- **FR-018**: Sistema DEVE usar paginação para contas com muitos sites/URIs
- **FR-019**: Sistema DEVE usar token OAuth da conexão do usuário (não token centralizado)

**UI/UX:**
- **FR-020**: Sistema DEVE exibir loading state durante carregamento inicial
- **FR-021**: Sistema DEVE exibir loading inline ao expandir níveis
- **FR-022**: Sistema DEVE preservar estado de expansão ao mudar ordenação/filtros
- **FR-023**: Sistema DEVE exibir tooltips com valores completos em colunas truncadas
- **FR-024**: Sistema DEVE formatar valores monetários na moeda da conta Ad Manager
- **FR-025**: Sistema DEVE formatar percentuais com 2 casas decimais

### Security Requirements

- **SR-001**: Tokens OAuth DEVEM ser armazenados apenas no backend com encryption at rest
- **SR-002**: Frontend NUNCA deve ter acesso direto a tokens ou credenciais
- **SR-003**: Todas as chamadas à API Ad Manager DEVEM passar pelo backend
- **SR-004**: Dados DEVEM ser isolados por workspace (RLS)
- **SR-005**: Sistema DEVE validar permissões antes de acessar qualquer rede Ad Manager

### Visual/UI Requirements

- **VR-001**: Tabela DEVE seguir o design system existente (cores, tipografia, espaçamento)
- **VR-002**: Ícones de expandir/colapsar DEVEM ser claramente visíveis (+ / -)
- **VR-003**: Linhas de níveis diferentes DEVEM ter indentação visual progressiva
- **VR-004**: Valores de receita DEVEM ter destaque visual (fonte mais pesada ou cor)
- **VR-005**: Colunas de métricas DEVEM ter largura adequada para valores formatados
- **VR-006**: Loading states DEVEM usar Spinner component do design system

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem conectar conta Ad Manager em menos de 60 segundos
- **SC-002**: Dashboard carrega dados iniciais em menos de 5 segundos
- **SC-003**: Expansão de níveis na hierarquia completa em menos de 2 segundos
- **SC-004**: Sistema suporta contas com até 100 sites e 10.000 URIs únicas
- **SC-005**: 100% das métricas exibidas são consistentes com os valores na interface do Ad Manager
- **SC-006**: Usuários conseguem identificar site com maior receita em menos de 10 segundos
- **SC-007**: Cache evita 80%+ das chamadas repetidas à API
- **SC-008**: Zero exposição de tokens OAuth no frontend/logs

## Data Model / Key Entities

### Dados da API Google Ad Manager (não persistidos localmente)

```typescript
// Métricas retornadas pela API - apenas em memória/cache
interface AdManagerMetrics {
  site: string;              // Nome do site/domínio
  date: string;              // Data no formato YYYY-MM-DD
  requestUri: string;        // URI da página
  revenue: number;           // Receita em centavos (converter para moeda)
  rps: number;               // Revenue Per Session
  ecpm: number;              // eCPM em centavos
  pmr: number;               // Page Match Rate (0-100)
  viewability: number;       // Viewability % (0-100)
  cpc: number;               // Cost Per Click
  ctr: number;               // Click-Through Rate (0-100)
  clicks: number;            // Total de cliques
  impressions: number;       // Total de impressões
  requests: number;          // Total de ad requests
}
```

### Dados locais (persistidos no Supabase)

```sql
-- Tabela de conexões já existe, apenas adicionar tipo 'ad_manager'
-- connections (existente)
--   id, user_id, workspace_id, provider, status, token_data (encrypted), created_at, updated_at

-- Configurações de visualização do usuário (opcional, para preferências)
CREATE TABLE ad_manager_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  default_network_id TEXT,                    -- Rede Ad Manager padrão
  default_period TEXT DEFAULT '7d',           -- Período padrão (today, 7d, 30d)
  default_grouping TEXT DEFAULT 'site',       -- Agrupamento padrão
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);

-- RLS Policies
ALTER TABLE ad_manager_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON ad_manager_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON ad_manager_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON ad_manager_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

## API Contracts

### Frontend → Backend

#### Buscar Redes Ad Manager Disponíveis
```typescript
// GET /ad-manager/networks
// Headers: Authorization: Bearer <jwt>

// Response 200
interface GetNetworksResponse {
  networks: Array<{
    id: string;           // Network ID
    name: string;         // Display name
    currencyCode: string; // Ex: "BRL", "USD"
  }>;
}
```

#### Buscar Métricas de Sites
```typescript
// POST /ad-manager/site-analysis
// Headers: Authorization: Bearer <jwt>

interface SiteAnalysisRequest {
  networkId: string;
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  groupBy: 'site' | 'request_uri';
  filters?: {
    site?: string;        // Filtro por nome do site
    requestUri?: string;  // Filtro por URI (partial match)
  };
  pagination?: {
    page: number;
    pageSize: number;     // Max 100
  };
}

// Response 200
interface SiteAnalysisResponse {
  data: AdManagerSiteData[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  metadata: {
    networkId: string;
    currencyCode: string;
    dateRange: {
      start: string;
      end: string;
    };
    cachedAt?: string;    // ISO timestamp se veio do cache
  };
}

interface AdManagerSiteData {
  site: string;
  childCount: number;     // Quantidade de datas ou URIs filhas
  metrics: {
    revenue: number;
    rps: number;
    ecpm: number;
    pmr: number;
    viewability: number;
    cpc: number;
    ctr: number;
    clicks: number;
    impressions: number;
    requests: number;
  };
  children?: AdManagerDateData[];  // Preenchido quando expandido
}

interface AdManagerDateData {
  date: string;           // YYYY-MM-DD
  childCount: number;
  metrics: { /* same as above */ };
  children?: AdManagerUriData[];
}

interface AdManagerUriData {
  requestUri: string;
  metrics: { /* same as above */ };
}
```

#### Buscar Detalhes de um Nível (Lazy Loading)
```typescript
// POST /ad-manager/site-analysis/expand
// Headers: Authorization: Bearer <jwt>

interface ExpandRequest {
  networkId: string;
  startDate: string;
  endDate: string;
  level: 'date' | 'uri';
  parentSite: string;
  parentDate?: string;    // Obrigatório se level = 'uri'
}

// Response 200
interface ExpandResponse {
  items: AdManagerDateData[] | AdManagerUriData[];
}
```

## Tech Stack

### Backend (NestJS Module)
- **Google APIs Client**: `googleapis` package para Ad Manager API
- **Cache**: In-memory cache com TTL (ou Redis se já existir)
- **Rate Limiting**: Respeitar limites da API Ad Manager

### Frontend (React Components)
- **TanStack Query**: Para data fetching e cache client-side
- **CSS Modules**: Seguindo design system existente
- **Components**: Reutilizar Table, Spinner, Button do shared

## Implementation Plan

### Phase 1 - Conexão OAuth (Backend)
1. Adicionar provider 'ad_manager' no módulo de conexões existente
2. Implementar endpoints OAuth (initiate, callback) para Ad Manager
3. Armazenar tokens com encryption
4. Implementar refresh token automático

### Phase 2 - Endpoints de Dados (Backend)
1. Criar módulo NestJS `ad-manager`
2. Implementar endpoint `/networks` para listar redes
3. Implementar endpoint `/site-analysis` para dados agregados
4. Implementar endpoint `/site-analysis/expand` para lazy loading
5. Implementar cache layer com TTL configurável

### Phase 3 - Frontend Base
1. Criar feature `ad-manager-dashboard` com estrutura padrão
2. Implementar queries e mutations (TanStack Query)
3. Criar página principal do dashboard
4. Implementar componente de seleção de rede

### Phase 4 - Tabela Hierárquica
1. Implementar componente de tabela expansível
2. Criar lógica de expand/collapse com lazy loading
3. Implementar ordenação por colunas
4. Implementar busca/filtro

### Phase 5 - Filtros e Polish
1. Implementar filtro de período (date picker)
2. Adicionar alternância de agrupamento
3. Implementar export CSV (opcional)
4. Testes e refinamentos de UX

## Assumptions

- Usuário já possui conta Google Ad Manager com sites configurados
- API do Ad Manager já está habilitada no Google Cloud Console do projeto
- Credenciais OAuth (client_id, client_secret) já existem ou serão criadas
- Métricas da API Ad Manager têm delay de algumas horas (comportamento padrão)
- Usuário tem permissões de leitura na(s) rede(s) Ad Manager que deseja visualizar

## Out of Scope

- Criação/edição de ad units no Ad Manager
- Configuração de line items ou orders
- Automações baseadas em métricas do Ad Manager (pode ser feature futura)
- Comparação lado-a-lado de múltiplas redes
- Histórico persistido de métricas (sempre busca da API)
- Alertas de performance de Ad Manager
- Integração com Google Analytics (feature separada)

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API Ad Manager tem rate limits restritivos | Medium | High | Implementar cache agressivo, lazy loading, paginação |
| Delay nos dados da API (horas) | High | Low | Documentar claramente para usuário, exibir timestamp dos dados |
| Estrutura de dados varia por configuração da conta | Medium | Medium | Testar com múltiplas contas, handlers para campos opcionais |
| OAuth scopes insuficientes | Low | High | Documentar scopes necessários, validar durante conexão |
| Performance ruim com muitos sites/URIs | Medium | Medium | Paginação obrigatória, lazy loading de níveis |

## References

- [Google Ad Manager API Documentation](https://developers.google.com/ad-manager/api)
- [Ad Manager API Report Service](https://developers.google.com/ad-manager/api/reference/v202311/ReportService)
- [OAuth 2.0 for Google APIs](https://developers.google.com/identity/protocols/oauth2)
- Spec existente: `025-google-ads-dashboard` (padrão de integração Google)
- Spec existente: `010-conexoes` (padrão de conexões OAuth)
