import { gameManagerMap } from '../../index'
import {
  callAbortController,
  createAbortController,
  deleteAbortController
} from '../../../utils/aborthandler/aborthandler'
import { dialog } from 'electron'
import { existsSync, readFileSync } from 'graceful-fs'
import { t } from 'i18next'
import { join } from 'path'

import { toolsPath, isLinux, legendaryConfigPath } from '../../../constants'
import { logError, LogPrefix, logWarning } from '../../../logger/logger'
import { runRunnerCommand as runLegendaryCommand } from '../library'
import { verifyWinePrefix } from '../../../launcher'
import { sendFrontendMessage } from '../../../main_window'
import { setCurrentDownloadSize } from '../games'

const currentVersionPath = join(legendaryConfigPath, 'overlay_version.json')
const installedVersionPath = join(legendaryConfigPath, 'overlay_install.json')
const defaultInstallPath = join(toolsPath, 'eos_overlay')
const eosOverlayAppName = '98bc04bc842e4906993fd6d6644ffb8d'

function getStatus(): {
  isInstalled: boolean
  version?: string
  install_path?: string
} {
  if (!isInstalled()) {
    return { isInstalled: false }
  }

  const { version, install_path } = JSON.parse(
    readFileSync(installedVersionPath, 'utf-8')
  )

  if (install_path !== defaultInstallPath) {
    logWarning(
      'EOS Overlay is not installed in default location, permission issues might arise',
      LogPrefix.Legendary
    )
  }

  return { isInstalled: true, version, install_path }
}

async function getLatestVersion(): Promise<string> {
  if (!existsSync(currentVersionPath)) {
    // HACK: `overlay_version.json` isn't created when the overlay isn't installed
    if (!isInstalled()) {
      return ''
    }
    await updateInfo()
    if (!existsSync(currentVersionPath)) {
      logError(
        'EOS Overlay information not found after manual update. User is probably not logged in anymore',
        LogPrefix.Legendary
      )
      return ''
    }
  }
  const { buildVersion }: { buildVersion: string } = JSON.parse(
    readFileSync(currentVersionPath, 'utf-8')
  ).data
  return buildVersion
}

async function updateInfo() {
  // Without the overlay being installed, this will do nothing at all.
  // So we can just skip running the command if that's the case
  if (!isInstalled()) {
    return
  }

  await runLegendaryCommand(
    ['status'],
    createAbortController(eosOverlayAppName),
    {
      logMessagePrefix: 'Updating EOS Overlay information'
    }
  )

  deleteAbortController(eosOverlayAppName)
}

/**
 * Installs the EOS overlay
 * @returns The error encountered when installing, if any
 */
async function install() {
  sendFrontendMessage('gameStatusUpdate', {
    appName: eosOverlayAppName,
    runner: 'legendary',
    status: isInstalled() ? 'updating' : 'installing'
  })

  let downloadSize = 0
  // Run download without -y to get the install size
  await runLegendaryCommand(
    ['eos-overlay', 'install', '--path', defaultInstallPath],
    createAbortController(eosOverlayAppName),
    {
      logMessagePrefix: 'Getting EOS Overlay install size',
      onOutput: (output: string) => {
        const downloadMatch = output.match(/Download size: ([\d.]+) MiB/)
        if (downloadMatch) {
          downloadSize = parseFloat(downloadMatch[1])
          // Output is in MiB, we want it in bytes
          downloadSize = downloadSize * 1024 ** 2
          callAbortController(eosOverlayAppName)
        }
      }
    }
  )

  deleteAbortController(eosOverlayAppName)

  // The EOS Overlay doesn't support Ctrl-C-pausing, so it's fine to just do this
  setCurrentDownloadSize(eosOverlayAppName, downloadSize)

  // And now actually install it
  const { error } = await runLegendaryCommand(
    ['-y', 'eos-overlay', 'install', '--path', defaultInstallPath],
    createAbortController(eosOverlayAppName),
    {
      logMessagePrefix: 'Installing EOS Overlay',
      onOutput: (output: string) => {
        gameManagerMap['legendary'].onInstallOrUpdateOutput(
          eosOverlayAppName,
          'installing',
          output,
          downloadSize
        )
      }
    }
  )

  deleteAbortController(eosOverlayAppName)

  sendFrontendMessage('gameStatusUpdate', {
    appName: eosOverlayAppName,
    runner: 'legendary',
    status: 'done'
  })

  return error
}

