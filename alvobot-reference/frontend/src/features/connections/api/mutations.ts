import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import type { Connection } from '@/shared/types/entities'
// Refresh connection token
import { api } from '@/shared/utils/api'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

export interface CreateConnectionInput {
  connection_name: string
  plataform_name: string
  platform_user_id?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  metadata?: Record<string, unknown>
  meta_app_id?: string
}

export interface UpdateConnectionInput {
  connection_name?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  metadata?: Record<string, unknown>
  is_active?: boolean
}

async function createConnection(
  userId: string,
  workspaceId: string,
  input: CreateConnectionInput
): Promise<Connection> {
  const { data, error } = await supabase
    .from('connections')
    .insert({
      ...input,
      user_id: userId,
      workspace_id: workspaceId,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateConnection(
  connectionId: string,
  input: UpdateConnectionInput
): Promise<Connection> {
  const { data, error } = await supabase
    .from('connections')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function deleteConnection(connectionId: string): Promise<void> {
  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from('connections')
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq('id', connectionId)

  if (error) throw error
}

async function toggleConnectionStatus(
  connectionId: string,
  isActive: boolean
): Promise<Connection> {
  const { data, error } = await supabase
    .from('connections')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateLastUsed(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .update({
      last_used_at: new Date().toISOString(),
    })
    .eq('id', connectionId)

  if (error) throw error
}

// Mutation hooks

export function useCreateConnection() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (input: CreateConnectionInput) =>
      createConnection(user!.id, workspaceId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.all })
      showToast.success('Conexão criada com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar conexão')
    },
  })
}

export function useUpdateConnection() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateConnectionInput & { id: string }) =>
      updateConnection(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.connections.detail(variables.id),
      })
      showToast.success('Conexão atualizada com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar conexão')
    },
  })
}

export function useDeleteConnection() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: deleteConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.all })
      showToast.success('Conexão excluída com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir conexão')
    },
  })
}

export function useToggleConnectionStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleConnectionStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.connections.detail(variables.id),
      })
      const statusMsg = variables.isActive ? 'ativada' : 'desativada'
      showToast.success(`Conexão ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao alterar status da conexão')
    },
  })
}

export function useUpdateLastUsed() {
  return useMutation({
    mutationFn: updateLastUsed,
  })
}

interface RefreshTokenResponse {
  success: boolean
  message?: string
  error?: string
  requiresReconnect?: boolean
  expiresAt?: string
}

async function refreshConnectionToken(
  connectionId: string,
  platform: 'meta' | 'google' | 'ad_manager' | 'adsense' | 'search_console' | 'analytics'
): Promise<RefreshTokenResponse> {
  if (platform === 'google') {
    return api.post<RefreshTokenResponse>(`/google/oauth/refresh/${connectionId}`, {})
  } if (platform === 'ad_manager') {
    return api.post<RefreshTokenResponse>(`/ad-manager/oauth/refresh/${connectionId}`, {})
  } if (platform === 'adsense') {
    return api.post<RefreshTokenResponse>(`/adsense/oauth/refresh/${connectionId}`, {})
  } if (platform === 'search_console') {
    return api.post<RefreshTokenResponse>(`/search-console/oauth/refresh/${connectionId}`, {})
  } if (platform === 'analytics') {
    return api.post<RefreshTokenResponse>(`/analytics/oauth/refresh/${connectionId}`, {})
  } 
    return api.post<RefreshTokenResponse>(`/meta/connections/${connectionId}/refresh-token`, {})
  
}

export function useRefreshConnectionToken() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: ({ connectionId, platform }: { connectionId: string; platform: 'meta' | 'google' | 'ad_manager' | 'adsense' | 'search_console' | 'analytics' }) =>
      refreshConnectionToken(connectionId, platform),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.connections.detail(variables.connectionId),
      })
      showToast.success('Token atualizado com sucesso')
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar token')
    },
  })
}

// Auto-refresh all expired tokens
interface AutoRefreshResult {
  connectionId: string
  connectionName: string
  platform: string
  success: boolean
  error?: string
  expiresAt?: string
}

interface AutoRefreshResponse {
  success: boolean
  refreshed: number
  total: number
  message: string
  results: AutoRefreshResult[]
}

async function autoRefreshTokens(): Promise<AutoRefreshResponse> {
  return api.post<AutoRefreshResponse>('/connections/auto-refresh', {})
}

export function useAutoRefreshTokens() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: autoRefreshTokens,
    onSuccess: (result) => {
      // Invalidate all connections to get fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.all })
      // Only show toast if tokens were actually refreshed
      if (result.refreshed > 0) {
        showToast.success(`${result.refreshed} token(s) atualizado(s) com sucesso`)
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar tokens')
    },
  })
}

// Get Meta pages for a connection
interface MetaPage {
  id: string
  page_id: string
  page_name: string
  category?: string
  is_active: boolean
  picture_url?: string
}

interface MetaPagesResponse {
  success: boolean
  pages: MetaPage[]
}

async function getMetaConnectionPages(connectionId: string): Promise<MetaPage[]> {
  const response = await api.get<MetaPagesResponse>(`/meta/connections/${connectionId}/pages`)
  return response.pages || []
}

export function useMetaConnectionPages(connectionId: string | null) {
  return useQuery({
    queryKey: ['meta-pages', connectionId],
    queryFn: () => getMetaConnectionPages(connectionId!),
    enabled: !!connectionId,
  })
}

// Update Meta page status
interface UpdateMetaPageInput {
  connectionId: string
  pageId: string
  isActive: boolean
}

async function updateMetaPageStatus(input: UpdateMetaPageInput): Promise<void> {
  const { error } = await supabase
    .from('meta_pages')
    .update({ is_active: input.isActive })
    .eq('connection_id', input.connectionId)
    .eq('page_id', input.pageId)

  if (error) throw error
}

export function useUpdateMetaPageStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateMetaPageStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meta-pages', variables.connectionId] })
      const statusMsg = variables.isActive ? 'ativada' : 'desativada'
      showToast.success(`Página ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status da página')
    },
  })
}

