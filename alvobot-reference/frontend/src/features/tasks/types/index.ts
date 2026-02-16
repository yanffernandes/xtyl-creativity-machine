import type { Task, TaskStatus } from '@/shared/types/entities'

export type { Task, TaskStatus }

export interface TaskFilters {
  search?: string
  status?: TaskStatus
  projectId?: number
}

export interface CreateTaskInput {
  name: string
  description?: string
  status?: TaskStatus
  project_id?: number
  estimated_time?: number
  tags?: string[]
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string
  completion_percentage?: number
  started_at?: string
  completed_at?: string
}

// Import Tasks Types
export type ImportPhase = 'seu_blog_no_ar' | 'mineracao' | 'escala'

export interface ImportTasksInput {
  project_id: number
  phase: ImportPhase
}

export interface ImportTasksResponse {
  success: boolean
  count: number
  message: string
  tasks?: Task[]
}
