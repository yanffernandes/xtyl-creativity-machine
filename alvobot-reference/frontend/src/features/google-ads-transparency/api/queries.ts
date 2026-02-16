import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type {
  GoogleAd,
  GoogleAdsAdvertiser,
  GoogleAdsFilters,
  PaginatedResponse,
  SelectOption,
} from '../types'

export function useGoogleAds(
  filters: GoogleAdsFilters,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: queryKeys.googleAdsTransparency.list(filters, page, limit),
    queryFn: async (): Promise<PaginatedResponse<GoogleAd>> => {
      const offset = (page - 1) * limit

      let query = supabase
        .from('google_ads_scraper')
        .select('*', { count: 'exact' })

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `advertiserName.ilike.%${filters.search}%,advertiserId.ilike.%${filters.search}%`
        )
      }

      // Apply advertiser filter
      if (filters.advertiserId) {
        query = query.eq('advertiserId', filters.advertiserId)
      }

      // Apply format filter
      if (filters.format) {
        query = query.eq('format', filters.format)
      }

      // Apply ordering
      if (filters.isRandomOrder) {
        // For random order, we use a random() function in SQL
        // Since Supabase doesn't support random() directly, we'll fetch and shuffle client-side
        query = query.order('created_at', { ascending: false })
      } else {
        query = query.order('lastShown', { ascending: false, nullsFirst: false })
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) throw error

      let result = (data || []) as GoogleAd[]

      // Shuffle if random order is enabled
      if (filters.isRandomOrder && result.length > 0) {
        result = result.sort(() => Math.random() - 0.5)
      }

      return {
        data: result,
        count: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useGoogleAd(creativeId: string | null) {
  return useQuery({
    queryKey: queryKeys.googleAdsTransparency.detail(creativeId || ''),
    queryFn: async (): Promise<GoogleAd | null> => {
      if (!creativeId) return null

      const { data, error } = await supabase
        .from('google_ads_scraper')
        .select('*')
        .eq('creativeId', creativeId)
        .single()

      if (error) throw error

      return data as GoogleAd
    },
    enabled: !!creativeId,
  })
}

export function useGoogleAdsAdvertisers() {
  return useQuery({
    queryKey: queryKeys.googleAdsTransparency.advertisers(),
    queryFn: async (): Promise<GoogleAdsAdvertiser[]> => {
      const { data, error } = await supabase
        .from('google_ads_scraper_advertiser')
        .select('*')
        .order('advertiserName', { ascending: true })

      if (error) throw error

      return (data || []) as GoogleAdsAdvertiser[]
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useAdvertiserOptions() {
  return useQuery({
    queryKey: queryKeys.googleAdsTransparency.advertiserOptions(),
    queryFn: async (): Promise<SelectOption[]> => {
      const { data, error } = await supabase
        .from('google_ads_scraper')
        .select('advertiserId, advertiserName')
        .order('advertiserName', { ascending: true })

      if (error) throw error

      // Get unique advertisers
      const uniqueAdvertisers = new Map<string, string>()
      ;(data || []).forEach((item: { advertiserId: string; advertiserName: string }) => {
        if (!uniqueAdvertisers.has(item.advertiserId)) {
          uniqueAdvertisers.set(item.advertiserId, item.advertiserName)
        }
      })

      return Array.from(uniqueAdvertisers.entries()).map(([value, label]) => ({
        value,
        label,
      }))
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export function useFormatOptions() {
  return useQuery({
    queryKey: queryKeys.googleAdsTransparency.formatOptions(),
    queryFn: async (): Promise<SelectOption[]> => {
      const { data, error } = await supabase
        .from('google_ads_scraper')
        .select('format')

      if (error) throw error

      // Get unique formats
      const uniqueFormats = new Set<string>()
      ;(data || []).forEach((item: { format: string }) => {
        if (item.format) {
          uniqueFormats.add(item.format)
        }
      })

      return Array.from(uniqueFormats).map((format) => ({
        value: format,
        label: format,
      }))
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  })
}
