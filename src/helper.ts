import { IpcRenderer, Remote } from 'electron'
import { Game, InstallProgress } from './types'
import { TFunction } from 'react-i18next'

const { ipcRenderer, remote } = window.require('electron') as {
  ipcRenderer: IpcRenderer
  remote: Remote
}
const {
  BrowserWindow,
  dialog: { showMessageBox },
} = remote

const readFile = async (file: string) =>
  await ipcRenderer.invoke('readFile', file)

export const writeConfig = async (
  data: [appName: string, x: unknown]
): Promise<void> => await ipcRenderer.invoke('writeFile', data)

export const install = async (args: {
  appName: string
  path: string
}): Promise<void> => await ipcRenderer.invoke('install', args)

export const repair = async (appName: string): Promise<void> =>
  await ipcRenderer.invoke('repair', appName)

export const launch = (args: string): Promise<string> =>
  ipcRenderer.invoke('launch', args).then((res: string): string => res)

export const updateGame = (appName: string): Promise<void> =>
  ipcRenderer.invoke('updateGame', appName)

export const notify = ([title, message]: [
  title: string,
  message: string
]): void => ipcRenderer.send('Notify', [title, message])

export const loginPage = (): void => ipcRenderer.send('openLoginPage')

export const sidInfoPage = (): void => ipcRenderer.send('openSidInfoPage')

export const handleKofi = (): void => ipcRenderer.send('openSupportPage')

export const handleQuit = (): void => ipcRenderer.send('quit')

export const importGame = async (args: {
  appName: string
  path: string
}): Promise<void> => await ipcRenderer.invoke('importGame', args)

export const openAboutWindow = (): void => ipcRenderer.send('showAboutWindow')

export const openDiscordLink = (): void => ipcRenderer.send('openDiscordLink')

export let progress: string

export const sendKill = (appName: string): void =>
  ipcRenderer.send('kill', appName)

export const legendary = async (args: string): Promise<string> =>
  await ipcRenderer
    .invoke('legendary', args)
    .then(async (res: string) => {
      const isError = res.includes('ERROR')
      return isError ? 'error' : 'done'
    })
    .catch((err: string | null) => String(err))

export const isLoggedIn = async (): Promise<void> =>
  await ipcRenderer.invoke('isLoggedIn')

export const syncSaves = async (
  savesPath: string,
  appName: string,
  arg?: string
): Promise<string> => {
  const { user } = await ipcRenderer.invoke('getUserInfo')

  const path = savesPath.replace('~', `/home/${user}`)
  console.log(path)

  const response: string = await ipcRenderer.invoke('syncSaves', [
    arg,
    path,
    appName,
  ])
  return response
}

export const getLegendaryConfig = async (): Promise<{
  user: string
  library: Game[]
}> => {
  const user: string = await readFile('user')
  const library: Array<Game> = await readFile('library')

  if (!user) {
    return { user: '', library: [] }
  }

  return { user, library }
}

const specialCharactersRegex = /('\w)|(\\(\w|\d){5})|(\\"(\\.|[^"])*")|[^((0-9)|(a-z)|(A-Z)|\s)]/g // addeed regex for capturings "'s" + unicodes + remove subtitles in quotes
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
    cleanTitle(game.title),
    game.namespace
  )
  return { ...game, extraInfo }
}

export const handleSavePath = async (game: string) => {
  const { cloudSaveEnabled, saveFolder } = await getGameInfo(game)

  return { cloudSaveEnabled, saveFolder }
}

export const createNewWindow = (url: string) =>
  new BrowserWindow({ width: 1200, height: 700 }).loadURL(url)

export const formatStoreUrl = (title: string, lang: string) => {
  const storeUrl = `https://www.epicgames.com/store/${lang}/product/`
  return `${storeUrl}${cleanTitle(title)}`
}

export function getProgress(progress: InstallProgress): number {
  if (progress && progress.percent) {
    return Number(progress.percent.replace('%', ''))
  }
  return 0
}

export async function fixSaveFolder(
  folder: string,
  prefix: string,
  isProton: boolean
) {
  const { user, epicId } = await ipcRenderer.invoke('getUserInfo')
  const username = isProton ? 'steamuser' : user
  let winePrefix = prefix.replaceAll("'", '')
  winePrefix = isProton ? `${winePrefix}/pfx` : winePrefix

  folder = folder.replace('{EpicID}', epicId)
  folder = folder.replace('{EpicId}', epicId)

  if (folder.includes('locallow')) {
    return folder.replace(
      '{appdata}/../locallow',
      `${winePrefix}/drive_c/users/${username}/AppData/LocalLow`
    )
  }

  if (folder.includes('LocalLow')) {
    return folder.replace(
      '{AppData}/../LocalLow',
      `${winePrefix}/drive_c/users/${username}/AppData/LocalLow`
    )
  }

  if (folder.includes('{UserSavedGames}')) {
    return folder.replace(
      '{UserSavedGames}',
      `${winePrefix}/drive_c/users/${username}/Saved Games`
    )
  }

  if (folder.includes('{usersavedgames}')) {
    return folder.replace(
      '{usersavedgames}',
      `${winePrefix}/drive_c/users/${username}/Saved Games`
    )
  }

  if (folder.includes('roaming')) {
    return folder.replace(
      '{appdata}/../roaming/',
      `${winePrefix}/drive_c/users/${username}/Application Data/`
    )
  }

  if (folder.includes('{appdata}/../Roaming/')) {
    return folder.replace(
      '{appdata}/../Roaming/',
      `${winePrefix}/drive_c/users/${username}/Application Data/`
    )
  }

  if (folder.includes('Roaming')) {
    return folder.replace(
      '{AppData}/../Roaming/',
      `${winePrefix}/drive_c/users/${username}/Application Data/`
    )
  }

  if (folder.includes('{AppData}')) {
    return folder.replace(
      '{AppData}',
      `${winePrefix}/drive_c/users/${username}/Local Settings/Application Data`
    )
  }

  if (folder.includes('{appdata}')) {
    return folder.replace(
      '{appdata}',
      `${winePrefix}/drive_c/users/${username}/Local Settings/Application Data`
    )
  }

  if (folder.includes('{userdir}')) {
    return folder.replace(
      '{userdir}',
      `${winePrefix}/drive_c/users/${username}/My Documents`
    )
  }

  if (folder.includes('{UserDir}')) {
    return folder.replace(
      '{UserDir}',
      `${winePrefix}/drive_c/users/${username}/My Documents`
    )
  }

  return folder
}

export async function handleStopInstallation(
  appName: string,
  [path, folderName]: string[],
  t: TFunction<'gamepage'>
) {
  const { response } = await showMessageBox({
    title: t('gamepage:box.stopInstall.title'),
    message: t('gamepage:box.stopInstall.message'),
    buttons: [
      t('gamepage:box.stopInstall.keepInstalling'),
      t('box.yes'),
      t('box.no'),
    ],
  })
  if (response === 1) {
    return sendKill(appName)
  } else if (response === 2) {
    sendKill(appName)
    return ipcRenderer.send('removeFolder', [path, folderName])
  }
}
