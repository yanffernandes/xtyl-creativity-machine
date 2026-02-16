import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  Lock,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import styles from './CourseSidebar.module.css'
import { formatDuration } from '../../utils/youtube'
import type { CourseModuleWithLessons, LessonProgress } from '../../types'

interface CourseSidebarProps {
  courseSlug: string
  modules: CourseModuleWithLessons[]
  currentLessonId?: string
  lessonProgress: Record<string, LessonProgress>
  hasAccess: boolean
}

export function CourseSidebar({
  courseSlug,
  modules,
  currentLessonId,
  lessonProgress,
  hasAccess,
}: CourseSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.id))
  )

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }

  const getModuleProgress = (module: CourseModuleWithLessons) => {
    const lessons = module.lessons || []
    const completed = lessons.filter(
      (l) => lessonProgress[l.id]?.completed_at
    ).length
    return { completed, total: lessons.length }
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Conteúdo do Curso</h2>
      </div>

      <div className={styles.moduleList}>
        {modules.map((module, moduleIndex) => {
          const isExpanded = expandedModules.has(module.id)
          const progress = getModuleProgress(module)

          return (
            <div key={module.id} className={styles.module}>
              <button
                className={styles.moduleHeader}
                onClick={() => toggleModule(module.id)}
              >
                <div className={styles.moduleLeft}>
                  {isExpanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                  <div className={styles.moduleInfo}>
                    <span className={styles.moduleIndex}>
                      Módulo {moduleIndex + 1}
                    </span>
                    <span className={styles.moduleTitle}>{module.title}</span>
                  </div>
                </div>
                <span className={styles.moduleProgress}>
                  {progress.completed}/{progress.total}
                </span>
              </button>

              {isExpanded && module.lessons && (
                <div className={styles.lessonList}>
                  {module.lessons.map((lesson, lessonIndex) => {
                    const lessonProg = lessonProgress[lesson.id]
                    const isCompleted = !!lessonProg?.completed_at
                    const isCurrent = lesson.id === currentLessonId
                    const canAccess = hasAccess || lesson.is_free_preview

                    return (
                      <Link
                        key={lesson.id}
                        to={
                          canAccess
                            ? `/courses/${courseSlug}/lesson/${lesson.id}`
                            : '#'
                        }
                        className={`${styles.lessonItem} ${
                          isCurrent ? styles.current : ''
                        } ${!canAccess ? styles.locked : ''}`}
                        onClick={(e) => !canAccess && e.preventDefault()}
                      >
                        <div className={styles.lessonStatus}>
                          {!canAccess ? (
                            <Lock size={16} className={styles.lockIcon} />
                          ) : isCompleted ? (
                            <CheckCircle2
                              size={16}
                              className={styles.completedIcon}
                            />
                          ) : isCurrent ? (
                            <PlayCircle
                              size={16}
                              className={styles.playingIcon}
                            />
                          ) : (
                            <Circle size={16} />
                          )}
                        </div>

                        <div className={styles.lessonInfo}>
                          <span className={styles.lessonNumber}>
                            {lessonIndex + 1}.
                          </span>
                          <span className={styles.lessonTitle}>
                            {lesson.title}
                          </span>
                          {lesson.is_free_preview && !hasAccess && (
                            <span className={styles.previewBadge}>Preview</span>
                          )}
                        </div>

                        {lesson.duration_minutes && (
                          <span className={styles.lessonDuration}>
                            <Clock size={12} />
                            {formatDuration(lesson.duration_minutes)}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
