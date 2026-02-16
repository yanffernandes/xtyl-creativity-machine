import { useState } from 'react'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Plus,
  Settings,
  BookOpen,
} from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useAdminCourseQuery,
  useUpdateCourse,
  useCreateModule,
} from '@/features/courses/api'
import type { VisibilityType } from '@/features/courses/types'
import { Button, Spinner, Modal, Input } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './AdminCourseEditorPage.module.css'
import { useAdminPlans } from '../../api/queries'
import { CourseForm } from '../../components/courses/CourseForm/CourseForm'
import { ModuleManager } from '../../components/courses/ModuleManager/ModuleManager'

export function AdminCourseEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModuleModal, setShowAddModuleModal] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState('')

  const { data: course, isLoading, refetch } = useAdminCourseQuery(id)
  const { data: plans = [] } = useAdminPlans()
  const updateCourse = useUpdateCourse()
  const createModule = useCreateModule()

  // Transform plans for the visibility selector
  const availablePlans = plans.map((p) => ({ id: p.id, name: p.name }))

  useDocumentTitle(course?.title ? `Editar: ${course.title}` : 'Editar Curso')

  const handleUpdateCourse = async (data: {
    title: string
    description?: string
    visibility_type: VisibilityType
    thumbnail_url?: string
  }) => {
    if (!id) return

    try {
      await updateCourse.mutateAsync({
        id,
        ...data,
      })
      setShowEditModal(false)
      refetch()
    } catch (error) {
      console.error('Error updating course:', error)
    }
  }

  const handleToggleStatus = async () => {
    if (!id || !course) return

    try {
      await updateCourse.mutateAsync({
        id,
        status: course.status === 'published' ? 'draft' : 'published',
      })
      refetch()
    } catch (error) {
      console.error('Error toggling course status:', error)
    }
  }

  const handleAddModule = async () => {
    if (!id || !newModuleTitle.trim()) return

    try {
      await createModule.mutateAsync({
        course_id: id,
        title: newModuleTitle.trim(),
      })
      setShowAddModuleModal(false)
      setNewModuleTitle('')
      refetch()
    } catch (error) {
      console.error('Error creating module:', error)
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
        <Button onClick={() => navigate('/admin/courses')}>
          Voltar para Cursos
        </Button>
      </div>
    )
  }

  const canPublish = course.course_modules?.some(
    (m) => m.lessons && m.lessons.length > 0
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate('/admin/courses')}
          >
            <ArrowLeft size={20} />
          </button>
          <div className={styles.courseInfo}>
            {course.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt=""
                className={styles.thumbnail}
              />
            )}
            <div>
              <h1 className={styles.title}>{course.title}</h1>
              <div className={styles.statusBadge} data-status={course.status}>
                {course.status === 'published' ? (
                  <>
                    <Eye size={14} /> Publicado
                  </>
                ) : (
                  <>
                    <EyeOff size={14} /> Rascunho
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="ghost"
            onClick={() => setShowEditModal(true)}
          >
            <Settings size={18} />
            Configurações
          </Button>
          <Button
            variant={course.status === 'published' ? 'secondary' : 'primary'}
            onClick={handleToggleStatus}
            disabled={!canPublish && course.status !== 'published'}
            isLoading={updateCourse.isPending}
            title={
              !canPublish && course.status !== 'published'
                ? 'Adicione pelo menos uma aula para publicar'
                : undefined
            }
          >
            {course.status === 'published' ? (
              <>
                <EyeOff size={18} /> Despublicar
              </>
            ) : (
              <>
                <Eye size={18} /> Publicar
              </>
            )}
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.modulesHeader}>
          <h2 className={styles.sectionTitle}>Módulos e Aulas</h2>
          <Button onClick={() => setShowAddModuleModal(true)}>
            <Plus size={18} />
            Novo Módulo
          </Button>
        </div>

        <ModuleManager
          courseId={id!}
          modules={course.course_modules || []}
          courseVisibility={course.visibility_type}
          availablePlans={availablePlans}
          onRefresh={refetch}
        />
      </div>

      {/* Edit Course Modal */}
      <CourseForm
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateCourse}
        course={course}
        isLoading={updateCourse.isPending}
      />

      {/* Add Module Modal */}
      <Modal
        isOpen={showAddModuleModal}
        onClose={() => setShowAddModuleModal(false)}
        size="sm"
        title="Novo Módulo"
      >
        <Input
          label="Nome do Módulo"
          placeholder="Ex: Introdução"
          value={newModuleTitle}
          onChange={(e) => setNewModuleTitle(e.target.value)}
          autoFocus
        />
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={() => setShowAddModuleModal(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAddModule}
            isLoading={createModule.isPending}
            disabled={!newModuleTitle.trim()}
          >
            Criar Módulo
          </Button>
        </div>
      </Modal>
    </div>
  )
}
