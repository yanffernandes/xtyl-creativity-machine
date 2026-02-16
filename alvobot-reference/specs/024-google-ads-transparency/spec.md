# Feature Specification: Google Ads Transparency - Visualizador de Anúncios

**Feature Branch**: `024-google-ads-transparency`
**Created**: 2025-01-13
**Status**: Planejado
**Input**: Replicar a página "Mineração Ads Transparency" do sistema legacy (WeWeb) para a nova versão React, mantendo as mesmas funcionalidades mas utilizando a nova identidade visual e componentes do design system.

## Visão Geral

O **Google Ads Transparency** é uma ferramenta que permite visualizar e explorar anúncios coletados do Google Ads Transparency Center. A página exibe os criativos de anunciantes monitorados em um layout tipo **Masonry/Pinterest**, onde cada card pode ter altura variável dependendo do conteúdo do anúncio.

### Principais Funcionalidades

1. **Visualização Masonry** - Grid estilo Pinterest com cards de altura variável
2. **Busca e Filtros** - Filtrar por anunciante, formato, região, data
3. **Paginação** - Navegação eficiente por grandes volumes de anúncios
4. **Ordem Aleatória** - Toggle para exibir anúncios em ordem aleatória
5. **Detalhes do Anúncio** - Modal com informações completas do criativo
6. **Gerenciamento de Anunciantes** - Adicionar/remover anunciantes monitorados

---

## Data Model

### Tabela: `google_ads_scraper`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `creativeId` | text (PK) | ID único do criativo no Google |
| `advertiserId` | text | ID do anunciante |
| `advertiserName` | text | Nome do anunciante |
| `creativeRegions` | text[] | Regiões onde o anúncio apareceu |
| `format` | text | Formato do anúncio (TEXT, IMAGE, VIDEO) |
| `lastShown` | timestamptz | Última vez que o anúncio foi exibido |
| `previewUrl` | text | URL da preview do anúncio |
| `regionStats` | jsonb | Estatísticas por região |
| `startUrl` | text | URL de destino inicial |
| `variations` | jsonb | Variações do criativo (contém clickUrl, imagens, textos) |
| `created_at` | timestamptz | Data de criação do registro |
| `updated_at` | timestamptz | Data de atualização |

### Tabela: `google_ads_scraper_advertiser`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `advertiserId` | text (PK) | ID do anunciante |
| `advertiserName` | text | Nome do anunciante |
| `active` | boolean | Se o anunciante está sendo monitorado |
| `last_scraped_at` | timestamptz | Última coleta de dados |
| `estimatedAds` | text | Quantidade estimada de anúncios |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Data de atualização |

### Views Disponíveis

- `vw_google_ads_scraper_summary` - Resumo agregado por anunciante
- `vw_google_ads_domain_summary` - Resumo agregado por domínio
- `vw_google_ads_url_summary` - Resumo agregado por URL de destino

---

## User Scenarios & Testing

### User Story 1 - Visualizar Anúncios em Grid Masonry (Priority: P1)

Como um profissional de marketing, quero visualizar os anúncios coletados em um layout estilo Pinterest, para que eu possa analisar os criativos dos concorrentes de forma visual e organizada.

**Why this priority**: Esta é a funcionalidade principal da página. O layout Masonry permite visualizar anúncios de diferentes tamanhos de forma eficiente.

**Acceptance Scenarios**:

1. **Given** a página carregada, **When** existem anúncios no banco, **Then** eles são exibidos em um grid Masonry responsivo com cards de altura variável.

2. **Given** um anúncio com imagem, **When** renderizado no card, **Then** a imagem é exibida com proporção original sem distorção.

3. **Given** um anúncio apenas de texto, **When** renderizado, **Then** o card exibe headline e descrição com altura adequada ao conteúdo.

4. **Given** a página em tela pequena (mobile), **When** visualizada, **Then** o grid ajusta para 1-2 colunas mantendo a legibilidade.

---

### User Story 2 - Buscar e Filtrar Anúncios (Priority: P1)

Como um analista de mercado, quero filtrar anúncios por anunciante, formato ou região, para que eu possa focar na análise de segmentos específicos.

**Why this priority**: Com milhares de anúncios, filtros são essenciais para encontrar informações relevantes.

