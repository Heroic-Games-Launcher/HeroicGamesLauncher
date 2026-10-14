import { GamesDBInfo } from 'common/types'
import { logInfo, LogPrefix } from 'backend/logger'
import { GamesDBData } from 'common/types/gog'
import { libraryManagerMap } from '../../storeManagers'
import { storeMap } from 'common/utils'
import type { Game } from 'common/types/game_manager'

export async function getInfoFromGamesDB(
  title: string,
  game: Game
): Promise<GamesDBInfo | null> {
  logInfo(`Getting GamesDB data for ${title}`, LogPrefix.ExtraGameInfo)

  const storeName = storeMap[game.runner]
  if (!storeName) {
    return { steamID: '' }
  }
  const gamesdb: { data?: GamesDBData } = await libraryManagerMap['gog']
    .getGamesdbData(storeName, game.id, true)
    .catch(() => ({ data: undefined }))

  const steamID =
    gamesdb.data?.game.releases.find((entry) => entry.platform_id === 'steam')
      ?.external_id ?? ''

  return {
    steamID
  }
}
