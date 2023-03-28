import { GamesDBInfo, Runner } from 'common/types'
import { logError, logInfo, LogPrefix } from 'backend/logger/logger'
import { GamesDBData } from 'common/types/gog'
import axios from 'axios'

export async function getInfoFromGamesDB(
  title: string,
  appName: string,
  runner: Runner
): Promise<GamesDBInfo | null> {
  logInfo(`Getting GamesDB data for ${title}`, LogPrefix.ExtraGameInfo)

  const gamesdb: { data?: GamesDBData } = await getGamesdbData(runner, appName)

  const steamID =
    gamesdb.data?.game.releases.find((entry) => entry.platform_id === 'steam')
      ?.external_id ?? ''

  return {
    steamID
  }
}

/**
 * This function can be also used with outher stores
 * This endpoint doesn't require user to be authenticated.
 * @param runner Indicates a store we have game_id from, like: epic, itch, humble, gog, uplay
 * @param game_id ID of a game
 * @param etag (optional) value returned in response, works as checksum so we can check if we have up to date data
 * @returns object {isUpdated, data}, where isUpdated is true when Etags match
 */
async function getGamesdbData(
  runner: Runner,
  game_id: string,
  etag?: string
): Promise<{ isUpdated: boolean; data?: GamesDBData | undefined }> {
  const storeMap = { legendary: 'epic', gog: 'gog', sideloaded: undefined }
  const storeName = storeMap[runner]

  if (storeName) {
    const url = `https://gamesdb.gog.com/platforms/${storeName}/external_releases/${game_id}`
    const headers = etag
      ? {
          'If-None-Match': etag
        }
      : undefined

    const response = await axios.get(url, { headers: headers }).catch(() => {
      logError(
        [`Was not able to get GamesDB data for ${game_id}`],
        LogPrefix.ExtraGameInfo
      )
      return null
    })
    if (!response) {
      return { isUpdated: false }
    }

    const resEtag = response.headers?.etag
    const isUpdated = etag === resEtag
    const data = response.data

    data.etag = resEtag

    return {
      isUpdated,
      data
    }
  }

  return { isUpdated: false }
}
