# Implementation Plan: Melhoria do Sistema de Ferramentas do Assistente IA

**Branch**: `004-agent-tools-enhancement` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-agent-tools-enhancement/spec.md`

## Summary

Expandir o sistema de ferramentas do assistente IA para suportar modo autônomo (execução automática de todas as ferramentas), lista de tarefas visual com progresso em tempo real, limite de iterações configurável (15), e novas ferramentas (`rename_document`, `rename_folder`, `get_folder_contents`). A implementação aproveita a infraestrutura SSE existente e adiciona persistência de preferências do usuário.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, Shadcn/UI
**Storage**: PostgreSQL 15+ with pgvector
**Testing**: pytest (backend), Jest/React Testing Library (frontend)
**Target Platform**: Web (Docker Compose deployment)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Status visual em <500ms, streaming SSE real-time
**Constraints**: Timeout 60s padrão, 120s para imagem; máximo 15 iterações
**Scale/Scope**: Centenas de usuários concorrentes, milhares de documentos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. AI-First Development | ✅ PASS | Melhora fluxo de ferramentas AI, streaming SSE mantido |
| II. API-First Architecture | ✅ PASS | Novos endpoints REST para preferências, tools seguem padrão OpenRouter |
| III. User Experience Excellence | ✅ PASS | Lista de tarefas visual, feedback em tempo real, modo autônomo opcional |
| IV. Production-Ready Deployments | ✅ PASS | Sem mudanças em Docker, apenas código |
| V. Data Integrity & Security | ✅ PASS | Preferências por usuário, sem dados sensíveis expostos |
| VI. Scalability & Performance | ✅ PASS | SSE streaming existente, timeouts configurados |
| VII. Testing & Quality Assurance | ✅ PASS | Testes para novas ferramentas e fluxos |

**Gate Result**: ✅ PASSED - Nenhuma violação identificada

## Project Structure

### Documentation (this feature)

```text
specs/004-agent-tools-enhancement/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-contracts.yaml
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
backend/
├── routers/
│   ├── chat.py              # MODIFY: auto-execute mode, task list events, iteration limit
│   └── preferences.py       # NEW: user preferences endpoints
├── models.py                # MODIFY: add UserPreferences model
├── schemas.py               # MODIFY: add preference schemas
├── crud.py                  # MODIFY: add preference CRUD
├── tools.py                 # MODIFY: add rename_document, rename_folder, get_folder_contents
└── migrations/
    └── 011_add_user_preferences.sql  # NEW: user preferences table

frontend/
├── src/
│   ├── components/
│   │   ├── ChatSidebar.tsx           # MODIFY: autonomous mode toggle, task list UI
│   │   ├── ToolExecutionCard.tsx     # MODIFY: timeout indicator, cancel button
│   │   └── TaskListCard.tsx          # NEW: visual task list component
│   ├── hooks/
│   │   └── useUserPreferences.ts     # NEW: preferences hook
│   └── lib/
│       └── api/
│           └── preferences.ts        # NEW: preferences API client
└── tests/
```

**Structure Decision**: Web application (frontend + backend) - segue estrutura existente do projeto

## Complexity Tracking

> Nenhuma violação de Constitution identificada - tabela não aplicável.
