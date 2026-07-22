import axios from 'axios'
import { app } from 'electron'
import i18next from 'i18next'
import CacheStore from 'backend/cache'
import { addHandler } from 'backend/ipc'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import type { CatalogProduct } from 'common/types/discounts'

const HUMBLE_FEED_URL_TEMPLATE =
  'https://raw.githubusercontent.com/Heroic-Games-Launcher/deals-listing/humble-feed/humble-discounts-{currency}.json'

// The Humble impact catalog currently only publishes USD. Extend this list (and
// the workflow) if Humble starts exposing more currencies.
const HUMBLE_CURRENCIES = ['USD']
const HUMBLE_FALLBACK_CURRENCY = 'USD'

const CACHE_LIFESPAN_MINUTES = 24 * 60

interface ImpactCatalogItem {
  CatalogItemId?: string
  Id?: string
  Name?: string
  Url?: string
  ImageUrl?: string
  CurrentPrice?: string
  OriginalPrice?: string
  Currency?: string
}

interface ImpactCatalogFeed {
  Items?: ImpactCatalogItem[]
}

const SUPPORTED_CURRENCIES = new Set(Intl.supportedValuesOf('currency'))

const formatPrice = (amount: number, currency: string): string => {
  if (!SUPPORTED_CURRENCIES.has(currency)) {
    return `${currency} ${amount.toFixed(2)}`
  }
  return new Intl.NumberFormat(i18next.language?.replace('_', '-') || 'en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

const normalizeItem = (item: ImpactCatalogItem): CatalogProduct | null => {
  const id = item.CatalogItemId ?? item.Id
  if (!id || !item.Name || !item.Url) return null

  const current = parseFloat(item.CurrentPrice ?? '')
  const original = parseFloat(item.OriginalPrice ?? '')
  if (!Number.isFinite(current) || current < 0) return null

  const base = Number.isFinite(original) && original > 0 ? original : current
  if (base <= current) return null

  const discountPercent = Math.round((1 - current / base) * 100)
  const currency = item.Currency ?? 'USD'

  return {
    id: `humble-${id}`,
    title: item.Name,
    coverHorizontal: item.ImageUrl,
    price: {
      final: formatPrice(current, currency),
      base: formatPrice(base, currency),
      discount: `-${discountPercent}%`,
      finalMoney: { amount: current.toFixed(2), currency },
      baseMoney: { amount: base.toFixed(2), currency }
    },
    productType: 'game',
    // Humble's store sells PC games only.
    operatingSystems: ['windows'],
    storeLink: item.Url,
    store: 'humble'
  }
}

const fetchFeed = async (url: string): Promise<CatalogProduct[]> => {
  const { data } = await axios.get<ImpactCatalogFeed>(url, {
    timeout: 30000,
    headers: { 'User-Agent': `HeroicGamesLauncher/${app.getVersion()}` }
  })

  const products: CatalogProduct[] = []
  const seen = new Set<string>()
  for (const item of data.Items ?? []) {
    const product = normalizeItem(item)
    if (!product || seen.has(product.id)) continue
    seen.add(product.id)
    products.push(product)
  }
  return products
}

const resolveCurrency = (currencyCode?: string): string => {
  const requested = (currencyCode ?? '').toUpperCase()
  return HUMBLE_CURRENCIES.includes(requested)
    ? requested
    : HUMBLE_FALLBACK_CURRENCY
}

const dealsCache = new CacheStore<CatalogProduct[]>(
  'humble_deals',
  CACHE_LIFESPAN_MINUTES
)
const inflight = new Map<string, Promise<CatalogProduct[]>>()

const refreshCache = async (currency: string): Promise<CatalogProduct[]> => {
  const url = HUMBLE_FEED_URL_TEMPLATE.replace('{currency}', currency)
  const products = await fetchFeed(url)
  dealsCache.set(currency, products)
  logInfo(
    `Fetched ${products.length} Humble discounts (${currency})`,
    LogPrefix.Backend
  )
  return products
}

const getHumbleDiscounts = async (
  currencyCode?: string
): Promise<CatalogProduct[]> => {
  const currency = resolveCurrency(currencyCode)
  const cached = dealsCache.get(currency)
  if (cached) return cached

  let pending = inflight.get(currency)
  if (!pending) {
    pending = refreshCache(currency).finally(() => {
      inflight.delete(currency)
    })
    inflight.set(currency, pending)
  }

  try {
    return await pending
  } catch (err) {
    logError(
      `Failed to fetch Humble discounts (${currency}): ${String(err)}`,
      LogPrefix.Backend
    )
    throw err
  }
}

addHandler('getHumbleDiscounts', async (_event, currencyCode) =>
  getHumbleDiscounts(currencyCode)
)
