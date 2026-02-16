export interface PageSpeedApiResponse {
  captchaResult: string;
  kind: string;
  id: string;
  loadingExperience?: {
    metrics: {
      CUMULATIVE_LAYOUT_SHIFT_SCORE?: MetricValue;
      FIRST_CONTENTFUL_PAINT_MS?: MetricValue;
      FIRST_INPUT_DELAY_MS?: MetricValue;
      LARGEST_CONTENTFUL_PAINT_MS?: MetricValue;
      INTERACTION_TO_NEXT_PAINT?: MetricValue;
    };
    overall_category: "FAST" | "AVERAGE" | "SLOW";
  };
  lighthouseResult: {
    requestedUrl: string;
    finalUrl: string;
    categories: {
      performance?: CategoryScore;
      accessibility?: CategoryScore;
      "best-practices"?: CategoryScore;
      seo?: CategoryScore;
    };
    audits: {
      "largest-contentful-paint"?: AuditResult;
      "first-contentful-paint"?: AuditResult;
      "speed-index"?: AuditResult;
      "total-blocking-time"?: AuditResult;
      "cumulative-layout-shift"?: AuditResult;
      "server-response-time"?: AuditResult;
    };
  };
  analysisUTCTimestamp: string;
}

interface MetricValue {
  percentile: number;
  distributions: Array<{ min: number; max: number; proportion: number }>;
  category: "FAST" | "AVERAGE" | "SLOW";
}

interface CategoryScore {
  id: string;
  title: string;
  score: number; // 0-1
}

interface AuditResult {
  id: string;
  title: string;
  score: number | null;
  numericValue?: number;
  numericUnit?: string;
  displayValue?: string;
}

export interface PageSpeedCheckResult {
  projectId: number;
  strategy: "mobile" | "desktop";
  urlChecked: string;

  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;

  lcpMs: number | null;
  fidMs: number | null;
  cls: number | null;
  fcpMs: number | null;
  ttfbMs: number | null;
  siMs: number | null;
  tbtMs: number | null;

  lcpAssessment: string | null;
  fidAssessment: string | null;
  clsAssessment: string | null;

  error?: string;
}

export interface PageSpeedHistoryRecord {
  id: string;
  project_id: number;
  workspace_id: string;
  checked_at: string;
  strategy: "mobile" | "desktop";
  url_checked: string;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  lcp_ms: number | null;
  fid_ms: number | null;
  cls: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  si_ms: number | null;
  tbt_ms: number | null;
  lcp_assessment: string | null;
  fid_assessment: string | null;
  cls_assessment: string | null;
  raw_response: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export interface PageSpeedQuotaRecord {
  id: string;
  workspace_id: string;
  date: string;
  requests_count: number;
  requests_limit: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithDomain {
  id: number;
  domain: string | null;
  workspace_id: string;
  pagespeed_last_check: string | null;
}
