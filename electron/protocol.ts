import { BrowserWindow } from 'electron'
import { Game } from './games'

export async function handleProtocol(window : BrowserWindow, url : string) {
  const [scheme, path] = url.split('://')
  if (!url || scheme !== 'heroic' || !path) {
    return
  }
  const [command, args_string] = path.split('?')
  const args = new Map<string, string>()
  args_string.split(',').forEach((arg) => {
    const [k, v] = arg.split('=')
    args.set(k, v)
  })
  console.log(`ProtocolHandler: received '${url}'`)
  if (command === 'ping') {
    return console.log('Received ping!', args)
  }
  const appName = args.get('appName')
  const game = Game.get(appName)
  if (command === 'launch') {
    const { is_installed } = await game.getGameInfo()
    if (!is_installed) {
      console.log(`ProtocolHandler: "${appName}" not installed, ignoring launch request.`)
      return
    }
    return window.webContents.send('launchGame', appName)
  }
}
