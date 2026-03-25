import { join } from 'path'
import { downloadFile, sendGameStatusUpdate, writeConfig } from '../utils'
import { runWineCommand } from '../launcher'
import { addNewApp } from '../storeManagers/sideload/library'
import { logInfo, LogPrefix, logError } from 'backend/logger'
import { createAbortController } from '../utils/aborthandler/aborthandler'
import { toolsPath, userHome } from 'backend/constants/paths'
import { ThirdPartyLaunchers, WineInstallation } from 'common/types'
import { existsSync, mkdirSync } from 'graceful-fs'
import { GlobalConfig } from 'backend/config'

export interface ThirdPartyLauncher {
  id: string
  name: string
  installerUrl: string
  installerName: string
  windowsInstallPath: string // relative to wineprefix drive_c
  logo?: string
  art_cover: string
  art_square: string
}

export const THIRD_PARTY_LAUNCHERS: Record<string, ThirdPartyLauncher> = {
  ea: {
    id: 'ea',
    name: 'EA App',
    installerUrl:
      'https://origin-a.akamaihd.net/EA-Desktop-Client-Download/installer-releases/EAappInstaller.exe',
    installerName: 'EAappInstaller.exe',
    windowsInstallPath:
      'Program Files/Electronic Arts/EA Desktop/13.667.1.6173/EA Desktop/EALauncher.exe',
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
    windowsInstallPath:
      'Program Files (x86)/Ubisoft/Ubisoft Game Launcher/UbisoftConnect.exe',
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
    windowsInstallPath: 'Program Files (x86)/Battle.net/Battle.net.exe',
    art_cover:
      'https://cdn2.steamgriddb.com/thumb/356c41d28e278e936b46739712043616.jpg',
    art_square:
      'https://cdn2.steamgriddb.com/thumb/356c41d28e278e936b46739712043616.jpg'
  }
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

  console.log({ options })
  const finalExecutable = join(
    winePrefix,
    'drive_c',
    launcher.windowsInstallPath
  )

  const addLauncherToLibrary = () => {
    writeConfig(`sideload-${launcherId}`, {
      ...gameSettings,
      winePrefix: options.winePrefix,
      wineVersion: options.wineVersion,
      wineCrossoverBottle: options.crossoverBottle ?? ''
    })

    addNewApp({
      app_name: `sideload-${launcherId}`,
      title: launcher.name,
      runner: 'sideload',
      install: {
        executable: finalExecutable,
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

  if (existsSync(finalExecutable)) {
    logInfo(
      `${launcher.name} is already installed at ${finalExecutable}, skipping installer run`,
      LogPrefix.Backend
    )
    addLauncherToLibrary()
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

    logInfo(
      `Checking if launcher was installed at ${finalExecutable}`,
      LogPrefix.Backend
    )

    if (existsSync(finalExecutable)) {
      addLauncherToLibrary()

      logInfo(
        `${launcher.name} installed and added to library`,
        LogPrefix.Backend
      )
      return { success: true }
    } else {
      logError(
        `${launcher.name} installation seemed to fail, executable not found at ${finalExecutable}`,
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
