import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import styles from './KanbanBoard.module.css'
import { KanbanCard } from './KanbanCard'
import { KanbanColumn } from './KanbanColumn'
import type { Task, TaskStatus } from '../types'

const COLUMNS: TaskStatus[] = ['to_do', 'in_progress', 'done', 'blocked']

interface KanbanBoardProps {
  tasks: Task[]
  onTaskMove: (taskId: string, newStatus: TaskStatus, newIndex: number) => void
  onAddTask: (status: TaskStatus) => void
  onDeleteTask: (task: Task) => void
  onEditTask: (task: Task) => void
}

export function KanbanBoard({
  tasks,
  onTaskMove,
  onAddTask,
  onDeleteTask,
  onEditTask,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      to_do: [],
      in_progress: [],
      done: [],
      blocked: [],
    }

    tasks.forEach((task) => {
      const status = task.status || 'to_do'
      // Only add if the status is valid
      if (grouped[status]) {
        grouped[status].push(task)
      } else {
        // Default to to_do if status is invalid
        grouped['to_do'].push(task)
      }
    })

    // Sort by sort_order within each column
    Object.keys(grouped).forEach((status) => {
      grouped[status as TaskStatus].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    })

    return grouped
  }, [tasks])

  const findTaskById = (id: string): Task | undefined => {
    return tasks.find((t) => t.id === id)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTaskById(event.active.id as string)
    if (task) {
      setActiveTask(task)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = findTaskById(activeId)
    if (!activeTask) return

    // If dropping over a column (not a task)
    if (COLUMNS.includes(overId as TaskStatus)) {
      const newStatus = overId as TaskStatus
      if (activeTask.status !== newStatus) {
        // Will be handled in dragEnd
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = findTaskById(activeId)
    if (!activeTask) return

    // Determine the target column
    let targetStatus: TaskStatus
    let targetIndex: number

    // Check if dropping on a column
    if (COLUMNS.includes(overId as TaskStatus)) {
      targetStatus = overId as TaskStatus
      targetIndex = tasksByStatus[targetStatus].length
    } else {
      // Dropping on another task
      const overTask = findTaskById(overId)
      if (!overTask) return

      targetStatus = overTask.status
      const overIndex = tasksByStatus[targetStatus].findIndex((t) => t.id === overId)
      targetIndex = overIndex
    }

    // Only update if something changed
    if (activeTask.status !== targetStatus || activeId !== overId) {
      onTaskMove(activeId, targetStatus, targetIndex)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.board}>
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onAddTask={onAddTask}
            onDeleteTask={onDeleteTask}
            onEditTask={onEditTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className={styles.dragOverlay}>
            <KanbanCard
              task={activeTask}
              onDelete={() => {}}
              onEdit={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
