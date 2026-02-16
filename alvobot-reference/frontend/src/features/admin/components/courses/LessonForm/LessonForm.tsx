import { useEffect, useId, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Lesson } from '@/features/courses/types'
import { isValidYouTubeUrl, extractYouTubeId } from '@/features/courses/utils/youtube'
import { Modal, Input, Button, Checkbox } from '@/shared/components'
import styles from './LessonForm.module.css'
import { YouTubePreview } from '../YouTubePreview/YouTubePreview'

const lessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().max(5000).optional(),
  youtube_url: z
    .string()
    .min(1, 'URL do YouTube é obrigatória')
    .refine(isValidYouTubeUrl, 'URL do YouTube inválida'),
  duration_minutes: z.union([z.number().min(0), z.nan()]).optional().transform((val) => (Number.isNaN(val) ? undefined : val)),
  is_free_preview: z.boolean().optional(),
})

interface LessonFormData {
  title: string
  youtube_url: string
  description?: string
  duration_minutes?: number
  is_free_preview?: boolean
}

interface LessonFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: LessonFormData) => Promise<void>
  lesson?: Lesson | null
  isLoading?: boolean
}

export function LessonForm({
  isOpen,
  onClose,
  onSubmit,
  lesson,
  isLoading,
}: LessonFormProps) {
  const [videoId, setVideoId] = useState<string | null>(null)
  const descriptionId = useId()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: '',
      description: '',
      youtube_url: '',
      duration_minutes: undefined,
      is_free_preview: false,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const youtubeUrl = watch('youtube_url')

  useEffect(() => {
    if (lesson) {
      reset({
        title: lesson.title,
        description: lesson.description || '',
        youtube_url: lesson.youtube_url,
        duration_minutes: lesson.duration_minutes || undefined,
        is_free_preview: lesson.is_free_preview,
      })
      setVideoId(lesson.youtube_video_id)
    } else {
      reset({
        title: '',
        description: '',
        youtube_url: '',
        duration_minutes: undefined,
        is_free_preview: false,
      })
      setVideoId(null)
    }
  }, [lesson, reset])

  // Extract video ID when URL changes
  useEffect(() => {
    if (youtubeUrl && isValidYouTubeUrl(youtubeUrl)) {
      const id = extractYouTubeId(youtubeUrl)
      setVideoId(id)
    } else {
      setVideoId(null)
    }
  }, [youtubeUrl])

  const handleFormSubmit = async (data: LessonFormData) => {
    await onSubmit(data)
  }

  const handleClose = () => {
    reset()
    setVideoId(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      title={lesson ? 'Editar Aula' : 'Nova Aula'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className={styles.formContent}>
          <div className={styles.formGroup}>
            <Input
              label="Título da Aula"
              placeholder="Ex: Introdução ao tema"
              error={errors.title?.message}
              {...register('title')}
            />
          </div>

          <div className={styles.formGroup}>
            <Input
              label="URL do YouTube"
              placeholder="https://www.youtube.com/watch?v=..."
              error={errors.youtube_url?.message}
              {...register('youtube_url')}
            />
            <p className={styles.hint}>
              Cole a URL do vídeo do YouTube (público ou não listado)
            </p>
          </div>

          {videoId && (
            <div className={styles.previewSection}>
              <span className={styles.label}>Preview</span>
              <YouTubePreview videoId={videoId} />
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={descriptionId}>Descrição (opcional)</label>
            <textarea
              id={descriptionId}
              className={styles.textarea}
              placeholder="Descreva o conteúdo desta aula..."
              rows={3}
              {...register('description')}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <Input
                type="number"
                label="Duração (minutos)"
                placeholder="Ex: 15"
                {...register('duration_minutes')}
              />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <Checkbox
              label="Aula de preview gratuita"
              checked={watch('is_free_preview') || false}
              onChange={(e) => setValue('is_free_preview', e.target.checked)}
            />
            <p className={styles.checkboxHint}>
              Usuários sem acesso poderão assistir esta aula como demonstração
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="ghost" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {lesson ? 'Salvar' : 'Adicionar Aula'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
