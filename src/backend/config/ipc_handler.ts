import { ipcMain } from 'electron'
import {
  getGlobalConfig,
  getUserConfiguredGlobalConfigKeys,
  resetGlobalConfigKey,
  setGlobalConfig
} from './global'
import {
  getGameConfig,
  getUserConfiguredGameConfigKeys,
  resetGameConfigKey,
  setGameConfig
} from './game'

ipcMain.handle('getGlobalConfig', () => getGlobalConfig())
ipcMain.handle('setGlobalConfig', (_e, key, value) =>
  setGlobalConfig(key, value)
)
ipcMain.handle('resetGlobalConfigKey', (_e, key) => resetGlobalConfigKey(key))
ipcMain.handle('getUserConfiguredGlobalConfigKeys', () =>
  getUserConfiguredGlobalConfigKeys()
)

ipcMain.handle('getGameConfig', (_e, appName, runner) =>
  getGameConfig(appName, runner)
)
ipcMain.handle('setGameConfig', (_e, appName, runner, key, value) =>
  setGameConfig(appName, runner, key, value)
)
ipcMain.handle('resetGameConfigKey', (_e, appName, runner, key) =>
  resetGameConfigKey(appName, runner, key)
)
ipcMain.handle('getUserConfiguredGameConfigKeys', (_e, appName, runner) =>
  getUserConfiguredGameConfigKeys(appName, runner)
)
