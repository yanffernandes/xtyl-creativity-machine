import { supabase } from './supabase'

// Activity log types
export type ActionType = 'create' | 'update' | 'delete' | 'execute' | 'mine' | 'publish'
export type ResourceType =
  | 'article'
  | 'keyword'
  | 'project'
  | 'flow'
  | 'trigger'
  | 'run'
  | 'disparo'
  | 'task'
  | 'base_structure'
  | 'system'

export interface LogActivityParams {
  actionType: ActionType
  resourceType: ResourceType
  resourceId?: string | number
  title?: string
  description?: string
  metadata?: Record<string, unknown>
  creditsConsumed?: number
  isVisible?: boolean
  status?: 'success' | 'failed' | 'pending'
  errorMessage?: string
}

/**
 * Generate a human-readable title based on action and resource type
 */
function generateTitle(actionType: ActionType, resourceType: ResourceType): string {
  const actionLabels: Record<ActionType, string> = {
    create: 'Criou',
    update: 'Atualizou',
    delete: 'Excluiu',
    execute: 'Executou',
    mine: 'Minerou',
    publish: 'Publicou',
  }

  const resourceLabels: Record<ResourceType, string> = {
    article: 'Artigo',
    keyword: 'Palavra-chave',
    project: 'Projeto',
    flow: 'Fluxo',
    trigger: 'Acionador',
    run: 'Disparo',
    disparo: 'Disparo',
    task: 'Tarefa',
    base_structure: 'Estrutura Base',
    system: 'Sistema',
  }

  return `${actionLabels[actionType]} ${resourceLabels[resourceType]}`
}

/**
 * Log an activity to the activity_logs table
 * This function is designed to be called from mutations after successful operations
 *
 * @param params - Activity parameters
 * @returns The created activity log ID, or null if logging failed
 */
export async function logActivity(params: LogActivityParams): Promise<number | null> {
  const {
    actionType,
    resourceType,
    resourceId,
    title,
    description,
    metadata = {},
    creditsConsumed = 0,
    isVisible = true,
    status = 'success',
    errorMessage,
  } = params

  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      console.warn('logActivity: No authenticated user')
      return null
    }

    const activityData = {
      user_id: userData.user.id,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId?.toString() || null,
      title: title || generateTitle(actionType, resourceType),
      description,
      metadata,
      credits_consumed: creditsConsumed,
      is_visible_to_user: isVisible,
      status,
      error_message: errorMessage,
      billing_cycle_date: new Date().toISOString().split('T')[0],
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert(activityData)
      .select('id')
      .single()

    if (error) {
      // Log error but don't throw - activity logging should not break the app
      console.error('Failed to log activity:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('Activity logging error:', error)
    return null
  }
}

/**
 * Log activity with credit consumption
 * Also records a credit transaction
 */
export async function logActivityWithCredits(
  params: LogActivityParams & { creditsConsumed: number }
): Promise<number | null> {
  const activityLogId = await logActivity(params)

  if (activityLogId && params.creditsConsumed > 0) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return activityLogId

      // Record credit transaction
      await supabase.from('credit_transactions').insert({
        user_id: userData.user.id,
        transaction_type: 'debit',
        amount: -params.creditsConsumed,
        operation_type: params.resourceType,
        operation_id: params.resourceId?.toString(),
        activity_log_id: activityLogId,
        description: params.title || generateTitle(params.actionType, params.resourceType),
        metadata: params.metadata,
      })
    } catch (error) {
      console.error('Failed to record credit transaction:', error)
    }
  }

  return activityLogId
}

/**
 * Helper functions for common logging scenarios
 */
