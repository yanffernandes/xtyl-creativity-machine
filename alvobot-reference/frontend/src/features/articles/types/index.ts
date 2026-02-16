import type { Article } from '@/shared/types/entities'

export type { Article }

export type ArticleStatus = 'draft' | 'published' | 'scheduled' | 'archived'

export interface ArticleFilters {
  search?: string
  status?: ArticleStatus
  projectId?: number
}

export interface CreateArticleInput {
  title: string
  content?: string
  excerpt?: string
  status?: ArticleStatus
  project_id?: number
  keyword_used?: string
  language?: string
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
  id: number
}
