import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'graceful-fs'
import { homedir } from 'os'
import { join } from 'path'
import { GameInfo } from '../types'
import { getIcon } from './utils'
import { logWarning } from '../logger/logger'

async function addNoneSteamGame(gameInfo: GameInfo): Promise<string> {
  // Todo handle none linux paths
  const userdataDir = join(homedir(), '.steam', 'steam', 'userdata')

  if (!existsSync(userdataDir)) {
    throw new Error(`${userdataDir} does not exist. Can't add game to steam!`)
  }

  // get all folders in userdata folder
  const folders = readdirSync(userdataDir, {
    withFileTypes: true
  })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  if (folders.length <= 0) {
    throw new Error(`${userdataDir} does not contain a single directory!`)
  }

  let added = false

  // special character used by steam
  // see https://www.utf8-chartable.de/unicode-utf8-table.pl?number=128&names=2&utf8=string-literal
  const nullChar = '\x00'
  const backspace = '\x08'
  const startOfHeading = '\x01'
  const startOfText = '\x02'

  for (const folder of folders) {
    const configDir = join(userdataDir, folder, 'config')
    const shortcutsFile = join(configDir, 'shortcuts.vdf')

    if (!existsSync(configDir)) {
      mkdirSync(configDir)
    }

    if (!existsSync(shortcutsFile)) {
      writeFileSync(
        shortcutsFile,
        `${nullChar}shortcuts${nullChar}${backspace}${backspace}`
      )
    }

    // read file and remove last two backspaces
    let content = readFileSync(shortcutsFile).toString().slice(0, -2)

    // structure is from:
    // https://github.com/CorporalQuesadilla/Steam-Shortcut-Manager/wiki/Steam-Shortcuts-Documentation#shortcut-entry-structure
    const appid = `${nullChar}${findLastIndex(content)}${nullChar}`
    const appName = `${startOfHeading}AppName${nullChar}${gameInfo.title}${nullChar}`

    // TODO: handle none flatpak
    const exe = `${startOfHeading}Exe${nullChar}"/usr/bin/flatpak"${nullChar}`
    const startDir = `${startOfHeading}StartDir${nullChar}"${process.cwd()}"${nullChar}`

    let iconPath = ''
    await getIcon(gameInfo.app_name, gameInfo)
      .then((path) => (iconPath = path))
      .catch((error) =>
        logWarning(`Couldn't find a icon for ${gameInfo.title} with: ${error}`)
      )

    const icon = `${startOfHeading}icon${nullChar}${iconPath}${nullChar}`
    const shortcutPath = `${startOfHeading}ShortcutPath${nullChar}${nullChar}`
    const launchOptions = `${startOfHeading}LaunchOptions${nullChar}run --branch=stable --arch=x86_64 --command=heroic-run com.heroicgameslauncher.hgl${nullChar}`
    const isHidden = `${startOfText}IsHidden${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
    const allowDesktopConfig = `${startOfText}AllowDesktopConfig${nullChar}${startOfHeading}${nullChar}${nullChar}${nullChar}`
    const allowOverlay = `${startOfText}AllowOverlay${nullChar}${startOfHeading}${nullChar}${nullChar}${nullChar}`
    const openVR = `${startOfText}OpenVR${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
    const devkit = `${startOfText}Devkit${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
    const devkitGameID = `${startOfHeading}DevkitGameID${nullChar}${nullChar}`
    const devkitOverrideAppID = `${startOfText}DevkitOverrideAppID${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
    const lastPlayTime = `${startOfText}LastPlayTime${nullChar}${nullChar}${nullChar}${nullChar}${nullChar}`
    const tags = `${nullChar}tags${nullChar}`
    const end = `${backspace}${backspace}${backspace}${backspace}`

    content = [
      content,
      appid,
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
    ].join('')

    writeFileSync(shortcutsFile, content)

    added = true
  }

  if (!added) {
    throw new Error(
      "Game was not added, because couldn't find a shortcuts.vdf in one of the userdata/:uid/config folders!"
    )
  }

  return `${gameInfo.title} was succesfully added to steam.`
}

function findLastIndex(fileContent: string): number {
  const indexOfLastId = fileContent.lastIndexOf('AppName')
  return indexOfLastId !== -1
    ? Number(fileContent.charAt(indexOfLastId - 3)) + 1
    : 0
}

export { addNoneSteamGame }
