import { ProtonDBCompatibilityInfo } from 'common/types'
import { AxiosError } from 'axios'
import { axiosClient } from 'backend/utils'
import { logDebug, logError, LogPrefix } from 'backend/logger'

export async function getInfoFromProtonDB(
  steamID: string | undefined
): Promise<ProtonDBCompatibilityInfo | null> {
  if (!steamID) {
    logDebug('No SteamID, not getting ProtonDB info')
    return null
  }

  const url = `https://www.protondb.com/api/v1/reports/summaries/${steamID}.json`

  const response = await axiosClient
    .get(url, { headers: {} })
    .catch((error: AxiosError) => {
      logError(
        [
          `Was not able to get ProtonDB data for ${steamID}`,
          error.response?.data
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
