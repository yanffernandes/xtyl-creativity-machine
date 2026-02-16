import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { GoogleAdsAdvertiser } from '../types'

interface AddAdvertiserInput {
  advertiserId: string
  advertiserName: string
}

export function useAddAdvertiser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AddAdvertiserInput): Promise<GoogleAdsAdvertiser> => {
      const { data, error } = await supabase
        .from('google_ads_scraper_advertiser')
        .insert({
          advertiserId: input.advertiserId,
          advertiserName: input.advertiserName,
          active: true,
        })
        .select()
        .single()

      if (error) throw error

      return data as GoogleAdsAdvertiser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsTransparency.advertisers(),
      })
    },
  })
}

export function useToggleAdvertiser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      advertiserId,
      active,
    }: {
      advertiserId: string
      active: boolean
    }): Promise<GoogleAdsAdvertiser> => {
      const { data, error } = await supabase
        .from('google_ads_scraper_advertiser')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('advertiserId', advertiserId)
        .select()
        .single()

      if (error) throw error

      return data as GoogleAdsAdvertiser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsTransparency.advertisers(),
      })
    },
  })
}

export function useDeleteAdvertiser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (advertiserId: string): Promise<void> => {
      const { error } = await supabase
        .from('google_ads_scraper_advertiser')
        .delete()
        .eq('advertiserId', advertiserId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.googleAdsTransparency.advertisers(),
      })
    },
  })
}
