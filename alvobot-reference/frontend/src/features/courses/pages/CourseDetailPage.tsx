import { ArrowLeft, BookOpen, Clock, Lock } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spinner } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { useCourseQuery, useLessonsProgressQuery } from '../api'
import styles from './CourseDetailPage.module.css'
import { CourseSidebar } from '../components/CourseSidebar/CourseSidebar'
import { formatDuration } from '../utils/youtube'
import type { LessonProgress } from '../types'

export function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const { data: course, isLoading } = useCourseQuery(slug)

  // Get all lesson IDs from the course
  const lessonIds = course?.course_modules?.flatMap(
    (m) => m.lessons?.map((l) => l.id) || []
  ) || []

  const { data: progressData } = useLessonsProgressQuery(lessonIds)

  useDocumentTitle(course?.title || 'Curso')

  // Create a map of lesson progress
  const lessonProgress = progressData?.reduce(
    (acc, p) => ({ ...acc, [p.lesson_id]: p }),
    {} as Record<string, LessonProgress>
  ) || {}

  // Calculate course stats
  const totalLessons = lessonIds.length
  const totalDuration = course?.course_modules?.reduce(
    (acc, m) =>
      acc + (m.lessons?.reduce((lAcc, l) => lAcc + (l.duration_minutes || 0), 0) || 0),
    0
  ) || 0

  const completedLessons = Object.values(lessonProgress).filter(
    (p) => p.completed_at
  ).length

  const progressPercentage = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0

  // For now, assume user has access (in real app, this would check visibility/plan)
  const hasAccess = true

  // Find the first incomplete lesson or the first lesson
  const findFirstLesson = () => {
    for (const module of course?.course_modules || []) {
      for (const lesson of module.lessons || []) {
        if (!lessonProgress[lesson.id]?.completed_at) {
          return lesson.id
        }
      }
    }
    // If all completed, return first lesson
    return course?.course_modules?.[0]?.lessons?.[0]?.id
  }

  const handleStartCourse = () => {
    const firstLessonId = findFirstLesson()
    if (firstLessonId) {
      navigate(`/courses/${slug}/lesson/${firstLessonId}`)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className={styles.notFound}>
        <BookOpen size={48} strokeWidth={1.5} />
        <h2>Curso não encontrado</h2>
        <p>O curso que você está procurando não existe ou foi removido.</p>
        <Button onClick={() => navigate('/courses')}>
          Ver todos os cursos
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.backButton}
        onClick={() => navigate('/courses')}
      >
        <ArrowLeft size={20} />
        Voltar para Cursos
      </button>

      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.heroSection}>
            {course.thumbnail_url && (
              <div className={styles.thumbnail}>
                <img src={course.thumbnail_url} alt={course.title} />
                {progressPercentage > 0 && progressPercentage < 100 && (
                  <div className={styles.progressOverlay}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className={styles.courseInfo}>
              <h1 className={styles.title}>{course.title}</h1>
              {course.description && (
                <p className={styles.description}>{course.description}</p>
              )}

              <div className={styles.meta}>
                <span className={styles.metaItem}>
                  <BookOpen size={16} />
                  {totalLessons} {totalLessons === 1 ? 'aula' : 'aulas'}
                </span>
                {totalDuration > 0 && (
                  <span className={styles.metaItem}>
                    <Clock size={16} />
                    {formatDuration(totalDuration)}
                  </span>
                )}
              </div>

              {progressPercentage > 0 && (
                <div className={styles.progressInfo}>
                  <div className={styles.progressHeader}>
                    <span>Seu progresso</span>
                    <span>{progressPercentage}%</span>
                  </div>
                  <div className={styles.progressBarContainer}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <span className={styles.progressText}>
                    {completedLessons} de {totalLessons} aulas concluídas
                  </span>
                </div>
              )}

              <div className={styles.actions}>
                {hasAccess ? (
                  <Button onClick={handleStartCourse} size="lg">
                    {progressPercentage > 0 ? 'Continuar' : 'Começar'} Curso
                  </Button>
                ) : (
                  <Button variant="secondary" size="lg" disabled>
                    <Lock size={18} />
                    Curso Restrito
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <CourseSidebar
            courseSlug={slug!}
            modules={course.course_modules || []}
            lessonProgress={lessonProgress}
            hasAccess={hasAccess}
          />
        </div>
      </div>
    </div>
  )
}
