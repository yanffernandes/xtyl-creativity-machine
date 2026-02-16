import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/shared/utils/supabase'
import type { Admin, AdminPermissions } from '../types'

interface AdminState {
  isAdmin: boolean
  adminData: Admin | null
  permissions: AdminPermissions | null
  isLoading: boolean
  error: string | null
}

interface AdminActions {
  checkAdminStatus: () => Promise<boolean>
  hasPermission: (resource: keyof AdminPermissions, action: string) => boolean
  clearAdmin: () => void
}

type AdminStore = AdminState & AdminActions

const initialState: AdminState = {
  isAdmin: false,
  adminData: null,
  permissions: null,
  isLoading: false,
  error: null,
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      checkAdminStatus: async () => {
        set({ isLoading: true, error: null })

        try {
          const { data: { user } } = await supabase.auth.getUser()

          if (!user) {
            set({ isAdmin: false, adminData: null, permissions: null, isLoading: false })
            return false
          }

          // Check if user is admin using the view
          const { data: adminData, error } = await supabase
            .from('admin_users_view')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (error || !adminData) {
            set({ isAdmin: false, adminData: null, permissions: null, isLoading: false })
            return false
          }

          set({
            isAdmin: true,
            adminData: adminData as Admin,
            permissions: adminData.permissions as AdminPermissions,
            isLoading: false,
          })

          return true
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to check admin status',
            isLoading: false,
            isAdmin: false,
            adminData: null,
            permissions: null,
          })
          return false
        }
      },

      hasPermission: (resource: keyof AdminPermissions, action: string) => {
        const { permissions } = get()

        if (!permissions) return false

        // Super admin has all permissions
        if (permissions.all === true) return true

        // Check specific permission
        const resourcePermissions = permissions[resource]
        if (!resourcePermissions || typeof resourcePermissions !== 'object') return false

        return (resourcePermissions as Record<string, boolean>)[action] === true
      },

      clearAdmin: () => {
        set(initialState)
        localStorage.removeItem('admin-storage') // Also clear persisted store
      },
    }),
    {
      name: 'admin-storage',
      partialize: (state) => ({
        isAdmin: state.isAdmin,
        adminData: state.adminData,
        permissions: state.permissions,
      }),
    }
  )
)
