/**
 * Currency conversion utility for revenue dashboard
 *
 * Uses live exchange rates from frankfurter.app API (free, no API key required)
 * Caches rates for 1 hour to avoid excessive API calls
 */

// Cache for exchange rates
interface RatesCache {
  rates: Record<string, number>
  timestamp: number
  baseCurrency: string
}

let ratesCache: RatesCache | null = null
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hour cache

// Fallback rates (used if API fails)
const FALLBACK_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.27,
  BRL: 0.17,
  JPY: 0.0067,
  CAD: 0.74,
  AUD: 0.65,
  CHF: 1.13,
  CNY: 0.14,
  INR: 0.012,
  MXN: 0.058,
}

/**
 * Fetch live exchange rates from frankfurter.app API
 * Returns rates with USD as base currency
 */
async function fetchLiveRates(): Promise<Record<string, number>> {
  try {
    // Check cache first
    if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_TTL_MS) {
      return ratesCache.rates
    }

    // frankfurter.app API - free, no key required
    // Note: This API uses EUR as base, so we need to convert to USD-based rates
    const response = await fetch('https://api.frankfurter.app/latest?from=USD')

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`)
    }

    const data = await response.json() as {
      base: string
      date: string
      rates: Record<string, number>
    }

    // API returns how many units of each currency equals 1 USD
    // We need to invert this to get "how many USD per 1 unit of currency"
    const ratesFromUSD = data.rates
    const ratesToUSD: Record<string, number> = { USD: 1.0 }

    for (const [currency, rateFromUSD] of Object.entries(ratesFromUSD)) {
      // If 1 USD = X BRL, then 1 BRL = 1/X USD
      ratesToUSD[currency] = 1 / rateFromUSD
    }

    // Update cache
    // eslint-disable-next-line require-atomic-updates
    ratesCache = {
      rates: ratesToUSD,
      timestamp: Date.now(),
      baseCurrency: 'USD',
    }

    return ratesToUSD
  } catch (error) {
    console.warn('Failed to fetch live exchange rates, using fallback:', error)
    return FALLBACK_RATES_TO_USD
  }
}

// Store for synchronous access after initial fetch
let currentRates: Record<string, number> = FALLBACK_RATES_TO_USD

/**
 * Initialize exchange rates (call once on app load)
 * This fetches live rates and stores them for synchronous access
 */
export async function initializeExchangeRates(): Promise<void> {
  currentRates = await fetchLiveRates()
}

/**
 * Refresh exchange rates (call periodically or on user action)
 */
export async function refreshExchangeRates(): Promise<Record<string, number>> {
  // Clear cache to force refresh
  ratesCache = null
  currentRates = await fetchLiveRates()
  return currentRates
}

/**
 * Get current exchange rates (synchronous, uses cached rates)
 */
export function getExchangeRates(): Record<string, number> {
  return currentRates
}

/**
 * Convert an amount from one currency to USD
 * @param amount The amount in the source currency
 * @param fromCurrency The source currency code (e.g., 'BRL', 'EUR')
 * @returns The amount converted to USD
 */
export function convertToUSD(amount: number, fromCurrency: string): number {
  if (!amount || amount === 0) return 0

  const rate = currentRates[fromCurrency.toUpperCase()]
  if (rate === undefined) {
    // Unknown currency - log warning and return original (assume USD)
    console.warn(`Unknown currency code: ${fromCurrency}, assuming USD`)
    return amount
  }

  return amount * rate
}

/**
 * Get the exchange rate from a currency to USD
 * @param currency The currency code
 * @returns The exchange rate or 1 if unknown
 */
export function getExchangeRateToUSD(currency: string): number {
  return currentRates[currency.toUpperCase()] ?? 1
}

/**
 * Check if a currency is supported
 * @param currency The currency code
 * @returns True if the currency has an exchange rate
 */
export function isCurrencySupported(currency: string): boolean {
  return currency.toUpperCase() in currentRates
}

/**
 * Get list of all supported currencies
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(currentRates)
}

/**
 * Format a message about currency conversion
 * @param originalCurrencies Array of original currency codes that were converted
 * @returns A user-friendly message about the conversion
 */
export function getCurrencyConversionMessage(originalCurrencies: string[]): string {
  const uniqueCurrencies = [...new Set(originalCurrencies.filter(c => c && c !== 'USD'))]

  if (uniqueCurrencies.length === 0) {
    return ''
  }

  if (uniqueCurrencies.length === 1) {
    return `Valores convertidos de ${uniqueCurrencies[0]} para USD (taxa atualizada).`
  }

  const currencyList = uniqueCurrencies.join(', ')
  return `Valores convertidos de múltiplas moedas (${currencyList}) para USD (taxas atualizadas).`
}
