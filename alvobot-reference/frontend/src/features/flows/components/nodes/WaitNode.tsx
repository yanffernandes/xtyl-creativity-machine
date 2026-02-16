import { memo, useMemo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Clock, Edit, Copy, Trash2, AlertCircle } from 'lucide-react'
import styles from './nodes.module.css'
import { useFlowEditorStore } from '../../stores/flowEditorStore'
import type { WaitNodeData } from '../../types'

// Empty array constant to maintain referential equality
const EMPTY_ERRORS: never[] = []

interface WaitNodeProps {
  id: string
  data: WaitNodeData
  selected?: boolean
}

export const WaitNode = memo(function WaitNode({
  id,
  data,
  selected,
}: WaitNodeProps) {
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

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const event = new CustomEvent('flow:duplicateNode', {
      detail: { nodeId: id, data },
      bubbles: true,
    })
    document.dispatchEvent(event)
  }

  const getTimeUnitLabel = (unit: string) => {
    switch (unit) {
      case 'minutes':
        return 'minuto(s)'
      case 'hours':
        return 'hora(s)'
      case 'days':
        return 'dia(s)'
      default:
        return 'segundo(s)'
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={`${styles.node} ${styles.waitNode} ${
        selected ? styles.selected : ''
      } ${hasErrors ? styles.hasError : ''}`}
      onDoubleClick={handleEdit}
    >
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          <Clock size={16} />
        </div>
        <span className={styles.nodeTitle}>Aguardar</span>

        {hasErrors && (
          <div className={styles.errorBadge} title={nodeErrors.map(e => e.message).join('\n')}>
            <AlertCircle size={14} />
          </div>
        )}

        <div className={styles.nodeActions}>
          <button className={styles.actionBtn} onClick={handleEdit} title="Editar">
            <Edit size={14} />
          </button>
          <button className={styles.actionBtn} onClick={handleDuplicate} title="Duplicar">
            <Copy size={14} />
          </button>
          <button className={`${styles.actionBtn} ${styles.delete}`} onClick={handleDelete} title="Deletar">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className={styles.nodeContent}>
        <p className={styles.nodeText}>
          Aguardar {data.duration || '5'} {getTimeUnitLabel(data.timeUnit)}
        </p>
      </div>

      {/* Target handle - left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className={styles.handle}
      />

      {/* Source handle - right side */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className={styles.handle}
      />
    </div>
  )
})
