type XdgStoreDirectory = 'data' | 'state' | 'cache'

const dataStores = new Set([
  'wineDownloaderInfoStore',
  'gogConfigStore',
  'zoomConfigStore',
  'nileConfigStore',
  'sideloadedStore',
  'gogPrivateBranches',
  'gameOverridesStore'
])

const stateStores = new Set([
  'gogInstalledGamesStore',
  'zoomInstalledGamesStore',
  'timestampStore',
  'downloadManager',
  'gogSyncStore',
  'zoomSyncStore',
  'uploadedLogs',
  'migrationsStore'
])

const cacheStores = new Set(['fontsStore'])

export function getXdgStoreDirectory(
  storeName: string,
  cwd?: string
): XdgStoreDirectory | null {
  if (cwd === 'store_cache') return 'cache'
  if (dataStores.has(storeName)) return 'data'
  if (stateStores.has(storeName)) return 'state'
  if (cacheStores.has(storeName)) return 'cache'
  return null
}
