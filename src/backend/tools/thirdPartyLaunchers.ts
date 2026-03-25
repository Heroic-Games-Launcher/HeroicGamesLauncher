import { join } from 'path'
import { downloadFile, sendGameStatusUpdate } from '../utils'
import { runWineCommand } from '../launcher'
import { addNewApp } from '../storeManagers/sideload/library'
import { logInfo, LogPrefix, logError } from 'backend/logger'
import { createAbortController } from '../utils/aborthandler/aborthandler'
import { toolsPath } from 'backend/constants/paths'
import { ThirdPartyLaunchers, WineInstallation } from 'common/types'
import { existsSync, mkdirSync, readdirSync } from 'graceful-fs'
import { GlobalConfig } from 'backend/config'
import { GameConfig } from 'backend/game_config'

interface ThirdPartyLauncher {
  id: string
  name: string
  installerUrl: string
  installerName: string
  installDir: string // base directory relative to drive_c
  executableName: string // the executable file name to search for
  logo?: string
  art_cover: string
  art_square: string
}

const THIRD_PARTY_LAUNCHERS: Record<string, ThirdPartyLauncher> = {
  ea: {
    id: 'ea',
    name: 'EA App',
    installerUrl:
      'https://origin-a.akamaihd.net/EA-Desktop-Client-Download/installer-releases/EAappInstaller.exe',
    installerName: 'EAappInstaller.exe',
    installDir: 'Program Files/Electronic Arts/EA Desktop',
    executableName: 'EALauncher.exe',
    art_cover:
      'https://cdn2.steamgriddb.com/thumb/67fce8ab05c7c0a28fa66b353e813cbd.jpg',
    art_square:
      'https://cdn2.steamgriddb.com/thumb/67fce8ab05c7c0a28fa66b353e813cbd.jpg'
  },
  ubisoft: {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    installerUrl:
      'https://static3.cdn.ubi.com/orbit/launcher_installer/UbisoftConnectInstaller.exe',
    installerName: 'UbisoftConnectInstaller.exe',
    installDir: 'Program Files (x86)/Ubisoft/Ubisoft Game Launcher',
    executableName: 'UbisoftConnect.exe',
    art_cover:
      'https://cdn2.steamgriddb.com/thumb/2c6863132637ca56cee2ee5d4c7b0923.jpg',
    art_square:
      'https://cdn2.steamgriddb.com/thumb/2c6863132637ca56cee2ee5d4c7b0923.jpg'
  },
  battlenet: {
    id: 'battlenet',
    name: 'Battle.net',
    installerUrl:
      'https://downloader.battle.net/download/installer/win/1.0.63/Battle.net-Setup.exe',
    installerName: 'Battle.net-Setup.exe',
    installDir: 'Program Files (x86)/Battle.net',
    executableName: 'Battle.net.exe',
    art_cover:
      'https://cdn2.steamgriddb.com/thumb/356c41d28e278e936b46739712043616.jpg',
    art_square:
      'https://cdn2.steamgriddb.com/thumb/356c41d28e278e936b46739712043616.jpg'
  }
}

/**
 * Recursively search for an executable in a directory
 */
function findExecutable(
  searchDir: string,
  executableName: string
): string | null {
  if (!existsSync(searchDir)) {
    return null
  }

  try {
    const entries = readdirSync(searchDir, { withFileTypes: true })

    // Check if the executable exists in this directory
    for (const entry of entries) {
      if (entry.name.toLowerCase() === executableName.toLowerCase()) {
        return join(searchDir, entry.name)
      }
    }

    // Recursively search in subdirectories
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const result = findExecutable(
          join(searchDir, entry.name),
          executableName
        )
        if (result) {
          return result
        }
      }
    }
  } catch (error) {
    logError(
      `Error searching for executable in ${searchDir}: ${String(error)}`,
      LogPrefix.Backend
    )
  }

  return null
}