/**
 * Removes the EOS overlay
 * Asks the user to confirm the removal
 * @returns True if the overlay was removed, False if it wasn't
 */
async function remove(): Promise<boolean> {
  const { response } = await dialog.showMessageBox({
    title: t(
      'setting.eosOverlay.removeConfirmTitle',
      'Confirm overlay removal'
    ),
    message: t(
      'setting.eosOverlay.removeConfirm',
      'Are you sure you want to uninstall the EOS Overlay?'
    ),
    buttons: [t('box.yes'), t('box.no')]
  })
  if (response === 1) {
    return false
  }

  await runLegendaryCommand(
    ['-y', 'eos-overlay', 'remove'],
    createAbortController(eosOverlayAppName)
  )

  deleteAbortController(eosOverlayAppName)

  return true
}

async function enable(
  appName: string
): Promise<{ wasEnabled: boolean; installNow?: boolean }> {
  let prefix = ''
  if (isLinux) {
    const gameSettings = await gameManagerMap['legendary'].getSettings(appName)
    await verifyWinePrefix(gameSettings)
    const { winePrefix, wineVersion } = gameSettings
    prefix =
      wineVersion.type === 'proton' ? join(winePrefix, 'pfx') : winePrefix
  }
  if (!isInstalled()) {
    const { response } = await dialog.showMessageBox({
      title: t('setting.eosOverlay.notInstalledTitle', 'Overlay not installed'),
      message: t(
        'setting.eosOverlay.notInstalledMsg',
        'The EOS Overlay is not installed. Do you want to install it now?'
      ),
      buttons: [t('box.yes'), t('box.no')]
    })
    // Installing the overlay requires some frontend work, so we can't just do it in the backend alone
    return { wasEnabled: false, installNow: response === 0 }
  }

  await runLegendaryCommand(
    ['eos-overlay', 'enable', ...(prefix ? ['--prefix', prefix] : [])],
    createAbortController(eosOverlayAppName),
    { logMessagePrefix: 'Enabling EOS Overlay' }
  )

  deleteAbortController(eosOverlayAppName)

  return { wasEnabled: true }
}

async function disable(appName: string) {
  let prefix = ''
  if (isLinux) {
    const { winePrefix, wineVersion } = await gameManagerMap[
      'legendary'
    ].getSettings(appName)
    prefix =
      wineVersion.type === 'proton' ? join(winePrefix, 'pfx') : winePrefix
  }

  await runLegendaryCommand(
    ['eos-overlay', 'disable', ...(prefix ? ['--prefix', prefix] : [])],
    createAbortController(eosOverlayAppName),
    { logMessagePrefix: 'Disabling EOS Overlay' }
  )

  deleteAbortController(eosOverlayAppName)
}

function isInstalled() {
  return existsSync(installedVersionPath)
}

/**
 * Checks if the EOS Overlay is enabled (either for a specific game on Linux or globally on Windows)
 * @param appName required on Linux, does nothing on Windows
 * @returns Enabled = True; Disabled = False
 */
async function isEnabled(appName?: string) {
  let enabled = false

  let prefix = ''
  if (isLinux && appName) {
    const { winePrefix, wineVersion } = await gameManagerMap[
      'legendary'
    ].getSettings(appName)
    prefix =
      wineVersion.type === 'proton' ? join(winePrefix, 'pfx') : winePrefix
  }

  await runLegendaryCommand(
    ['eos-overlay', 'info', ...(prefix ? ['--prefix', prefix] : [])],
    createAbortController(eosOverlayAppName),
    {
      onOutput: (data: string) => {
        if (data.includes('Overlay enabled')) {
          enabled = data.includes('Yes')
          callAbortController(eosOverlayAppName)
        }
      },
      logMessagePrefix: 'Checking if EOS Overlay is enabled'
    }
  )

  deleteAbortController(eosOverlayAppName)
  return enabled
}

export {
  getStatus,
  getLatestVersion,
  updateInfo,
  install,
  remove,
  enable,
  disable,
  isEnabled
}
