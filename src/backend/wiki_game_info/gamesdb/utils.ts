import { GamesDBInfo, Runner } from 'common/types'
import { logInfo, LogPrefix } from 'backend/logger/logger'
import { GamesDBData } from 'common/types/gog'
import { getGamesdbData } from 'backend/storeManagers/gog/library'

export async function getInfoFromGamesDB(
  title: string,
  appName: string,
  runner: Runner
): Promise<GamesDBInfo | null> {
  logInfo(`Getting GamesDB data for ${title}`, LogPrefix.ExtraGameInfo)

  const storeMap: { [key in Runner]: string | undefined } = {
    legendary: 'epic',
    gog: 'gog',
    nile: 'amazon',
    sideload: undefined
  }
  const storeName = storeMap[runner]
  if (!storeName) {
    return { steamID: '' }
  }
  const gamesdb: { data?: GamesDBData } = await getGamesdbData(
    storeName,
    appName,
    true
  ).catch(() => ({ data: undefined }))

  const steamID =
    gamesdb.data?.game.releases.find((entry) => entry.platform_id === 'steam')
      ?.external_id ?? ''

  return {
    steamID
  }
}
