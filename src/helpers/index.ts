import { GameInfo, InstallInfo, InstallProgress } from 'src/types'
import { IpcRenderer } from 'electron'
import { install, launch, repair, updateGame } from './library'
const { ipcRenderer } = window.require('electron') as {
  ipcRenderer: IpcRenderer
}

const readFile = async (file: string) =>
  await ipcRenderer.invoke('readConfig', file)

const writeConfig = async (
  data: [appName: string, x: unknown]
): Promise<void> => await ipcRenderer.invoke('writeConfig', data)

const notify = ([title, message]: [title: string, message: string]): void =>
  ipcRenderer.send('Notify', [title, message])

const loginPage = (): void => ipcRenderer.send('openLoginPage')

const getPlatform = async () => await ipcRenderer.invoke('getPlatform')

const sidInfoPage = (): void => ipcRenderer.send('openSidInfoPage')

const handleKofi = (): void => ipcRenderer.send('openSupportPage')

const handleQuit = (): void => ipcRenderer.send('quit')

const openAboutWindow = (): void => ipcRenderer.send('showAboutWindow')

const openDiscordLink = (): void => ipcRenderer.send('openDiscordLink')

let progress: string

const sendKill = (appName: string): Promise<void> =>
  ipcRenderer.invoke('kill', appName)

/**
 * Deprecated API to spawn a subprocess with a legendary command.
 *
 * @param args
 * @returns Return code. ('error' or 'done')
 * @deprecated Avoid using, old code will be migrated.
 */
const legendary = async (args: string): Promise<string> =>
  await ipcRenderer
    .invoke('legendary', args)
    .then(async (res: string) => {
      const isError = res.includes('ERROR')
      return isError ? 'error' : 'done'
    })
    .catch((err: string | null) => String(err))

const isLoggedIn = async (): Promise<void> =>
  await ipcRenderer.invoke('isLoggedIn')

const syncSaves = async (
  savesPath: string,
  appName: string,
  arg?: string
): Promise<string> => {
  const { user } = await ipcRenderer.invoke('getUserInfo')
  const path = savesPath.replace('~', `/home/${user}`)

  const response: string = await ipcRenderer.invoke('syncSaves', [
    arg,
    path,
    appName
  ])
  return response
}

const getLegendaryConfig = async (): Promise<{
  library: GameInfo[]
  user: string
}> => {
  const user: string = await readFile('user')
  const library: Array<GameInfo> = await readFile('library')

  if (!user) {
    return { library: [], user: '' }
  }

  return { library, user }
}

const specialCharactersRegex =
  /('\w)|(\\(\w|\d){5})|(\\"(\\.|[^"])*")|[^((0-9)|(a-z)|(A-Z)|\s)]/g // addeed regex for capturings "'s" + unicodes + remove subtitles in quotes
const cleanTitle = (title: string) =>
  title
    .replaceAll(specialCharactersRegex, '')
    .replaceAll(' ', '-')
    .replaceAll('®', '')
    .toLowerCase()
    .split('--definitive')[0]

const getGameInfo = async (appName: string): Promise<GameInfo> => {
  return await ipcRenderer.invoke('getGameInfo', appName)
}

const getInstallInfo = async (appName: string): Promise<InstallInfo> => {
  return await ipcRenderer.invoke('getInstallInfo', appName)
}

const handleSavePath = async (game: string) => {
  const { cloud_save_enabled, save_folder } = await getGameInfo(game)

  return { cloud_save_enabled, save_folder }
}

const createNewWindow = (url: string) =>
  ipcRenderer.send('createNewWindow', url)

const formatStoreUrl = (title: string, lang: string) => {
  const storeUrl = `https://www.epicgames.com/store/${lang}/product/`
  return `${storeUrl}${cleanTitle(title)}`
}

function getProgress(progress: InstallProgress): number {
  if (progress && progress.percent) {
    return Number(progress.percent.replace('%', ''))
  }
  return 0
}

async function fixSaveFolder(
  folder: string,
  prefix: string,
  isProton: boolean
) {
  const { user, account_id: epicId } = await ipcRenderer.invoke('getUserInfo')
  const username = isProton ? 'steamuser' : user
  const platform = await getPlatform()
  const isWin = platform === 'win32'
  let winePrefix = !isWin && prefix ? prefix.replaceAll("'", '') : ''
  winePrefix = isProton ? `${winePrefix}/pfx` : winePrefix
  const driveC = isWin ? 'C:' : `${winePrefix}/drive_c`

  folder = folder.replace('{EpicID}', epicId)
  folder = folder.replace('{EpicId}', epicId)

  if (folder.includes('locallow')) {
    return folder.replace(
      '{appdata}/../locallow',
      `${driveC}/users/${username}/AppData/LocalLow`
    )
  }

  if (folder.includes('LocalLow')) {
    return folder.replace(
      '{AppData}/../LocalLow',
      `${driveC}/users/${username}/AppData/LocalLow`
    )
  }

  if (folder.includes('{UserSavedGames}')) {
    return folder.replace(
      '{UserSavedGames}',
      `${driveC}/users/${username}/Saved Games`
    )
  }

  if (folder.includes('{usersavedgames}')) {
    return folder.replace(
      '{usersavedgames}',
      `${driveC}/users/${username}/Saved Games`
    )
  }

  if (folder.includes('roaming')) {
    return folder.replace(
      '{appdata}/../roaming',
      `${driveC}/users/${username}/Application Data`
    )
  }

  if (folder.includes('{appdata}/../Roaming/')) {
    return folder.replace(
      '{appdata}/../Roaming',
      `${driveC}/users/${username}/Application Data`
    )
  }

  if (folder.includes('Roaming')) {
    return folder.replace(
      '{AppData}/../Roaming',
      `${driveC}/users/${username}/Application Data`
    )
  }

  if (folder.includes('{AppData}')) {
    return folder.replace(
      '{AppData}',
      `${driveC}/users/${username}/Local Settings/Application Data`
    )
  }

  if (folder.includes('{appdata}')) {
    return folder.replace(
      '{appdata}',
      `${driveC}/users/${username}/Local Settings/Application Data`
    )
  }

  if (folder.includes('{userdir}')) {
    return folder.replace('{userdir}', `/users/${username}/My Documents`)
  }

  if (folder.includes('{UserDir}')) {
    return folder.replace(
      '{UserDir}',
      `${driveC}/users/${username}/My Documents`
    )
  }

  return folder
}

export {
  createNewWindow,
  fixSaveFolder,
  formatStoreUrl,
  getGameInfo,
  getInstallInfo,
  getLegendaryConfig,
  getPlatform,
  getProgress,
  handleKofi,
  handleQuit,
  handleSavePath,
  install,
  isLoggedIn,
  launch,
  legendary,
  loginPage,
  notify,
  openAboutWindow,
  openDiscordLink,
  progress,
  repair,
  sendKill,
  sidInfoPage,
  syncSaves,
  updateGame,
  writeConfig
}
