import { ipcMain } from 'electron'
import {
  getEosOverlayStatus,
  getLatestEosOverlayVersion,
  updateEosOverlayInfo
} from './eos_overlay'

ipcMain.handle('getEosOverlayStatus', getEosOverlayStatus)
ipcMain.handle('getLatestEosOverlayVersion', getLatestEosOverlayVersion)
ipcMain.handle('updateEosOverlayInfo', updateEosOverlayInfo)
