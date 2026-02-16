import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PrivacyState {
  isPrivacyMode: boolean
  togglePrivacyMode: () => void
  enablePrivacyMode: () => void
  disablePrivacyMode: () => void
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      isPrivacyMode: false,
      togglePrivacyMode: () => set((state) => ({ isPrivacyMode: !state.isPrivacyMode })),
      enablePrivacyMode: () => set({ isPrivacyMode: true }),
      disablePrivacyMode: () => set({ isPrivacyMode: false }),
    }),
    {
      name: 'alvobot-privacy',
    }
  )
)
