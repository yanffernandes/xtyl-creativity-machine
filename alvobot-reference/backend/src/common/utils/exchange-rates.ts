/**
 * Currency exchange rate utility
 *
 * Fetches live exchange rates from multiple API sources with fallback chain:
 * 1. frankfurter.app API (free, no API key required)
 * 2. exchangerate.host API (free backup)
 * 3. Supabase cached rates (persisted from last successful fetch)
 * 4. Hardcoded emergency fallback (only if all else fails)
 *
 * Caches rates for 1 hour to avoid excessive API calls
 * Persists rates to Supabase for disaster recovery
 */

import { Logger } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const logger = new Logger("ExchangeRates");

// Cache for exchange rates (in-memory)
interface RatesCache {
  rates: Record<string, number>;
  timestamp: number;
  baseCurrency: string;
  source: string;
}

let ratesCache: RatesCache | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hour cache

// Supabase client for persistence (lazy initialized)
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    logger.warn("Supabase credentials not available for exchange rate caching");
    return null;
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
}

// Emergency hardcoded fallback rates (used ONLY if ALL API sources fail)
// These are approximate rates and should rarely be used
const EMERGENCY_FALLBACK_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.27,
  BRL: 0.17,
  JPY: 0.0067,
  CAD: 0.74,
  AUD: 0.65,
};

// Store for synchronous access after initial fetch
let currentRates: Record<string, number> = { USD: 1.0 };
let ratesSource = "uninitialized";

/**
 * Fetch rates from frankfurter.app API (primary source)
 */
async function fetchFromFrankfurter(): Promise<Record<string, number> | null> {
  try {
    logger.log("Fetching exchange rates from frankfurter.app...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(
      "https://api.frankfurter.app/latest?from=USD",
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = (await response.json()) as {
      base: string;
      date: string;
      rates: Record<string, number>;
    };

    // Convert from "1 USD = X currency" to "1 currency = X USD"
    const ratesToUSD: Record<string, number> = { USD: 1.0 };
    for (const [currency, rateFromUSD] of Object.entries(data.rates)) {
      ratesToUSD[currency] = 1 / rateFromUSD;
    }

    logger.log(
      `frankfurter.app: Got ${Object.keys(ratesToUSD).length} currencies`,
    );
    return ratesToUSD;
  } catch (error) {
    logger.warn("frankfurter.app failed:", (error as Error).message);
    return null;
  }
}

/**
 * Fetch rates from exchangerate.host API (backup source)
 */
async function fetchFromExchangerateHost(): Promise<Record<
  string,
  number
> | null> {
  try {
    logger.log("Fetching exchange rates from exchangerate.host...");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      "https://api.exchangerate.host/latest?base=USD",
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = (await response.json()) as {
      base: string;
      date: string;
      rates: Record<string, number>;
      success?: boolean;
    };

    if (data.success === false || !data.rates) {
      throw new Error("Invalid response from exchangerate.host");
    }

    // Convert from "1 USD = X currency" to "1 currency = X USD"
    const ratesToUSD: Record<string, number> = { USD: 1.0 };
    for (const [currency, rateFromUSD] of Object.entries(data.rates)) {
      if (typeof rateFromUSD === "number" && rateFromUSD > 0) {
        ratesToUSD[currency] = 1 / rateFromUSD;
      }
    }

    logger.log(
      `exchangerate.host: Got ${Object.keys(ratesToUSD).length} currencies`,
    );
    return ratesToUSD;
  } catch (error) {
    logger.warn("exchangerate.host failed:", (error as Error).message);
    return null;
  }
}

/**
 * Load rates from Supabase cache (fallback when APIs fail)
 */
async function loadFromSupabaseCache(): Promise<Record<string, number> | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    logger.log("Loading exchange rates from Supabase cache...");

    const { data, error } = await supabase
      .from("system_config")
      .select("value, updated_at")
      .eq("key", "exchange_rates_to_usd")
      .single();

    if (error || !data) {
      logger.warn("No cached rates in Supabase");
      return null;
    }

    const rates = data.value as Record<string, number>;
    const updatedAt = new Date(data.updated_at).getTime();
    const age = Date.now() - updatedAt;
    const ageHours = Math.round(age / (1000 * 60 * 60));

    logger.log(
      `Supabase cache: Got ${Object.keys(rates).length} currencies (${ageHours}h old)`,
    );
    return rates;
  } catch (error) {
    logger.warn("Failed to load from Supabase:", (error as Error).message);
    return null;
  }
}

/**
 * Save rates to Supabase cache for future fallback
 */
