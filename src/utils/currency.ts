/**
 * Currency Utility Module
 * Handles exchange rate fetching, caching, and currency conversion
 * Ensures data integrity with historical rate tracking
 */

export type CurrencyCode = 'IDR' | 'USD' | 'EUR' | 'SGD'

const API_ENDPOINT = 'https://api.frankfurter.app/latest'
const CACHE_KEY = 'ft_exchange_rates_cache'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const SUPPORTED_CURRENCIES: CurrencyCode[] = ['IDR', 'USD', 'EUR', 'SGD']

// Fallback rates (updated monthly, use as last resort)
const FALLBACK_RATES: Record<CurrencyCode, number> = {
  IDR: 1,
  USD: 16000,
  EUR: 17500,
  SGD: 11800,
}

// ─── Cache Structure ──────────────────────────────────────────────────────────

interface CacheEntry {
  rate: number
  timestamp: number
  expiresAt: number
}

interface RateCache {
  [currency: string]: CacheEntry
}

// ─── Cache Management ─────────────────────────────────────────────────────────

/**
 * Get cache from localStorage
 */
function getCache(): RateCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    console.warn('Failed to parse rate cache, starting fresh')
    return {}
  }
}

/**
 * Save cache to localStorage
 */
function setCache(cache: RateCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    console.warn('Failed to save rate cache to localStorage')
  }
}

/**
 * Get cached rate for a currency
 * Returns null if cache is missing or expired
 */
export function getCachedRate(currency: CurrencyCode): number | null {
  if (currency === 'IDR') return 1

  const cache = getCache()
  const entry = cache[currency]

  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    // Cache expired, clean it up
    delete cache[currency]
    setCache(cache)
    return null
  }

  return entry.rate
}

/**
 * Store rate in cache with timestamp
 */
function cacheRate(currency: CurrencyCode, rate: number): void {
  if (currency === 'IDR') return

  const cache = getCache()
  cache[currency] = {
    rate,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_TTL_MS,
  }
  setCache(cache)
}

/**
 * Get all cached rates with metadata
 * Useful for checking cache status and debugging
 */
export function getAllCachedRates(): Record<CurrencyCode, { rate: number; timestamp: number; expiresIn: string }> {
  const cache = getCache()
  const result: any = {}

  for (const currency of ['USD', 'EUR', 'SGD'] as CurrencyCode[]) {
    const entry = cache[currency]
    if (entry) {
      const msRemaining = Math.max(0, entry.expiresAt - Date.now())
      const hoursRemaining = Math.floor(msRemaining / (60 * 60 * 1000))
      const expiresIn = hoursRemaining > 0 ? `${hoursRemaining}h` : 'expired'
      result[currency] = {
        rate: entry.rate,
        timestamp: entry.timestamp,
        expiresIn,
      }
    }
  }

  return result
}

/**
 * Clear all cached rates
 */
export function clearRateCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    console.warn('Failed to clear rate cache')
  }
}

// ─── API Integration ──────────────────────────────────────────────────────────

/**
 * Fetch exchange rate from Frankfurter API
 * Returns the rate to convert from given currency to IDR
 */
async function fetchRateFromAPI(currency: CurrencyCode): Promise<number | null> {
  if (currency === 'IDR') return 1

  try {
    const response = await fetch(`${API_ENDPOINT}?from=${currency}&to=IDR`)

    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()
    const rate = data.rates?.IDR

    if (typeof rate !== 'number' || rate <= 0) {
      console.error('Invalid rate from API:', rate)
      return null
    }

    // Cache the successful rate
    cacheRate(currency, rate)
    return rate
  } catch (error) {
    console.error(`Failed to fetch rate for ${currency}:`, error)
    return null
  }
}

/**
 * Get exchange rate to IDR with smart caching and fallback
 *
 * Strategy:
 * 1. Check cache first (if valid, return immediately)
 * 2. Try to fetch from API (if successful, cache and return)
 * 3. Fall back to last cached rate (if exists)
 * 4. Fall back to hardcoded rate (final resort)
 *
 * This ensures the app never crashes due to API failures
 */
export async function getExchangeRateToIDR(currency: CurrencyCode): Promise<{
  rate: number
  source: 'cache' | 'api' | 'cached-fallback' | 'hardcoded'
  timestamp: number
}> {
  if (currency === 'IDR') {
    return { rate: 1, source: 'cache', timestamp: Date.now() }
  }

  // 1. Check cache first (fastest path)
  const cachedRate = getCachedRate(currency)
  if (cachedRate !== null && typeof cachedRate === 'number' && cachedRate > 0) {
    return { rate: cachedRate, source: 'cache', timestamp: Date.now() }
  }

  // 2. Try to fetch from API
  const apiRate = await fetchRateFromAPI(currency)
  if (apiRate !== null && typeof apiRate === 'number' && apiRate > 0) {
    return { rate: apiRate, source: 'api', timestamp: Date.now() }
  }

  // 3. Fall back to last cached rate (even if expired)
  const cache = getCache()
  const expiredEntry = cache[currency]
  if (expiredEntry && typeof expiredEntry.rate === 'number' && expiredEntry.rate > 0) {
    console.warn(`Using expired cache for ${currency}: ${expiredEntry.rate}`)
    return { rate: expiredEntry.rate, source: 'cached-fallback', timestamp: expiredEntry.timestamp }
  }

  // 4. Fall back to hardcoded rate
  const fallbackRate = FALLBACK_RATES[currency]
  if (typeof fallbackRate === 'number' && fallbackRate > 0) {
    console.warn(`Using hardcoded fallback for ${currency}: ${fallbackRate}`)
    return { rate: fallbackRate, source: 'hardcoded', timestamp: Date.now() }
  }

  // Emergency fallback: rate of 1 (no conversion) - should never reach this
  console.error(`⚠️ All fallbacks failed for ${currency}, using rate 1`)
  return { rate: 1, source: 'hardcoded', timestamp: Date.now() }
}

