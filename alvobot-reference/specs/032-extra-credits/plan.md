# Implementation Plan: Sistema de Créditos Extras

**Branch**: `031-extra-credits` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/031-extra-credits/spec.md`

## Summary

Implementar sistema de créditos extras que permite administradores adicionarem créditos avulsos para usuários, com consumo prioritário (mensais primeiro, depois extras por FIFO de expiração). Utiliza a infraestrutura existente de `credit_transactions` e `activity_logs`, adicionando nova coluna para saldo restante por pacote e atualizando a view `user_credits_summary`.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (frontend), TypeScript 5.7.2 (backend)
**Primary Dependencies**: React 19.2.0, TanStack Query 5.90.12, Zustand 5.0.9, NestJS 10.4.4, Supabase
**Storage**: PostgreSQL via Supabase (tabelas: credit_transactions, activity_logs, views)
**Testing**: Vitest (frontend), Jest (backend)
**Target Platform**: Web application (SPA + API)
**Project Type**: Web application (frontend + backend + database)
**Performance Goals**: Dashboard carrega em < 3 segundos, adição de créditos < 30 segundos
**Constraints**: RLS para isolamento de dados, auditoria completa de transações
**Scale/Scope**: Centenas de usuários, milhares de transações de crédito

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Library-First | N/A | Feature integra com sistema existente |
| Test-First | PASS | Testes unitários para lógica de consumo FIFO |
| Observability | PASS | Auditoria via admin_audit_log e activity_logs |
| Simplicity | PASS | Reutiliza infraestrutura existente (credit_transactions) |

**Gate Status**: PASS - Nenhuma violação identificada.

## Project Structure

### Documentation (this feature)

```text
specs/031-extra-credits/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API contracts
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Web application structure (existing)

backend/
├── src/
│   ├── modules/
│   │   └── credits/              # NEW: Módulo de créditos extras
│   │       ├── credits.controller.ts
│   │       ├── credits.service.ts
│   │       ├── credits.module.ts
│   │       └── dto/
│   │           ├── add-credits.dto.ts
│   │           └── credit-summary.dto.ts
│   └── common/
│       └── supabase/             # Existing: Supabase client

frontend/
├── src/
│   ├── features/
│   │   ├── admin/
│   │   │   ├── pages/
│   │   │   │   ├── AdminUsersPage.tsx        # UPDATE: Add credits button
│   │   │   │   └── AdminCreditsPage.tsx      # NEW: Dashboard de créditos
│   │   │   ├── components/
│   │   │   │   └── AddCreditsModal/          # NEW: Modal para adicionar créditos
│   │   │   └── api/
│   │   │       ├── mutations.ts              # UPDATE: useAddCredits
│   │   │       └── queries.ts                # UPDATE: useCreditsDashboard
│   │   │
│   │   └── subscription/
│   │       ├── pages/
│   │       │   └── SubscriptionPage.tsx      # UPDATE: Seção de créditos extras
│   │       └── api/
│   │           └── useSubscription.ts        # UPDATE: useExtraCredits

supabase/
└── migrations/
    └── 20260122_031_extra_credits.sql        # NEW: Alterações no schema
```

**Structure Decision**: Web application com frontend React e backend NestJS. Reutiliza estrutura existente de features (admin, subscription) e adiciona novo módulo de créditos no backend.

## Complexity Tracking

> Nenhuma violação de constitution identificada. Tabela não aplicável.

## Implementation Phases

### Phase 0: Research (Complete)
- [x] Analisar estrutura existente de credit_transactions
- [x] Entender view user_credits_summary
- [x] Identificar padrões de mutations no admin
- [x] Mapear página de subscription do usuário

### Phase 1: Design & Contracts (Current)
- [x] Definir alterações no schema (data-model.md)
- [x] Especificar API contracts
- [x] Criar quickstart.md

### Phase 2: Tasks (via /speckit.tasks)
- [ ] Gerar tasks.md com tarefas ordenadas por dependência
