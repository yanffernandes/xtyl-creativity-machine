/**
 * React Query hooks for Campaigns (Feature 028 - Agency Studio Flow)
 *
 * Provides data fetching, caching, and mutations for project-level campaign packages.
 * Campaigns group copies and images by marketing campaign/channel.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  Campaign,
  CampaignListResponse,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

interface UseCampaignsOptions {
  channel?: string
}

/**
 * Hook to fetch campaign packages for a project
 */
export function useCampaigns(
  projectId: string | undefined,
  options?: UseCampaignsOptions,
  queryOptions?: Omit<UseQueryOptions<CampaignListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<CampaignListResponse>({
    queryKey: queryKeys.campaigns.byProject(projectId || ''),
    queryFn: () => listCampaigns(projectId!, options?.channel),
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    ...queryOptions,
  })
}

/**
 * Hook to fetch a single campaign package by ID
 */
export function useCampaign(
  projectId: string | undefined,
  campaignId: string | undefined,
  queryOptions?: Omit<UseQueryOptions<Campaign>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Campaign>({
    queryKey: queryKeys.campaigns.detail(projectId || '', campaignId || ''),
    queryFn: () => getCampaign(projectId!, campaignId!),
    enabled: !!projectId && !!campaignId,
    staleTime: 30000,
    ...queryOptions,
  })
}

/**
 * Hook to create a new campaign package
 */
export function useCreateCampaign(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => createCampaign(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.byProject(projectId),
      })
      toast.success('Campanha criada com sucesso')
    },
    onError: (error: Error) => {
      console.error('Failed to create campaign:', error)
      toast.error('Falha ao criar campanha')
    },
  })
}

/**
 * Hook to update an existing campaign package
 */
export function useUpdateCampaign(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: UpdateCampaignRequest }) =>
      updateCampaign(projectId, campaignId, data),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(
        queryKeys.campaigns.detail(projectId, updatedCampaign.id),
        updatedCampaign
      )
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.byProject(projectId),
      })
      toast.success('Campanha atualizada com sucesso')
    },
    onError: (error: Error) => {
      console.error('Failed to update campaign:', error)
      toast.error('Falha ao atualizar campanha')
    },
  })
}

/**
 * Hook to delete a campaign package
 */
export function useDeleteCampaign(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (campaignId: string) => deleteCampaign(projectId, campaignId),
    onSuccess: (_, campaignId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.campaigns.detail(projectId, campaignId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.byProject(projectId),
      })
      toast.success('Campanha removida com sucesso')
    },
    onError: (error: Error) => {
      console.error('Failed to delete campaign:', error)
      toast.error('Falha ao remover campanha')
    },
  })
}