// Batch update Meta pages status (for Messages connections)
interface BatchUpdateMetaPagesInput {
  connectionId: string
  pageIds: string[]
  isActive: boolean
}

async function batchUpdateMetaPagesStatus(input: BatchUpdateMetaPagesInput): Promise<void> {
  const { error } = await supabase
    .from('meta_pages')
    .update({ is_active: input.isActive })
    .eq('connection_id', input.connectionId)
    .in('page_id', input.pageIds)

  if (error) throw error
}

export function useBatchUpdateMetaPagesStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: batchUpdateMetaPagesStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meta-pages', variables.connectionId] })
      const count = variables.pageIds.length
      const statusMsg = variables.isActive ? 'ativada(s)' : 'desativada(s)'
      showToast.success(`${count} página(s) ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status das páginas')
    },
  })
}

// Refresh Meta pages from Facebook (fetch new pages)
interface RefreshMetaPagesResponse {
  success: boolean
  pages: Array<{
    id: string
    name: string
    category?: string
    accessToken: string
    hasMessagingPermission: boolean
    pictureUrl?: string | null
  }>
}

async function refreshMetaPages(connectionId: string): Promise<RefreshMetaPagesResponse> {
  return api.post<RefreshMetaPagesResponse>(`/meta/connections/${connectionId}/pages/refresh`, {})
}

export function useRefreshMetaPages() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (connectionId: string) => refreshMetaPages(connectionId),
    onSuccess: (result, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['meta-pages', connectionId] })
      showToast.success(`${result.pages.length} página(s) sincronizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar páginas')
    },
  })
}

// ============================================
// Google Ads Accounts
// ============================================

export interface GoogleAdsAccount {
  id: string
  connection_id: string
  customer_id: string
  name: string
  currency?: string
  timezone?: string
  is_manager: boolean
  is_active: boolean
  login_customer_id?: string
  last_synced_at?: string
  created_at: string
  updated_at: string
}

interface GoogleAdsAccountsResponse {
  success: boolean
  accounts: GoogleAdsAccount[]
  synced?: number
  error?: string
}

// Get stored Google Ads accounts for a connection (from database)
async function getGoogleAdsStoredAccounts(connectionId: string): Promise<GoogleAdsAccount[]> {
  const response = await api.get<GoogleAdsAccountsResponse>(
    `/google/campaigns/accounts/${connectionId}/stored`
  )
  return response.accounts || []
}

export function useGoogleAdsStoredAccounts(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['google-ads-accounts', connectionId],
    queryFn: () => getGoogleAdsStoredAccounts(connectionId!),
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// Sync Google Ads accounts (fetch from API and store in database)
async function syncGoogleAdsAccounts(connectionId: string): Promise<GoogleAdsAccountsResponse> {
  return api.post<GoogleAdsAccountsResponse>(
    `/google/campaigns/accounts/${connectionId}/sync`,
    {}
  )
}

export function useSyncGoogleAdsAccounts() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (connectionId: string) => syncGoogleAdsAccounts(connectionId),
    onSuccess: (result, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['google-ads-accounts', connectionId] })
      showToast.success(`${result.synced || 0} conta(s) Google Ads sincronizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar contas Google Ads')
    },
  })
}

// Update single Google Ads account status
interface UpdateGoogleAdsAccountInput {
  connectionId: string
  customerId: string
  isActive: boolean
}

async function updateGoogleAdsAccountStatus(input: UpdateGoogleAdsAccountInput): Promise<void> {
  await api.post(`/google/campaigns/accounts/${input.connectionId}/${input.customerId}/status`, {
    is_active: input.isActive,
  })
}

export function useUpdateGoogleAdsAccountStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateGoogleAdsAccountStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['google-ads-accounts', variables.connectionId] })
      const statusMsg = variables.isActive ? 'ativada' : 'desativada'
      showToast.success(`Conta Google Ads ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status da conta')
    },
  })
}

