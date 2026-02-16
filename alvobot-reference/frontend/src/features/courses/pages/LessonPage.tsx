import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Spinner } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import {
  useCourseQuery,
  useLessonQuery,
  useLessonProgressQuery,
  useLessonsProgressQuery,
} from '../api'
import styles from './LessonPage.module.css'
import { CourseSidebar } from '../components/CourseSidebar/CourseSidebar'
import { LessonPlayer } from '../components/LessonPlayer/LessonPlayer'
import type { Lesson, LessonProgress } from '../types'

export function LessonPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>()
  const navigate = useNavigate()

  const { data: course, isLoading: courseLoading } = useCourseQuery(slug)
  const { data: lesson, isLoading: lessonLoading } = useLessonQuery(lessonId)
  const { data: currentProgress } = useLessonProgressQuery(lessonId)

  // Get all lesson IDs for the sidebar progress
  const allLessonIds = course?.course_modules?.flatMap(
    (m) => m.lessons?.map((l) => l.id) || []
  ) || []

  const { data: allProgressData } = useLessonsProgressQuery(allLessonIds)

  // Create a map of lesson progress
  const lessonProgress = allProgressData?.reduce(
    (acc, p) => ({ ...acc, [p.lesson_id]: p }),
    {} as Record<string, LessonProgress>
  ) || {}

  useDocumentTitle(lesson?.title || 'Aula')

  // Find the flat list of lessons and current index
  const flatLessons: Lesson[] = course?.course_modules?.flatMap(
    (m) => m.lessons || []
  ) || []

  const currentIndex = flatLessons.findIndex((l) => l.id === lessonId)

  const previousLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null
  const nextLesson = currentIndex < flatLessons.length - 1 ? flatLessons[currentIndex + 1] : null

  const isLoading = courseLoading || lessonLoading

  // For now, assume user has access
  const hasAccess = true

  const handleNavigateLesson = (targetLessonId: string) => {
    navigate(`/courses/${slug}/lesson/${targetLessonId}`)
  }

  const handleComplete = () => {
    // Auto-navigate to next lesson after a short delay
    if (nextLesson) {
      setTimeout(() => {
        navigate(`/courses/${slug}/lesson/${nextLesson.id}`)
      }, 1500)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (!course || !lesson) {
    return (
      <div className={styles.notFound}>
        <h2>Aula não encontrada</h2>
        <p>A aula que você está procurando não existe ou foi removida.</p>
        <Button onClick={() => navigate('/courses')}>
          Ver todos os cursos
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate(`/courses/${slug}`)}
        >
          <ArrowLeft size={18} />
          <span>Voltar para {course.title}</span>
        </button>

        <div className={styles.navigation}>
          <Button
            variant="ghost"
            size="sm"
            disabled={!previousLesson}
            onClick={() => previousLesson && handleNavigateLesson(previousLesson.id)}
          >
            <ChevronLeft size={18} />
            Anterior
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={!nextLesson}
            onClick={() => nextLesson && handleNavigateLesson(nextLesson.id)}
          >
            Próxima
            <ChevronRight size={18} />
          </Button>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.main}>
          <LessonPlayer
            lesson={lesson}
            progress={currentProgress || null}
            onComplete={handleComplete}
          />

          {/* Navigation buttons at bottom */}
          <div className={styles.bottomNavigation}>
            {previousLesson && (
              <Button
                variant="secondary"
                onClick={() => handleNavigateLesson(previousLesson.id)}
              >
                <ArrowLeft size={18} />
                Aula Anterior
              </Button>
            )}
            <div className={styles.spacer} />
            {nextLesson && (
              <Button onClick={() => handleNavigateLesson(nextLesson.id)}>
                Próxima Aula
                <ArrowRight size={18} />
              </Button>
            )}
          </div>
        </div>

        <div className={styles.sidebar}>
          <CourseSidebar
            courseSlug={slug!}
            modules={course.course_modules || []}
            currentLessonId={lessonId}
            lessonProgress={lessonProgress}
            hasAccess={hasAccess}
          />
        </div>
      </div>
    </div>
  )
}
