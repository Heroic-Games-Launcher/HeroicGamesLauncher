import type {
  CatalogLocaleSettings,
  CatalogRating
} from 'common/types/discounts'

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

export interface RegionOption {
  countryCode: string
  currencyCode: string
  label: string
}

// Deduplicated (countryCode+currencyCode) list for the Store override picker.
export const REGION_OPTIONS: RegionOption[] = [
  { countryCode: 'US', currencyCode: 'USD', label: 'United States' },
  { countryCode: 'BR', currencyCode: 'BRL', label: 'Brazil' },
  { countryCode: 'CZ', currencyCode: 'CZK', label: 'Czechia' },
  { countryCode: 'DK', currencyCode: 'DKK', label: 'Denmark' },
  { countryCode: 'FI', currencyCode: 'EUR', label: 'Finland' },
  { countryCode: 'FR', currencyCode: 'EUR', label: 'France' },
  { countryCode: 'DE', currencyCode: 'EUR', label: 'Germany' },
  { countryCode: 'GR', currencyCode: 'EUR', label: 'Greece' },
  { countryCode: 'HU', currencyCode: 'HUF', label: 'Hungary' },
  { countryCode: 'IL', currencyCode: 'ILS', label: 'Israel' },
  { countryCode: 'IT', currencyCode: 'EUR', label: 'Italy' },
  { countryCode: 'JP', currencyCode: 'JPY', label: 'Japan' },
  { countryCode: 'NL', currencyCode: 'EUR', label: 'Netherlands' },
  { countryCode: 'NO', currencyCode: 'NOK', label: 'Norway' },
  { countryCode: 'PL', currencyCode: 'PLN', label: 'Poland' },
  { countryCode: 'PT', currencyCode: 'EUR', label: 'Portugal' },
  { countryCode: 'RO', currencyCode: 'RON', label: 'Romania' },
  { countryCode: 'RU', currencyCode: 'RUB', label: 'Russia' },
  { countryCode: 'CN', currencyCode: 'CNY', label: 'China' },
  { countryCode: 'KR', currencyCode: 'KRW', label: 'South Korea' },
  { countryCode: 'ES', currencyCode: 'EUR', label: 'Spain' },
  { countryCode: 'SE', currencyCode: 'SEK', label: 'Sweden' },
  { countryCode: 'TW', currencyCode: 'TWD', label: 'Taiwan' },
  { countryCode: 'TR', currencyCode: 'TRY', label: 'Turkey' },
  { countryCode: 'UA', currencyCode: 'UAH', label: 'Ukraine' }
]

const LOCALE_OVERRIDE_KEY = 'discounts.regionOverride'

export const getStoredRegionOverride = (): string | null => {
  try {
    const stored = localStorage.getItem(LOCALE_OVERRIDE_KEY)
    if (!stored) return null
    return REGION_OPTIONS.some((r) => r.countryCode === stored) ? stored : null
  } catch {
    return null
  }
}

export const setStoredRegionOverride = (countryCode: string | null) => {
  try {
    if (countryCode) {
      localStorage.setItem(LOCALE_OVERRIDE_KEY, countryCode)
    } else {
      localStorage.removeItem(LOCALE_OVERRIDE_KEY)
    }
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

export const getLocaleSettings = (
  language: string,
  regionOverride?: string | null
): CatalogLocaleSettings => {
  if (regionOverride) {
    const match = REGION_OPTIONS.find((r) => r.countryCode === regionOverride)
    if (match) {
      return {
        countryCode: match.countryCode,
        currencyCode: match.currencyCode,
        locale: 'en-US'
      }
    }
  }

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

export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const
export const DEFAULT_PAGE_SIZE: (typeof PAGE_SIZE_OPTIONS)[number] = 50
export const RATING_SCALE_MAX = 10
export const OS_OPTIONS = ['windows', 'linux', 'osx'] as const
export type OsOption = (typeof OS_OPTIONS)[number]

// GOG's reviewsRating is on a 0-50 scale; we display it as 0-10.
export const normalizeRating = (rating?: number): number => {
  if (!rating || rating <= 0) return 0
  return rating / 5
}

// PEGI is the most granular of the rating systems GOG returns and covers most
// of its catalog. We key the age-rating filter off PEGI for simplicity.
export const PEGI_AGE_OPTIONS = [3, 7, 12, 16, 18] as const
export type PegiAge = (typeof PEGI_AGE_OPTIONS)[number]

export const getPegiAge = (ratings?: CatalogRating[]): number | null => {
  if (!ratings) return null
  const pegi = ratings.find((r) => r.name === 'pegiRating')
  if (!pegi) return null
  const n = parseInt(pegi.ageRating, 10)
  return Number.isFinite(n) ? n : null
}
