import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Input, Alert, Card } from '@/shared/components'
import styles from './SignupPage.module.css'
import { useAuth, useRedirectIfAuthenticated } from '../hooks/useAuth'

const signupSchema = z
  .object({
    fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

type SignupFormData = z.infer<typeof signupSchema>

export function SignupPage() {
  const { signup, error, clearError, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  useRedirectIfAuthenticated('/dashboard')

  // Check if there's a pending invitation
  const pendingInvitation = sessionStorage.getItem('pendingInvitation')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    clearError()
    try {
      await signup(data.email, data.password, data.fullName)
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
              <strong>Conta criada com sucesso!</strong>
              <p>Verifique seu email para confirmar sua conta.</p>
              {pendingInvitation && (
                <p style={{ marginTop: '8px' }}>
                  Após confirmar, você será direcionado para aceitar o convite do workspace.
                </p>
              )}
            </Alert>
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate('/login')}
              className={styles.backButton}
            >
              Voltar para o login
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
          <h2 className={styles.title}>Criar conta</h2>
          <p className={styles.subtitle}>
            Já tem uma conta?{' '}
            <Link to="/login" className={styles.link}>
              Faça login
            </Link>
          </p>

          {error && (
            <Alert variant="error" onClose={clearError} className={styles.alert}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <Input
              label="Nome completo"
              type="text"
              placeholder="Seu nome"
              leftIcon={<User size={18} />}
              error={errors.fullName?.message}
              fullWidth
              {...register('fullName')}
            />

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
              hint="Mínimo de 6 caracteres"
              fullWidth
              {...register('password')}
            />

            <Input
              label="Confirmar senha"
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
              Criar conta
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
