import { ExecResult, GameInfo, InstallInfo, InstallPlatform, LaunchOption } from 'common/types'
import { RestPluginManifest, RestLibraryResponse, RestGameDetailsResponse } from 'common/types/rest_store'
import { logInfo, logError, LogPrefix } from 'backend/logger'
import { sendFrontendMessage } from '../../ipc'
import { restLibraryStore } from './electronStores'
import { getRestPlugins, getRestPluginManifest, getRestPluginConfig, setRestPluginManifest } from './config'
import axios, { AxiosInstance } from 'axios'

const library: Map<string, GameInfo> = new Map()

// Plugin-specific HTTP clients
const pluginClients = new Map<string, AxiosInstance>()

function getPluginClient(pluginId: string): AxiosInstance {
  if (!pluginClients.has(pluginId)) {
    const config = getRestPluginConfig(pluginId)
    if (!config) {
      throw new Error(`Plugin ${pluginId} not configured`)
    }

    const manifest = getRestPluginManifest(pluginId)
    const client = axios.create({
      baseURL: manifest.baseUrl,
      timeout: 30000
    })

    // Add auth if configured
    if (manifest.auth?.type === 'bearer' && config.token) {
      const header = manifest.auth.tokenHeader || 'Authorization'
      client.defaults.headers.common[header] = `Bearer ${config.token}`
    }

    pluginClients.set(pluginId, client)
  }
  return pluginClients.get(pluginId)!
}

function getPluginIdFromAppName(appName: string): string {
  const parts = appName.split(':')
  if (parts.length >= 3 && parts[0] === 'rest') {
    return parts[1]
  }
  throw new Error(`Invalid REST app name format: ${appName}`)
}

function getGameIdFromAppName(appName: string): string {
  const parts = appName.split(':')
  if (parts.length >= 3 && parts[0] === 'rest') {
    return parts.slice(2).join(':')
  }
  throw new Error(`Invalid REST app name format: ${appName}`)
}

export async function initRestLibraryManager() {
  await refresh()
}

export async function refresh(): Promise<ExecResult | null> {
  try {
    const plugins = getRestPlugins()
    const allGames: GameInfo[] = []

    for (const pluginId of plugins) {
      try {
        const config = getRestPluginConfig(pluginId)

        if (!config || !config.enabled) {
          continue
        }

        // Ensure manifest is loaded
        let manifest: RestPluginManifest
        try {
          manifest = getRestPluginManifest(pluginId)
        } catch {
          // Manifest not cached, try to load it
          const loadedManifest = await axios.get<RestPluginManifest>(
            `${config.baseUrl}/manifest.json`,
            { timeout: 10000 }
          )
          manifest = loadedManifest.data
          setRestPluginManifest(pluginId, manifest)
        }

        // Create HTTP client
        const client = axios.create({
          baseURL: manifest.baseUrl,
          timeout: 30000
        })

        if (manifest.auth?.type === 'bearer' && config.token) {
          const header = manifest.auth.tokenHeader || 'Authorization'
          client.defaults.headers.common[header] = `Bearer ${config.token}`
        }

        // Fetch library
        const response = await client.get<RestLibraryResponse>(manifest.endpoints.library)

        // Convert REST games to Heroic GameInfo format
        for (const restGame of response.data.games) {
          const appName = `rest:${pluginId}:${restGame.id}`
          const gameInfo: GameInfo = {
            runner: 'rest',
            app_name: appName,
            title: restGame.title,
            art_cover: restGame.art_cover,
            art_square: restGame.art_square,
            art_logo: restGame.art_logo,
            art_background: restGame.art_background,
            developer: restGame.developer,
            description: restGame.description,
            install: {
              platform: restGame.platform,
              is_dlc: false
            },
            installable: restGame.installable,
            is_installed: restGame.is_installed,
            canRunOffline: restGame.canRunOffline,
            store_url: restGame.store_url,
            version: restGame.version
          }

          library.set(appName, gameInfo)
          allGames.push(gameInfo)
        }

        logInfo(`Loaded ${response.data.games.length} games from plugin ${pluginId}`, LogPrefix.RestStore)
      } catch (error) {
        logError(`Failed to refresh plugin ${pluginId}: ${error}`, LogPrefix.RestStore)
      }
    }

    // Update store
    restLibraryStore.set('games', allGames)

    // Notify frontend
    sendFrontendMessage('refreshLibrary', 'rest')

    return null
  } catch (error) {
    logError(`Failed to refresh REST library: ${error}`, LogPrefix.RestStore)
    return { stderr: String(error), stdout: '' }
  }
}

export function getGameInfo(appName: string, forceReload?: boolean): GameInfo | undefined {
  if (forceReload) {
    // Reload from store
    const games = restLibraryStore.get('games', [])
    return games.find((g: GameInfo) => g.app_name === appName)
  }
  return library.get(appName)
}

export async function getInstallInfo(
  appName: string,
  installPlatform: InstallPlatform,
  options: {
    branch?: string
    build?: string
    lang?: string
    retries?: number
  }
): Promise<InstallInfo | undefined> {
  try {
    const pluginId = getPluginIdFromAppName(appName)
    const gameId = getGameIdFromAppName(appName)
    const manifest = getRestPluginManifest(pluginId)
    const client = getPluginClient(pluginId)

    const endpoint = manifest.endpoints.game.replace(':id', gameId)
    const response = await client.get<RestGameDetailsResponse>(endpoint)

    return {
      game: {
        runner: 'rest',
        app_name: appName,
        title: response.data.title,
        art_cover: response.data.art_cover,
        art_square: response.data.art_square,
        install: {
          platform: response.data.install.platform,
          install_path: response.data.install.install_path,
          executable: response.data.install.executable,
          is_dlc: false
        },
        is_installed: response.data.is_installed,
        canRunOffline: response.data.canRunOffline,
        version: response.data.version || 'unknown'
      },
      manifest: {
        download_size: response.data.install.size || 0,
        disk_size: response.data.install.size || 0,
        app_name: appName,
        languages: [],
        versionEtag: '',
        dependencies: [],
        perLangSize: {}
      }
    }
  } catch (error) {
    logError(`Failed to get install info for ${appName}: ${error}`, LogPrefix.RestStore)
    return undefined
  }
}

export async function listUpdateableGames(): Promise<string[]> {
  // TODO: Implement update detection logic
  return []
}

export async function changeGameInstallPath(appName: string, newPath: string): Promise<void> {
  // TODO: Implement path change logic
  logInfo(`Changing install path for ${appName} to ${newPath}`, LogPrefix.RestStore)
}

export function changeVersionPinnedStatus(appName: string, status: boolean): void {
  // TODO: Implement version pinning if supported
  logInfo(`Version pinning ${status ? 'enabled' : 'disabled'} for ${appName}`, LogPrefix.RestStore)
}

export function installState(appName: string, state: boolean): void {
  // Update game install state
  const gameInfo = getGameInfo(appName)
  if (gameInfo) {
    gameInfo.is_installed = state
    const games = restLibraryStore.get('games', [])
    const index = games.findIndex((g: GameInfo) => g.app_name === appName)
    if (index >= 0) {
      games[index] = gameInfo
      restLibraryStore.set('games', games)
      library.set(appName, gameInfo)
    }
  }
}

export const getLaunchOptions = (appName: string): LaunchOption[] => {
  // TODO: Return launch options if plugin provides them
  return []
}

