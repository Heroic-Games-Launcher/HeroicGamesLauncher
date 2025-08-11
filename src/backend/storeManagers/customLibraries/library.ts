import {
  ExecResult,
  InstalledInfo,
  LaunchOption,
  CustomLibraryGameInfo
} from 'common/types'
import { libraryStore, installedGamesStore } from './electronStores'
import { logInfo, logWarning, LogPrefix } from 'backend/logger'
import { sendFrontendMessage } from 'backend/ipc'
import { getFileSize } from 'backend/utils'
import { backendEvents } from 'backend/backend_events'
import { existsSync } from 'fs'
import type { InstallPlatform } from 'common/types'
import {
  getCachedCustomLibraryEntry,
  getCustomLibraries
} from 'backend/storeManagers/customLibraries/customLibraryManager'
import { CustomLibraryInstallInfo } from 'common/types/customLibraries'

const installedGames: Map<string, InstalledInfo> = new Map()

/**
 * Loads installed data and adds it into a Map
 */
export function refreshInstalled() {
  const installedArray = installedGamesStore.get('installed', [])
  installedGames.clear()
  installedArray.forEach((value) => {
    if (!value.appName) {
      return
    }
    installedGames.set(value.appName, value)
  })
}

export async function initCustomLibraryManager() {
  logInfo('Initializing Custom Library Manager with URL-based JSON files')

  // Listen for settings changes
  backendEvents.on('settingChanged', ({ key }) => {
    if (key === 'customLibraryUrls' || key === 'customLibraryConfigs') {
      logInfo(`Custom library ${key} setting changed, refreshing libraries`)
      refresh().catch((error) => {
        logWarning(
          `Failed to refresh custom libraries after settings change: ${error}`
        )
      })
    }
  })

  await refresh()
}

// Add this function like GOG's loadLocalLibrary
async function loadLocalLibrary() {
  logInfo('Loading local custom library', LogPrefix.CustomLibrary)
  for (const game of libraryStore.get('games', [])) {
    const copyObject = { ...game }
    if (installedGames.has(game.app_name)) {
      logInfo(
        `Found installed game in local library: ${game.app_name}`,
        LogPrefix.CustomLibrary
      )
      copyObject.install = installedGames.get(game.app_name)!
      copyObject.is_installed = true
    }
    // Note: We don't need to store this in a separate library map like GOG does
    // since we reconstruct the library each time
  }
}

export async function refresh(): Promise<ExecResult> {
  try {
    refreshInstalled()
    await loadLocalLibrary()

    const allGames: CustomLibraryGameInfo[] = []
    let totalLoadedLibraries = 0

    const libraries = await getCustomLibraries()

    for (const config of libraries) {
      try {
        totalLoadedLibraries++

        // Store each game's original config data for quick lookup
        for (const game of config.games) {
          // Use unique app name for installed games lookup
          const installedInfo = installedGames.get(game.app_name)

          logInfo(
            `Processing game ${game.app_name}: ${installedInfo ? 'INSTALLED' : 'NOT INSTALLED'}`,
            LogPrefix.CustomLibrary
          )

          const gameInfo: CustomLibraryGameInfo = {
            runner: 'customLibrary',
            app_name: game.app_name,
            title: game.title,
            art_cover: game.art_cover || '',
            art_square: game.art_square || '',
            install: {
              executable: game.executable,
              platform: (game.platform as InstallPlatform) || 'Windows',
              install_path: `/${game.app_name}`,
              install_size: game.install_size_bytes
                ? getFileSize(game.install_size_bytes)
                : '',
              version: game.version,
              is_dlc: false
            },
            is_installed: false,
            canRunOffline: true,
            folder_name: game.app_name, // Use unique name for folder
            description: game.description,
            developer: game.developer,
            extra: {
              about: {
                description: game.description || '',
                shortDescription: game.description || ''
              },
              reqs: [],
              storeUrl: '',
              releaseDate: game.release_date,
              genres: game.genres
            },
            customLibraryId: config.name,
            customLibraryName: config.name,
            installSizeBytes: game.install_size_bytes,
            installTasks: game.install_tasks || [],
            uninstallTasks: game.uninstall_tasks || []
          }

          // Set installation status
          if (installedInfo) {
            gameInfo.is_installed = true
            gameInfo.install = installedInfo
            logInfo(
              `Set ${game.app_name} as installed with info:`,
              LogPrefix.CustomLibrary
            )
          } else {
            logInfo(
              `${game.app_name} is not installed`,
              LogPrefix.CustomLibrary
            )
          }

          allGames.push(gameInfo)
          logInfo(
            `Added game: ${gameInfo.title} (${gameInfo.app_name}) - installed: ${gameInfo.is_installed}`
          )
        }
      } catch (error) {
        logWarning(`Error processing library ${config.name}: ${error}`)
      }
    }

    libraryStore.set('games', allGames)
    sendFrontendMessage('refreshLibrary', 'customLibrary')

    logInfo(
      `Successfully loaded ${allGames.length} custom games from ${totalLoadedLibraries} libraries`
    )
    return {
      stdout: `Loaded ${allGames.length} games from ${totalLoadedLibraries} custom libraries`,
      stderr: ''
    }
  } catch (error) {
    logWarning(`Error refreshing custom libraries: ${error}`)
    return { stdout: '', stderr: String(error) }
  }
}

