import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { queryClient } from '@/app/providers'
import { useAdminStore } from '@/features/admin/stores/adminStore'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import type { User, Session } from '@/shared/types'
import { formatErrorMessage } from '@/shared/utils/errorMessages'
import { supabase } from '@/shared/utils/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  initializeAuth: () => Promise<void>
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) throw error

          const user = data.user ? {
            id: data.user.id,
            email: data.user.email || '',
            created_at: data.user.created_at || '',
            updated_at: data.user.updated_at || '',
            user_metadata: data.user.user_metadata || {},
          } : null

          const session = data.session ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at || 0,
            user: user!,
          } : null

          set({
            user,
            session,
            isAuthenticated: !!data.session,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: formatErrorMessage(error, 'Falha no login'),
            isLoading: false,
          })
          throw error
        }
      },

      signup: async (email: string, password: string, fullName?: string) => {
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: fullName ? { full_name: fullName } : undefined,
            },
          })

          if (error) throw error

          const user = data.user ? {
            id: data.user.id,
            email: data.user.email || '',
            created_at: data.user.created_at || '',
            updated_at: data.user.updated_at || '',
            user_metadata: data.user.user_metadata || {},
          } : null

          set({
            user,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: formatErrorMessage(error, 'Falha no cadastro'),
            isLoading: false,
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true, error: null })
        try {
          const { error } = await supabase.auth.signOut()
          if (error) throw error

          // Clear all stores to prevent data leak between sessions
          useWorkspaceStore.getState().clearWorkspace()
          useAdminStore.getState().clearAdmin()

          // Clear all query cache to prevent stale data from previous session
          queryClient.clear()

          set({
            user: null,
            session: null,
            isAuthenticated: false,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: formatErrorMessage(error, 'Falha ao sair'),
            isLoading: false,
          })
          throw error
        }
      },

      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null })
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          })

          if (error) throw error

          set({ isLoading: false })
        } catch (error) {
          set({
            error: formatErrorMessage(error, 'Falha ao recuperar senha'),
            isLoading: false,
          })
          throw error
        }
      },

      updatePassword: async (newPassword: string) => {
        set({ isLoading: true, error: null })
        try {
          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          })

          if (error) throw error

          set({ isLoading: false })
        } catch (error) {
          set({
            error: formatErrorMessage(error, 'Falha ao atualizar senha'),
            isLoading: false,
          })
          throw error
        }
      },

      initializeAuth: async () => {
        set({ isLoading: true })
        try {
          const { data: { session }, error } = await supabase.auth.getSession()

          if (error) throw error

          if (session?.user) {
            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              created_at: session.user.created_at || '',
              updated_at: session.user.updated_at || '',
              user_metadata: session.user.user_metadata || {},
            }

            const mappedSession: Session = {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at || 0,
              user,
            }

            set({
              user,
              session: mappedSession,
              isAuthenticated: true,
              isLoading: false,
            })
          } else {
            set({
              user: null,
              session: null,
              isAuthenticated: false,
              isLoading: false,
            })
          }

          // Listen for auth state changes
          supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              const user: User = {
                id: session.user.id,
                email: session.user.email || '',
                created_at: session.user.created_at || '',
                updated_at: session.user.updated_at || '',
                user_metadata: session.user.user_metadata || {},
              }

              const mappedSession: Session = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at || 0,
                user,
              }

              set({
                user,
                session: mappedSession,
                isAuthenticated: true,
              })
            } else {
              set({
                user: null,
                session: null,
                isAuthenticated: false,
              })
            }
          })
        } catch (error) {
          set({
            error: formatErrorMessage(error, 'Falha ao inicializar autenticação'),
            isLoading: false,
          })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
