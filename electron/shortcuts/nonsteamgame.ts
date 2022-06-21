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
import { app, dialog, Notification } from 'electron'
import { isFlatpak, tsStore } from '../constants'
import { logError, logInfo, LogPrefix, logWarning } from '../logger/logger'
import i18next from 'i18next'

interface ShortcutsResult {
  success: boolean
  errors: string[]
}

/**
 * Opens a error dialog in frontend with the error message
 * @param props
 */
function showErrorInFrontend(props: {
  gameTitle: string
  error: string
  adding: boolean
}) {
  const body = props.adding
    ? [
        i18next.t('box.error.add.steam.message1', 'Adding of '),
        props.gameTitle,
        i18next.t('box.error.add.steam.message2', ' failed with:'),
        '\n',
        props.error
      ].join('')
    : [
        i18next.t('box.error.remove.steam.message1', 'Could not remove '),
        props.gameTitle,
        i18next.t(
          'box.error.remove.steam.message2',
          ' from one of the steam users!'
        ),
        '\n',
        props.error
      ].join('')

  const title = props.adding
    ? i18next.t('box.error.add.steam.title', 'Adding Error')
    : i18next.t('box.error.remove.steam.title', 'Removing Error')

  dialog.showErrorBox(title, body)
}

/**
 * Opens a notify window in the frontend with given message
 * @param props
 */
function notifyFrontend(props: { message: string; adding: boolean }) {
  const title = props.adding
    ? i18next.t('notify.finished.add.steam', 'Added to steam')
    : i18next.t('notify.finished.remove.steam', 'Removed from steam')

  new Notification({
    body: props.message,
    title
  }).show()
}

/**
 * Check if steam userdata folder exist and return them as a string list.
 * @param steamUserdataDir Path to userdata folder in steam compat folder.
 * @returns All userdata folders as string array and possible error
 */
function checkSteamUserDataDir(steamUserdataDir: string): {
  folders: string[]
  error: string
} {
  if (!existsSync(steamUserdataDir)) {
    return {
      folders: undefined,
      error: `${steamUserdataDir} does not exist. Can't add/remove game to/from steam!`
    }
  }

  const folders = readdirSync(steamUserdataDir, {
    withFileTypes: true
  })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  if (folders.length <= 0) {
    return {
      folders: undefined,
      error: `${steamUserdataDir} does not contain a single directory!`
    }
  }

  return { folders, error: undefined }
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
 * @returns @see ShortcutsResult
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
 * @returns none
 */
async function addNonSteamGame(props: {
  steamUserdataDir: string
  gameInfo: GameInfo
}): Promise<void> {
  const { folders, error } = checkSteamUserDataDir(props.steamUserdataDir)

  if (error) {
    showErrorInFrontend({
      gameTitle: props.gameInfo.title,
      error,
      adding: true
    })
  } else {
    const errors = []
    let added = false
    for (const folder of folders) {
      // skip this folders, because there are no steam user
      if (folder === '0' || folder === 'ac') {
        continue
      }

      const configDir = join(props.steamUserdataDir, folder, 'config')
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
        errors.push(
          `Can't add "${props.gameInfo.title}" to steam user "${folder}". "${shortcutsFile}" is corrupted!`,
          ...checkResult.errors
        )
        continue
      }

      if (checkIfAlreadyAdded(content, props.gameInfo.title) > -1) {
        added = true
        continue
      }

      // add new Entry
      const newEntry = {} as ShortcutEntry
      newEntry.AppName = props.gameInfo.title
      newEntry.Exe = `"${app.getPath('exe')}"`

      if (isFlatpak) {
        newEntry.Exe = `"flatpak"`
      } else if (process.env.APPIMAGE) {
        newEntry.Exe = `"${process.env.APPIMAGE}"`
      }

      newEntry.StartDir = `"${process.cwd()}"`
      await getIcon(props.gameInfo.app_name, props.gameInfo)
        .then((path) => (newEntry.icon = path))
        .catch((error) =>
          logWarning(
            `Couldn't find a icon for ${props.gameInfo.title} with: ${error}`
          )
        )

      newEntry.LaunchOptions = `--no-gui --no-sandbox "heroic://launch/${props.gameInfo.app_name}"`
      if (isFlatpak) {
        newEntry.Exe = `run com.heroicgameslauncher.hgl ${newEntry.LaunchOptions}`
      }
      newEntry.IsHidden = false
      newEntry.AllowDesktopConfig = true
      newEntry.AllowOverlay = true
      newEntry.OpenVR = false
      newEntry.Devkit = false
      newEntry.DevkitOverrideAppID = false

      if (tsStore.has(`${props.gameInfo.app_name}.lastPlayed`)) {
        newEntry.LastPlayTime = tsStore.get(
          `${props.gameInfo.app_name}.lastPlayed`
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
      showErrorInFrontend({
        gameTitle: props.gameInfo.title,
        error: errors.join('\n'),
        adding: true
      })
    }

    if (errors.length === 0) {
      const message = `${props.gameInfo.title} was successfully added to steam.`
      logInfo(message, LogPrefix.Shortcuts)
      notifyFrontend({ message, adding: true })
    } else {
      const message = `${props.gameInfo.title} could not be added to all found steam users. See logs for more info.`
      logWarning(message, LogPrefix.Shortcuts)
      logError(errors.join('\n'), LogPrefix.Shortcuts)
      notifyFrontend({ message, adding: true })
    }
  }
}

/**
 * Removes a non-steam game from steam via editing shortcuts.vdf
 * @param steamUserdataDir Path to steam userdata directory
 * @param gameInfo @see GameInfo of the game to remove
 * @returns none
 */
async function removeNonSteamGame(props: {
  steamUserdataDir: string
  gameInfo: GameInfo
}): Promise<void> {
  const { folders, error } = checkSteamUserDataDir(props.steamUserdataDir)

  if (error) {
    showErrorInFrontend({
      gameTitle: props.gameInfo.title,
      error,
      adding: false
    })
  } else {
    const errors = []
    for (const folder of folders) {
      const configDir = join(props.steamUserdataDir, folder, 'config')
      const shortcutsFile = join(configDir, 'shortcuts.vdf')

      if (!existsSync(configDir) || !existsSync(shortcutsFile)) {
        continue
      }

      // read file
      const content = readShortcutFile(shortcutsFile)
      const checkResult = checkIfShortcutObjectIsValid(content)
      if (!checkResult.success) {
        errors.push(
          `Can't remove "${props.gameInfo.title}" from steam user "${folder}". "${shortcutsFile}" is corrupted!`,
          ...checkResult.errors
        )
        continue
      }

      const index = checkIfAlreadyAdded(content, props.gameInfo.title)

      if (index < 0) {
        continue
      }

      // remove
      content.shortcuts.splice(index, 1)

      // rewrite shortcuts.vdf
      writeShortcutFile(shortcutsFile, content)
    }

    if (errors.length === 0) {
      const message = `${props.gameInfo.title} was successfully removed from steam.`
      logInfo(message, LogPrefix.Shortcuts)
      notifyFrontend({ message, adding: false })
    } else {
      const message = `${props.gameInfo.title} could not be removed from all found steam users. See logs for more info.`
      logWarning(message, LogPrefix.Shortcuts)
      logError(errors.join('\n'), LogPrefix.Shortcuts)
      notifyFrontend({ message, adding: false })
    }
  }
}

export { addNonSteamGame, removeNonSteamGame }