// Bulk update Google Ads accounts status
interface BulkUpdateGoogleAdsAccountsInput {
  connectionId: string
  customerIds: string[]
  isActive: boolean
}

async function bulkUpdateGoogleAdsAccounts(input: BulkUpdateGoogleAdsAccountsInput): Promise<void> {
  await api.post(`/google/campaigns/accounts/${input.connectionId}/bulk-status`, {
    customerIds: input.customerIds,
    is_active: input.isActive,
  })
}

export function useBulkUpdateGoogleAdsAccounts() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: bulkUpdateGoogleAdsAccounts,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['google-ads-accounts', variables.connectionId] })
      showToast.success(`${variables.customerIds.length} conta(s) atualizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar contas')
    },
  })
}

// ============================================
// AdSense OAuth
// ============================================

interface InitiateAdSenseOAuthInput {
  connectionName: string
  workspaceId?: string
  reconnectConnectionId?: string
}

interface InitiateAdSenseOAuthResponse {
  success: boolean
  authorizationUrl: string
}

async function initiateAdSenseOAuth(
  input: InitiateAdSenseOAuthInput
): Promise<InitiateAdSenseOAuthResponse> {
  return api.post<InitiateAdSenseOAuthResponse>('/adsense/oauth/initiate', {
    connectionName: input.connectionName,
    workspaceId: input.workspaceId,
    reconnectConnectionId: input.reconnectConnectionId,
  })
}

export function useAdSenseOAuthInitiate() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: initiateAdSenseOAuth,
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao iniciar autenticação AdSense')
    },
  })
}

// ============================================
// Search Console OAuth
// ============================================

interface InitiateSearchConsoleOAuthInput {
  connectionName: string
  workspaceId?: string
  reconnectConnectionId?: string
}

interface InitiateSearchConsoleOAuthResponse {
  success: boolean
  authorizationUrl: string
}

async function initiateSearchConsoleOAuth(
  input: InitiateSearchConsoleOAuthInput
): Promise<InitiateSearchConsoleOAuthResponse> {
  return api.post<InitiateSearchConsoleOAuthResponse>('/search-console/oauth/initiate', {
    connectionName: input.connectionName,
    workspaceId: input.workspaceId,
    reconnectConnectionId: input.reconnectConnectionId,
  })
}

export function useSearchConsoleOAuthInitiate() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: initiateSearchConsoleOAuth,
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao iniciar autenticação Search Console')
    },
  })
}

// ============================================
// Analytics OAuth
// ============================================

interface InitiateAnalyticsOAuthInput {
  connectionName: string
  workspaceId?: string
  reconnectConnectionId?: string
}

interface InitiateAnalyticsOAuthResponse {
  success: boolean
  authorizationUrl: string
}

async function initiateAnalyticsOAuth(
  input: InitiateAnalyticsOAuthInput
): Promise<InitiateAnalyticsOAuthResponse> {
  return api.post<InitiateAnalyticsOAuthResponse>('/analytics/oauth/initiate', {
    connectionName: input.connectionName,
    workspaceId: input.workspaceId,
    reconnectConnectionId: input.reconnectConnectionId,
  })
}

export function useAnalyticsOAuthInitiate() {
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: initiateAnalyticsOAuth,
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao iniciar autenticação Analytics')
    },
  })
}

// ============================================
// Ad Manager Networks
// ============================================

export interface AdManagerNetwork {
  id: string
  connection_id: string
  network_code: string
  network_name: string
  currency_code?: string
  is_active: boolean
  last_synced_at?: string
  created_at: string
  updated_at: string
}

interface AdManagerNetworksResponse {
  success: boolean
  networks: AdManagerNetwork[]
  synced?: number
  error?: string
}

// Get stored Ad Manager networks for a connection (from database)
async function getAdManagerStoredNetworks(connectionId: string): Promise<AdManagerNetwork[]> {
  const response = await api.get<AdManagerNetworksResponse>(
    `/ad-manager/networks/list?connectionId=${connectionId}`
  )
  return response.networks || []
}

export function useAdManagerStoredNetworks(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['ad-manager-networks', connectionId],
    queryFn: () => getAdManagerStoredNetworks(connectionId!),
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// Sync Ad Manager networks (fetch from API and store in database)
async function syncAdManagerNetworks(connectionId: string): Promise<AdManagerNetworksResponse> {
  return api.post<AdManagerNetworksResponse>(
    '/ad-manager/networks/sync',
    { connectionId }
  )
}

export function useSyncAdManagerNetworks() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (connectionId: string) => syncAdManagerNetworks(connectionId),
    onSuccess: (result, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['ad-manager-networks', connectionId] })
      showToast.success(`${result.synced || 0} rede(s) Ad Manager sincronizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar redes Ad Manager')
    },
  })
}

