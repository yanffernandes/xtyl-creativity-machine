// Subscription and Billing Types

export interface Plan {
  id: number
  name: string
  description: string | null
  monthly_credits: number
  price: number
  project_limit: number
  created_at: string
  updated_at: string | null
}

export interface Transaction {
  id: number
  plan_id: number | null
  plan_name?: string
  regular_price: number | null
  buyer_paid: number | null
  received: number | null
  platform_name: string | null
  payment_method: string | null
  transaction_code: string | null
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'refunded'
  timestamp_approved: string | null
  duration: number | null
  type: string | null
  created_at: string
  expiration_date?: string | null
}

export interface SubscriptionSummary {
  user_id: string
  email: string
  name: string | null
  has_active_plan: boolean
  active_plan_name: string | null
  active_plan_monthly_credits: number | null
  active_plan_project_limit: number | null
  plan_expiration_date: string | null
  current_cycle_start: string | null
  current_cycle_end: string | null
  current_cycle_articles_count: number
  active_projects_count: number
  transactions: Transaction[]
}

export interface CreditsSummary {
  plan_monthly_credits: number
  credits_used: number
  credits_remaining: number
  cycle_start: string | null
  cycle_end: string | null
  plan_expiration: string | null
  has_active_plan: boolean
}

export interface CreditTransaction {
  id: number
  user_id: string
  transaction_type: 'debit' | 'credit' | 'adjustment'
  amount: number
  operation_type: string
  operation_id: string | null
  activity_log_id: number | null
  description: string
  billing_cycle_start: string | null
  billing_cycle_end: string | null
  balance_before: number | null
  balance_after: number | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface CreditsByType {
  operation_type: string
  operation_count: number
  credits_used: number
}

export interface ActivityLog {
  id: number
  user_id: string
  action_type: 'create' | 'update' | 'delete' | 'execute' | 'mine' | 'publish'
  resource_type: 'article' | 'keyword' | 'project' | 'flow' | 'trigger' | 'run' | 'disparo' | 'task' | 'base_structure' | 'system'
  resource_id: string | null
  title: string
  description: string | null
  credits_consumed: number
  is_visible_to_user: boolean
  status: 'success' | 'failed' | 'pending'
  error_message: string | null
  metadata: {
    project_name?: string
    project_id?: string
    [key: string]: unknown
  }
  created_at: string
}

// Status display helpers
export function getTransactionStatusLabel(status: Transaction['status']): string {
  const labels: Record<Transaction['status'], string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  }
  return labels[status] || status
}

export function getTransactionStatusVariant(status: Transaction['status']): 'success' | 'warning' | 'error' | 'info' {
  const variants: Record<Transaction['status'], 'success' | 'warning' | 'error' | 'info'> = {
    pending: 'warning',
    approved: 'success',
    completed: 'success',
    cancelled: 'error',
    refunded: 'info',
  }
  return variants[status] || 'info'
}

export function getActionTypeLabel(actionType: ActivityLog['action_type']): string {
  const labels: Record<ActivityLog['action_type'], string> = {
    create: 'Criou',
    update: 'Atualizou',
    delete: 'Excluiu',
    execute: 'Executou',
    mine: 'Minerou',
    publish: 'Publicou',
  }
  return labels[actionType] || actionType
}

export function getResourceTypeLabel(resourceType: ActivityLog['resource_type']): string {
  const labels: Record<ActivityLog['resource_type'], string> = {
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
  return labels[resourceType] || resourceType
}

// ==================== EXTRA CREDITS (Feature 032) ====================

export type ExtraCreditPackageStatus = 'active' | 'expiring_soon' | 'expired' | 'consumed'

export interface ExtraCreditPackage {
  package_id: number
  user_id: string
  original_amount: number
  remaining_amount: number
  description: string
  expires_at: string | null
  created_at: string
  added_by_admin_id: string | null
  added_by_admin_name: string | null
  metadata: Record<string, unknown>
  status: ExtraCreditPackageStatus
  days_until_expiry: number | null
}

export interface UserCreditsSummaryV2 {
  user_id: string
  // Monthly credits (from plan)
  plan_monthly_credits: number
  monthly_credits_used: number
  monthly_credits_remaining: number
  // Extra credits
  extra_credits_available: number
  extra_credits_expiring_soon: number
  extra_credits_expired: number
  // Total combined
  total_credits_available: number
  // Cycle and plan info
  cycle_start: string | null
  cycle_end: string | null
  plan_expiration: string | null
  has_active_plan: boolean
}

// Helper function for extra credit status
export function getExtraCreditStatusLabel(status: ExtraCreditPackageStatus): string {
  const labels: Record<ExtraCreditPackageStatus, string> = {
    active: 'Ativo',
    expiring_soon: 'Expirando em breve',
    expired: 'Expirado',
    consumed: 'Consumido',
  }
  return labels[status] || status
}

export function getExtraCreditStatusVariant(status: ExtraCreditPackageStatus): 'success' | 'warning' | 'error' | 'info' {
  const variants: Record<ExtraCreditPackageStatus, 'success' | 'warning' | 'error' | 'info'> = {
    active: 'success',
    expiring_soon: 'warning',
    expired: 'error',
    consumed: 'info',
  }
  return variants[status] || 'info'
}
