# Implementation Plan: Menu Visibility by Plan

**Branch**: `029-menu-visibility-by-plan` | **Date**: 2025-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/029-menu-visibility-by-plan/spec.md`

## Summary

Sistema de controle de visibilidade dos itens do menu lateral (Sidebar) baseado no plano do usuário. Administradores podem configurar quais planos têm acesso a cada item do menu, com opção de exibir itens bloqueados como "Em Breve" ou ocultar completamente. Implementação envolve: tabela de configuração no Supabase, view para cálculo de visibilidade, hook React para consumo, atualização do Sidebar para filtragem dinâmica, e página admin para gerenciamento.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend React 19, Backend NestJS 10)
**Primary Dependencies**: React, TanStack Query v5, Supabase Client, CSS Modules
**Storage**: PostgreSQL via Supabase (nova tabela `menu_visibility_config`, nova view `user_menu_visibility`)
**Testing**: Vitest (frontend), Jest (backend)
**Target Platform**: Web (SPA React)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: <100ms adicionais no carregamento inicial do menu
**Constraints**: Cache de 5 minutos, skeleton loading durante carregamento
**Scale/Scope**: 18 itens de menu, todos os usuários da plataforma

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

O projeto não possui constitution customizada (template padrão). Princípios gerais aplicados:

| Gate | Status | Notes |
|------|--------|-------|
| Segurança | PASS | RLS protege dados; usuários só leem configuração |
| Performance | PASS | Cache 5min; view otimizada; skeleton loading |
| Simplicidade | PASS | Uma tabela, uma view, um hook, modificações pontuais |
| Testabilidade | PASS | Hook isolado; componentes testáveis; RLS testável |

## Project Structure

### Documentation (this feature)

```text
specs/029-menu-visibility-by-plan/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Web application structure (frontend + backend)

backend/
├── src/
│   └── modules/
│       └── admin/           # Existing admin module - add menu visibility endpoints

frontend/
├── src/
│   ├── shared/
│   │   ├── hooks/
│   │   │   └── useMenuVisibility.ts    # NEW: Hook para buscar visibilidade
│   │   ├── components/
│   │   │   ├── MenuItemComingSoon/     # NEW: Item "Em Breve"
│   │   │   └── ProtectedFeatureRoute/  # NEW: Wrapper de proteção de rota
│   │   ├── layouts/
│   │   │   └── MainLayout/
│   │   │       └── Sidebar.tsx         # MODIFY: Integrar visibilidade
│   │   ├── types/
│   │   │   └── menu.ts                 # NEW: Types de menu
│   │   └── utils/
│   │       └── queryKeys.ts            # MODIFY: Adicionar keys de menu
│   │
│   └── features/
│       └── admin/
│           ├── pages/
│           │   └── AdminMenuVisibilityPage.tsx  # NEW: Página admin
│           └── components/
│               └── menu-visibility/             # NEW: Componentes admin
│                   ├── MenuVisibilityTable/
│                   ├── MenuVisibilityEditModal/
│                   └── MenuVisibilityPreview/

database/
└── migrations/
    └── 029_menu_visibility_config.sql  # NEW: Migration
```

**Structure Decision**: Web application com frontend React e backend NestJS existentes. A maior parte da lógica fica no frontend (hook + sidebar) e no banco (view com cálculo de visibilidade). Backend apenas para operações admin que requerem service_role.

## Complexity Tracking

> Nenhuma violação de constitution identificada. Feature segue padrões existentes.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
