// Base types for the application

// Keyword types (centralized for all article creation)
export { createKeywordSnapshot } from './keyword'
export type { KeywordSnapshot, KeywordData } from './keyword'

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
}

export interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  user: User
}

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export interface QueryParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}
