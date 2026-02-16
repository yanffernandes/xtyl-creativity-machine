# Implementation Plan: AlvoADS Meta

**Branch**: `019-alvoads-meta` | **Date**: 2025-12-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-alvoads-meta/spec.md`

## Summary

Implementar o AlvoADS Meta, uma feature para criação automatizada de campanhas Facebook/Instagram Ads. A feature utiliza a estrutura de wizard do AlvoADS Google como referência, com adaptações para a API Meta Marketing v21.0. Suporta dois modos de criativos: Google Drive (imagens próprias) e Geração por IA (DALL-E 3).

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend & Backend)
**Primary Dependencies**: React 18, TanStack Query v5, Zustand, NestJS 10, Meta Marketing API v21.0
**Storage**: Supabase PostgreSQL (tabela `campaign_templates` existente)
**Testing**: Vitest (frontend), Jest (backend)
**Target Platform**: Web (React SPA + NestJS API)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Criação de campanha < 10 minutos, publicação < 30 segundos
**Constraints**: Limites da Meta API (rate limits), orçamento mínimo R$6/dia
**Scale/Scope**: Até 100 variações de campanha por publicação

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| No hardcoded data | ✅ Pass | Países/idiomas buscados da API Meta |
| Design system compliance | ✅ Pass | Reutiliza CSS variables e componentes existentes |
| Backend for external APIs | ✅ Pass | Meta API chamada via backend |
| RLS for user data | ✅ Pass | Tabela `campaign_templates` já tem RLS |
| Feature module pattern | ✅ Pass | Estrutura idêntica ao AlvoADS Google |

## Project Structure

### Documentation (this feature)

```text
specs/019-alvoads-meta/
├── plan.md              # This file
├── research.md          # Phase 0 output - technology decisions
├── data-model.md        # Phase 1 output - entity definitions
├── quickstart.md        # Phase 1 output - implementation guide
├── contracts/
│   └── api.yaml         # OpenAPI specification
└── checklists/
    └── requirements.md  # Spec quality validation
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── meta/
│           ├── meta.module.ts           # (existing)
│           ├── meta.controller.ts       # (existing)
│           ├── meta.service.ts          # (existing)
│           ├── campaign.controller.ts   # (modify - add endpoints)
│           ├── services/
│           │   ├── campaign.service.ts  # (modify - add publish flow)
│           │   ├── targeting.service.ts # (new - countries/languages)
│           │   └── drive.service.ts     # (new - Google Drive)
│           └── dto/
│               └── meta-campaign.dto.ts # (new - Meta-specific DTOs)

