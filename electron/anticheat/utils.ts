import { heroicAnticheatDataPath, isLinux } from '../constants'
import * as axios from 'axios'
import { logInfo, LogPrefix, logWarning } from '../logger/logger'
import { readFileSync, writeFileSync } from 'graceful-fs'
import { AntiCheatInfo } from '../types'
import { epicTitleToAnticheat } from './titles_map'

async function downloadAntiCheatData() {
  if (!isLinux) return

  try {
    const { data } = await axios.default.get(
      'https://raw.githubusercontent.com/Starz0r/AreWeAntiCheatYet/master/games.json'
    )
    writeFileSync(heroicAnticheatDataPath, JSON.stringify(data, null, 2))
    logInfo(`AreWeAntiCheatYet data downloaded`, LogPrefix.Backend)
  } catch (error) {
    logWarning(
      `Failed download of AreWeAntiCheatYet data: ${error}`,
      LogPrefix.Backend
    )
  }
}

function gameAnticheatInfo(appTitle: string): AntiCheatInfo | null {
  if (!isLinux) return null

  const data = readFileSync(heroicAnticheatDataPath)
  const jsonData = JSON.parse(data.toString())
  const anticheatTitle = epicTitleToAnticheat(appTitle)
  const anticheatInfo = jsonData.find((info: AntiCheatInfo) =>
    info.name.toLowerCase().includes(anticheatTitle)
  )
  return anticheatInfo
}

export { downloadAntiCheatData, gameAnticheatInfo }
