import { app, nativeImage, shell } from 'electron'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rm,
  unlink,
  unlinkSync,
  writeFile,
  writeFileSync
} from 'graceful-fs'
import { IconIcns } from '@shockpkg/icon-encoder'
import { join } from 'path'
import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { GlobalConfig } from '../../config'
import { removeSpecialcharacters } from '../../utils'
import { GameInfo } from 'common/types'
import { isMac, userHome } from '../../constants'
import { GOGLibrary } from '../../gog/library'
import { getIcon } from '../utils'
import { addNonSteamGame } from '../nonesteamgame/nonesteamgame'

/**
 * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
 * so that the game can be opened from the start menu and the desktop folder.
 * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
 * @async
 * @public
 */
async function addShortcuts(gameInfo: GameInfo, fromMenu?: boolean) {
  logInfo(`Adding shortcuts for ${gameInfo.title}`, LogPrefix.Backend)
  const { addDesktopShortcuts, addStartMenuShortcuts, addSteamShortcuts } =
    GlobalConfig.get().getSettings()

  if (addSteamShortcuts) {
    addNonSteamGame({ gameInfo })
  }

  const launchWithProtocol = `heroic://launch/${gameInfo.app_name}`
  const [desktopFile, menuFile] = shortcutFiles(gameInfo.title)
  if (!desktopFile || !menuFile) {
    return
  }

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
    case 'darwin': {
      await generateMacOsApp(gameInfo)
      break
    }
  }
}

/**
 * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
 * @async
 * @public
 */
async function removeShortcuts(gameInfo: GameInfo) {
  const [desktopFile, menuFile] = shortcutFiles(gameInfo.title)

  if (desktopFile) {
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
      desktopFile = join(userHome, 'Applications', `${gameTitle}.app`)
      break
  }

  return [desktopFile, menuFile]
}

async function generateMacOsApp(gameInfo: GameInfo) {
  const { title, app_name } = gameInfo

  logInfo('Generating macOS shortcut', LogPrefix.Backend)

  const appShortcut = join(userHome, 'Applications', `${title}.app`)
  const macOSFolder = `${appShortcut}/Contents/MacOS`
  const resourcesFolder = `${appShortcut}/Contents/Resources`
  const plistFile = `${appShortcut}/Contents/Info.plist`

  // create the .app folder
  if (!existsSync(appShortcut)) {
    mkdirSync(appShortcut, { recursive: true })
  }

  if (!existsSync(resourcesFolder)) {
    mkdirSync(resourcesFolder, { recursive: true })
  }

  // convert the icon to icns
  const isIconIcns = await convertPngToICNS(app_name, gameInfo, resourcesFolder)

  // if the icon was converted, we can continue
  if (isIconIcns) {
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
	<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
	<plist version="1.0">
	<dict>
		<key>CFBundleExecutable</key>
		<string>run.sh</string>
		<key>CFBundleIconFile</key>
		<string>shortcut.icns</string>
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
    // create the macOS folder
    mkdirSync(macOSFolder, { recursive: true })

    // write plist file
    writeFileSync(plistFile, plist)

    // write the run.sh file
    const launchCommand = `${app.getPath(
      'exe'
    )} --no-gui heroic://launch/${app_name}`
    const shortcut = `#!/bin/bash
    # autogenerated file - do not edit
    
      ${launchCommand}  
    `
    writeFileSync(`${macOSFolder}/run.sh`, shortcut)

    // make the run.sh file executable
    chmodSync(`${macOSFolder}/run.sh`, '755')
  } else {
    logError('Error generating MacOS App', LogPrefix.Backend)
    // remove the .app folder
    rm(appShortcut, { recursive: true }, () =>
      logInfo('Temporary MacOS App removed', LogPrefix.Backend)
    )
  }
}

async function convertPngToICNS(
  app_name: string,
  gameInfo: GameInfo,
  dest: string
) {
  try {
    const iconPath = await getIcon(app_name, gameInfo)
    const iconBuffer = readFileSync(iconPath)
    const pngTemp = `${dest}/shortcut.png`
    const temp = nativeImage
      .createFromBuffer(iconBuffer)
      .resize({ width: 512 })
      .crop({ x: 0, y: 0, width: 512, height: 512 })
      .toPNG()

    writeFileSync(pngTemp, temp)

    const shortcut = `${dest}/shortcut.icns`
    const icns = new IconIcns()
    icns.addFromPng(readFileSync(pngTemp), ['ic11'], true)
    writeFileSync(shortcut, icns.encode())
    unlinkSync(pngTemp)

    return true
  } catch (error) {
    logError('Error converting icon to icns', LogPrefix.Backend)
    return false
  }
}

export { removeShortcuts, addShortcuts, shortcutFiles }
