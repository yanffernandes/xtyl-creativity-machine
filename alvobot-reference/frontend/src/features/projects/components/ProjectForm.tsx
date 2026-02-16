import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { Button, Input, Select } from '@/shared/components'
import styles from './ProjectForm.module.css'
import type { Project, CreateProjectInput } from '../types'

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  domain: z.string().url('URL inválida').optional().or(z.literal('')),
  login: z.string().optional(),
  pass: z.string().optional(),
  default_language: z.string().optional(),
  niche_selected: z.string().optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface ProjectFormProps {
  project?: Project
  onSubmit: (data: CreateProjectInput) => void
  onCancel: () => void
  isLoading?: boolean
}

const languageOptions = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es', label: 'Español' },
]

const nicheOptions = [
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'financas', label: 'Finanças' },
  { value: 'educacao', label: 'Educação' },
  { value: 'entretenimento', label: 'Entretenimento' },
  { value: 'esportes', label: 'Esportes' },
  { value: 'moda', label: 'Moda' },
  { value: 'gastronomia', label: 'Gastronomia' },
  { value: 'viagens', label: 'Viagens' },
  { value: 'outro', label: 'Outro' },
]

export function ProjectForm({ project, onSubmit, onCancel, isLoading }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || '',
      domain: project?.domain || '',
      login: project?.login || '',
      pass: '',
      default_language: project?.default_language || 'pt-BR',
      niche_selected: project?.niche_selected || '',
    },
  })

  const onFormSubmit = (data: ProjectFormData) => {
    const cleanData: CreateProjectInput = {
      name: data.name,
      ...(data.domain && { domain: data.domain }),
      ...(data.login && { login: data.login }),
      ...(data.pass && { pass: data.pass }),
      ...(data.default_language && { default_language: data.default_language }),
      ...(data.niche_selected && { niche_selected: data.niche_selected }),
    }
    onSubmit(cleanData)
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className={styles.form}>
      <Input
        label="Nome do projeto"
        placeholder="Meu Blog"
        error={errors.name?.message}
        fullWidth
        {...register('name')}
      />

      <Input
        label="Domínio"
        placeholder="https://meublog.com"
        error={errors.domain?.message}
        hint="URL completa do site"
        fullWidth
        {...register('domain')}
      />

      <div className={styles.row}>
        <Controller
          name="default_language"
          control={control}
          render={({ field }) => (
            <Select
              label="Idioma padrão"
              options={languageOptions}
              value={field.value || ''}
              onValueChange={field.onChange}
              fullWidth
            />
          )}
        />

        <Controller
          name="niche_selected"
          control={control}
          render={({ field }) => (
            <Select
              label="Nicho"
              options={nicheOptions}
              placeholder="Selecione um nicho"
              value={field.value || ''}
              onValueChange={field.onChange}
              fullWidth
            />
          )}
        />
      </div>

      <div className={styles.divider}>
        <span>Credenciais WordPress (opcional)</span>
      </div>

      <div className={styles.row}>
        <Input
          label="Login"
          placeholder="admin"
          fullWidth
          {...register('login')}
        />

        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          hint={project ? 'Deixe em branco para manter a senha atual' : undefined}
          fullWidth
          {...register('pass')}
        />
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {project ? 'Salvar alterações' : 'Criar projeto'}
        </Button>
      </div>
    </form>
  )
}
