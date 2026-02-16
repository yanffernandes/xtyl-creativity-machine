import { useState, useCallback, useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bug, Check, X, ExternalLink } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { Input, Button, Card, CardBody } from '@/shared/components'
import styles from './BugReportSettings.module.css'
import { useBugReportSettings, useUpdateBugReportSettings } from '../../api'

const settingsSchema = z.object({
  clickup_email: z
    .string()
    .regex(
      /^list\.[a-zA-Z0-9]+@tasks\.clickup\.com$/,
      'Email deve estar no formato: list.{id}@tasks.clickup.com'
    )
    .or(z.literal(''))
    .optional(),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export function BugReportSettings() {
  const { data: settings, isLoading } = useBugReportSettings()
  const updateSettings = useUpdateBugReportSettings()
  const [isEditing, setIsEditing] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      clickup_email: '',
    },
  })

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      reset({
        clickup_email: settings.clickup_email || '',
      })
    }
  }, [settings, reset])

  const onSubmit = useCallback(
    async (data: SettingsFormData) => {
      try {
        await updateSettings.mutateAsync({
          clickup_email: data.clickup_email || null,
        })
        toast.success('Configurações salvas com sucesso!')
        setIsEditing(false)
      } catch (error) {
        console.error('Failed to update settings:', error)
        toast.error('Erro ao salvar configurações')
      }
    },
    [updateSettings]
  )

  const handleCancel = useCallback(() => {
    reset({
      clickup_email: settings?.clickup_email || '',
    })
    setIsEditing(false)
  }, [reset, settings])

  const isConfigured = !!settings?.clickup_email

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className={styles.container}>
            <div className={styles.header}>
              <div className={styles.icon}>
                <Bug size={20} />
              </div>
              <div className={styles.headerText}>
                <h3 className={styles.title}>Integração ClickUp</h3>
                <p className={styles.description}>Carregando configurações...</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody>
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.icon}>
              <Bug size={20} />
            </div>
            <div className={styles.headerText}>
              <h3 className={styles.title}>Integração ClickUp</h3>
              <p className={styles.description}>
                Configure o email do ClickUp para criar tasks automaticamente a partir de bug
                reports.
              </p>
            </div>
          </div>

          <div
            className={`${styles.status} ${isConfigured ? styles.statusConfigured : styles.statusNotConfigured}`}
          >
            {isConfigured ? (
              <>
                <Check size={16} className={styles.statusIcon} />
                <span>Configurado: {settings?.clickup_email}</span>
              </>
            ) : (
              <>
                <X size={16} className={styles.statusIcon} />
                <span>Não configurado</span>
              </>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <div className={styles.field}>
                <div className={styles.inputWrapper}>
                  <Input
                    label="Email do ClickUp List"
                    placeholder="list.abc123@tasks.clickup.com"
                    error={errors.clickup_email?.message}
                    className={styles.input}
                    {...register('clickup_email')}
                  />
                </div>
                <p className={styles.hint}>
                  Para encontrar o email da sua List, vá em ClickUp → List → Settings → Email →
                  Copy email.{' '}
                  <a
                    href="https://help.clickup.com/hc/en-us/articles/6310535088407-Create-tasks-with-email"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.hintLink}
                  >
                    Saiba mais <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
                  </a>
                </p>
              </div>

              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={updateSettings.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!isDirty || updateSettings.isPending}
                >
                  {updateSettings.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          ) : (
            <div className={styles.actions}>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                {isConfigured ? 'Editar configuração' : 'Configurar integração'}
              </Button>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
