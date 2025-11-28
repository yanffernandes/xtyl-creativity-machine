# Quickstart: Workflow Visual Redesign

**Feature**: 005-workflow-visual-redesign
**Date**: 2025-11-27

## Overview

Este guia fornece instruções rápidas para implementar as mudanças visuais e estruturais na tela de workflows.

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker e Docker Compose
- Acesso ao repositório `xtyl-creativity-machine`

## Quick Setup

```bash
# 1. Checkout da branch
git checkout 005-workflow-visual-redesign

# 2. Instalar dependências
cd frontend && npm install
cd ../backend && pip install -r requirements.txt

# 3. Iniciar ambiente de desenvolvimento
docker-compose -f docker-compose.dev.yml up -d

# 4. Acessar a aplicação
open http://localhost:3000
```

## Key Changes Summary

### 1. Handle Position (5 min)

Alterar posição dos handles em todos os nós:

```typescript
// frontend/src/components/workflow/nodes/BaseNode.tsx

// ANTES
<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />

// DEPOIS
<Handle type="target" position={Position.Left} />
<Handle type="source" position={Position.Right} />
```

### 2. Floating Glass Sidebars (10 min)

Aplicar efeito glass nas sidebars:

```typescript
// frontend/src/components/workflow/NodePalette.tsx

const floatingGlassClasses = cn(
  "flex flex-col",
  "bg-white/[0.03] dark:bg-white/[0.02]",
  "backdrop-blur-2xl backdrop-saturate-150",
  "border border-white/[0.1]",
  "rounded-2xl",
  "shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.05)_inset]",
  "dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.03)_inset]"
);

// Container com padding para efeito flutuante
<div className="p-3">
  <div className={floatingGlassClasses}>
    {/* conteúdo */}
  </div>
</div>
```

### 3. Project Workflow Route (15 min)

Criar nova rota para workflows por projeto:

```bash
# Criar estrutura de diretórios
mkdir -p frontend/src/app/workspace/\[id\]/project/\[projectId\]/workflows/\[workflowId\]
```

```typescript
// frontend/src/app/workspace/[id]/project/[projectId]/workflows/page.tsx

export default function ProjectWorkflowsPage({
  params
}: {
  params: { id: string; projectId: string }
}) {
  // Listar workflows do projeto
  return (
    <WorkflowList
      workspaceId={params.id}
      projectId={params.projectId}
    />
  );
}
```

### 4. Template vs Workflow Separation (10 min)

Adicionar filtro e visual diferenciado:

```typescript
// Tabs para separação
<Tabs defaultValue="my-workflows">
  <TabsList>
    <TabsTrigger value="my-workflows">Meus Workflows</TabsTrigger>
    <TabsTrigger value="templates">Templates do Sistema</TabsTrigger>
  </TabsList>

  <TabsContent value="my-workflows">
    <WorkflowGrid workflows={userWorkflows} editable />
  </TabsContent>

  <TabsContent value="templates">
    <WorkflowGrid workflows={systemTemplates} editable={false} />
  </TabsContent>
</Tabs>
```

### 5. Navigation Header (10 min)

Adicionar breadcrumb e botão voltar:

```typescript
// frontend/src/components/workflow/WorkflowHeader.tsx

export function WorkflowHeader({
  workspaceName,
  projectName,
  workflowName,
  onBack
}: WorkflowHeaderProps) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-white/10">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <Breadcrumb>
        <BreadcrumbItem>{workspaceName}</BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>{projectName}</BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>Workflows</BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem className="text-primary">{workflowName}</BreadcrumbItem>
      </Breadcrumb>
    </div>
  );
}
```

### 6. Connection Validation (15 min)

Implementar validação de tipos:

```typescript
// frontend/src/hooks/useValidateConnection.ts

export function useValidateConnection() {
  const validateConnection = useCallback((connection: Connection) => {
    const sourceNode = getNode(connection.source);
    const targetNode = getNode(connection.target);

    if (!sourceNode || !targetNode) return false;

    const sourceConfig = NODE_TYPE_CONFIGS[sourceNode.type];
    const targetConfig = NODE_TYPE_CONFIGS[targetNode.type];

    const outputType = sourceConfig.outputType;
    const inputTypes = targetConfig.inputTypes;

    if (outputType === 'any' || inputTypes.includes('any')) {
      return true;
    }

    return inputTypes.includes(outputType);
  }, [getNode]);

  return { validateConnection };
}
```

## Testing Checklist

- [ ] Handles aparecem na posição horizontal (esquerda/direita)
- [ ] Sidebars flutuam sem tocar nas bordas
- [ ] Conexões fluem da esquerda para direita
- [ ] Templates e workflows estão em seções separadas
- [ ] Breadcrumb mostra hierarquia correta
- [ ] Botão voltar funciona em todas as telas
- [ ] Conexões inválidas são impedidas com feedback visual

## Files to Modify

| File | Change Type |
|------|-------------|
| `frontend/src/components/workflow/nodes/BaseNode.tsx` | Handle position |
| `frontend/src/components/workflow/nodes/*.tsx` | Handle position (todos os nós) |
| `frontend/src/components/workflow/NodePalette.tsx` | Glass effect |
| `frontend/src/components/workflow/NodeConfigPanel.tsx` | Glass effect |
| `frontend/src/components/workflow/WorkflowCanvas.tsx` | Layout, validation |
| `frontend/src/app/workspace/[id]/project/[projectId]/workflows/*` | NEW routes |
| `frontend/src/components/workflow/WorkflowHeader.tsx` | NEW component |
| `frontend/src/hooks/useValidateConnection.ts` | NEW hook |
| `backend/routers/workflows.py` | project_id filter |

## Common Issues

### 1. Handles não aparecem corretamente

Verificar se o Position está sendo importado de `reactflow`:

```typescript
import { Handle, Position } from 'reactflow';
```

### 2. Glass effect não funciona

Garantir que `backdrop-filter` está habilitado no Tailwind:

```js
// tailwind.config.ts
{
  theme: {
    extend: {
      backdropBlur: {
        '2xl': '24px',
      }
    }
  }
}
```

### 3. Rota não encontrada

Verificar nomenclatura de pastas dinâmicas:
- Correto: `[id]` (com colchetes)
- Errado: `{id}` ou `:id`

## Next Steps

Após implementar estas mudanças base, execute `/speckit.tasks` para gerar a lista detalhada de tarefas com dependências.
