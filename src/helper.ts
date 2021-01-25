import { Game, InstallProgress } from './types'

const { ipcRenderer, remote } = window.require('electron')
const { BrowserWindow } = remote

const readFile = async (file: string) =>
  await ipcRenderer.invoke('readFile', file)

export const writeConfig = async (data: any[]) =>
  await ipcRenderer.invoke('writeFile', data)

export const install = async (args: { appName: string; path: string }) =>
  await ipcRenderer.invoke('install', args)

export const repair = async (appName: string) =>
  await ipcRenderer.invoke('repair', appName)

export const launch = (args: any) =>
  ipcRenderer.invoke('launch', args).then((res: any) => res)

export const updateGame = (appName: string) =>
  ipcRenderer.invoke('updateGame', appName)

export const notify = ([title, message]: [title: string, message: string]) =>
  ipcRenderer.send('Notify', [title, message])

export const loginPage = () => ipcRenderer.send('openLoginPage')

export const sidInfoPage = () => ipcRenderer.send('openSidInfoPage')

export const handleKofi = () => ipcRenderer.send('openSupportPage')

export const handleQuit = () => ipcRenderer.send('quit')

export const importGame = async (args: any) =>
  await ipcRenderer.invoke('importGame', args)

export const openAboutWindow = () => ipcRenderer.send('showAboutWindow')

export let progress: string

export const returnedOutput = () =>
  ipcRenderer.on(
    'requestedOutput',
    (_event: any, arg: string) => (progress = arg)
  )

export const sendKill = (appName: string) => ipcRenderer.send('kill', appName)

export const legendary = async (args: string): Promise<any> =>
  await ipcRenderer
    .invoke('legendary', args)
    .then(async (res: string) => {
      const isError = res.includes('ERROR')
      return isError ? 'error' : 'done'
    })
    .catch((err: any) => String(err))

export const isLoggedIn = async () => await ipcRenderer.invoke('isLoggedIn')

export const syncSaves = async (
  savesPath: string,
  appName: string,
  arg?: string
) => {
  const response: string = await ipcRenderer.invoke('syncSaves', [
    arg,
    savesPath,
    appName,
  ])
  return response
}

export const getLegendaryConfig = async () => {
  const user: string = await readFile('user')
  const library: Array<Game> = await readFile('library')

  if (!user) {
    return { user: '', library: [] }
  }

  return { user, library }
}

const specialCharactersRegex = /[^((0-9)|(a-z)|(A-Z)|\s)]/g
const cleanTitle = (title: string) =>
  title
    .replaceAll(specialCharactersRegex, '')
    .replaceAll(' ', '-')
    .toLowerCase()
    .split('--definitive')[0]

export const getGameInfo = async (appName: string) => {
  const library: Array<Game> = await readFile('library')
  const game = library.filter((game) => game.app_name === appName)[0]
  const extraInfo = await ipcRenderer.invoke(
    'getGameInfo',
    cleanTitle(game.title)
  )
  return { ...game, extraInfo }
}

export const handleSavePath = async (game: string) => {
  const { cloudSaveEnabled, saveFolder } = await getGameInfo(game)

  return { cloudSaveEnabled, saveFolder }
}

export const createNewWindow = (url: string) => new BrowserWindow().loadURL(url)
const storeUrl = 'https://www.epicgames.com/store/en-US/product/'

export const formatStoreUrl = (title: string) =>
  `${storeUrl}${cleanTitle(title)}`

export function getProgress(progress: InstallProgress): number {
  return Number(progress.percent.replace('%', ''))
}
