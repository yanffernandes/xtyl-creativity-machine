# Implementation Plan: Workflow Visual Redesign

**Branch**: `005-workflow-visual-redesign` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-workflow-visual-redesign/spec.md`

## Summary

Redesign da interface de workflows para alcançar consistência visual com a tela de projetos (liquid glass, sidebars flutuantes), mudar orientação dos nós para fluxo horizontal (esquerda→direita), contextualizar workflows dentro de projetos, e separar claramente templates do sistema de workflows do usuário. A implementação é primariamente frontend com ajustes menores no backend para suportar a nova estrutura de navegação.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5.x (Frontend)
**Primary Dependencies**: FastAPI, SQLAlchemy, Next.js 14, React 18, ReactFlow, Shadcn/UI, Tailwind CSS
**Storage**: PostgreSQL 15+ with pgvector
**Testing**: pytest (backend), Jest/React Testing Library (frontend)
**Target Platform**: Web (Desktop-first, responsive)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: < 2s initial load, < 100ms canvas interactions, smooth 60fps animations
**Constraints**: Consistência visual com design system existente (Ethereal Blue + Liquid Glass)
**Scale/Scope**: Interface de workflow editor, ~15 componentes a modificar, 8 tipos de nós

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. AI-First Development | ✅ PASS | Nós de workflow integram com serviços de LLM e geração de imagem existentes |
| II. API-First Architecture | ✅ PASS | Endpoints REST existentes para workflows, templates e execuções |
| III. User Experience Excellence | ✅ PASS | Liquid glass design, navegação clara, progressive disclosure via templates vs workflows |
| III.1 Premium Visual Design | ✅ PASS | Reutiliza design system Ethereal Blue já estabelecido |
| III.2 Progressive Complexity | ✅ PASS | Templates para iniciantes, editor completo para avançados |
| III.3 Interaction & Feedback | ✅ PASS | Feedback visual em conexões inválidas, estados de execução |
| III.4 Performance as UX | ✅ PASS | Canvas com ReactFlow otimizado, animações Framer Motion |
| IV. Production-Ready Deployments | ✅ PASS | Sem alterações em infraestrutura Docker |
| V. Data Integrity & Security | ✅ PASS | Sem alterações em autenticação ou storage |
| VI. Scalability & Performance | ✅ PASS | Canvas rendering otimizado, lazy loading de nós |
| VII. Testing & Quality | ⚠️ PARTIAL | Testes visuais recomendados para glassmorphism |

**Gate Result**: ✅ PASS - Nenhuma violação crítica. Recomendação de adicionar testes visuais.

## Project Structure

### Documentation (this feature)

```text
specs/005-workflow-visual-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── design-tokens.json
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── routers/
│   └── workflows.py      # Ajustes para filtrar por projeto
├── models.py             # WorkflowTemplate já tem project_id
└── services/
    └── workflow_executor.py  # Sem alterações

frontend/
├── src/
│   ├── app/
│   │   └── workspace/[id]/
│   │       ├── project/[projectId]/
│   │       │   └── workflows/         # NOVA ROTA - workflows por projeto
│   │       │       ├── page.tsx       # Lista de workflows do projeto
│   │       │       └── [workflowId]/
│   │       │           └── page.tsx   # Editor de workflow
│   │       └── workflows/             # REFATORAR - galeria de templates
│   │           └── page.tsx
│   ├── components/
│   │   └── workflow/
│   │       ├── WorkflowCanvas.tsx     # Handles horizontais
│   │       ├── NodePalette.tsx        # Sidebar glass flutuante
│   │       ├── NodeConfigPanel.tsx    # Sidebar glass flutuante
│   │       ├── WorkflowHeader.tsx     # NOVO - navegação com breadcrumb
│   │       └── nodes/
│   │           ├── BaseNode.tsx       # Position.Left/Right handles
│   │           ├── StartNode.tsx
│   │           ├── TextGenerationNode.tsx
│   │           ├── ImageGenerationNode.tsx
│   │           ├── ConditionalNode.tsx
│   │           ├── LoopNode.tsx
│   │           ├── ContextRetrievalNode.tsx
│   │           ├── ProcessingNode.tsx
│   │           └── AttachNode.tsx
│   └── lib/
│       └── design-tokens.ts           # Tokens glass existentes
└── tests/
    └── components/
        └── workflow/                  # Testes de componentes
```

**Structure Decision**: Web application com frontend Next.js e backend FastAPI. Mudanças concentradas no frontend (componentes workflow), com ajustes mínimos no backend para filtragem por projeto.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nenhuma | N/A | N/A |