export function getGameInfo(appName: string): CustomLibraryGameInfo {
  const games = libraryStore.get('games', [])
  return games.find(
    (game) => game.app_name === appName
  ) as CustomLibraryGameInfo
}

export async function getInstallInfo(
  appName: string
): Promise<CustomLibraryInstallInfo> {
  const gameInfo = getGameInfo(appName)

  // Default sizes
  let installSizeBytes = 100 * 1024 * 1024 // 100MB default
  let downloadSizeBytes = 100 * 1024 * 1024 // 100MB default

  // Use install_size_bytes from the original game data if available
  if (gameInfo?.installSizeBytes) {
    installSizeBytes = gameInfo.installSizeBytes
    downloadSizeBytes = gameInfo.installSizeBytes // Assume download size equals install size
  }

  // Return install info that satisfies the frontend requirements
  return {
    game: {
      app_name: appName,
      title: gameInfo.title,
      version: gameInfo?.version || '1.0.0',
      owned_dlc: []
    },
    manifest: {
      app_name: appName,
      disk_size: installSizeBytes,
      download_size: downloadSizeBytes,
      languages: ['en'],
      versionEtag: ''
    }
  }
}

export async function importGame(
  gameInfo: CustomLibraryGameInfo,
  installPath: string,
  platform: InstallPlatform
): Promise<void> {
  // Basic validation
  if (!existsSync(installPath)) {
    throw new Error(`Import path does not exist: ${installPath}`)
  }

  if (!gameInfo.install?.executable) {
    throw new Error(
      `Game ${gameInfo.app_name} has no executable defined in library`
    )
  }

  // Create installation info
  const installedData: InstalledInfo = {
    platform,
    executable: gameInfo.install.executable,
    install_path: installPath,
    install_size: gameInfo.install.install_size || '0',
    is_dlc: false,
    version: gameInfo.install.version || '1.0',
    appName: gameInfo.app_name
  }

  // Update installed games store
  const installedArray = installedGamesStore.get('installed', [])
  const filteredArray = installedArray.filter(
    (item) => item.appName !== gameInfo.app_name
  )
  filteredArray.push(installedData)
  installedGamesStore.set('installed', filteredArray)

  // Update game library
  const games = libraryStore.get('games', [])
  const gameIndex = games.findIndex(
    (game) => game.app_name === gameInfo.app_name
  )
  if (gameIndex !== -1) {
    games[gameIndex].is_installed = true
    games[gameIndex].install = installedData
    libraryStore.set('games', games)
  }

  // Refresh and notify
  refreshInstalled()
  sendFrontendMessage('pushGameToLibrary', games[gameIndex])
}

export function installState() {
  logWarning(`installState not implemented on Sideload Library Manager`)
}

export async function listUpdateableGames(): Promise<string[]> {
  try {
    logInfo('Checking for custom library game updates', LogPrefix.CustomLibrary)

    const updateableGames: string[] = []
    const libraries = await getCustomLibraries()

    for (const config of libraries) {
      for (const game of config.games) {
        const installedInfo = installedGames.get(game.app_name)

        // Only check installed games
        if (!installedInfo) {
          continue
        }

        console.log('new versionfoo', game.version)
        console.log('current versionfoo', installedInfo.version)
        // Compare library config version with installed version
        const libraryVersion = game.version || '1.0.0'
        const installedVersion = installedInfo.version || '1.0.0'

        if (libraryVersion !== installedVersion) {
          logInfo(
            `Update available for ${game.app_name}: ${installedVersion} -> ${libraryVersion}`,
            LogPrefix.CustomLibrary
          )
          updateableGames.push(game.app_name)
        } else {
          logInfo(
            `${game.app_name} is up to date (${installedVersion})`,
            LogPrefix.CustomLibrary
          )
        }
      }
    }

    logInfo(
      `Found ${updateableGames.length} custom library game(s) to update`,
      LogPrefix.CustomLibrary
    )

    return updateableGames
  } catch (error) {
    logWarning(`Error checking for custom library updates: ${error}`)
    return []
  }
}

export async function runRunnerCommand(): Promise<ExecResult> {
  logWarning(`runRunnerCommand not implemented on Sideload Library Manager`)
  return { stdout: '', stderr: '' }
}

export async function changeGameInstallPath(): Promise<void> {
  logWarning(
    `changeGameInstallPath not implemented on Sideload Library Manager`
  )
}

export const getLaunchOptions = (appName: string): LaunchOption[] => {
  const originalGameConfig = getCachedCustomLibraryEntry(appName)
  return originalGameConfig?.launch_options || []
}

export function changeVersionPinnedStatus() {
  logWarning(
    'changeVersionPinnedStatus not implemented on Sideload Library Manager'
  )
}
