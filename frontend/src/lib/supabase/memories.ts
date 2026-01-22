/**
 * Memory Service
 *
 * Handles all user memory CRUD operations via Supabase Client.
 * Replaces backend/routers/projects.py memory endpoints (keeps vector search in backend).
 *
 * Feature: Supabase Direct Migration
 */

import { supabase } from './client'
import type {
  UserMemory,
  UserMemoryInsert,
  UserMemoryUpdate,
  MemoryCategory,
} from '@/types/supabase'
import type { ServiceResult, PaginatedResult } from '@/types/supabase-services'

export interface MemoryFilters {
  category?: MemoryCategory
  page?: number
  perPage?: number
}

export const memoryService = {
  /**
   * List all memories for a project with pagination
   */
  async listByProject(
    projectId: string,
    filters?: MemoryFilters
  ): Promise<ServiceResult<PaginatedResult<UserMemory>>> {
    try {
      const page = filters?.page ?? 1
      const perPage = filters?.perPage ?? 20
      const offset = (page - 1) * perPage

      let query = supabase
        .from('user_memories')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1)

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      const { data, error, count } = await query

      if (error) throw error

      return {
        data: {
          data: data || [],
          total: count || 0,
          page,
          pageSize: perPage,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * List all memories (unpaginated) for a project
   */
  async listAll(projectId: string): Promise<ServiceResult<UserMemory[]>> {
    try {
      const { data, error } = await supabase
        .from('user_memories')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Get a single memory by ID
   */
  async get(id: string): Promise<ServiceResult<UserMemory>> {
    try {
      const { data, error } = await supabase
        .from('user_memories')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Create a new memory
   */
  async create(memory: UserMemoryInsert): Promise<ServiceResult<UserMemory>> {
    try {
      // Generate content hash for deduplication
      const contentHash = await generateContentHash(memory.content)

      const { data, error } = await supabase
        .from('user_memories')
        .insert({
          ...memory,
          content_hash: contentHash,
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Update a memory
   */
  async update(id: string, memory: UserMemoryUpdate): Promise<ServiceResult<UserMemory>> {
    try {
      const updateData: Record<string, unknown> = {
        ...memory,
        updated_at: new Date().toISOString(),
      }

      // Regenerate hash if content changed
      if (memory.content) {
        updateData.content_hash = await generateContentHash(memory.content)
      }

      const { data, error } = await supabase
        .from('user_memories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('user_memories')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Delete all memories for a project
   */
  async deleteAll(projectId: string): Promise<ServiceResult<{ count: number }>> {
    try {
      // First count how many will be deleted
      const { count } = await supabase
        .from('user_memories')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      // Then delete
      const { error } = await supabase
        .from('user_memories')
        .delete()
        .eq('project_id', projectId)

      if (error) throw error
      return { data: { count: count || 0 }, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  /**
   * Check if a memory with the same content exists
   */
  async checkDuplicate(projectId: string, content: string): Promise<ServiceResult<boolean>> {
    try {
      const contentHash = await generateContentHash(content)

      const { data, error } = await supabase
        .from('user_memories')
        .select('id')
        .eq('project_id', projectId)
        .eq('content_hash', contentHash)
        .limit(1)

      if (error) throw error
      return { data: (data?.length || 0) > 0, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

/**
 * Generate a simple hash for content deduplication
 * Uses Web Crypto API for SHA-256
 */
async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default memoryService
