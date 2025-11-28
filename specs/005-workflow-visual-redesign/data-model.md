# Data Model: Workflow Visual Redesign

**Feature**: 005-workflow-visual-redesign
**Date**: 2025-11-27

## Overview

Esta feature é primariamente de UI/UX e não requer alterações significativas no modelo de dados. Os modelos existentes já suportam a estrutura necessária. Este documento documenta os modelos relevantes e pequenas extensões propostas.

## Existing Entities (No Changes Required)

### WorkflowTemplate

Modelo existente que já suporta a separação templates/workflows.

```
WorkflowTemplate
├── id: UUID (PK)
├── workspace_id: UUID (FK → Workspace, nullable for system templates)
├── project_id: UUID (FK → Project, nullable for workspace-level templates)
├── name: String
├── description: String
├── category: String
├── nodes_json: JSONB
├── edges_json: JSONB
├── is_system: Boolean (true = template do sistema, read-only)
├── is_recommended: Boolean
├── usage_count: Integer
├── created_by: UUID (FK → User, nullable for system)
├── created_at: DateTime
└── updated_at: DateTime
```

**Relationships**:
- Workspace (many-to-one, optional)
- Project (many-to-one, optional)
- User/created_by (many-to-one, optional)
- WorkflowExecution (one-to-many)

**Business Rules**:
- `is_system=true` → Template do sistema, não pode ser editado
- `project_id=null` → Template de workspace ou sistema
- `project_id≠null` → Workflow de projeto (editável pelo owner)

### WorkflowExecution

```
WorkflowExecution
├── id: UUID (PK)
├── template_id: UUID (FK → WorkflowTemplate)
├── project_id: UUID (FK → Project)
├── workspace_id: UUID (FK → Workspace)
├── user_id: UUID (FK → User)
├── status: Enum (pending, running, paused, completed, failed, stopped)
├── config_json: JSONB
├── progress_percent: Integer
├── current_node_id: String (nullable)
├── total_cost: Decimal
├── total_tokens_used: Integer
├── error_message: String (nullable)
├── started_at: DateTime (nullable)
├── completed_at: DateTime (nullable)
├── created_at: DateTime
└── updated_at: DateTime
```

**State Transitions**:
```
pending → running → completed
                 → paused (on node failure) → running (after user intervention)
                                            → stopped (user aborts)
                 → failed (unrecoverable)
                 → stopped (user cancels)
```

### WorkflowNode (JSON Structure within nodes_json)

```typescript
interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

type NodeType =
  | 'start'
  | 'finish'
  | 'text_generation'
  | 'image_generation'
  | 'conditional'
  | 'loop'
  | 'context_retrieval'
  | 'processing'
  | 'attach_creative';

interface NodeData {
  label: string;
  // Type-specific fields...
}
```

### WorkflowEdge (JSON Structure within edges_json)

```typescript
interface WorkflowEdge {
  id: string;
  source: string;      // Node ID
  target: string;      // Node ID
  sourceHandle?: string;
  targetHandle?: string;
}
```

## Proposed Extensions

### 1. Node Handle Type Metadata (Frontend Only)

Não requer alteração no banco. Metadados de tipo para validação de conexões são definidos no frontend.

```typescript
// frontend/src/lib/workflow-types.ts

export type HandleDataType = 'text' | 'image' | 'json' | 'any';

export interface NodeTypeConfig {
  type: NodeType;
  label: string;
  icon: string;
  color: string;
  inputTypes: HandleDataType[];  // Tipos aceitos como entrada
  outputType: HandleDataType;    // Tipo produzido na saída
}

export const NODE_TYPE_CONFIGS: Record<NodeType, NodeTypeConfig> = {
  start: {
    type: 'start',
    label: 'Start',
    icon: 'Play',
    color: 'green',
    inputTypes: [],
    outputType: 'any'
  },
  text_generation: {
    type: 'text_generation',
    label: 'Text Generation',
    icon: 'Type',
    color: 'purple',
    inputTypes: ['text', 'json', 'any'],
    outputType: 'text'
  },
  image_generation: {
    type: 'image_generation',
    label: 'Image Generation',
    icon: 'Image',
    color: 'pink',
    inputTypes: ['text'],
    outputType: 'image'
  },
  context_retrieval: {
    type: 'context_retrieval',
    label: 'Context Retrieval',
    icon: 'Database',
    color: 'yellow',
    inputTypes: ['text', 'any'],
    outputType: 'json'
  },
  processing: {
    type: 'processing',
    label: 'Processing',
    icon: 'Cpu',
    color: 'cyan',
    inputTypes: ['text', 'json', 'image', 'any'],
    outputType: 'any'
  },
  attach_creative: {
    type: 'attach_creative',
    label: 'Attach Creative',
    icon: 'Paperclip',
    color: 'indigo',
    inputTypes: ['image', 'text', 'json'],
    outputType: 'json'
  },
  conditional: {
    type: 'conditional',
    label: 'Conditional',
    icon: 'GitBranch',
    color: 'orange',
    inputTypes: ['text', 'json', 'any'],
    outputType: 'any'
  },
  loop: {
    type: 'loop',
    label: 'Loop',
    icon: 'Repeat',
    color: 'blue',
    inputTypes: ['json', 'any'],
    outputType: 'any'
  },
  finish: {
    type: 'finish',
    label: 'Finish',
    icon: 'Square',
    color: 'red',
    inputTypes: ['text', 'json', 'image', 'any'],
    outputType: 'any'
  }
};
```

