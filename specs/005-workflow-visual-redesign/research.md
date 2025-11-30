# Research: Workflow Visual Redesign

**Feature**: 005-workflow-visual-redesign
**Date**: 2025-11-27
**Purpose**: Resolver unknowns técnicos e documentar decisões de design

## 1. ReactFlow Handle Position Change

### Decision
Usar `Position.Left` para target handles e `Position.Right` para source handles em todos os nós.

### Rationale
- ReactFlow suporta nativamente 4 posições: Top, Right, Bottom, Left
- A mudança é feita via prop `position` no componente `Handle`
- Não requer migração de dados - apenas alteração visual
- Fluxos existentes continuarão funcionando (edges são baseados em IDs, não posições)

### Alternatives Considered
1. **Manter vertical (Top/Bottom)**: Rejeitado - não atende ao requisito de fluxo horizontal
2. **Handles múltiplos (todos os lados)**: Rejeitado - complexidade desnecessária, UX confusa

### Implementation Notes
```typescript
// De:
<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />

// Para:
<Handle type="target" position={Position.Left} />
<Handle type="source" position={Position.Right} />
```

## 2. Liquid Glass Sidebar Pattern

### Decision
Reutilizar o padrão exato implementado em `WorkspaceSidebar.tsx` e `ChatSidebar.tsx`.

### Rationale
- Padrão já existe e está testado na tela de projetos
- Mantém consistência visual em toda a aplicação
- Classes Tailwind já definidas:
  ```css
  bg-white/[0.03] dark:bg-white/[0.02]
  backdrop-blur-2xl backdrop-saturate-150
  border border-white/[0.1]
  rounded-2xl
  shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)_inset]
  ```

### Alternatives Considered
1. **Criar novas classes**: Rejeitado - duplicação desnecessária
2. **Usar design tokens diretamente**: Considerado - mas Tailwind utilities são mais práticos

### Implementation Notes
- Extrair classes para constante reutilizável: `floatingGlassClasses`
- Aplicar em: `NodePalette.tsx`, `NodeConfigPanel.tsx`
- Container com padding `p-3` para efeito flutuante

## 3. Workflow por Projeto - Estrutura de Rotas

### Decision
Criar nova rota aninhada: `/workspace/[id]/project/[projectId]/workflows/`

### Rationale
- Mantém hierarquia lógica: Workspace → Project → Workflows
- Facilita passagem de `projectId` para filtros
- Permite breadcrumb navigation natural
- Não quebra rotas existentes (galeria de templates permanece em `/workflows`)

### Alternatives Considered
1. **Query param (`?projectId=xxx`)**: Rejeitado - URLs menos semânticas, difícil de bookmarkar
2. **Mover toda a lógica para projeto**: Rejeitado - templates globais precisam de acesso independente

### URL Structure
```
/workspace/{workspaceId}/project/{projectId}/workflows          # Lista de workflows do projeto
/workspace/{workspaceId}/project/{projectId}/workflows/{id}     # Editor de workflow
/workspace/{workspaceId}/project/{projectId}/workflows/new      # Novo workflow
/workspace/{workspaceId}/workflows                              # Galeria de templates (mantida)
```

## 4. Separação Visual Templates vs Workflows

### Decision
- Usar tabs ou seções claramente separadas na galeria
- Badge visual para indicar "Template" vs "Meu Workflow"
- Ações diferenciadas baseadas no tipo

### Rationale
- Usuários precisam identificar rapidamente o que podem editar
- Templates do sistema (is_system=true) são read-only
- Workflows do projeto são editáveis

### Visual Indicators
| Tipo | Badge | Cor | Ações |
|------|-------|-----|-------|
| Template do Sistema | "Template" | Azul/Neutro | Duplicar, Executar |
| Meu Workflow | Nenhum ou "Editável" | Verde | Editar, Executar, Duplicar, Excluir |

### Implementation Notes
- Usar filtro no backend: `is_system=true/false`
- Frontend renderiza seções separadas com headers claros

