# Implementation Plan: Smart Image Generation

**Branch**: `026-smart-image-generation` | **Date**: 2025-12-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/026-smart-image-generation/spec.md`

## Summary

Otimização do sistema de geração de imagens via chat para funcionar em 90% dos casos mesmo com prompts básicos. A feature implementa: (1) geração automática de múltiplas variações por solicitação (padrão: 2), (2) configuração global no painel admin para número de variações, (3) enriquecimento inteligente de prompts com contexto de marketing digital, (4) incorporação automática de assets visuais do projeto, e (5) entrega progressiva conforme cada variação completa.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, OpenRouter API (Backend); Next.js 14, React 18, Shadcn/UI (Frontend)
**Storage**: Supabase PostgreSQL (system_config table for global settings), Cloudflare R2 (images)
**Testing**: pytest, pytest-asyncio (Backend); Vitest, Testing Library (Frontend)
**Target Platform**: Web application (Docker-based deployment)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Geração de 2-3 variações em paralelo com tempo total < 60s, entrega progressiva via SSE
**Constraints**: Manter compatibilidade com sistema atual de geração de imagens, não degradar performance existente
**Scale/Scope**: Todos os usuários do sistema (configuração global), todos os projetos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-First Development | ✅ PASS | Feature é fundamentalmente AI-powered; streaming responses via SSE já implementado |
| II. API-First Architecture | ✅ PASS | Endpoints REST existentes serão estendidos; OpenAPI documentation mantida |
| III. User Experience Excellence | ✅ PASS | Entrega progressiva com indicadores de progresso; múltiplas variações para escolha |
| IV. Production-Ready Deployments | ✅ PASS | Usa stack Docker existente; sem novas dependências de infraestrutura |
| V. Data Integrity & Security | ✅ PASS | Usa system_config existente; sem novos dados sensíveis |
| VI. Scalability & Performance | ✅ PASS | Geração em paralelo; async operations; Redis caching disponível |
| VII. Testing & Quality Assurance | ✅ PASS | Testes existentes para image generation; novos testes para variações |

**Premium Visual Design Compliance**:
- Múltiplas imagens serão exibidas em grid responsivo para comparação
- Indicador de progresso customizado (não loader genérico)
- Animações suaves de entrada para cada variação completada

## Project Structure

### Documentation (this feature)

```text
specs/026-smart-image-generation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contracts.yaml
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   ├── chat.py              # Modificar: loop de geração de variações
│   ├── image_generation.py  # Modificar: suporte a múltiplas variações
│   └── admin.py             # Adicionar: endpoint config variações
├── services/
│   ├── prompt_enrichment_service.py  # Modificar: templates de marketing
│   └── visual_asset_service.py       # Revisar: incorporação de assets
├── tools.py                 # Modificar: generate_image_tool com variações
├── models.py                # Verificar: system_config já existe
└── tests/
    └── test_image_variations.py  # Novo: testes de variações

frontend/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   └── ImageVariationGrid.tsx  # Novo: grid de variações
│   │   └── admin/
│   │       └── ImageGenerationSettings.tsx  # Novo: config admin
│   ├── hooks/
│   │   └── useImageVariations.ts  # Novo: hook para estado de variações
│   └── app/
│       └── admin/
│           └── settings/  # Existente: adicionar seção
└── tests/
    └── components/
        └── ImageVariationGrid.test.tsx  # Novo
```

**Structure Decision**: Web application (Option 2) - usa estrutura existente backend/frontend. Modificações concentradas em routers/chat.py, tools.py (backend) e novos componentes de UI para grid de variações.

## Complexity Tracking

> No Constitution Check violations - no entries needed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| - | - | - |
