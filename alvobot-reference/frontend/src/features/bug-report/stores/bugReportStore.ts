import { create } from 'zustand'
import type { ConsoleError, BugSeverity, BugType, RecordingState, ScreenshotState } from '../types'

interface BugReportAttachmentItem {
  id: string
  file: File
  type: 'screenshot' | 'video' | 'file'
  preview?: string
  isPrimary?: boolean
}

interface BugReportFormData {
  title: string
  description: string
  severity: BugSeverity
  bug_type: BugType
}

interface BugReportState {
  // Modal state
  isModalOpen: boolean
  isSubmitting: boolean

  // Form data
  formData: BugReportFormData

  // Screenshot state
  screenshot: ScreenshotState

  // Recording state
  recording: RecordingState

  // Attachments
  attachments: BugReportAttachmentItem[]

  // Console errors snapshot (captured when modal opens)
  consoleErrorsSnapshot: ConsoleError[]

  // Button state (collapsed/expanded)
  isButtonCollapsed: boolean
}

interface BugReportActions {
  // Modal actions
  openModal: () => void
  closeModal: () => void
  resetModal: () => void

  // Form actions
  setFormData: (data: Partial<BugReportFormData>) => void
  resetFormData: () => void

  // Screenshot actions
  setScreenshot: (screenshot: Partial<ScreenshotState>) => void
  clearScreenshot: () => void

  // Recording actions
  setRecording: (recording: Partial<RecordingState>) => void
  resetRecording: () => void

  // Attachment actions
  addAttachment: (attachment: BugReportAttachmentItem) => void
  removeAttachment: (id: string) => void
  clearAttachments: () => void

  // Console errors
  setConsoleErrorsSnapshot: (errors: ConsoleError[]) => void

  // Button state
  setButtonCollapsed: (collapsed: boolean) => void
  toggleButtonCollapsed: () => void

  // Submission
  setSubmitting: (submitting: boolean) => void
}

type BugReportStore = BugReportState & BugReportActions

const initialFormData: BugReportFormData = {
  title: '',
  description: '',
  severity: 'medium',
  bug_type: 'functional',
}

const initialScreenshotState: ScreenshotState = {
  isCapturing: false,
  blob: null,
  dataUrl: null,
  error: null,
}

const initialRecordingState: RecordingState = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  stream: null,
}

export const useBugReportStore = create<BugReportStore>((set) => ({
  // Initial state
  isModalOpen: false,
  isSubmitting: false,
  formData: initialFormData,
  screenshot: initialScreenshotState,
  recording: initialRecordingState,
  attachments: [],
  consoleErrorsSnapshot: [],
  isButtonCollapsed: false,

  // Modal actions
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
  resetModal: () =>
    set({
      isModalOpen: false,
      isSubmitting: false,
      formData: initialFormData,
      screenshot: initialScreenshotState,
      recording: initialRecordingState,
      attachments: [],
      consoleErrorsSnapshot: [],
    }),

  // Form actions
  setFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  resetFormData: () => set({ formData: initialFormData }),

  // Screenshot actions
  setScreenshot: (screenshot) =>
    set((state) => ({
      screenshot: { ...state.screenshot, ...screenshot },
    })),
  clearScreenshot: () => set({ screenshot: initialScreenshotState }),

  // Recording actions
  setRecording: (recording) =>
    set((state) => ({
      recording: { ...state.recording, ...recording },
    })),
  resetRecording: () => set({ recording: initialRecordingState }),

  // Attachment actions
  addAttachment: (attachment) =>
    set((state) => ({
      attachments: [...state.attachments, attachment],
    })),
  removeAttachment: (id) =>
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== id),
    })),
  clearAttachments: () => set({ attachments: [] }),

  // Console errors
  setConsoleErrorsSnapshot: (errors) => set({ consoleErrorsSnapshot: errors }),

  // Button state
  setButtonCollapsed: (collapsed) => set({ isButtonCollapsed: collapsed }),
  toggleButtonCollapsed: () =>
    set((state) => ({ isButtonCollapsed: !state.isButtonCollapsed })),

  // Submission
  setSubmitting: (submitting) => set({ isSubmitting: submitting }),
}))
