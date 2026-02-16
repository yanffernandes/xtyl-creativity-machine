import { useState, useEffect } from 'react'
import { Users, CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Button, Card, Alert, Spinner } from '@/shared/components'
import styles from './AcceptInvitationPage.module.css'
import { useAcceptInvitation } from '../api/mutations'
import { useInvitationByTokenQuery } from '../api/queries'

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
}

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuthStore()
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [isAccepted, setIsAccepted] = useState(false)

  const { data, isLoading, error } = useInvitationByTokenQuery(token)
  const acceptMutation = useAcceptInvitation()

  // Check if user email matches invitation email
  const emailMismatch = user?.email && data?.invitation?.email &&
    user.email.toLowerCase() !== data.invitation.email.toLowerCase()

  const handleAccept = async () => {
    if (!token) return

    setAcceptError(null)
    try {
      await acceptMutation.mutateAsync(token)
      setIsAccepted(true)
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao aceitar convite'
      setAcceptError(errorMessage)
    }
  }

  const handleLoginRedirect = () => {
    // Store the invitation URL to redirect back after login
    sessionStorage.setItem('pendingInvitation', window.location.pathname)
    navigate('/login')
  }

  const handleSignupRedirect = () => {
    // Store the invitation URL to redirect back after signup
    sessionStorage.setItem('pendingInvitation', window.location.pathname)
    navigate('/signup')
  }

  // Check for pending invitation after login
  useEffect(() => {
    const pendingInvitation = sessionStorage.getItem('pendingInvitation')
    if (pendingInvitation && isAuthenticated) {
      sessionStorage.removeItem('pendingInvitation')
    }
  }, [isAuthenticated])

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
          </div>
          <Card className={styles.card}>
            <div className={styles.loadingState}>
              <Spinner size="lg" />
              <p>Carregando convite...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Error state - invitation not found
  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
          </div>
          <Card className={styles.card}>
            <div className={styles.errorState}>
              <div className={`${styles.iconWrapper  } ${  styles.iconError}`}>
                <XCircle size={32} />
              </div>
              <h2 className={styles.title}>Convite não encontrado</h2>
              <p className={styles.description}>
                Este convite não existe ou pode ter sido removido.
                Por favor, solicite um novo convite ao administrador do workspace.
              </p>
              <Link to="/login">
                <Button variant="primary" fullWidth>
                  Ir para Login
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const { invitation, workspace, inviter } = data

  // Expired invitation
  if (invitation.status === 'expired') {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
          </div>
          <Card className={styles.card}>
            <div className={styles.errorState}>
              <div className={`${styles.iconWrapper  } ${  styles.iconWarning}`}>
                <Clock size={32} />
              </div>
              <h2 className={styles.title}>Convite expirado</h2>
              <p className={styles.description}>
                Este convite expirou. Por favor, solicite um novo convite
                ao administrador do workspace "{workspace.name}".
              </p>
              <Link to="/login">
                <Button variant="primary" fullWidth>
                  Ir para Login
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Already accepted invitation
  if (invitation.status === 'accepted') {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
          </div>
          <Card className={styles.card}>
            <div className={styles.successState}>
              <div className={`${styles.iconWrapper  } ${  styles.iconSuccess}`}>
                <CheckCircle size={32} />
              </div>
              <h2 className={styles.title}>Convite já aceito</h2>
              <p className={styles.description}>
                Este convite já foi aceito anteriormente.
                Você já faz parte do workspace "{workspace.name}".
              </p>
              <Link to="/dashboard">
                <Button variant="primary" fullWidth>
                  Ir para Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Successfully accepted
  if (isAccepted) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
          </div>
          <Card className={styles.card}>
            <div className={styles.successState}>
              <div className={`${styles.iconWrapper  } ${  styles.iconSuccess}`}>
                <CheckCircle size={32} />
              </div>
              <h2 className={styles.title}>Convite aceito!</h2>
              <p className={styles.description}>
                Você agora faz parte do workspace "{workspace.name}".
                Redirecionando para o dashboard...
              </p>
              <Spinner size="sm" />
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Not authenticated - show login prompt
  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
          </div>
          <Card className={styles.card}>
            <div className={`${styles.iconWrapper  } ${  styles.iconPrimary}`}>
              <Users size={32} />
            </div>

            <h2 className={styles.title}>Você foi convidado!</h2>

            <div className={styles.inviteDetails}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Workspace:</span>
                <span className={styles.detailValue}>{workspace.name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Seu papel:</span>
                <span className={styles.detailValue}>{roleLabels[invitation.role] || invitation.role}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Convidado por:</span>
                <span className={styles.detailValue}>{inviter.name}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email do convite:</span>
                <span className={styles.detailValue}>{invitation.email}</span>
              </div>
            </div>

            <Alert variant="info" className={styles.alert}>
              Faça login com o email <strong>{invitation.email}</strong> para aceitar este convite.
            </Alert>

            <div className={styles.actions}>
              <Button variant="primary" fullWidth onClick={handleLoginRedirect}>
                Fazer Login
              </Button>
              <button type="button" className={styles.signupLink} onClick={handleSignupRedirect}>
                Não tem conta? <span>Criar conta</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Email mismatch
  if (emailMismatch) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.logo}>
            <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
          </div>
          <Card className={styles.card}>
            <div className={styles.errorState}>
              <div className={`${styles.iconWrapper  } ${  styles.iconWarning}`}>
                <AlertCircle size={32} />
              </div>
              <h2 className={styles.title}>Email diferente</h2>
              <p className={styles.description}>
                Este convite foi enviado para <strong>{invitation.email}</strong>,
                mas você está logado como <strong>{user?.email}</strong>.
              </p>
              <p className={styles.description}>
                Por favor, faça logout e entre com a conta correta.
              </p>
              <Button variant="primary" fullWidth onClick={() => navigate('/login')}>
                Trocar de conta
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Main accept view
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.logo}>
          <img src="/logo_alvobot_1.png" alt="AlvoBot" className={styles.logoImage} />
        </div>
        <Card className={styles.card}>
          <div className={`${styles.iconWrapper  } ${  styles.iconPrimary}`}>
            <Users size={32} />
          </div>

          <h2 className={styles.title}>Aceitar convite</h2>
          <p className={styles.subtitle}>
            Você foi convidado para participar de um workspace
          </p>

          <div className={styles.inviteDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Workspace:</span>
              <span className={styles.detailValue}>{workspace.name}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Seu papel:</span>
              <span className={styles.detailValue}>{roleLabels[invitation.role] || invitation.role}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Convidado por:</span>
              <span className={styles.detailValue}>{inviter.name}</span>
            </div>
          </div>

          {acceptError && (
            <Alert variant="error" className={styles.alert}>
              {acceptError}
            </Alert>
          )}

          <div className={styles.actions}>
            <Button
              variant="primary"
              fullWidth
              onClick={handleAccept}
              isLoading={acceptMutation.isPending}
              leftIcon={acceptMutation.isPending ? <Loader2 size={18} className={styles.spinnerIcon} /> : undefined}
            >
              {acceptMutation.isPending ? 'Aceitando...' : 'Aceitar Convite'}
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate('/dashboard')}
              disabled={acceptMutation.isPending}
            >
              Recusar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
