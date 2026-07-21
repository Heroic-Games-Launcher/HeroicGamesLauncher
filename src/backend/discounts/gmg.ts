import axios from 'axios'
import { app } from 'electron'
import CacheStore from 'backend/cache'
import { addHandler } from 'backend/ipc'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import type { CatalogProduct } from 'common/types/discounts'

const GMG_FEED_URL_TEMPLATE =
  'https://raw.githubusercontent.com/Heroic-Games-Launcher/deals-listing/gmg-feed/gmg-discounts-{currency}.json'

// Keep in sync with GMG_CURRENCIES in frontend/screens/Discounts/helpers.ts
// and the feeds published by the deals-listing repo.
const GMG_CURRENCIES = [
  'GBP',
  'USD',
  'EUR',
  'CAD',
  'AUD',
  'BRL',
  'CNY',
  'TRL',
  'KRW'
]
const GMG_FALLBACK_CURRENCY = 'USD'

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
  Text1?: string
}

interface ImpactCatalogFeed {
  Items?: ImpactCatalogItem[]
}

// Platform comes from GMG's SKU suffix ("<title> - PC", "... - Xbox
// Series XS", "... - MAC").
const platformFromSku = (sku: string): string[] | undefined => {
  const match = / - ([A-Za-z0-9 +()]+)$/.exec(sku)
  if (!match) return undefined
  const suffix = match[1].toLowerCase()
  if (suffix.startsWith('xbox')) return ['xbox']
  if (suffix === 'mac') return ['osx']
  if (suffix === 'pc' || suffix.startsWith('windows')) return ['windows']
  return undefined
}

const formatPrice = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
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
    id: `gmg-${id}`,
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
    operatingSystems: platformFromSku(item.CatalogItemId ?? ''),
    // Text1 holds the key's redemption DRM ('steam', 'uplay', ...)
    features: item.Text1
      ? [
          {
            name: item.Text1.charAt(0).toUpperCase() + item.Text1.slice(1),
            slug: item.Text1.toLowerCase()
          }
        ]
      : undefined,
    storeLink: item.Url,
    store: 'gmg'
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
  return GMG_CURRENCIES.includes(requested) ? requested : GMG_FALLBACK_CURRENCY
}

const dealsCache = new CacheStore<CatalogProduct[]>(
  'gmg_deals',
  CACHE_LIFESPAN_MINUTES
)
const inflight = new Map<string, Promise<CatalogProduct[]>>()

const refreshCache = async (currency: string): Promise<CatalogProduct[]> => {
  const url = GMG_FEED_URL_TEMPLATE.replace('{currency}', currency)
  const products = await fetchFeed(url)
  dealsCache.set(currency, products)
  logInfo(
    `Fetched ${products.length} GMG discounts (${currency})`,
    LogPrefix.Backend
  )
  return products
}

const getGmgDiscounts = async (
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
      `Failed to fetch GMG discounts (${currency}): ${String(err)}`,
      LogPrefix.Backend
    )
    throw err
  }
}

addHandler('getGmgDiscounts', async (_event, currencyCode) =>
  getGmgDiscounts(currencyCode)
)
