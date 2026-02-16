import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { Spinner } from '@/shared/components'
import styles from './AdminProtectedRoute.module.css'
import { useAdminStore } from '../../stores/adminStore'

interface AdminProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: {
    resource: string
    action: string
  }
}

export function AdminProtectedRoute({ children, requiredPermission }: AdminProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()
  const { isAdmin, checkAdminStatus, hasPermission, isLoading: adminLoading } = useAdminStore()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    const verifyAdmin = async () => {
      if (isAuthenticated && !hasChecked) {
        await checkAdminStatus()
        setHasChecked(true)
      }
    }

    verifyAdmin()
  }, [isAuthenticated, checkAdminStatus, hasChecked])

  // Still loading auth state
  if (authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p>Verificando autenticacao...</p>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Still checking admin status
  if (adminLoading || !hasChecked) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p>Verificando permissoes...</p>
      </div>
    )
  }

  // Not an admin - redirect to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  // Check specific permission if required
  if (requiredPermission) {
    const hasRequiredPermission = hasPermission(
      requiredPermission.resource as Parameters<typeof hasPermission>[0],
      requiredPermission.action
    )

    if (!hasRequiredPermission) {
      return (
        <div className={styles.accessDenied}>
          <div className={styles.accessDeniedContent}>
            <h1>Acesso Negado</h1>
            <p>Voce nao tem permissao para acessar esta pagina.</p>
            <a href="/admin" className={styles.backLink}>
              Voltar ao Dashboard
            </a>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
