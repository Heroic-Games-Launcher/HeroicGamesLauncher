import { ipcRenderer } from 'electron'
import { Runner, InstallPlatform } from '../../common/types'

//src/frontend/helpers/index.ts
export const notify = (notification: string[]) =>
  ipcRenderer.send('Notify', notification)
export const openLoginPage = () => ipcRenderer.send('openLoginPage')
export const openSidInfoPage = () => ipcRenderer.send('openSidInfoPage')
export const openSupportPage = () => ipcRenderer.send('openSupportPage')
export const quit = () => ipcRenderer.send('quit')
export const showAboutWindow = () => ipcRenderer.send('showAboutWindow')
export const openDiscordLink = () => ipcRenderer.send('openDiscordLink')
export const createNewWindow = (url: string) =>
  ipcRenderer.send('createNewWindow', url)

//invoke
export const readConfig = async (file: string) =>
  ipcRenderer.invoke('readConfig', file)
export const getPlatform = async () => ipcRenderer.invoke('getPlatform')
export const isLoggedIn = async () => ipcRenderer.invoke('isLoggedIn')
export const writeConfig = async (data: [appName: string, x: unknown]) =>
  ipcRenderer.invoke('writeConfig', data)
export const kill = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('kill', appName, runner)
export const getUserInfo = async () => ipcRenderer.invoke('getUserInfo')
export const syncSaves = async (
  args: [arg: string | undefined, path: string, appName: string, runner: string]
) => ipcRenderer.invoke('syncSaves', args)
export const getGameInfo = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('getGameInfo', appName, runner)
export const getGameSettings = async (appName: string, runner: Runner) =>
  ipcRenderer.invoke('getGameSettings', appName, runner)
export const getInstallInfo = async (
  appName: string,
  runner: Runner,
  installPlatform?: InstallPlatform | string
) => ipcRenderer.invoke('getInstallInfo', appName, runner, installPlatform)
interface runWineCommand {
  appName: string
  runner: string
  command: string
}
export const runWineCommandForGame = async (command: runWineCommand) =>
  ipcRenderer.invoke('runWineCommandForGame', command)
export const requestSettings = async (appName: string) =>
  ipcRenderer.invoke('requestSettings', appName)
