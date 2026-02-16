import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Circle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { KanbanCard } from './KanbanCard'
import styles from './KanbanColumn.module.css'
import type { Task, TaskStatus } from '../types'

const statusConfig: Record<TaskStatus, {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  colorClass: string
}> = {
  to_do: { label: 'A Fazer', icon: Circle, colorClass: styles.statusTodo },
  in_progress: { label: 'Em Progresso', icon: Clock, colorClass: styles.statusInProgress },
  done: { label: 'Concluído', icon: CheckCircle2, colorClass: styles.statusDone },
  blocked: { label: 'Bloqueado', icon: XCircle, colorClass: styles.statusBlocked },
}

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onAddTask: (status: TaskStatus) => void
  onDeleteTask: (task: Task) => void
  onEditTask: (task: Task) => void
}

export function KanbanColumn({
  status,
  tasks,
  onAddTask,
  onDeleteTask,
  onEditTask,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className={`${styles.column} ${isOver ? styles.columnOver : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <StatusIcon size={16} className={config.colorClass} />
          <span className={styles.title}>{config.label}</span>
          <span className={styles.count}>{tasks.length}</span>
        </div>
        <button
          className={styles.addButton}
          onClick={() => onAddTask(status)}
          aria-label={`Adicionar tarefa em ${config.label}`}
        >
          <Plus size={16} />
        </button>
      </div>

      <div ref={setNodeRef} className={styles.taskList}>
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              onDelete={onDeleteTask}
              onEdit={onEditTask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className={styles.emptyState}>
            <p>Nenhuma tarefa</p>
            <button
              className={styles.emptyAddButton}
              onClick={() => onAddTask(status)}
            >
              <Plus size={14} />
              Adicionar tarefa
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
