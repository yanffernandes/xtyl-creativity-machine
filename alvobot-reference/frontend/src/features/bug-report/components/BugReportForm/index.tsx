import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { Input, Textarea, Select, Button } from '@/shared/components'
import styles from './BugReportForm.module.css'
import { useBugReportStore } from '../../stores/bugReportStore'
import { BUG_SEVERITY, BUG_TYPE } from '../../types'

const bugReportSchema = z.object({
  title: z
    .string()
    .min(1, 'Título é obrigatório')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z
    .string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  severity: z.enum(BUG_SEVERITY),
  bug_type: z.enum(BUG_TYPE),
})

type BugReportFormData = z.infer<typeof bugReportSchema>

interface BugReportFormProps {
  onSubmit: (data: BugReportFormData) => void
  isSubmitting?: boolean
}

const severityOptions = [
  { value: 'low', label: 'Baixa - Problema menor' },
  { value: 'medium', label: 'Média - Funcionalidade afetada' },
  { value: 'high', label: 'Alta - Funcionalidade crítica afetada' },
  { value: 'critical', label: 'Crítica - Sistema inutilizável' },
]

const typeOptions = [
  { value: 'visual', label: 'Visual - Problema de UI/UX' },
  { value: 'functional', label: 'Funcional - Não funciona como esperado' },
  { value: 'performance', label: 'Performance - Lentidão' },
  { value: 'other', label: 'Outro' },
]

export function BugReportForm({
  onSubmit,
  isSubmitting = false,
}: BugReportFormProps) {
  const { formData, setFormData } = useBugReportStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
  } = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportSchema),
    defaultValues: formData,
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const currentSeverity = watch('severity')
  const currentType = watch('bug_type')
  const currentTitle = watch('title')
  const currentDescription = watch('description')

  // Sync form data to store whenever it changes (preserves data during screenshot capture)
  useEffect(() => {
    setFormData({
      title: currentTitle,
      description: currentDescription,
      severity: currentSeverity,
      bug_type: currentType,
    })
  }, [currentTitle, currentDescription, currentSeverity, currentType, setFormData])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.field}>
        <Input
          label="Título"
          placeholder="Resumo breve do problema"
          error={errors.title?.message}
          {...register('title')}
        />
      </div>

      <div className={styles.field}>
        <Textarea
          label="Descrição"
          placeholder="Descreva o problema em detalhes. O que você estava fazendo? O que esperava que acontecesse?"
          rows={4}
          error={errors.description?.message}
          {...register('description')}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <Controller
            name="severity"
            control={control}
            render={({ field }) => (
              <Select
                label="Severidade"
                value={field.value || ''}
                onValueChange={field.onChange}
                error={errors.severity?.message}
                options={severityOptions}
              />
            )}
          />
        </div>

        <div className={styles.field}>
          <Controller
            name="bug_type"
            control={control}
            render={({ field }) => (
              <Select
                label="Tipo"
                value={field.value || ''}
                onValueChange={field.onChange}
                error={errors.bug_type?.message}
                options={typeOptions}
              />
            )}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar Report'}
        </Button>
      </div>
    </form>
  )
}