### 2. Workflow Filters (Backend Query)

Novo parâmetro de query para filtrar workflows por projeto.

```python
# backend/routers/workflows.py

@router.get("/templates")
async def list_templates(
    workspace_id: UUID,
    project_id: Optional[UUID] = None,  # NEW: Filter by project
    is_system: Optional[bool] = None,   # Filter system vs user templates
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(WorkflowTemplate)

    if is_system is not None:
        query = query.filter(WorkflowTemplate.is_system == is_system)

    if project_id:
        # Workflows específicos do projeto
        query = query.filter(WorkflowTemplate.project_id == project_id)
    else:
        # Templates de workspace (sem projeto específico)
        query = query.filter(WorkflowTemplate.project_id.is_(None))

    # ... resto da lógica
```

## Entity Relationship Diagram

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│    Workspace    │──┬──│   WorkflowTemplate   │──┬──│     Project     │
└─────────────────┘  │  └──────────────────────┘  │  └─────────────────┘
                     │            │               │
                     │            │ is_system     │
                     │            │ project_id    │
                     │            │               │
                     │  ┌─────────┴─────────┐     │
                     │  │                   │     │
                     │  ▼                   ▼     │
                     │  Template           Workflow
                     │  (is_system=true    (project_id≠null)
                     │   project_id=null)
                     │
                     └──────────────────────────────┐
                                                    │
                     ┌──────────────────────┐       │
                     │  WorkflowExecution   │───────┘
                     └──────────────────────┘
                               │
                               ▼
                     ┌──────────────────────┐
                     │      AgentJob        │
                     └──────────────────────┘
```

## Validation Rules

### Connection Validation

```typescript
function isConnectionValid(
  sourceNode: WorkflowNode,
  targetNode: WorkflowNode
): boolean {
  const sourceConfig = NODE_TYPE_CONFIGS[sourceNode.type];
  const targetConfig = NODE_TYPE_CONFIGS[targetNode.type];

  const sourceOutputType = sourceConfig.outputType;
  const targetInputTypes = targetConfig.inputTypes;

  // 'any' aceita qualquer tipo
  if (sourceOutputType === 'any' || targetInputTypes.includes('any')) {
    return true;
  }

  return targetInputTypes.includes(sourceOutputType);
}
```

### Workflow Deletion Validation

```python
def can_delete_workflow(workflow_id: UUID, db: Session) -> tuple[bool, str]:
    # Check if any execution is running
    running = db.query(WorkflowExecution).filter(
        WorkflowExecution.template_id == workflow_id,
        WorkflowExecution.status.in_(['pending', 'running', 'paused'])
    ).first()

    if running:
        return False, "Workflow has active executions"

    return True, ""
```

### Duplicate Naming

```python
def get_unique_workflow_name(base_name: str, project_id: UUID, db: Session) -> str:
    existing = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.project_id == project_id,
        WorkflowTemplate.name.like(f"{base_name}%")
    ).all()

    if not any(w.name == base_name for w in existing):
        return base_name

    # Find next available number
    max_num = 1
    for w in existing:
        match = re.match(rf"^{re.escape(base_name)} \((\d+)\)$", w.name)
        if match:
            max_num = max(max_num, int(match.group(1)))

    return f"{base_name} ({max_num + 1})"
```

## Migration Notes

**No database migrations required** for this feature. All changes are:
1. Frontend UI/UX modifications
2. Query parameter additions (backward compatible)
3. Frontend-only type metadata

Existing data remains fully compatible.
