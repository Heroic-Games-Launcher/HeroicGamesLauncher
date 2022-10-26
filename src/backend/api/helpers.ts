import { ipcRenderer } from 'electron'
import {
  Runner,
  InstallPlatform,
  WineCommandArgs,
  ConnectivityChangedCallback,
  ConnectivityStatus,
  GameInfo,
  AppSettings,
  GameSettings,
  UserInfo,
  RunWineCommandArgs,
  ExecResult
} from 'common/types'
import { LegendaryInstallInfo } from 'common/types/legendary'
import { GogInstallInfo } from 'common/types/gog'

export const notify = (args: { title: string; body: string }) =>
  ipcRenderer.send('notify', args)
export const openLoginPage = () => ipcRenderer.send('openLoginPage')
export const openSidInfoPage = () => ipcRenderer.send('openSidInfoPage')
export const openSupportPage = () => ipcRenderer.send('openSupportPage')
export const quit = () => ipcRenderer.send('quit')
export const showAboutWindow = () => ipcRenderer.send('showAboutWindow')
export const openDiscordLink = () => ipcRenderer.send('openDiscordLink')
export const openWinePrefixFAQ = () => ipcRenderer.send('openWinePrefixFAQ')
export const openCustomThemesWiki = () =>
  ipcRenderer.send('openCustomThemesWiki')
export const createNewWindow = (url: string) =>
  ipcRenderer.send('createNewWindow', url)

export const readConfig = async (
  file: 'library' | 'user'
): Promise<GameInfo[] | string> => ipcRenderer.invoke('readConfig', file)

export const getPlatform = async (): Promise<NodeJS.Platform> =>
  ipcRenderer.invoke('getPlatform')

export const isLoggedIn = async (): Promise<boolean> =>
  ipcRenderer.invoke('isLoggedIn')

export const writeConfig = async (data: {
  appName: string
  config: AppSettings | GameSettings
}): Promise<void> => ipcRenderer.invoke('writeConfig', data)

export const kill = async (appName: string, runner: Runner): Promise<void> =>
  ipcRenderer.invoke('kill', appName, runner)

export const abort = (id: string) => ipcRenderer.send('abort', id)

export const getUserInfo = async (): Promise<UserInfo | undefined> =>
  ipcRenderer.invoke('getUserInfo')

export const syncSaves = async (args: {
  arg: string | undefined
  path: string
  appName: string
  runner: Runner
}): Promise<string> => ipcRenderer.invoke('syncSaves', args)

export const getGameInfo = async (
  appName: string,
  runner: Runner
): Promise<GameInfo | null> =>
  ipcRenderer.invoke('getGameInfo', appName, runner)

export const getGameSettings = async (
  appName: string,
  runner: Runner
): Promise<GameSettings | null> =>
  ipcRenderer.invoke('getGameSettings', appName, runner)

export const getInstallInfo = async (
  appName: string,
  runner: Runner,
  installPlatform?: InstallPlatform
): Promise<LegendaryInstallInfo | GogInstallInfo | null> =>
  ipcRenderer.invoke('getInstallInfo', appName, runner, installPlatform)

export const runWineCommand = async (
  args: WineCommandArgs
): Promise<{ stdout: string; stderr: string }> =>
  ipcRenderer.invoke('runWineCommand', args)

export const runWineCommandForGame = async (
  command: RunWineCommandArgs
): Promise<ExecResult> => ipcRenderer.invoke('runWineCommandForGame', command)

export const requestAppSettings = async (): Promise<AppSettings> =>
  ipcRenderer.invoke('requestSettings', 'default')

export const requestGameSettings = async (
  appName: string
): Promise<GameSettings> => ipcRenderer.invoke('requestSettings', appName)

export const onConnectivityChanged = async (
  callback: ConnectivityChangedCallback
) => ipcRenderer.on('connectivity-changed', callback)

export const getConnectivityStatus = async (): Promise<{
  status: ConnectivityStatus
  retryIn: number
}> => ipcRenderer.invoke('get-connectivity-status')

export const connectivityChanged = async (
  newStatus: ConnectivityStatus
): Promise<void> => ipcRenderer.send('connectivity-changed', newStatus)

export const isNative = async (args: {
  appName: string
  runner: Runner
}): Promise<boolean> => ipcRenderer.invoke('isNative', args)

export const getThemeCSS = async (theme: string): Promise<string> =>
  ipcRenderer.invoke('getThemeCSS', theme)

export const getCustomThemes = async (): Promise<string[]> =>
  ipcRenderer.invoke('getCustomThemes')