// ─── Conversion ────────────────────────────────────────────────────────────────

/**
 * Convert an amount from one currency to IDR
 * Returns both the converted amount and the rate used (for historical tracking)
 */
export async function convertToIDR(
  amount: number,
  currency: CurrencyCode
): Promise<{
  amountIDR: number
  exchangeRateUsed: number
}> {
  // Input validation - ensure amount is a valid number
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    console.warn('⚠️ Invalid amount for conversion:', amount)
    return {
      amountIDR: 0,
      exchangeRateUsed: 1,
    }
  }

  // Validate currency code
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    console.warn('⚠️ Unsupported currency:', currency)
    return {
      amountIDR: amount,
      exchangeRateUsed: 1,
    }
  }

  const { rate } = await getExchangeRateToIDR(currency)
  
  // Ensure rate is valid
  if (typeof rate !== 'number' || isNaN(rate) || rate <= 0) {
    console.error('⚠️ Invalid exchange rate:', rate)
    return {
      amountIDR: 0,
      exchangeRateUsed: 1,
    }
  }

  const amountIDR = Math.round(amount * rate)
  
  // Final validation - ensure result is not NaN
  if (isNaN(amountIDR)) {
    console.error('⚠️ Conversion resulted in NaN:', { amount, rate })
    return {
      amountIDR: 0,
      exchangeRateUsed: rate,
    }
  }

  return {
    amountIDR,
    exchangeRateUsed: rate,
  }
}

/**
 * Format amount for display in original currency
 */
export function formatCurrencyDisplay(
  amount: number | undefined | null,
  currency: CurrencyCode
): string {
  // Validate input
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0'
  }

  try {
    const locale = currency === 'IDR' ? 'id-ID' : 'en-US'
    const decimals = currency === 'IDR' ? 0 : 2

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
  } catch (error) {
    console.error('Error formatting currency:', error)
    return '0'
  }
}

/**
 * Format amount for display in IDR
 */
export function formatIDR(amount: number | undefined | null): string {
  // Validate input
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0'
  }

  try {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch (error) {
    console.error('Error formatting IDR:', error)
    return '0'
  }
}

/**
 * Batch fetch rates for multiple currencies
 * Useful for refreshing all rates at once
 */
export async function batchFetchRates(currencies: CurrencyCode[]): Promise<{
  rates: Record<CurrencyCode, number>
  timestamp: number
  failedCurrencies: CurrencyCode[]
}> {
  const rates: Record<string, number> = { IDR: 1 }
  const failedCurrencies: CurrencyCode[] = []

  await Promise.all(
    currencies
      .filter(c => c !== 'IDR')
      .map(async (currency) => {
        try {
          const result = await getExchangeRateToIDR(currency)
          rates[currency] = result.rate
          if (result.source !== 'api') {
            failedCurrencies.push(currency)
          }
        } catch (error) {
          console.error(`Failed to fetch rate for ${currency}:`, error)
          failedCurrencies.push(currency)
        }
      })
  )

  return {
    rates: rates as Record<CurrencyCode, number>,
    timestamp: Date.now(),
    failedCurrencies,
  }
}

// ─── Logging & Debugging ──────────────────────────────────────────────────────

/**
 * Log current cache status (for debugging)
 */
export function logCacheStatus(): void {
  const cached = getAllCachedRates()
  console.group('💱 Exchange Rate Cache Status')
  console.log('Cached Rates:', cached)
  console.log('Fallback Rates:', FALLBACK_RATES)
  console.log('Cache TTL:', `${CACHE_TTL_MS / (60 * 60 * 1000)}h`)
  console.groupEnd()
}

/**
 * Get rate source description for UI display
 */
export function getRateSourceDescription(source: 'cache' | 'api' | 'cached-fallback' | 'hardcoded'): string {
  const descriptions = {
    cache: '✓ From cache',
    api: '✓ Fresh from API',
    'cached-fallback': '⚠ From expired cache (API failed)',
    hardcoded: '⚠ Using fallback rate',
  }
  return descriptions[source]
}

/**
 * Get the latest timestamp among all cached rates
 * Returns null if no rates are cached
 */
export function getLastCacheUpdateTime(): number | null {
  const cache = getCache()
  let latest = 0
  let found = false

  for (const currency in cache) {
    const entry = cache[currency as CurrencyCode]
    if (entry.timestamp > latest) {
      latest = entry.timestamp
      found = true
    }
  }

  return found ? latest : null
}
