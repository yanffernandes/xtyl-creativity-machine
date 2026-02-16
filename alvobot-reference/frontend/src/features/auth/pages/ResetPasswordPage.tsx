import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input, Alert, Card } from '@/shared/components'
import styles from './ResetPasswordPage.module.css'
import { useAuth } from '../hooks/useAuth'

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const { updatePassword, error, clearError, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    clearError()
    try {
      await updatePassword(data.password)
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
              <strong>Senha alterada com sucesso!</strong>
              <p>Você será redirecionado para o login.</p>
            </Alert>
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/login')}
              className={styles.loginButton}
            >
              Ir para o login
            </Button>
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
          <h2 className={styles.title}>Redefinir senha</h2>
          <p className={styles.subtitle}>
            Insira sua nova senha abaixo.
          </p>

          {error && (
            <Alert variant="error" onClose={clearError} className={styles.alert}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <Input
              label="Nova senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={<Lock size={18} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.passwordToggle}
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              error={errors.password?.message}
              hint="Mínimo de 6 caracteres"
              fullWidth
              {...register('password')}
            />

            <Input
              label="Confirmar nova senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={<Lock size={18} />}
              error={errors.confirmPassword?.message}
              fullWidth
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting || isLoading}
            >
              Redefinir senha
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
