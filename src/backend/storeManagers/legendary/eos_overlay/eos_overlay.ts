import { dialog } from 'electron'
import { existsSync, readFileSync } from 'graceful-fs'
import { t } from 'i18next'
import { join } from 'path'

import { toolsPath, isLinux, legendaryConfigPath } from 'backend/constants'
import { logError, LogPrefix, logWarning } from 'backend/logger/logger'
import { callAbortController } from 'backend/utils/aborthandler/aborthandler'
import { sendGameStatusUpdate } from 'backend/utils'
import { gameManagerMap } from '../..'
import { LegendaryCommand } from '../commands'
import { Path, ValidWinePrefix } from '../commands/base'
import { setCurrentDownloadSize } from '../games'
import { runRunnerCommand as runLegendaryCommand } from '../library'

import type { Runner } from 'common/types'
import { getGameConfig } from 'backend/config/game'

const currentVersionPath = () =>
  join(legendaryConfigPath, 'overlay_version.json')
const installedVersionPath = () =>
  join(legendaryConfigPath, 'overlay_install.json')
const defaultInstallPath = () => join(toolsPath, 'eos_overlay')
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
    readFileSync(installedVersionPath(), 'utf-8')
  )

  if (install_path !== defaultInstallPath()) {
    logWarning(
      'EOS Overlay is not installed in default location, permission issues might arise',
      LogPrefix.Legendary
    )
  }

  return { isInstalled: true, version, install_path }
}

async function getLatestVersion(): Promise<string> {
  if (!existsSync(currentVersionPath())) {
    // HACK: `overlay_version.json` isn't created when the overlay isn't installed
    if (!isInstalled()) {
      return ''
    }
    await updateInfo()
    if (!existsSync(currentVersionPath())) {
      logError(
        'EOS Overlay information not found after manual update. User is probably not logged in anymore',
        LogPrefix.Legendary
      )
      return ''
    }
  }
  const { buildVersion }: { buildVersion: string } = JSON.parse(
    readFileSync(currentVersionPath(), 'utf-8')
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
    { subcommand: 'status' },
    {
      abortId: eosOverlayAppName,
      logMessagePrefix: 'Updating EOS Overlay information'
    }
  )
}

/**
 * Installs the EOS overlay
 * @returns The error encountered when installing, if any
 */
async function install() {
  sendGameStatusUpdate({
    appName: eosOverlayAppName,
    runner: 'legendary',
    status: isInstalled() ? 'updating' : 'installing'
  })

  let downloadSize = 0
  // Run download without -y to get the install size
  await runLegendaryCommand(
    {
      subcommand: 'eos-overlay',
      action: 'install',
      '--path': Path.parse(defaultInstallPath())
    },
    {
      abortId: eosOverlayAppName,
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

  // The EOS Overlay doesn't support Ctrl-C-pausing, so it's fine to just do this
  setCurrentDownloadSize(eosOverlayAppName, downloadSize)

  // And now actually install it
  const { error } = await runLegendaryCommand(
    {
      '-y': true,
      subcommand: 'eos-overlay',
      action: 'install',
      '--path': Path.parse(defaultInstallPath())
    },
    {
      abortId: eosOverlayAppName,
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

  sendGameStatusUpdate({
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
    {
      '-y': true,
      subcommand: 'eos-overlay',
      action: 'remove'
    },
    {
      abortId: eosOverlayAppName
    }
  )

  return true
}

async function enable(
  appName: string
): Promise<{ wasEnabled: boolean; installNow?: boolean }> {
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

  const prefix = await getWinePrefixFolder(appName)
  // Can't install the overlay if we don't have a valid prefix
  // FIXME: Notify the user about this
  if (prefix === false) return { wasEnabled: false }

  const command: LegendaryCommand = {
    subcommand: 'eos-overlay',
    action: 'enable'
  }
  if (prefix) command['--prefix'] = prefix

  await runLegendaryCommand(command, {
    abortId: eosOverlayAppName,
    logMessagePrefix: 'Enabling EOS Overlay'
  })

  return { wasEnabled: true }
}

async function disable(appName: string) {
  const prefix = await getWinePrefixFolder(appName)
  // If we don't have a valid prefix anymore, we have nothing to disable
  if (prefix === false) return

  const command: LegendaryCommand = {
    subcommand: 'eos-overlay',
    action: 'disable'
  }
  if (prefix) command['--prefix'] = prefix

  await runLegendaryCommand(command, {
    abortId: eosOverlayAppName,
    logMessagePrefix: 'Disabling EOS Overlay'
  })
}

function isInstalled() {
  return existsSync(installedVersionPath())
}

/**
 * Checks if the EOS Overlay is enabled (either for a specific game on Linux or globally on Windows)
 * @param appName required on Linux, does nothing on Windows
 * @returns Enabled = True; Disabled = False
 */
async function isEnabled(appName?: string): Promise<boolean> {
  let enabled = false

  const prefix = await getWinePrefixFolder(appName)
  if (prefix === false) return false

  const command: LegendaryCommand = {
    subcommand: 'eos-overlay',
    action: 'info'
  }
  if (prefix) command['--prefix'] = prefix

  await runLegendaryCommand(command, {
    abortId: eosOverlayAppName,
    onOutput: (data: string) => {
      if (data.includes('Overlay enabled')) {
        enabled = data.includes('Yes')
        callAbortController(eosOverlayAppName)
      }
    },
    logMessagePrefix: 'Checking if EOS Overlay is enabled'
  })
  return enabled
}

/**
 * Returns the path to the "real" Wineprefix folder (where "drive_c" and "user.reg" is) for a game
 * @returns null if a prefix can't be returned (we're not on Linux / don't have an AppName)
 * @returns false if parsing the prefix path failed (in other words there is a prefix path set, but it doesn't contain a valid prefix)
 * @returns ValidWinePrefix (a folder that is verified to contain a Wineprefix) otherwise
 */
async function getWinePrefixFolder(
  appName?: string,
  runner: Runner = 'legendary'
): Promise<ValidWinePrefix | null | false> {
  if (!isLinux || !appName) return null

  const { winePrefix, wineVersion } = getGameConfig(appName, runner)
  const prefixPath =
    wineVersion.type === 'proton' ? join(winePrefix, 'pfx') : winePrefix
  const maybePrefix = ValidWinePrefix.safeParse(prefixPath)
  return maybePrefix.success ? maybePrefix.data : false
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
