import { ipcRenderer } from 'electron'
import {
  Runner,
  InstallPlatform,
  WineCommandArgs,
  ConnectivityChangedCallback,
  ConnectivityStatus,
  AppSettings,
  GameSettings,
  RunWineCommandArgs
} from 'common/types'
import { GOGCloudSavesLocation } from 'common/types/gog'

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

export const readConfig = async (file: 'library' | 'user') =>
  ipcRenderer.invoke('readConfig', file)

export const getPlatform = async () => ipcRenderer.invoke('getPlatform')

export const isLoggedIn = async () => ipcRenderer.invoke('isLoggedIn')

export const writeConfig = async (data: {
  appName: string
  config: Partial<AppSettings>
}) => ipcRenderer.invoke('writeConfig', data)

export const kill = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('kill', appName, runner)

export const abort = (id: string) => ipcRenderer.send('abort', id)

export const getUserInfo = async () => ipcRenderer.invoke('getUserInfo')

export const syncSaves = async (args: {
  arg: string | undefined
  path: string
  appName: string
  runner: Runner
}) => ipcRenderer.invoke('syncSaves', args)

export const getDefaultSavePath = async (
  appName: string,
  runner: Runner,
  alreadyDefinedGogSaves: GOGCloudSavesLocation[] = []
) =>
  ipcRenderer.invoke(
    'getDefaultSavePath',
    appName,
    runner,
    alreadyDefinedGogSaves
  )
export const getGameInfo = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('getGameInfo', appName, runner)
export const getExtraInfo = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('getExtraInfo', appName, runner)

export const getGameSettings = async (
  appName: string,
  runner: Runner
): Promise<GameSettings | null> =>
  ipcRenderer.invoke('getGameSettings', appName, runner)

export const getInstallInfo = async (
  appName: string,
  runner: Runner,
  installPlatform: InstallPlatform
) => ipcRenderer.invoke('getInstallInfo', appName, runner, installPlatform)

export const runWineCommand = async (args: WineCommandArgs) =>
  ipcRenderer.invoke('runWineCommand', args)

export const runWineCommandForGame = async (args: RunWineCommandArgs) =>
  ipcRenderer.invoke('runWineCommandForGame', args)

export const requestAppSettings = async () =>
  ipcRenderer.invoke('requestSettings', 'default') as Promise<AppSettings>

export const requestGameSettings = async (appName: string) =>
  ipcRenderer.invoke('requestSettings', appName) as Promise<GameSettings>

export const onConnectivityChanged = async (
  callback: ConnectivityChangedCallback
) => ipcRenderer.on('connectivity-changed', callback)

export const getConnectivityStatus = async () =>
  ipcRenderer.invoke('get-connectivity-status')

export const setConnectivityOnline = async () =>
  ipcRenderer.send('set-connectivity-online')

export const connectivityChanged = async (newStatus: ConnectivityStatus) =>
  ipcRenderer.send('connectivity-changed', newStatus)

export const isNative = async (args: { appName: string; runner: Runner }) =>
  ipcRenderer.invoke('isNative', args)

export const getThemeCSS = async (theme: string) =>
  ipcRenderer.invoke('getThemeCSS', theme)

export const getCustomThemes = async () => ipcRenderer.invoke('getCustomThemes')

export const isGameAvailable = async (args: {
  appName: string
  runner: Runner
}) => ipcRenderer.invoke('isGameAvailable', args)
