import { BrowserWindow, dialog } from 'electron'
import { Game } from './games'
import { logError, logInfo, LogPrefix } from './logger/logger'
import i18next from 'i18next'

export async function handleProtocol(window: BrowserWindow, args: string[]) {
  // Figure out which argv element is our protocol
  let url = ''
  args.forEach((val) => {
    if (val.startsWith('heroic://')) {
      url = val
    }
  })

  const [scheme, path] = url.split('://')
  if (!url || scheme !== 'heroic' || !path) {
    return
  }
  let [command, arg] = path.split('/')
  if (!command || !arg) {
    command = path
    arg = null
  }

  logInfo(`received '${url}'`, { prefix: LogPrefix.ProtocolHandler })

  if (command === 'ping') {
    return logInfo(['Received ping! Arg:', arg], {
      prefix: LogPrefix.ProtocolHandler
    })
  }

  if (command === 'launch') {
    const game =
      Game.get(arg, 'legendary').getGameInfo() ||
      Game.get(arg, 'gog').getGameInfo()

    if (!game) {
      return logError(`Could not receive game data for ${arg}!`, {
        prefix: LogPrefix.ProtocolHandler
      })
    }

    const { is_installed, title, app_name, runner } = game
    if (!is_installed) {
      logInfo(`"${arg}" not installed.`, { prefix: LogPrefix.ProtocolHandler })
      const { response } = await dialog.showMessageBox(window, {
        buttons: [i18next.t('box.yes'), i18next.t('box.no')],
        cancelId: 1,
        message: `${title} ${i18next.t(
          'box.protocol.install.not_installed',
          'Is Not Installed, do you wish to Install it?'
        )}`,
        title: title
      })
      if (response === 0) {
        const { filePaths, canceled } = await dialog.showOpenDialog({
          buttonLabel: i18next.t('box.choose'),
          properties: ['openDirectory'],
          title: i18next.t('install.path', 'Select Install Path')
        })
        if (canceled) {
          return
        }
        if (filePaths[0]) {
          return window.webContents.send('installGame', {
            appName: app_name,
            runner,
            installPath: filePaths[0]
          })
        }
      }
      if (response === 1) {
        return logInfo('Not installing game', {
          prefix: LogPrefix.ProtocolHandler
        })
      }
    }
    window.hide()
    window.webContents.send('launchGame', arg, runner)
  }
}
