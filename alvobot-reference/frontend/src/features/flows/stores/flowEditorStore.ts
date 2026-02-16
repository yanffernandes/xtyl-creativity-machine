import { create } from 'zustand'
import { workspaceDependentRegistry } from '@/shared/hooks/useWorkspaceChangeGuard'
import type { ValidationError } from '../utils/validateFlow'
import type { Node, Edge } from '@xyflow/react'

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

interface FlowEditorState {
  // Flow identity
  flowId: string | null
  flowName: string
  isActive: boolean
  utmEnabled: boolean

  // Flow data
  nodes: Node[]
  edges: Edge[]

  // Save state
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  hasUnsavedChanges: boolean
  saveError: string | null

  // Validation state
  validationErrors: ValidationError[]
  nodeErrors: Map<string, ValidationError[]>

  // UI state
  isDirty: boolean
}

interface FlowEditorActions {
  // Initialize
  initializeFlow: (flowId: string | null, name: string, nodes: Node[], edges: Edge[], isActive: boolean, utmEnabled?: boolean) => void
  resetStore: () => void

  // Flow metadata
  setFlowName: (name: string) => void
  setIsActive: (isActive: boolean) => void
  setUtmEnabled: (utmEnabled: boolean) => void

  // Flow data
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  updateNode: (nodeId: string, data: unknown) => void

  // Save state
  markPendingSave: () => void
  startSaving: () => void
  savingComplete: (savedAt: Date) => void
  savingFailed: (error: string) => void
  clearSaveError: () => void

  // Validation
  setValidationErrors: (errors: ValidationError[]) => void
  clearValidationErrors: () => void
  getNodeErrors: (nodeId: string) => ValidationError[]
}

type FlowEditorStore = FlowEditorState & FlowEditorActions

// Empty array constant to avoid creating new references
const EMPTY_ERRORS: ValidationError[] = []

const initialState: FlowEditorState = {
  flowId: null,
  flowName: 'Novo Fluxo',
  isActive: false,
  utmEnabled: true, // Default to true for new flows
  nodes: [],
  edges: [],
  saveStatus: 'idle',
  lastSavedAt: null,
  hasUnsavedChanges: false,
  saveError: null,
  validationErrors: [],
  nodeErrors: new Map(),
  isDirty: false,
}

export const useFlowEditorStore = create<FlowEditorStore>()((set, get) => ({
  ...initialState,

  initializeFlow: (flowId, name, nodes, edges, isActive, utmEnabled = true) => {
    set({
      flowId,
      flowName: name,
      nodes,
      edges,
      isActive,
      utmEnabled,
      saveStatus: flowId ? 'saved' : 'idle',
      lastSavedAt: flowId ? new Date() : null,
      hasUnsavedChanges: false,
      saveError: null,
      validationErrors: [],
      nodeErrors: new Map(),
      isDirty: false,
    })
  },

  resetStore: () => set(initialState),

  setFlowName: (name) => {
    const currentName = get().flowName
    if (currentName !== name) {
      set({
        flowName: name,
        hasUnsavedChanges: true,
        isDirty: true,
        saveStatus: 'pending',
      })
    }
  },

  setIsActive: (isActive) => {
    const currentActive = get().isActive
    if (currentActive !== isActive) {
      set({
        isActive,
        hasUnsavedChanges: true,
        isDirty: true,
        saveStatus: 'pending',
      })
    }
  },

  setUtmEnabled: (utmEnabled) => {
    const currentUtmEnabled = get().utmEnabled
    if (currentUtmEnabled !== utmEnabled) {
      set({
        utmEnabled,
        hasUnsavedChanges: true,
        isDirty: true,
        saveStatus: 'pending',
      })
    }
  },

  setNodes: (nodes) => {
    set({
      nodes,
      hasUnsavedChanges: true,
      isDirty: true,
      saveStatus: 'pending',
    })
  },

  setEdges: (edges) => {
    set({
      edges,
      hasUnsavedChanges: true,
      isDirty: true,
      saveStatus: 'pending',
    })
  },

  updateNode: (nodeId, data) => {
    const nodes = get().nodes
    const updatedNodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, data: data as Record<string, unknown> } : n
    )
    set({
      nodes: updatedNodes,
      hasUnsavedChanges: true,
      isDirty: true,
      saveStatus: 'pending',
    })
  },

  markPendingSave: () => {
    set({
      saveStatus: 'pending',
      hasUnsavedChanges: true,
      isDirty: true,
    })
  },

  startSaving: () => {
    set({ saveStatus: 'saving' })
  },

  savingComplete: (savedAt) => {
    set({
      saveStatus: 'saved',
      lastSavedAt: savedAt,
      hasUnsavedChanges: false,
      saveError: null,
      isDirty: false,
    })
  },

  savingFailed: (error) => {
    set({
      saveStatus: 'error',
      saveError: error,
    })
  },

  clearSaveError: () => {
    set({ saveError: null })
  },

  setValidationErrors: (errors) => {
    // Group errors by node ID
    const nodeErrors = new Map<string, ValidationError[]>()
    errors.forEach((error) => {
      const existing = nodeErrors.get(error.nodeId) || []
      existing.push(error)
      nodeErrors.set(error.nodeId, existing)
    })
    set({ validationErrors: errors, nodeErrors })
  },

  clearValidationErrors: () => {
    set({ validationErrors: [], nodeErrors: new Map() })
  },

  getNodeErrors: (nodeId) => {
    return get().nodeErrors.get(nodeId) || EMPTY_ERRORS
  },
}))

// Register as workspace-dependent (flow belongs to a specific workspace)
workspaceDependentRegistry.register('flowEditor', {
  reset: () => useFlowEditorStore.getState().resetStore(),
  isDirty: () => useFlowEditorStore.getState().hasUnsavedChanges,
  dirtyMessage: 'Você tem alterações não salvas no editor de fluxo.',
})