## 5. Validação de Tipos em Conexões

### Decision
Implementar sistema de tipos para handles com validação no `onConnect`.

### Rationale
- Previne erros antes que aconteçam
- Feedback visual imediato (handle vermelho)
- Melhora UX ao guiar usuário

### Type System
```typescript
type HandleDataType = 'text' | 'image' | 'json' | 'any';

interface NodeHandleConfig {
  input: HandleDataType[];  // Tipos aceitos como entrada
  output: HandleDataType;   // Tipo produzido
}

const nodeTypes: Record<string, NodeHandleConfig> = {
  start: { input: [], output: 'any' },
  text_generation: { input: ['text', 'json', 'any'], output: 'text' },
  image_generation: { input: ['text'], output: 'image' },
  context_retrieval: { input: ['text'], output: 'json' },
  attach_creative: { input: ['image', 'text'], output: 'json' },
  // ...
};
```

### Implementation Notes
- Hook `useValidateConnection` para lógica de validação
- Visual: handle fica vermelho quando hover sobre destino incompatível
- Tooltip explica incompatibilidade

## 6. Navegação e Breadcrumbs

### Decision
Adicionar componente de navegação no header do editor de workflow.

### Rationale
- Requisito explícito: usuário não deve ficar "preso"
- Breadcrumb mostra contexto: Workspace > Projeto > Workflows > [Nome]
- Botão de voltar como alternativa rápida

### Implementation Notes
```typescript
// Breadcrumb structure
<Breadcrumb>
  <BreadcrumbItem href={`/workspace/${workspaceId}`}>
    {workspaceName}
  </BreadcrumbItem>
  <BreadcrumbItem href={`/workspace/${workspaceId}/project/${projectId}`}>
    {projectName}
  </BreadcrumbItem>
  <BreadcrumbItem href={`/workspace/${workspaceId}/project/${projectId}/workflows`}>
    Workflows
  </BreadcrumbItem>
  <BreadcrumbItem current>
    {workflowName}
  </BreadcrumbItem>
</Breadcrumb>
```

## 7. Integração com Ferramentas do Assistente

### Decision
Nós de workflow devem chamar os mesmos serviços que o assistente de IA.

### Rationale
- Garante consistência de comportamento
- Reutiliza código existente
- Mesmos modelos LLM e configurações

### Mapping
| Nó Workflow | Ferramenta Assistente | Serviço Backend |
|-------------|----------------------|-----------------|
| text_generation | chat_completion | llm_service.py |
| image_generation | generate_image | image_generation_service.py |
| context_retrieval | search_documents | tools.py / list_documents_tool |
| attach_creative | attach_asset | tools.py / edit_document_tool |

### Implementation Notes
- Verificar que `node_executor.py` já usa esses serviços
- Ajustar se necessário para paridade completa

## 8. Performance do Canvas

### Decision
- Usar virtualização do ReactFlow para muitos nós
- Lazy loading de configurações de nó
- Debounce em operações de drag

### Rationale
- Workflows podem ter dezenas de nós
- Performance < 100ms para interações
- 60fps em animações

### Implementation Notes
- ReactFlow já tem virtualização built-in
- Evitar re-renders desnecessários com `useMemo`/`useCallback`
- Considerar `react-window` se lista de nós na paleta crescer muito

## Summary of Decisions

| Area | Decision | Confidence |
|------|----------|------------|
| Handle Position | Left/Right horizontal flow | High |
| Glass Effect | Reuse existing pattern from sidebars | High |
| Routing | Nested `/project/[id]/workflows/` | High |
| Template Separation | Tabs + Badge + Different Actions | High |
| Type Validation | Handle data types with onConnect check | Medium |
| Navigation | Breadcrumb + Back button | High |
| Tool Integration | Reuse assistant services | High |
| Performance | ReactFlow virtualization + memoization | High |

**All NEEDS CLARIFICATION items resolved.** Ready for Phase 1.
