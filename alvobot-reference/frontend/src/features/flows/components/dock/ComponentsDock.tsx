import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Image,
  Clock,
  GitBranch,
  Workflow,
} from 'lucide-react'
import styles from './dock.module.css'
import type { MessengerNodeType } from '../../types'

interface ComponentsDockProps {
  onAddNode: (type: MessengerNodeType) => void
  onDragStart: (type: MessengerNodeType, event: React.DragEvent) => void
}

// Dock items configuration - matching WeWeb
const DOCK_ITEMS = [
  {
    type: 'text' as MessengerNodeType,
    title: 'Texto',
    icon: MessageSquare,
  },
  {
    type: 'card' as MessengerNodeType,
    title: 'Imagem',
    icon: Image,
  },
  {
    type: 'traffic' as MessengerNodeType,
    title: 'Tráfego',
    icon: GitBranch,
  },
  {
    type: 'wait' as MessengerNodeType,
    title: 'Aguardar',
    icon: Clock,
  },
  {
    type: 'call-flow' as MessengerNodeType,
    title: 'Chamar Fluxo',
    icon: Workflow,
  },
]

export function ComponentsDock({ onAddNode, onDragStart }: ComponentsDockProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleDragStart = (type: MessengerNodeType, event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
    onDragStart(type, event)
  }

  return (
    <div className={`${styles.dock} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* Collapse Toggle Button */}
      <button
        className={styles.collapseBtn}
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expandir painel' : 'Retrair painel'}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Dock Content */}
      <div className={styles.dockContent}>
        {DOCK_ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            className={styles.dockItem}
            draggable
            onClick={() => onAddNode(item.type)}
            onDragStart={(e) => handleDragStart(item.type, e)}
            title={item.title}
          >
            <div className={styles.itemIcon}>
              <item.icon size={20} />
            </div>
            {!isCollapsed && (
              <span className={styles.itemLabel}>{item.title}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
