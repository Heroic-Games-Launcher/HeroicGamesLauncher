import { dialog, shell, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import { t } from 'i18next'

import { showDialogBoxModalAuto } from './dialog/dialog'
import { logError, LogPrefix } from './logger'
import { windowIcon } from './constants/paths'
import { autoUpdateSupported } from './constants/environment'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

async function showAutoupdateDialog() {
  let messageDetail
  let buttons

  if (autoUpdateSupported) {
    messageDetail = t(
      'box.info.update.detail',
      'Do you want to download the update in the background?'
    )
    buttons = [
      t('box.update', 'Update'),
      t('box.postpone', 'Postpone'),
      t('box.changelog', 'Changelog')
    ]
  } else {
    messageDetail = t(
      'box.info.update.detailNoAutoupdate',
      'Automatic updates are not supported for your packaging format. Please use your package manager to update.'
    )
    buttons = [t('box.ok'), t('box.changelog', 'Changelog')]
  }

  let { response } = await dialog.showMessageBox({
    title: t('box.info.update.title', 'Heroic Games Launcher'),
    message: t('box.info.update.message', 'There is a new Version available!'),
    detail: messageDetail,

    icon: nativeImage.createFromPath(windowIcon),
    buttons
  })

  // "Ok" button becomes "Postpone" (to just close the dialog), "Changelog" gets
  // the correct index (1 -> 2)
  if (!autoUpdateSupported) response++

  if (response === 0) {
    autoUpdater.downloadUpdate()
  }
  if (response === 2) {
    shell.openExternal(
      'https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/releases'
    )
    showAutoupdateDialog()
  }
}

autoUpdater.on('update-available', showAutoupdateDialog)
autoUpdater.on('update-downloaded', async () => {
  const { response } = await dialog.showMessageBox({
    title: t('box.info.update.title-finished', 'Update Finished'),
    message: t(
      'box.info.update.message-finished',
      'Do you want to restart Heroic now?'
    ),
    buttons: [t('box.no'), t('box.yes')]
  })

  if (response === 1) {
    return autoUpdater.quitAndInstall()
  }

  autoUpdater.autoInstallOnAppQuit = true
})

autoUpdater.on('error', (error) => {
  showDialogBoxModalAuto({
    title: t('box.error.update.title', 'Update Error'),
    message: t(
      'box.error.update.message',
      'Something went wrong with the update, please check the logs or try again later!'
    ),
    type: 'ERROR'
  })
  logError(['failed to update', error], LogPrefix.Backend)
})
