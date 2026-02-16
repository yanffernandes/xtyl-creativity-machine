import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { FolderOpen } from 'lucide-react'
import { useReorderModules } from '@/features/courses/api'
import type { CourseModuleWithLessons, VisibilityType } from '@/features/courses/types'
import { ModuleItem } from './ModuleItem'
import styles from './ModuleManager.module.css'

interface ModuleManagerProps {
  courseId: string
  modules: CourseModuleWithLessons[]
  courseVisibility: VisibilityType
  availablePlans?: Array<{ id: number; name: string }>
  onRefresh: () => void
}

export function ModuleManager({
  courseId,
  modules,
  courseVisibility,
  availablePlans = [],
  onRefresh,
}: ModuleManagerProps) {
  const [localModules, setLocalModules] = useState(modules)
  const reorderModules = useReorderModules()

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

  // Keep local state in sync with props
  if (modules !== localModules && JSON.stringify(modules) !== JSON.stringify(localModules)) {
    setLocalModules(modules)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localModules.findIndex((m) => m.id === active.id)
      const newIndex = localModules.findIndex((m) => m.id === over.id)

      const newOrder = arrayMove(localModules, oldIndex, newIndex)
      setLocalModules(newOrder)

      // Save new order to database
      try {
        await reorderModules.mutateAsync(
          newOrder.map((m, index) => ({
            id: m.id,
            order_index: index,
          }))
        )
        onRefresh()
      } catch (error) {
        console.error('Error reordering modules:', error)
        // Revert on error
        setLocalModules(modules)
      }
    }
  }

  if (localModules.length === 0) {
    return (
      <div className={styles.emptyState}>
        <FolderOpen size={48} strokeWidth={1.5} />
        <h3>Nenhum módulo ainda</h3>
        <p>Adicione módulos para organizar as aulas do curso</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localModules.map((m) => m.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.modulesList}>
          {localModules.map((module, index) => (
            <ModuleItem
              key={module.id}
              module={module}
              index={index}
              courseId={courseId}
              courseVisibility={courseVisibility}
              availablePlans={availablePlans}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
