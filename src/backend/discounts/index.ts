import axios from 'axios'
import { addHandler } from 'backend/ipc'
import { logError, LogPrefix } from 'backend/logger'
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

const buildUrl = (page: number, locale: CatalogLocaleSettings) => {
  const params = new URLSearchParams({
    limit: String(PAGE_LIMIT),
    order: 'desc:trending',
    discounted: 'eq:true',
    productType: 'in:game,pack,dlc,extras',
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

addHandler('getGogDiscounts', async (_event, locale) => {
  try {
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

    return [...first.products, ...rest.flat()]
  } catch (err) {
    logError(
      `Failed to fetch GOG discounts: ${String(err)}`,
      LogPrefix.Backend
    )
    throw err
  }
})
