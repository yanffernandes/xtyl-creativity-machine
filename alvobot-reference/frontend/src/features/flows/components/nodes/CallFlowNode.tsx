import { memo, useMemo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Workflow, Edit, Trash2, AlertCircle } from 'lucide-react'
import styles from './nodes.module.css'
import { useFlowEditorStore } from '../../stores/flowEditorStore'
import type { CallFlowNodeData } from '../../types'

// Empty array constant to maintain referential equality
const EMPTY_ERRORS: never[] = []

interface CallFlowNodeProps {
  id: string
  data: CallFlowNodeData & { flowName?: string }
  selected?: boolean
}

export const CallFlowNode = memo(function CallFlowNode({
  id,
  data,
  selected,
}: CallFlowNodeProps) {
  const nodeErrorsMap = useFlowEditorStore((state) => state.nodeErrors)
  const nodeErrors = useMemo(() => nodeErrorsMap.get(id) || EMPTY_ERRORS, [nodeErrorsMap, id])
  const hasErrors = nodeErrors.length > 0
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    const event = new CustomEvent('flow:editNode', {
      detail: { nodeId: id, data },
      bubbles: true,
    })
    document.dispatchEvent(event)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    const event = new CustomEvent('flow:deleteNode', {
      detail: { nodeId: id },
      bubbles: true,
    })
    document.dispatchEvent(event)
  }

  return (
    <div
      className={`${styles.node} ${styles.callFlowNode} ${
        selected ? styles.selected : ''
      } ${hasErrors ? styles.hasError : ''}`}
    >
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          <Workflow size={16} />
        </div>
        <span className={styles.nodeTitle}>Chamar Fluxo</span>

        {hasErrors && (
          <div className={styles.errorBadge} title={nodeErrors.map(e => e.message).join('\n')}>
            <AlertCircle size={14} />
          </div>
        )}

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
        <p className={styles.nodeText}>
          Executar: <strong>{data.flowName || data.selectedFlowId || 'Nenhum fluxo'}</strong>
        </p>
      </div>

      {/* Target handle - left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className={styles.handle}
      />
    </div>
  )
})
