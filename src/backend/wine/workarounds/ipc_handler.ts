import { ipcMain } from 'electron'
import WorkaroundsManager from './manager'

ipcMain.handle(
  'installWorkaround',
  async (e, workaround, appName, runner, ...args) =>
    WorkaroundsManager.install(
      workaround,
      appName,
      runner,
      ...(args as [never])
    )
)

ipcMain.handle(
  'removeWorkaround',
  async (e, workaround, appName, runner, ...args) =>
    WorkaroundsManager.remove(workaround, appName, runner, ...args)
)

ipcMain.handle(
  'updateWorkaround',
  async (e, workaround, appName, runner, ...args) =>
    WorkaroundsManager.update(workaround, appName, runner, ...(args as [never]))
)

ipcMain.handle(
  'isWorkaroundInstalled',
  async (e, workaround, appName, runner, ...args) =>
    WorkaroundsManager.isInstalled(workaround, appName, runner, ...args)
)
