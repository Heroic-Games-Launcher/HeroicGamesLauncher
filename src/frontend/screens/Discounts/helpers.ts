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
  pt: { countryCode: 'BR', currencyCode: 'BRL' },
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
