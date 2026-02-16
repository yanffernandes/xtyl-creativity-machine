import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'
import type { BaseStructure, BaseStructureCategory, BaseStructureAuthor } from '../types'

// Fetch categories for a project (layers 1, 2, 3)
async function fetchCategories(projectId: number): Promise<BaseStructureCategory[]> {
  const { data, error } = await supabase
    .from('base_structure_categories')
    .select('*')
    .eq('project_id', projectId)
    .order('layer', { ascending: true })
    .order('order', { ascending: true })

  if (error) {
    // If table doesn't exist yet, return empty array
    if (error.code === '42P01') return []
    throw error
  }

  return data || []
}

// Fetch authors for a project (layer 4)
async function fetchAuthors(projectId: number): Promise<BaseStructureAuthor[]> {
  const { data, error } = await supabase
    .from('base_structure_authors')
    .select('*')
    .eq('project_id', projectId)
    .order('order', { ascending: true })

  if (error) {
    // If table doesn't exist yet, return empty array
    if (error.code === '42P01') return []
    throw error
  }

  return data || []
}

// Fetch project approval status
async function fetchApprovalStatus(projectId: number): Promise<{
  approval_status: BaseStructure['approval_status']
  submitted_at?: string
  approved_at?: string
  rejection_reason?: string
}> {
  const { data, error } = await supabase
    .from('projects')
    .select('approval_status, submitted_at, approved_at, rejection_reason')
    .eq('id', projectId)
    .single()

  if (error) throw error

  return {
    approval_status: data?.approval_status || 'draft',
    submitted_at: data?.submitted_at,
    approved_at: data?.approved_at,
    rejection_reason: data?.rejection_reason,
  }
}

// Fetch complete base structure for a project
async function fetchBaseStructure(projectId: number): Promise<BaseStructure> {
  const [allCategories, authors, approvalData] = await Promise.all([
    fetchCategories(projectId),
    fetchAuthors(projectId),
    fetchApprovalStatus(projectId),
  ])

  return {
    project_id: projectId,
    categories: allCategories.filter(c => c.layer === 1),
    subcategories: allCategories.filter(c => c.layer === 2),
    tags: allCategories.filter(c => c.layer === 3),
    authors,
    ...approvalData,
  }
}

// Hook to fetch base structure for a project
export function useBaseStructure(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.baseStructure.detail(projectId || 0),
    queryFn: () => fetchBaseStructure(projectId!),
    enabled: !!projectId,
  })
}

// Hook to fetch just categories (all layers)
export function useCategories(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.baseStructure.categories(projectId || 0),
    queryFn: () => fetchCategories(projectId!),
    enabled: !!projectId,
  })
}

// Hook to fetch just authors
export function useAuthors(projectId: number | null) {
  return useQuery({
    queryKey: queryKeys.baseStructure.authors(projectId || 0),
    queryFn: () => fetchAuthors(projectId!),
    enabled: !!projectId,
  })
}

// Fetch available author profile images from pool
async function fetchAuthorProfileImages(): Promise<Array<{ id: string; path: string; age: string; sex: string }>> {
  const { data, error } = await supabase
    .from('author_profile_images')
    .select('id, path, age, sex')
    .order('usage_count', { ascending: true })
    .limit(50)

  if (error) {
    if (error.code === '42P01') return []
    throw error
  }

  return data || []
}

export function useAuthorProfileImages() {
  return useQuery({
    queryKey: ['authorProfileImages'],
    queryFn: fetchAuthorProfileImages,
  })
}
