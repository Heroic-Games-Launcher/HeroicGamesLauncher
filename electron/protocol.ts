import { BrowserWindow, dialog } from 'electron'
import { Game } from './games'
import { logInfo } from './logger'
import i18next from 'i18next'
import { checkUpdates } from './updater'

export async function handleProtocol(window: BrowserWindow, url: string) {
  const mainWindow = BrowserWindow.getAllWindows()[0]
  const [scheme, path] = url.split('://')
  if (!url || scheme !== 'heroic' || !path) {
    return
  }
  let [command, arg] = path?.split('/')
  if (!command || !arg) {
    command = path
    arg = null
  }
  logInfo(`ProtocolHandler: received '${url}'`)
  if (command === 'ping') {
    return logInfo('Received ping! Arg:', arg)
  }
  if (command === 'launch') {
    const game = Game.get(arg)
    const { is_installed, title, app_name } = await game.getGameInfo()
    setTimeout(async () => {
      // wait for the frontend to be ready
      if (!is_installed) {
        logInfo(`ProtocolHandler: "${arg}" not installed.`)
        const { response } = await dialog.showMessageBox({
          buttons: [i18next.t('box.yes'), i18next.t('box.no')],
          cancelId: 1,
          message: `${title} ${i18next.t(
            'box.protocol.install.not_installed',
            'Is Not Installed, do you wish to Install it?'
          )}`,
          title: title
        })
        if (response === 0) {
          return window.webContents.send('installGame', app_name)
        }
        if (response === 1) {
          return logInfo('Not installing game')
        }
      }
      mainWindow.hide()
      window.webContents.send('launchGame', arg)
    }, 3000)
  }
  if (command === 'update') {
    checkUpdates()
  }
}
