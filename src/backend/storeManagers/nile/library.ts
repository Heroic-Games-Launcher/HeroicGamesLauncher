import { nileInstalled, nileLibrary } from 'backend/constants'
import { LogPrefix, logDebug, logError, logInfo } from 'backend/logger/logger'
// import {
//   createAbortController,
//   deleteAbortController
// } from 'backend/utils/aborthandler/aborthandler'
import { /* CallRunnerOptions, */ ExecResult, GameInfo } from 'common/types'
import {
  NileGameInfo,
  NileInstallInfo,
  NileInstallMetadataInfo
} from 'common/types/nile'
import { existsSync, readFileSync } from 'graceful-fs'
import { installStore, libraryStore } from './electronStores'

let installedGames: Map<string, NileInstallInfo> = new Map()
// FIXME: Refactor plsplspls
let libraryJSON: NileGameInfo[]
const library: Map<string, GameInfo> = new Map()

/**
 * Loads all the user's games into `library`
 */
export function loadGamesInAccount() {
  if (!existsSync(nileLibrary)) {
    return
  }
  libraryJSON = JSON.parse(readFileSync(nileLibrary, 'utf-8'))
  libraryJSON.forEach((game) => {
    const { product } = game
    const { title, productDetail } = product
    const {
      details: { logoUrl, shortDescription, developer },
      iconUrl
    } = productDetail

    const info = installedGames.get(game.id)

    // Not sure which images I should use
    library.set(game.id, {
      app_name: game.id,
      art_cover: iconUrl,
      art_square: iconUrl,
      canRunOffline: true, // Not sure if there is a way to know this
      install: {
        install_path: info?.game?.path,
        version: info?.game?.path,
        platform: 'Windows' // Amazon Games only supports Windows
      },
      is_installed: info !== undefined,
      runner: 'nile',
      title,
      art_logo: logoUrl,
      description: shortDescription,
      developer,
      is_linux_native: false,
      is_mac_native: false
    })
  })
}

/**
 * Obtain a list of updateable games.
 *
 * @returns App names of updateable games.
 */
export async function listUpdateableGames(): Promise<string[]> {
  // TODO: Fill in logic
  return []
}

/**
 * Refresh games in the user's library
 */
async function refreshNile(): Promise<ExecResult> {
  logInfo('Refreshing Amazon Games...', LogPrefix.Nile)

  // const abortID = 'nile-refresh'
  // const res = await runRunnerCommand(
  //   ['library', 'sync'],
  //   createAbortController(abortID)
  // )

  // deleteAbortController(abortID)

  // if (res.error) {
  //   logError(['Failed to refresh library:', res.error], LogPrefix.Nile)
  // }
  refreshInstalled()
  return {
    stderr: '',
    stdout: ''
  }
}

function gameToInstallInfo(
  appName: string,
  metadata?: NileInstallMetadataInfo
): NileInstallInfo | null {
  const { id, version } = metadata ?? { id: appName, version: '' }
  const game = library.get(id)

  if (!game) {
    return null
  }

  return {
    game: {
      id: appName,
      path: '',
      version: '',
      launch_options: [],
      owned_dlc: [],
      app_name: game.app_name,
      cloud_saves_supported: false,
      external_activation: '',
      is_dlc: false,
      platform_versions: {
        Windows: version
      },
      title: game.title,
      ...metadata
    },
    manifest: {
      download_size: 1000, // FIXME: Proper size
      disk_size: 1000 // FIXME: Proper size
      // TODO: Fill out later
    }
  }
}

/**
 * Refresh `installedGames` from file.
 */
export function refreshInstalled() {
  installedGames = new Map()
  if (existsSync(nileInstalled)) {
    try {
      const installed: NileInstallMetadataInfo[] = JSON.parse(
        readFileSync(nileInstalled, 'utf-8')
      )

      for (const metadata of installed) {
        const info = gameToInstallInfo(metadata.id, metadata)

        if (!info) {
          logError(
            `Could not find installed game with id ${metadata.id} in library`,
            LogPrefix.Nile
          )
          continue
        }

        installedGames.set(metadata.id, info)
      }
    } catch (error) {
      logError(
        ['Corrupted installed.json file, cannot load installed games', error],
        LogPrefix.Nile
      )
    }
  }
}

/**
 * Get the game info of all games in the library
 *
 * @returns Array of objects.
 */
export async function refresh(): Promise<ExecResult | null> {
  logInfo('Refreshing library...', LogPrefix.Nile)

  refreshNile()
  loadGamesInAccount()
  refreshInstalled()

  const arr = Array.from(library.values())
  libraryStore.set('library', arr)
  logInfo(['Game list updated, got', `${arr.length}`, 'games'], LogPrefix.Nile)

  return {
    stderr: '',
    stdout: ''
  }
}

/**
 * Get game info for a particular game.
 *
 * @param appName The AppName of the game you want the info of
 * @param forceReload Discards game info in `library` and always reads info from metadata files
 * @returns GameInfo
 */
export function getGameInfo(
  appName: string
  // forceReload = false
): GameInfo | undefined {
  // TODO: Fill in logic
  return library.get(appName)
}

/**
 * Get game info for a particular game.
 */
export async function getInstallInfo(
  appName: string
): Promise<NileInstallInfo> {
  const cache = installStore.get(appName)
  if (cache) {
    logDebug('Using cached install info', LogPrefix.Nile)
    return cache
  }

  logInfo('Getting more details', LogPrefix.Nile)
  refreshInstalled()

  const installed = installedGames.get(appName)
  if (installed) {
    return installed
  }

  const installInfo = gameToInstallInfo(appName)
  if (!installInfo) {
    throw Error(
      `[Nile]: Could not find game with id ${appName} in user's library`
    )
  }
  installStore.set(appName, installInfo)
  return installInfo
}

/**
 * Change the install path for a given game.
 *
 * @param appName
 * @param newPath
 */
export async function changeGameInstallPath() {
  /* appName: string,
  newAppPath: string */
  // TODO: Fill in logic
}

/**
 * Change the install state of a game without a complete library reload.
 *
 * @param appName
 * @param state true if its installed, false otherwise.
 */
export function installState(/* appName: string, state: boolean */) {
  // TODO: Fill in logic
}

export async function runRunnerCommand(): Promise<ExecResult> {
  /* commandParts: string[],
  abortController: AbortController,
  options?: CallRunnerOptions */
  // TODO: Fill in logic
  return {
    stderr: '',
    stdout: ''
  }
}
