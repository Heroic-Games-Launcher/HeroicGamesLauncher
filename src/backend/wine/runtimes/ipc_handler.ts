import { RuntimeName } from 'common/types'
import { ipcMain } from 'electron'
import { download, isInstalled } from './runtimes'

ipcMain.handle(
  'downloadRuntime',
  async (e, runtime_name: RuntimeName): Promise<boolean> =>
    download(runtime_name)
)

ipcMain.handle('isRuntimeInstalled', (e, runtime_name: RuntimeName): boolean =>
  isInstalled(runtime_name)
)
