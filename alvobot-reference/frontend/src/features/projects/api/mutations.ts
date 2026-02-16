import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import { showToast } from '@/shared/components/Toast'
import { useErrorHandler } from '@/shared/hooks'
import { ActivityLogger } from '@/shared/utils/activityLogger'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase, getCurrentUserId } from '@/shared/utils/supabase'
import type { Project, CreateProjectInput, UpdateProjectInput } from '../types'

/**
 * Test WordPress credentials by calling the WP REST API
 */
export async function testWordPressConnection(
  domain: string,
  login: string,
  password: string
): Promise<{ success: boolean; message: string; wpVersion?: string }> {
  try {
    // Normalize domain
    const baseUrl = domain.replace(/\/$/, '')

    // Try to access WP REST API with Basic Auth
    const credentials = btoa(`${login}:${password}`)

    const response = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      // Also get WP version
      const wpResponse = await fetch(`${baseUrl}/wp-json/`, {
        method: 'GET',
      })

      let wpVersion: string | undefined
      if (wpResponse.ok) {
        const wpData = await wpResponse.json()
        wpVersion = wpData.description || undefined
      }

      return {
        success: true,
        message: 'Conexão estabelecida com sucesso!',
        wpVersion,
      }
    }

    if (response.status === 401) {
      return {
        success: false,
        message: 'Credenciais inválidas. Verifique o usuário e senha.',
      }
    }

    if (response.status === 404) {
      return {
        success: false,
        message: 'API REST do WordPress não encontrada. O plugin AlvoBot está ativo?',
      }
    }

    return {
      success: false,
      message: `Erro ao conectar: ${response.status} ${response.statusText}`,
    }
  } catch {
    // CORS error or network error
    return {
      success: false,
      message: 'Não foi possível conectar ao WordPress. Verifique se o plugin está instalado e ativo.',
    }
  }
}

/**
 * Cria um projeto diretamente no Supabase
 * Note: credentials (login/password) should be encrypted before storage
 */
async function createProject(input: CreateProjectInput, workspaceId: string): Promise<Project> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  // Note: For MVP, we're storing credentials in plain text
  // TODO: Encrypt credentials on backend before storing in database
  interface ProjectInsertData {
    name: string
    domain?: string
    default_language: string
    user_id: string
    workspace_id: string
    status: boolean
    login?: string
    pass?: string
  }

  const projectData: ProjectInsertData = {
    name: input.name,
    domain: input.domain,
    default_language: input.default_language || 'pt',
    user_id: userId,
    workspace_id: workspaceId,
    status: false, // Will be set to true when plugin connects
    login: 'alvobot', // Always use 'alvobot' as WordPress username
  }

  // Add WordPress credentials if provided by plugin (password/token)
  if (input.password) {
    // For MVP: Store password directly (will be encrypted by RLS/backend later)
    projectData.pass = input.password
    projectData.status = true
  }

  // Allow overriding login if explicitly provided (for special cases)
  if (input.login) {
    projectData.login = input.login
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Project
}

async function updateProject(id: number, input: UpdateProjectInput): Promise<Project> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('projects')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Project
}

async function deleteProject(id: number): Promise<void> {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('projects')
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (input: CreateProjectInput) => {
      if (!workspaceId) throw new Error('Nenhum workspace selecionado')
      return createProject(input, workspaceId)
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      showToast.success('Projeto criado com sucesso')
      // Log activity
      ActivityLogger.projectCreated(project.id, project.name)
    },
    onError: (error) => {
      handleError(error, 'Erro ao criar projeto')
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateProjectInput & { id: number }) =>
      updateProject(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      queryClient.setQueryData(queryKeys.projects.detail(data.id), data)
      showToast.success('Projeto atualizado com sucesso')
      // Log activity
      ActivityLogger.projectUpdated(data.id, data.name)
    },
    onError: (error) => {
      handleError(error, 'Erro ao atualizar projeto')
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { handleError } = useErrorHandler()

  return useMutation({
    mutationFn: (params: { id: number; name: string }) => deleteProject(params.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      showToast.success('Projeto excluído com sucesso')
      // Log activity
      ActivityLogger.projectDeleted(variables.id, variables.name)
    },
    onError: (error) => {
      handleError(error, 'Erro ao excluir projeto')
    },
  })
}