// Update single Ad Manager network status
interface UpdateAdManagerNetworkInput {
  connectionId: string
  networkId: string
  isActive: boolean
}

async function updateAdManagerNetworkStatus(input: UpdateAdManagerNetworkInput): Promise<void> {
  await api.post('/ad-manager/networks/update', {
    networkId: input.networkId,
    isActive: input.isActive,
    connectionId: input.connectionId,
  })
}

export function useUpdateAdManagerNetworkStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateAdManagerNetworkStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ad-manager-networks', variables.connectionId] })
      const statusMsg = variables.isActive ? 'ativada' : 'desativada'
      showToast.success(`Rede Ad Manager ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status da rede')
    },
  })
}

// Batch update Ad Manager networks status
interface BatchUpdateAdManagerNetworksInput {
  connectionId: string
  networkIds: string[]
  isActive: boolean
}

async function batchUpdateAdManagerNetworks(input: BatchUpdateAdManagerNetworksInput): Promise<void> {
  await api.post('/ad-manager/networks/batch-update', {
    networkIds: input.networkIds,
    isActive: input.isActive,
    connectionId: input.connectionId,
  })
}

export function useBatchUpdateAdManagerNetworks() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: batchUpdateAdManagerNetworks,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ad-manager-networks', variables.connectionId] })
      const count = variables.networkIds.length
      const statusMsg = variables.isActive ? 'ativada(s)' : 'desativada(s)'
      showToast.success(`${count} rede(s) Ad Manager ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status das redes')
    },
  })
}

// ============================================
// Meta Ad Accounts
// ============================================

export interface MetaAdAccount {
  id: string
  connection_id: string
  account_id: string
  account_name: string
  currency?: string
  timezone_name?: string
  business_name?: string
  account_status?: number
  is_active: boolean
  last_synced_at?: string
  created_at: string
  updated_at: string
}

interface MetaAdAccountsResponse {
  success: boolean
  accounts: MetaAdAccount[]
  synced?: number
  error?: string
}

// Get stored Meta ad accounts for a connection (from database)
async function getMetaAdStoredAccounts(connectionId: string): Promise<MetaAdAccount[]> {
  const response = await api.get<MetaAdAccountsResponse>(
    `/meta/campaigns/ad-accounts/list?connectionId=${connectionId}`
  )
  return response.accounts || []
}

export function useMetaAdStoredAccounts(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['meta-ad-accounts', connectionId],
    queryFn: () => getMetaAdStoredAccounts(connectionId!),
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// Sync Meta ad accounts (fetch from API and store in database)
async function syncMetaAdAccounts(connectionId: string): Promise<MetaAdAccountsResponse> {
  return api.post<MetaAdAccountsResponse>(
    '/meta/campaigns/ad-accounts/sync',
    { connectionId }
  )
}

export function useSyncMetaAdAccounts() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (connectionId: string) => syncMetaAdAccounts(connectionId),
    onSuccess: (result, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['meta-ad-accounts', connectionId] })
      showToast.success(`${result.synced || 0} conta(s) de anúncios Meta sincronizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar contas de anúncios Meta')
    },
  })
}

// Update single Meta ad account status
interface UpdateMetaAdAccountInput {
  connectionId: string
  accountId: string
  isActive: boolean
}

async function updateMetaAdAccountStatus(input: UpdateMetaAdAccountInput): Promise<void> {
  await api.post('/meta/campaigns/ad-accounts/update', {
    accountId: input.accountId,
    isActive: input.isActive,
  })
}

export function useUpdateMetaAdAccountStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateMetaAdAccountStatus,
    onSuccess: (_, variables) => {
      // Invalidate ad accounts list
      queryClient.invalidateQueries({ queryKey: ['meta-ad-accounts', variables.connectionId] })
      // Invalidate pixels (they depend on which accounts are active)
      queryClient.invalidateQueries({ queryKey: ['meta-pixels', variables.connectionId] })
      const statusMsg = variables.isActive ? 'ativada' : 'desativada'
      showToast.success(`Conta de anúncios Meta ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status da conta')
    },
  })
}

