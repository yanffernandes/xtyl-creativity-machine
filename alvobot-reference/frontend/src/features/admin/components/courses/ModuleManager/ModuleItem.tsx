import { useId, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  Video,
} from 'lucide-react'
import {
  useUpdateModule,
  useDeleteModule,
  useCreateLesson,
} from '@/features/courses/api'
import type { CourseModuleWithLessons, CreateLessonRequest, VisibilityType } from '@/features/courses/types'
import { Modal, Input, Button } from '@/shared/components'
import { LessonItem } from './LessonItem'
import styles from './ModuleManager.module.css'
import { LessonForm } from '../LessonForm/LessonForm'
import { ModuleVisibilityToggle } from '../ModuleVisibilityToggle/ModuleVisibilityToggle'

interface ModuleItemProps {
  module: CourseModuleWithLessons
  index: number
  courseId: string
  courseVisibility: VisibilityType
  availablePlans?: Array<{ id: number; name: string }>
  onRefresh: () => void
}

export function ModuleItem({
  module,
  index,
  courseId,
  courseVisibility,
  availablePlans = [],
  onRefresh,
}: ModuleItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddLessonModal, setShowAddLessonModal] = useState(false)
  const [editTitle, setEditTitle] = useState(module.title)
  const [editDescription, setEditDescription] = useState(module.description || '')
  const descriptionId = useId()

  const updateModule = useUpdateModule()
  const deleteModule = useDeleteModule()
  const createLesson = useCreateLesson()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleEditSave = async () => {
    try {
      await updateModule.mutateAsync({
        id: module.id,
        title: editTitle,
        description: editDescription || undefined,
      })
      setShowEditModal(false)
      onRefresh()
    } catch (error) {
      console.error('Error updating module:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteModule.mutateAsync(module.id)
      setShowDeleteModal(false)
      onRefresh()
    } catch (error) {
      console.error('Error deleting module:', error)
    }
  }

  const handleAddLesson = async (data: Omit<CreateLessonRequest, 'module_id'>) => {
    try {
      await createLesson.mutateAsync({
        module_id: module.id,
        ...data,
      })
      setShowAddLessonModal(false)
      onRefresh()
    } catch (error) {
      console.error('Error creating lesson:', error)
    }
  }

  const handleVisibilityChange = async (data: {
    visibility_override: VisibilityType | null
    plan_ids_override: number[] | null
    user_ids_override: string[] | null
  }) => {
    try {
      await updateModule.mutateAsync({
        id: module.id,
        visibility_override: data.visibility_override,
        plan_ids_override: data.plan_ids_override,
        user_ids_override: data.user_ids_override,
      })
      onRefresh()
    } catch (error) {
      console.error('Error updating module visibility:', error)
    }
  }

  const lessonsCount = module.lessons?.length || 0
  const totalDuration = module.lessons?.reduce(
    (acc, l) => acc + (l.duration_minutes || 0),
    0
  ) || 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.moduleItem} ${isDragging ? styles.dragging : ''}`}
    >
      <div className={styles.moduleHeader}>
        <div className={styles.moduleLeft}>
          <button
            className={styles.dragHandle}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={18} />
          </button>

          <button
            className={styles.expandButton}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>

          <div className={styles.moduleInfo}>
            <span className={styles.moduleIndex}>Módulo {index + 1}</span>
            <h3 className={styles.moduleTitle}>{module.title}</h3>
            <span className={styles.moduleStats}>
              {lessonsCount} {lessonsCount === 1 ? 'aula' : 'aulas'}
              {totalDuration > 0 && ` • ${totalDuration} min`}
            </span>
          </div>
        </div>

        <div className={styles.moduleActions}>
          <ModuleVisibilityToggle
            currentOverride={module.visibility_override}
            planIdsOverride={module.plan_ids_override}
            userIdsOverride={module.user_ids_override}
            courseVisibility={courseVisibility}
            availablePlans={availablePlans}
            onSave={handleVisibilityChange}
            isLoading={updateModule.isPending}
          />
          <button
            className={styles.iconButton}
            onClick={() => setShowAddLessonModal(true)}
            title="Adicionar aula"
          >
            <Plus size={16} />
          </button>
          <button
            className={styles.iconButton}
            onClick={() => {
              setEditTitle(module.title)
              setEditDescription(module.description || '')
              setShowEditModal(true)
            }}
            title="Editar módulo"
          >
            <Edit2 size={16} />
          </button>
          <button
            className={`${styles.iconButton} ${styles.danger}`}
            onClick={() => setShowDeleteModal(true)}
            title="Excluir módulo"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.lessonsList}>
          {module.lessons && module.lessons.length > 0 ? (
            module.lessons.map((lesson, lessonIndex) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                index={lessonIndex}
                courseId={courseId}
                moduleId={module.id}
                onRefresh={onRefresh}
              />
            ))
          ) : (
            <div className={styles.emptyLessons}>
              <Video size={24} strokeWidth={1.5} />
              <span>Nenhuma aula neste módulo</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddLessonModal(true)}
              >
                <Plus size={14} />
                Adicionar Aula
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Module Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        size="sm"
        title="Editar Módulo"
      >
        <div className={styles.modalForm}>
          <Input
            label="Nome do Módulo"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={descriptionId}>Descrição (opcional)</label>
            <textarea
              id={descriptionId}
              className={styles.textarea}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Descreva o conteúdo deste módulo..."
              rows={3}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setShowEditModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleEditSave}
            isLoading={updateModule.isPending}
            disabled={!editTitle.trim()}
          >
            Salvar
          </Button>
        </div>
      </Modal>

      {/* Delete Module Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        size="sm"
        title="Excluir Módulo"
      >
        <p className={styles.deleteText}>
          Tem certeza que deseja excluir o módulo{' '}
          <strong>{module.title}</strong>?
        </p>
        {lessonsCount > 0 && (
          <p className={styles.deleteWarning}>
            Todas as {lessonsCount} {lessonsCount === 1 ? 'aula' : 'aulas'} deste
            módulo serão excluídas permanentemente.
          </p>
        )}
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteModule.isPending}
          >
            Excluir
          </Button>
        </div>
      </Modal>

      {/* Add Lesson Modal */}
      <LessonForm
        isOpen={showAddLessonModal}
        onClose={() => setShowAddLessonModal(false)}
        onSubmit={handleAddLesson}
        isLoading={createLesson.isPending}
      />
    </div>
  )
}
