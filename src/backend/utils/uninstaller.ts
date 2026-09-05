import { GlobalConfig } from 'backend/config'
import {
  defaultWinePrefix,
  fixesPath,
  gamesConfigPath
} from 'backend/constants/paths'
import { notify } from 'backend/dialog/dialog'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { sendGameStatusUpdate } from 'backend/utils'
import { storeMap } from 'common/utils'
import { Event } from 'electron'
import { existsSync, readdirSync, rmSync } from 'graceful-fs'
import i18next from 'i18next'
import { join } from 'path'
import type { Game } from 'common/types/game_manager'

export const removePrefix = async (game: Game) => {
  const { winePrefix } = await game.getSettings()
  logInfo(`Removing prefix ${winePrefix}`, LogPrefix.Backend)

  if (!existsSync(winePrefix)) {
    logInfo(`Prefix folder ${winePrefix} doesn't exist, ignoring removal`)
    return
  }

  // folder exists, do some sanity checks before deleting it
  const { defaultInstallPath, sharedWinePrefix } =
    GlobalConfig.get().getSettings()

  if (winePrefix === defaultInstallPath) {
    logInfo(
      `Can't delete folder ${winePrefix}, prefix folder is the default install directory ${defaultInstallPath}`
    )
    return
  }

  if (winePrefix === sharedWinePrefix) {
    logInfo(
      `Can't delete folder ${winePrefix}, prefix folder is the shared prefix directory ${sharedWinePrefix}`
    )
    return
  }

  // keep this check for backwards compatibility
  if (winePrefix === defaultWinePrefix) {
    logInfo(
      `Can't delete folder ${winePrefix}, prefix folder is the default prefix directory ${defaultWinePrefix}`
    )
    return
  }

  const dirContent = readdirSync(winePrefix)

  if (dirContent.length > 0) {
    const driveCPath = join(winePrefix, 'drive_c')
    const pfxPath = join(winePrefix, 'pfx')

    if (!existsSync(driveCPath) && !existsSync(pfxPath)) {
      logInfo(
        `Can't delete folder ${winePrefix}, folder does not contain a drive_c/pfx folder. If this is the correct prefix folder, delete it manually.`
      )
      return
    }
  }

  // if we got here, we are safe to delete this folder
  rmSync(winePrefix, { recursive: true })
}

const removeFixFile = (game: Game) => {
  const fixFilePath = join(
    fixesPath,
    `${game.id}-${storeMap[game.runner]}.json`
  )
  if (existsSync(fixFilePath)) {
    rmSync(fixFilePath)
  }
}

const removeSettingsAndLogs = (game: Game) => {
  const removeIfExists = (filename: string) => {
    logInfo(`Removing ${filename}`, LogPrefix.Backend)
    const gameSettingsFile = join(gamesConfigPath, filename)
    if (existsSync(gameSettingsFile)) {
      rmSync(gameSettingsFile)
    }
  }

  removeIfExists(game.id.concat('.json'))
  removeIfExists(game.id.concat('.log'))
  removeIfExists(game.id.concat('-lastPlay.log'))
}

export const uninstallGameCallback = async (
  event: Event,
  game: Game,
  shouldRemovePrefix: boolean,
  shouldRemoveSetting: boolean
) => {
  sendGameStatusUpdate(game, 'uninstalling')

  const { title } = game.getGameInfo()

  let uninstalled = false

  try {
    await game.uninstall({ shouldRemovePrefix })
    uninstalled = true
  } catch (error) {
    notify({
      title,
      body: i18next.t('notify.uninstalled.error', 'Error uninstalling')
    })
    logError(error, LogPrefix.Backend)
  }

  if (uninstalled) {
    if (shouldRemovePrefix) {
      removePrefix(game)
    }
    if (shouldRemoveSetting) {
      removeSettingsAndLogs(game)
    }
    removeFixFile(game)

    notify({ title, body: i18next.t('notify.uninstalled') })
    logInfo('Finished uninstalling', LogPrefix.Backend)
  }

  sendGameStatusUpdate(game, 'done')
}
