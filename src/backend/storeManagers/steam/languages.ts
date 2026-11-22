import type { SteamInstallLanguages } from 'common/types/steam'
import type { AureliaDryRunResponse } from './aurelia_types'

// Heroic locales versus Steam language names

// Region or script decides these
const STEAM_LANG_EXACT: Record<string, string> = {
  'pt-br': 'brazilian',
  'zh-cn': 'schinese',
  'zh-hans': 'schinese',
  'zh-sg': 'schinese',
  'zh-tw': 'tchinese',
  'zh-hk': 'tchinese',
  'zh-hant': 'tchinese',
  'es-419': 'latam',
  'es-mx': 'latam'
}

const STEAM_LANG_BY_PRIMARY: Record<string, string> = {
  ar: 'arabic',
  bg: 'bulgarian',
  cs: 'czech',
  da: 'danish',
  nl: 'dutch',
  en: 'english',
  fi: 'finnish',
  fr: 'french',
  de: 'german',
  el: 'greek',
  hu: 'hungarian',
  id: 'indonesian',
  it: 'italian',
  ja: 'japanese',
  ko: 'koreana',
  no: 'norwegian',
  nb: 'norwegian',
  pl: 'polish',
  pt: 'portuguese',
  ro: 'romanian',
  ru: 'russian',
  es: 'spanish',
  sv: 'swedish',
  th: 'thai',
  tr: 'turkish',
  uk: 'ukrainian',
  vi: 'vietnamese',
  zh: 'schinese'
}

// Locale code to Steam name
export function toSteamApiLanguage(lang: string): string {
  const lc = lang.toLowerCase().replace('_', '-')
  if (STEAM_LANG_EXACT[lc]) return STEAM_LANG_EXACT[lc]
  return STEAM_LANG_BY_PRIMARY[lc.split('-')[0]] ?? 'english'
}

// Steam name to display locale
const STEAM_LANG_LOCALES: Record<string, string> = {
  arabic: 'ar',
  bulgarian: 'bg',
  schinese: 'zh-Hans',
  tchinese: 'zh-Hant',
  czech: 'cs',
  danish: 'da',
  dutch: 'nl',
  english: 'en',
  finnish: 'fi',
  french: 'fr',
  german: 'de',
  greek: 'el',
  hungarian: 'hu',
  indonesian: 'id',
  italian: 'it',
  japanese: 'ja',
  koreana: 'ko',
  norwegian: 'no',
  polish: 'pl',
  portuguese: 'pt',
  brazilian: 'pt-BR',
  romanian: 'ro',
  russian: 'ru',
  spanish: 'es',
  latam: 'es-419',
  swedish: 'sv',
  thai: 'th',
  turkish: 'tr',
  ukrainian: 'uk',
  vietnamese: 'vi'
}

// Unknown names map to themselves
function steamLanguageLocales(languages: string[]): Record<string, string> {
  return Object.fromEntries(
    languages.map((name) => [name, STEAM_LANG_LOCALES[name] ?? name])
  )
}

// Rejects locale codes like en-US
function isSteamLanguageName(value: string | undefined): boolean {
  // Steam names: four+ lowercase letters
  return !!value && /^[a-z]{4,}$/.test(value)
}

// Dry-run language fields for the manifest
export function dryRunLanguages(
  dryRun: Pick<
    AureliaDryRunResponse,
    'languages' | 'default_language' | 'installed_language'
  >
): SteamInstallLanguages | undefined {
  const languages = [...new Set(dryRun.languages ?? [])]
    .filter((name) => typeof name === 'string' && name)
    .sort()
  if (!languages.length) return undefined
  const known = (name?: string | null) =>
    name && languages.includes(name) ? name : undefined
  return {
    languages,
    default_language: known(dryRun.default_language),
    installed_language: known(dryRun.installed_language),
    language_locales: steamLanguageLocales(languages)
  }
}

// Install flag for a picked language
export function installLanguageArgs(installLanguage?: string): string[] {
  return isSteamLanguageName(installLanguage)
    ? ['--language', installLanguage!]
    : []
}
