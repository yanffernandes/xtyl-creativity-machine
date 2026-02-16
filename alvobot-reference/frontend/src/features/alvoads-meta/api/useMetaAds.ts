import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

export interface MetaPage {
  id: string
  user_id: string
  page_id: string
  page_name: string
  page_access_token?: string
  page_category?: string
  is_active: boolean
  subscriber_count?: number
  created_at: string
  updated_at?: string
}

export interface MetaConnection {
  id: string
  user_id: string
  connection_name: string
  plataform_name: string
  platform_user_id?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  metadata?: {
    email?: string
    name?: string
  }
}

export interface MetaSubscriber {
  id: string
  page_id: string
  subscriber_psid: string
  first_name?: string
  last_name?: string
  profile_pic?: string
  locale?: string
  is_subscribed: boolean
  created_at: string
  updated_at?: string
}

export interface MetaAdsScraper {
  id: string
  user_id: string
  ad_id?: string
  campaign_name?: string
  ad_text?: string
  image_url?: string
  page_name?: string
  status: 'active' | 'paused' | 'draft'
  metrics?: {
    impressions?: number
    clicks?: number
    conversions?: number
    spend?: number
    ctr?: number
    cpc?: number
  }
  created_at: string
  updated_at?: string
}

export interface MetaStats {
  totalPages: number
  activePages: number
  totalSubscribers: number
  totalAds: number
  totalSpent: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
}

async function fetchMetaConnection(workspaceId: string): Promise<MetaConnection | null> {
  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('plataform_name', 'meta')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows returned
    throw error
  }
  return data
}

async function fetchMetaPages(workspaceId: string): Promise<MetaPage[]> {
  const { data, error } = await supabase
    .from('meta_pages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function fetchMetaSubscribers(workspaceId: string, pageId?: string): Promise<MetaSubscriber[]> {
  // Subscribers are scoped through their page's workspace
  // First get page_ids belonging to this workspace, then filter subscribers
  if (pageId) {
    // Direct page_id filter - caller already workspace-scoped the page
    const { data, error } = await supabase
      .from('meta_subscribers')
      .select('*')
      .eq('page_id', pageId)
      .eq('is_subscribed', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // Without pageId, get all subscribers for pages in this workspace
  const { data: pages } = await supabase
    .from('meta_pages')
    .select('page_id')
    .eq('workspace_id', workspaceId)

  if (!pages || pages.length === 0) return []

  const pageIds = pages.map(p => p.page_id)
  const { data, error } = await supabase
    .from('meta_subscribers')
    .select('*')
    .in('page_id', pageIds)
    .eq('is_subscribed', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function fetchMetaAdsData(userId: string): Promise<MetaAdsScraper[]> {
  const { data, error } = await supabase
    .from('google_ads_scraper') // Also stores Meta ads data
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function fetchMetaStats(workspaceId: string): Promise<MetaStats> {
  // Fetch pages scoped to workspace
  const { data: pages, error: pagesError } = await supabase
    .from('meta_pages')
    .select('id, is_active, subscriber_count')
    .eq('workspace_id', workspaceId)

  if (pagesError) throw pagesError

  // Fetch ads data scoped to workspace
  const { data: adsData, error: adsError } = await supabase
    .from('google_ads_scraper')
    .select('metrics')
    .eq('workspace_id', workspaceId)

  if (adsError) throw adsError

  const pagesList = pages || []
  const adsList = adsData || []

  // Calculate totals
  const totalPages = pagesList.length
  const activePages = pagesList.filter((p) => p.is_active).length
  const totalSubscribers = pagesList.reduce((acc, p) => acc + (p.subscriber_count || 0), 0)
  const totalAds = adsList.length

  let totalSpent = 0
  let totalImpressions = 0
  let totalClicks = 0
  let totalConversions = 0

  adsList.forEach((ad) => {
    const metrics = ad.metrics as MetaAdsScraper['metrics']
    if (metrics) {
      totalSpent += metrics.spend || 0
      totalImpressions += metrics.impressions || 0
      totalClicks += metrics.clicks || 0
      totalConversions += metrics.conversions || 0
    }
  })

  return {
    totalPages,
    activePages,
    totalSubscribers,
    totalAds,
    totalSpent,
    totalImpressions,
    totalClicks,
    totalConversions,
  }
}

// Query hooks

export function useMetaConnection() {
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: [...queryKeys.metaAds.all, 'connection', workspaceId],
    queryFn: () => fetchMetaConnection(workspaceId!),
    enabled: !!user?.id && !!workspaceId,
  })
}

export function useMetaPages() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: queryKeys.metaAds.pages(workspaceId),
    queryFn: () => fetchMetaPages(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useMetaSubscribers(pageId?: string) {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: [...queryKeys.metaAds.all, 'subscribers', pageId, workspaceId],
    queryFn: () => fetchMetaSubscribers(workspaceId!, pageId),
    enabled: !!workspaceId,
  })
}

export function useMetaAdsData() {
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: [...queryKeys.metaAds.all, 'ads', workspaceId],
    queryFn: () => fetchMetaAdsData(user!.id),
    enabled: !!user?.id && !!workspaceId,
  })
}

export function useMetaStats() {
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  return useQuery({
    queryKey: queryKeys.metaAds.stats(workspaceId),
    queryFn: () => fetchMetaStats(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Helper functions

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toLocaleString('pt-BR')
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

// Ad Accounts types and hooks

export interface MetaAdAccount {
  id: string
  name: string
  accountId: string
  accountStatus: number
  currency: string
  timezone: string
  businessName?: string
}

export interface MetaConnectionWithAdAccounts {
  connectionId: string
  connectionName: string
  adAccounts: MetaAdAccount[]
}

async function fetchAllAdAccounts(): Promise<MetaConnectionWithAdAccounts[]> {
  const response = await api.get<{
    success: boolean
    connections: MetaConnectionWithAdAccounts[]
  }>('/meta/ad-accounts')
  return response.connections
}

async function fetchAdAccountsForConnection(connectionId: string): Promise<MetaAdAccount[]> {
  const response = await api.get<{
    success: boolean
    adAccounts: MetaAdAccount[]
  }>(`/meta/connections/${connectionId}/ad-accounts`)
  return response.adAccounts
}

/**
 * Hook to get all ad accounts across all Meta connections
 */
export function useMetaAdAccounts() {
  return useQuery({
    queryKey: [...queryKeys.metaAds.all, 'ad-accounts'],
    queryFn: fetchAllAdAccounts,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to get ad accounts for a specific connection
 */
export function useMetaAdAccountsForConnection(connectionId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.metaAds.all, 'ad-accounts', connectionId],
    queryFn: () => fetchAdAccountsForConnection(connectionId!),
    enabled: !!connectionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
