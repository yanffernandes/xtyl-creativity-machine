import { supabase } from './client'
import type {
  Board,
  BoardInsert,
  BoardUpdate,
  BoardColumn,
  BoardColumnInsert,
  BoardColumnUpdate,
} from '@/types/supabase'
import type { ServiceResult } from '@/types/supabase-services'

function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const groupKey = String(item[key])
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

export const boardService = {
  async listByProject(projectId: string): Promise<ServiceResult<Board[]>> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async fetchAllProjectsBoards(projectIds: string[]): Promise<ServiceResult<Record<string, Board[]>>> {
    try {
      if (projectIds.length === 0) {
        return { data: {}, error: null }
      }
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .in('project_id', projectIds)
        .is('deleted_at', null)
        .order('position', { ascending: true })

      if (error) throw error
      const grouped = groupBy(data || [], 'project_id')
      return { data: grouped as Record<string, Board[]>, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async create(board: BoardInsert): Promise<ServiceResult<Board>> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert(board)
        .select()
        .single()
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async update(id: string, board: BoardUpdate): Promise<ServiceResult<Board>> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .update({
          ...board,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async archive(id: string): Promise<ServiceResult<Board>> {
    try {
      await supabase
        .from('documents')
        .update({
          board_id: null,
          board_column_id: null,
          board_position: null,
          updated_at: new Date().toISOString(),
        })
        .eq('board_id', id)
        .is('deleted_at', null)

      const { data, error } = await supabase
        .from('boards')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async listColumns(boardId: string): Promise<ServiceResult<BoardColumn[]>> {
    try {
      const { data, error } = await supabase
        .from('board_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async createColumn(column: BoardColumnInsert): Promise<ServiceResult<BoardColumn>> {
    try {
      const { data, error } = await supabase
        .from('board_columns')
        .insert(column)
        .select()
        .single()
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async updateColumn(id: string, column: BoardColumnUpdate): Promise<ServiceResult<BoardColumn>> {
    try {
      const { data, error } = await supabase
        .from('board_columns')
        .update({
          ...column,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async assignDocumentToBoard(
    documentId: string,
    boardId: string | null,
    boardColumnId: string | null,
    boardPosition: number | null = null
  ): Promise<ServiceResult<void>> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          folder_id: null,
          board_id: boardId,
          board_column_id: boardColumnId,
          board_position: boardPosition,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)

      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async deleteColumn(id: string, moveCardsToColumnId?: string | null): Promise<ServiceResult<void>> {
    try {
      if (moveCardsToColumnId) {
        await supabase
          .from('documents')
          .update({ board_column_id: moveCardsToColumnId, updated_at: new Date().toISOString() })
          .eq('board_column_id', id)
      }
      const { error } = await supabase
        .from('board_columns')
        .delete()
        .eq('id', id)
      if (error) throw error
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },

  async moveToFolder(boardId: string, folderId: string | null): Promise<ServiceResult<Board>> {
    try {
      const { data, error } = await supabase
        .from('boards')
        .update({
          folder_id: folderId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boardId)
        .select()
        .single()
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    }
  },
}

export default boardService