frontend/
├── src/
│   └── features/
│       └── alvoads-meta/
│           ├── api/
│           │   ├── queries.ts           # TanStack Query hooks
│           │   ├── mutations.ts         # Mutations
│           │   └── index.ts
│           ├── components/
│           │   ├── WizardStepper.tsx    # (reuse from google)
│           │   ├── StepNavigation.tsx   # (reuse from google)
│           │   ├── PublishProgress.tsx
│           │   ├── steps/
│           │   │   ├── StepAccount.tsx
│           │   │   ├── StepPage.tsx
│           │   │   ├── StepInstagram.tsx
│           │   │   ├── StepObjective.tsx
│           │   │   ├── StepTargeting.tsx
│           │   │   ├── StepBudget.tsx
│           │   │   ├── StepCreative.tsx
│           │   │   ├── StepAdCopy.tsx
│           │   │   ├── StepReview.tsx
│           │   │   └── index.ts
│           │   └── index.ts
│           ├── pages/
│           │   ├── AlvoAdsMetaPage.tsx
│           │   ├── AlvoAdsMetaPage.module.css
│           │   ├── MetaAdsWizardPage.tsx
│           │   ├── MetaAdsWizardPage.module.css
│           │   └── index.ts
│           ├── stores/
│           │   └── metaAdsWizardStore.ts
│           ├── types/
│           │   ├── campaign.ts
│           │   └── index.ts
│           ├── utils/
│           │   └── validation.ts
│           └── index.ts
```

**Structure Decision**: Web application structure reutilizando padrões do AlvoADS Google. Feature module completo com types, store, api, components, pages.

## Complexity Tracking

> Nenhuma violação identificada. Implementação segue padrões existentes.

---

## Implementation Phases

### Phase 1: Frontend Foundation

**Objetivo**: Criar estrutura base da feature

**Tasks**:
1. Criar diretórios e arquivos base
2. Definir types em `types/campaign.ts`
3. Criar Zustand store `metaAdsWizardStore.ts`
4. Criar página `AlvoAdsMetaPage.tsx` (dashboard)
5. Adicionar rotas em `router.tsx`

**Deliverables**:
- Feature module estruturado
- Types TypeScript completos
- Store Zustand funcional
- Página de listagem básica

---

### Phase 2: Wizard Steps

**Objetivo**: Implementar os 9 steps do wizard

**Tasks**:
1. `StepAccount` - Seleção de conta de anúncios
2. `StepPage` - Seleção de página Facebook
3. `StepInstagram` - Configuração Instagram
4. `StepObjective` - Seleção de objetivo
5. `StepTargeting` - Segmentação (idade, gênero, país, idioma)
6. `StepBudget` - Orçamento e lances
7. `StepCreative` - Criativos (Drive + IA)
8. `StepAdCopy` - Textos do anúncio
9. `StepReview` - Revisão final
10. `MetaAdsWizardPage` - Orquestrador do wizard

**Deliverables**:
- 9 componentes de step
- Wizard page funcional
- Navegação entre steps

---

### Phase 3: Backend Endpoints

**Objetivo**: Criar endpoints REST para dados e targeting

**Tasks**:
1. Endpoint `GET /meta/campaigns/accounts/:connectionId`
2. Endpoint `GET /meta/campaigns/pages/:connectionId`
3. Endpoint `GET /meta/campaigns/instagram/:pageId`
4. Endpoint `GET /meta/campaigns/pixels/:adAccountId`
5. Endpoint `GET /meta/targeting/countries`
6. Endpoint `GET /meta/targeting/languages`
7. Endpoint `GET /meta/campaigns/drive-files`
8. Integrar DTOs e validações

**Deliverables**:
- Controller com novos endpoints
- Services para targeting e Drive
- DTOs validados

---

### Phase 4: Template Management

**Objetivo**: CRUD de templates de campanha

**Tasks**:
1. Endpoint `POST /meta/campaigns/templates` (save)
2. Endpoint `GET /meta/campaigns/templates` (list)
3. Endpoint `GET /meta/campaigns/templates/:id` (get)
4. Endpoint `DELETE /meta/campaigns/templates/:id` (delete)
5. TanStack Query hooks no frontend
6. Integrar com store Zustand

**Deliverables**:
- CRUD completo de templates
- Queries e mutations funcionais
- Persistência no Supabase

---

### Phase 5: Publishing Flow

**Objetivo**: Implementar publicação no Meta Ads

**Tasks**:
1. Endpoint `POST /meta/campaigns/:id/publish`
2. Criar Campaign no Meta API
3. Criar AdSet no Meta API
4. Upload de imagens (hash)
5. Criar AdCreative no Meta API
6. Criar Ad no Meta API
7. Atualizar template com platform_ids
8. Componente `PublishProgress` no frontend
9. Consumo de créditos

**Deliverables**:
- Fluxo de publicação completo
- Feedback visual de progresso
- Tratamento de erros

---

### Phase 6: AI & Drive Integration

**Objetivo**: Integrar geração de imagens e Google Drive

**Tasks**:
1. Endpoint `POST /meta/campaigns/ai/image` (DALL-E)
2. Preview de imagem gerada
3. Approve/reject flow
4. Parsear URL do Google Drive
5. Listar arquivos da pasta pública
6. Validação de formatos (JPG, PNG)
7. UI para seleção de imagens

**Deliverables**:
- Geração de imagens funcional
- Integração Google Drive funcional
- UX de seleção de criativos

---

### Phase 7: Polish & Testing

**Objetivo**: Refinamentos finais e testes

**Tasks**:
1. CSS responsivo para todos os steps
2. Validações inline com mensagens claras
3. Tratamento de token expirado
4. Testes manuais com cada objetivo
5. Verificação no Meta Ads Manager
6. Documentação de uso

**Deliverables**:
- Feature pronta para produção
- Testes validados
- Documentação atualizada

---

## Dependencies

| Dependency | Purpose | Status |
|------------|---------|--------|
| Meta OAuth (spec 010) | Autenticação | ✅ Implementado |
| campaign_templates table | Persistência | ✅ Existe |
| AiCreativeService | Geração de imagens | ✅ Existe |
| CreditsService | Consumo de créditos | ✅ Existe |
| AlvoADS Google | Referência de padrões | ✅ Implementado |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Meta API rate limits | Exponential backoff, retry logic |
| Token expiration | Validate before publish, refresh flow |
| Large images | Client-side compression, size limits |
| Drive folder private | Clear error message, instructions |
| Pixel not configured | Block objectives that require it |

---

## Success Criteria Mapping

| Spec Criteria | How Validated |
|--------------|---------------|
| SC-001: < 10 min creation | Timed user testing |
| SC-002: 95% publish success | Monitoring logs |
| SC-003: 80% first-attempt complete | Analytics tracking |
| SC-004: 70% AI image approval | Usage metrics |
| SC-005: 100 variations | Load testing |
| SC-006: 4+ satisfaction | User feedback |
| SC-007: 60% time reduction | Comparative testing |

---

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| research.md | `specs/019-alvoads-meta/research.md` | Technology decisions |
| data-model.md | `specs/019-alvoads-meta/data-model.md` | Entity definitions |
| api.yaml | `specs/019-alvoads-meta/contracts/api.yaml` | OpenAPI spec |
| quickstart.md | `specs/019-alvoads-meta/quickstart.md` | Implementation guide |

---

## Next Steps

1. Execute `/speckit.tasks` to generate detailed task list
2. Start with Phase 1 (Foundation)
3. Implement phases sequentially
4. Run `/speckit.analyze` after completion for quality check
