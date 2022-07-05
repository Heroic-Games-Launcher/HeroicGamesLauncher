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
ipcMain.handle('enableEosOverlay', async (e, prefix) => {
  return enable(prefix)
})
ipcMain.handle('disableEosOverlay', async (e, prefix) => {
  return disable(prefix)
})
ipcMain.handle('isEosOverlayEnabled', async (e, prefix) => {
  return isEnabled(prefix)
})
