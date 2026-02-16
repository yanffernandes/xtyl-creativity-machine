import { useState } from 'react'
import { BookOpen, Search } from 'lucide-react'
import { Input } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { useCoursesQuery, useUserProgressQuery } from '../api'
import styles from './CoursesPage.module.css'
import { CourseCard } from '../components/CourseCard/CourseCard'
import { CourseCardSkeleton } from '../components/CourseCardSkeleton/CourseCardSkeleton'

export function CoursesPage() {
  useDocumentTitle('Cursos')
  const [searchQuery, setSearchQuery] = useState('')

  const { data: courses, isLoading: coursesLoading } = useCoursesQuery()
  const { data: progressData, isLoading: progressLoading } = useUserProgressQuery()

  const isLoading = coursesLoading || progressLoading

  // Create a map of course progress by course_id
  const progressMap = progressData?.reduce(
    (acc, p) => ({ ...acc, [p.course_id]: p }),
    {} as Record<string, typeof progressData[0]>
  ) || {}

  // Filter courses by search query
  const filteredCourses = courses?.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Cursos</h1>
            <p className={styles.subtitle}>
              Aprenda com nossos cursos exclusivos
            </p>
          </div>
        </div>

        <Input
          placeholder="Buscar cursos..."
          leftIcon={<Search size={18} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
          size="md"
        />
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className={styles.emptyState}>
          <BookOpen size={48} strokeWidth={1.5} />
          <h3>Nenhum curso disponível</h3>
          <p>
            {searchQuery
              ? 'Nenhum curso encontrado com esse termo'
              : 'Novos cursos serão adicionados em breve'}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progress={progressMap[course.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
