import {
  writeBuffer,
  parseBuffer,
  ShortcutEntry,
  ShortcutObject
} from 'steam-shortcut-editor'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'graceful-fs'
import { readFileSync } from 'fs-extra'
import { join } from 'path'
import { GameInfo } from 'common/types'
import { ShortcutsResult } from '../types'
import { getIcon } from '../utils'
import { notify } from '../../utils'
import {
  prepareImagesForSteam,
  generateShortcutId,
  generateAppId,
  generateShortAppId,
  removeImagesFromSteam
} from './steamhelper'
import { app } from 'electron'
import { isFlatpak, isWindows, tsStore } from '../../constants'
import { logError, logInfo, LogPrefix, logWarning } from '../../logger/logger'
import i18next from 'i18next'
import { showDialogBoxModalAuto } from '../../dialog/dialog'

/**
 * Opens a error dialog in frontend with the error message
 * @param props
 */
function showErrorInFrontend(props: { gameTitle: string; error: string }) {
  const error = i18next.t('box.error.add.steam.body', {
    defaultValue: 'Adding {{game}} to Steam failed with:{{newLine}} {{error}}',
    game: props.gameTitle,
    newLine: '\n',
    error: props.error,
    interpolation: { escapeValue: false }
  })

  const title = i18next.t(
    'box.error.add.steam.title',
    'Error Adding Game to Steam'
  )

  showDialogBoxModalAuto({ title, message: error, type: 'ERROR' })
}

/**
 * Opens a notify window in the frontend with given message
 * @param props
 */
function notifyFrontend(props: { message: string; adding: boolean }) {
  const title = props.adding
    ? i18next.t('notify.finished.add.steam.title', 'Added to Steam')
    : i18next.t('notify.finished.remove.steam.title', 'Removed from Steam')

  notify({
    body: props.message,
    title
  })
}

/**
 * Check if steam userdata folder exist and return them as a string list.
 * @param steamUserdataDir Path to userdata folder in steam compat folder.
 * @returns All userdata folders as string array and possible error
 */