export const ActivityLogger = {
  // Articles
  articleCreated: (articleId: number, title: string, projectName?: string, credits = 1) =>
    logActivityWithCredits({
      actionType: 'create',
      resourceType: 'article',
      resourceId: articleId,
      title: `Artigo criado: ${title}`,
      description: projectName ? `Artigo criado no projeto "${projectName}"` : undefined,
      metadata: { article_title: title, project_name: projectName },
      creditsConsumed: credits,
    }),

  articleUpdated: (articleId: number, title: string) =>
    logActivity({
      actionType: 'update',
      resourceType: 'article',
      resourceId: articleId,
      title: `Artigo atualizado: ${title}`,
      metadata: { article_title: title },
    }),

  articleDeleted: (articleId: number, title: string) =>
    logActivity({
      actionType: 'delete',
      resourceType: 'article',
      resourceId: articleId,
      title: `Artigo excluído: ${title}`,
      metadata: { article_title: title },
    }),

  articlePublished: (articleId: number, title: string, projectName?: string) =>
    logActivity({
      actionType: 'publish',
      resourceType: 'article',
      resourceId: articleId,
      title: `Artigo publicado: ${title}`,
      metadata: { article_title: title, project_name: projectName },
    }),

  // Keywords / Mining
  keywordsMined: (count: number, seedKeyword?: string) =>
    logActivity({
      actionType: 'mine',
      resourceType: 'keyword',
      title: `${count} palavras-chave mineradas`,
      description: seedKeyword ? `Mineração baseada em "${seedKeyword}"` : 'Mineração com IA',
      metadata: { count, seed_keyword: seedKeyword },
    }),

  keywordsSaved: (count: number) =>
    logActivity({
      actionType: 'create',
      resourceType: 'keyword',
      title: `${count} palavra${count !== 1 ? 's' : ''}-chave salva${count !== 1 ? 's' : ''}`,
      metadata: { count },
    }),

  keywordDeleted: (keyword: string) =>
    logActivity({
      actionType: 'delete',
      resourceType: 'keyword',
      title: `Palavra-chave excluída: ${keyword}`,
      metadata: { keyword },
    }),

  // Projects
  projectCreated: (projectId: number, name: string) =>
    logActivity({
      actionType: 'create',
      resourceType: 'project',
      resourceId: projectId,
      title: `Projeto criado: ${name}`,
      metadata: { project_name: name, project_id: projectId },
    }),

  projectUpdated: (projectId: number, name: string) =>
    logActivity({
      actionType: 'update',
      resourceType: 'project',
      resourceId: projectId,
      title: `Projeto atualizado: ${name}`,
      metadata: { project_name: name, project_id: projectId },
    }),

  projectDeleted: (projectId: number, name: string) =>
    logActivity({
      actionType: 'delete',
      resourceType: 'project',
      resourceId: projectId,
      title: `Projeto excluído: ${name}`,
      metadata: { project_name: name, project_id: projectId },
    }),

  // Flows
  flowCreated: (flowId: string, name: string) =>
    logActivity({
      actionType: 'create',
      resourceType: 'flow',
      resourceId: flowId,
      title: `Fluxo criado: ${name}`,
      metadata: { flow_name: name },
    }),

  flowUpdated: (flowId: string, name: string) =>
    logActivity({
      actionType: 'update',
      resourceType: 'flow',
      resourceId: flowId,
      title: `Fluxo atualizado: ${name}`,
      metadata: { flow_name: name },
    }),

  flowDeleted: (flowId: string, name: string) =>
    logActivity({
      actionType: 'delete',
      resourceType: 'flow',
      resourceId: flowId,
      title: `Fluxo excluído: ${name}`,
      metadata: { flow_name: name },
    }),

  // Runs / Dispatches
  runCreated: (runId: number, flowName?: string) =>
    logActivity({
      actionType: 'create',
      resourceType: 'run',
      resourceId: runId,
      title: flowName ? `Disparo criado: ${flowName}` : 'Disparo criado',
      metadata: { flow_name: flowName },
    }),

  runExecuted: (runId: number, flowName?: string) =>
    logActivity({
      actionType: 'execute',
      resourceType: 'run',
      resourceId: runId,
      title: flowName ? `Disparo executado: ${flowName}` : 'Disparo executado',
      metadata: { flow_name: flowName },
    }),

  // Triggers
  triggerCreated: (triggerId: number, name: string) =>
    logActivity({
      actionType: 'create',
      resourceType: 'trigger',
      resourceId: triggerId,
      title: `Acionador criado: ${name}`,
      metadata: { trigger_name: name },
    }),

  triggerUpdated: (triggerId: number, name: string) =>
    logActivity({
      actionType: 'update',
      resourceType: 'trigger',
      resourceId: triggerId,
      title: `Acionador atualizado: ${name}`,
      metadata: { trigger_name: name },
    }),

  triggerDeleted: (triggerId: number, name: string) =>
    logActivity({
      actionType: 'delete',
      resourceType: 'trigger',
      resourceId: triggerId,
      title: `Acionador excluído: ${name}`,
      metadata: { trigger_name: name },
    }),

  // Tasks
  taskCompleted: (taskId: string, name: string, projectName?: string) =>
    logActivity({
      actionType: 'update',
      resourceType: 'task',
      resourceId: taskId,
      title: `Tarefa concluída: ${name}`,
      metadata: { task_name: name, project_name: projectName },
    }),

  // Base Structure
  baseStructureGenerated: (projectId: number, projectName: string, nichesCount: number) =>
    logActivity({
      actionType: 'create',
      resourceType: 'base_structure',
      resourceId: projectId,
      title: `Estrutura de base gerada: ${projectName}`,
      description: `${nichesCount} nichos gerados`,
      metadata: { project_name: projectName, niches_count: nichesCount },
    }),
}

export default ActivityLogger
