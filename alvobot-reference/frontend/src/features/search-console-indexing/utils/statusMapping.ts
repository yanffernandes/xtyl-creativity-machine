import type { IndexingStatus } from '../types'

export function mapVerdictToStatus(verdict?: string | null): IndexingStatus {
  if (!verdict) return 'not_checked'

  const normalized = verdict.toLowerCase()

  const mapping: Record<string, IndexingStatus> = {
    pass: 'indexed',
    indexed: 'indexed',
    neutral: 'in_progress',
    pending: 'in_progress',
    fail: 'not_indexed',
    not_indexed: 'not_indexed',
    verdict_unspecified: 'not_indexed',
    error: 'error',
    unknown: 'not_checked',
  }

  return mapping[normalized] || 'not_checked'
}
