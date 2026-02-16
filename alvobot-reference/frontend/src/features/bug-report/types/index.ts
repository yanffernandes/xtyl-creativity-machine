// Bug Report Types
// Feature: 021-bug-report-system

// ============================================
// Enums / Constants
// ============================================

export const BUG_SEVERITY = ['low', 'medium', 'high', 'critical'] as const
export type BugSeverity = (typeof BUG_SEVERITY)[number]

export const BUG_TYPE = ['visual', 'functional', 'performance', 'other'] as const
export type BugType = (typeof BUG_TYPE)[number]

export const BUG_STATUS = ['open', 'in_progress', 'resolved', 'closed'] as const
export type BugStatus = (typeof BUG_STATUS)[number]

export const ATTACHMENT_TYPE = ['screenshot', 'video', 'file'] as const
export type AttachmentType = (typeof ATTACHMENT_TYPE)[number]

// ============================================
// Browser Info (captured automatically)
// ============================================

export interface BrowserInfo {
  userAgent: string
  language: string
  platform: string
  screenWidth: number
  screenHeight: number
  viewportWidth: number
  viewportHeight: number
  devicePixelRatio: number
  online: boolean
  cookiesEnabled: boolean
}

// ============================================
// Console Errors (captured automatically)
// ============================================

export interface ConsoleError {
  type: 'error' | 'warn'
  message: string
  stack?: string
  timestamp: number
  url?: string
}

// ============================================
// Bug Report Entities
// ============================================

export interface BugReport {
  id: string
  user_id: string
  workspace_id: string
  title: string
  description: string
  severity: BugSeverity
  bug_type: BugType
  status: BugStatus
  page_url: string
  browser_info: BrowserInfo
  console_errors: ConsoleError[]
  clickup_task_id: string | null
  clickup_sent_at: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface BugReportAttachment {
  id: string
  bug_report_id: string
  attachment_type: AttachmentType
  storage_path: string
  original_name: string
  file_size: number
  mime_type: string
  is_primary_screenshot: boolean
  created_at: string
}

export interface BugReportSettings {
  id: string
  user_id: string
  clickup_email: string | null
  button_collapsed: boolean
  created_at: string
  updated_at: string
}

// ============================================
// API Input Types
// ============================================

export interface CreateBugReportInput {
  title: string
  description: string
  severity: BugSeverity
  bug_type: BugType
  page_url: string
  browser_info: BrowserInfo
  console_errors: ConsoleError[]
}

export interface UpdateBugReportStatusInput {
  status: BugStatus
  resolved_at?: string | null
}

export interface UpdateBugReportSettingsInput {
  clickup_email?: string | null
  button_collapsed?: boolean
}

export interface UploadAttachmentInput {
  bug_report_id: string
  file: File
  attachment_type: AttachmentType
  is_primary_screenshot?: boolean
}

// ============================================
// API Response Types
// ============================================

export interface BugReportWithAttachments extends BugReport {
  bug_report_attachments: BugReportAttachment[]
}

export interface SendClickUpResponse {
  success: boolean
  message: string
  sentAt?: string
  error?: string
  code?: 'INVALID_EMAIL' | 'REPORT_NOT_FOUND' | 'ALREADY_SENT' | 'EMAIL_FAILED'
}

// ============================================
// Filter Types
// ============================================

export interface BugReportFilters {
  status?: BugStatus
  severity?: BugSeverity
  bug_type?: BugType
  startDate?: string
  endDate?: string
  search?: string
}

// ============================================
// File Validation
// ============================================

export const ALLOWED_FILE_TYPES = {
  image: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  video: ['video/webm', 'video/mp4'],
  document: ['application/pdf', 'text/plain', 'text/csv'],
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_ATTACHMENTS = 5
export const MAX_VIDEO_DURATION = 60 // 1 minute in seconds

// ============================================
// Recording State
// ============================================

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  stream: MediaStream | null
}

// ============================================
// Screenshot State
// ============================================

export interface ScreenshotState {
  isCapturing: boolean
  blob: Blob | null
  dataUrl: string | null
  error: string | null
}
