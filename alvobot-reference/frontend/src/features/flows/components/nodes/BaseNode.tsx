import { memo, type ReactNode } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { MoreVertical, Edit, AlertTriangle } from 'lucide-react'
import styles from './nodes.module.css'

export interface BaseNodeProps extends NodeProps {
  icon: ReactNode
  title: string
  color: string
  children: ReactNode
  hasInput?: boolean
  hasOutput?: boolean
  isProtected?: boolean
  hasValidationError?: boolean
  hasValidationWarning?: boolean
  validationMessages?: string[]
  onEdit?: () => void
  onDelete?: () => void
  onShowActions?: (event: React.MouseEvent) => void
}

export const BaseNode = memo(function BaseNode({
  icon,
  title,
  color,
  children,
  selected,
  hasInput = true,
  hasOutput = true,
  isProtected = false,
  hasValidationError = false,
  hasValidationWarning = false,
  onEdit,
  onDelete,
  onShowActions,
}: BaseNodeProps) {
  return (
    <div
      className={`${styles.messengerNode} ${selected ? styles.selected : ''}`}
      style={{ '--node-color': color } as React.CSSProperties}
    >
      <div className={styles.nodeHeader}>
        <div className={styles.nodeIcon} style={{ color }}>
          {icon}
        </div>
        <div className={styles.nodeTitle}>{title}</div>

        {(hasValidationError || hasValidationWarning) && (
          <AlertTriangle
            size={16}
            className={`${styles.validationIcon} ${
              hasValidationError ? styles.error : styles.warning
            }`}
          />
        )}

        {!isProtected && (
          <>
            {onShowActions && (
              <button
                className={styles.nodeActions}
                onClick={onShowActions}
                title="Ações"
              >
                <MoreVertical size={14} />
              </button>
            )}
            {onEdit && (
              <button
                className={styles.nodeEdit}
                onClick={onEdit}
                title="Editar"
              >
                <Edit size={14} />
              </button>
            )}
            {onDelete && (
              <button
                className={styles.nodeDelete}
                onClick={onDelete}
                title="Deletar"
              >
                ×
              </button>
            )}
          </>
        )}
      </div>

      <div className={styles.nodeContent}>{children}</div>

      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className={styles.handle}
        />
      )}

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          className={styles.handle}
        />
      )}
    </div>
  )
})
