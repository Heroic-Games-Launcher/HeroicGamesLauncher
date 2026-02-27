import { sendFrontendMessage } from '../../ipc'
import { ZoomUser } from './user'
import { GameInfo, InstalledInfo, ExecResult, LaunchOption } from 'common/types'
import {
  ZoomGameInfo,
  ZoomLibraryResponse,
  ZoomDownloadFile,
  ZoomFilesResponse,
  ZoomInstallInfo
} from 'common/types/zoom'

import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from 'backend/logger'
import { getFileSize, parseSize } from '../../utils'
import CacheStore from '../../cache'
import {
  libraryStore,
  installedGamesStore,
  installInfoStore
} from './electronStores'
import { isOnline } from '../../online_monitor'
import { apiUrl } from './constants'
import { GlobalConfig } from 'backend/config'

const libraryCache = new CacheStore<ZoomGameInfo[]>('zoom-library')
const library: Map<string, GameInfo> = new Map()
const installedGames: Map<string, InstalledInfo> = new Map()

export async function initZoomLibraryManager() {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return

  await refresh()
}

export async function refresh(): Promise<ExecResult> {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return { stdout: '', stderr: 'Zoom Support disabled' }

  libraryCache.clear()
  refreshInstalled()
  if (!(await ZoomUser.isLoggedIn())) {
    return { stdout: '', stderr: '' }
  }

  if (!isOnline()) {
    logWarning('App offline, unable to refresh Zoom library', LogPrefix.Zoom)
    return { stdout: '', stderr: 'App offline' }
  }

  logInfo('Getting Zoom library', LogPrefix.Zoom)
  const gameApiArray: ZoomGameInfo[] = await getZoomLibrary()
  if (!gameApiArray.length) {
    logError(
      'There was an error loading games library from Zoom',
      LogPrefix.Zoom
    )
    return { stdout: '', stderr: 'Error loading library' }
  }

  library.clear()

  for (const zoomGame of gameApiArray) {
    const unifiedObject = zoomToUnifiedInfo(zoomGame)
    if (unifiedObject.app_name) {
      const oldData = library.get(unifiedObject.app_name)
      if (oldData) {
        unifiedObject.folder_name = oldData.folder_name
      }
    }
    const installedInfo = installedGames.get(String(zoomGame.id))
    if (installedInfo) {
      unifiedObject.is_installed = true
      unifiedObject.install = installedInfo
    }
    library.set(unifiedObject.app_name, unifiedObject)
    sendFrontendMessage('pushGameToLibrary', unifiedObject)
  }

  libraryStore.set('games', Array.from(library.values()))

  const logLines: string[] = []
  Array.from(library.values()).forEach((gameData) => {
    let line = `* ${gameData.title} (App name: ${gameData.app_name})`
    if (gameData.install?.is_dlc) line += ' - DLC'
    logLines.push(line)
  })
  const sortedTitles = logLines.sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  )

  const logContent = `Games List:\n${sortedTitles.join('\n')}\n\nTotal: ${logLines.length}\n`
  logInfo(logContent, LogPrefix.Zoom)

  logInfo('Saved games data for Zoom', LogPrefix.Zoom)

  return { stdout: 'Library refreshed', stderr: '' }
}

async function getZoomLibrary(): Promise<ZoomGameInfo[]> {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return []

  const cachedGames = libraryCache.get('library')
  if (cachedGames) {
    logDebug('Returning cached Zoom library', LogPrefix.Zoom)
    return cachedGames
  }

  const url = `${apiUrl}/li/games`
  try {
    const response: ZoomLibraryResponse = await ZoomUser.makeRequest(url)
    const allGames: ZoomGameInfo[] = response.games
    let currentPage = response.current_page
    const totalPages = response.total_pages

    while (currentPage < totalPages) {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Avoid hitting API too fast
      currentPage += 1
      const nextUrl = `${url}?page=${currentPage}`
      const nextResponse: ZoomLibraryResponse =
        await ZoomUser.makeRequest(nextUrl)
      allGames.push(...nextResponse.games)
    }

    libraryCache.set('library', allGames)
    return allGames
  } catch (error) {
    logError(['Error fetching Zoom library:', error], LogPrefix.Zoom)
    return []
  }
}

