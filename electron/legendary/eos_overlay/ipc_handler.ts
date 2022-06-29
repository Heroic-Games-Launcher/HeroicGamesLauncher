import { ipcMain } from 'electron'
import {
  getStatus,
  getLatestVersion,
  updateInfo,
  install,
  remove,
  cancelInstallOrUpdate
} from './eos_overlay'

ipcMain.handle('getEosOverlayStatus', getStatus)
ipcMain.handle('getLatestEosOverlayVersion', getLatestVersion)
ipcMain.handle('updateEosOverlayInfo', updateInfo)
ipcMain.handle('installEosOverlay', install)
ipcMain.handle('removeEosOverlay', remove)
ipcMain.handle('cancelEosOverlayInstallOrUpdate', cancelInstallOrUpdate)
