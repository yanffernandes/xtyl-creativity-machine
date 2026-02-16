# Implementation Plan: OpenRouter Integration for AI Models

**Branch**: `022-openrouter-integration` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-openrouter-integration/spec.md`

## Summary

Add OpenRouter as an AI provider option alongside OpenAI for both text generation (system prompts) and image generation (AlvoAds Meta). The integration follows the existing multi-provider pattern already established with OpenAI + Google Imagen, using environment variables for API key configuration and database-driven model selection per prompt.

**Key approach**: Leverage the existing fallback pattern in `ai-creative.service.ts` and extend the `system_prompts` table with provider fields to enable admin-controlled model selection.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend React 18, Backend NestJS 10)
**Primary Dependencies**: OpenAI SDK, @nestjs/config, @tanstack/react-query, Supabase client
**Storage**: PostgreSQL (Supabase) - `system_prompts`, `creative_library`, `platform_settings` tables
**Testing**: Jest (backend), Vitest (frontend)
**Target Platform**: Web application (Linux server backend, browser frontend)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: <2s model list loading, <30s image generation, >95% success rate
**Constraints**: Backward compatibility with existing OpenAI functionality required
**Scale/Scope**: Admin-level configuration affecting all platform users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution template is not fully configured for this project. Applying general best practices:

| Principle | Status | Notes |
|-----------|--------|-------|
| **Simplicity** | ✅ PASS | Follows existing multi-provider pattern (OpenAI + Google) |
| **Backward Compatibility** | ✅ PASS | Existing OpenAI functionality unchanged |
| **Security** | ✅ PASS | API key via environment variable (same as OPENAI_API_KEY) |
| **Testability** | ✅ PASS | Service methods independently testable |
| **Documentation** | ✅ PASS | Spec and plan documents complete |

**No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/022-openrouter-integration/
├── plan.md              # This file
├── research.md          # Phase 0: OpenRouter API research
├── data-model.md        # Phase 1: Database schema changes
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: API endpoint contracts
│   ├── openrouter-models.yaml
│   └── admin-settings.yaml
└── tasks.md             # Phase 2: Implementation tasks (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── admin.controller.ts      # Extend: OpenRouter model list endpoint
│   │   │   ├── admin.service.ts         # Extend: Test prompt with provider selection
│   │   │   └── dto/
│   │   │       └── test-prompt.dto.ts   # Extend: Add provider field
│   │   ├── meta/
│   │   │   └── services/
│   │   │       └── ai-creative.service.ts  # Extend: OpenRouter image generation
│   │   └── openrouter/                  # NEW: OpenRouter service module
│   │       ├── openrouter.module.ts
│   │       ├── openrouter.service.ts    # API client, model fetching
│   │       └── dto/
│   │           └── openrouter.dto.ts
│   └── common/
│       └── types/
│           └── ai-provider.types.ts     # NEW: Shared provider types
└── .env.example                         # Update: Add OPENROUTER_API_KEY

frontend/
├── src/
│   ├── features/
│   │   └── admin/
│   │       ├── pages/
│   │       │   ├── AdminSystemPromptsPage.tsx  # Extend: Provider dropdown
│   │       │   └── AdminSettingsPage.tsx       # Extend: Image model config
│   │       ├── api/
│   │       │   └── queries.ts           # Extend: Fetch OpenRouter models
│   │       └── types/
│   │           └── index.ts             # Extend: Provider types
│   └── shared/
│       └── types/
│           └── ai-provider.ts           # NEW: Shared provider types

supabase/
└── migrations/
    └── 20260109_XXX_openrouter_integration.sql  # NEW: Schema changes
```

**Structure Decision**: Web application structure (Option 2) - existing project layout with new OpenRouter module in backend and extended admin features in frontend.

## Complexity Tracking

> No violations requiring justification. Integration follows established patterns.

| Decision | Rationale |
|----------|-----------|
| New `openrouter/` module | Encapsulates OpenRouter-specific logic, follows NestJS module pattern |
| Extend existing services | Leverages proven multi-provider pattern from ai-creative.service.ts |
| Database migration | Minimal schema changes (2 new columns + 1 setting) |
