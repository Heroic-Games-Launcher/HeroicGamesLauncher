import { GlobalConfig } from 'backend/config'
import { fixesPath, gamesConfigPath } from 'backend/constants'
import { notify } from 'backend/dialog/dialog'
import { logError, logInfo, LogPrefix } from 'backend/logger/logger'
import { gameManagerMap } from 'backend/storeManagers'
import { sendGameStatusUpdate } from 'backend/utils'
import { Runner } from 'common/types'
import { storeMap } from 'common/utils'
import { Event } from 'electron'
import { existsSync, readdirSync, rmSync } from 'graceful-fs'
import i18next from 'i18next'
import { join } from 'path'

export const removePrefix = async (appName: string, runner: Runner) => {
  const { winePrefix } = await gameManagerMap[runner].getSettings(appName)
  logInfo(`Removing prefix ${winePrefix}`, LogPrefix.Backend)

  if (!existsSync(winePrefix)) {
    logInfo(`Prefix folder ${winePrefix} doesn't exist, ignoring removal`)
    return
  }

  // folder exists, do some sanity checks before deleting it
  const { defaultInstallPath, defaultWinePrefix } =
    GlobalConfig.get().getSettings()

  if (winePrefix === defaultInstallPath) {
    logInfo(
      `Can't delete folder ${winePrefix}, prefix folder is the default install directory ${defaultInstallPath}`
    )
    return
  }

  if (winePrefix === defaultWinePrefix) {
    logInfo(
      `Can't delete folder ${winePrefix}, prefix folder is the default prefix directory ${defaultWinePrefix}`
    )
    return
  }

  const dirContent = readdirSync(winePrefix)

  if (dirContent.length > 0) {
    const driveCPath = join(winePrefix, 'drive_c')

    if (!existsSync(driveCPath)) {
      logInfo(
        `Can't delete folder ${winePrefix}, folder does not contain a drive_c folder. If this is the correct prefix folder, delete it manually.`
      )
      return
    }
  }

  // if we got here, we are safe to delete this folder
  rmSync(winePrefix, { recursive: true })
}

const removeFixFile = (appName: string, runner: Runner) => {
  const fixFilePath = join(fixesPath, `${appName}-${storeMap[runner]}.json`)
  if (existsSync(fixFilePath)) {
    rmSync(fixFilePath)
  }
}

const removeSettingsAndLogs = (appName: string) => {
  const removeIfExists = (filename: string) => {
    logInfo(`Removing ${filename}`, LogPrefix.Backend)
    const gameSettingsFile = join(gamesConfigPath, filename)
    if (existsSync(gameSettingsFile)) {
      rmSync(gameSettingsFile)
    }
  }

  removeIfExists(appName.concat('.json'))
  removeIfExists(appName.concat('.log'))
  removeIfExists(appName.concat('-lastPlay.log'))
}

export const uninstallGameCallback = async (
  event: Event,
  appName: string,
  runner: Runner,
  shouldRemovePrefix: boolean,
  shouldRemoveSetting: boolean
) => {
  sendGameStatusUpdate({
    appName,
    runner,
    status: 'uninstalling'
  })

  const { title } = gameManagerMap[runner].getGameInfo(appName)

  let uninstalled = false

  try {
    await gameManagerMap[runner].uninstall({ appName, shouldRemovePrefix })
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
      removePrefix(appName, runner)
    }
    if (shouldRemoveSetting) {
      removeSettingsAndLogs(appName)
    }
    removeFixFile(appName, runner)

    notify({ title, body: i18next.t('notify.uninstalled') })
    logInfo('Finished uninstalling', LogPrefix.Backend)
  }

  sendGameStatusUpdate({
    appName,
    runner,
    status: 'done'
  })
}
