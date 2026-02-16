export interface KeywordUsage {
  articleId: number
  articleTitle?: string
  projectId?: number
  projectName?: string
  createdAt: string
}

export interface Keyword {
  id: number
  keyword: string // mapped from 'word' column
  search_volume?: number
  difficulty?: number
  cpc?: number
  cpc_max?: number
  competition?: string
  language?: string
  country?: string
  visibility?: string
  created_at: string
  updated_at?: string
  user_added_at?: string // from users_keywords junction table
  // Articles/projects where this keyword was used
  usages?: KeywordUsage[]
  articles_count?: number
}

export interface KeywordFilters {
  search?: string
  minVolume?: number
  maxDifficulty?: number
  language?: string
  country?: string
}

export interface CreateKeywordInput {
  word: string
  search_volume?: number
  cpc_min?: number
  cpc_max?: number
  competition?: string
  language?: string
  country?: string
  visibility?: string
}

export interface UpdateKeywordInput extends Partial<CreateKeywordInput> {
  id: number
}
