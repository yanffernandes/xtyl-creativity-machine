export interface PageSpeedHistory {
  id: string
  project_id: number
  workspace_id: string
  checked_at: string
  strategy: 'mobile' | 'desktop'
  url_checked: string
  performance_score: number | null
  accessibility_score: number | null
  best_practices_score: number | null
  seo_score: number | null
  lcp_ms: number | null
  fid_ms: number | null
  cls: number | null
  fcp_ms: number | null
  ttfb_ms: number | null
  si_ms: number | null
  tbt_ms: number | null
  lcp_assessment: 'good' | 'needs_improvement' | 'poor' | null
  fid_assessment: 'good' | 'needs_improvement' | 'poor' | null
  cls_assessment: 'good' | 'needs_improvement' | 'poor' | null
  error_message: string | null
}

export interface PageSpeedCheckResponse {
  mobile: PageSpeedCheckResult
  desktop: PageSpeedCheckResult
}

export interface PageSpeedCheckResult {
  projectId: number
  strategy: 'mobile' | 'desktop'
  urlChecked: string
  performanceScore: number | null
  accessibilityScore: number | null
  bestPracticesScore: number | null
  seoScore: number | null
  lcpMs: number | null
  fidMs: number | null
  cls: number | null
  fcpMs: number | null
  ttfbMs: number | null
  siMs: number | null
  tbtMs: number | null
  lcpAssessment: string | null
  fidAssessment: string | null
  clsAssessment: string | null
  error?: string
}

export interface PageSpeedQuota {
  date: string
  used: number
  limit: number
  remaining: number
}

/**
 * Response for URL-only check (without project association)
 */
export interface PageSpeedUrlCheckResponse {
  mobile: PageSpeedUrlCheckResult
  desktop: PageSpeedUrlCheckResult
}

export interface PageSpeedUrlCheckResult {
  strategy: 'mobile' | 'desktop'
  urlChecked: string
  performanceScore: number | null
  accessibilityScore: number | null
  bestPracticesScore: number | null
  seoScore: number | null
  lcpMs: number | null
  fidMs: number | null
  cls: number | null
  fcpMs: number | null
  ttfbMs: number | null
  siMs: number | null
  tbtMs: number | null
  lcpAssessment: string | null
  fidAssessment: string | null
  clsAssessment: string | null
  error?: string
}
