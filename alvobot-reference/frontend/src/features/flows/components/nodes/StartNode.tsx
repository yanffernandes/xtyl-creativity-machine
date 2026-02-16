import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Rocket } from 'lucide-react'
import styles from './nodes.module.css'

interface StartNodeProps {
  id: string
  selected?: boolean
}

export const StartNode = memo(function StartNode({
  selected,
}: StartNodeProps) {
  return (
    <div
      className={`${styles.node} ${styles.startNode} ${
        selected ? styles.selected : ''
      }`}
    >
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon}>
          <Rocket size={16} />
        </div>
        <span className={styles.nodeTitle}>Início</span>
      </div>

      <div className={styles.nodeBody}>
        <p className={styles.nodeDescription}>Ponto de partida do fluxo</p>
      </div>

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
