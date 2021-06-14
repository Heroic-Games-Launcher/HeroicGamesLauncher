import { BrowserWindow, dialog, nativeImage } from 'electron'
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
    const { is_installed, title, art_logo } = await game.getGameInfo()
    if (!is_installed) {
      console.log(`ProtocolHandler: "${arg}" not installed.`)
      const diag = await dialog.showMessageBox(window, {
        buttons: ['OK', 'Not now'],
        cancelId: 1,
        icon: nativeImage.createFromDataURL(art_logo),
        message: `${title} is not installed. Install it now?`,
        title: title
      })
      if (diag.response === 0) {
        game.install(`${process.env.HOME}/Games`)
      }
      if (diag.response === 1) console.log('Not installing game')
      return
    }
    return window.webContents.send('launchGame', arg)
  }
}
