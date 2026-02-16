# Implementation Plan: Sistema de Testes Automatizados

**Branch**: `023-automated-testing` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-automated-testing/spec.md`

## Summary

Implementar infraestrutura completa de testes automatizados para o projeto AlvoBot, incluindo:
- Testes unitários no frontend com Vitest + React Testing Library
- Testes unitários no backend com Jest (já configurado)
- Testes E2E com Playwright em pasta separada
- Testes de RLS do Supabase
- Pipeline CI/CD com GitHub Actions
- Mocks, factories e helpers reutilizáveis

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend React 19, Backend NestJS 10)
**Primary Dependencies**:
- Frontend: Vitest, @testing-library/react, @testing-library/user-event, MSW, happy-dom
- Backend: Jest (existente), Supertest (existente), nock
- E2E: Playwright
**Storage**: PostgreSQL (Supabase) - testes usarão Supabase Local ou projeto separado
**Testing**: Vitest (frontend), Jest (backend), Playwright (E2E)
**Target Platform**: Web (Linux CI, macOS/Windows dev)
**Project Type**: Web application (frontend + backend separados)
**Performance Goals**: Unit tests < 30s, CI total < 10 min
**Constraints**: Cobertura mínima 70%, flaky rate < 2%
**Scale/Scope**: ~25 features frontend, ~16 módulos backend, 5+ tabelas RLS críticas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

O projeto não possui constitution definida (template vazio). Aplicando princípios implícitos do CLAUDE.md:

| Princípio | Status | Justificativa |
|-----------|--------|---------------|
| Estrutura existente | PASS | Testes seguem estrutura frontend/backend já estabelecida |
| Sem hardcoded data | PASS | Factories gerarão dados dinamicamente |
| Design system | PASS | Não afeta CSS/componentes visuais |
| Security (RLS) | PASS | Testes de RLS reforçam segurança existente |

## Project Structure

### Documentation (this feature)

```text
specs/023-automated-testing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A for testing infra)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Estrutura de testes proposta

frontend/
├── src/
│   ├── features/
│   │   └── [feature]/
│   │       └── __tests__/           # Unit tests co-localizados
│   │           └── *.test.tsx
│   ├── shared/
│   │   └── components/
│   │       └── [Component]/
│   │           └── *.test.tsx       # Component tests co-localizados
│   └── test/                        # Setup global e mocks
│       ├── setup.ts                 # Vitest setup
│       ├── mocks/
│       │   ├── supabase.ts          # Mock do cliente Supabase
│       │   ├── handlers.ts          # MSW handlers
│       │   └── server.ts            # MSW server setup
│       ├── utils/
│       │   ├── render.tsx           # Custom render com providers
│       │   └── test-utils.ts        # Helpers gerais
│       └── factories/
│           ├── user.factory.ts
│           ├── project.factory.ts
│           └── index.ts
├── vitest.config.ts                 # Configuração Vitest
└── package.json                     # + test scripts

backend/
├── src/
│   └── modules/
│       └── [module]/
│           ├── *.service.spec.ts    # Unit tests co-localizados
│           └── *.controller.spec.ts
├── test/                            # Integration/E2E tests
│   ├── jest-e2e.json                # Config E2E (existente)
│   ├── setup-e2e.ts                 # Setup para testes E2E
│   ├── mocks/
│   │   └── external-apis.ts         # Mocks de APIs externas
│   └── modules/
│       ├── auth.e2e-spec.ts
│       └── [module].e2e-spec.ts
└── package.json                     # (scripts já existem)

e2e/                                 # Pasta separada na raiz
├── playwright.config.ts
├── package.json
├── fixtures/
│   ├── auth.fixture.ts              # Fixture de autenticação
│   └── database.fixture.ts          # Fixture de banco
├── pages/                           # Page Objects
│   ├── login.page.ts
│   ├── dashboard.page.ts
│   └── projects.page.ts
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── signup.spec.ts
│   └── projects/
│       └── crud.spec.ts
└── utils/
    ├── supabase-helpers.ts
    └── test-data.ts

supabase/
├── migrations/                      # (existente)
└── tests/
    └── rls/
        ├── projects.test.sql
        ├── articles.test.sql
        └── system-prompts.test.sql

.github/
└── workflows/
    └── test.yml                     # CI pipeline
```

**Structure Decision**: Web application com testes co-localizados para unit tests, pasta separada `e2e/` para Playwright, e `supabase/tests/` para RLS. Esta estrutura:
- Mantém testes próximos do código que testam (fácil manutenção)
- Isola E2E como projeto independente (pode rodar contra qualquer ambiente)
- Segue convenções da indústria para React (Vitest) e NestJS (Jest)

## Complexity Tracking

> Nenhuma violação de constitution identificada - seção não aplicável.
