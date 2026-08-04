import {
  writeBuffer,
  parseBuffer,
  ShortcutEntry,
  ShortcutObject
} from 'steam-shortcut-editor'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  writeFileSync
} from 'graceful-fs'
import { readFileSync } from 'fs-extra'
import { dirname, join } from 'path'
import { ShortcutsResult } from '../types'
import { getIcon } from '../utils'
import {
  prepareImagesForSteam,
  generateShortcutId,
  generateAppId,
  generateShortAppId,
  removeImagesFromSteam
} from './steamhelper'
import { app } from 'electron'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import i18next from 'i18next'
import { notify, showDialogBoxModalAuto } from '../../dialog/dialog'
import { GlobalConfig } from '../../config'
import { getWikiGameInfo } from 'backend/wiki_game_info/wiki_game_info'
import { tsStore } from 'backend/constants/key_value_stores'
import { userHome } from 'backend/constants/paths'
import {
  isAppImage,
  isFlatpak,
  isSteamDeckGameMode,
  isWindows
} from 'backend/constants/environment'
import { isSteamRunning } from './steamProcess'
import {
  addShortcutViaSteamClient,
  getSteamClientShortcuts,
  isSteamClientApiAvailable,
  removeShortcutViaSteamClient,
  setShortcutArtworkViaSteamClient,
  steamClientArtworkTypes
} from './steamClient'
import type { SteamClientShortcut } from './steamClient'
import type { GameInfo } from 'common/types'
import type { Game } from 'common/types/game_manager'

