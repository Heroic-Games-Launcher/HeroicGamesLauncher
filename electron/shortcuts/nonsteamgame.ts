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

interface ShortcutsResult {
  success: boolean
  errors: string[]
}

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
function checkIfShortcutObjectIsValid(
  object: Partial<ShortcutObject>
): ShortcutsResult {
  const checkResult = { success: false, errors: [] } as ShortcutsResult
  if (!('shortcuts' in object)) {
    checkResult.errors.push('Could not find entry "shortcuts"!')
  } else if (!Array.isArray(object.shortcuts)) {
    checkResult.errors.push('Entry "shortcuts" is not an array!')
  } else {
    checkResult.success = true
    object.shortcuts.forEach((entry) => {
      if (entry.AppName === undefined) {
        checkResult.errors.push(
          'One of the game entries is missing the AppName parameter!'
        )
        checkResult.success = false
      }

      if (entry.Exe === undefined) {
        checkResult.errors.push(
          'One of the game entries is missing the Exe parameter!'
        )
        checkResult.success = false
      }

      if (entry.LaunchOptions === undefined) {
        checkResult.errors.push(
          'One of the game entries is missing the LaunchOptions parameter!'
        )
        checkResult.success = false
      }
    })
  }

  return checkResult
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
): Promise<ShortcutsResult> {
  const addResult = { success: false, errors: [] } as ShortcutsResult
  const folders = checkSteamUserDataDir(steamUserdataDir)

  for (const folder of folders) {
    // skip this folders, because there are no steam user
    if (folder === '0' || folder === 'ac') {
      continue
    }

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

    const checkResult = checkIfShortcutObjectIsValid(content)
    if (!checkResult.success) {
      addResult.errors.push(
        `Can't add "${gameInfo.title}" to steam user "${folder}". "${shortcutsFile}" is corrupted!`,
        ...checkResult.errors
      )
      continue
    }

    if (checkIfAlreadyAdded(content, gameInfo.title) > -1) {
      addResult.success = true
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

    addResult.success = true
  }

  if (!addResult.success) {
    throw new Error(addResult.errors.join('\n - '))
  }

  return addResult
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
): Promise<ShortcutsResult> {
  const removeResult = { success: false, errors: [] } as ShortcutsResult
  const folders = checkSteamUserDataDir(steamUserdataDir)

  for (const folder of folders) {
    const configDir = join(steamUserdataDir, folder, 'config')
    const shortcutsFile = join(configDir, 'shortcuts.vdf')

    if (!existsSync(configDir) || !existsSync(shortcutsFile)) {
      continue
    }

    // read file
    const content = readShortcutFile(shortcutsFile)
    const checkResult = checkIfShortcutObjectIsValid(content)
    if (!checkResult.success) {
      removeResult.errors.push(
        `Can't remove "${gameInfo.title}" from steam user "${folder}". "${shortcutsFile}" is corrupted!`,
        ...checkResult.errors
      )
      continue
    }

    const index = checkIfAlreadyAdded(content, gameInfo.title)

    if (index < 0) {
      continue
    }

    // remove
    content.shortcuts.splice(index, 1)

    // rewrite shortcuts.vdf
    writeShortcutFile(shortcutsFile, content)

    removeResult.success = true
  }

  return removeResult
}

export { addNonSteamGame, removeNonSteamGame, ShortcutsResult }
