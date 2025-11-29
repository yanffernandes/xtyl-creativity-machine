/**
 * Project Hooks
 *
 * React Query hooks for project operations via Supabase Client.
 * Provides caching, optimistic updates, and error handling.
 *
 * Feature: 007-hybrid-supabase-architecture
 * User Story: US1 - Fast Project Listing
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '@/lib/supabase/projects'
import { useToast } from './use-toast'
import type { ProjectInsert, ProjectUpdate, Project } from '@/types/supabase'

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...projectKeys.lists(), workspaceId] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

/**
 * Hook to fetch all projects in a workspace
 */
export function useProjects(workspaceId: string) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId),
    queryFn: async () => {
      const { data, error } = await projectService.listByWorkspace(workspaceId)
      if (error) throw error
      return data
    },
    enabled: !!workspaceId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  })
}

/**
 * Hook to fetch a single project
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await projectService.get(id)
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a project with optimistic update
 */
export function useCreateProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (project: ProjectInsert) => {
      const { data, error } = await projectService.create(project)
      if (error) throw error
      return data
    },
    onMutate: async (newProject) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.list(newProject.workspace_id) })

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData<Project[]>(
        projectKeys.list(newProject.workspace_id)
      )

      // Optimistically update with a temporary ID
      const optimisticProject: Project = {
        id: `temp-${Date.now()}`,
        name: newProject.name,
        description: newProject.description || null,
        workspace_id: newProject.workspace_id,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Project[]>(
        projectKeys.list(newProject.workspace_id),
        (old) => [optimisticProject, ...(old || [])]
      )

      return { previousProjects }
    },
    onError: (error, newProject, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(
          projectKeys.list(newProject.workspace_id),
          context.previousProjects
        )
      }
      toast({
        title: 'Erro ao criar projeto',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(variables.workspace_id) })
      toast({
        title: 'Projeto criado',
        description: `"${data?.name}" foi criado com sucesso.`,
      })
    },
  })
}

/**
 * Hook to update a project with optimistic update
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProjectUpdate }) => {
      const { data: result, error } = await projectService.update(id, data)
      if (error) throw error
      return result
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(id) })

      // Snapshot the previous value
      const previousProject = queryClient.getQueryData<Project>(projectKeys.detail(id))

      // Optimistically update
      if (previousProject) {
        queryClient.setQueryData<Project>(projectKeys.detail(id), {
          ...previousProject,
          ...data,
        })
      }

      return { previousProject }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(projectKeys.detail(variables.id), context.previousProject)
      }
      toast({
        title: 'Erro ao atualizar projeto',
        description: error.message,
        variant: 'destructive',
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) })
      // Also invalidate lists that might contain this project
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast({
        title: 'Projeto atualizado',
        description: 'As alterações foram salvas.',
      })
    },
  })
}

/**
 * Hook to delete a project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await projectService.delete(id)
      if (error) throw error
    },
    onSuccess: () => {
      // Invalidate all project lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast({
        title: 'Projeto excluído',
        description: 'O projeto foi removido.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir projeto',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
