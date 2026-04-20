import type { CatalogLocaleSettings } from 'common/types/discounts'

const GOG_AFFILIATE_ID = '1838482841'

// Only country and currency vary by language. GOG's catalog API rejects
// most locale values, so we always send en-US — the locale doesn't affect
// the discount listings, only the storeLink language path.
const COUNTRY_CURRENCY_MAP: Record<
  string,
  { countryCode: string; currencyCode: string }
> = {
  en: { countryCode: 'US', currencyCode: 'USD' },
  pt_BR: { countryCode: 'BR', currencyCode: 'BRL' },
  pt: { countryCode: 'PT', currencyCode: 'EUR' },
  de: { countryCode: 'DE', currencyCode: 'EUR' },
  es: { countryCode: 'ES', currencyCode: 'EUR' },
  fr: { countryCode: 'FR', currencyCode: 'EUR' },
  it: { countryCode: 'IT', currencyCode: 'EUR' },
  nl: { countryCode: 'NL', currencyCode: 'EUR' },
  pl: { countryCode: 'PL', currencyCode: 'PLN' },
  ru: { countryCode: 'RU', currencyCode: 'RUB' },
  uk: { countryCode: 'UA', currencyCode: 'UAH' },
  ja: { countryCode: 'JP', currencyCode: 'JPY' },
  ko: { countryCode: 'KR', currencyCode: 'KRW' },
  zh_Hans: { countryCode: 'CN', currencyCode: 'CNY' },
  zh_Hant: { countryCode: 'TW', currencyCode: 'TWD' },
  tr: { countryCode: 'TR', currencyCode: 'TRY' },
  cs: { countryCode: 'CZ', currencyCode: 'CZK' },
  hu: { countryCode: 'HU', currencyCode: 'HUF' },
  sv: { countryCode: 'SE', currencyCode: 'SEK' },
  da: { countryCode: 'DK', currencyCode: 'DKK' },
  nb_NO: { countryCode: 'NO', currencyCode: 'NOK' },
  fi: { countryCode: 'FI', currencyCode: 'EUR' },
  el: { countryCode: 'GR', currencyCode: 'EUR' },
  ro: { countryCode: 'RO', currencyCode: 'RON' },
  ar: { countryCode: 'SA', currencyCode: 'USD' },
  he: { countryCode: 'IL', currencyCode: 'ILS' }
}

const DEFAULT_COUNTRY_CURRENCY = { countryCode: 'US', currencyCode: 'USD' }

export const getLocaleSettings = (language: string): CatalogLocaleSettings => {
  const baseLang = language.split(/[-_]/)[0]
  const { countryCode, currencyCode } =
    COUNTRY_CURRENCY_MAP[language] ??
    COUNTRY_CURRENCY_MAP[baseLang] ??
    DEFAULT_COUNTRY_CURRENCY

  return { countryCode, currencyCode, locale: 'en-US' }
}

export const withAffiliate = (storeLink: string): string => {
  try {
    const url = new URL(storeLink)
    if (!url.searchParams.has('as')) {
      url.searchParams.set('as', GOG_AFFILIATE_ID)
    }
    return url.toString()
  } catch {
    return storeLink
  }
}

export const parseDiscountPercent = (discount: string): number => {
  const match = /(\d+)/.exec(discount)
  return match ? parseInt(match[1], 10) : 0
}

export const parsePriceAmount = (amount?: string): number => {
  if (!amount) return 0
  const parsed = parseFloat(amount)
  return Number.isFinite(parsed) ? parsed : 0
}

export type DiscountSort = 'trending' | 'discount' | 'price-asc' | 'price-desc'

export const PAGE_SIZE = 25
export const MAX_GENRE_SELECTIONS = 3
export const RATING_SCALE_MAX = 10
export const OS_OPTIONS = ['windows', 'linux', 'osx'] as const
export type OsOption = (typeof OS_OPTIONS)[number]

// GOG's reviewsRating is on a 0-50 scale; we display it as 0-10.
export const normalizeRating = (rating?: number): number => {
  if (!rating || rating <= 0) return 0
  return rating / 5
}
