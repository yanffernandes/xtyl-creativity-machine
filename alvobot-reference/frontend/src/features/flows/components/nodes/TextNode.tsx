import { memo, useMemo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { MessageSquare, Edit, Copy, Trash2, Circle, AlertCircle } from 'lucide-react'
import styles from './nodes.module.css'
import { useFlowEditorStore } from '../../stores/flowEditorStore'
import type { TextNodeData } from '../../types'

// Empty array constant to maintain referential equality
const EMPTY_ERRORS: never[] = []

interface TextNodeProps {
  id: string
  data: TextNodeData
  selected?: boolean
}

export const TextNode = memo(function TextNode({
  id,
  data,
  selected,
}: TextNodeProps) {
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

  return (
    <div
      className={`${styles.node} ${styles.textNode} ${
        selected ? styles.selected : ''
      } ${hasErrors ? styles.hasError : ''}`}
    >
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          <MessageSquare size={16} />
        </div>
        <span className={styles.nodeTitle}>Texto</span>

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
          {data.text || 'Digite sua mensagem...'}
        </p>

        {data.buttons && data.buttons.length > 0 && (
          <div className={styles.nodeButtons}>
            {data.buttons.map((button, index) => (
              <div key={button.id} className={styles.buttonPreview}>
                <Circle size={10} />
                {button.label || `Botão ${index + 1}`}
              </div>
            ))}
          </div>
        )}
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
