import { useEffect, useId } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { Button, Input, Select, Modal } from '@/shared/components'
import styles from './TaskModal.module.css'
import type { Task, TaskStatus, CreateTaskInput } from '../types'

const taskSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
  description: z.string().optional(),
  status: z.enum(['to_do', 'in_progress', 'done', 'blocked']),
  estimated_time: z.number().min(0).optional(),
  tags: z.string().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTaskInput) => void
  task?: Task | null
  defaultStatus?: TaskStatus
  isLoading?: boolean
}

const statusOptions = [
  { value: 'to_do', label: 'A Fazer' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'done', label: 'Concluído' },
  { value: 'blocked', label: 'Bloqueado' },
]

const estimatedTimeOptions = [
  { value: '0', label: 'Sem estimativa' },
  { value: '15', label: '15 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '60', label: '1 hora' },
  { value: '120', label: '2 horas' },
  { value: '240', label: '4 horas' },
  { value: '480', label: '8 horas (1 dia)' },
]

export function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  defaultStatus = 'to_do',
  isLoading,
}: TaskModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      description: '',
      status: defaultStatus,
      estimated_time: 0,
      tags: '',
    },
  })
  const descriptionId = useId()

  useEffect(() => {
    if (isOpen) {
      if (task) {
        reset({
          name: task.name,
          description: task.description || '',
          status: task.status,
          estimated_time: task.estimated_time || 0,
          tags: task.tags?.join(', ') || '',
        })
      } else {
        reset({
          name: '',
          description: '',
          status: defaultStatus,
          estimated_time: 0,
          tags: '',
        })
      }
    }
  }, [isOpen, task, defaultStatus, reset])

  const onFormSubmit = (data: TaskFormData) => {
    const tags = data.tags
      ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined

    onSubmit({
      name: data.name,
      description: data.description || undefined,
      status: data.status as TaskStatus,
      estimated_time: data.estimated_time || undefined,
      tags,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Editar Tarefa' : 'Nova Tarefa'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className={styles.form}>
        <Input
          label="Nome da tarefa"
          placeholder="O que precisa ser feito?"
          error={errors.name?.message}
          fullWidth
          autoFocus
          {...register('name')}
        />

        <div className={styles.field}>
          <label className={styles.label} htmlFor={descriptionId}>Descrição</label>
          <textarea
            id={descriptionId}
            className={styles.textarea}
            placeholder="Adicione detalhes sobre a tarefa..."
            rows={3}
            {...register('description')}
          />
        </div>

        <div className={styles.row}>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select
                label="Status"
                options={statusOptions}
                value={field.value || ''}
                onValueChange={field.onChange}
                fullWidth
              />
            )}
          />

          <Controller
            name="estimated_time"
            control={control}
            render={({ field }) => (
              <Select
                label="Tempo estimado"
                options={estimatedTimeOptions}
                value={String(field.value || 0)}
                onValueChange={(val) => field.onChange(Number(val))}
                fullWidth
              />
            )}
          />
        </div>

        <Input
          label="Tags"
          placeholder="Ex: urgente, frontend, bug (separadas por vírgula)"
          hint="Separe as tags por vírgula"
          fullWidth
          {...register('tags')}
        />

        <div className={styles.actions}>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {task ? 'Salvar alterações' : 'Criar tarefa'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
