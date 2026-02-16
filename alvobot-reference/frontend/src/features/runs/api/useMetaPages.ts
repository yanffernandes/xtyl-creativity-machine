import { useQuery } from '@tanstack/react-query'
import { useWorkspaceId } from '@/features/workspace/stores/workspaceStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

export interface MetaPage {
  id: string
  page_id: string
  page_name: string
  image: string | null
  is_active: boolean
  user_id: string
  connection_id: string | null
  created_at: string
  // Joined connection data
  connection?: {
    id: string
    connection_name: string
    plataform_name: string
    is_active: boolean
    deleted_at: string | null
  } | null
}

const META_PAGES_SELECT = `
  id,
  page_id,
  page_name,
  image,
  is_active,
  user_id,
  connection_id,
  created_at,
  connection:connections!inner(
    id,
    connection_name,
    plataform_name,
    is_active,
    deleted_at
  )
`

function normalizePages(data: any[]): MetaPage[] {
  return (data || []).map((item) => ({
    ...item,
    connection: Array.isArray(item.connection) ? item.connection[0] || null : item.connection,
  })) as MetaPage[]
}

async function fetchActiveMetaPages(workspaceId: string): Promise<MetaPage[]> {
  const { data, error } = await supabase
    .from('meta_pages')
    .select(META_PAGES_SELECT)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .eq('connections.is_active', true)
    .is('connections.deleted_at', null)
    .order('page_name', { ascending: true })

  if (error) {
    if (error.code === '42P01') return [] // Table doesn't exist
    throw error
  }

  return normalizePages(data || [])
}

async function fetchAllMetaPages(workspaceId: string): Promise<MetaPage[]> {
  const { data, error } = await supabase
    .from('meta_pages')
    .select(META_PAGES_SELECT)
    .eq('workspace_id', workspaceId)
    .eq('connections.is_active', true)
    .is('connections.deleted_at', null)
    .order('page_name', { ascending: true })

  if (error) {
    if (error.code === '42P01') return [] // Table doesn't exist
    throw error
  }

  return normalizePages(data || [])
}

export function useActiveMetaPages() {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.metaPages.active(workspaceId),
    queryFn: () => fetchActiveMetaPages(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useMetaPages() {
  const workspaceId = useWorkspaceId()

  return useQuery({
    queryKey: queryKeys.metaPages.list({ workspaceId }),
    queryFn: () => fetchAllMetaPages(workspaceId!),
    enabled: !!workspaceId,
  })
}
