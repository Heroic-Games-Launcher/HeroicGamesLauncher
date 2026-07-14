import axios from 'axios'
import { app } from 'electron'
import { addHandler } from 'backend/ipc'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import type { CatalogProduct } from 'common/types/discounts'

const HUMBLE_FEED_URL_TEMPLATE =
  'https://raw.githubusercontent.com/Heroic-Games-Launcher/deals-listing/humble-feed/humble-discounts-{currency}.json'

// The Humble impact catalog currently only publishes USD. Extend this list (and
// the workflow) if Humble starts exposing more currencies.
const HUMBLE_CURRENCIES = ['USD']
const HUMBLE_FALLBACK_CURRENCY = 'USD'

const PAGE_SIZE = 1000
const MAX_PAGES = 20
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

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

interface ImpactCatalogItemsResponse {
  '@page'?: string
  '@numpages'?: string
  Items?: ImpactCatalogItem[]
}

// Platform comes from the SKU suffix ("<title> - PC", "... - Xbox Series XS",
// "... - MAC"), when present.
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
    store: 'humble'
  }
}

const fetchPage = async (
  url: string,
  page: number
): Promise<ImpactCatalogItemsResponse> => {
  const { data } = await axios.get<ImpactCatalogItemsResponse>(url, {
    timeout: 30000,
    params: { PageSize: PAGE_SIZE, Page: page },
    headers: { 'User-Agent': `HeroicGamesLauncher/${app.getVersion()}` }
  })
  return data
}

const fetchAllItems = async (url: string): Promise<CatalogProduct[]> => {
  const first = await fetchPage(url, 1)
  const numPages = Math.min(
    parseInt(first['@numpages'] ?? '1', 10) || 1,
    MAX_PAGES
  )

  const items = [...(first.Items ?? [])]
  for (let page = 2; page <= numPages; page++) {
    items.push(...((await fetchPage(url, page)).Items ?? []))
  }

  const products: CatalogProduct[] = []
  const seen = new Set<string>()
  for (const item of items) {
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

interface HumbleCache {
  products: CatalogProduct[]
  fetchedAt: number
}
const cache = new Map<string, HumbleCache>()
const inflight = new Map<string, Promise<CatalogProduct[]>>()

const refreshCache = async (currency: string): Promise<CatalogProduct[]> => {
  const url = HUMBLE_FEED_URL_TEMPLATE.replace('{currency}', currency)
  const products = await fetchAllItems(url)
  cache.set(currency, { products, fetchedAt: Date.now() })
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
  const cached = cache.get(currency)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.products
  }

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
    if (cached) return cached.products
    throw err
  }
}

addHandler('getHumbleDiscounts', async (_event, currencyCode) =>
  getHumbleDiscounts(currencyCode)
)
