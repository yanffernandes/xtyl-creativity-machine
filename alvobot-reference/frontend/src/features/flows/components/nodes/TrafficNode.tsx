import { memo, useMemo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { GitBranch, Edit, Copy, Trash2, AlertCircle } from 'lucide-react'
import styles from './nodes.module.css'
import { useFlowEditorStore } from '../../stores/flowEditorStore'
import { BRANCH_COLORS, type TrafficNodeData  } from '../../types'

// Empty array constant to maintain referential equality
const EMPTY_ERRORS: never[] = []

interface TrafficNodeProps {
  id: string
  data: TrafficNodeData
  selected?: boolean
}

export const TrafficNode = memo(function TrafficNode({
  id,
  data,
  selected,
}: TrafficNodeProps) {
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

  const getBranchColor = (index: number) => {
    return BRANCH_COLORS[index % BRANCH_COLORS.length]
  }

  const branches = data.branches || []

  return (
    <div
      className={`${styles.node} ${styles.trafficNode} ${
        selected ? styles.selected : ''
      } ${hasErrors ? styles.hasError : ''}`}
    >
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          <GitBranch size={16} />
        </div>
        <span className={styles.nodeTitle}>Tráfego</span>

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
        <div className={styles.trafficBranches}>
          {branches.map((branch, index) => (
            <div
              key={branch.id}
              className={styles.branchPreview}
              style={{ borderLeftColor: getBranchColor(index) }}
            >
              <span
                className={styles.branchDot}
                style={{ background: getBranchColor(index) }}
              />
              {branch.label} ({branch.percentage}%)
            </div>
          ))}
        </div>
      </div>

      {/* Target handle - left side */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className={styles.handle}
      />

      {/* Multiple source handles - one for each branch */}
      {branches.map((branch, index) => (
        <Handle
          key={`handle-${branch.id}`}
          id={`source-${index}`}
          type="source"
          position={Position.Right}
          className={styles.handle}
          style={{
            top: `${72 + index * 34}px`,
            background: getBranchColor(index),
            borderColor: getBranchColor(index),
          }}
        />
      ))}
    </div>
  )
})
