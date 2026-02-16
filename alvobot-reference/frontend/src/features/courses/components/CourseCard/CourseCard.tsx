import { BookOpen, Clock, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import styles from './CourseCard.module.css'
import { formatDuration } from '../../utils/youtube'
import type { Course, UserCourseProgress } from '../../types'

interface CourseCardProps {
  course: Course & {
    course_modules?: Array<{
      id: string
      lessons?: Array<{ id: string; duration_minutes?: number | null }>
    }>
  }
  progress?: UserCourseProgress | null
}

export function CourseCard({ course, progress }: CourseCardProps) {
  // Calculate total lessons and duration from nested data
  const totalLessons = course.course_modules?.reduce(
    (acc, m) => acc + (m.lessons?.length || 0),
    0
  ) || 0

  const totalDuration = course.course_modules?.reduce(
    (acc, m) =>
      acc + (m.lessons?.reduce((lAcc, l) => lAcc + (l.duration_minutes || 0), 0) || 0),
    0
  ) || 0

  const progressPercentage = progress?.progress_percentage || 0
  const completedLessons = progress?.completed_lessons || 0

  return (
    <Link to={`/courses/${course.slug}`} className={styles.card}>
      <div className={styles.thumbnail}>
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} />
        ) : (
          <div className={styles.thumbnailPlaceholder}>
            <BookOpen size={32} />
          </div>
        )}

        {progressPercentage > 0 && progressPercentage < 100 && (
          <div className={styles.progressOverlay}>
            <div
              className={styles.progressBar}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        {progressPercentage === 100 && (
          <div className={styles.completedBadge}>
            <CheckCircle2 size={16} />
            Concluído
          </div>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{course.title}</h3>
        {course.description && (
          <p className={styles.description}>{course.description}</p>
        )}

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <BookOpen size={14} />
            {totalLessons} {totalLessons === 1 ? 'aula' : 'aulas'}
          </span>
          {totalDuration > 0 && (
            <span className={styles.metaItem}>
              <Clock size={14} />
              {formatDuration(totalDuration)}
            </span>
          )}
        </div>

        {progressPercentage > 0 && (
          <div className={styles.progressText}>
            {progressPercentage === 100 ? (
              <span className={styles.completed}>
                <CheckCircle2 size={14} />
                Curso concluído
              </span>
            ) : (
              <span>
                {completedLessons} de {totalLessons} aulas concluídas (
                {progressPercentage}%)
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
