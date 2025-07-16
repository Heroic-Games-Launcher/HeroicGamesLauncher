import { GameConfig } from 'backend/game_config'
import { verifyWinePrefix } from 'backend/launcher'
import {
  getRunnerLogWriter,
  logError,
  logInfo,
  LogPrefix
} from 'backend/logger'
import { checkWineBeforeLaunch } from 'backend/utils'
import { GameInfo } from 'common/types'
import { readFile } from 'fs/promises'

/**
 * Handles setup instructions like create folders, move files, run exe, create registry entry etc...
 * For Galaxy games only (Windows)
 * As long as wine menu builder is disabled we shouldn't have trash application
 * menu entries
 * @param appName
 * @param installInfo Allows passing install instructions directly
 */
export async function setup(gameInfo: GameInfo): Promise<void> {
  const gameSettings = GameConfig.get(gameInfo.app_name).config
  const isWineOkToLaunch = await checkWineBeforeLaunch(
    gameInfo,
    gameSettings,
    getRunnerLogWriter('humble-bundle')
  )

  if (!isWineOkToLaunch) {
    logError(
      `Was not possible to run setup using ${gameSettings.wineVersion.name}`,
      LogPrefix.Backend
    )
    return
  }

  await verifyWinePrefix(gameSettings)

  logInfo('Setup: Finished', LogPrefix.HumbleBundle)
}

function extractStrings(buffer: Buffer<ArrayBufferLike>, minLength = 4) {
  const text = buffer.toString('latin1')
  const regex = new RegExp(`[\\x20-\\x7E]{${minLength},}`, 'g')
  return text.match(regex) || []
}

export async function checkIfInstaller(filePath: string) {
  if (filePath.includes('Setup')) {
    return true
  }

  try {
    const buffer = await readFile(filePath)
    const strings = await extractStrings(buffer)
    const indicators = ['Inno Setup', 'NSIS', 'InstallShield', 'Nullsoft']

    const found = indicators.find((i) => strings.some((s) => s.includes(i)))

    return found ? true : false
  } catch (err) {
    return false
  }
}

export async function handleInstaller(gameInfo: GameInfo): Promise<void> {}
