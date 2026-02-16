# Implementation Plan: Google Search Console - Indexação e Acompanhamento

**Branch**: `030-google-search-console-indexing` | **Date**: 2026-01-25 | **Spec**: /Users/erickheslan/Documents/Alvobot/alvobot-app/specs/030-google-search-console-indexing/spec.md
**Input**: Feature specification from `/specs/030-google-search-console-indexing/spec.md`

## Summary

Implementar integração completa com Google Search Console para exibir status de indexação no datatable de artigos, permitir solicitações individuais/em massa com fila assíncrona, respeitar quotas diárias por conexão e executar rotina automática diária por conexão. A solução usa backend NestJS para chamadas externas e persistência em Supabase, mantendo UI responsiva com cache de 24h e feedback claro de erros/limites.

## Technical Context

**Language/Version**: TypeScript 5.7.x (Backend NestJS 10.x, Frontend React 19.x)  
**Primary Dependencies**: NestJS 10, @nestjs/axios, @nestjs/schedule, @supabase/supabase-js, React 19, TanStack Query v5  
**Storage**: Supabase PostgreSQL (service_role no backend; RLS para leitura no frontend)  
**Testing**: Jest (backend); frontend sem runner de testes configurado  
**Target Platform**: Web app (React SPA) + API Node.js (NestJS)  
**Project Type**: Web (frontend + backend)  
**Performance Goals**: Atualizar status com cache 24h; inspeção sob demanda com resposta p95 < 2s; processamento de lote 200 URLs < 10 min  
**Constraints**: Respeitar quotas (Indexing API 200/dia por projeto; URL Inspection 2000/dia por propriedade), sem hardcoded data, sem segredos no frontend  
**Scale/Scope**: Até 10k artigos por workspace; até 5 conexões por workspace; processamento diário por conexão

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**PASS**: Alinhado com a constituição (segredos no backend, dados dinâmicos, separação frontend/backend, observabilidade básica, simplicidade operacional).

## Project Structure

### Documentation (this feature)

```text
specs/030-google-search-console-indexing/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── search-console/       # novo módulo (controllers, services)
│   │   └── workflows/            # opcional se usar workflow existente
│   ├── common/
│   │   └── supabase/             # service role client
│   └── temporal/                 # se necessário

frontend/
├── src/
│   ├── features/
│   │   ├── articles/             # datatable e ações de indexação
│   │   ├── connections/          # gestão de conexão GSC
│   │   └── settings/             # toggle rotina automática
│   └── shared/
│       ├── components/
│       └── utils/
```

**Structure Decision**: Usar o layout web existente (frontend + backend), adicionando um módulo NestJS dedicado para Search Console e integrações no datatable de artigos no frontend.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | Gates pass | N/A |

## Constitution Check (Post-Design)

**PASS**: Design mantém segregação de responsabilidades e atende requisitos de observabilidade e quotas.