export function zoomToUnifiedInfo(zoomGame: ZoomGameInfo): GameInfo {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return {} as GameInfo

  const object: GameInfo = {
    runner: 'zoom',
    app_name: String(zoomGame.id),
    title: zoomGame.name,
    art_cover: zoomGame.poster_url,
    art_square: zoomGame.poster_url, // Assuming poster_url can be used for square as well, or find a better equivalent
    art_background: zoomGame.poster_url, // Assuming poster_url can be used for background as well
    cloud_save_enabled: false, // Zoom.py example doesn't show cloud saves
    extra: {
      about: { description: zoomGame.description, shortDescription: '' }, // No direct equivalent in zoom.py for detailed description
      reqs: [],
      genres: []
    },
    developer: zoomGame.developers.join(', '),
    folder_name: zoomGame.slug, // Using slug as folder_name
    install: {
      is_dlc: false
    },
    store_url: zoomGame.store_url,
    is_installed: false,
    save_folder: '',
    canRunOffline: true, // Assuming DRM-free as per zoom.py
    is_mac_native: zoomGame.operating_systems.includes('osx'),
    is_linux_native: zoomGame.operating_systems.includes('linux'),
    thirdPartyManagedApp: undefined
  }
  return object
}

export function getGameInfo(slug: string): GameInfo | undefined {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return

  return library.get(slug) || getInstallAndGameInfo(slug)
}

export function getInstallAndGameInfo(slug: string): GameInfo | undefined {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return

  const lib = libraryStore.get('games', [])
  const game = lib.find((value) => value.app_name === slug)

  if (!game) {
    return
  }
  const installedInfo = installedGames.get(game.app_name)
  if (installedInfo) {
    game.is_installed = true
    game.install = installedInfo
  }

  return game
}

export async function getInstallInfo(
  appName: string,
  installPlatform = 'windows'
): Promise<ZoomInstallInfo | undefined> {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return

  logInfo(
    `Getting install info for ${appName} on ${installPlatform}`,
    LogPrefix.Zoom
  )

  const gameData = getGameInfo(appName)
  if (!gameData) {
    logError('Game data not found for install info', LogPrefix.Zoom)
    return
  }

  try {
    const filesRequest: ZoomFilesResponse = await ZoomUser.makeRequest(
      `${apiUrl}/li/game/${appName}/files`
    )
    const files = filesRequest[installPlatform as keyof ZoomFilesResponse] || []

    if (files.length === 0) {
      logWarning(
        `No installer files found for ${appName} on platform ${installPlatform}`,
        LogPrefix.Zoom
      )
      return
    }

    const installerFile = files[0]
    const sizeInBytes = parseSize(installerFile.size)
    const info: ZoomInstallInfo = {
      game: {
        app_name: appName,
        title: gameData.title,
        owned_dlc: [],
        version: 'N/A',
        launch_options: [],
        branches: [],
        buildId: 'N/A'
      },
      manifest: {
        disk_size: sizeInBytes,
        download_size: sizeInBytes,
        app_name: appName,
        languages: [],
        versionEtag: '',
        dependencies: [],
        perLangSize: {
          '*': { download_size: sizeInBytes, disk_size: sizeInBytes }
        }
      }
    }
    installInfoStore.set(appName, info)
    return info
  } catch (error) {
    logError(['Error fetching Zoom install info:', error], LogPrefix.Zoom)
    return
  }
}

export function refreshInstalled() {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return

  const installedArray = installedGamesStore.get('installed', [])
  installedGames.clear()
  installedArray.forEach((value) => {
    if (!value.appName) {
      return
    }
    installedGames.set(value.appName, value)
  })
}

