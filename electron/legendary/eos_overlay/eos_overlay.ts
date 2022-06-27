import { existsSync, readFileSync } from 'graceful-fs'
import { runLegendaryCommand } from '../library'
import { join } from 'path'
import { dialog } from 'electron'

import { heroicToolsPath, legendaryConfigPath } from '../../constants'
import { logError, LogPrefix, logWarning } from '../../logger/logger'
import { t } from 'i18next'

const currentVersionPath = join(legendaryConfigPath, 'overlay_version.json')
const installedVersionPath = join(legendaryConfigPath, 'overlay_install.json')

function getEosOverlayStatus(): { isInstalled: boolean; version?: string } {
  const isInstalled = existsSync(currentVersionPath)
  const installedAtCorrectLocation = existsSync(
    join(heroicToolsPath, 'eos_overlay')
  )

  if (!isInstalled) {
    return { isInstalled }
  }

  if (!installedAtCorrectLocation) {
    logWarning(
      'EOS Overlay is not installed in default location, permission issues might arise',
      LogPrefix.Legendary
    )
  }

  const { version } = JSON.parse(readFileSync(installedVersionPath, 'utf-8'))
  return { isInstalled, version }
}

async function getLatestEosOverlayVersion() {
  if (!existsSync(currentVersionPath)) {
    await updateEosOverlayInfo()
    if (!existsSync(currentVersionPath)) {
      logError(
        'EOS Overlay information not found after manual update. User is probably not logged in anymore',
        LogPrefix.Legendary
      )
      return ''
    }
  }
  const { buildVersion } = JSON.parse(
    readFileSync(currentVersionPath, 'utf-8')
  ).data
  return buildVersion
}

async function updateEosOverlayInfo() {
  await runLegendaryCommand(['status'], {
    logMessagePrefix: 'Updating EOS Overlay information'
  })
}

async function removeEosOverlay() {
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
  await runLegendaryCommand(['-y', 'eos-overlay', 'remove'])
  return true
}

export {
  getEosOverlayStatus,
  getLatestEosOverlayVersion,
  updateEosOverlayInfo,
  removeEosOverlay
}
