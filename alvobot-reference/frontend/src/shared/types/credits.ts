export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise'

export interface UserCredits {
  id: number
  user_id: string
  total_credits: number
  used_credits: number
  available_credits: number
  plan_type: PlanType
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export type CreditOperation =
  | 'signup_bonus'
  | 'subscription_renewal'
  | 'manual_add'
  | 'article_generation'
  | 'keyword_mining'
  | 'ai_title_generation'
  | 'refund'

export interface CreditTransaction {
  id: number
  user_id: string
  amount: number
  operation: CreditOperation
  reference_type: string | null
  reference_id: number | null
  balance_after: number
  created_at: string
}

export interface CreditTransactionListResponse {
  data: CreditTransaction[]
  total: number
}

export interface ConsumeCreditsInput {
  amount: number
  operation: CreditOperation
  reference_type?: string
  reference_id?: number
}

export interface InsufficientCreditsError {
  error: string
  available_credits: number
  required_credits: number
}
