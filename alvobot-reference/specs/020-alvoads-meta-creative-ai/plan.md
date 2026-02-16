# Implementation Plan: AlvoADS Meta - Geracao Automatizada de Criativos por IA

**Branch**: `020-alvoads-meta-creative-ai` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-alvoads-meta-creative-ai/spec.md`

## Summary

Automatizar a geração de criativos (imagens + textos) no wizard do AlvoADS Meta usando IA. O sistema gerará prompts de imagem automaticamente baseados no contexto do artigo, permitirá escolha entre DALL-E e Gemini, exibirá imagens em grid para aprovação, gerará textos de anúncio para cada imagem aprovada, e salvará criativos em biblioteca para reutilização.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend React 19, Backend NestJS 10)
**Primary Dependencies**:
- Frontend: React 19, TanStack Query 5, Zustand 5, React Hook Form + Zod
- Backend: NestJS 10, OpenAI SDK 4.x, Supabase JS 2.x
**Storage**: PostgreSQL (Supabase), Supabase Storage para imagens
**Testing**: Jest (backend), não especificado para frontend
**Target Platform**: Web (SPA + API)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Geração de imagem < 30s, conjunto completo de criativos < 5 min para 20 imagens
**Constraints**: Limite de caracteres Meta (primary_text: 125, headline: 27, description: 27)
**Scale/Scope**: ~5-20 imagens por campanha, biblioteca de criativos persistente

## Constitution Check

*GATE: Projeto não possui constitution.md configurado (template vazio). Seguindo padrões existentes do projeto.*

**Padrões identificados no projeto:**
1. ✅ Feature modules em `frontend/src/features/`
2. ✅ Backend modules em `backend/src/modules/`
3. ✅ Supabase para storage e database
4. ✅ System prompts configuráveis no banco de dados
5. ✅ Credits system para operações pagas

## Project Structure

### Documentation (this feature)

```text
specs/020-alvoads-meta-creative-ai/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── creative-api.yaml
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── meta/
│           ├── services/
│           │   ├── ai-creative.service.ts     # MODIFY: Add Gemini, image prompt generation
│           │   ├── credits.service.ts         # EXISTS: Credit consumption
│           │   └── creative-library.service.ts # NEW: Library management
│           ├── dto/
│           │   ├── generate-image.dto.ts      # NEW
│           │   └── creative-library.dto.ts    # NEW
│           └── creative.controller.ts         # NEW: Creative endpoints
└── tests/
    └── modules/meta/
        └── creative.service.spec.ts           # NEW

frontend/
├── src/
│   └── features/
│       └── alvoads-meta/
│           ├── components/
│           │   └── wizard/
│           │       ├── StepCreatives.tsx          # NEW: Image generation step
│           │       ├── StepCreatives.module.css   # NEW
│           │       ├── CreativeGrid.tsx           # NEW: Approval grid
│           │       ├── CreativeCard.tsx           # NEW: Single creative card
│           │       ├── CreativeLibraryModal.tsx   # NEW: Library browser
│           │       ├── StepAdCopy.tsx             # NEW: Text generation step
│           │       └── AdPreview.tsx              # NEW: Preview component
│           ├── api/
│           │   └── useCreatives.ts                # NEW: Creative hooks
│           ├── stores/
│           │   └── metaAdsWizardStore.ts          # MODIFY: Add creatives state
│           └── types/
│               └── creative.ts                    # NEW: Creative types

supabase/
├── migrations/
│   └── 20260102_creative_library.sql              # NEW: Library table
└── seeds/
    └── system_prompts_image_generator.sql         # NEW: Image prompt
```

**Structure Decision**: Extensão do módulo existente `meta` no backend e feature `alvoads-meta` no frontend, seguindo padrões estabelecidos no projeto.

## Complexity Tracking

| Aspecto | Decisão | Justificativa |
|---------|---------|---------------|
| Múltiplos modelos (DALL-E + Gemini) | Abstração simples | Interface comum, fallback automático |
| Biblioteca de Criativos | Nova tabela | Reutilização reduz custos de créditos |
| Variação de estilos | Prompt engineering | Sem complexidade adicional de código |
