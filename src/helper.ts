const { ipcRenderer, remote } = window.require('electron')
const { BrowserWindow } = remote

export const legendary = async (args: Array<string>): Promise<string> => await ipcRenderer.invoke('legendary', args)
  .then((res: string) => console.log(`${res}`))
  .catch((err: string) => console.error({err}))

const readFile = async (file: string) => await ipcRenderer.invoke('readFile', file).then((res: string) => res)

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

export const getLegendaryConfig = async() => {
  const user: string = await readFile('user')

  if (!user) {
    return null

  }
  const library: Array<Game> = await readFile('library')
  return {user, library}
}

export const getGameInfo = async(appName: string) => { 
  const library: Array<Game> = await readFile('library')
  return library.filter(game => game.app_name === appName)[0]
}

export const createNewWindow = (url: string) => new BrowserWindow().loadURL(url)
