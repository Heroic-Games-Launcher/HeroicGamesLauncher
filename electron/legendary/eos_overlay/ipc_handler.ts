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
ipcMain.handle('enableEosOverlay', async (e, appName, runner) => {
  return enable(appName, runner)
})
ipcMain.handle('disableEosOverlay', async (e, appName, runner) => {
  return disable(appName, runner)
})
ipcMain.handle('isEosOverlayEnabled', async (e, appName?, runner?) => {
  return isEnabled(appName, runner)
})