async function saveToSupabaseCache(
  rates: Record<string, number>,
  source: string,
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { error } = await supabase.from("system_config").upsert(
      {
        key: "exchange_rates_to_usd",
        value: rates,
        description: `Exchange rates to USD (source: ${source})`,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    if (error) {
      logger.warn("Failed to save rates to Supabase:", error.message);
    } else {
      logger.log(`Saved ${Object.keys(rates).length} rates to Supabase cache`);
    }
  } catch (error) {
    logger.warn("Failed to save to Supabase:", (error as Error).message);
  }
}

/**
 * Fetch live exchange rates with fallback chain
 */
async function fetchLiveRates(): Promise<{
  rates: Record<string, number>;
  source: string;
}> {
  // Check in-memory cache first
  if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_TTL_MS) {
    return { rates: ratesCache.rates, source: `cache(${ratesCache.source})` };
  }

  // Try primary API
  let rates = await fetchFromFrankfurter();
  let source = "frankfurter.app";

  // Try backup API if primary failed
  if (!rates) {
    rates = await fetchFromExchangerateHost();
    source = "exchangerate.host";
  }

  // Try Supabase cache if both APIs failed
  if (!rates) {
    rates = await loadFromSupabaseCache();
    source = "supabase_cache";
  }

  // Emergency fallback (hardcoded) - should rarely happen
  if (!rates) {
    logger.error(
      "All exchange rate sources failed! Using emergency hardcoded fallback.",
    );
    rates = { ...EMERGENCY_FALLBACK_RATES_TO_USD };
    source = "emergency_fallback";
  }

  // Update in-memory cache
  ratesCache = {
    rates,
    timestamp: Date.now(),
    baseCurrency: "USD",
    source,
  };

  // Persist to Supabase if we got fresh rates from an API
  if (source === "frankfurter.app" || source === "exchangerate.host") {
    saveToSupabaseCache(rates, source).catch(() => {
      // Fire and forget, don't block on cache persistence
    });
  }

  return { rates, source };
}

/**
 * Initialize exchange rates (call once on module load)
 * This fetches live rates and stores them for synchronous access
 */
export async function initializeExchangeRates(): Promise<void> {
  const { rates, source } = await fetchLiveRates();
  currentRates = rates;
  ratesSource = source;

  // Log initialization with sample rates for common currencies
  const commonCurrencies = ["EUR", "GBP", "BRL", "JPY", "CAD", "AUD"];
  const sampleRates = commonCurrencies
    .filter((c) => rates[c])
    .map((c) => `${c}=${rates[c].toFixed(4)}`)
    .join(", ");

  logger.log(
    `[CURRENCY DEBUG] Exchange rates initialized from ${source}: ${Object.keys(rates).length} currencies`,
  );
  logger.log(
    `[CURRENCY DEBUG] Sample rates (1 currency → USD): ${sampleRates}`,
  );
}

/**
 * Refresh exchange rates (call periodically or on demand)
 */
export async function refreshExchangeRates(): Promise<Record<string, number>> {
  // Clear cache to force refresh
  ratesCache = null;
  const { rates, source } = await fetchLiveRates();
  currentRates = rates;
  ratesSource = source;
  return currentRates;
}

/**
 * Get current exchange rates (synchronous, uses cached rates)
 */
export function getExchangeRates(): Record<string, number> {
  return currentRates;
}

/**
 * Get the current rates source for debugging
 */
export function getRatesSource(): string {
  return ratesSource;
}

/**
 * Convert an amount from one currency to USD
 * @param amount The amount in the source currency
 * @param fromCurrency The source currency code (e.g., 'BRL', 'EUR')
 * @returns The amount converted to USD
 */
export function convertToUSD(amount: number, fromCurrency: string): number {
  if (!amount || amount === 0) return 0;
  if (!fromCurrency || fromCurrency.toUpperCase() === "USD") return amount;

  const currencyUpper = fromCurrency.toUpperCase();
  const rate = currentRates[currencyUpper];
  if (rate === undefined) {
    // Unknown currency - log warning and return original (assume USD)
    logger.warn(
      `[CURRENCY DEBUG] Unknown currency code: ${fromCurrency}, assuming USD (available: ${Object.keys(currentRates).slice(0, 10).join(", ")}...)`,
    );
    return amount;
  }

  const convertedAmount = amount * rate;

  // Log conversion details for debugging (only for significant amounts)
  if (amount >= 0.01) {
    logger.debug(
      `[CURRENCY DEBUG] Converting: ${amount.toFixed(4)} ${currencyUpper} → ${convertedAmount.toFixed(4)} USD (rate: ${rate.toFixed(6)}, source: ${ratesSource})`,
    );
  }

  return convertedAmount;
}

/**
 * Get the exchange rate from a currency to USD
 * @param currency The currency code
 * @returns The exchange rate (how many USD per 1 unit of the currency)
 */
export function getExchangeRateToUSD(currency: string): number {
  if (!currency) return 1;
  const currencyUpper = currency.toUpperCase();
  const rate = currentRates[currencyUpper];

  if (rate === undefined) {
    logger.warn(
      `[CURRENCY DEBUG] No rate found for ${currencyUpper}, defaulting to 1.0 (assuming USD)`,
    );
    return 1;
  }

  return rate;
}

/**
 * Get debug information about current exchange rates
 * Useful for troubleshooting currency conversion issues
 */
export function getExchangeRateDebugInfo(): {
  source: string;
  cacheAge: number | null;
  ratesCount: number;
  sampleRates: Record<string, number>;
} {
  const cacheAge = ratesCache
    ? Math.round((Date.now() - ratesCache.timestamp) / 1000 / 60) // minutes
    : null;

  // Get a sample of common currencies for debugging
  const commonCurrencies = ["USD", "EUR", "GBP", "BRL", "JPY", "CAD", "AUD"];
  const sampleRates: Record<string, number> = {};
  for (const currency of commonCurrencies) {
    if (currentRates[currency]) {
      sampleRates[currency] = currentRates[currency];
    }
  }

  return {
    source: ratesSource,
    cacheAge,
    ratesCount: Object.keys(currentRates).length,
    sampleRates,
  };
}

/**
 * Check if a currency is supported
 * @param currency The currency code
 * @returns True if the currency has an exchange rate
 */
export function isCurrencySupported(currency: string): boolean {
  if (!currency) return false;
  return currency.toUpperCase() in currentRates;
}

/**
 * Get list of all supported currencies
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(currentRates);
}
