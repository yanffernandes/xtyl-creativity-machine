/**
 * KeywordSnapshot - Snapshot of keyword data at article creation time
 * This is stored with articles to preserve the keyword metrics at the time
 * the article was created, even if the keyword data changes later.
 *
 * IMPORTANT: This type should be used by ALL features that create articles
 * to ensure consistency across the codebase.
 */
export interface KeywordSnapshot {
  id: number
  word: string
  search_volume?: number
  cpc_min?: number
  cpc_max?: number
  visibility?: string
  created_at?: string
  updated_at?: string
  competition?: string
  language?: string
  country?: string
}

/**
 * Minimal keyword data needed to create a snapshot
 * This interface matches the Keyword type from keywords feature
 */
export interface KeywordData {
  id: number
  keyword: string // Note: database uses 'word', but frontend uses 'keyword'
  search_volume?: number
  cpc?: number // cpc_min
  cpc_max?: number
  visibility?: string
  created_at?: string
  updated_at?: string
  competition?: string
  language?: string
  country?: string
}

/**
 * Creates a KeywordSnapshot from keyword data
 * Use this function whenever creating articles to ensure consistent snapshot structure
 *
 * @param keyword - The keyword data (from keywords table or mining results)
 * @returns KeywordSnapshot object ready to be stored with the article
 *
 * @example
 * const snapshot = createKeywordSnapshot(selectedKeyword)
 * await createArticle({ ...data, keyword_snapshot: snapshot })
 */
export function createKeywordSnapshot(keyword: KeywordData): KeywordSnapshot {
  return {
    id: keyword.id,
    word: keyword.keyword,
    search_volume: keyword.search_volume,
    cpc_min: keyword.cpc,
    cpc_max: keyword.cpc_max,
    visibility: keyword.visibility,
    created_at: keyword.created_at,
    updated_at: keyword.updated_at,
    competition: keyword.competition,
    language: keyword.language,
    country: keyword.country,
  }
}
