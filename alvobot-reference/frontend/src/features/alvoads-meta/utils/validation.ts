import { META_AD_LIMITS, META_TARGETING_RULES, type MetaTargeting, type MetaAdCopy, type MetaBudget  } from '../types/campaign'

// ========================
// Validation Constants
// ========================

export { META_AD_LIMITS, META_TARGETING_RULES }

// URL validation regex
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/

// ========================
// Validation Results
// ========================

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// ========================
// Targeting Validation
// ========================

export function validateTargeting(targeting: MetaTargeting): ValidationResult {
  const errors: string[] = []

  // Age validation
  if (targeting.ageMin < META_TARGETING_RULES.ageMin) {
    errors.push(`Idade mínima deve ser pelo menos ${META_TARGETING_RULES.ageMin} anos`)
  }

  if (targeting.ageMax > META_TARGETING_RULES.ageMax) {
    errors.push(`Idade máxima deve ser no máximo ${META_TARGETING_RULES.ageMax} anos`)
  }

  if (targeting.ageMin > targeting.ageMax) {
    errors.push('Idade mínima não pode ser maior que idade máxima')
  }

  // Gender validation
  if (!targeting.genders || targeting.genders.length === 0) {
    errors.push('Selecione pelo menos um gênero')
  }

  // Countries validation
  if (!targeting.countries || targeting.countries.length === 0) {
    errors.push('Selecione pelo menos um país')
  }

  // Languages validation
  if (!targeting.languages || targeting.languages.length === 0) {
    errors.push('Selecione pelo menos um idioma')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ========================
// Ad Copy Validation
// ========================

export function validateAdCopy(adCopy: MetaAdCopy): ValidationResult {
  const errors: string[] = []

  // Primary text
  if (!adCopy.primaryText || adCopy.primaryText.trim().length === 0) {
    errors.push('Texto principal é obrigatório')
  } else if (adCopy.primaryText.length > META_AD_LIMITS.primaryText) {
    errors.push(`Texto principal deve ter no máximo ${META_AD_LIMITS.primaryText} caracteres`)
  }

  // Headline
  if (!adCopy.headline || adCopy.headline.trim().length === 0) {
    errors.push('Título é obrigatório')
  } else if (adCopy.headline.length > META_AD_LIMITS.headline) {
    errors.push(`Título deve ter no máximo ${META_AD_LIMITS.headline} caracteres`)
  }

  // Description
  if (!adCopy.description || adCopy.description.trim().length === 0) {
    errors.push('Descrição é obrigatória')
  } else if (adCopy.description.length > META_AD_LIMITS.description) {
    errors.push(`Descrição deve ter no máximo ${META_AD_LIMITS.description} caracteres`)
  }

  // CTA
  if (!adCopy.callToAction) {
    errors.push('Selecione um botão de ação (CTA)')
  }

  // Destination URL
  if (!adCopy.destinationUrl || adCopy.destinationUrl.trim().length === 0) {
    errors.push('URL de destino é obrigatória')
  } else if (!URL_REGEX.test(adCopy.destinationUrl)) {
    errors.push('URL de destino inválida')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ========================
// Budget Validation
// ========================

export function validateBudget(budget: MetaBudget): ValidationResult {
  const errors: string[] = []

  // Budget amount
  if (!budget.amount || budget.amount <= 0) {
    errors.push('Orçamento deve ser maior que zero')
  } else if (budget.amount < META_TARGETING_RULES.budgetMin) {
    const minReais = META_TARGETING_RULES.budgetMin / 100
    errors.push(`Orçamento mínimo é R$${minReais.toFixed(2)}`)
  }

  // Budget type
  if (!budget.type || !['daily', 'lifetime'].includes(budget.type)) {
    errors.push('Tipo de orçamento inválido')
  }

  // Bid strategy
  if (!budget.bidStrategy) {
    errors.push('Selecione uma estratégia de lances')
  }

  // Cost per result (if strategy requires it)
  if (budget.bidStrategy === 'COST_CAP' && (!budget.costPerResult || budget.costPerResult <= 0)) {
    errors.push('Custo por resultado é obrigatório para estratégia de custo por resultado')
  }

  // Bid cap (if strategy requires it)
  if (budget.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' && (!budget.bidCap || budget.bidCap <= 0)) {
    errors.push('Lance máximo é obrigatório para estratégia de limite de lance')
  }

  // Min ROAS (if strategy requires it)
  if (budget.bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS' && (!budget.minRoas || budget.minRoas <= 0)) {
    errors.push('ROAS mínimo é obrigatório para estratégia de ROAS mínimo')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// ========================
// URL Validation
// ========================

export function validateUrl(url: string): boolean {
  return URL_REGEX.test(url)
}

// ========================
// Character Count Helpers
// ========================

export function getCharacterCount(text: string, limit: number): {
  count: number
  limit: number
  remaining: number
  isOver: boolean
} {
  const count = text?.length || 0
  return {
    count,
    limit,
    remaining: limit - count,
    isOver: count > limit,
  }
}

export function formatCharacterCount(text: string, limit: number): string {
  const { count, remaining, isOver } = getCharacterCount(text, limit)
  if (isOver) {
    return `${count}/${limit} (${Math.abs(remaining)} a mais)`
  }
  return `${count}/${limit}`
}

// ========================
// Currency Formatting
// ========================

export function formatCurrency(valueInCents: number): string {
  const valueInReais = valueInCents / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInReais)
}

export function parseCurrencyTocents(value: string): number {
  // Remove currency symbol and formatting
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : Math.round(parsed * 100)
}

// ========================
// Drive URL Validation
// ========================

export function validateDriveFolderUrl(url: string): boolean {
  // Google Drive folder URL patterns:
  // https://drive.google.com/drive/folders/{folderId}
  // https://drive.google.com/drive/u/0/folders/{folderId}
  const driveUrlPattern = /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/[a-zA-Z0-9_-]+/
  return driveUrlPattern.test(url)
}

export function extractDriveFolderId(url: string): string | null {
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}
