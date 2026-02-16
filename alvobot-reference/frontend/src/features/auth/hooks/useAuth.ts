import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const {
    user,
    session,
    isLoading,
    isAuthenticated,
    error,
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    initializeAuth,
    clearError,
  } = useAuthStore()

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    error,
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    initializeAuth,
    clearError,
  }
}

export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo, {
        replace: true,
        state: { from: location.pathname },
      })
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo, location.pathname])

  return { isAuthenticated, isLoading }
}

export function useRedirectIfAuthenticated(redirectTo = '/dashboard') {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // First check for pending invitation in sessionStorage
      const pendingInvitation = sessionStorage.getItem('pendingInvitation')
      if (pendingInvitation) {
        sessionStorage.removeItem('pendingInvitation')
        navigate(pendingInvitation, { replace: true })
        return
      }

      // Then check location state
      const from = (location.state as { from?: string })?.from || redirectTo
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo, location.state])

  return { isAuthenticated, isLoading }
}
