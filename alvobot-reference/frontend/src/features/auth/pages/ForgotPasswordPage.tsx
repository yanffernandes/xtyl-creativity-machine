import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input, Alert, Card } from '@/shared/components'
import styles from './ForgotPasswordPage.module.css'
import { useAuth, useRedirectIfAuthenticated } from '../hooks/useAuth'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const { resetPassword, error, clearError, isLoading } = useAuth()
  const [success, setSuccess] = useState(false)
  useRedirectIfAuthenticated('/dashboard')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    clearError()
    try {
      await resetPassword(data.email)
      setSuccess(true)
    } catch {
      // Error is handled by the store
    }
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Card className={styles.card}>
            <Alert variant="success" className={styles.successAlert}>
              <strong>Email enviado!</strong>
              <p>Verifique sua caixa de entrada para o link de redefinição de senha.</p>
            </Alert>
            <Link to="/login" className={styles.backLink}>
              <ArrowLeft size={16} />
              Voltar para o login
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
        </div>

        <Card className={styles.card}>
          <h2 className={styles.title}>Esqueceu a senha?</h2>
          <p className={styles.subtitle}>
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>

          {error && (
            <Alert variant="error" onClose={clearError} className={styles.alert}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <Input
              label="Email"
              type="email"
              placeholder="seu@email.com"
              leftIcon={<Mail size={18} />}
              error={errors.email?.message}
              fullWidth
              {...register('email')}
            />

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting || isLoading}
            >
              Enviar link de redefinição
            </Button>
          </form>

          <Link to="/login" className={styles.backLink}>
            <ArrowLeft size={16} />
            Voltar para o login
          </Link>
        </Card>
      </div>
    </div>
  )
}
