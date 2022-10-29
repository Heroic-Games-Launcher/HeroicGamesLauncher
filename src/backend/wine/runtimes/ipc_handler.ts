import { ipcMain } from 'electron'
import { download, isInstalled } from './runtimes'

ipcMain.handle('downloadRuntime', async (e, runtime_name) =>
  download(runtime_name)
)

ipcMain.handle('isRuntimeInstalled', (e, runtime_name) =>
  isInstalled(runtime_name)
)
