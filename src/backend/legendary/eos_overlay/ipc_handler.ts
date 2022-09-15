import { ipcMain } from 'electron'
import {
  getStatus,
  getLatestVersion,
  updateInfo,
  install,
  remove,
  cancelInstallOrUpdate,
  enable,
  disable,
  isEnabled
} from './eos_overlay'

ipcMain.handle('getEosOverlayStatus', getStatus)
ipcMain.handle('getLatestEosOverlayVersion', getLatestVersion)
ipcMain.handle('updateEosOverlayInfo', updateInfo)
ipcMain.handle('installEosOverlay', install)
ipcMain.handle('removeEosOverlay', remove)
ipcMain.handle('cancelEosOverlayInstallOrUpdate', cancelInstallOrUpdate)
ipcMain.handle('enableEosOverlay', async (e, appName) => {
  return enable(appName)
})
ipcMain.handle('disableEosOverlay', async (e, appName) => {
  return disable(appName)
})
ipcMain.handle('isEosOverlayEnabled', async (e, appName?) => {
  return isEnabled(appName)
})