// Batch update Meta ad accounts status
interface BatchUpdateMetaAdAccountsInput {
  connectionId: string
  accountIds: string[]
  isActive: boolean
}

async function batchUpdateMetaAdAccounts(input: BatchUpdateMetaAdAccountsInput): Promise<void> {
  await api.post('/meta/campaigns/accounts/batch-update', {
    connectionId: input.connectionId,
    accountIds: input.accountIds,
    isActive: input.isActive,
  })
}

export function useBatchUpdateMetaAdAccounts() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: batchUpdateMetaAdAccounts,
    onSuccess: (_, variables) => {
      // Invalidate ad accounts list
      queryClient.invalidateQueries({ queryKey: ['meta-ad-accounts', variables.connectionId] })
      // Invalidate pixels (they depend on which accounts are active)
      queryClient.invalidateQueries({ queryKey: ['meta-pixels', variables.connectionId] })
      const count = variables.accountIds.length
      const statusMsg = variables.isActive ? 'ativada(s)' : 'desativada(s)'
      showToast.success(`${count} conta(s) de anúncios Meta ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status das contas')
    },
  })
}

// ============================================
// Meta Pixels
// ============================================

export interface MetaPixel {
  id: string
  connection_id: string
  ad_account_id: string
  pixel_id: string
  pixel_name: string
  is_unavailable: boolean
  is_active: boolean
  last_synced_at?: string
  created_at: string
  updated_at: string
}

interface MetaPixelsResponse {
  success: boolean
  pixels: MetaPixel[]
  synced?: number
  error?: string
}

// Get stored Meta pixels for a connection and ad account (from database)
async function getMetaPixelsStored(connectionId: string, adAccountId: string): Promise<MetaPixel[]> {
  console.debug('[META_PIXELS] Fetching pixels:', { connectionId, adAccountId })
  const response = await api.get<MetaPixelsResponse>(
    `/meta/campaigns/pixels/list?connectionId=${connectionId}&adAccountId=${adAccountId}`
  )
  console.debug('[META_PIXELS] Response:', { pixelCount: response.pixels?.length || 0, response })
  return response.pixels || []
}

export function useMetaPixelsStored(connectionId: string | undefined, adAccountId: string | undefined) {
  const enabled = !!connectionId && !!adAccountId
  console.debug('[META_PIXELS] useMetaPixelsStored:', { connectionId, adAccountId, enabled })
  return useQuery({
    queryKey: ['meta-pixels', connectionId, adAccountId],
    queryFn: () => getMetaPixelsStored(connectionId!, adAccountId!),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// Sync Meta pixels (fetch from API and store in database)
async function syncMetaPixels(connectionId: string, adAccountId: string): Promise<MetaPixelsResponse> {
  console.debug('[META_PIXELS] Syncing pixels:', { connectionId, adAccountId })
  const response = await api.post<MetaPixelsResponse>(
    '/meta/campaigns/pixels/sync',
    { connectionId, adAccountId }
  )
  console.debug('[META_PIXELS] Sync response:', { synced: response.synced, response })
  return response
}

export function useSyncMetaPixels() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: ({ connectionId, adAccountId }: { connectionId: string; adAccountId: string }) =>
      syncMetaPixels(connectionId, adAccountId),
    onSuccess: (result, variables) => {
      console.debug('[META_PIXELS] Sync success, invalidating query:', {
        queryKey: ['meta-pixels', variables.connectionId, variables.adAccountId],
        synced: result.synced
      })
      queryClient.invalidateQueries({ queryKey: ['meta-pixels', variables.connectionId, variables.adAccountId] })
      showToast.success(`${result.synced || 0} pixel(s) Meta sincronizado(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar pixels Meta')
    },
  })
}

// Update single Meta pixel status
interface UpdateMetaPixelInput {
  connectionId: string
  adAccountId: string
  pixelId: string
  isActive: boolean
}

async function updateMetaPixelStatus(input: UpdateMetaPixelInput): Promise<void> {
  await api.post('/meta/campaigns/pixels/update', {
    pixelId: input.pixelId,
    isActive: input.isActive,
  })
}

export function useUpdateMetaPixelStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateMetaPixelStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meta-pixels', variables.connectionId, variables.adAccountId] })
      const statusMsg = variables.isActive ? 'ativado' : 'desativado'
      showToast.success(`Pixel Meta ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status do pixel')
    },
  })
}

// Batch update Meta pixels status
interface BatchUpdateMetaPixelsInput {
  connectionId: string
  adAccountId: string
  pixelIds: string[]
  isActive: boolean
}

async function batchUpdateMetaPixels(input: BatchUpdateMetaPixelsInput): Promise<void> {
  await api.post('/meta/campaigns/pixels/batch-update', {
    pixelIds: input.pixelIds,
    isActive: input.isActive,
  })
}

export function useBatchUpdateMetaPixels() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: batchUpdateMetaPixels,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meta-pixels', variables.connectionId, variables.adAccountId] })
      const count = variables.pixelIds.length
      const statusMsg = variables.isActive ? 'ativado(s)' : 'desativado(s)'
      showToast.success(`${count} pixel(s) Meta ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status dos pixels')
    },
  })
}

