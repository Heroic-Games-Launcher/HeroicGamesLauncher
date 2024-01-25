import { ipcRenderer } from 'electron'
import type { Runner } from 'common/types'
import type { SystemInformation } from '../utils/systeminfo'
import type { GameConfig, GlobalConfig } from '../config/schemas'

export const getLegendaryVersion = async () =>
  ipcRenderer.invoke('getLegendaryVersion')
export const getGogdlVersion = async () => ipcRenderer.invoke('getGogdlVersion')
export const getNileVersion = async () => ipcRenderer.invoke('getNileVersion')
export const getEosOverlayStatus = async () =>
  ipcRenderer.invoke('getEosOverlayStatus')
export const getLatestEosOverlayVersion = async () =>
  ipcRenderer.invoke('getLatestEosOverlayVersion')
export const removeEosOverlay = async () =>
  ipcRenderer.invoke('removeEosOverlay')
export const updateEosOverlayInfo = async () =>
  ipcRenderer.invoke('updateEosOverlayInfo')

export const changeTrayColor = () => ipcRenderer.send('changeTrayColor')
export const getMaxCpus = async () => ipcRenderer.invoke('getMaxCpus')
export const showUpdateSetting = async () =>
  ipcRenderer.invoke('showUpdateSetting')
export const egsSync = async (args: string) =>
  ipcRenderer.invoke('egsSync', args)

export const showLogFileInFolder = (appNameOrRunner: string) =>
  ipcRenderer.send('showLogFileInFolder', appNameOrRunner)
export const getLogContent = async (appNameOrRunner: string) =>
  ipcRenderer.invoke('getLogContent', appNameOrRunner)

export const systemInfo = {
  get: async (cache?: boolean): Promise<SystemInformation> =>
    ipcRenderer.invoke('getSystemInfo', cache),
  copyToClipboard: (): void => ipcRenderer.send('copySystemInfoToClipboard')
}

export const hasExecutable = async (executable: string) =>
  ipcRenderer.invoke('hasExecutable', executable)

export const copySettingsToClipboard = (appName: string, runner: Runner) =>
  ipcRenderer.send('copySettingsToClipboard', appName, runner)

export const config = {
  global: {
    get: async (): Promise<GlobalConfig> =>
      ipcRenderer.invoke('getGlobalConfig'),
    set: async <Key extends keyof GlobalConfig>(
      key: Key,
      value: GlobalConfig[Key]
    ): Promise<void> => ipcRenderer.invoke('setGlobalConfig', key, value),
    reset: async (key: keyof GlobalConfig): Promise<void> =>
      ipcRenderer.invoke('resetGlobalConfigKey', key),
    getUserConfiguredKeys: async (): Promise<
      Record<keyof GlobalConfig, boolean>
    > => ipcRenderer.invoke('getUserConfiguredGlobalConfigKeys')
  },
  game: {
    get: async (appName: string, runner: Runner): Promise<GameConfig> =>
      ipcRenderer.invoke('getGameConfig', appName, runner),
    set: async <Key extends keyof GameConfig>(
      appName: string,
      runner: Runner,
      key: Key,
      value: GameConfig[Key]
    ): Promise<void> =>
      ipcRenderer.invoke('setGameConfig', appName, runner, key, value),
    reset: async (
      appName: string,
      runner: Runner,
      key: keyof GameConfig
    ): Promise<void> =>
      ipcRenderer.invoke('resetGameConfigKey', appName, runner, key),
    getUserConfiguredKeys: async (
      appName: string,
      runner: Runner
    ): Promise<Record<keyof GameConfig, boolean>> =>
      ipcRenderer.invoke('getUserConfiguredGameConfigKeys', appName, runner)
  },
  messages: {
    globalConfigChanged: (
      callback: <Key extends keyof GlobalConfig>(
        key: Key,
        value: GlobalConfig[Key]
      ) => void
    ): void => {
      ipcRenderer.on('globalConfigChanged', (_e, key, value) =>
        callback(key, value)
      )
    },
    globalConfigKeyReset: (
      callback: <Key extends keyof GlobalConfig>(
        key: Key,
        defaultValue: GlobalConfig[Key]
      ) => void
    ): void => {
      ipcRenderer.on('globalConfigKeyReset', (_e, key, defaultValue) =>
        callback(key, defaultValue)
      )
    },
    gameConfigChanged: (
      callback: <Key extends keyof GameConfig>(
        appName: string,
        runner: Runner,
        key: Key,
        value: GameConfig[Key]
      ) => void
    ): void => {
      ipcRenderer.on('gameConfigChanged', (_e, appName, runner, key, value) =>
        callback(appName, runner, key, value)
      )
    },
    gameConfigKeyReset: (
      callback: <Key extends keyof GameConfig>(
        appName: string,
        runner: Runner,
        key: Key,
        defaultValue: GameConfig[Key]
      ) => void
    ): void => {
      ipcRenderer.on(
        'gameConfigKeyReset',
        (_e, appName, runner, key, defaultValue) =>
          callback(appName, runner, key, defaultValue)
      )
    }
  }
}
