import { useState } from 'react'
import { FolderOpen, ArrowRight } from 'lucide-react'
import { useAdminCourseQuery, useMoveLesson } from '@/features/courses/api'
import { Modal, Button, Spinner } from '@/shared/components'
import styles from './MoveLessonModal.module.css'

interface MoveLessonModalProps {
  isOpen: boolean
  onClose: () => void
  lessonId: string
  lessonTitle: string
  courseId: string
  currentModuleId: string
  onSuccess: () => void
}

export function MoveLessonModal({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  courseId,
  currentModuleId,
  onSuccess,
}: MoveLessonModalProps) {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)

  const { data: course, isLoading } = useAdminCourseQuery(courseId)
  const moveLesson = useMoveLesson()

  const availableModules = course?.course_modules?.filter(
    (m) => m.id !== currentModuleId
  ) || []

  const handleMove = async () => {
    if (!selectedModuleId) return

    try {
      await moveLesson.mutateAsync({
        lessonId,
        newModuleId: selectedModuleId,
      })
      onSuccess()
    } catch (error) {
      console.error('Error moving lesson:', error)
    }
  }

  const handleClose = () => {
    setSelectedModuleId(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" title="Mover Aula">
      <p className={styles.text}>
        Mover <strong>{lessonTitle}</strong> para:
      </p>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="md" />
        </div>
      ) : availableModules.length === 0 ? (
        <div className={styles.emptyState}>
          <FolderOpen size={32} strokeWidth={1.5} />
          <p>Não há outros módulos disponíveis</p>
          <span>Crie outro módulo para mover esta aula</span>
        </div>
      ) : (
        <div className={styles.moduleList}>
          {availableModules.map((module) => (
            <button
              key={module.id}
              className={`${styles.moduleOption} ${
                selectedModuleId === module.id ? styles.selected : ''
              }`}
              onClick={() => setSelectedModuleId(module.id)}
              type="button"
            >
              <div className={styles.moduleInfo}>
                <FolderOpen size={18} />
                <span className={styles.moduleName}>{module.title}</span>
              </div>
              <span className={styles.lessonCount}>
                {module.lessons?.length || 0} aulas
              </span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <Button variant="ghost" onClick={handleClose}>
          Cancelar
        </Button>
        <Button
          onClick={handleMove}
          isLoading={moveLesson.isPending}
          disabled={!selectedModuleId}
        >
          <ArrowRight size={16} />
          Mover
        </Button>
      </div>
    </Modal>
  )
}
