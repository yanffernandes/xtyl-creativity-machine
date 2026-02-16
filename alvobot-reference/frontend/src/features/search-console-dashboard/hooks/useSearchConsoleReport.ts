import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/shared/utils/api';
import type {
  SearchConsoleProperty,
  SearchConsolePrimaryGroupBy,
  SearchType,
  DeviceType,
  SearchConsoleReportResponse,
  SearchConsoleExpandResponse,
  SearchConsoleSource,
} from '../types';

interface UseSearchConsoleReportParams {
  activeProperties: SearchConsoleProperty[];
  selectedPropertyIds: string[];
  startDate: string;
  endDate: string;
  groupBy: SearchConsolePrimaryGroupBy;
  searchType?: SearchType;
  device?: DeviceType;
  country?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Main hook for fetching Search Console report data
 */
export function useSearchConsoleReport(params: UseSearchConsoleReportParams) {
  const {
    activeProperties,
    selectedPropertyIds,
    startDate,
    endDate,
    groupBy,
    searchType,
    device,
    country,
    sortBy = 'clicks',
    sortOrder = 'desc',
    search,
    page = 1,
    limit = 50,
  } = params;

  // Build sources array from selected properties
  const sources: SearchConsoleSource[] = useMemo(() => {
    return activeProperties
      .filter((p) => selectedPropertyIds.includes(p.id))
      .map((p) => ({
        connectionId: p.connectionId,
        siteUrl: p.siteUrl,
      }));
  }, [activeProperties, selectedPropertyIds]);

  return useQuery({
    queryKey: [
      'search-console',
      'report',
      sources,
      startDate,
      endDate,
      groupBy,
      searchType,
      device,
      country,
      sortBy,
      sortOrder,
      search,
      page,
      limit,
    ],
    queryFn: async (): Promise<SearchConsoleReportResponse> => {
      const response = await api.post<SearchConsoleReportResponse>('/search-console/report', {
        sources,
        startDate,
        endDate,
        groupBy,
        searchType,
        device,
        country,
        sortBy,
        sortOrder,
        search,
        page,
        limit,
      });
      return response;
    },
    enabled: sources.length > 0,
    staleTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData,
  });
}

interface UseSearchConsoleExpandParams {
  sources: SearchConsoleSource[];
  startDate: string;
  endDate: string;
  searchType?: SearchType;
  device?: DeviceType;
}

interface ExpandMutationParams {
  primaryGroupBy: string;
  subGroupBy: string;
  parentKey: string;
  rowSources?: SearchConsoleSource[];
}

/**
 * Hook for expanding rows to show sub-grouping data
 */
export function useSearchConsoleExpand(params: UseSearchConsoleExpandParams) {
  const queryClient = useQueryClient();
  const { sources, startDate, endDate, searchType, device } = params;

  return useMutation({
    mutationFn: async ({
      primaryGroupBy,
      subGroupBy,
      parentKey,
      rowSources,
    }: ExpandMutationParams): Promise<SearchConsoleExpandResponse> => {
      const response = await api.post<SearchConsoleExpandResponse>('/search-console/expand', {
        sources: rowSources || sources,
        startDate,
        endDate,
        primaryGroupBy,
        subGroupBy,
        parentKey,
        searchType,
        device,
      });
      return response;
    },
    onSuccess: (data, variables) => {
      // Cache the expand result
      queryClient.setQueryData(
        ['search-console', 'expand', variables.parentKey, variables.subGroupBy],
        data
      );
    },
  });
}

/**
 * Hook to get cached expand data
 */
export function useSearchConsoleExpandCache(parentKey: string, subGroupBy: string) {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<SearchConsoleExpandResponse>([
    'search-console',
    'expand',
    parentKey,
    subGroupBy,
  ]);
}
