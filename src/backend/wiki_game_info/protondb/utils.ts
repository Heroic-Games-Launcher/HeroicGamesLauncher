import { ProtonDBInfo, ProtonCompatibility } from 'common/types'
import axios, { AxiosError } from 'axios'
import { logInfo, logError, LogPrefix } from 'backend/logger/logger'

export async function getInfoFromProtonDB(
  steamID: string
): Promise<ProtonCompatibility | null> {
  if (steamID === '') {
    return null
  }
  const url = `https://www.protondb.com/api/v1/reports/summaries/${steamID}.json`

  const response = await axios
    .get<ProtonDBInfo>(url, { headers: {} })
    .catch((error: AxiosError) => {
      logError(
        [
          `Was not able to get ProtonDB data for ${steamID}`,
          error.response?.data.error_description
        ],
        LogPrefix.ExtraGameInfo
      )
      if (error.response?.status === 404) {
        return null
      }
      throw new Error('connection error', { cause: error })
    })

  if (!response) {
    return null
  }
  logInfo(`ProtonDB data for ${steamID} ${response.data}`)

  return { level: response.data.tier }
}
