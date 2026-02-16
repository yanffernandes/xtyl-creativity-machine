// useConsumeCredits - T042, T043, T044, T045
// Hook for consuming credits with FIFO logic (monthly first, then extras)

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { queryKeys } from '@/shared/utils/queryKeys'
import { supabase } from '@/shared/utils/supabase'

interface ConsumeCreditsParams {
  amount: number
  operationType: string
  operationId?: string
  description?: string
}

interface ConsumeCreditsResult {
  success: boolean
  monthly_consumed: number
  extra_consumed: number
  consumption_details: {
    monthly_consumed: number
    extra_consumed: number
    source: 'monthly' | 'extra' | 'mixed'
    extra_packages?: Array<{
      package_id: number
      consumed: number
    }>
  }
}

interface CheckCreditsResult {
  has_sufficient: boolean
  monthly_available: number
  extra_available: number
  total_available: number
}

// T044: Error class for insufficient credits
export class InsufficientCreditsError extends Error {
  public required: number
  public available: number
  public monthlyAvailable: number
  public extraAvailable: number

  constructor(required: number, available: number, monthlyAvailable: number, extraAvailable: number) {
    super(`Creditos insuficientes. Necessario: ${required}, Disponivel: ${available}`)
    this.name = 'InsufficientCreditsError'
    this.required = required
    this.available = available
    this.monthlyAvailable = monthlyAvailable
    this.extraAvailable = extraAvailable
  }
}

// Check if user has sufficient credits
export async function checkCreditsAvailable(
  userId: string,
  requiredAmount: number
): Promise<CheckCreditsResult> {
  const { data, error } = await supabase.rpc('check_credits_available', {
    p_user_id: userId,
    p_required_amount: requiredAmount,
  })

  if (error) {
    console.warn('check_credits_available function not available:', error.message)
    // Fallback: assume sufficient credits (let the consume function handle it)
    return {
      has_sufficient: true,
      monthly_available: 0,
      extra_available: 0,
      total_available: 0,
    }
  }

  // RPC returns array with single row
  const result = Array.isArray(data) ? data[0] : data
  return result as CheckCreditsResult
}

// Consume credits (monthly first, then extras FIFO)
async function consumeCredits(
  userId: string,
  params: ConsumeCreditsParams
): Promise<ConsumeCreditsResult> {
  const { data, error } = await supabase.rpc('consume_credits', {
    p_user_id: userId,
    p_amount: params.amount,
    p_operation_type: params.operationType,
    p_operation_id: params.operationId || null,
    p_description: params.description || null,
  })

  if (error) {
    // T044: Handle insufficient credits error
    if (error.message.includes('Insufficient credits')) {
      // Parse the error message to extract values
      const match = error.message.match(/Required: (\d+), Available: (\d+) \(monthly: (\d+), extra: (\d+)\)/)
      if (match) {
        throw new InsufficientCreditsError(
          parseInt(match[1]),
          parseInt(match[2]),
          parseInt(match[3]),
          parseInt(match[4])
        )
      }
    }
    throw new Error(error.message)
  }

  // RPC returns array with single row
  const result = Array.isArray(data) ? data[0] : data
  return result as ConsumeCreditsResult
}

// Hook for checking credits
export function useCheckCreditsAvailable() {
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: async (requiredAmount: number) => {
      if (!user) throw new Error('Not authenticated')
      return checkCreditsAvailable(user.id, requiredAmount)
    },
  })
}

// T042: Hook for consuming credits
export function useConsumeCredits() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: ConsumeCreditsParams) => {
      if (!user) throw new Error('Not authenticated')
      return consumeCredits(user.id, params)
    },
    onSuccess: () => {
      // T045: Invalidate credits queries after consumption
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.credits.all })
        queryClient.invalidateQueries({ queryKey: queryKeys.credits.summaryV2(user.id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.credits.packages(user.id) })
      }
    },
    // T044: Error handling is done via the InsufficientCreditsError class
    // Callers can catch this specific error type and show appropriate UI
  })
}

// Helper hook to get formatted error message
export function getCreditsErrorMessage(error: unknown): string {
  if (error instanceof InsufficientCreditsError) {
    return `Voce nao tem creditos suficientes. Necessario: ${error.required}, Disponivel: ${error.available} (${error.monthlyAvailable} mensais + ${error.extraAvailable} extras)`
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Erro ao consumir creditos'
}

export default useConsumeCredits
