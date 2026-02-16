/**
 * Folders Hook (Stub)
 *
 * Simple React Query hook to fetch folders for a project via Supabase.
 *
 * TODO: Port full implementation from frontend/src/hooks/use-folders.ts
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Folder {
  id: string;
  name: string;
  project_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export function useFolders(projectId: string) {
  return useQuery({
    queryKey: ['folders', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data ?? []) as Folder[];
    },
    enabled: !!projectId,
    staleTime: 30000,
  });
}
