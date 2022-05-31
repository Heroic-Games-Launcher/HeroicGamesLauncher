import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'graceful-fs'
import { join } from 'path'
import { GameInfo } from '../types'
import { getIcon } from './utils'
import { logWarning } from '../logger/logger'
import { app } from 'electron'
import { isFlatpak } from '../constants'

// special character used by steam
// see https://www.utf8-chartable.de/unicode-utf8-table.pl?number=128&names=2&utf8=string-literal
const nullChar = '\x00'
const backspace = '\x08'
const startOfHeading = '\x01'
const startOfText = '\x02'

function checkSteamUserDataDir(steamUserdataDir: string): string[] {
  if (!existsSync(steamUserdataDir)) {
    throw new Error(
      `${steamUserdataDir} does not exist. Can't add/remove game to/from steam!`
    )
  }

  const folders = readdirSync(steamUserdataDir, {
    withFileTypes: true
  })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  if (folders.length <= 0) {
    throw new Error(`${steamUserdataDir} does not contain a single directory!`)
  }

  return folders
}

async function addNonSteamGame(
  steamUserdataDir: string,
  gameInfo: GameInfo
): Promise<string> {
  const folders = checkSteamUserDataDir(steamUserdataDir)

  let added = false

  for (const folder of folders) {
    const configDir = join(steamUserdataDir, folder, 'config')
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

    if (content.includes(gameInfo.title)) {
      added = true
      continue
    }

    // structure is from:
    // https://github.com/CorporalQuesadilla/Steam-Shortcut-Manager/wiki/Steam-Shortcuts-Documentation#shortcut-entry-structure
    const appid = `${nullChar}${nullChar}`
    const appName = `${startOfHeading}AppName${nullChar}${gameInfo.title}${nullChar}`

    let exe = `${startOfHeading}Exe${nullChar}"${app.getPath(
      'exe'
    )}"${nullChar}`

    if (isFlatpak) {
      exe = `${startOfHeading}Exe${nullChar}"flatpak run com.heroicgameslauncher.hgl"${nullChar}`
    }

    const startDir = `${startOfHeading}StartDir${nullChar}"${process.cwd()}"${nullChar}`

    let iconPath = ''
    await getIcon(gameInfo.app_name, gameInfo)
      .then((path) => (iconPath = path))
      .catch((error) =>
        logWarning(`Couldn't find a icon for ${gameInfo.title} with: ${error}`)
      )

    const icon = `${startOfHeading}icon${nullChar}${iconPath}${nullChar}`
    const shortcutPath = `${startOfHeading}ShortcutPath${nullChar}${nullChar}`
    const launchOptions = `${startOfHeading}LaunchOptions${nullChar}--no-gui "heroic://launch/${gameInfo.app_name}"${nullChar}`
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

async function removeNonSteamGame(
  steamUserdataDir: string,
  gameInfo: GameInfo
): Promise<string> {
  const folders = checkSteamUserDataDir(steamUserdataDir)

  for (const folder of folders) {
    const configDir = join(steamUserdataDir, folder, 'config')
    const shortcutsFile = join(configDir, 'shortcuts.vdf')

    if (!existsSync(configDir) || !existsSync(shortcutsFile)) {
      continue
    }

    // read file
    let content = readFileSync(shortcutsFile).toString()

    if (!content.includes(gameInfo.title)) {
      continue
    }

    let start = content.indexOf(gameInfo.title)
    const end = content.indexOf(backspace, start) + 2

    if (start < 30) {
      start = content.indexOf(`cuts${nullChar}`) + 5
    } else {
      start = content.lastIndexOf(backspace, start) + 1
    }

    content = [content.slice(0, start), content.slice(end)].join('')

    writeFileSync(shortcutsFile, content)
  }

  return `${gameInfo.title} was succesfully removed from steam.`
}

export { addNonSteamGame, removeNonSteamGame }