// ============================================
// Meta: Sync All Resources at Once (N8N Pattern)
// ============================================

export interface MetaSyncAllResponse {
  success: boolean
  adAccounts: Array<{
    account_id: string
    account_name: string
    business_id?: string
    business_name?: string
    account_status: number
    currency?: string
    timezone_name?: string
  }>
  pages: Array<{
    page_id: string
    page_name: string
    category?: string
    picture_url?: string
  }>
  pixels: Array<{
    pixel_id: string
    pixel_name: string
    business_id?: string
  }>
  instagram: Array<{
    instagram_id: string
    instagram_username: string
    instagram_name?: string
    profile_picture_url?: string
    followers_count?: number
    page_id: string
    page_name: string
  }>
  business: Array<{
    id: string
    name: string
  }>
  errors: string[]
}

async function syncAllMetaResources(connectionId: string): Promise<MetaSyncAllResponse> {
  return api.post<MetaSyncAllResponse>('/meta/campaigns/sync-all', { connectionId })
}

export function useSyncAllMetaResources() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (connectionId: string) => syncAllMetaResources(connectionId),
    onSuccess: (result, connectionId) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['meta-ad-accounts', connectionId] })
      queryClient.invalidateQueries({ queryKey: ['meta-pages-ads', connectionId] })
      queryClient.invalidateQueries({ queryKey: ['meta-pixels', connectionId] })
      queryClient.invalidateQueries({ queryKey: ['meta-instagram-accounts', connectionId] })

      const total = result.adAccounts.length + result.pages.length + result.pixels.length + result.instagram.length
      showToast.success(`${total} recurso(s) sincronizado(s) com sucesso`)

      if (result.errors.length > 0) {
        showToast.warning(`Alguns erros ocorreram: ${result.errors.join(', ')}`)
      }
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar recursos Meta')
    },
  })
}

// ============================================
// Meta Pages for Ads (different from Messages)
// ============================================

export interface MetaPageForAds {
  id: string
  page_id: string
  page_name: string
  category?: string
  picture_url?: string
  is_active: boolean
}

interface MetaPagesForAdsResponse {
  success: boolean
  pages: MetaPageForAds[]
  error?: string
}

// Get stored Meta pages for an Ads connection (from database)
async function getMetaPagesForAds(connectionId: string): Promise<MetaPageForAds[]> {
  const response = await api.get<{ success: boolean; pages: Array<{ id: string; name: string; isActive: boolean; category?: string; pictureUrl?: string }> }>(
    `/meta/campaigns/pages/${connectionId}`
  )
  // Map backend response format to frontend interface
  return (response.pages || []).map(p => ({
    id: '', // Will be filled on database sync
    page_id: p.id,
    page_name: p.name,
    category: p.category,
    picture_url: p.pictureUrl,
    is_active: p.isActive,
  }))
}

export function useMetaPagesForAds(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['meta-pages-ads', connectionId],
    queryFn: () => getMetaPagesForAds(connectionId!),
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// Sync Meta pages for Ads (fetch from Facebook and store in database)
async function syncMetaPagesForAds(connectionId: string): Promise<MetaPagesForAdsResponse> {
  // Refresh pages uses the meta.controller endpoint which fetches from Facebook
  const response = await api.post<{ success: boolean; pages: Array<{ id: string; name: string; category?: string; pictureUrl?: string | null }> }>(
    `/meta/connections/${connectionId}/pages/refresh`,
    {}
  )
  // Return in the expected format
  return {
    success: response.success,
    pages: (response.pages || []).map(p => ({
      id: '',
      page_id: p.id,
      page_name: p.name,
      category: p.category,
      picture_url: p.pictureUrl || undefined,
      is_active: true,
    })),
  }
}

export function useSyncMetaPagesForAds() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (connectionId: string) => syncMetaPagesForAds(connectionId),
    onSuccess: (result, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['meta-pages-ads', connectionId] })
      showToast.success(`${result.pages?.length || 0} página(s) sincronizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar páginas')
    },
  })
}

// Update Meta page status (for Ads connections)
interface UpdateMetaPageForAdsInput {
  connectionId: string
  pageId: string
  isActive: boolean
}

async function updateMetaPageForAdsStatus(input: UpdateMetaPageForAdsInput): Promise<void> {
  const { error } = await supabase
    .from('meta_pages')
    .update({ is_active: input.isActive })
    .eq('connection_id', input.connectionId)
    .eq('page_id', input.pageId)

  if (error) throw error
}

export function useUpdateMetaPageForAdsStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateMetaPageForAdsStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meta-pages-ads', variables.connectionId] })
      const statusMsg = variables.isActive ? 'ativada' : 'desativada'
      showToast.success(`Página ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status da página')
    },
  })
}

