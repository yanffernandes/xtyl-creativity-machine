import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LayoutState {
  isMobileMenuOpen: boolean
  isSidebarCollapsed: boolean
  openMobileMenu: () => void
  closeMobileMenu: () => void
  toggleMobileMenu: () => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isMobileMenuOpen: false,
      isSidebarCollapsed: false,
      openMobileMenu: () => set({ isMobileMenuOpen: true }),
      closeMobileMenu: () => set({ isMobileMenuOpen: false }),
      toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
    }),
    {
      name: 'alvobot-layout',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    }
  )
)
