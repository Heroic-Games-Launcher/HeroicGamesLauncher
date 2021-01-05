import { Game } from './types'

const { ipcRenderer, remote } = window.require('electron')
const { BrowserWindow } = remote

const readFile = async (file: string) => 
  await ipcRenderer.invoke('readFile', file)

export const writeConfig = async(data: any) => 
  await ipcRenderer.invoke('writeFile', data)

export const install = (args: string) => 
  ipcRenderer.send('install', args)

export let progress: string;

export const returnedOutput = () => ipcRenderer.on('requestedOutput', (event: any, arg: string) => progress = arg )

export const sendKill = () => ipcRenderer.send('kill')

export const legendary = async (args: string): Promise<any> => await ipcRenderer.invoke('legendary', args)
  .then(async(res: string) => {    
    const isError = res.includes('ERROR')
    return isError ? 'error' : 'done'
  })
  .catch((err: string) => Error(err))

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