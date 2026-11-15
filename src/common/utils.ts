import type { GameInfo, GameSettings, Runner } from './types'

export const storeMap = {
  legendary: 'epic',
  gog: 'gog',
  nile: 'amazon',
  sideload: undefined,
  zoom: 'zoom',
  itchio: 'itchio',
  steam: 'steam'
} as const satisfies Record<Runner, string | undefined>

// Sentinel `Reqs.title` values for rows that aren't a Minimum/Recommended spec
export const REQS_OTHER_TITLE = '__other__'
export const REQS_NOTES_TITLE = '__notes__'

export const getSavePathFingerprint = (
  gameInfo: Pick<GameInfo, 'install'>,
  settings: Pick<GameSettings, 'winePrefix' | 'wineVersion'>
): string =>
  [
    gameInfo.install?.install_path ?? '',
    gameInfo.install?.platform ?? '',
    settings.winePrefix ?? '',
    settings.wineVersion?.type ?? '',
    settings.wineVersion?.name ?? ''
  ].join('|')

export const parseBackupDate = (value: string): Date | undefined => {
  const iso = new Date(value)
  if (!Number.isNaN(iso.getTime())) {
    return iso
  }

  // Backups created before createdAt was stored as ISO keep the sanitized name.
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/.exec(value)
  if (!match) {
    return undefined
  }

  const [, year, month, day, hour, minute, second, ms] = match
  return new Date(
    Date.UTC(+year, +month - 1, +day, +hour, +minute, +second, +ms)
  )
}

export const toIntlLocale = (language: string): string => {
  const candidate = language.replace(/_/g, '-')
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([candidate]).length
      ? candidate
      : 'en'
  } catch {
    return 'en'
  }
}
