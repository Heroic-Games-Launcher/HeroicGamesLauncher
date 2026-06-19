import CacheStore from '../../cache'
import { ExtraInfo, GameInfo } from 'common/types'
import { GameOverride, LegendaryInstallInfo } from 'common/types/legendary'

export const installStore = new CacheStore<LegendaryInstallInfo>(
  'legendary_install_info'
)
export const libraryStore = new CacheStore<GameInfo[], 'library'>(
  'legendary_library',
  null
)

/**
 * Store for the games override
 * Lasts for 7 days
 * @type {CacheStore<GameOverride, 'gamesOverride'>}
 * @memberof module:storeManagers/legendary
 * @inner
 * @instance
 **/
export const gamesOverrideStore: CacheStore<GameOverride, 'gamesOverride'> =
  new CacheStore<GameOverride, 'gamesOverride'>(
    'legendary_games_override',
    60 * 24 * 7
  )

export const gameInfoStore = new CacheStore<ExtraInfo>('legendary_gameinfo')