export async function getExtras(appName: string) {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return { extras: [] }

  logDebug(`Fetching extras for Zoom ID ${appName}`, LogPrefix.Zoom)
  try {
    const filesRequest: ZoomFilesResponse = await ZoomUser.makeRequest(
      `${apiUrl}/li/game/${appName}/files`
    )
    const allExtras: {
      name: string
      url: string
      filename: string
      total_size: string
    }[] = []

    for (const extraType of ['manual', 'misc', 'soundtrack'] as const) {
      const files = filesRequest[extraType] || []
      for (const file of files) {
        const downloadRequest = await ZoomUser.makeRequest(
          `${apiUrl}/li/download/${file.id}`
        )
        allExtras.push({
          name: file.name,
          url: downloadRequest.url,
          filename: file.name,
          total_size: getFileSize(file.size)
        })
      }
    }
    return { extras: allExtras }
  } catch (error) {
    logError(['Error fetching Zoom extras:', error], LogPrefix.Zoom)
    return { extras: [] }
  }
}

export async function getInstallers(
  platform: string,
  appName: string
): Promise<ZoomDownloadFile[]> {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return []

  logDebug(
    `Fetching installers for ${appName} on platform ${platform}`,
    LogPrefix.Zoom
  )
  try {
    const filesRequest: ZoomFilesResponse = await ZoomUser.makeRequest(
      `${apiUrl}/li/game/${appName}/files`
    )
    const files = filesRequest[platform as keyof ZoomFilesResponse] || []

    if (files.length === 0) {
      logWarning(
        `No installer files found for ${appName} on platform ${platform}`,
        LogPrefix.Zoom
      )
      return []
    }
    // The Python example asserts len(files) == 1. We'll take the first one for now.
    const installerFile = files[0]
    const downloadRequest = await ZoomUser.makeRequest(
      `${apiUrl}/li/download/${installerFile.id}`
    )

    return [
      {
        url: downloadRequest.url,
        filename: installerFile.name,
        total_size: parseSize(installerFile.size),
        id: installerFile.id,
        name: installerFile.name,
        size: installerFile.size
      }
    ]
  } catch (error) {
    logError(['Error fetching Zoom installers:', error], LogPrefix.Zoom)
    return []
  }
}

export function getLaunchOptions(): LaunchOption[] {
  // The original zoom.py doesn't define specific launch options beyond the main executable.
  // If Zoom games have multiple executables or launch parameters, this needs to be expanded.
  return []
}

export async function changeGameInstallPath(
  appName: string,
  newInstallPath: string
): Promise<void> {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return

  const cachedGameData = library.get(appName)
  if (!cachedGameData || !cachedGameData.install) {
    logError(
      'Changing game install path failed: Game data could not be found',
      LogPrefix.Zoom
    )
    return
  }

  const installedArray = installedGamesStore.get('installed', [])
  const gameIndex = installedArray.findIndex(
    (value) => value.appName === appName
  )

  installedArray[gameIndex].install_path = newInstallPath
  cachedGameData.install.install_path = newInstallPath
  installedGamesStore.set('installed', installedArray)
}

export function installState() {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return

  logWarning(
    `installState not implemented on Zoom Library Manager`,
    LogPrefix.Zoom
  )
}

export function changeVersionPinnedStatus(appName: string, status: boolean) {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return

  const game = library.get(appName)
  const installed = installedGames.get(appName)
  if (!game || !installed) {
    return
  }
  game.install.pinnedVersion = status
  installed.pinnedVersion = status
  library.set(appName, game)
  installedGames.set(appName, installed)

  const installedArray = installedGamesStore.get('installed', [])

  const index = installedArray.findIndex((iGame) => iGame.appName === appName)

  if (index > -1) {
    installedArray.splice(index, 1, installed)
  }
  installedGamesStore.set('installed', installedArray)
  sendFrontendMessage('pushGameToLibrary', game)
}

export async function listUpdateableGames(): Promise<string[]> {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return []

  logWarning('listUpdateableGames not implemented for Zoom', LogPrefix.Zoom)
  return []
}

export function updateGameInLibrary(game: GameInfo) {
  if (!GlobalConfig.get().getSettings().experimentalFeatures?.zoomPlatform)
    return

  if (library.has(game.app_name)) {
    library.set(game.app_name, game)
  }
}
