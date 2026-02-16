import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase, getCurrentUserId } from '@/shared/utils/supabase'
import type {
  BugReportWithAttachments,
  BugReportSettings,
  BugReportFilters,
} from '../types'

/**
 * Fetch bug reports with optional filters
 */
async function fetchBugReports(
  filters?: BugReportFilters
): Promise<BugReportWithAttachments[]> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  let query = supabase
    .from('bug_reports')
    .select(`
      *,
      bug_report_attachments (
        id,
        attachment_type,
        storage_path,
        original_name,
        file_size,
        mime_type,
        is_primary_screenshot
      )
    `)
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.severity) {
    query = query.eq('severity', filters.severity)
  }
  if (filters?.bug_type) {
    query = query.eq('bug_type', filters.bug_type)
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate)
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data as BugReportWithAttachments[]
}

/**
 * Fetch a single bug report by ID
 */
async function fetchBugReport(id: string): Promise<BugReportWithAttachments> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('bug_reports')
    .select(`
      *,
      bug_report_attachments (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as BugReportWithAttachments
}

/**
 * Fetch current user's bug report settings
 */
async function fetchBugReportSettings(): Promise<BugReportSettings | null> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('bug_report_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data as BugReportSettings | null
}

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to fetch bug reports list
 */
export function useBugReports(filters?: BugReportFilters) {
  return useQuery({
    queryKey: queryKeys.bugReports.list(filters),
    queryFn: () => fetchBugReports(filters),
  })
}

/**
 * Hook to fetch a single bug report
 */
export function useBugReport(id: string) {
  return useQuery({
    queryKey: queryKeys.bugReports.detail(id),
    queryFn: () => fetchBugReport(id),
    enabled: !!id,
  })
}

/**
 * Hook to fetch user's bug report settings
 */
export function useBugReportSettings() {
  return useQuery({
    queryKey: queryKeys.bugReportSettings.current(),
    queryFn: fetchBugReportSettings,
  })
}
