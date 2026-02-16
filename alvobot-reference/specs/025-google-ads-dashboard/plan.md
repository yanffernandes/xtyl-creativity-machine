# Implementation Plan: Google Ads Performance Dashboard & Automation Engine

**Branch**: `025-google-ads-dashboard` | **Date**: 2026-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/025-google-ads-dashboard/spec.md`

## Summary

Implementar um dashboard de performance para campanhas do Google Ads com visualização em tempo real de métricas (impressões, cliques, CTR, custo, conversões, CPA, ROAS), ações rápidas (pausar, ativar, alterar orçamento, duplicar) e um sistema de automações com gatilhos condicionais configuráveis pelo usuário. A arquitetura é stateless para métricas (busca direto da API do Google Ads usando OAuth do usuário) e persiste apenas automações, histórico e configurações no Supabase.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend React 19, Backend NestJS 10)
**Primary Dependencies**:
- Frontend: React, TanStack Query, Zustand, React Hook Form, CSS Modules
- Backend: NestJS, google-ads-api, @nestjs/schedule (cron jobs)

**Storage**: Supabase PostgreSQL (apenas automações, histórico, configurações - métricas NÃO são persistidas)
**Testing**: Vitest (frontend), Jest (backend)
**Target Platform**: Web (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Dashboard carrega em <5s, ações refletem em <30s
**Constraints**: Rate limits Google Ads API (15k requests/dia por developer token), delay natural ~3h nas métricas
**Scale/Scope**: Suporte a contas com até 1.000 campanhas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

O projeto não possui constitution específica definida. Seguindo os padrões estabelecidos no CLAUDE.md:

| Principle | Status | Notes |
|-----------|--------|-------|
| BaaS Architecture | ✅ PASS | Google Ads API requer backend (external API + OAuth tokens) |
| Feature Module Pattern | ✅ PASS | Nova feature `alvoads-google-dashboard` seguirá o padrão existente |
| Security (tokens no backend) | ✅ PASS | OAuth tokens gerenciados no backend, nunca expostos ao frontend |
| RLS para dados próprios | ✅ PASS | Automações e histórico terão RLS por user_id |
| Design System | ✅ PASS | Usará componentes existentes (Table, Card, Button, Modal) |

## Project Structure

### Documentation (this feature)

```text
specs/025-google-ads-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   └── google/
│   │       ├── services/
│   │       │   ├── google-ads-api.service.ts      # EXISTING - extend with metrics queries
│   │       │   ├── google-dashboard.service.ts    # NEW - dashboard business logic
│   │       │   └── google-automation.service.ts   # NEW - automation engine
│   │       ├── controllers/
│   │       │   ├── google-dashboard.controller.ts # NEW - dashboard endpoints
│   │       │   └── google-automation.controller.ts # NEW - automation CRUD
│   │       ├── dto/
│   │       │   ├── campaign-metrics.dto.ts        # NEW
│   │       │   ├── campaign-action.dto.ts         # NEW
│   │       │   └── automation-rule.dto.ts         # NEW
│   │       └── entities/
│   │           ├── automation-rule.entity.ts      # NEW
│   │           └── action-log.entity.ts           # NEW
│   └── common/
│       └── jobs/
│           └── automation-runner.job.ts           # NEW - cron job for automations
└── tests/
    └── google/
        ├── google-dashboard.service.spec.ts
        └── google-automation.service.spec.ts

frontend/
├── src/
│   └── features/
│       └── alvoads-google-dashboard/              # NEW feature module
│           ├── api/
│           │   ├── queries.ts                     # useGoogleCampaigns, useActionHistory
│           │   ├── mutations.ts                   # usePauseCampaign, useCreateAutomation
│           │   └── index.ts
│           ├── components/
│           │   ├── CampaignTable/                 # Main dashboard table with metrics
│           │   ├── CampaignActions/               # Action buttons and modals
│           │   ├── AutomationList/                # List of user automations
│           │   ├── AutomationForm/                # Create/edit automation wizard
│           │   ├── ConditionBuilder/              # AND/OR condition UI builder
│           │   ├── ActionHistoryTable/            # History log table
│           │   └── index.ts
│           ├── pages/
│           │   ├── GoogleAdsDashboardPage.tsx     # Main dashboard
│           │   ├── AutomationsPage.tsx            # Automations management
│           │   └── ActionHistoryPage.tsx          # History view
│           ├── stores/
│           │   └── dashboardStore.ts              # Filters, period, sorting
│           ├── types/
│           │   └── index.ts                       # TypeScript interfaces
│           └── hooks/
│               └── useConditionBuilder.ts         # Condition builder logic
└── tests/
    └── features/
        └── alvoads-google-dashboard/

supabase/
└── migrations/
    └── YYYYMMDD_google_ads_automations.sql        # NEW - tables for automations
```

**Structure Decision**: Web application structure seguindo o padrão existente do AlvoBot. Nova feature `alvoads-google-dashboard` no frontend seguindo o Feature Module Pattern. Backend estende o módulo `google` existente com novos services e controllers.

## Complexity Tracking

> No violations detected - feature follows established patterns.

---

## Phase 0: Research

### Research Tasks

1. **Google Ads API - Campaign Metrics Query**: GAQL queries para buscar métricas de campanhas
2. **Google Ads API - Campaign Mutations**: Como pausar, ativar, alterar orçamento via API
3. **Google Ads API - Campaign Duplication**: Estratégia para duplicar campanhas
4. **NestJS Scheduler**: Best practices para cron jobs de automações
5. **Condition Builder UI**: Padrões para UI de condições AND/OR com agrupamento

### Research Output

Ver [research.md](./research.md) para detalhes completos.

---

## Phase 1: Design

### Data Model

Ver [data-model.md](./data-model.md) para schema completo das entidades.

### API Contracts

Ver [contracts/](./contracts/) para especificações dos endpoints.

### Quick Start

Ver [quickstart.md](./quickstart.md) para guia de desenvolvimento.
