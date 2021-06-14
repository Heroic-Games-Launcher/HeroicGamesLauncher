import { BrowserWindow, dialog, nativeImage } from 'electron'
import { Game } from './games'
import i18next from 'i18next'

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
    const { is_installed, title, art_logo, app_name } = await game.getGameInfo()
    if (!is_installed) {
      console.log(`ProtocolHandler: "${arg}" not installed.`)
      const diag = await dialog.showMessageBox(window, {
        buttons: [i18next.t('box.yes'), i18next.t('box.no')],
        cancelId: 1,
        icon: nativeImage.createFromDataURL(art_logo),
        message: `${title} ${i18next.t('box.protocol.install.not_installed')}`,
        title: title
      })
      if (diag.response === 0) {
        window.webContents.send('install', app_name)
      }
      if (diag.response === 1) console.log('Not installing game')
      return
    }
    return window.webContents.send('launchGame', arg)
  }
}
