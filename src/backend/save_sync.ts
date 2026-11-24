import {
  DetectSavePathsResult,
  GameSettings,
  InstalledInfo,
  Runner
} from 'common/types'
import {
  GOGCloudSavesInfo,
  GOGCloudSavesLocation,
  SaveFolderVariable
} from 'common/types/gog'
import { getWinePath, setupWineEnvVars, verifyWinePrefix } from './launcher'
import { logDebug, LogPrefix, logInfo, logError, logWarning } from './logger'
import { getShellPath } from './utils'
import { GameConfig } from './game_config'
import { getSavePathFingerprint } from './cloud_saves/fingerprint'
import { copyMissingSaveFiles } from './cloud_saves/migrate'
import {
  getSavePathMigrations,
  shouldPreserveSavePaths
} from './cloud_saves/save_path_migrations'
import { resolveEpicSavePath } from './cloud_saves/epic_resolver'
import { resolveWindowsPathInPrefix } from './cloud_saves/prefix_paths'
import { LegendaryUser } from './storeManagers/legendary/user'
import { parseLegendaryOutput } from './cloud_saves/parse'
import { isAbsolute } from 'path'
import {
  existsSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from 'graceful-fs'
import { app } from 'electron'
import { libraryManagerMap } from 'backend/storeManagers'
import { LegendaryAppName } from './storeManagers/legendary/commands/base'
import { legendaryInstalled } from './storeManagers/legendary/constants'

const migrateSavePaths = async (
  appName: string,
  runner: Runner,
  newPaths: string | GOGCloudSavesLocation[]
): Promise<void> => {
  const settings = await libraryManagerMap[runner]
    .getGame(appName)
    .getSettings()

  for (const [from, to] of getSavePathMigrations(runner, settings, newPaths)) {
    const copied = copyMissingSaveFiles(from, to)
    if (copied > 0) {
      logInfo(
        [
          'Copied',
          `${copied}`,
          'save files from the old location',
          from,
          'to',
          to
        ],
        LogPrefix.Backend
      )
    }
  }
}

async function getDefaultSavePath(
  appName: string,
  runner: Runner,
  alreadyDefinedGogSaves: GOGCloudSavesLocation[]
): Promise<string | GOGCloudSavesLocation[]> {
  let result: string | GOGCloudSavesLocation[]

  switch (runner) {
    case 'legendary':
      result = await getDefaultLegendarySavePath(appName)
      break
    case 'gog':
      result = await getDefaultGogSavePaths(appName, alreadyDefinedGogSaves)
      break
    default:
      return ''
  }

  await migrateSavePaths(appName, runner, result)
  return result
}

async function getDefaultLegendarySavePath(appName: string): Promise<string> {
  const game = libraryManagerMap['legendary'].getGame(appName)
  const { save_folder, save_path } = game.getGameInfo()
  logInfo(
    ['Computing save path for save folder', save_folder],
    LogPrefix.Legendary
  )

  const accountId = LegendaryUser.getUserInfo()?.account_id
  const gameSettings = await game.getSettings()
  const resolvedSavePath = await resolveEpicSavePath({
    gameInfo: game.getGameInfo(),
    gameSettings,
    accountId,
    isNative: game.isNative()
  })
  if (resolvedSavePath) {
    logInfo(
      ['Resolved save path locally:', resolvedSavePath],
      LogPrefix.Legendary
    )
    return resolvedSavePath
  }

  if (save_path) {
    logDebug(
      ['Legendary has a save path stored, discarding it:', save_path],
      LogPrefix.Legendary
    )
    // FIXME: This isn't really that safe
    try {
      const installedJsonLoc = legendaryInstalled
      const installedJsonData = JSON.parse(
        readFileSync(installedJsonLoc, 'utf-8')
      )
      installedJsonData[appName].save_path = null
      writeFileSync(
        installedJsonLoc,
        JSON.stringify(installedJsonData, undefined, '  ')
      )
    } catch (e) {
      logError(['Failed to discard save path:', e], LogPrefix.Legendary)
      return save_path
    }
  }

  if (!game.isNative()) {
    await verifyWinePrefix(gameSettings)
  }

  logInfo(['Computing default save path for', appName], LogPrefix.Legendary)
  const res = await libraryManagerMap['legendary'].runRunnerCommand(
    {
      subcommand: 'sync-saves',
      appName: LegendaryAppName.parse(appName),
      '--skip-upload': true,
      '--skip-download': true,
      '--accept-path': true
    },
    {
      abortId: appName + '-savePath',
      logMessagePrefix: 'Getting default save path',
      env: game.isNative() ? {} : setupWineEnvVars(gameSettings),
      waitForChildProcesses: false
    }
  )

  const parsed = parseLegendaryOutput(res.stdout, res.stderr)

  if (parsed.state === 'failed') {
    logError(
      [
        'Unable to compute default save path for',
        appName,
        `(${parsed.reason})`
      ],
      LogPrefix.Legendary
    )
    return ''
  }

  if (parsed.computedPath) {
    libraryManagerMap['legendary'].refreshInstalled()
    logInfo(['Computed save path:', parsed.computedPath], LogPrefix.Legendary)
    return parsed.computedPath
  }

  // Legendary writes the path to `installed.json`, so refresh the cached copy
  // before reading it back.
  libraryManagerMap['legendary'].refreshInstalled()
  const new_save_path = libraryManagerMap['legendary'].getGameInfo(
    appName,
    true
  )?.save_path
  if (!new_save_path) {
    logError(
      ['Unable to compute default save path for', appName],
      LogPrefix.Legendary
    )
    return ''
  }
  logInfo(['Computed save path:', new_save_path], LogPrefix.Legendary)
  return new_save_path
}

async function resolveGogSaveLocations(
  appName: string,
  alreadyDefinedGogSaves: GOGCloudSavesLocation[],
  reuseDefined = true
): Promise<{ locations: GOGCloudSavesLocation[]; complete: boolean }> {
  const game = libraryManagerMap['gog'].getGame(appName)
  const gameSettings = await game.getSettings()
  const installInfo = game.getGameInfo().install as InstalledInfo | undefined

  if (!installInfo?.install_path) {
    logWarning(
      ['Unable to resolve save paths for', appName, 'without install data'],
      LogPrefix.Gog
    )
    return { locations: alreadyDefinedGogSaves, complete: false }
  }

  let saveInfo: GOGCloudSavesInfo | undefined
  try {
    saveInfo = await libraryManagerMap['gog'].getSaveSyncLocation(
      appName,
      installInfo
    )
  } catch (error) {
    logError(
      ['Failed to get save locations for', appName, `${error}`],
      LogPrefix.Gog
    )
    return { locations: alreadyDefinedGogSaves, complete: false }
  }

  const { platform: installed_platform, install_path } = installInfo
  if (!saveInfo || !saveInfo.enabled) {
    logWarning(['Unable to get save locations for', appName], LogPrefix.Gog)
    return { locations: alreadyDefinedGogSaves, complete: false }
  }

  const gog_save_location = [...saveInfo.locations]

  // If no save locations are defined, assume the default
  if (!gog_save_location.length) {
    const clientId = libraryManagerMap['gog'].readInfoFile(appName)?.clientId
    gog_save_location.push({
      name: '__default',
      location:
        installed_platform === 'windows'
          ? `%LocalAppData%/GOG.com/Galaxy/Applications/${clientId}/Storage/Shared/Files`
          : `$HOME/Library/Application Support/GOG.com/Galaxy/Applications/${clientId}/Storage`
    })
  }

  const gogVariableMap: Record<string, string> = {
    INSTALL: install_path,
    SAVED_GAMES: '%USERPROFILE%/Saved Games',
    APPLICATION_DATA_LOCAL: '%LOCALAPPDATA%',
    APPLICATION_DATA_LOCAL_LOW: '%APPDATA%\\..\\LocalLow',
    APPLICATION_DATA_ROAMING: '%APPDATA%',
    APPLICATION_SUPPORT: '$HOME/Library/Application Support',
    DOCUMENTS: game.isNative()
      ? app.getPath('documents')
      : '%USERPROFILE%\\Documents'
  } satisfies Record<SaveFolderVariable, string>
  const resolvedLocations: GOGCloudSavesLocation[] = []
  let incomplete = false
  for (const location of gog_save_location) {
    // If a location with the same name already has a path set,
    // skip doing all this work
    const potAlreadyDefinedLocation = alreadyDefinedGogSaves.find(
      ({ name }) => name === location.name
    )

    if (reuseDefined && potAlreadyDefinedLocation?.location.length) {
      resolvedLocations.push(potAlreadyDefinedLocation)
      continue
    }

    // Get all GOG-defined variables out of the path & resolve them
    const matches = location.location.matchAll(/<\?(\w+)\?>/g)
    let locationWithVariablesRemoved = location.location
    let hasUnknownVariables = false
    for (const match of matches) {
      const matchedText = match[0]
      const variableName = match[1]
      if (!gogVariableMap[variableName]) {
        hasUnknownVariables = true
        logWarning(
          [
            'Unknown save path variable:',
            `${variableName},`,
            'inserting variable itself into save path.',
            'User will have to manually correct the path'
          ],
          LogPrefix.Gog
        )
      }
      locationWithVariablesRemoved = locationWithVariablesRemoved.replace(
        matchedText,
        gogVariableMap[variableName] ?? variableName
      )
    }

    if (hasUnknownVariables) {
      incomplete = true
      resolvedLocations.push({
        name: location.name,
        location: potAlreadyDefinedLocation?.location ?? ''
      })
      continue
    }

    // Path now contains no more GOG-defined variables, but might
    // still contain Windows (%NAME%) or Unix ($NAME) ones
    let absolutePath: string
    if (!game.isNative()) {
      absolutePath = await getWinePath({
        path: locationWithVariablesRemoved,
        gameSettings
      })
      // Wine already resolves symlinks and ./.. for us,
      // so no need to run `realpathSync` here
      if (!absolutePath) {
        try {
          absolutePath =
            resolveWindowsPathInPrefix(
              locationWithVariablesRemoved,
              gameSettings.winePrefix
            ) ?? ''
        } catch (error) {
          logWarning(
            ['Failed to resolve save location in the wine prefix', `${error}`],
            LogPrefix.Gog
          )
        }
        if (absolutePath) {
          logInfo(
            [
              'Resolved save location from the wine prefix',
              location.name,
              absolutePath
            ],
            LogPrefix.Gog
          )
        }
      }
    } else {
      absolutePath = await getShellPath(locationWithVariablesRemoved)
      if (existsSync(absolutePath)) {
        try {
          absolutePath = realpathSync(absolutePath)
        } catch {
          logWarning(
            ['Failed to run `realpath` on', `"${absolutePath}"`],
            LogPrefix.Gog
          )
        }
      }
    }

    if (!absolutePath || !isAbsolute(absolutePath)) {
      logWarning(
        ['Could not resolve save location', location.name, 'for', appName],
        LogPrefix.Gog
      )
      incomplete = true
      resolvedLocations.push({
        name: location.name,
        location: potAlreadyDefinedLocation?.location ?? ''
      })
      continue
    }

    logInfo(
      ['Resolved save location', location.name, absolutePath],
      LogPrefix.Gog
    )
    resolvedLocations.push({
      name: location.name,
      location: absolutePath
    })
  }

  const complete =
    !incomplete &&
    resolvedLocations.length === gog_save_location.length &&
    resolvedLocations.every(
      (location) =>
        location.location.length > 0 && isAbsolute(location.location)
    )

  return { locations: resolvedLocations, complete }
}

async function getDefaultGogSavePaths(
  appName: string,
  alreadyDefinedGogSaves: GOGCloudSavesLocation[]
): Promise<GOGCloudSavesLocation[]> {
  return (await resolveGogSaveLocations(appName, alreadyDefinedGogSaves))
    .locations
}

type PathDetectionOrigin = 'settings' | 'refresh'

const cancelledPathDetections = new Set<string>()

const pathDetectionKey = (
  appName: string,
  runner: Runner,
  origin: PathDetectionOrigin
) => `${origin}:${runner}:${appName}`

const isUsableLegendaryConfiguration = (settings: GameSettings): boolean =>
  !!settings.savesPath && isAbsolute(settings.savesPath)

const isUsableGogConfiguration = (settings: GameSettings): boolean =>
  (settings.gogSaves ?? []).some(
    (location) => location.location.length > 0 && isAbsolute(location.location)
  )

async function detectAndPersistSavePaths(
  appName: string,
  runner: Runner,
  origin: PathDetectionOrigin = 'settings'
): Promise<DetectSavePathsResult> {
  if (runner !== 'gog' && runner !== 'legendary') {
    return { paths: '', updated: false }
  }

  const detectionKey = pathDetectionKey(appName, runner, origin)
  cancelledPathDetections.delete(detectionKey)

  const game = libraryManagerMap[runner].getGame(appName)
  const settings = await game.getSettings()
  const fingerprint = getSavePathFingerprint(
    game.getGameInfo(),
    settings,
    process.platform !== 'win32'
  )
  const gameConfig = GameConfig.get(appName)

  try {
    if (runner === 'gog') {
      const { locations, complete } = await resolveGogSaveLocations(
        appName,
        settings.gogSaves ?? [],
        false
      )
      if (!complete) {
        logWarning(
          ['Could not fully resolve save locations for', appName],
          LogPrefix.Backend
        )
        return { paths: locations, updated: false }
      }

      if (cancelledPathDetections.delete(detectionKey)) {
        return { paths: locations, updated: false, cancelled: true }
      }

      await migrateSavePaths(appName, runner, locations)
      gameConfig.setSetting('gogSaves', locations)
      gameConfig.setSetting('savesPathFingerprint', fingerprint)
      gameConfig.setSetting('savePathIsCustom', false)
      return { paths: locations, updated: true }
    }

    const path = await getDefaultLegendarySavePath(appName)
    if (!path || !isAbsolute(path)) {
      return { paths: path, updated: false }
    }

    if (cancelledPathDetections.delete(detectionKey)) {
      return { paths: path, updated: false, cancelled: true }
    }

    await migrateSavePaths(appName, runner, path)
    gameConfig.setSetting('savesPath', path)
    gameConfig.setSetting('savesPathFingerprint', fingerprint)
    gameConfig.setSetting('savePathIsCustom', false)
    return { paths: path, updated: true }
  } catch (error) {
    cancelledPathDetections.delete(detectionKey)
    logError(
      ['Failed to detect save paths for', appName, `${error}`],
      LogPrefix.Backend
    )
    return { paths: '', updated: false }
  }
}

const cancelSavePathsDetection = (appName: string, runner: Runner) => {
  if (runner !== 'gog' && runner !== 'legendary') {
    return
  }
  cancelledPathDetections.add(pathDetectionKey(appName, runner, 'settings'))
}

async function refreshSavePathsIfConfigurationChanged(
  appName: string,
  runner: Runner
): Promise<boolean> {
  if (runner !== 'gog' && runner !== 'legendary') {
    return false
  }

  const game = libraryManagerMap[runner].getGame(appName)
  const settings = await game.getSettings()
  const fingerprint = getSavePathFingerprint(
    game.getGameInfo(),
    settings,
    process.platform !== 'win32'
  )
  const gameConfig = GameConfig.get(appName)
  const usable =
    runner === 'gog'
      ? isUsableGogConfiguration(settings)
      : isUsableLegendaryConfiguration(settings)

  // Existing installs have no fingerprint; adopt their configuration only when
  // it is usable, otherwise let the detection below try to resolve it.
  if (!settings.savesPathFingerprint && usable) {
    gameConfig.setSetting('savesPathFingerprint', fingerprint)
    gameConfig.setSetting('savePathIsCustom', true)
    logInfo(
      ['Adopted the current save path configuration for', appName],
      LogPrefix.Backend
    )
    return false
  }

  if (settings.savesPathFingerprint === fingerprint) {
    return false
  }

  if (shouldPreserveSavePaths(settings, fingerprint)) {
    gameConfig.setSetting('savesPathFingerprint', fingerprint)
    logInfo(
      [
        'Preserved custom save paths for',
        appName,
        'after configuration change'
      ],
      LogPrefix.Backend
    )
    return false
  }

  const result = await detectAndPersistSavePaths(appName, runner, 'refresh')
  if (result.updated) {
    logInfo(
      ['Wine configuration changed, recalculated save paths for', appName],
      LogPrefix.Backend
    )
  }
  return result.updated
}
export {
  cancelSavePathsDetection,
  detectAndPersistSavePaths,
  getDefaultSavePath,
  refreshSavePathsIfConfigurationChanged
}
