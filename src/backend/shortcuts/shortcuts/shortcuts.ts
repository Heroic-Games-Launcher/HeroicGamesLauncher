import { app, nativeImage, shell } from 'electron'
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  rm,
  rmSync,
  unlink,
  utimesSync,
  writeFile,
  writeFileSync
} from 'graceful-fs'
import { IconIcns } from '@shockpkg/icon-encoder'
import { join } from 'path'
import { logError, logInfo, LogPrefix } from 'backend/logger'
import { GlobalConfig } from '../../config'
import { GameInfo } from 'common/types'
import { getIcon } from '../utils'
import { addNonSteamGame } from '../nonesteamgame/nonesteamgame'
import { buildMacOsShortcutLaunchCommand } from './macos_shortcut'
import sanitize from 'sanitize-filename'
import { libraryManagerMap } from 'backend/storeManagers'
import { isMac } from 'backend/constants/environment'
import { userHome } from 'backend/constants/paths'
import type { Game } from 'common/types/game_manager'

/**
 * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
 * so that the game can be opened from the start menu and the desktop folder.
 * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
 * @async
 * @public
 */
async function addShortcuts(game: Game, fromMenu?: boolean) {
  const gameInfo = game.getGameInfo()
  if (gameInfo.install.is_dlc) return

  const { app_name, runner, title } = gameInfo

  logInfo(`Adding shortcuts for ${title}`, LogPrefix.Backend)
  const { addDesktopShortcuts, addStartMenuShortcuts, addSteamShortcuts } =
    GlobalConfig.get().getSettings()

  if (addSteamShortcuts) {
    addNonSteamGame(game)
  }

  const launchWithProtocol = `heroic://launch?appName=${app_name}&runner=${runner}`
  const [desktopFile, menuFile] = shortcutFiles(gameInfo.title)
  if (!desktopFile || !menuFile) {
    return
  }

  switch (process.platform) {
    case 'linux': {
      const icon = await getIcon(gameInfo.app_name, gameInfo)
      const shortcut = `[Desktop Entry]
Name=${gameInfo.title}
Exec=xdg-open ${launchWithProtocol}
Terminal=false
Type=Application
Icon=${icon}
Categories=Game;
`

      if (addDesktopShortcuts || fromMenu) {
        //777 = -rwxrwxrwx
        writeFile(desktopFile, shortcut, { mode: 0o777 }, () => {
          logInfo(`Shortcut saved on ${desktopFile}`, LogPrefix.Backend)
        })
      }
      if (addStartMenuShortcuts || fromMenu) {
        writeFile(menuFile, shortcut, () => {
          logInfo(`Shortcut saved on ${menuFile}`, LogPrefix.Backend)
        })
      }
      break
    }
    case 'win32': {
      const shortcutOptions: Electron.ShortcutDetails = {
        target: launchWithProtocol
      }
      let executable = gameInfo.install.executable
      if (gameInfo.runner === 'gog') {
        executable = libraryManagerMap['gog'].getExecutable(gameInfo.app_name)
      }
      if (executable) {
        let icon: string
        if (
          'install_path' in gameInfo.install &&
          gameInfo.install.install_path
        ) {
          icon = join(gameInfo.install.install_path, executable)
        } else {
          icon = executable
        }
        shortcutOptions.icon = icon
        shortcutOptions.iconIndex = 0
      }

      if (addDesktopShortcuts || fromMenu) {
        shell.writeShortcutLink(desktopFile, shortcutOptions)
      }

      if (addStartMenuShortcuts || fromMenu) {
        shell.writeShortcutLink(menuFile, shortcutOptions)
      }
      break
    }
    case 'darwin': {
      if (addStartMenuShortcuts || fromMenu) {
        await generateMacOsApp(gameInfo)
      }
      break
    }
  }
}

/**
 * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
 * @async
 * @public
 */
