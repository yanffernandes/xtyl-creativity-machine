import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { toast } from 'sonner';
import type { Campaign } from '@/types/agency-studio';

export type { Campaign };

interface CampaignsResponse {
  items: Campaign[];
  total: number;
}

export function useCampaigns(projectId: string) {
  return useQuery<CampaignsResponse>({
    queryKey: queryKeys.campaigns.byProject(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/api/projects/${projectId}/campaigns`);
      return data;
    },
    enabled: !!projectId,
  });
}

export function useCreateCampaign(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; channel?: string }) => {
      const response = await api.post(`/api/projects/${projectId}/campaigns`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.byProject(projectId) });
      toast.success('Campaign created successfully');
    },
    onError: () => {
      toast.error('Failed to create campaign');
    },
  });
}

export function useUpdateCampaign(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, data }: { campaignId: string; data: { name: string; channel?: string } }) => {
      const response = await api.patch(`/api/campaigns/${campaignId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.byProject(projectId) });
      toast.success('Campaign updated successfully');
    },
    onError: () => {
      toast.error('Failed to update campaign');
    },
  });
}

export function useDeleteCampaign(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      await api.delete(`/api/campaigns/${campaignId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.byProject(projectId) });
      toast.success('Campaign deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete campaign');
    },
  });
}
