# Implementation Plan: V1 Polish

**Branch**: `016-v1-polish` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-v1-polish/spec.md`

## Summary

Esta feature implementa 4 melhorias críticas para a V1:
1. **Ações de imagens anexadas**: Adicionar botões de visualizar, excluir permanentemente e desanexar em `DocumentAttachments.tsx`
2. **Nova Criação instantânea**: Otimizar fluxo de criação com navegação instantânea e criação em background
3. **Qualidade do refining**: Corrigir degradação usando sempre a imagem original como base (não a refinada)
4. **Gerador de prompts intermediário**: Criar serviço para enriquecer prompts de imagem com contexto de marca via modelo configurável no admin

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI, Framer Motion
**Storage**: Supabase PostgreSQL, Cloudflare R2 (images)
**Testing**: pytest (backend), manual testing (frontend)
**Target Platform**: Web application (Docker/Easypanel)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Feedback visual <200ms para "Nova Criação", operações de imagem <3s
**Constraints**: Zero travamentos >2s, manter compatibilidade com admin panel existente
**Scale/Scope**: Aplicação existente com ~15 features, 4 melhorias nesta feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ Pass | Gerador de prompts usa modelo configurável, integra com contexto de marca |
| II. API-First Architecture | ✅ Pass | Novos endpoints REST seguem padrão existente |
| III. User Experience Excellence | ✅ Pass | Feedback <200ms, loading states, confirmação para exclusão |
| IV. Production-Ready | ✅ Pass | Usa estrutura Docker existente |
| V. Data Integrity | ✅ Pass | Confirmação antes de exclusão, preserva imagem original |
| VI. Scalability | ✅ Pass | Criação em background, otimistic UI |
| VII. Testing | ⚠️ Partial | Testes manuais definidos na spec |

## Project Structure

### Documentation (this feature)

```text
specs/016-v1-polish/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   ├── documents.py         # Modificar: adicionar endpoint de exclusão permanente
│   ├── image_generation.py  # Modificar: corrigir refining para usar original
│   └── admin.py             # Modificar: adicionar config de modelo de prompt
├── services/
│   ├── prompt_enrichment_service.py  # NOVO: serviço de enriquecimento de prompts
│   └── model_config_service.py       # Modificar: adicionar tipo "prompt_enrichment"
├── tools.py                 # Modificar: integrar prompt enrichment no generate_image
└── schemas.py               # Modificar: adicionar schemas para prompt enrichment

frontend/
├── src/
│   ├── components/
│   │   ├── document/
│   │   │   └── DocumentAttachments.tsx  # Modificar: adicionar ações view/delete/detach
│   │   └── ui/
│   │       └── ImageLightbox.tsx        # NOVO: componente lightbox com zoom
│   ├── app/
│   │   └── workspace/[id]/project/[projectId]/
│   │       └── page.tsx                 # Modificar: otimizar "Nova Criação"
│   └── lib/
│       └── api.ts                       # Modificar: adicionar endpoints
```

**Structure Decision**: Web application existente com frontend Next.js e backend FastAPI. Modificações pontuais em componentes existentes + novos serviços.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | Nenhuma violação | - |

---

## Constitution Check (Post-Design)

*Re-avaliação após Phase 1 design completado.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ Pass | Serviço `PromptEnrichmentService` usa modelo configurável via admin |
| II. API-First Architecture | ✅ Pass | Contratos OpenAPI definidos em `contracts/api-contracts.yaml` |
| III. User Experience Excellence | ✅ Pass | Lightbox com zoom, confirmação para exclusão, navegação otimista |
| IV. Production-Ready | ✅ Pass | Migração SQL versionada, usa estrutura existente |
| V. Data Integrity | ✅ Pass | `original_image_id` preserva referência, confirmação antes de exclusão |
| VI. Scalability | ✅ Pass | Cache de modelo (60s TTL), criação assíncrona |
| VII. Testing | ⚠️ Partial | Quickstart com cenários de teste manual, sem testes automatizados |

**All gates passed. Ready for `/speckit.tasks`.**
