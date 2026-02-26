/**
 * UI Store
 *
 * Zustand store for centralized UI state management.
 * Consolidates modal states, editing states, and navigation management.
 *
 * Feature: 030-performance-optimization (FR-007, FR-008)
 * Purpose: Reduce useState count in main page component, prevent unnecessary re-renders
 *
 * Usage:
 *   // Subscribe to specific modal state
 *   const isAssetsOpen = useUIStore(state => state.modals.assets)
 *
 *   // Get actions without subscribing to state changes
 *   const { openModal, closeModal } = useUIStore.getState()
 *
 *   // Use with shallow comparison for multiple values
 *   const { openModal, closeModal } = useUIStore(
 *     useShallow(state => ({ openModal: state.openModal, closeModal: state.closeModal }))
 *   )
 */

import { create } from 'zustand'

/**
 * Modal state flags for all application modals
 */
export interface ModalState {
  assets: boolean
  archive: boolean
  activity: boolean
  settings: boolean
  imageGenerator: boolean
  share: boolean
  attachImage: boolean
  unsavedChanges: boolean
}

/**
 * Names of all modals for type-safe access
 */
export type ModalName = keyof ModalState

/**
 * UI Store state and actions interface
 */
export interface UIStore {
  // Modal management
  modals: ModalState
  openModal: (name: ModalName) => void
  closeModal: (name: ModalName) => void
  closeAllModals: () => void
  toggleModal: (name: ModalName) => void

  // Title editing state (for inline document title editing)
  editingTitle: string | null
  tempTitle: string
  setEditingTitle: (id: string | null) => void
  setTempTitle: (title: string) => void
  resetTitleEditing: () => void

  // Navigation state (for unsaved changes warning)
  pendingNavigation: string | null
  pendingDocument: unknown | null
  setPendingNavigation: (path: string | null, doc?: unknown) => void
  clearPendingNavigation: () => void

  // Image viewer state
  viewingImage: unknown | null
  setViewingImage: (image: unknown | null) => void
}

/**
 * Default modal state - all closed
 */
const defaultModals: ModalState = {
  assets: false,
  archive: false,
  activity: false,
  settings: false,
  imageGenerator: false,
  share: false,
  attachImage: false,
  unsavedChanges: false,
}

/**
 * UI Store implementation
 */
export const useUIStore = create<UIStore>((set) => ({
  // Modal state
  modals: { ...defaultModals },

  openModal: (name) =>
    set((state) => ({
      modals: { ...state.modals, [name]: true },
    })),

  closeModal: (name) =>
    set((state) => ({
      modals: { ...state.modals, [name]: false },
    })),

  closeAllModals: () =>
    set(() => ({
      modals: { ...defaultModals },
    })),

  toggleModal: (name) =>
    set((state) => ({
      modals: { ...state.modals, [name]: !state.modals[name] },
    })),

  // Title editing state
  editingTitle: null,
  tempTitle: '',

  setEditingTitle: (id) =>
    set(() => ({
      editingTitle: id,
    })),

  setTempTitle: (title) =>
    set(() => ({
      tempTitle: title,
    })),

  resetTitleEditing: () =>
    set(() => ({
      editingTitle: null,
      tempTitle: '',
    })),

  // Navigation state
  pendingNavigation: null,
  pendingDocument: null,

  setPendingNavigation: (path, doc = null) =>
    set(() => ({
      pendingNavigation: path,
      pendingDocument: doc,
    })),

  clearPendingNavigation: () =>
    set(() => ({
      pendingNavigation: null,
      pendingDocument: null,
    })),

  // Image viewer state
  viewingImage: null,

  setViewingImage: (image) =>
    set(() => ({
      viewingImage: image,
    })),
}))

/**
 * Selector helpers for common use cases
 * Use these to minimize re-renders by subscribing to specific state slices
 */
export const selectModals = (state: UIStore) => state.modals
export const selectModal = (name: ModalName) => (state: UIStore) => state.modals[name]
export const selectEditingTitle = (state: UIStore) => state.editingTitle
export const selectTempTitle = (state: UIStore) => state.tempTitle
export const selectPendingNavigation = (state: UIStore) => state.pendingNavigation
export const selectViewingImage = (state: UIStore) => state.viewingImage

export default useUIStore
