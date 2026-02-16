// Google Ads Transparency Types

export interface AdVariation {
  clickUrl?: string
  headline?: string
  description?: string
  imageUrl?: string
  displayUrl?: string
}

export interface GoogleAd {
  creativeId: string
  advertiserId: string
  advertiserName: string
  creativeRegions: string[]
  format: 'TEXT' | 'IMAGE' | 'VIDEO'
  lastShown: string
  previewUrl: string | null
  regionStats: Record<string, unknown>
  startUrl: string | null
  variations: AdVariation[]
  created_at: string
  updated_at: string | null
}

export interface GoogleAdsAdvertiser {
  advertiserId: string
  advertiserName: string
  active: boolean
  last_scraped_at: string | null
  estimatedAds: string | null
  created_at: string
  updated_at: string | null
}

export interface GoogleAdsFilters {
  search: string
  advertiserId: string | null
  format: string | null
  isRandomOrder: boolean
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  totalPages: number
}

export interface SelectOption {
  value: string
  label: string
}
