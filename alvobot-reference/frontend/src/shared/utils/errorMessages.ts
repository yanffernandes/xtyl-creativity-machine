/**
 * Error message translation and enhancement utility
 *
 * Follows Nielsen's Heuristic #9: Help users recognize, diagnose, and recover from errors
 * - Messages in plain language (Portuguese)
 * - Precisely indicate the problem
 * - Constructively suggest a solution
 */

interface ErrorMessage {
  message: string
  suggestion?: string
}

// Common Supabase/Auth errors
const AUTH_ERRORS: Record<string, ErrorMessage> = {
  'Invalid login credentials': {
    message: 'Email ou senha incorretos',
    suggestion: 'Verifique se digitou corretamente ou use "Esqueci minha senha"',
  },
  'Email not confirmed': {
    message: 'Email ainda não confirmado',
    suggestion: 'Verifique sua caixa de entrada e clique no link de confirmação',
  },
  'User already registered': {
    message: 'Este email já está cadastrado',
    suggestion: 'Tente fazer login ou use "Esqueci minha senha"',
  },
  'Password should be at least 6 characters': {
    message: 'A senha deve ter pelo menos 6 caracteres',
    suggestion: 'Escolha uma senha mais forte com letras, números e símbolos',
  },
  'Unable to validate email address': {
    message: 'Formato de email inválido',
    suggestion: 'Verifique se o email está no formato correto: exemplo@dominio.com',
  },
  'Email rate limit exceeded': {
    message: 'Muitas tentativas de envio',
    suggestion: 'Aguarde alguns minutos antes de tentar novamente',
  },
  'Signup disabled': {
    message: 'Cadastros temporariamente desativados',
    suggestion: 'Entre em contato com o suporte para criar sua conta',
  },
  'refresh_token_not_found': {
    message: 'Sessão expirada',
    suggestion: 'Faça login novamente para continuar',
  },
}

// Network and API errors
const NETWORK_ERRORS: Record<string, ErrorMessage> = {
  'Failed to fetch': {
    message: 'Não foi possível conectar ao servidor',
    suggestion: 'Verifique sua conexão com a internet e tente novamente',
  },
  'Network Error': {
    message: 'Erro de conexão',
    suggestion: 'Verifique sua conexão com a internet ou tente novamente em alguns instantes',
  },
  'Request timeout': {
    message: 'A requisição demorou muito',
    suggestion: 'O servidor pode estar sobrecarregado. Tente novamente em alguns instantes',
  },
  'CORS error': {
    message: 'Erro de comunicação com o servidor',
    suggestion: 'Tente recarregar a página ou limpar o cache do navegador',
  },
}

// WordPress/Connection errors
const CONNECTION_ERRORS: Record<string, ErrorMessage> = {
  'API REST não encontrada': {
    message: 'API REST do WordPress não encontrada',
    suggestion: 'Verifique se o plugin AlvoBot está instalado e ativo no WordPress',
  },
  'Credenciais inválidas': {
    message: 'Credenciais de conexão inválidas',
    suggestion: 'Verifique a URL, usuário e senha de aplicativo do WordPress',
  },
  'Unauthorized': {
    message: 'Acesso não autorizado',
    suggestion: 'Verifique suas credenciais ou reconecte a conta',
  },
  'Forbidden': {
    message: 'Acesso negado',
    suggestion: 'Você não tem permissão para esta ação. Verifique suas permissões',
  },
}

// General errors
const GENERAL_ERRORS: Record<string, ErrorMessage> = {
  'Quota exceeded': {
    message: 'Limite de créditos atingido',
    suggestion: 'Atualize seu plano para continuar usando este recurso',
  },
  'Not found': {
    message: 'Recurso não encontrado',
    suggestion: 'O item pode ter sido removido. Atualize a página e tente novamente',
  },
  'Internal server error': {
    message: 'Erro interno do servidor',
    suggestion: 'Nosso time foi notificado. Tente novamente em alguns instantes',
  },
  'Bad request': {
    message: 'Requisição inválida',
    suggestion: 'Verifique os dados informados e tente novamente',
  },
}

// Combine all error maps
const ALL_ERRORS: Record<string, ErrorMessage> = {
  ...AUTH_ERRORS,
  ...NETWORK_ERRORS,
  ...CONNECTION_ERRORS,
  ...GENERAL_ERRORS,
}

/**
 * Get a user-friendly error message with optional suggestion
 *
 * @param error - The error object or message string
 * @param fallbackMessage - Default message if no translation found
 * @returns Object with translated message and optional suggestion
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado'
): ErrorMessage {
  // Extract error message string
  let errorString: string

  if (error instanceof Error) {
    errorString = error.message
  } else if (typeof error === 'string') {
    errorString = error
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorString = String((error as { message: unknown }).message)
  } else {
    return { message: fallbackMessage, suggestion: 'Tente novamente ou entre em contato com o suporte' }
  }

  // Look for exact match first
  if (ALL_ERRORS[errorString]) {
    return ALL_ERRORS[errorString]
  }

  // Look for partial match (case-insensitive)
  const lowerError = errorString.toLowerCase()
  for (const [key, value] of Object.entries(ALL_ERRORS)) {
    if (lowerError.includes(key.toLowerCase())) {
      return value
    }
  }

  // HTTP status code patterns
  if (lowerError.includes('401')) {
    return { message: 'Sessão expirada', suggestion: 'Faça login novamente para continuar' }
  }
  if (lowerError.includes('403')) {
    return { message: 'Acesso negado', suggestion: 'Você não tem permissão para esta ação' }
  }
  if (lowerError.includes('404')) {
    return { message: 'Recurso não encontrado', suggestion: 'O item pode ter sido removido ou movido' }
  }
  if (lowerError.includes('429')) {
    return { message: 'Muitas requisições', suggestion: 'Aguarde alguns segundos antes de tentar novamente' }
  }
  if (lowerError.includes('500') || lowerError.includes('502') || lowerError.includes('503')) {
    return { message: 'Erro no servidor', suggestion: 'Tente novamente em alguns instantes' }
  }

  // Return original message with generic suggestion
  return {
    message: errorString,
    suggestion: 'Se o problema persistir, entre em contato com o suporte',
  }
}

/**
 * Format error message for display (message + suggestion combined)
 */
export function formatErrorMessage(error: unknown, fallbackMessage?: string): string {
  const { message, suggestion } = getErrorMessage(error, fallbackMessage)
  return suggestion ? `${message}. ${suggestion}` : message
}

/**
 * Format error for toast notifications (shorter format)
 */
export function formatErrorForToast(error: unknown, fallbackMessage?: string): string {
  const { message } = getErrorMessage(error, fallbackMessage)
  return message
}
