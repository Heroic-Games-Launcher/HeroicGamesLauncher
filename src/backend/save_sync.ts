import { InstalledInfo } from 'common/types'
import { GOGCloudSavesLocation, SaveFolderVariable } from 'common/types/gog'
import { getWinePath, setupWineEnvVars, verifyWinePrefix } from './launcher'
import { logDebug, LogPrefix, logInfo, logError, logWarning } from './logger'
import { getShellPath } from './utils'
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
import type { Game } from 'common/types/game_manager'

async function getDefaultSavePath(
  game: Game,
  alreadyDefinedGogSaves: GOGCloudSavesLocation[]
): Promise<string | GOGCloudSavesLocation[]> {
  switch (game.runner) {
    case 'legendary':
      return getDefaultLegendarySavePath(game)
    case 'gog':
      return getDefaultGogSavePaths(game.id, alreadyDefinedGogSaves)
    case 'nile':
      return ''
    case 'sideload':
      return ''
    case 'zoom':
      return ''
  }
}

async function getDefaultLegendarySavePath(game: Game): Promise<string> {
  const { save_folder, save_path } = game.getGameInfo()
  logInfo(
    ['Computing save path for save folder', save_folder],
    LogPrefix.Legendary
  )
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
      installedJsonData[game.id].save_path = null
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
    await verifyWinePrefix(game)
  }

  logInfo(['Computing default save path for', game.id], LogPrefix.Legendary)
  await libraryManagerMap['legendary'].runRunnerCommand(
    {
      subcommand: 'sync-saves',
      appName: LegendaryAppName.parse(game.id),
      '--skip-upload': true,
      '--skip-download': true,
      '--accept-path': true
    },
    {
      abortId: game.id + '-savePath',
      logMessagePrefix: 'Getting default save path',
      env: game.isNative() ? {} : setupWineEnvVars(await game.getSettings()),
      game
    }
  )

  // If the save path was computed successfully, Legendary will have saved
  // this path in `installed.json` (so the GameInfo)
  const { save_path: new_save_path } = libraryManagerMap[
    'legendary'
  ].getGameInfo(game.id, true)!
  if (!new_save_path) {
    logError(
      ['Unable to compute default save path for', game.id],
      LogPrefix.Legendary
    )
    return ''
  }
  logInfo(['Computed save path:', new_save_path], LogPrefix.Legendary)
  return new_save_path
}

async function getDefaultGogSavePaths(
  appName: string,
  alreadyDefinedGogSaves: GOGCloudSavesLocation[]
): Promise<GOGCloudSavesLocation[]> {
  const game = libraryManagerMap['gog'].getGame(appName)
  const installInfo = game.getGameInfo().install as InstalledInfo
  const gog_save_location = await libraryManagerMap['gog'].getSaveSyncLocation(
    appName,
    installInfo
  )

  const { platform: installed_platform, install_path } = installInfo
  if (!gog_save_location || !install_path) {
    logError([
      'gog_save_location/install_path undefined. gog_save_location = ',
      gog_save_location,
      'install_path = ',
      install_path
    ])
    return []
  }

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
  for (const location of gog_save_location) {
    // If a location with the same name already has a path set,
    // skip doing all this work
    const potAlreadyDefinedLocation = alreadyDefinedGogSaves.find(
      ({ name }) => name === location.name
    )

    if (potAlreadyDefinedLocation?.location.length) {
      resolvedLocations.push(potAlreadyDefinedLocation)
      continue
    }

    // Get all GOG-defined variables out of the path & resolve them
    const matches = location.location.matchAll(/<\?(\w+)\?>/g)
    let locationWithVariablesRemoved = location.location
    for (const match of matches) {
      const matchedText = match[0]
      const variableName = match[1]
      if (!gogVariableMap[variableName]) {
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

    // Path now contains no more GOG-defined variables, but might
    // still contain Windows (%NAME%) or Unix ($NAME) ones
    let absolutePath: string
    if (!game.isNative()) {
      absolutePath = await getWinePath(game, locationWithVariablesRemoved)
      // Wine already resolves symlinks and ./.. for us,
      // so no need to run `realpathSync` here
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

    resolvedLocations.push({
      name: location.name,
      location: absolutePath
    })
  }

  return resolvedLocations
}

export { getDefaultSavePath }
