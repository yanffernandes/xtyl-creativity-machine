/**
 * Templates Hook (Stub)
 *
 * Simple React Query hook to fetch templates.
 *
 * TODO: Port full implementation from frontend/src/hooks/use-templates.ts
 */

import { useQuery } from '@tanstack/react-query';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  category: string | null;
  variables: Record<string, unknown>[];
  usage_count: number;
  created_at: string;
}

export function useTemplates(_workspaceId: string) {
  return useQuery({
    queryKey: ['templates', _workspaceId],
    queryFn: async (): Promise<Template[]> => {
      // TODO: Fetch templates from Supabase or API
      return [];
    },
    enabled: !!_workspaceId,
    staleTime: 60000,
  });
}