async function removeShortcuts(game: Game) {
  const gameInfo = game.getGameInfo()
  if (gameInfo.install.is_dlc) return

  const [desktopFile, menuFile] = shortcutFiles(gameInfo.title)

  if (desktopFile && !isMac) {
    unlink(desktopFile, () =>
      logInfo('Desktop shortcut removed', LogPrefix.Backend)
    )
  }

  if (menuFile) {
    if (isMac) {
      rm(menuFile, { recursive: true, force: true }, () =>
        logInfo('Applications shortcut removed', LogPrefix.Backend)
      )
      return
    }
    unlink(menuFile, () =>
      logInfo('Applications shortcut removed', LogPrefix.Backend)
    )
  }
}

function shortcutFiles(gameTitle: string) {
  let desktopFile
  let menuFile

  gameTitle = sanitize(gameTitle)

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
    case 'darwin':
      menuFile = join(userHome, 'Applications', `${gameTitle}.app`)
      desktopFile = menuFile
      break
  }

  return [desktopFile, menuFile]
}

async function generateMacOsApp(gameInfo: GameInfo) {
  const { app_name, runner } = gameInfo

  logInfo('Generating macOS shortcut', LogPrefix.Backend)

  // shortcutFiles => [desktop, menu] on mac, we don't add desktop shortcut
  const appShortcut = shortcutFiles(gameInfo.title)[1]
  if (!appShortcut) return
  const macOSFolder = `${appShortcut}/Contents/MacOS`
  const resourcesFolder = `${appShortcut}/Contents/Resources`
  const plistFile = `${appShortcut}/Contents/Info.plist`

  mkdirSync(macOSFolder, { recursive: true })
  mkdirSync(resourcesFolder, { recursive: true })

  // A shortcut without the game's icon still launches the game
  const hasIcon = await convertPngToICNS(app_name, gameInfo, resourcesFolder)
  const iconEntry = hasIcon
    ? `
		<key>CFBundleIconFile</key>
		<string>shortcut.icns</string>`
    : ''

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
	<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
	<plist version="1.0">
	<dict>
		<key>CFBundleExecutable</key>
		<string>run.sh</string>${iconEntry}
		<key>CFBundleInfoDictionaryVersion</key>
		<string>1.0</string>
		<key>CFBundlePackageType</key>
		<string>APPL</string>
		<key>CFBundleSignature</key>
		<string>????</string>
		<key>CFBundleVersion</key>
		<string>1.0</string>
	</dict>
	</plist>
  `
  writeFileSync(plistFile, plist)

  const launchCommand = buildMacOsShortcutLaunchCommand(
    app.getPath('exe'),
    app_name,
    runner
  )
  const shortcut = `#!/bin/bash
    # autogenerated file - do not edit

      ${launchCommand}
    `
  writeFileSync(`${macOSFolder}/run.sh`, shortcut)
  chmodSync(`${macOSFolder}/run.sh`, '755')

  // Finder shows the bundle's old icon until the bundle's date changes
  const now = new Date()
  utimesSync(appShortcut, now, now)
}

async function convertPngToICNS(
  app_name: string,
  gameInfo: GameInfo,
  dest: string
) {
  const icnsFile = `${dest}/shortcut.icns`
  try {
    const iconPath = await getIcon(app_name, gameInfo)
    const image = nativeImage.createFromBuffer(readFileSync(iconPath))
    if (image.isEmpty()) {
      throw new Error(`Can't read the image at ${iconPath}`)
    }

    // Cover art has its title at the top, so keep the top of portrait art
    const { width, height } = image.getSize()
    const side = Math.min(width, height)
    const png = image
      .crop({
        x: Math.floor((width - side) / 2),
        y: 0,
        width: side,
        height: side
      })
      .resize({ width: 512, height: 512, quality: 'best' })
      .toPNG()

    const icns = new IconIcns()
    // 512x512 at 1x and 256x256 at 2x
    icns.addFromPng(png, ['ic09', 'ic14'], true)
    writeFileSync(icnsFile, icns.encode())
    return true
  } catch (error) {
    logError(['Error converting icon to icns:', error], LogPrefix.Backend)
    rmSync(icnsFile, { force: true })
    return false
  }
}

export { removeShortcuts, addShortcuts, shortcutFiles }
