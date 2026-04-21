import axios from 'axios'
import { addHandler } from 'backend/ipc'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import type {
  CatalogLocaleSettings,
  CatalogProduct
} from 'common/types/discounts'

interface CatalogResponse {
  pages: number
  productCount: number
  products: CatalogProduct[]
}

const CATALOG_URL = 'https://catalog.gog.com/v1/catalog'
const PAGE_LIMIT = 48
const MAX_PAGES = 30

const FALLBACK_LOCALE: CatalogLocaleSettings = {
  countryCode: 'US',
  locale: 'en-US',
  currencyCode: 'USD'
}

const isFallbackLocale = (locale: CatalogLocaleSettings) =>
  locale.countryCode === FALLBACK_LOCALE.countryCode &&
  locale.currencyCode === FALLBACK_LOCALE.currencyCode &&
  locale.locale === FALLBACK_LOCALE.locale

const buildUrl = (page: number, locale: CatalogLocaleSettings) => {
  const params = new URLSearchParams({
    limit: String(PAGE_LIMIT),
    order: 'desc:trending',
    discounted: 'eq:true',
    productType: 'in:game,pack,dlc',
    page: String(page),
    countryCode: locale.countryCode,
    locale: locale.locale,
    currencyCode: locale.currencyCode
  })
  return `${CATALOG_URL}?${params.toString()}`
}

const fetchPage = async (page: number, locale: CatalogLocaleSettings) => {
  const { data } = await axios.get<CatalogResponse>(buildUrl(page, locale), {
    timeout: 15000
  })
  return data
}

const fetchAllDiscounts = async (locale: CatalogLocaleSettings) => {
  const first = await fetchPage(1, locale)
  const totalPages = Math.min(first.pages, MAX_PAGES)
  if (totalPages <= 1) return first.products

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetchPage(i + 2, locale)
        .then((d) => d.products)
        .catch((err: unknown) => {
          logError(
            `Failed to fetch discounts page ${i + 2}: ${String(err)}`,
            LogPrefix.Backend
          )
          return [] as CatalogProduct[]
        })
    )
  )

  const all = [...first.products, ...rest.flat()]
  // GOG's catalog is ordered by dynamic trending, so the same product can
  // appear on multiple pages if ranking shifts mid-fetch. Dedupe by id to
  // avoid duplicate React keys in the grid.
  const seen = new Set<string>()
  return all.filter((p) => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })
}

addHandler('getGogDiscounts', async (_event, locale) => {
  try {
    const products = await fetchAllDiscounts(locale)
    if (products.length > 0 || isFallbackLocale(locale)) {
      return products
    }

    logInfo(
      `No discounts for ${locale.countryCode}/${locale.currencyCode}, retrying with US/USD`,
      LogPrefix.Backend
    )
    return await fetchAllDiscounts(FALLBACK_LOCALE)
  } catch (err) {
    logError(`Failed to fetch GOG discounts: ${String(err)}`, LogPrefix.Backend)
    throw err
  }
})