**Acceptance Scenarios**:

1. **Given** o campo de busca, **When** digito o nome de um anunciante, **Then** apenas anúncios desse anunciante são exibidos.

2. **Given** o filtro de formato, **When** seleciono "IMAGE", **Then** apenas anúncios com imagens são exibidos.

3. **Given** múltiplos filtros ativos, **When** aplico busca + formato, **Then** os filtros são combinados (AND).

4. **Given** filtros ativos, **When** clico em "Limpar filtros", **Then** todos os filtros são resetados e todos os anúncios são exibidos.

---

### User Story 3 - Paginar Resultados (Priority: P1)

Como um usuário, quero navegar pelos anúncios em páginas, para que a página carregue rapidamente mesmo com muitos registros.

**Why this priority**: Performance é crítica para UX com grandes volumes de dados.

**Acceptance Scenarios**:

1. **Given** mais de 20 anúncios, **When** a página carrega, **Then** apenas os primeiros 20 são exibidos com controles de paginação.

2. **Given** na página 1, **When** clico em "Próxima", **Then** a página 2 é carregada com os próximos 20 anúncios.

3. **Given** o seletor de itens por página, **When** altero para 50, **Then** 50 anúncios são exibidos por página.

4. **Given** a última página, **When** visualizo, **Then** o botão "Próxima" está desabilitado.

---

### User Story 4 - Ver Detalhes do Anúncio (Priority: P2)

Como um analista, quero ver detalhes completos de um anúncio, para que eu possa analisar todas as variações e informações do criativo.

**Why this priority**: Detalhes são importantes mas a visualização em grid já fornece informações básicas.

**Acceptance Scenarios**:

1. **Given** um card de anúncio, **When** clico nele, **Then** um modal abre com detalhes completos.

2. **Given** o modal de detalhes, **When** visualizo, **Then** vejo: preview do anúncio, todas as variações, URLs de destino, regiões, datas.

3. **Given** um anúncio com múltiplas variações, **When** abro o modal, **Then** posso navegar entre as variações (carousel ou tabs).

4. **Given** o modal aberto, **When** clico na URL de destino, **Then** ela abre em nova aba.

---

### User Story 5 - Alternar Ordem Aleatória (Priority: P2)

Como um usuário explorando anúncios, quero ver os anúncios em ordem aleatória, para descobrir criativos que eu não veria na ordenação padrão.

**Why this priority**: Feature de descoberta, não essencial mas útil para exploração.

**Acceptance Scenarios**:

1. **Given** o toggle de ordem aleatória, **When** ativo, **Then** os anúncios são exibidos em ordem randômica.

2. **Given** ordem aleatória ativa, **When** mudo de página, **Then** a próxima página também é aleatória.

3. **Given** ordem aleatória ativa, **When** desativo, **Then** volta para ordenação por data (mais recentes primeiro).

---

### User Story 6 - Gerenciar Anunciantes Monitorados (Priority: P2)

Como um administrador, quero adicionar ou remover anunciantes da lista de monitoramento, para controlar quais concorrentes são rastreados.

**Why this priority**: Configuração secundária, não é o uso diário da ferramenta.

**Acceptance Scenarios**:

1. **Given** a lista de anunciantes, **When** clico em "Adicionar anunciante", **Then** um modal permite inserir ID do anunciante do Google.

2. **Given** um anunciante ativo, **When** desativo o monitoramento, **Then** novos anúncios não são mais coletados.

3. **Given** a lista de anunciantes, **When** visualizo, **Then** vejo: nome, ID, qtd de anúncios, última coleta, status.

---

## UI/UX Design

### Layout Principal

