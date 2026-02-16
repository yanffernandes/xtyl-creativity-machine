// API request types
export interface GenerateNichesRequest {
  language: string
  domain?: string
}

export interface GenerateCategoriesRequest {
  niche: string
}

export interface GenerateTitlesRequest {
  niche: string
  categories: string[]
}

export interface SaveStructureRequest {
  projectId: number
  niche: string
  categories: string[]
  articles: Array<{
    id: string
    title: string
    category: string
  }>
  installationType: 'fast' | 'custom'
  authorToggle: boolean
  logoToggle: boolean
  titleToggle: boolean
}

// API response types
export interface GenerateNichesResponse {
  niches: string[]
  processingTime: number
}

export interface CategoryItem {
  title: string
}

export interface GenerateCategoriesResponse {
  categories: CategoryItem[][]
  processingTime: number
}

export interface GeneratedTitle {
  title: string
  category: string
}

export interface GenerateTitlesResponse {
  titles: GeneratedTitle[]
  processingTime: number
}

export interface SaveStructureResponse {
  success: boolean
  articlesCreated: number
  categoriesCreated: number
  message: string
}
