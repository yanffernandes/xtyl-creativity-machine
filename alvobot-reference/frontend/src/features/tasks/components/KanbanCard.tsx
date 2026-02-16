import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Clock, Calendar } from 'lucide-react'
import styles from './KanbanCard.module.css'
import type { Task } from '../types'

interface KanbanCardProps {
  task: Task
  onDelete: (task: Task) => void
  onEdit: (task: Task) => void
}

export function KanbanCard({ task, onDelete, onEdit }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }

  const formatEstimatedTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      onClick={() => onEdit(task)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onEdit(task)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.dragHandle} {...attributes} {...listeners}>
        <GripVertical size={14} />
      </div>

      <div className={styles.content}>
        <h4 className={styles.name}>{task.name}</h4>

        {task.description && (
          <p className={styles.description}>{task.description}</p>
        )}

        {task.completion_percentage > 0 && task.completion_percentage < 100 && (
          <div className={styles.progress}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${task.completion_percentage}%` }}
              />
            </div>
            <span className={styles.progressText}>{task.completion_percentage}%</span>
          </div>
        )}

        <div className={styles.meta}>
          {task.estimated_time && (
            <span className={styles.metaItem}>
              <Clock size={12} />
              {formatEstimatedTime(task.estimated_time)}
            </span>
          )}
          {task.created_at && (
            <span className={styles.metaItem}>
              <Calendar size={12} />
              {formatDate(task.created_at)}
            </span>
          )}
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className={styles.tags}>
            {task.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className={styles.tagMore}>+{task.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <button
        className={styles.deleteButton}
        onClick={(e) => {
          e.stopPropagation()
          onDelete(task)
        }}
        aria-label="Excluir tarefa"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
