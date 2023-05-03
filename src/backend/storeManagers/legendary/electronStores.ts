import CacheStore from '../../cache'
import { ExtraInfo, GameInfo } from 'common/types'
import { LegendaryInstallInfo } from 'common/types/legendary'

const installStore = new CacheStore<LegendaryInstallInfo>(
  'legendary_install_info'
)
const libraryStore = new CacheStore<GameInfo[], 'library'>(
  'legendary_library',
  null
)

const gameInfoStore = new CacheStore<ExtraInfo>('legendary_gameinfo')

export { gameInfoStore, installStore, libraryStore }