// Batch update Meta pages status (for Ads connections)
interface BatchUpdateMetaPagesForAdsInput {
  connectionId: string
  pageIds: string[]
  isActive: boolean
}

async function batchUpdateMetaPagesForAdsStatus(input: BatchUpdateMetaPagesForAdsInput): Promise<void> {
  const { error } = await supabase
    .from('meta_pages')
    .update({ is_active: input.isActive })
    .eq('connection_id', input.connectionId)
    .in('page_id', input.pageIds)

  if (error) throw error
}

export function useBatchUpdateMetaPagesForAdsStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: batchUpdateMetaPagesForAdsStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['meta-pages-ads', variables.connectionId] })
      const count = variables.pageIds.length
      const statusMsg = variables.isActive ? 'ativada(s)' : 'desativada(s)'
      showToast.success(`${count} página(s) ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status das páginas')
    },
  })
}

// ============================================
// Meta Instagram Accounts
// ============================================

export interface MetaInstagramAccount {
  id: string
  username: string
  name?: string
  profilePictureUrl?: string
  followersCount?: number
  pageId: string
  pageName: string
}

interface MetaInstagramResponse {
  success: boolean
  instagramAccount: {
    id: string
    username: string
    name?: string
    profilePictureUrl?: string
    followersCount?: number
  } | null
}

// Get Instagram account linked to a page
async function getMetaInstagramAccount(pageId: string): Promise<MetaInstagramResponse['instagramAccount']> {
  const response = await api.get<MetaInstagramResponse>(
    `/meta/campaigns/instagram/${pageId}`
  )
  return response.instagramAccount
}

export function useMetaInstagramAccount(pageId: string | undefined) {
  return useQuery({
    queryKey: ['meta-instagram', pageId],
    queryFn: () => getMetaInstagramAccount(pageId!),
    enabled: !!pageId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// Fetch Instagram accounts for all active pages of a connection
export interface MetaInstagramAccountWithPage extends MetaInstagramAccount {
  pageId: string
  pageName: string
}

async function getMetaInstagramAccountsForConnection(
  activePages: MetaPageForAds[]
): Promise<MetaInstagramAccountWithPage[]> {
  const results: MetaInstagramAccountWithPage[] = []

  // Fetch Instagram accounts for each active page in parallel
  const promises = activePages
    .filter(p => p.is_active)
    .map(async (page) => {
      try {
        const igAccount = await getMetaInstagramAccount(page.page_id)
        if (igAccount) {
          return {
            ...igAccount,
            pageId: page.page_id,
            pageName: page.page_name,
          }
        }
      } catch {
        // Ignore errors for individual pages
      }
      return null
    })

  const responses = await Promise.all(promises)
  responses.forEach(r => {
    if (r) results.push(r)
  })

  return results
}

export function useMetaInstagramAccountsForConnection(
  connectionId: string | undefined,
  activePages: MetaPageForAds[] | undefined
) {
  return useQuery({
    queryKey: ['meta-instagram-accounts', connectionId],
    queryFn: () => getMetaInstagramAccountsForConnection(activePages || []),
    enabled: !!connectionId && !!activePages && activePages.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// ============================================
// Analytics Properties
// ============================================

export interface AnalyticsProperty {
  id: string
  connection_id: string
  property_id: string
  display_name: string
  account_id?: string
  account_name?: string
  property_type?: string
  time_zone?: string
  currency_code?: string
  is_active: boolean
  last_synced_at?: string
  created_at: string
  updated_at: string
}

interface AnalyticsPropertiesResponse {
  success: boolean
  properties: AnalyticsProperty[]
  synced?: number
  error?: string
}

// Get stored Analytics properties for a connection (from database)
async function getAnalyticsStoredProperties(connectionId: string): Promise<AnalyticsProperty[]> {
  const response = await api.get<AnalyticsPropertiesResponse>(
    `/analytics/properties/${connectionId}/stored`
  )
  return response.properties || []
}

export function useAnalyticsStoredProperties(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['analytics-properties', connectionId],
    queryFn: () => getAnalyticsStoredProperties(connectionId!),
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// Sync Analytics properties (fetch from API and store in database)
async function syncAnalyticsProperties(connectionId: string): Promise<AnalyticsPropertiesResponse> {
  return api.post<AnalyticsPropertiesResponse>(
    `/analytics/properties/${connectionId}/sync`,
    {}
  )
}

export function useSyncAnalyticsProperties() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (connectionId: string) => syncAnalyticsProperties(connectionId),
    onSuccess: (result, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['analytics-properties', connectionId] })
      showToast.success(`${result.synced || 0} propriedade(s) Analytics sincronizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar propriedades Analytics')
    },
  })
}

