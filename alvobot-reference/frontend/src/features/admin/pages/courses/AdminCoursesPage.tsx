import { useState } from 'react'
import { Plus, BookOpen, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useAdminCoursesQuery,
  useCreateCourse,
  useDeleteCourse,
} from '@/features/courses/api'
import type { CourseWithStats, VisibilityType } from '@/features/courses/types'
import { Button, Spinner, Modal, Input } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './AdminCoursesPage.module.css'
import { CourseForm } from '../../components/courses/CourseForm/CourseForm'
import { CourseList } from '../../components/courses/CourseList/CourseList'

export function AdminCoursesPage() {
  useDocumentTitle('Admin - Cursos')
  const navigate = useNavigate()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<CourseWithStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: courses, isLoading, refetch } = useAdminCoursesQuery({
    search: searchQuery || undefined,
  })
  const createCourse = useCreateCourse()
  const deleteCourse = useDeleteCourse()

  const handleCreateCourse = async (data: {
    title: string
    description?: string
    visibility_type: VisibilityType
    thumbnail_url?: string
  }) => {
    try {
      const newCourse = await createCourse.mutateAsync({
        title: data.title,
        description: data.description,
        visibility_type: data.visibility_type,
        thumbnail_url: data.thumbnail_url,
      })
      setShowCreateModal(false)
      // Navigate to the editor page for the new course
      navigate(`/admin/courses/${newCourse.id}`)
    } catch (error) {
      console.error('Error creating course:', error)
    }
  }

  const handleEditCourse = (course: CourseWithStats) => {
    navigate(`/admin/courses/${course.id}`)
  }

  const handleDeleteClick = (course: CourseWithStats) => {
    setCourseToDelete(course)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return

    try {
      await deleteCourse.mutateAsync(courseToDelete.id)
      setShowDeleteModal(false)
      setCourseToDelete(null)
      refetch()
    } catch (error) {
      console.error('Error deleting course:', error)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>
            <BookOpen size={24} />
            Cursos
          </h1>
          <p className={styles.subtitle}>
            Gerencie cursos, módulos e aulas da plataforma
          </p>
        </div>

        <div className={styles.actions}>
          <Input
            placeholder="Buscar cursos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            leftIcon={<Search size={18} />}
            size="md"
          />
          <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus size={18} />}>
            Novo Curso
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : (
        <CourseList
          courses={courses || []}
          onEdit={handleEditCourse}
          onDelete={handleDeleteClick}
        />
      )}

      {/* Create Course Modal */}
      <CourseForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateCourse}
        isLoading={createCourse.isPending}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        size="sm"
        title="Excluir Curso"
      >
        <p className={styles.deleteText}>
          Tem certeza que deseja excluir o curso{' '}
          <strong>{courseToDelete?.title}</strong>?
        </p>
        <p className={styles.deleteWarning}>
          Esta ação irá remover todos os módulos, aulas e progresso dos usuários
          permanentemente.
        </p>
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            isLoading={deleteCourse.isPending}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}
