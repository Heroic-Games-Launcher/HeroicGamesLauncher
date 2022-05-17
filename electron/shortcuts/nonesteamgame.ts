import {
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'graceful-fs'
import { homedir } from 'os'
import { join } from 'path'
import { GameInfo } from '../types'
import { getIcon } from './utils'

async function addNoneSteamGame(gameInfo: GameInfo): Promise<string> {
  return new Promise((resolve, reject) => {
    // Todo handle none linux paths
    const userdataDir = join(homedir(), '.steam', 'steam', 'userdata')

    if (!existsSync(userdataDir)) {
      reject(`${userdataDir} does not exist. Can't add game to steam!`)
    }

    // get all folders in userdata folder
    const folders = readdirSync(userdataDir, {
      withFileTypes: true
    })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)

    if (folders.length <= 0) {
      reject(`${userdataDir} does not contain a single directory!`)
    }

    let added = false

    // special character used by steam
    // see https://www.utf8-chartable.de/unicode-utf8-table.pl?number=128&names=2&utf8=string-literal
    const nullChar = '\x00'
    const backspace = '\x08'
    const startOfHeading = '\x01'
    const startOfText = '\x02'

    for (const folder of folders) {
      const shortcutsFile = join(folder, 'config', 'shortcuts.vdf')

      if (!existsSync(shortcutsFile)) {
        continue
      }

      // read file and remove last two backspaces
      let content = readFileSync(shortcutsFile).toString().slice(0, -2)

      // structure is from:
      // https://github.com/CorporalQuesadilla/Steam-Shortcut-Manager/wiki/Steam-Shortcuts-Documentation#shortcut-entry-structure
      const appName = `${startOfHeading}AppName${nullChar}${gameInfo.app_name}${nullChar}`

      // TODO: handle none flatpak
      const exe = `${startOfHeading}Exe${nullChar}"flatpak run com.heroicgameslauncher.hgl heroic://launch/${gameInfo.app_name}"${nullChar}`
      const startDir = `${startOfHeading}StartDir${nullChar}"${process.cwd()}"${nullChar}`
      const icon = `${startOfHeading}icon${nullChar}"${getIcon(
        gameInfo.app_name,
        gameInfo
      )}"${nullChar}`
      const shortcutPath = `${startOfHeading}ShortcutPath${nullChar}${nullChar}`
      const launchOptions = `${startOfHeading}LaunchOptions${nullChar}${nullChar}`
      const isHidden = `${startOfText}IsHidden${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
      const allowDesktopConfig = `${startOfText}AllowDesktopConfig${nullChar}${startOfHeading}${nullChar}${nullChar}${nullChar}`
      const allowOverlay = `${startOfText}AllowOverlay${nullChar}${startOfHeading}${nullChar}${nullChar}${nullChar}`
      const openVR = `${startOfText}OpenVR${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
      const devkit = `${startOfText}Devkit${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
      const devkitGameID = `${startOfHeading}DevkitGameID${nullChar}${nullChar}`
      const devkitOverrideAppID = `${startOfText}DevkitOverrideAppID${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
      const lastPlayTime = `${startOfText}LastPlayTime${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
      const tags = `${nullChar}tags${nullChar}`
      const end = `${backspace}${backspace}`

      content = [
        content,
        appName,
        exe,
        startDir,
        icon,
        shortcutPath,
        launchOptions,
        isHidden,
        allowDesktopConfig,
        allowOverlay,
        openVR,
        devkit,
        devkitGameID,
        devkitOverrideAppID,
        lastPlayTime,
        tags,
        end
      ].join()

      try {
        writeFileSync(shortcutPath, content)
      } catch (error) {
        reject(
          `Adding ${gameInfo.app_name} to ${shortcutPath} failed with: ${error}`
        )
      }

      added = true
    }

    if (added) {
      resolve(`${gameInfo.app_name} was succesfully added to steam.`)
    } else {
      reject(
        "Game was not added, because couldn't find a shortcuts.vdf in one of the userdata/:uid/config folders!"
      )
    }
  })
}

export { addNoneSteamGame }
