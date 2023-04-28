import { ipcMain } from 'electron'
import {
  getStatus,
  getLatestVersion,
  updateInfo,
  install,
  remove,
  enable,
  disable,
  isEnabled
} from './eos_overlay'

ipcMain.handle('getEosOverlayStatus', getStatus)
ipcMain.handle('getLatestEosOverlayVersion', getLatestVersion)
ipcMain.handle('updateEosOverlayInfo', updateInfo)
ipcMain.handle('installEosOverlay', install)
ipcMain.handle('removeEosOverlay', remove)
ipcMain.handle('enableEosOverlay', async (e, appName) => enable(appName))
ipcMain.handle('disableEosOverlay', async (e, appName) => disable(appName))
ipcMain.handle('isEosOverlayEnabled', async (e, appName?) => isEnabled(appName))
