# Quickstart: Comment Node & Flow Name Display

**Branch**: `20260205-flow-comment-node` | **Date**: 2026-02-05

## Prerequisites

- Node.js 18+
- Frontend development server running (`cd frontend && npm run dev`)
- Access to flow editor (`/flows/:id`)

## Implementation Steps

### Step 1: Add Type Definitions

**File**: `frontend/src/features/flows/types/index.ts`

```typescript
// 1. Add 'comment' to MessengerNodeType
export type MessengerNodeType =
  | 'start'
  | 'text'
  | 'card'
  | 'wait'
  | 'traffic'
  | 'call-flow'
  | 'comment'  // ← ADD
  | 'error'

// 2. Add CommentNodeData interface
export interface CommentNodeData extends BaseNodeData {
  type: 'comment'
  text: string
}

// 3. Add to MessengerNodeData union
export type MessengerNodeData =
  | StartNodeData
  | TextNodeData
  | CardNodeData
  | WaitNodeData
  | TrafficNodeData
  | CallFlowNodeData
  | CommentNodeData  // ← ADD
  | ErrorNodeData

// 4. Add to AVAILABLE_NODE_TYPES array
{
  type: 'comment' as MessengerNodeType,
  title: 'Comentário',
  description: 'Adiciona uma nota ao fluxo',
  icon: 'StickyNote',
  color: '#71717A',
},
```

### Step 2: Create CommentNode Component

**File**: `frontend/src/features/flows/components/nodes/CommentNode.tsx`

```typescript
import { memo } from 'react'
import { StickyNote, Edit, Trash2 } from 'lucide-react'
import styles from './nodes.module.css'
import type { CommentNodeData } from '../../types'

interface CommentNodeProps {
  id: string
  data: CommentNodeData
  selected?: boolean
}

export const CommentNode = memo(function CommentNode({
  id,
  data,
  selected,
}: CommentNodeProps) {
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    document.dispatchEvent(new CustomEvent('flow:editNode', {
      detail: { nodeId: id, data },
      bubbles: true,
    }))
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    document.dispatchEvent(new CustomEvent('flow:deleteNode', {
      detail: { nodeId: id },
      bubbles: true,
    }))
  }

  return (
    <div className={`${styles.node} ${styles.commentNode} ${selected ? styles.selected : ''}`}>
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          <StickyNote size={16} />
        </div>
        <span className={styles.nodeTitle}>Comentário</span>
        <div className={styles.nodeActions}>
          <button className={styles.actionBtn} onClick={handleEdit} title="Editar">
            <Edit size={14} />
          </button>
          <button className={`${styles.actionBtn} ${styles.delete}`} onClick={handleDelete} title="Deletar">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className={styles.nodeContent}>
        <p className={styles.commentText}>{data.text || 'Clique para editar'}</p>
      </div>
      {/* NO HANDLES - comment nodes cannot be connected */}
    </div>
  )
})
```

### Step 3: Register Node Type

**File**: `frontend/src/features/flows/components/nodes/index.ts`

```typescript
import { CommentNode } from './CommentNode'

export { CommentNode } from './CommentNode'

export const nodeTypes = {
  // ... existing types
  comment: CommentNode,  // ← ADD
}
```

### Step 4: Add Styles

**File**: `frontend/src/features/flows/components/nodes/nodes.module.css`

```css
.commentNode {
  background: #fef3c7;  /* Amber 100 - sticky note yellow */
  border-color: #fcd34d;  /* Amber 300 */
  min-width: 180px;
  max-width: 280px;
}

.commentNode .nodeHeader {
  background: #fde68a;  /* Amber 200 */
}

.commentText {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-text-secondary);
  font-style: italic;
  max-height: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

### Step 5: Update FlowEditorPage

**File**: `frontend/src/features/flows/pages/FlowEditorPage.tsx`

```typescript
import { StickyNote } from 'lucide-react'

// 1. Add to DOCK_ITEMS
const DOCK_ITEMS = [
  // ... existing items
  { type: 'comment' as MessengerNodeType, label: 'Comentário', icon: StickyNote },
]

// 2. Add default data
const getDefaultNodeData = (type: MessengerNodeType): MessengerNodeData => {
  switch (type) {
    // ... existing cases
    case 'comment':
      return { type: 'comment', text: 'Comentário' } as CommentNodeData
  }
}

// 3. Enrich nodes with flowName for call-flow nodes
const enrichedNodes = useMemo(() => {
  return nodes.map(node => {
    if (node.type === 'call-flow') {
      const data = node.data as CallFlowNodeData
      if (data.selectedFlowId) {
        const targetFlow = availableFlows.find(f => f.id === data.selectedFlowId)
        return {
          ...node,
          data: { ...data, flowName: targetFlow?.name }
        }
      }
    }
    return node
  })
}, [nodes, availableFlows])

// 4. Use enrichedNodes in ReactFlow
<ReactFlow nodes={enrichedNodes} ... />
```

### Step 6: Add Sidebar Editor

**File**: `frontend/src/features/flows/components/sidebar/NodeEditSidebar.tsx`

```typescript
// Add to the render, after other node type editors:

{/* Comment Node Editor */}
{nodeType === 'comment' && (
  <div className={styles.editForm}>
    <div className={styles.formGroup}>
      <label>Texto do Comentário:</label>
      <textarea
        value={(editData as CommentNodeData).text}
        onChange={(e) =>
          setEditData({
            ...(editData as CommentNodeData),
            text: e.target.value,
          })
        }
        placeholder="Digite seu comentário..."
        rows={6}
      />
    </div>
  </div>
)}
```

### Step 7: Update Validation (if exists)

**File**: `frontend/src/features/flows/utils/validateFlow.ts`

```typescript
// Skip comment nodes in validation
if (node.type === 'comment') continue
```

## Testing Checklist

- [ ] Comment node appears in dock
- [ ] Can drag comment node to canvas
- [ ] Comment node has no connection handles
- [ ] Can edit comment text via sidebar
- [ ] Comment node is saved with flow
- [ ] Comment node loads correctly from saved flow
- [ ] Call-flow nodes show flow name instead of UUID
- [ ] Call-flow nodes show "Nenhum fluxo" when no flow selected
- [ ] Existing flows without comment nodes still work

## Common Issues

### Comment node shows handles
- Check that `CommentNode.tsx` does NOT include any `<Handle>` components

### Flow name not showing
- Verify `enrichedNodes` is being passed to `<ReactFlow>` instead of `nodes`
- Check that `availableFlows` is populated from `useFlowOptions()`

### Comment not saving
- Ensure `CommentNodeData` is added to `MessengerNodeData` union type
- Verify `getDefaultNodeData` has a case for `'comment'`
