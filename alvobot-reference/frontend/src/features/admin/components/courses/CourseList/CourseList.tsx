import { BookOpen, Edit2, Trash2, Eye, EyeOff, Users, Lock, Globe } from 'lucide-react'
import type { CourseWithStats } from '@/features/courses/types'
import styles from './CourseList.module.css'

interface CourseListProps {
  courses: CourseWithStats[]
  onEdit: (course: CourseWithStats) => void
  onDelete: (course: CourseWithStats) => void
}

function getVisibilityIcon(visibilityType: string) {
  switch (visibilityType) {
    case 'public':
      return <Globe size={14} />
    case 'by_plan':
      return <Users size={14} />
    case 'by_user':
      return <Lock size={14} />
    case 'private':
      return <EyeOff size={14} />
    default:
      return <Globe size={14} />
  }
}

function getVisibilityLabel(visibilityType: string) {
  switch (visibilityType) {
    case 'public':
      return 'Público'
    case 'by_plan':
      return 'Por Plano'
    case 'by_user':
      return 'Por Usuário'
    case 'private':
      return 'Privado'
    default:
      return visibilityType
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}min`
}

export function CourseList({ courses, onEdit, onDelete }: CourseListProps) {
  if (courses.length === 0) {
    return (
      <div className={styles.emptyState}>
        <BookOpen size={48} strokeWidth={1.5} />
        <h3>Nenhum curso encontrado</h3>
        <p>Crie seu primeiro curso para começar</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {courses.map((course) => (
        <div key={course.id} className={styles.card}>
          <div className={styles.thumbnail}>
            {course.thumbnail_url ? (
              <img src={course.thumbnail_url} alt={course.title} />
            ) : (
              <div className={styles.thumbnailPlaceholder}>
                <BookOpen size={32} />
              </div>
            )}
            <div className={styles.statusBadge} data-status={course.status}>
              {course.status === 'published' ? (
                <>
                  <Eye size={12} /> Publicado
                </>
              ) : (
                <>
                  <EyeOff size={12} /> Rascunho
                </>
              )}
            </div>
          </div>

          <div className={styles.content}>
            <h3 className={styles.title}>{course.title}</h3>
            {course.description && (
              <p className={styles.description}>{course.description}</p>
            )}

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{course.modules_count}</span>
                <span className={styles.statLabel}>Módulos</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{course.lessons_count}</span>
                <span className={styles.statLabel}>Aulas</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {formatDuration(course.total_duration_minutes)}
                </span>
                <span className={styles.statLabel}>Duração</span>
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.visibility}>
                {getVisibilityIcon(course.visibility_type)}
                <span>{getVisibilityLabel(course.visibility_type)}</span>
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.iconButton}
                  onClick={() => onEdit(course)}
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className={`${styles.iconButton} ${styles.danger}`}
                  onClick={() => onDelete(course)}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