```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Google Ads Transparency          [+ Adicionar Anunciante]││
│  │ Explore anúncios coletados do Google Ads                ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Filtros                                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────┐│
│  │ 🔍 Buscar... │ │ Anunciante ▼ │ │ Formato    ▼ │ │ 🔀  ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────┘│
├─────────────────────────────────────────────────────────────┤
│  Grid Masonry                                               │
│  ┌─────────┐ ┌───────────────┐ ┌─────────┐ ┌──────────┐    │
│  │         │ │               │ │         │ │          │    │
│  │  Card   │ │    Card       │ │  Card   │ │   Card   │    │
│  │  (img)  │ │    (tall)     │ │  (text) │ │   (img)  │    │
│  │         │ │               │ │         │ │          │    │
│  └─────────┘ │               │ └─────────┘ └──────────┘    │
│  ┌──────────┐│               │ ┌───────────────┐           │
│  │   Card   │└───────────────┘ │     Card      │           │
│  │   (img)  │ ┌─────────┐      │     (wide)    │           │
│  └──────────┘ │  Card   │      └───────────────┘           │
│               │  (text) │                                   │
│               └─────────┘                                   │
├─────────────────────────────────────────────────────────────┤
│  Paginação                                                  │
│  Mostrando 1-20 de 1.234    [◀] [1] [2] [3] ... [62] [▶]   │
│                                  Itens por página: [20 ▼]   │
└─────────────────────────────────────────────────────────────┘
```

### Card de Anúncio (Masonry)

```
┌─────────────────────────────┐
│  ┌───────────────────────┐  │
│  │                       │  │
│  │      Preview          │  │  ← Imagem com aspect ratio original
│  │      (imagem)         │  │
│  │                       │  │
│  └───────────────────────┘  │
│                             │
│  Headline do Anúncio        │  ← Título principal
│                             │
│  Descrição do anúncio que   │  ← Descrição (truncada se muito longa)
│  pode ter múltiplas linhas  │
│                             │
│  ┌───────────┐ ┌──────────┐ │
│  │ 🏢 Empresa│ │ 📍 BR    │ │  ← Tags: anunciante, região
│  └───────────┘ └──────────┘ │
│                             │
│  🔗 exemplo.com   📅 Jan 10 │  ← URL destino, data
└─────────────────────────────┘
```

### Card de Anúncio - Apenas Texto

```
┌─────────────────────────────┐
│  TEXT                       │  ← Badge indicando formato
│                             │
│  Headline do Anúncio        │
│                             │
│  Descrição completa do      │
│  anúncio de texto que pode  │
│  ter várias linhas...       │
│                             │
│  ┌───────────┐ ┌──────────┐ │
│  │ 🏢 Empresa│ │ 📍 BR    │ │
│  └───────────┘ └──────────┘ │
│                             │
│  🔗 exemplo.com   📅 Jan 10 │
└─────────────────────────────┘
```

### Modal de Detalhes

```
┌─────────────────────────────────────────────────────────────┐
│  Detalhes do Anúncio                                    [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │                    Preview Grande                     │  │
│  │                                                       │  │
│  │          [◀]                              [▶]         │  │  ← Navegação entre variações
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Variação 1 de 3         [●] [○] [○]                        │
│                                                             │
│  ┌─────────────────────────┐ ┌────────────────────────────┐ │
│  │ Anunciante              │ │ Formato                    │ │
│  │ Nome da Empresa         │ │ IMAGE                      │ │
│  └─────────────────────────┘ └────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────┐ ┌────────────────────────────┐ │
│  │ Regiões                 │ │ Última Exibição            │ │
│  │ BR, US, PT              │ │ 10 de Janeiro, 2025        │ │
│  └─────────────────────────┘ └────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ URL de Destino                                       │   │
│  │ https://exemplo.com/landing-page?utm_source=google   │   │  ← Clicável
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│                                        [Fechar]             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementação Técnica

### Estrutura de Arquivos

```
frontend/src/features/google-ads-transparency/
├── api/
│   ├── queries.ts              # useGoogleAds, useGoogleAdsAdvertisers
│   ├── mutations.ts            # useAddAdvertiser, useToggleAdvertiser
│   └── index.ts
├── components/
│   ├── AdCard/
│   │   ├── AdCard.tsx          # Card individual do anúncio
│   │   └── AdCard.module.css
│   ├── AdDetailsModal/
│   │   ├── AdDetailsModal.tsx  # Modal de detalhes
│   │   └── AdDetailsModal.module.css
│   ├── MasonryGrid/
│   │   ├── MasonryGrid.tsx     # Grid estilo Pinterest
│   │   └── MasonryGrid.module.css
│   ├── FilterBar/
│   │   ├── FilterBar.tsx       # Barra de filtros
│   │   └── FilterBar.module.css
│   ├── AdvertiserManager/
│   │   ├── AdvertiserManager.tsx  # Gerenciamento de anunciantes
│   │   └── AdvertiserManager.module.css
│   └── index.ts
├── pages/
│   ├── GoogleAdsTransparencyPage.tsx
│   └── GoogleAdsTransparencyPage.module.css
├── types/
│   └── index.ts                # GoogleAd, GoogleAdsAdvertiser, etc.
├── hooks/
│   └── useMasonryLayout.ts     # Hook para cálculo do layout masonry
└── utils/
    └── adHelpers.ts            # Funções auxiliares (parse variations, etc.)
