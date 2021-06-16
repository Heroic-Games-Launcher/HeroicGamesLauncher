import { BrowserWindow, dialog } from 'electron'
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
    const { is_installed, title, app_name } = await game.getGameInfo()
    if (!is_installed) {
      console.log(`ProtocolHandler: "${arg}" not installed.`)
      const { response } = await dialog.showMessageBox({
        buttons: [i18next.t('box.yes'), i18next.t('box.no')],
        cancelId: 1,
        message: `${title} ${i18next.t('box.protocol.install.not_installed', 'Is Not Installed, do you wish to Install it?')}`,
        title: title
      })
      if (response === 0) {
        return window.webContents.send('installGame', app_name)
      }
      if (response === 1) {
        return console.log('Not installing game')
      }
    }
    return window.webContents.send('launchGame', arg)
  }
}