export async function installThirdPartyLauncher(
  launcherId: ThirdPartyLaunchers,
  options: {
    winePrefix: string
    wineVersion: WineInstallation
    crossoverBottle?: string
  }
) {
  const launcher = THIRD_PARTY_LAUNCHERS[launcherId]
  if (!launcher) {
    throw new Error(`Launcher ${launcherId} not found`)
  }

  const winePrefix = options.winePrefix
  const gameSettings = GlobalConfig.get().getSettings()

  const basePath = join(winePrefix, 'drive_c', launcher.installDir)
  let finalExecutable = findExecutable(basePath, launcher.executableName)

  const addLauncherToLibrary = async (executablePath: string) => {
    const appName = `sideload-${launcherId}`
    const currentSettings = await GameConfig.get(appName).getSettings()
    GameConfig.get(appName).config = {
      ...currentSettings,
      winePrefix: options.winePrefix,
      wineVersion: options.wineVersion,
      wineCrossoverBottle: options.crossoverBottle ?? ''
    }
    GameConfig.get(appName).flush()

    addNewApp({
      app_name: appName,
      title: launcher.name,
      runner: 'sideload',
      install: {
        executable: executablePath,
        platform: 'Windows'
      },
      art_cover: launcher.art_cover,
      art_square: launcher.art_square,
      is_installed: true,
      canRunOffline: false
    })

    sendGameStatusUpdate({
      appName: `sideload-${launcherId}`,
      status: 'done'
    })
  }

  if (finalExecutable) {
    logInfo(
      `${launcher.name} is already installed at ${finalExecutable}, skipping installer run`,
      LogPrefix.Backend
    )
    await addLauncherToLibrary(finalExecutable)
    return { success: true }
  }

  const downloadDest = join(toolsPath, launcher.installerName)
  logInfo(
    `Downloading ${launcher.name} installer to ${downloadDest}`,
    LogPrefix.Backend
  )

  try {
    if (!existsSync(downloadDest)) {
      const abortSignal = createAbortController(`install-${launcherId}`).signal
      await downloadFile({
        url: launcher.installerUrl,
        dest: downloadDest,
        abortSignal,
        progressCallback: (bytes, speed, percentage) => {
          sendGameStatusUpdate({
            appName: `sideload-${launcherId}`,
            status: 'installing',
            context: 'Downloading',
            progress: {
              bytes: bytes.toString(),
              eta: '0s',
              percent: percentage,
              downSpeed: speed
            }
          })
        }
      })
    }

    if (!existsSync(winePrefix)) {
      mkdirSync(winePrefix, { recursive: true })
    }

    logInfo(`Running ${launcher.name} installer via Wine`, LogPrefix.Backend)

    sendGameStatusUpdate({
      appName: `sideload-${launcherId}`,
      status: 'installing',
      context: 'Installing'
    })

    await runWineCommand({
      gameSettings: {
        ...gameSettings,
        winePrefix: options.winePrefix,
        wineVersion: options.wineVersion,
        wineCrossoverBottle: options.crossoverBottle ?? ''
      },
      commandParts: [downloadDest],
      wait: true,
      protonVerb: 'runinprefix'
    })

    logInfo(`Checking if launcher was installed`, LogPrefix.Backend)

    finalExecutable = findExecutable(basePath, launcher.executableName)

    if (finalExecutable) {
      await addLauncherToLibrary(finalExecutable)

      logInfo(
        `${launcher.name} installed and added to library`,
        LogPrefix.Backend
      )
      return { success: true }
    } else {
      sendGameStatusUpdate({
        appName: `sideload-${launcherId}`,
        status: 'error',
        context: 'Executable not found after install'
      })
      logError(
        `${launcher.name} installation seemed to fail, executable not found`,
        LogPrefix.Backend
      )
      return { success: false, error: 'Executable not found after install' }
    }
  } catch (error: unknown) {
    logError(
      `Error installing ${launcher.name}: ${String(error)}`,
      LogPrefix.Backend
    )
    sendGameStatusUpdate({
      appName: `sideload-${launcherId}`,
      status: 'error',
      context: String(error)
    })
    return { success: false, error: String(error) }
  }
}
