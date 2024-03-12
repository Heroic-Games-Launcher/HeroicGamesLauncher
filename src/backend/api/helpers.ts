import { ipcRenderer, TitleBarOverlayOptions } from 'electron'
import {
  Runner,
  InstallPlatform,
  WineCommandArgs,
  ConnectivityChangedCallback,
  ConnectivityStatus,
  RunWineCommandArgs,
  SaveSyncArgs
} from 'common/types'
import type { KeyValuePair } from '../schemas'

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

export const isLoggedIn = async () => ipcRenderer.invoke('isLoggedIn')

export const kill = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('kill', appName, runner)

export const abort = (id: string) => ipcRenderer.send('abort', id)

export const getUserInfo = async () => ipcRenderer.invoke('getUserInfo')

export const getAmazonUserInfo = async () =>
  ipcRenderer.invoke('getAmazonUserInfo')

export const syncSaves = async (args: SaveSyncArgs) =>
  ipcRenderer.invoke('syncSaves', args)

export const getDefaultSavePath = async (
  appName: string,
  runner: Runner,
  alreadyDefinedGogSaves: KeyValuePair[] = []
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

export const getLaunchOptions = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('getLaunchOptions', appName, runner)

export const getPrivateBranchPassword = async (appName: string) =>
  ipcRenderer.invoke('getPrivateBranchPassword', appName)
export const setPrivateBranchPassword = async (
  appName: string,
  password: string
) => ipcRenderer.invoke('setPrivateBranchPassword', appName, password)

// REDmod integration
export const getAvailableCyberpunkMods = async () =>
  ipcRenderer.invoke('getAvailableCyberpunkMods')
export const setCyberpunModConfig = async (props: {
  enabled: boolean
  modsToLoad: string[]
}) => ipcRenderer.invoke('setCyberpunkModConfig', props)

export const getInstallInfo = async (
  appName: string,
  runner: Runner,
  installPlatform: InstallPlatform,
  build?: string,
  branch?: string
) =>
  ipcRenderer.invoke(
    'getInstallInfo',
    appName,
    runner,
    installPlatform,
    build,
    branch
  )

export const runWineCommand = async (
  appName: string,
  runner: Runner,
  args: Omit<WineCommandArgs, 'gameConfig'>
) => ipcRenderer.invoke('runWineCommand', appName, runner, args)

export const runWineCommandForGame = async (args: RunWineCommandArgs) =>
  ipcRenderer.invoke('runWineCommandForGame', args)

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

export const setTitleBarOverlay = (options: TitleBarOverlayOptions) =>
  ipcRenderer.send('setTitleBarOverlay', options)

export const isGameAvailable = async (args: {
  appName: string
  runner: Runner
}) => ipcRenderer.invoke('isGameAvailable', args)
