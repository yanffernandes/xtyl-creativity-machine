import { memo, useState } from 'react'
import {
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react'
import { X } from 'lucide-react'
import styles from './edges.module.css'

export const CustomEdge = memo(function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    const event = new CustomEvent('flow:deleteEdge', {
      detail: { edgeId: id },
      bubbles: true,
    })
    document.dispatchEvent(event)
  }

  const edgeColor = isHovered || selected ? '#f97316' : '#64748b'
  const edgeWidth = isHovered || selected ? 3 : 2

  return (
    <>
      {/* Base edge using React Flow's BaseEdge component */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth: edgeWidth,
          strokeDasharray: '6 4',
        }}
      />

      {/* Invisible wider path for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      {/* Delete button */}
      <EdgeLabelRenderer>
        {(isHovered || selected) && (
          <div
            className={styles.edgeDeleteWrapper}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            <button
              className={styles.edgeDeleteButton}
              onClick={handleDelete}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              title="Deletar conexão"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
})
