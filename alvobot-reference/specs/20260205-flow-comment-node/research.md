# Research: Comment Node & Flow Name Display

**Branch**: `20260205-flow-comment-node` | **Date**: 2026-02-05

## Overview

Esta feature não possui incertezas técnicas significativas. O código existente já fornece padrões claros para adicionar novos tipos de nós e o `CallFlowNode` já suporta o campo `flowName` - apenas não está sendo populado.

## Research Tasks

### 1. Padrão para Adicionar Novos Node Types

**Decision**: Seguir o padrão existente dos outros node types

**Rationale**: O código é bem estruturado e todos os node types seguem a mesma convenção:
- Interface de dados em `types/index.ts`
- Componente em `components/nodes/[NodeName].tsx`
- Registro em `components/nodes/index.ts`
- Dados default em `FlowEditorPage.tsx` (`getDefaultNodeData`)
- Item no dock em `DOCK_ITEMS`

**Alternatives considered**:
- Nenhuma - o padrão existente é claro e consistente

### 2. Como Implementar Nó Sem Handles

**Decision**: Simplesmente não incluir componentes `<Handle>` no CommentNode

**Rationale**: React Flow só permite conexões em nodes que possuem handles. Ao omitir os handles, o nó automaticamente não aceita conexões.

**Alternatives considered**:
- Usar `isConnectable={false}` nos handles: Mais complexo, ainda mostra handles visuais

### 3. Como Resolver Flow Name para CallFlowNode

**Decision**: Enriquecer os nodes no `FlowEditorPage` com `flowName` via `useMemo`

**Rationale**:
- O hook `useFlowOptions()` já fornece a lista de fluxos com `{ id, name }`
- O `CallFlowNode` já suporta `data.flowName` no rendering
- Basta mapear `selectedFlowId` para `flowName` ao preparar os nodes

**Implementation approach**:
```typescript
const enrichedNodes = useMemo(() => {
  return nodes.map(node => {
    if (node.type === 'call-flow' && node.data?.selectedFlowId) {
      const targetFlow = availableFlows.find(f => f.id === node.data.selectedFlowId)
      return {
        ...node,
        data: { ...node.data, flowName: targetFlow?.name }
      }
    }
    return node
  })
}, [nodes, availableFlows])
```

**Alternatives considered**:
- Salvar `flowName` no banco junto com `selectedFlowId`: Redundante e pode ficar desatualizado
- Buscar nome via API separada: Over-engineering para este caso

### 4. Estilo Visual do Comment Node

**Decision**: Usar estilo visual distinto com cor neutra (cinza/roxo) e ícone de sticky note

**Rationale**:
- O comment node deve ser visualmente diferente dos nodes funcionais
- Deve parecer uma "anotação" ou "sticky note"
- Seguir a paleta sóbria do design system (grays, zinc)

**Icon choice**: `StickyNote` ou `MessageSquareText` do Lucide

**Alternatives considered**:
- Usar a mesma aparência dos outros nodes: Confundiria usuários sobre a função

### 5. Validação de Fluxo

**Decision**: Ignorar nodes do tipo 'comment' na função `validateFlow`

**Rationale**:
- Comments são apenas visuais, não fazem parte da lógica do fluxo
- Não devem gerar erros de validação por não terem conexões

**Alternatives considered**:
- Validar comments separadamente: Desnecessário para esta feature

## Unknowns Resolved

Nenhuma incerteza técnica identificada. A implementação pode prosseguir diretamente para a fase de design.

## Dependencies

- `@xyflow/react` - Biblioteca de flow editor (já instalada)
- `lucide-react` - Ícones (já instalado)
- Nenhuma nova dependência necessária
