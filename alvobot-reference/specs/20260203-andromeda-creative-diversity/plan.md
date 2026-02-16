# Implementation Plan: Andromeda Creative Diversity System

**Branch**: `20260203-andromeda-creative-diversity` | **Date**: 2026-02-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/20260203-andromeda-creative-diversity/spec.md`

## Summary

Update the Meta Ads creative generation module with an Andromeda-compliant diversification system that generates visually DISTINCT creatives for the same campaign, avoiding algorithm penalties. The system will:

1. **Rotate between AI models** (Nano Banana Pro + GPT Image 1.5 via Replicate, optional Gemini 3 Pro via OpenRouter) for visual diversity
2. **Offer two generation modes**: Preset (user selects concepts + quantities) and Free (AI decides)
3. **Support 8 universal creative concepts** for generic niches
4. **Support 28 specialized financial concepts** organized in 5 categories + 8 visual groups
5. **Preserve existing "Direcionamentos"** functionality with clear priority order
6. **Use targeting info** (countries, languages) for localization
7. **Enforce OpenRouter quotas + logging** per constitution (rate-limit handling + observability)

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**:
- Frontend: React 18+, Vite, TanStack Query v5, Zustand, CSS Modules
- Backend: NestJS 10.x, Passport JWT, OpenRouter SDK, Replicate API
**Storage**: Supabase PostgreSQL with RLS
**Testing**: Manual testing (visual verification of diversity), unit tests for prompt generation
**Target Platform**: Web application (SPA + API)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Image generation <30s per image, UI response <100ms
**Constraints**:
- 5 credits per image (existing system)
- OpenRouter rate limits
- Respect Andromeda algorithm (no similar visuals)
- Enforce quota handling (throttle + backoff) per constitution
**Scale/Scope**: ~10-20 creatives per campaign, multiple concurrent users per workspace

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Segurança de Dados e Segredos** | ✅ PASS | OpenRouter API keys stay in backend; frontend only triggers generation via API |
| **II. Dados Dinâmicos (Sem Hardcode)** | ✅ PASS | Concepts and templates stored in Supabase tables, not hardcoded |
| **III. Separação Frontend/Backend** | ✅ PASS | Frontend handles UI/mode selection; Backend handles AI generation and prompt composition |
| **IV. Observabilidade Básica** | ✅ PASS | Log each generation with model used, concept, success/error, timestamps |
| **V. Simplicidade Operacional** | ✅ PASS | Reuse existing OpenRouter integration; extend existing `ai-creative.service.ts` |

**TypeScript strict**: Required in both frontend and backend
**NestJS for external integrations**: OpenRouter calls handled in backend
**Supabase with RLS**: Creative concepts, templates, generation history, and background palette protected by RLS

## Project Structure

### Documentation (this feature)

```text
specs/20260203-andromeda-creative-diversity/
├── plan.md              # This file
├── research.md          # Phase 0 output - unknowns resolved
├── data-model.md        # Phase 1 output - database schema
├── quickstart.md        # Phase 1 output - developer onboarding
├── contracts/           # Phase 1 output - API contracts
│   ├── generate-creatives.contract.ts
│   ├── get-concepts.contract.ts
│   └── detect-niche.contract.ts
├── prompt_finance.md    # Existing - financial prompt template
└── tasks.md             # Phase 2 output - implementation tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   └── meta/
│   │       ├── services/
│   │       │   ├── ai-creative.service.ts      # MODIFY - add model rotation, concept-based prompts
│   │       │   ├── prompt-composer.service.ts  # CREATE - compose prompts from components
│   │       │   └── niche-detector.service.ts   # CREATE - detect niche from content
│   │       ├── dto/
│   │       │   └── generate-creative.dto.ts    # MODIFY - add mode, concepts
│   │       └── controllers/
│   │           └── creative.controller.ts       # MODIFY - new endpoints
│   └── common/
│       └── supabase/
│           └── supabase.service.ts              # Existing - reuse
└── tests/
    └── unit/
        └── meta/
            ├── prompt-composer.spec.ts
            └── niche-detector.spec.ts

frontend/
├── src/
│   ├── features/
│   │   └── alvoads-meta/
│   │       ├── components/
│   │       │   └── wizard/
│   │       │       ├── StepCreatives.tsx           # MODIFY - add mode selector, concept picker
│   │       │       ├── ConceptSelector.tsx         # CREATE - concept selection UI
│   │       │       ├── DiversityPreview.tsx        # CREATE - diversity score display
│   │       │       └── ModeToggle.tsx              # CREATE - Preset/Free toggle
│   │       ├── api/
│   │       │   ├── useCreatives.ts                 # MODIFY - add mode, concepts params
│   │       │   └── useConcepts.ts                  # CREATE - fetch concepts
│   │       ├── stores/
│   │       │   └── metaAdsWizardStore.ts           # MODIFY - add generation mode, selections
│   │       └── types/
│   │           └── creative.ts                      # MODIFY - add concept types
│   └── shared/
│       └── components/
│           └── index.ts
└── tests/
    └── unit/
        └── alvoads-meta/
            └── concept-selector.spec.ts

supabase/
└── migrations/
    ├── YYYYMMDD_creative_concepts.sql      # CREATE - concepts table
    ├── YYYYMMDD_visual_groups.sql          # CREATE - visual groups table
    ├── YYYYMMDD_niche_templates.sql        # CREATE - niche templates table
    └── YYYYMMDD_generation_sessions.sql    # CREATE - session tracking
    ├── YYYYMMDD_creative_backgrounds.sql   # CREATE - background palette table
    └── YYYYMMDD_seed_backgrounds.sql       # CREATE - seed Andromeda-safe palette
```

**Structure Decision**: Web application structure (frontend + backend) - extends existing alvoads-meta feature module.

## Complexity Tracking

> No constitution violations requiring justification.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Single module extension | Extend `meta` module | Reuse existing OpenRouter integration and creative generation flow |
| Database tables | 4 new tables | Required for dynamic concepts per Constitution II (no hardcode) |
| Services | 2 new services | Prompt composition and niche detection are distinct concerns |

## Phase 0: Research Summary

### Key Questions to Resolve

1. **OpenRouter API**: Exact model IDs for Nano Banana Pro and GPT Image 1.5
2. **Existing Integration**: Current `ai-creative.service.ts` structure and extension points
3. **Store Structure**: Current `metaAdsWizardStore` shape and how to extend for modes/concepts
4. **Database Schema**: Best approach for storing concepts, templates, and generation history
5. **Prompt Format**: JSON prompt format that produces best results with text in images

### Resolved in research.md

See [research.md](./research.md) for detailed findings on each question.

## Next Steps

1. **Phase 0**: Generate `research.md` with OpenRouter API details and existing code analysis
2. **Phase 1**: Generate `data-model.md` with Supabase schema
3. **Phase 1**: Generate API contracts in `contracts/` directory
4. **Phase 1**: Generate `quickstart.md` for developer onboarding
5. **Phase 2**: Generate `tasks.md` with implementation tasks (via `/speckit.tasks`)
