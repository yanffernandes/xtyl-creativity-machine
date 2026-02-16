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
      className={`${styles.node} ${styles.commentNode} ${
        selected ? styles.selected : ''
      }`}
    >
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
        <p className={styles.commentText}>
          {data.text || 'Clique para editar...'}
        </p>
      </div>

      {/* NO HANDLES - comment nodes cannot be connected */}
    </div>
  )
})
