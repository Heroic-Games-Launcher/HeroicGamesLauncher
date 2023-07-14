import { ProtonDBCompatibilityInfo } from 'common/types'
import axios, { AxiosError } from 'axios'
import { logDebug, logError, LogPrefix } from 'backend/logger/logger'

export async function getInfoFromProtonDB(
  steamID: string | undefined
): Promise<ProtonDBCompatibilityInfo | null> {
  if (!steamID) {
    logDebug('No SteamID, not getting ProtonDB info')
    return null
  }

  const url = `https://www.protondb.com/api/v1/reports/summaries/${steamID}.json`

  const response = await axios
    .get(url, { headers: {} })
    .catch((error: AxiosError) => {
      logError(
        [
          `Was not able to get ProtonDB data for ${steamID}`,
          error.response?.data.error_description
        ],
        LogPrefix.ExtraGameInfo
      )
      return null
    })

  if (!response) {
    logDebug('No response when getting ProtonDB info')
    return null
  }
  const resp_str = JSON.stringify(response.data)
  logDebug(`ProtonDB data for ${steamID} ${resp_str}`)

  if (!response.data?.tier) {
    logError('No tier in response, API changed?')
    return null
  }
  return { level: response.data.tier }
}
