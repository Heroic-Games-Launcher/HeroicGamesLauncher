import { ipcMain } from 'electron'
import {
  installWineVersion,
  removeWineVersion,
  updateWineVersionInfos
} from './utils'
import { logError, LogPrefix } from '../../logger/logger'
import { sendFrontendMessage } from '../../main_window'
import type { WineManagerStatus } from 'common/types'
import { notify } from '../../dialog/dialog'
import { t } from 'i18next'

ipcMain.handle('installWineVersion', async (e, release) => {
  const onProgress = (state: WineManagerStatus) => {
    sendFrontendMessage('progressOfWineManager', release.version, state)
  }

  notify({ title: release.version, body: t('notify.install.startInstall') })
  onProgress({
    status: 'downloading',
    percentage: 0,
    avgSpeed: 0,
    eta: '00:00:00'
  })

  const result = await installWineVersion(release, onProgress)

  let notifyBody: string | null = null
  switch (result) {
    case 'error':
      notifyBody = t('notify.install.error')
      break
    case 'abort':
      notifyBody = t('notify.install.canceled')
      break
    case 'success':
      notifyBody = t('notify.install.finished')
  }
  if (notifyBody) notify({ title: release.version, body: notifyBody })
  onProgress({
    status: 'idle'
  })
})

ipcMain.handle('refreshWineVersionInfo', async (e, fetch?) => {
  try {
    await updateWineVersionInfos(fetch)
    return
  } catch (error) {
    logError(error, LogPrefix.WineDownloader)
    return
  }
})

ipcMain.handle('removeWineVersion', async (e, release) => {
  const result = await removeWineVersion(release)
  if (result) notify({ title: release.version, body: t('notify.uninstalled') })
})