function checkSteamUserDataDir(steamUserdataDir: string): {
  folders: string[]
  error?: string
} {
  if (!existsSync(steamUserdataDir)) {
    return {
      folders: [],
      error: `${steamUserdataDir} does not exist. Can't add/remove game to/from Steam!`
    }
  }
  const ignoreFolders = ['0', 'ac']
  const folders = readdirSync(steamUserdataDir, {
    withFileTypes: true
  })
    .filter((dirent) => dirent.isDirectory())
    .filter((dirent) => ignoreFolders.every((folder) => folder !== dirent.name))
    .map((dirent) => dirent.name)

  if (folders.length <= 0) {
    return {
      folders: [],
      error: `${steamUserdataDir} does not contain a valid user directory!`
    }
  }

  return { folders }
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
): string | undefined {
  const buffer = writeBuffer(object)
  try {
    writeFileSync(file, buffer)
    return
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
        if (!(key in entry) && !(key.toLowerCase() in entry)) {
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
function checkIfAlreadyAdded(object: Partial<ShortcutObject>, title: string) {
  const shortcuts = object.shortcuts ?? []
  return shortcuts.findIndex((entry) => entry.AppName === title)
}

/**
 * Adds a non-steam game to steam via editing shortcuts.vdf
 * @param steamUserdataDir Path to steam userdata directory
 * @param gameInfo @see GameInfo of the game to add
 * @returns boolean
 */
async function addNonSteamGame(props: {
  steamUserdataDir: string
  gameInfo: GameInfo
  bkgDataUrl: string
  bigPicDataUrl: string
}): Promise<boolean> {
  const { folders, error } = checkSteamUserDataDir(props.steamUserdataDir)

  if (error) {
    logError(error, { prefix: LogPrefix.Shortcuts })
    showErrorInFrontend({
      gameTitle: props.gameInfo.title,
      error
    })
    return false
  }

  const errors = []
  let added = false
  for (const folder of folders) {
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
    content.shortcuts = content.shortcuts ?? []

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
    newEntry.StartDir = `"${process.cwd()}"`

    if (isFlatpak) {
      newEntry.Exe = `"flatpak"`
    } else if (!isWindows && process.env.APPIMAGE) {
      newEntry.Exe = `"${process.env.APPIMAGE}"`
    } else if (isWindows && process.env.PORTABLE_EXECUTABLE_FILE) {
      newEntry.Exe = `"${process.env.PORTABLE_EXECUTABLE_FILE}`
      newEntry.StartDir = `"${process.env.PORTABLE_EXECUTABLE_DIR}"`
    }

    newEntry.appid = generateShortcutId(newEntry.Exe, newEntry.AppName)

    await getIcon(props.gameInfo.app_name, props.gameInfo)
      .then((path) => (newEntry.icon = path))
      .catch((error) =>
        logWarning(
          [`Couldn't find a icon for ${props.gameInfo.title} with:`, error],
          { prefix: LogPrefix.Shortcuts }
        )
      )

    await prepareImagesForSteam({
      steamUserConfigDir: configDir,
      appID: {
        bigPictureAppID: generateAppId(newEntry.Exe, newEntry.AppName),
        otherGridAppID: generateShortAppId(newEntry.Exe, newEntry.AppName)
      },
      gameInfo: props.gameInfo,
      bkgDataUrl: props.bkgDataUrl,
      bigPicDataUrl: props.bigPicDataUrl
    })

    const args = []
    args.push('--no-gui')
    if (!isWindows) {
      args.push('--no-sandbox')
    }
    args.push(`"heroic://launch/${props.gameInfo.app_name}"`)
    newEntry.LaunchOptions = args.join(' ')
    if (isFlatpak) {
      newEntry.LaunchOptions = `run com.heroicgameslauncher.hgl ${newEntry.LaunchOptions}`
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
    const errorMessage = errors.join('\n')
    logError(errorMessage, { prefix: LogPrefix.Shortcuts })
    showErrorInFrontend({
      gameTitle: props.gameInfo.title,
      error: errorMessage
    })
    return false
  }

  if (errors.length === 0) {
    logInfo(`${props.gameInfo.title} was successfully added to Steam.`, {
      prefix: LogPrefix.Shortcuts
    })

    const message = i18next.t('notify.finished.add.steam.success', {
      defaultValue:
        '{{game}} was successfully added to Steam. A restart of Steam is required for changes to take effect.',
      game: props.gameInfo.title
    })
    notifyFrontend({ message, adding: true })
    return true
  } else {
    logWarning(
      `${props.gameInfo.title} could not be added to all found Steam users.`,
      { prefix: LogPrefix.Shortcuts }
    )
    logError(errors.join('\n'), { prefix: LogPrefix.Shortcuts })

    const message = i18next.t('notify.finished.add.steam.corrupt', {
      defaultValue:
        '{{game}} could not be added to all found Steam users. See logs for more info. A restart of Steam is required for changes to take effect.',
      game: props.gameInfo.title
    })
    notifyFrontend({ message, adding: true })
    return true
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

  // we don't show a error here.
  // If someone changes the steam path to a invalid one
  // we just assume it is removed
  if (error) {
    logWarning(error, { prefix: LogPrefix.Shortcuts })
    return
  }

  const errors = []
  let removed = false
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
    // This is just to make TS happy, in reality checkIfShortcutObjectIsValid already checks for this array
    content.shortcuts = content.shortcuts || []

    const index = checkIfAlreadyAdded(content, props.gameInfo.title)

    if (index < 0) {
      continue
    }
    const shortcutObj = content.shortcuts.at(index)!

    const exe = shortcutObj.Exe
    const appName = shortcutObj.AppName

    // remove
    content.shortcuts.splice(index, 1)

    // rewrite shortcuts.vdf
    const writeError = writeShortcutFile(shortcutsFile, content)

    if (writeError) {
      errors.push(writeError)
      continue
    }

    removed = true

    removeImagesFromSteam({
      steamUserConfigDir: configDir,
      appID: {
        bigPictureAppID: generateAppId(exe, appName),
        otherGridAppID: generateShortAppId(exe, appName)
      },
      gameInfo: props.gameInfo
    })
  }

  // game was not on any steam shortcut
  // nothing to notify
  if (!removed) {
    return
  }

  if (errors.length === 0) {
    logInfo(`${props.gameInfo.title} was successfully removed from Steam.`, {
      prefix: LogPrefix.Shortcuts
    })

    const message = i18next.t('notify.finished.remove.steam.success', {
      defaultValue:
        '{{game}} was successfully removed from Steam. A restart of Steam is required for changes to take effect.',
      game: props.gameInfo.title
    })
    notifyFrontend({ message, adding: false })
  } else {
    logWarning(
      `${props.gameInfo.title} could not be removed from all found Steam users.`,
      { prefix: LogPrefix.Shortcuts }
    )
    logError(errors.join('\n'), { prefix: LogPrefix.Shortcuts })

    const message = i18next.t('notify.finished.remove.steam.corrupt', {
      defaultValue:
        '{{game}} could not be removed from all found Steam users. See logs for more info. A restart of Steam is required for changes to take effect.',
      game: props.gameInfo.title
    })
    notifyFrontend({ message, adding: false })
  }
}

/**
 * Checks if a game was added to shortcuts.vdf
 * @param steamUserdataDir Path to steam userdata directory
 * @param gameInfo @see GameInfo of the game to check
 * @returns boolean
 */
async function isAddedToSteam(props: {
  steamUserdataDir: string
  gameInfo: GameInfo
}): Promise<boolean> {
  const { folders, error } = checkSteamUserDataDir(props.steamUserdataDir)

  if (error) {
    return false
  }

  let added = false
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
      continue
    }

    const index = checkIfAlreadyAdded(content, props.gameInfo.title)

    if (index < 0) {
      continue
    }

    added = true
  }

  return added
}

export { addNonSteamGame, removeNonSteamGame, isAddedToSteam }
