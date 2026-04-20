import type { CatalogLocaleSettings } from 'common/types/discounts'

const GOG_AFFILIATE_ID = '1838482841'

const LANGUAGE_LOCALE_MAP: Record<string, CatalogLocaleSettings> = {
  en: { countryCode: 'US', locale: 'en-US', currencyCode: 'USD' },
  pt: { countryCode: 'BR', locale: 'pt-BR', currencyCode: 'BRL' },
  pt_BR: { countryCode: 'BR', locale: 'pt-BR', currencyCode: 'BRL' },
  de: { countryCode: 'DE', locale: 'de-DE', currencyCode: 'EUR' },
  es: { countryCode: 'ES', locale: 'es-ES', currencyCode: 'EUR' },
  fr: { countryCode: 'FR', locale: 'fr-FR', currencyCode: 'EUR' },
  it: { countryCode: 'IT', locale: 'it-IT', currencyCode: 'EUR' },
  nl: { countryCode: 'NL', locale: 'nl-NL', currencyCode: 'EUR' },
  pl: { countryCode: 'PL', locale: 'pl-PL', currencyCode: 'PLN' },
  ru: { countryCode: 'RU', locale: 'ru-RU', currencyCode: 'RUB' },
  uk: { countryCode: 'UA', locale: 'uk-UA', currencyCode: 'UAH' },
  ja: { countryCode: 'JP', locale: 'ja-JP', currencyCode: 'JPY' },
  ko: { countryCode: 'KR', locale: 'ko-KR', currencyCode: 'KRW' },
  zh_Hans: { countryCode: 'CN', locale: 'zh-Hans', currencyCode: 'CNY' },
  zh_Hant: { countryCode: 'TW', locale: 'zh-Hant', currencyCode: 'TWD' },
  tr: { countryCode: 'TR', locale: 'tr-TR', currencyCode: 'TRY' },
  cs: { countryCode: 'CZ', locale: 'cs-CZ', currencyCode: 'CZK' },
  hu: { countryCode: 'HU', locale: 'hu-HU', currencyCode: 'HUF' },
  sv: { countryCode: 'SE', locale: 'sv-SE', currencyCode: 'SEK' },
  da: { countryCode: 'DK', locale: 'da-DK', currencyCode: 'DKK' },
  nb_NO: { countryCode: 'NO', locale: 'nb-NO', currencyCode: 'NOK' },
  fi: { countryCode: 'FI', locale: 'fi-FI', currencyCode: 'EUR' },
  el: { countryCode: 'GR', locale: 'el-GR', currencyCode: 'EUR' },
  ro: { countryCode: 'RO', locale: 'ro-RO', currencyCode: 'RON' },
  ar: { countryCode: 'SA', locale: 'ar-SA', currencyCode: 'USD' },
  he: { countryCode: 'IL', locale: 'he-IL', currencyCode: 'ILS' }
}

const DEFAULT_LOCALE: CatalogLocaleSettings = {
  countryCode: 'US',
  locale: 'en-US',
  currencyCode: 'USD'
}

export const getLocaleSettings = (
  language: string
): CatalogLocaleSettings => {
  if (LANGUAGE_LOCALE_MAP[language]) return LANGUAGE_LOCALE_MAP[language]
  const baseLang = language.split(/[-_]/)[0]
  return LANGUAGE_LOCALE_MAP[baseLang] ?? DEFAULT_LOCALE
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
