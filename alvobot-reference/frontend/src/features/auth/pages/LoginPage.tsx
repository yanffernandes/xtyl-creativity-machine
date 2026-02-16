import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input, Alert, Card } from '@/shared/components'
import styles from './LoginPage.module.css'
import { useAuth, useRedirectIfAuthenticated } from '../hooks/useAuth'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login, error, clearError, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  useRedirectIfAuthenticated('/dashboard')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    clearError()
    try {
      await login(data.email, data.password)
    } catch {
      // Error is handled by the store
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
        </div>

        <Card className={styles.card}>
          <h2 className={styles.title}>Entrar na sua conta</h2>
          <p className={styles.subtitle}>
            Não tem uma conta?{' '}
            <Link to="/signup" className={styles.link}>
              Crie uma agora
            </Link>
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

            <Input
              label="Senha"
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
              fullWidth
              {...register('password')}
            />

            <div className={styles.forgotPassword}>
              <Link to="/forgot-password" className={styles.link}>
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting || isLoading}
            >
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
