import { boardService } from './supabase/boards'

export const boardsApi = {
  list: async (projectId: string) => {
    const { data, error } = await boardService.listByProject(projectId)
    if (error) throw error
    return data || []
  },

  create: async (projectId: string, name: string, description?: string, folderId?: string | null) => {
    const { data, error } = await boardService.create({
      project_id: projectId,
      folder_id: folderId ?? null,
      name,
      description: description || null,
    })
    if (error) throw error
    return data
  },

  moveToFolder: async (boardId: string, folderId: string | null) => {
    const { data, error } = await boardService.moveToFolder(boardId, folderId)
    if (error) throw error
    return data
  },

  update: async (boardId: string, payload: { name?: string; description?: string | null; position?: number }) => {
    const { data, error } = await boardService.update(boardId, payload)
    if (error) throw error
    return data
  },

  delete: async (boardId: string) => {
    const { error } = await boardService.archive(boardId)
    if (error) throw error
    return { success: true }
  },

  listColumns: async (boardId: string) => {
    const { data, error } = await boardService.listColumns(boardId)
    if (error) throw error
    return data || []
  },

  assignDocument: async (
    documentId: string,
    boardId: string | null,
    boardColumnId: string | null,
    boardPosition?: number | null
  ) => {
    const { error } = await boardService.assignDocumentToBoard(
      documentId,
      boardId,
      boardColumnId,
      boardPosition ?? null
    )
    if (error) throw error
    return { success: true }
  },
}

export default boardsApi
