import { BrowserWindow } from 'electron'
import { LegendaryGame } from './games'

export async function handleProtocol(window : BrowserWindow, url : string) {
  const [scheme, path] = url.split('://')
  if (!url || scheme !== 'heroic' || !path) {
    return
  }
  const [command, appName] = path.split('/')
  console.log(`ProtocolHandler: received '${url}'`)
  if (command === 'ping') {
    return console.log('Received ping!', appName)
  }
  const game = LegendaryGame.get(appName)
  if (command === 'launch') {
    const { is_installed } = await game.getGameInfo()
    if (!is_installed) {
      console.log(`ProtocolHandler: "${appName}" not installed, ignoring launch request.`)
      return
    }
    return window.webContents.send('launchGame', appName)
  }
}
