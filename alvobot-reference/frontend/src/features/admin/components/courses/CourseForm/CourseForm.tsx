import { useEffect, useId, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Course } from '@/features/courses/types'
import { Modal, Input, Button } from '@/shared/components'
import styles from './CourseForm.module.css'
import { ThumbnailUpload } from '../ThumbnailUpload/ThumbnailUpload'

const courseSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().max(5000).optional(),
  visibility_type: z.enum(['public', 'by_plan', 'by_user', 'private']),
})

type CourseFormData = z.infer<typeof courseSchema>

interface CourseFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CourseFormData & { thumbnail_url?: string }) => Promise<void>
  course?: Course | null
  isLoading?: boolean
}

export function CourseForm({ isOpen, onClose, onSubmit, course, isLoading }: CourseFormProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const descriptionId = useId()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: '',
      description: '',
      visibility_type: 'public',
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const visibilityType = watch('visibility_type')

  useEffect(() => {
    if (course) {
      reset({
        title: course.title,
        description: course.description || '',
        visibility_type: course.visibility_type,
      })
      setThumbnailUrl(course.thumbnail_url)
    } else {
      reset({
        title: '',
        description: '',
        visibility_type: 'public',
      })
      setThumbnailUrl(null)
    }
  }, [course, reset])

  const handleFormSubmit = async (data: CourseFormData) => {
    await onSubmit({
      ...data,
      thumbnail_url: thumbnailUrl || undefined,
    })
  }

  const handleClose = () => {
    reset()
    setThumbnailUrl(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      title={course ? 'Editar Curso' : 'Novo Curso'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className={styles.formContent}>
          <div className={styles.thumbnailSection}>
            <span className={styles.label}>Thumbnail</span>
            <ThumbnailUpload
              currentUrl={thumbnailUrl}
              onUpload={setThumbnailUrl}
              onRemove={() => setThumbnailUrl(null)}
            />
          </div>

          <div className={styles.formGroup}>
            <Input
              label="Título do Curso"
              placeholder="Ex: Introdução ao Marketing Digital"
              error={errors.title?.message}
              {...register('title')}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={descriptionId}>Descrição</label>
            <textarea
              id={descriptionId}
              className={styles.textarea}
              placeholder="Descreva o conteúdo do curso..."
              rows={4}
              {...register('description')}
            />
            {errors.description && (
              <span className={styles.error}>{errors.description.message}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <span className={styles.label}>Visibilidade</span>
            <div className={styles.visibilityOptions}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  value="public"
                  {...register('visibility_type')}
                />
                <div className={styles.radioContent}>
                  <span className={styles.radioTitle}>Público</span>
                  <span className={styles.radioDescription}>
                    Todos os usuários podem acessar
                  </span>
                </div>
              </label>

              <label className={styles.radioOption}>
                <input
                  type="radio"
                  value="by_plan"
                  {...register('visibility_type')}
                />
                <div className={styles.radioContent}>
                  <span className={styles.radioTitle}>Por Plano</span>
                  <span className={styles.radioDescription}>
                    Apenas usuários de planos específicos
                  </span>
                </div>
              </label>

              <label className={styles.radioOption}>
                <input
                  type="radio"
                  value="by_user"
                  {...register('visibility_type')}
                />
                <div className={styles.radioContent}>
                  <span className={styles.radioTitle}>Por Usuário</span>
                  <span className={styles.radioDescription}>
                    Apenas usuários específicos
                  </span>
                </div>
              </label>

              <label className={styles.radioOption}>
                <input
                  type="radio"
                  value="private"
                  {...register('visibility_type')}
                />
                <div className={styles.radioContent}>
                  <span className={styles.radioTitle}>Privado</span>
                  <span className={styles.radioDescription}>
                    Oculto para todos (apenas admins)
                  </span>
                </div>
              </label>
            </div>
          </div>

          {visibilityType === 'by_plan' && (
            <div className={styles.visibilityNote}>
              <p>
                Após criar o curso, você poderá selecionar os planos com acesso
                na página de edição.
              </p>
            </div>
          )}

          {visibilityType === 'by_user' && (
            <div className={styles.visibilityNote}>
              <p>
                Após criar o curso, você poderá selecionar os usuários com acesso
                na página de edição.
              </p>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {course ? 'Salvar' : 'Criar Curso'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
