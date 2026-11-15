import type { GameInfo, GameSettings } from 'common/types'

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