```

### Componente Masonry

Para o layout estilo Pinterest, utilizaremos CSS Grid com `grid-auto-rows` e `row-span` dinâmico, ou uma biblioteca como `react-masonry-css` para melhor performance.

```tsx
// Exemplo de implementação com CSS Grid
.masonryGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  grid-auto-rows: 10px;
  gap: var(--space-4);
}

.card {
  /* grid-row-end calculado dinamicamente baseado na altura do conteúdo */
}
```

### Tipos TypeScript

```typescript
interface GoogleAd {
  creativeId: string
  advertiserId: string
  advertiserName: string
  creativeRegions: string[]
  format: 'TEXT' | 'IMAGE' | 'VIDEO'
  lastShown: string
  previewUrl: string | null
  regionStats: Record<string, unknown>
  startUrl: string | null
  variations: AdVariation[]
  created_at: string
  updated_at: string | null
}

interface AdVariation {
  clickUrl?: string
  headline?: string
  description?: string
  imageUrl?: string
  // outros campos conforme necessário
}

interface GoogleAdsAdvertiser {
  advertiserId: string
  advertiserName: string
  active: boolean
  last_scraped_at: string | null
  estimatedAds: string | null
  created_at: string
  updated_at: string | null
}

interface GoogleAdsFilters {
  search: string
  advertiserId: string | null
  format: string | null
  region: string | null
  isRandomOrder: boolean
}
```

### Query Keys

```typescript
// Em @/shared/utils/queryKeys.ts
googleAdsTransparency: {
  all: ['google-ads-transparency'] as const,
  list: (filters: GoogleAdsFilters, page: number, limit: number) =>
    [...queryKeys.googleAdsTransparency.all, 'list', filters, page, limit] as const,
  detail: (creativeId: string) =>
    [...queryKeys.googleAdsTransparency.all, 'detail', creativeId] as const,
  advertisers: () =>
    [...queryKeys.googleAdsTransparency.all, 'advertisers'] as const,
}
```

---

## Considerações de Performance

1. **Paginação Server-Side** - Nunca carregar todos os anúncios de uma vez
2. **Lazy Loading de Imagens** - Usar `loading="lazy"` nas imagens
3. **Virtualização** - Considerar react-virtual para listas muito longas
4. **Debounce na Busca** - Aguardar 300ms antes de disparar a query
5. **Cache de Imagens** - Aproveitar cache do browser para previews

---

## Responsividade

| Breakpoint | Colunas | Comportamento |
|------------|---------|---------------|
| Desktop (>1200px) | 4-5 colunas | Grid completo |
| Tablet (768-1200px) | 3 colunas | Filtros em linha |
| Mobile (<768px) | 1-2 colunas | Filtros em dropdown/modal |

---

## Dependências

- **react-masonry-css** ou implementação custom com CSS Grid
- Componentes existentes do Design System (Button, Input, Select, Modal, Card, Spinner)
- TanStack Query para data fetching
- Supabase client para acesso ao banco

---

## Fora de Escopo

1. **Scraping automático** - A coleta de dados é feita por processo externo
2. **Exportação de dados** - Pode ser adicionado em versão futura
3. **Análise competitiva** - Dashboards e insights são features separadas
4. **Notificações** - Alertas sobre novos anúncios são feature separada

---

## Migração

Esta feature substitui a página `/scraper` atual, que era um scraper genérico de websites. A nova página foca especificamente em Google Ads Transparency.

A rota será atualizada de `/scraper` para `/google-ads-transparency` ou mantida em `/scraper` com redirecionamento.
