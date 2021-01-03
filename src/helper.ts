const { ipcRenderer, remote } = window.require('electron')
const { BrowserWindow } = remote
export interface Game {
  art_cover: string,
  art_square: string,
  app_name: string, 
  executable: string, 
  title: string, 
  version: string, 
  save_path: string, 
  install_size: number, 
  install_path: string,
  developer: string,
  isInstalled: boolean
}

const readFile = async (file: string) => 
  await ipcRenderer.invoke('readFile', file)

export const writeConfig = async(data: any) => 
  await ipcRenderer.invoke('writeFile', data)

export const legendary = async (args: string): Promise<string> => await ipcRenderer.invoke('legendary', args)
  .then((res: string) => console.log(`${res}`))
  .catch((err: string) => console.error({err}))

export const isLoggedIn = async() => await ipcRenderer.invoke('isLoggedIn')

export const getLegendaryConfig = async() => {
  const user: string = await readFile('user')
  const library: Array<Game> = await readFile('library')

  if (!user) {
    return {user: '', library: []}
  }

  return {user, library}
}

export const getGameInfo = async(appName: string) => { 
  const library: Array<Game> = await readFile('library')
  return library.filter(game => game.app_name === appName)[0]
}

export const createNewWindow = (url: string) => new BrowserWindow()
  .loadURL(url)

const storeUrl = 'https://www.epicgames.com/store/en-US/product/'
const specialCharactersRegex = /[^((0-9)|(a-z)|(A-Z)|\s)]/g

export const formatStoreUrl = (title: string) => 
  `${storeUrl}${title.replaceAll(specialCharactersRegex, '').replaceAll(' ', '-')}`.toLowerCase()