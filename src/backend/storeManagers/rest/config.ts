import { RestPluginManifest } from 'common/types/rest_store'
import { restConfigStore } from './electronStores'
import axios from 'axios'
import { logError, logInfo, LogPrefix } from 'backend/logger'

export interface RestPluginConfig {
  id: string
  enabled: boolean
  baseUrl: string
  token?: string
  username?: string
  lastSync?: number
}

export function getRestPlugins(): string[] {
  const configs = restConfigStore.get('plugins', [])
  return configs.map((c: RestPluginConfig) => c.id)
}

export function getRestPluginConfig(pluginId: string): RestPluginConfig | undefined {
  const configs = restConfigStore.get('plugins', [])
  return configs.find((c: RestPluginConfig) => c.id === pluginId)
}

export async function loadRestPluginManifest(baseUrl: string): Promise<RestPluginManifest> {
  try {
    const response = await axios.get<RestPluginManifest>(`${baseUrl}/manifest.json`, {
      timeout: 10000
    })
    return response.data
  } catch (error) {
    logError(`Failed to load manifest from ${baseUrl}: ${error}`, LogPrefix.RestStore)
    throw error
  }
}

const manifestCache = new Map<string, RestPluginManifest>()

export function getRestPluginManifest(pluginId: string): RestPluginManifest {
  const cached = manifestCache.get(pluginId)
  if (cached) {
    return cached
  }

  const config = getRestPluginConfig(pluginId)
  if (!config) {
    throw new Error(`Plugin ${pluginId} not configured`)
  }

  // In production, you'd load this from cache or re-fetch
  throw new Error(`Manifest for ${pluginId} not loaded. Call loadRestPluginManifest first.`)
}

export async function addRestPlugin(baseUrl: string): Promise<RestPluginConfig> {
  const manifest = await loadRestPluginManifest(baseUrl)

  const config: RestPluginConfig = {
    id: manifest.id,
    enabled: true,
    baseUrl: manifest.baseUrl,
    lastSync: Date.now()
  }

  const configs = restConfigStore.get('plugins', [])
  const existingIndex = configs.findIndex((c: RestPluginConfig) => c.id === manifest.id)

  if (existingIndex >= 0) {
    configs[existingIndex] = { ...configs[existingIndex], ...config }
  } else {
    configs.push(config)
  }

  restConfigStore.set('plugins', configs)
  manifestCache.set(manifest.id, manifest)

  logInfo(`Added REST plugin: ${manifest.name} (${manifest.id})`, LogPrefix.RestStore)

  return config
}

export function setRestPluginManifest(pluginId: string, manifest: RestPluginManifest) {
  manifestCache.set(pluginId, manifest)
}

