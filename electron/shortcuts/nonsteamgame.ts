import {
  writeBuffer,
  parseBuffer,
  ShortcutEntry,
  ShortcutObject
} from 'steam-shortcut-editor'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'graceful-fs'
import { readFileSync } from 'fs-extra'
import { join } from 'path'
import { GameInfo } from '../types'
import { getIcon } from './utils'
import { app } from 'electron'
import { isFlatpak, tsStore } from '../constants'
import { logWarning } from '../logger/logger'

/**
 * Check if steam userdata folder exist and return them as a string list.
 * @param steamUserdataDir Path to userdata folder in steam compat folder.
 * @returns All userdata folders as string array
 * @throws @see Error if folders are not existing.
 */
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

/**
 * Reads the content of shortcuts.vdf and parse it into @see ShortcutObject via
 * steam-shortcut-editor
 * @param file Path to shortcuts.vdf
 * @returns @see Partial<ShortcutObject>
 */
function readShortcutFile(file: string): Partial<ShortcutObject> {
  const content = readFileSync(file)

  return parseBuffer(content, {
    autoConvertArrays: true,
    autoConvertBooleans: true,
    dateProperties: ['LastPlayTime']
  })
}

/**
 * Writes given object (@see ShortcutObject) into given shortcuts.vdf.
 * steam-shortcut-editor is used to parse the Object to steam binary layout.
 * @param file Path to shortcuts.vdf
 * @param object @see Partial<ShortcutObject>
 * @returns none
 */
function writeShortcutFile(file: string, object: Partial<ShortcutObject>) {
  const buffer = writeBuffer(object)
  writeFileSync(file, buffer)
}

/**
 * Check if the parsed object of a shortcuts.vdf is valid.
 * @param object @see Partial<ShortcutObject>
 * @returns boolean
 */
const checkIfShortcutObjectIsValid = (object: Partial<ShortcutObject>) => {
  if (object.shortcuts === undefined) {
    return false
  }

  let valid = true
  object.shortcuts.forEach((entry) => {
    if (
      entry.AppName === undefined ||
      entry.Exe === undefined ||
      entry.LaunchOptions === undefined
    ) {
      valid = false
    }
  })

  return valid
}

/**
 * Check if a game is already added.
 * @param object @see Partial<ShortcutObject>
 * @param title Title of the game
 * @returns Index of the found title, else if not found -1
 */
const checkIfAlreadyAdded = (object: Partial<ShortcutObject>, title: string) =>
  object.shortcuts.findIndex((entry) => entry.AppName === title)

/**
 * Adds a non-steam game to steam via editing shortcuts.vdf
 * @param steamUserdataDir Path to steam userdata directory
 * @param gameInfo @see GameInfo of the game to add
 * @returns Success message
 * @throws @see Error on failure
 */
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
      writeShortcutFile(shortcutsFile, { shortcuts: [] })
    }

    // read file
    const content = readShortcutFile(shortcutsFile)

    if (!checkIfShortcutObjectIsValid(content)) {
      throw new Error(
        `${shortcutsFile} is corrupted! Can't add ${gameInfo.title} to steam.`
      )
    }

    if (checkIfAlreadyAdded(content, gameInfo.title) > -1) {
      added = true
      continue
    }

    // add new Entry
    const newEntry = {} as ShortcutEntry
    newEntry.AppName = gameInfo.title
    newEntry.Exe = `"${app.getPath('exe')}"`

    if (isFlatpak) {
      newEntry.Exe = '"flatpak run com.heroicgameslauncher.hgl"'
    } else if (process.env.APPIMAGE) {
      newEntry.Exe = `"${process.env.APPIMAGE}"`
    }

    newEntry.StartDir = `"${process.cwd()}"`
    await getIcon(gameInfo.app_name, gameInfo)
      .then((path) => (newEntry.icon = path))
      .catch((error) =>
        logWarning(`Couldn't find a icon for ${gameInfo.title} with: ${error}`)
      )

    newEntry.LaunchOptions = `--no-gui --no-sandbox "heroic://launch/${gameInfo.app_name}"`
    newEntry.IsHidden = false
    newEntry.AllowDesktopConfig = true
    newEntry.AllowOverlay = true
    newEntry.OpenVR = false
    newEntry.Devkit = false
    newEntry.DevkitOverrideAppID = false

    if (tsStore.has(`${gameInfo.app_name}.lastPlayed`)) {
      newEntry.LastPlayTime = tsStore.get(
        `${gameInfo.app_name}.lastPlayed`
      ) as Date
    } else {
      newEntry.LastPlayTime = new Date()
    }

    content.shortcuts.push(newEntry)

    // rewrite shortcuts.vdf
    writeShortcutFile(shortcutsFile, content)

    added = true
  }

  if (!added) {
    throw new Error(
      "Game was not added, because couldn't find a shortcuts.vdf in one of the userdata/:uid/config folders!"
    )
  }

  return `${gameInfo.title} was succesfully added to steam.`
}

/**
 * Removes a non-steam game from steam via editing shortcuts.vdf
 * @param steamUserdataDir Path to steam userdata directory
 * @param gameInfo @see GameInfo of the game to remove
 * @returns Success message
 * @throws @see Error on failure
 */
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
    const content = readShortcutFile(shortcutsFile)

    if (!checkIfShortcutObjectIsValid(content)) {
      throw new Error(
        `${shortcutsFile} is corrupted! Can't remove ${gameInfo.title} from steam.`
      )
    }

    const index = checkIfAlreadyAdded(content, gameInfo.title)

    if (index < 0) {
      continue
    }

    // remove
    content.shortcuts.splice(index, 1)

    // rewrite shortcuts.vdf
    writeShortcutFile(shortcutsFile, content)
  }

  return `${gameInfo.title} was succesfully removed from steam.`
}

export { addNonSteamGame, removeNonSteamGame }
