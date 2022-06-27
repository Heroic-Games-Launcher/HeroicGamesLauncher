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
    ? i18next.t('box.error.add.steam.body', {
        defaultValue:
          'Adding {{game}} to Steam failed with:{{newLine}} {{error}}',
        game: props.gameTitle,
        newLine: '\n',
        error: props.error
      })
    : i18next.t('box.error.remove.steam.body', {
        defaultValue:
          'Removing {{game}} from Steam failed with:{{newLine}} {{error}}',
        game: props.gameTitle,
        newLine: '\n',
        error: props.error
      })

  const title = props.adding
    ? i18next.t('box.error.add.steam.title', 'Error Adding Game to Steam')
    : i18next.t(
        'box.error.remove.steam.title',
        'Error Removing Game from Steam'
      )

  dialog.showErrorBox(title, body)
}

/**
 * Opens a notify window in the frontend with given message
 * @param props
 */
function notifyFrontend(props: { message: string; adding: boolean }) {
  const title = props.adding
    ? i18next.t('notify.finished.add.steam.title', 'Added to Steam')
    : i18next.t('notify.finished.remove.steam.title', 'Removed from Steam')

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
      error: `${steamUserdataDir} does not exist. Can't add/remove game to/from Steam!`
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
function writeShortcutFile(
  file: string,
  object: Partial<ShortcutObject>
): string {
  const buffer = writeBuffer(object)
  try {
    writeFileSync(file, buffer)
    return undefined
  } catch (error) {
    return `${error}`
  }
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
      const keysToCheck = ['AppName', 'Exe', 'LaunchOptions']
      keysToCheck.forEach((key: string) => {
        if (!(key in entry)) {
          checkResult.errors.push(
            `One of the game entries is missing the ${key} parameter!`
          )
          checkResult.success = false
        }
      })
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
    logError(error, LogPrefix.Shortcuts)
    showErrorInFrontend({
      gameTitle: props.gameInfo.title,
      error,
      adding: true
    })
    return
  }

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
        `Can't add "${props.gameInfo.title}" to Steam user "${folder}". "${shortcutsFile}" is corrupted!`,
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
    const writeError = writeShortcutFile(shortcutsFile, content)

    if (writeError) {
      errors.push(writeError)
      continue
    }

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
    logInfo(
      `${props.gameInfo.title} was successfully added to Steam.`,
      LogPrefix.Shortcuts
    )

    const message = i18next.t('notify.finished.add.steam.success', {
      defaultValue: '{{game}} was successfully added to Steam.',
      game: props.gameInfo.title
    })
    notifyFrontend({ message, adding: true })
  } else {
    logWarning(
      `${props.gameInfo.title} could not be added to all found Steam users.`,
      LogPrefix.Shortcuts
    )
    logError(errors.join('\n'), LogPrefix.Shortcuts)

    const message = i18next.t('notify.finished.add.steam.corrupt', {
      defaultValue:
        '{{game}} could not be added to all found Steam users. See logs for more info.',
      game: props.gameInfo.title
    })
    notifyFrontend({ message, adding: true })
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
    logError(error, LogPrefix.Shortcuts)
    showErrorInFrontend({
      gameTitle: props.gameInfo.title,
      error,
      adding: false
    })
    return
  }

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
        `Can't remove "${props.gameInfo.title}" from Steam user "${folder}". "${shortcutsFile}" is corrupted!`,
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
    const writeError = writeShortcutFile(shortcutsFile, content)

    if (writeError) {
      errors.push(writeError)
    }
  }

  if (errors.length === 0) {
    logInfo(
      `${props.gameInfo.title} was successfully removed from Steam.`,
      LogPrefix.Shortcuts
    )

    const message = i18next.t('notify.finished.remove.steam.body1', {
      defaultValue: '{{game}} was successfully removed to Steam.',
      game: props.gameInfo.title
    })
    notifyFrontend({ message, adding: false })
  } else {
    logWarning(
      `${props.gameInfo.title} could not be removed from all found Steam users.`,
      LogPrefix.Shortcuts
    )
    logError(errors.join('\n'), LogPrefix.Shortcuts)

    const message = i18next.t('notify.finished.remove.steam.body2', {
      defaultValue:
        '{{game}}  could not be removed from all found Steam users. See logs for more info.',
      game: props.gameInfo.title
    })
    notifyFrontend({ message, adding: false })
  }
}

export { addNonSteamGame, removeNonSteamGame }