const getSteamPath = async () => {
  const { defaultSteamPath } = GlobalConfig.get().getSettings()
  return defaultSteamPath.replaceAll("'", '')
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
  const error = props.adding
    ? i18next.t('box.error.add.steam.body', {
        defaultValue:
          'Adding {{game}} to Steam failed with:{{newLine}} {{error}}',
        game: props.gameTitle,
        newLine: '\n',
        error: props.error,
        interpolation: { escapeValue: false }
      })
    : i18next.t('box.error.remove.steam.body', {
        defaultValue:
          'Removing {{game}} from Steam failed with:{{newLine}} {{error}}',
        game: props.gameTitle,
        newLine: '\n',
        error: props.error,
        interpolation: { escapeValue: false }
      })

  const title = props.adding
    ? i18next.t('box.error.add.steam.title', 'Error Adding Game to Steam')
    : i18next.t(
        'box.error.remove.steam.title',
        'Error Removing Game from Steam'
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
  const tmpFile = `${file}.tmp`
  try {
    writeFileSync(tmpFile, buffer)
    renameSync(tmpFile, file)
    return
  } catch (error) {
    return `${error}`
  }
}

/** Check if key exist case insensitive
 * @param {Object} object
 * @param {string} key
 * @return bool value
 */
function hasParameterCaseInsensitive(object: ShortcutEntry, key: string) {
  const keyAsLowercase = key.toLowerCase()
  return Object.keys(object).some((k) => k.toLowerCase() === keyAsLowercase)
}

/** Return AppName property case insensitive
 *  @param {Object} object
 *  @returns Title of Shortcut Entry
 */
function getAppName(object: ShortcutEntry): string {
  return Object.entries(object).find(
    ([key]) => key.toLowerCase() === 'appname'
  )?.[1]
}

/** Return LaunchOptions property case insensitive
 *  @param {Object} object
 *  @returns LaunchOptions of Shortcut Entry
 */
function getLaunchOptions(object: ShortcutEntry): string {
  return (
    Object.entries(object).find(
      ([key]) => key.toLowerCase() === 'launchoptions'
    )?.[1] ?? ''
  )
}

/**
 * Check if a shortcut points to the given Heroic game.
 * Matches on the heroic launch url first, so renaming the shortcut
 * in Steam does not break the detection. Falls back to the title
 * for entries created by older Heroic versions or added manually.
 */
function matchesHeroicGame(
  shortcut: { appName: string; launchOptions: string },
  gameInfo: { app_name: string; runner?: string; title: string }
): boolean {
  if (shortcut.launchOptions.includes('heroic://launch')) {
    return (
      shortcut.launchOptions.includes(
        `appName=${gameInfo.app_name}&runner=${gameInfo.runner}`
      ) || shortcut.launchOptions.includes(`launch/${gameInfo.app_name}"`)
    )
  }
  return shortcut.appName === gameInfo.title
}

function isHeroicShortcutForGame(
  entry: ShortcutEntry,
  gameInfo: { app_name: string; runner?: string; title: string }
): boolean {
  return matchesHeroicGame(
    { appName: getAppName(entry), launchOptions: getLaunchOptions(entry) },
    gameInfo
  )
}

/**
 * Builds the Exe, StartDir and LaunchOptions used for a Heroic
 * shortcut entry, quoted the same way Steam stores them.
 */
function buildShortcutEntryConfig(gameInfo: GameInfo): {
  exe: string
  startDir: string
  launchOptions: string
} {
  let exe = `"${app.getPath('exe')}"`
  let startDir = `"${dirname(app.getPath('exe'))}"`

  if (isFlatpak) {
    exe = `"flatpak"`
    startDir = `"${userHome}"`
  } else if (!isWindows && isAppImage) {
    exe = `"${process.env.APPIMAGE}"`
    startDir = `"${dirname(process.env.APPIMAGE!)}"`
  } else if (isWindows && process.env.PORTABLE_EXECUTABLE_FILE) {
    exe = `"${process.env.PORTABLE_EXECUTABLE_FILE}"`
    startDir = `"${process.env.PORTABLE_EXECUTABLE_DIR}"`
  }

  const args = []
  args.push('--no-gui')
  if (!isWindows) {
    args.push('--no-sandbox')
  }
  args.push(
    `"heroic://launch?appName=${gameInfo.app_name}&runner=${gameInfo.runner}"`
  )

  let launchOptions = args.join(' ')
  if (isFlatpak) {
    launchOptions = `run com.heroicgameslauncher.hgl ${launchOptions}`
  }

  return { exe, startDir, launchOptions }
}

/**
 * Creates the flag file that makes Steam expose its remote debugging
 * interface on the next start, so shortcuts can be managed while
 * Steam is running.
 */
function enableSteamClientApiOnNextStart(steamPath: string) {
  const flagFile = join(steamPath, '.cef-enable-remote-debugging')
  try {
    if (!existsSync(flagFile)) {
      writeFileSync(flagFile, '')
    }
  } catch (error) {
    logWarning(
      [`Failed to create ${flagFile} with:`, error],
      LogPrefix.Shortcuts
    )
  }
}

function showSteamRunningError(props: {
  steamPath: string
  gameTitle: string
  adding: boolean
}) {
  enableSteamClientApiOnNextStart(props.steamPath)

  const error = isSteamDeckGameMode
    ? i18next.t('box.error.steam.running-gamemode', {
        defaultValue:
          'A one-time Steam restart is required before Heroic can manage Steam shortcuts on this device. Restart Steam and try again.'
      })
    : i18next.t('box.error.steam.running', {
        defaultValue:
          'Steam is running. Close Steam and try again, or restart Steam once to let Heroic manage shortcuts while Steam is running.'
      })

  logError(
    `Can't ${props.adding ? 'add' : 'remove'} "${props.gameTitle}" ${
      props.adding ? 'to' : 'from'
    } Steam while Steam is running.`,
    LogPrefix.Shortcuts
  )
  showErrorInFrontend({
    gameTitle: props.gameTitle,
    error,
    adding: props.adding
  })
}

/**
 * Check if the parsed object of a shortcuts.vdf is valid.
 * @param object @see Partial<ShortcutObject>
 * @returns @see ShortcutsResult
 */
function checkIfShortcutObjectIsValid(
  object: Partial<ShortcutObject>
): ShortcutsResult {
  const checkResult: ShortcutsResult = { success: false, errors: [] }
  if (!('shortcuts' in object)) {
    checkResult.errors.push('Could not find entry "shortcuts"!')
  } else if (!Array.isArray(object.shortcuts)) {
    checkResult.errors.push('Entry "shortcuts" is not an array!')
  } else {
    checkResult.success = true
    object.shortcuts.forEach((entry) => {
      const keysToCheck = ['AppName', 'Exe', 'LaunchOptions']
      keysToCheck.forEach((key: string) => {
        if (!hasParameterCaseInsensitive(entry, key)) {
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
 * @param gameInfo GameInfo of the game
 * @returns Index of the found entry, else if not found -1
 */
function checkIfAlreadyAdded(
  object: Partial<ShortcutObject>,
  gameInfo: { app_name: string; runner?: string; title: string }
) {
  const shortcuts = object.shortcuts ?? []
  return shortcuts.findIndex((entry) =>
    isHeroicShortcutForGame(entry, gameInfo)
  )
}

/**
 * Downloads the Steam grid images for a shortcut into every Steam
 * user config dir and returns the image paths of the last user.
 */
async function prepareImagesForAllUsers(props: {
  game: Game
  gameInfo: GameInfo
  steamUserdataDir: string
  appID: { bigPictureAppID: string; otherGridAppID: string }
}) {
  const wikiInfo = await getWikiGameInfo(props.game)
  const steamID = wikiInfo?.pcgamingwiki?.steamID ?? wikiInfo?.gamesdb?.steamID

  const { folders } = checkSteamUserDataDir(props.steamUserdataDir)
  let images = undefined
  for (const folder of folders) {
    const configDir = join(props.steamUserdataDir, folder, 'config')
    if (!existsSync(configDir)) {
      continue
    }
    images = await prepareImagesForSteam({
      steamUserConfigDir: configDir,
      appID: props.appID,
      gameInfo: props.gameInfo,
      steamID
    })
  }
  return images
}

/**
 * Adds a non-steam game to a running Steam client via the
 * SteamClient API. Takes effect without a Steam restart.
 * @returns boolean
 */
async function addNonSteamGameViaSteamClient(props: {
  game: Game
  gameInfo: GameInfo
  steamUserdataDir: string
}): Promise<boolean> {
  const { game, gameInfo, steamUserdataDir } = props
  try {
    let shortcuts: SteamClientShortcut[] = []
    try {
      shortcuts = await getSteamClientShortcuts()
    } catch (error) {
      logWarning(
        ['Failed to list Steam shortcuts with:', error],
        LogPrefix.Shortcuts
      )
    }

    const existing = shortcuts.find((shortcut) =>
      matchesHeroicGame(shortcut, gameInfo)
    )
    let appId = existing?.appid

    if (appId === undefined) {
      const { exe, startDir, launchOptions } =
        buildShortcutEntryConfig(gameInfo)

      let icon = undefined
      await getIcon(gameInfo.app_name, gameInfo)
        .then((path) => (icon = path))
        .catch((error) =>
          logWarning(
            [`Couldn't find a icon for ${gameInfo.title} with:`, error],
            LogPrefix.Shortcuts
          )
        )

      appId = await addShortcutViaSteamClient({
        name: gameInfo.title,
        exe,
        startDir,
        launchOptions,
        icon
      })
    }

    const shortAppId = appId >>> 0
    const images = await prepareImagesForAllUsers({
      game,
      gameInfo,
      steamUserdataDir,
      appID: {
        bigPictureAppID: String(
          (BigInt(shortAppId) << BigInt(32)) | BigInt(0x02000000)
        ),
        otherGridAppID: String(shortAppId)
      }
    })

    if (images) {
      await setShortcutArtworkViaSteamClient({
        appId: shortAppId,
        imagePath: images.coverArt,
        assetType: steamClientArtworkTypes.grid
      })
      await setShortcutArtworkViaSteamClient({
        appId: shortAppId,
        imagePath: images.backGroundArt,
        assetType: steamClientArtworkTypes.hero
      })
      await setShortcutArtworkViaSteamClient({
        appId: shortAppId,
        imagePath: images.logoArt,
        assetType: steamClientArtworkTypes.logo
      })
      await setShortcutArtworkViaSteamClient({
        appId: shortAppId,
        imagePath: images.headerArt,
        assetType: steamClientArtworkTypes.wideGrid
      })
    }

    logInfo(
      `${gameInfo.title} was successfully added to Steam.`,
      LogPrefix.Shortcuts
    )
    const message = i18next.t('notify.finished.add.steam.success-no-restart', {
      defaultValue: '{{game}} was successfully added to Steam.',
      game: gameInfo.title
    })
    notifyFrontend({ message, adding: true })
    return true
  } catch (error) {
    logError(
      [`Failed to add ${gameInfo.title} to Steam with:`, error],
      LogPrefix.Shortcuts
    )
    showErrorInFrontend({
      gameTitle: gameInfo.title,
      error: `${error}`,
      adding: true
    })
    return false
  }
}

/**
 * Adds a non-steam game to steam via editing shortcuts.vdf
 * @param game the {@link Game} to add
 * @returns boolean
 */
async function addNonSteamGame(game: Game): Promise<boolean> {
  const gameInfo = game.getGameInfo()
  const steamPath = await getSteamPath()
  const steamUserdataDir = join(steamPath, 'userdata')

  if (isSteamRunning(steamPath)) {
    if (await isSteamClientApiAvailable()) {
      return addNonSteamGameViaSteamClient({ game, gameInfo, steamUserdataDir })
    }
    showSteamRunningError({
      steamPath,
      gameTitle: gameInfo.title,
      adding: true
    })
    return false
  }

  const wikiInfo = await getWikiGameInfo(game)
  const steamID = wikiInfo?.pcgamingwiki?.steamID ?? wikiInfo?.gamesdb?.steamID

  const { folders, error } = checkSteamUserDataDir(steamUserdataDir)

  if (error) {
    logError(error, LogPrefix.Shortcuts)
    showErrorInFrontend({
      gameTitle: gameInfo.title,
      error,
      adding: true
    })
    return false
  }

  const errors = []
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
    content.shortcuts = content.shortcuts ?? []

    const checkResult = checkIfShortcutObjectIsValid(content)
    if (!checkResult.success) {
      errors.push(
        `Can't add "${gameInfo.title}" to Steam user "${folder}". "${shortcutsFile}" is corrupted!`,
        ...checkResult.errors
      )
      continue
    }

    if (checkIfAlreadyAdded(content, gameInfo) > -1) {
      added = true
      continue
    }

    // add new Entry
    const { exe, startDir, launchOptions } = buildShortcutEntryConfig(gameInfo)
    const newEntry = {} as ShortcutEntry
    newEntry.AppName = gameInfo.title
    newEntry.Exe = exe
    newEntry.StartDir = startDir

    newEntry.appid = generateShortcutId(newEntry.Exe, newEntry.AppName)

    await getIcon(gameInfo.app_name, gameInfo)
      .then((path) => (newEntry.icon = path))
      .catch((error) =>
        logWarning(
          [`Couldn't find a icon for ${gameInfo.title} with:`, error],
          LogPrefix.Shortcuts
        )
      )

    await prepareImagesForSteam({
      steamUserConfigDir: configDir,
      appID: {
        bigPictureAppID: generateAppId(newEntry.Exe, newEntry.AppName),
        otherGridAppID: generateShortAppId(newEntry.Exe, newEntry.AppName)
      },
      gameInfo,
      steamID: steamID
    })

    newEntry.LaunchOptions = launchOptions
    newEntry.IsHidden = false
    newEntry.AllowDesktopConfig = true
    newEntry.AllowOverlay = true
    newEntry.OpenVR = false
    newEntry.Devkit = false
    newEntry.DevkitOverrideAppID = false

    const lastPlayed = tsStore.get_nodefault(`${gameInfo.app_name}.lastPlayed`)
    if (lastPlayed) {
      newEntry.LastPlayTime = new Date(lastPlayed)
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
    logError(errorMessage, LogPrefix.Shortcuts)
    showErrorInFrontend({
      gameTitle: gameInfo.title,
      error: errorMessage,
      adding: true
    })
    return false
  }

  if (errors.length === 0) {
    logInfo(
      `${gameInfo.title} was successfully added to Steam.`,
      LogPrefix.Shortcuts
    )

    const message = i18next.t('notify.finished.add.steam.success', {
      defaultValue:
        '{{game}} was successfully added to Steam. A restart of Steam is required for changes to take effect.',
      game: gameInfo.title
    })
    notifyFrontend({ message, adding: true })
    return true
  } else {
    logWarning(
      `${gameInfo.title} could not be added to all found Steam users.`,
      LogPrefix.Shortcuts
    )
    logError(errors.join('\n'), LogPrefix.Shortcuts)

    const message = i18next.t('notify.finished.add.steam.corrupt', {
      defaultValue:
        '{{game}} could not be added to all found Steam users. See logs for more info. A restart of Steam is required for changes to take effect.',
      game: gameInfo.title
    })
    notifyFrontend({ message, adding: true })
    return true
  }
}

/**
 * Removes a non-steam game from a running Steam client via the
 * SteamClient API. Takes effect without a Steam restart.
 */
async function removeNonSteamGameViaSteamClient(props: {
  gameInfo: GameInfo
  steamUserdataDir: string
}): Promise<void> {
  const { gameInfo, steamUserdataDir } = props
  try {
    const shortcuts = await getSteamClientShortcuts()
    const existing = shortcuts.find((shortcut) =>
      matchesHeroicGame(shortcut, gameInfo)
    )
    if (!existing) {
      return
    }

    await removeShortcutViaSteamClient(existing.appid)

    const shortAppId = existing.appid >>> 0
    const { folders } = checkSteamUserDataDir(steamUserdataDir)
    for (const folder of folders) {
      const configDir = join(steamUserdataDir, folder, 'config')
      if (!existsSync(configDir)) {
        continue
      }
      removeImagesFromSteam({
        steamUserConfigDir: configDir,
        appID: {
          bigPictureAppID: String(
            (BigInt(shortAppId) << BigInt(32)) | BigInt(0x02000000)
          ),
          otherGridAppID: String(shortAppId)
        },
        gameInfo
      })
      removeImagesFromSteam({
        steamUserConfigDir: configDir,
        appID: {
          bigPictureAppID: generateAppId(existing.exe, existing.appName),
          otherGridAppID: generateShortAppId(existing.exe, existing.appName)
        },
        gameInfo
      })
    }

    logInfo(
      `${gameInfo.title} was successfully removed from Steam.`,
      LogPrefix.Shortcuts
    )
    const message = i18next.t(
      'notify.finished.remove.steam.success-no-restart',
      {
        defaultValue: '{{game}} was successfully removed from Steam.',
        game: gameInfo.title
      }
    )
    notifyFrontend({ message, adding: false })
  } catch (error) {
    logError(
      [`Failed to remove ${gameInfo.title} from Steam with:`, error],
      LogPrefix.Shortcuts
    )
    showErrorInFrontend({
      gameTitle: gameInfo.title,
      error: `${error}`,
      adding: false
    })
  }
}

/**
 * Removes a non-steam game from steam via editing shortcuts.vdf
 * @param gameInfo @see GameInfo of the game to remove
 * @param steamUserdataDir Path to steam userdata directory, optional
 * @returns none
 */
async function removeNonSteamGame(game: Game): Promise<void> {
  const gameInfo = game.getGameInfo()
  const steamPath = await getSteamPath()
  const steamUserdataDir = join(steamPath, 'userdata')

  if (isSteamRunning(steamPath)) {
    if (await isSteamClientApiAvailable()) {
      return removeNonSteamGameViaSteamClient({ gameInfo, steamUserdataDir })
    }
    showSteamRunningError({
      steamPath,
      gameTitle: gameInfo.title,
      adding: false
    })
    return
  }

  const { folders, error } = checkSteamUserDataDir(steamUserdataDir)

  // we don't show a error here.
  // If someone changes the steam path to a invalid one
  // we just assume it is removed
  if (error) {
    logWarning(error, LogPrefix.Shortcuts)
    return
  }

  const errors = []
  let removed = false
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
      errors.push(
        `Can't remove "${gameInfo.title}" from Steam user "${folder}". "${shortcutsFile}" is corrupted!`,
        ...checkResult.errors
      )
      continue
    }
    // This is just to make TS happy, in reality checkIfShortcutObjectIsValid already checks for this array
    content.shortcuts = content.shortcuts || []

    const index = checkIfAlreadyAdded(content, gameInfo)

    if (index < 0) {
      continue
    }
    const shortcutObj = content.shortcuts.at(index)!

    const exe = shortcutObj.Exe
    const appName = getAppName(shortcutObj)

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
      gameInfo
    })
  }

  if (errors.length === 0) {
    // game was not on any steam shortcut
    // nothing to notify
    if (!removed) {
      return
    }

    logInfo(
      `${gameInfo.title} was successfully removed from Steam.`,
      LogPrefix.Shortcuts
    )

    const message = i18next.t('notify.finished.remove.steam.success', {
      defaultValue:
        '{{game}} was successfully removed from Steam. A restart of Steam is required for changes to take effect.',
      game: gameInfo.title
    })
    notifyFrontend({ message, adding: false })
  } else {
    logWarning(
      `${gameInfo.title} could not be removed from all found Steam users.`,
      LogPrefix.Shortcuts
    )
    logError(errors.join('\n'), LogPrefix.Shortcuts)

    const message = i18next.t('notify.finished.remove.steam.corrupt', {
      defaultValue:
        '{{game}} could not be removed from all found Steam users. See logs for more info. A restart of Steam is required for changes to take effect.',
      game: gameInfo.title
    })
    notifyFrontend({ message, adding: false })
  }
}

/**
 * Checks if a game was added to shortcuts.vdf
 * @param game The {@link Game} to check
 * @returns boolean
 */
async function isAddedToSteam(game: Game): Promise<boolean> {
  const gameInfo = game.getGameInfo()
  const steamPath = await getSteamPath()
  const steamUserdataDir = join(steamPath, 'userdata')

  if (isSteamRunning(steamPath) && (await isSteamClientApiAvailable())) {
    try {
      const shortcuts = await getSteamClientShortcuts()
      return shortcuts.some((shortcut) => matchesHeroicGame(shortcut, gameInfo))
    } catch (error) {
      logWarning(
        ['Failed to list Steam shortcuts with:', error],
        LogPrefix.Shortcuts
      )
    }
  }

  const { folders, error } = checkSteamUserDataDir(steamUserdataDir)

  if (error) {
    return false
  }

  let added = false
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
      continue
    }

    const index = checkIfAlreadyAdded(content, gameInfo)

    if (index < 0) {
      continue
    }

    added = true
  }

  return added
}

export { addNonSteamGame, removeNonSteamGame, isAddedToSteam }
