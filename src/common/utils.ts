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
