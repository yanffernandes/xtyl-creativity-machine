import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase, getCurrentUserId } from '@/shared/utils/supabase'
import type {
  BugReport,
  BugReportSettings,
  BugReportAttachment,
  CreateBugReportInput,
  UpdateBugReportStatusInput,
  UpdateBugReportSettingsInput,
  UploadAttachmentInput,
  SendClickUpResponse,
  BugStatus,
} from '../types'

// ============================================
// Mutation Functions
// ============================================

/**
 * Create a new bug report
 */
async function createBugReport(
  input: CreateBugReportInput
): Promise<BugReport> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('bug_reports')
    .insert({
      ...input,
      user_id: userId,
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as BugReport
}

/**
 * Update bug report status
 */
async function updateBugReportStatus(
  id: string,
  input: UpdateBugReportStatusInput
): Promise<BugReport> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const updateData: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  }

  // Set resolved_at when status changes to resolved
  if (input.status === 'resolved') {
    updateData.resolved_at = new Date().toISOString()
  } else if (input.status === 'open' || input.status === 'in_progress') {
    updateData.resolved_at = null
  }

  const { data, error } = await supabase
    .from('bug_reports')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as BugReport
}

/**
 * Upload attachment to storage and create record
 */
async function uploadAttachment(
  input: UploadAttachmentInput
): Promise<BugReportAttachment> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { bug_report_id, file, attachment_type, is_primary_screenshot } = input

  // Generate storage path
  const dateFolder = format(new Date(), 'yyyy-MM-dd')
  const fileExt = file.name.split('.').pop() || 'bin'
  const uniqueId = crypto.randomUUID()
  const storagePath = `${userId}/${dateFolder}/${attachment_type}-${uniqueId}.${fileExt}`

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('bug-reports')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  // Create attachment record
  const { data, error } = await supabase
    .from('bug_report_attachments')
    .insert({
      bug_report_id,
      attachment_type,
      storage_path: storagePath,
      original_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      is_primary_screenshot: is_primary_screenshot || false,
    })
    .select()
    .single()

  if (error) {
    // Try to clean up the uploaded file
    await supabase.storage.from('bug-reports').remove([storagePath])
    throw new Error(error.message)
  }

  return data as BugReportAttachment
}

/**
 * Upsert bug report settings
 */
async function updateBugReportSettings(
  input: UpdateBugReportSettingsInput
): Promise<BugReportSettings> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('bug_report_settings')
    .upsert(
      {
        user_id: userId,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as BugReportSettings
}

/**
 * Send bug report to ClickUp via backend
 * Email is configured server-side via CLICKUP_LIST_EMAIL env var
 */
async function sendToClickUp(bugReportId: string): Promise<SendClickUpResponse> {
  return api.post<SendClickUpResponse>('/bug-report/send-clickup', {
    bugReportId,
  })
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a new bug report
 */
export function useCreateBugReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createBugReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReports.all })
    },
  })
}

/**
 * Hook to update bug report status
 */
export function useUpdateBugReportStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BugStatus }) =>
      updateBugReportStatus(id, { status }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReports.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReports.lists() })
    },
  })
}

/**
 * Hook to upload attachment
 */
export function useUploadAttachment() {
  return useMutation({
    mutationFn: uploadAttachment,
  })
}

/**
 * Hook to update bug report settings
 */
export function useUpdateBugReportSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateBugReportSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReportSettings.current() })
    },
  })
}

/**
 * Hook to send bug report to ClickUp
 */
export function useSendToClickUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bugReportId: string) => sendToClickUp(bugReportId),
    onSuccess: (_, bugReportId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bugReports.detail(bugReportId) })
    },
  })
}
