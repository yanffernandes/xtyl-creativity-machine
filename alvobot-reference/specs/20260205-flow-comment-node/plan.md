# Implementation Plan: Comment Node & Flow Name Display

**Branch**: `20260205-flow-comment-node` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/20260205-flow-comment-node/spec.md`

## Summary

Adicionar um novo tipo de nó "comment" ao editor de fluxos para anotações visuais (sem conexões) e corrigir o nó "Chamar Fluxo" para exibir o nome do fluxo em vez do UUID. Ambas são mudanças frontend-only no módulo `features/flows`.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18, @xyflow/react (React Flow), Lucide Icons, Zustand
**Storage**: Supabase PostgreSQL (table: `message_flows`, columns: `nodes JSONB`, `edges JSONB`)
**Testing**: Manual testing (projeto não possui testes automatizados de frontend)
**Target Platform**: Web (Chrome, Firefox, Safari modernos)
**Project Type**: Web application (frontend React + backend NestJS)
**Performance Goals**: N/A (feature de UI simples)
**Constraints**: N/A
**Scale/Scope**: Feature de escopo limitado - 2 user stories, ~5 arquivos modificados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Segurança de Dados | **PASS** | Feature frontend-only, sem dados sensíveis |
| II. Dados Dinâmicos | **PASS** | Nenhum dado hardcoded de domínio |
| III. Separação Frontend/Backend | **PASS** | Modificação apenas no frontend, dados via RLS |
| IV. Observabilidade | **N/A** | Não há integração externa |
| V. Simplicidade Operacional | **PASS** | Implementação simples e direta |

**Gate Result**: PASS - Nenhuma violação identificada.

## Project Structure

### Documentation (this feature)

```text
specs/20260205-flow-comment-node/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   └── features/
│       └── flows/
│           ├── components/
│           │   ├── nodes/
│           │   │   ├── index.ts           # Node types registry (MODIFY)
│           │   │   ├── CommentNode.tsx    # NEW: Comment node component
│           │   │   └── CallFlowNode.tsx   # MODIFY: Add flowName display
│           │   ├── sidebar/
│           │   │   └── NodeEditSidebar.tsx # MODIFY: Add comment editor
│           │   └── dock/
│           │       └── ComponentsDock.tsx  # MODIFY: Add comment to dock (if used)
│           ├── pages/
│           │   └── FlowEditorPage.tsx     # MODIFY: Add comment to DOCK_ITEMS, pass flowName
│           ├── types/
│           │   └── index.ts               # MODIFY: Add CommentNodeData type
│           └── utils/
│               └── validateFlow.ts        # MODIFY: Ignore comment nodes in validation
```

**Structure Decision**: Web application - apenas o frontend será modificado. Esta feature não requer mudanças no backend pois:
1. O nó de comentário é salvo no JSONB existente (`nodes` column)
2. O nome do fluxo já está disponível via `useFlowOptions()` hook

## Complexity Tracking

> No violations detected - table not applicable.

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `types/index.ts` | MODIFY | Add `CommentNodeData` interface, update `MessengerNodeType` |
| `components/nodes/CommentNode.tsx` | CREATE | New comment node component (no handles) |
| `components/nodes/index.ts` | MODIFY | Export CommentNode, add to `nodeTypes` registry |
| `components/nodes/nodes.module.css` | MODIFY | Add `.commentNode` styles |
| `pages/FlowEditorPage.tsx` | MODIFY | Add 'comment' to DOCK_ITEMS, enrich nodes with flowName |
| `components/sidebar/NodeEditSidebar.tsx` | MODIFY | Add comment text editor section |
| `utils/validateFlow.ts` | MODIFY | Skip comment nodes in validation |

## Key Implementation Details

### 1. CommentNodeData Interface

```typescript
export interface CommentNodeData extends BaseNodeData {
  type: 'comment'
  text: string
}
```

### 2. CommentNode Component

- Estilo visual distinto (cor diferente, ícone MessageSquareText)
- SEM handles de entrada/saída (não usa `<Handle>`)
- Editável via sidebar
- Deletável como outros nós

### 3. Flow Name Resolution

O `CallFlowNode` já suporta `flowName` no props:
```typescript
data: CallFlowNodeData & { flowName?: string }
```

O problema é que `flowName` não está sendo passado. A solução:
- No `FlowEditorPage`, ao renderizar os nodes, enriquecer `call-flow` nodes com `flowName` a partir de `availableFlows`
- Isso pode ser feito via `useMemo` que mapeia `selectedFlowId` → `flowName`

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Comment node interfere na execução do fluxo | Low | High | Verificar que validateFlow e backend ignoram tipo 'comment' |
| flowName não atualiza quando fluxo é renomeado | Low | Low | Cache é aceite, nome atualiza ao recarregar editor |
| Retrocompatibilidade com fluxos existentes | Low | High | Tipo 'comment' é novo, não afeta nodes existentes |
