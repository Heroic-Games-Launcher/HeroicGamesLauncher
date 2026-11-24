import type { GOGClientsResponse, GOGCloudSavesInfo } from 'common/types/gog'

export const GOG_REMOTE_CONFIG_COMPONENT_VERSION = '2.0.45'
export const GOG_REMOTE_CONFIG_TTL = 24 * 60 * 60 * 1000

export const clientIdFromManifest = (data: {
  version?: number
  clientId?: string
}): string | undefined => (data.version === 2 ? data.clientId : undefined)

export const parseGOGCloudStorage = (
  response: GOGClientsResponse | undefined,
  platform: 'Windows' | 'MacOS'
): GOGCloudSavesInfo | undefined => {
  const cloudStorage = response?.content?.[platform]?.cloudStorage
  if (!cloudStorage) {
    return undefined
  }

  return {
    enabled: Boolean(cloudStorage.enabled),
    locations: cloudStorage.locations ?? []
  }
}
