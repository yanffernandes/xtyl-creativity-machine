import { useState } from 'react'
import {
  Video,
  Edit2,
  Trash2,
  Eye,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { useUpdateLesson, useDeleteLesson } from '@/features/courses/api'
import type { Lesson, UpdateLessonRequest } from '@/features/courses/types'
import { formatDuration, getThumbnailUrl } from '@/features/courses/utils/youtube'
import { Modal, Button } from '@/shared/components'
import styles from './ModuleManager.module.css'
import { LessonForm } from '../LessonForm/LessonForm'
import { MoveLessonModal } from '../MoveLessonModal/MoveLessonModal'

interface LessonItemProps {
  lesson: Lesson
  index: number
  courseId: string
  moduleId: string
  onRefresh: () => void
}

export function LessonItem({
  lesson,
  index,
  courseId,
  moduleId,
  onRefresh,
}: LessonItemProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)

  const updateLesson = useUpdateLesson()
  const deleteLesson = useDeleteLesson()

  const handleEditSave = async (data: Omit<UpdateLessonRequest, 'module_id'>) => {
    try {
      await updateLesson.mutateAsync({
        id: lesson.id,
        ...data,
      })
      setShowEditModal(false)
      onRefresh()
    } catch (error) {
      console.error('Error updating lesson:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteLesson.mutateAsync(lesson.id)
      setShowDeleteModal(false)
      onRefresh()
    } catch (error) {
      console.error('Error deleting lesson:', error)
    }
  }

  const thumbnailUrl = lesson.youtube_video_id
    ? getThumbnailUrl(lesson.youtube_video_id, 'default')
    : null

  return (
    <div className={styles.lessonItem}>
      <div className={styles.lessonLeft}>
        <div className={styles.lessonThumbnail}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" />
          ) : (
            <Video size={20} />
          )}
          {lesson.duration_minutes && (
            <span className={styles.lessonDuration}>
              {formatDuration(lesson.duration_minutes)}
            </span>
          )}
        </div>

        <div className={styles.lessonInfo}>
          <div className={styles.lessonTitleRow}>
            <span className={styles.lessonNumber}>{index + 1}.</span>
            <h4 className={styles.lessonTitle}>{lesson.title}</h4>
            {lesson.is_free_preview && (
              <span className={styles.previewBadge}>
                <Eye size={12} />
                Preview
              </span>
            )}
          </div>
          {lesson.description && (
            <p className={styles.lessonDescription}>{lesson.description}</p>
          )}
        </div>
      </div>

      <div className={styles.lessonActions}>
        <a
          href={lesson.youtube_url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.iconButton}
          title="Abrir no YouTube"
        >
          <ExternalLink size={16} />
        </a>
        <button
          className={styles.iconButton}
          onClick={() => setShowMoveModal(true)}
          title="Mover para outro módulo"
        >
          <ArrowRight size={16} />
        </button>
        <button
          className={styles.iconButton}
          onClick={() => setShowEditModal(true)}
          title="Editar aula"
        >
          <Edit2 size={16} />
        </button>
        <button
          className={`${styles.iconButton} ${styles.danger}`}
          onClick={() => setShowDeleteModal(true)}
          title="Excluir aula"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Edit Lesson Modal */}
      <LessonForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleEditSave}
        lesson={lesson}
        isLoading={updateLesson.isPending}
      />

      {/* Move Lesson Modal */}
      <MoveLessonModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        courseId={courseId}
        currentModuleId={moduleId}
        onSuccess={() => {
          setShowMoveModal(false)
          onRefresh()
        }}
      />

      {/* Delete Lesson Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        size="sm"
        title="Excluir Aula"
      >
        <p className={styles.deleteText}>
          Tem certeza que deseja excluir a aula{' '}
          <strong>{lesson.title}</strong>?
        </p>
        <p className={styles.deleteWarning}>
          O progresso dos usuários nesta aula será perdido permanentemente.
        </p>
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={deleteLesson.isPending}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}
