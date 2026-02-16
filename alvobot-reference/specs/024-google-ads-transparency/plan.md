# Implementation Plan: Google Ads Transparency

**Branch**: `024-google-ads-transparency` | **Date**: 2025-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/024-google-ads-transparency/spec.md`

## Summary

Implementar o visualizador de anúncios do Google Ads Transparency Center, substituindo a página atual de scraper genérico. A feature exibe anúncios coletados em um layout Masonry (estilo Pinterest), com filtros, paginação e modal de detalhes. Utiliza dados já existentes na tabela `google_ads_scraper`.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend React 19)
**Primary Dependencies**: React 19, TanStack Query v5, CSS Grid/Masonry, Supabase Client
**Storage**: Supabase PostgreSQL (tabelas `google_ads_scraper`, `google_ads_scraper_advertiser`)
**Testing**: Vitest (frontend)
**Target Platform**: Web (React SPA)
**Project Type**: Frontend-only (dados já existem, sem necessidade de backend adicional)
**Performance Goals**: Carregamento inicial < 2s, navegação entre páginas < 500ms
**Constraints**: Imagens externas (previewUrl do Google), paginação obrigatória
**Scale/Scope**: Milhares de anúncios, 20-50 por página

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Notes |
|-----------|--------|-------|
| No hardcoded data | ✅ Pass | Anunciantes, formatos e regiões vêm do banco |
| Design system compliance | ✅ Pass | Usa CSS variables e componentes existentes |
| Backend for external APIs | ✅ Pass | Dados já coletados, não há chamada externa |
| RLS for user data | ⚠️ N/A | Tabela é pública (anúncios são dados públicos) |
| Feature module pattern | ✅ Pass | Estrutura padrão em features/ |

## Project Structure

### Documentation (this feature)

```text
specs/024-google-ads-transparency/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Detailed task list
```

### Source Code (repository root)

```text
frontend/src/features/google-ads-transparency/
├── api/
│   ├── queries.ts           # useGoogleAds, useGoogleAdsAdvertisers
│   ├── mutations.ts         # useAddAdvertiser, useToggleAdvertiser
│   └── index.ts
├── components/
│   ├── AdCard/
│   │   ├── AdCard.tsx
│   │   └── AdCard.module.css
│   ├── AdDetailsModal/
│   │   ├── AdDetailsModal.tsx
│   │   └── AdDetailsModal.module.css
│   ├── MasonryGrid/
│   │   ├── MasonryGrid.tsx
│   │   └── MasonryGrid.module.css
│   ├── FilterBar/
│   │   ├── FilterBar.tsx
│   │   └── FilterBar.module.css
│   ├── AdvertiserManager/
│   │   ├── AdvertiserManager.tsx
│   │   └── AdvertiserManager.module.css
│   ├── Pagination/
│   │   ├── Pagination.tsx
│   │   └── Pagination.module.css
│   └── index.ts
├── pages/
│   ├── GoogleAdsTransparencyPage.tsx
│   └── GoogleAdsTransparencyPage.module.css
├── types/
│   └── index.ts
├── hooks/
│   └── useAdFilters.ts
└── index.ts
```

**Structure Decision**: Frontend-only feature. Dados já existem no Supabase, apenas precisamos de queries e UI.

## Complexity Tracking

> Nenhuma violação identificada. Implementação é straightforward com componentes existentes.

---

## Implementation Phases

### Phase 1: Foundation & Types

**Objetivo**: Criar estrutura base e tipos TypeScript

**Tasks**:
1. Criar diretórios e arquivos base
2. Definir tipos em `types/index.ts`
3. Criar query keys em `queryKeys.ts`
4. Adicionar rota em `router.tsx`

**Deliverables**:
- Feature module estruturado
- Types TypeScript completos
- Rota configurada

---

### Phase 2: Data Layer

**Objetivo**: Implementar queries do Supabase

**Tasks**:
1. `useGoogleAds` - Lista paginada de anúncios com filtros
2. `useGoogleAd` - Detalhes de um anúncio
3. `useGoogleAdsAdvertisers` - Lista de anunciantes
4. `useAddAdvertiser` - Adicionar anunciante
5. `useToggleAdvertiser` - Ativar/desativar monitoramento

**Deliverables**:
- Queries funcionais com paginação
- Filtros aplicados no servidor
- Mutations para gerenciamento

---

### Phase 3: Core Components

**Objetivo**: Implementar componentes principais

**Tasks**:
1. `MasonryGrid` - Grid responsivo estilo Pinterest
2. `AdCard` - Card individual do anúncio
3. `FilterBar` - Barra de busca e filtros
4. `Pagination` - Controles de paginação

**Deliverables**:
- Grid masonry funcional
- Cards responsivos
- Filtros e paginação

---

### Phase 4: Detail & Management

**Objetivo**: Modal de detalhes e gerenciamento de anunciantes

**Tasks**:
1. `AdDetailsModal` - Modal com todas as informações
2. Navegação entre variações do criativo
3. `AdvertiserManager` - Lista e gerenciamento de anunciantes
4. Modal para adicionar anunciante

**Deliverables**:
- Modal de detalhes completo
- Carousel de variações
- CRUD de anunciantes

---

### Phase 5: Page Integration

**Objetivo**: Montar página principal

**Tasks**:
1. `GoogleAdsTransparencyPage` - Composição dos componentes
2. Estado de filtros (URL params ou local)
3. Toggle de ordem aleatória
4. Empty states e loading states

**Deliverables**:
- Página completa e funcional
- Estados de UI corretos
- UX polida

---

### Phase 6: Polish & Responsiveness

**Objetivo**: Refinamentos finais

**Tasks**:
1. CSS responsivo (mobile-first)
2. Lazy loading de imagens
3. Debounce na busca
4. Testes manuais
5. Atualizar sidebar/menu

**Deliverables**:
- Feature pronta para produção
- Performance otimizada
- Navegação integrada

---

## Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Tabela google_ads_scraper | Dados de anúncios | ✅ Existe |
| Tabela google_ads_scraper_advertiser | Lista de anunciantes | ✅ Existe |
| Design System Components | UI base | ✅ Disponível |
| TanStack Query | Data fetching | ✅ Configurado |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Imagens externas quebradas | Fallback para placeholder |
| Performance com muitos anúncios | Paginação server-side, lazy loading |
| Layout masonry complexo | Usar CSS Grid com grid-auto-rows |
| Dados de variações inconsistentes | Parsing defensivo com fallbacks |

---

## Success Criteria

| Criteria | How Validated |
|----------|---------------|
| Grid masonry funcional | Visual testing em diferentes resoluções |
| Filtros funcionam | Teste manual com diferentes combinações |
| Paginação funciona | Navegação completa pelo dataset |
| Modal de detalhes | Todos os campos exibidos corretamente |
| Performance < 2s | Lighthouse/DevTools timing |
| Responsivo | Teste em mobile e tablet |

---

## Next Steps

1. Execute tasks do Phase 1 (Foundation)
2. Implementar phases sequencialmente
3. Testar cada phase antes de avançar
4. Atualizar menu lateral para nova rota