// Update single Analytics property status
interface UpdateAnalyticsPropertyInput {
  connectionId: string
  propertyId: string
  isActive: boolean
}

async function updateAnalyticsPropertyStatus(input: UpdateAnalyticsPropertyInput): Promise<void> {
  await api.post(`/analytics/properties/${input.connectionId}/${encodeURIComponent(input.propertyId)}/status`, {
    is_active: input.isActive,
  })
}

export function useUpdateAnalyticsPropertyStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateAnalyticsPropertyStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['analytics-properties', variables.connectionId] })
      const statusMsg = variables.isActive ? 'ativada' : 'desativada'
      showToast.success(`Propriedade Analytics ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status da propriedade')
    },
  })
}

// Bulk update Analytics properties status
interface BulkUpdateAnalyticsPropertiesInput {
  connectionId: string
  propertyIds: string[]
  isActive: boolean
}

async function bulkUpdateAnalyticsProperties(input: BulkUpdateAnalyticsPropertiesInput): Promise<void> {
  await api.post(`/analytics/properties/${input.connectionId}/bulk-status`, {
    propertyIds: input.propertyIds,
    is_active: input.isActive,
  })
}

export function useBulkUpdateAnalyticsProperties() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: bulkUpdateAnalyticsProperties,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['analytics-properties', variables.connectionId] })
      showToast.success(`${variables.propertyIds.length} propriedade(s) atualizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar propriedades')
    },
  })
}

// ============================================
// Search Console Properties
// ============================================

export interface SearchConsoleProperty {
  id: string
  connection_id: string
  site_url: string
  property_type: string
  ownership: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

interface SearchConsolePropertiesResponse {
  success: boolean
  properties: SearchConsoleProperty[]
  synced?: number
  error?: string
}

// Get stored Search Console properties for a connection (from database)
async function getSearchConsoleStoredProperties(connectionId: string): Promise<SearchConsoleProperty[]> {
  const response = await api.get<SearchConsolePropertiesResponse>(
    `/search-console/properties/${connectionId}/stored`
  )
  return response.properties || []
}

export function useSearchConsoleStoredProperties(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['search-console-properties', connectionId],
    queryFn: () => getSearchConsoleStoredProperties(connectionId!),
    enabled: !!connectionId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

// Sync Search Console properties (fetch from API and store in database)
async function syncSearchConsoleProperties(connectionId: string): Promise<SearchConsolePropertiesResponse> {
  return api.post<SearchConsolePropertiesResponse>(
    `/search-console/properties/${connectionId}/sync`,
    {}
  )
}

export function useSyncSearchConsoleProperties() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (connectionId: string) => syncSearchConsoleProperties(connectionId),
    onSuccess: (result, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['search-console-properties', connectionId] })
      showToast.success(`${result.synced || 0} propriedade(s) Search Console sincronizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao sincronizar propriedades Search Console')
    },
  })
}

// Update single Search Console property status
interface UpdateSearchConsolePropertyInput {
  connectionId: string
  siteUrl: string
  isActive: boolean
}

async function updateSearchConsolePropertyStatus(input: UpdateSearchConsolePropertyInput): Promise<void> {
  await api.post(`/search-console/properties/${input.connectionId}/status`, {
    site_url: input.siteUrl,
    is_active: input.isActive,
  })
}

export function useUpdateSearchConsolePropertyStatus() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: updateSearchConsolePropertyStatus,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['search-console-properties', variables.connectionId] })
      const statusMsg = variables.isActive ? 'ativada' : 'desativada'
      showToast.success(`Propriedade Search Console ${statusMsg} com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar status da propriedade')
    },
  })
}

// Bulk update Search Console properties status
interface BulkUpdateSearchConsolePropertiesInput {
  connectionId: string
  siteUrls: string[]
  isActive: boolean
}

async function bulkUpdateSearchConsoleProperties(input: BulkUpdateSearchConsolePropertiesInput): Promise<void> {
  await api.post(`/search-console/properties/${input.connectionId}/bulk-status`, {
    siteUrls: input.siteUrls,
    is_active: input.isActive,
  })
}

export function useBulkUpdateSearchConsoleProperties() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: bulkUpdateSearchConsoleProperties,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['search-console-properties', variables.connectionId] })
      showToast.success(`${variables.siteUrls.length} propriedade(s) atualizada(s) com sucesso`)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar propriedades')
    },
  })
}
