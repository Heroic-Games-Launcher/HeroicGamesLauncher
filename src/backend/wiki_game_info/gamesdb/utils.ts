import { GamesDBInfo, Runner } from 'common/types'
import { logInfo, LogPrefix } from 'backend/logger'
import { GamesDBData } from 'common/types/gog'
import { getGamesdbData } from 'backend/storeManagers/gog/library'
import { runnerMap } from 'backend/runners'

export async function getInfoFromGamesDB(
  title: string,
  appName: string,
  runner: Runner
): Promise<GamesDBInfo | null> {
  logInfo(`Getting GamesDB data for ${title}`, LogPrefix.ExtraGameInfo)

  if (!runnerMap[runner]?.gamesDB.isSupported) {
    return { steamID: '' }
  }

  const gamesdb: { data?: GamesDBData } = await getGamesdbData(
    runnerMap[runner].store,
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
