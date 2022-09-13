import { app, shell } from 'electron'
import { unlink, writeFile } from 'graceful-fs'
import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { GlobalConfig } from '../../config'
import { getGame, removeSpecialcharacters } from '../../utils'
import { Runner, GameInfo } from 'common/types'
import { userHome } from '../../constants'
import { GOGLibrary } from '../../gog/library'
import { getIcon } from '../utils'

/**
 * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
 * so that the game can be opened from the start menu and the desktop folder.
 * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
 * @async
 * @public
 */
async function addShortcuts(gameInfo: GameInfo, fromMenu?: boolean) {
  if (process.platform === 'darwin') {
    return
  }

  const launchWithProtocol = `heroic://launch/${gameInfo.app_name}`
  const [desktopFile, menuFile] = shortcutFiles(gameInfo.title)
  if (!desktopFile || !menuFile) {
    return
  }
  const { addDesktopShortcuts, addStartMenuShortcuts } =
    await GlobalConfig.get().getSettings()

  switch (process.platform) {
    case 'linux': {
      const icon = await getIcon(gameInfo.app_name, gameInfo)
      const shortcut = `[Desktop Entry]
Name=${removeSpecialcharacters(gameInfo.title)}
Exec=xdg-open ${launchWithProtocol}
Terminal=false
Type=Application
Icon=${icon}
Categories=Game;
`

      if (addDesktopShortcuts || fromMenu) {
        //777 = -rwxrwxrwx
        writeFile(desktopFile, shortcut, { mode: 0o777 }, () => {
          logInfo(`Shortcut saved on ${desktopFile}`, {
            prefix: LogPrefix.Backend
          })
        })
      }
      if (addStartMenuShortcuts || fromMenu) {
        writeFile(menuFile, shortcut, () => {
          logInfo(`Shortcut saved on ${menuFile}`, {
            prefix: LogPrefix.Backend
          })
        })
      }
      break
    }
    case 'win32': {
      let executable = gameInfo.install.executable
      if (gameInfo.runner === 'gog') {
        executable = GOGLibrary.get().getExecutable(gameInfo.app_name)
      }
      const icon = `${gameInfo.install.install_path}\\${executable}`

      const shortcutOptions = {
        target: launchWithProtocol,
        icon,
        iconIndex: 0
      }

      if (addDesktopShortcuts || fromMenu) {
        shell.writeShortcutLink(desktopFile, shortcutOptions)
      }

      if (addStartMenuShortcuts || fromMenu) {
        shell.writeShortcutLink(menuFile, shortcutOptions)
      }
      break
    }
    default:
      logError("Shortcuts haven't been implemented in the current platform.", {
        prefix: LogPrefix.Backend
      })
  }
}

/**
 * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
 * @async
 * @public
 */
async function removeShortcuts(appName: string, runner: Runner) {
  const gameInfo = getGame(appName, runner).getGameInfo()
  const [desktopFile, menuFile] = shortcutFiles(gameInfo.title)

  if (desktopFile) {
    unlink(desktopFile, () =>
      logInfo('Desktop shortcut removed', { prefix: LogPrefix.Backend })
    )
  }
  if (menuFile) {
    unlink(menuFile, () =>
      logInfo('Applications shortcut removed', { prefix: LogPrefix.Backend })
    )
  }
}

function shortcutFiles(gameTitle: string) {
  let desktopFile
  let menuFile

  switch (process.platform) {
    case 'linux': {
      desktopFile = `${app.getPath('desktop')}/${gameTitle}.desktop`
      menuFile = `${userHome}/.local/share/applications/${gameTitle}.desktop`
      break
    }
    case 'win32': {
      desktopFile = `${app.getPath('desktop')}\\${gameTitle}.lnk`
      menuFile = `${app.getPath(
        'appData'
      )}\\Microsoft\\Windows\\Start Menu\\Programs\\${gameTitle}.lnk`
      break
    }
    default:
      logError("Shortcuts haven't been implemented in the current platform.", {
        prefix: LogPrefix.Backend
      })
  }

  return [desktopFile, menuFile]
}

export { removeShortcuts, addShortcuts, shortcutFiles }
