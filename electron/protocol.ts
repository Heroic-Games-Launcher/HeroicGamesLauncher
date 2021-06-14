import { BrowserWindow } from 'electron'
import { Game } from './games'

export async function handleProtocol(window : BrowserWindow, url : string) {
  const [scheme, path] = url.split('://')
  if (!url || scheme !== 'heroic' || !path) {
    return
  }
  let [command, arg] = path?.split('/')
  if (!command || !arg) {
    command = path
    arg = null
  }
  console.log(`ProtocolHandler: received '${url}'`)
  if (command === 'ping') {
    return console.log('Received ping! Arg:', arg)
  }
  if (command === 'launch') {
    const game = Game.get(arg)
    const { is_installed } = await game.getGameInfo()
    if (!is_installed) {
      console.log(`ProtocolHandler: "${arg}" not installed, ignoring launch request.`)
      return
    }
    return window.webContents.send('launchGame', arg)
  }
}
