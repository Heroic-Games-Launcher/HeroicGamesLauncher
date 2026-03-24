import { join } from 'path'
import { downloadFile } from '../utils'
import { runWineCommand } from '../launcher'
import { addNewApp } from '../storeManagers/sideload/library'
import { logInfo, LogPrefix, logError } from 'backend/logger'
import { createAbortController } from '../utils/aborthandler/aborthandler'
import { userHome } from 'backend/constants/paths'
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
}

export const THIRD_PARTY_LAUNCHERS: Record<string, ThirdPartyLauncher> = {
  ea: {
    id: 'ea',
    name: 'EA App',
    installerUrl:
      'https://origin-a.akamaihd.net/EA-Desktop-Client-Download/installer-releases/EAappInstaller.exe',
    installerName: 'EAappInstaller.exe',
    windowsInstallPath:
      'Program Files/Electronic Arts/EA Desktop/EA Desktop/EADesktop.exe'
  },
  ubisoft: {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    installerUrl:
      'https://static3.cdn.ubi.com/orbit/launcher_installer/UbisoftConnectInstaller.exe',
    installerName: 'UbisoftConnectInstaller.exe',
    windowsInstallPath:
      'Program Files (x86)/Ubisoft/Ubisoft Game Launcher/UbisoftConnect.exe'
  },
  battlenet: {
    id: 'battlenet',
    name: 'Battle.net',
    installerUrl:
      'https://www.battle.net/download/getInstaller?os=win&installer=Battle.net-Setup.exe',
    installerName: 'Battle.net-Setup.exe',
    windowsInstallPath: 'Program Files (x86)/Battle.net/Battle.net.exe'
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

  const downloadDest = join(userHome, 'Downloads', launcher.installerName)
  logInfo(
    `Downloading ${launcher.name} installer to ${downloadDest}`,
    LogPrefix.Backend
  )

  try {
    if (!existsSync(downloadDest)) {
      await downloadFile({
        url: launcher.installerUrl,
        dest: downloadDest,
        abortSignal: createAbortController(`install-${launcherId}`).signal
      })
    }

    const winePrefix = options.winePrefix.replace('~', userHome)
    if (!existsSync(winePrefix)) {
      mkdirSync(winePrefix, { recursive: true })
    }

    logInfo(`Running ${launcher.name} installer via Wine`, LogPrefix.Backend)

    const gameSettings = GlobalConfig.get().getSettings()

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

    const finalExecutable = join(
      winePrefix,
      'drive_c',
      launcher.windowsInstallPath
    )
    logInfo(
      `Checking if launcher was installed at ${finalExecutable}`,
      LogPrefix.Backend
    )

    if (existsSync(finalExecutable)) {
      addNewApp({
        app_name: `sideload-${launcherId}`,
        title: launcher.name,
        runner: 'sideload',
        install: {
          executable: finalExecutable,
          platform: 'Windows'
        },
        art_cover: '',
        art_square: '',
        is_installed: true,
        canRunOffline: false
      })
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
    return { success: false, error: String(error) }
  }
}
