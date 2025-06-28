import { SteamDeckComp } from 'common/types'
import { AxiosError } from 'axios'
import { axiosClient } from 'backend/utils'
import { logDebug, logError, LogPrefix } from 'backend/logger'

export async function getSteamDeckComp(
  steamID: string | undefined
): Promise<SteamDeckComp | null> {
  if (!steamID) {
    logDebug('No SteamID, not getting Stem Deck info')
    return null
  }
  const url = `https://store.steampowered.com/saleaction/ajaxgetdeckappcompatibilityreport?nAppID=${steamID}`

  const response = await axiosClient
    .get(url, { headers: {} })
    .catch((error: AxiosError) => {
      logError(
        [
          `Was not able to get Stem Deck data for ${steamID}`,
          error.response?.data
        ],
        LogPrefix.ExtraGameInfo
      )
      return null
    })

  if (!response) {
    logDebug('No response when getting Stem Deck info')
    return null
  }
  const resp_str = JSON.stringify(response.data)
  logDebug(`SteamDeck data for ${steamID} ${resp_str}`)

  if (!Number.isFinite(response.data?.results?.resolved_category)) {
    logError('No resolved_category in response, API changed?')
    return null
  }
  return { category: response.data.results.resolved_category }
}
