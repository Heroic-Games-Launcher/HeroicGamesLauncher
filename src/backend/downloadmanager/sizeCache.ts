import { TypeCheckedStoreBackend } from '../electron_store'
import { SizeCacheEntry } from 'common/types'
import { logInfo, LogPrefix } from 'backend/logger'

const MAX_CACHE_ENTRIES = 10
const TTL_MS = 12 * 60 * 60 * 1000

const sizeCacheStore = new TypeCheckedStoreBackend('sizeCache', {
  cwd: 'store',
  name: 'size-cache'
})

function normalizePlatform(platform: string, runner: string): string {
  if (runner === 'legendary') return platform
  switch (platform) {
    case 'Mac':
      return 'osx'
    case 'Windows':
      return 'windows'
    default:
      return platform
  }
}

function buildCacheKey(
  type: 'install' | 'update',
  appName: string,
  runner: string,
  platform: string,
  installLanguage?: string,
  sdlList?: string[],
  branch?: string,
  build?: string
): string {
  const sdl = sdlList ? [...sdlList].sort().join(',') : ''
  return [
    type,
    appName,
    runner,
    normalizePlatform(platform, runner),
    installLanguage ?? '',
    sdl,
    branch ?? '',
    build ?? ''
  ].join('::')
}

function getCachedSize(key: string): string | null {
  const entries = sizeCacheStore.get('entries', [])
  const entry = entries.find((e) => e.key === key)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > TTL_MS) return null
  return entry.formattedSize
}

function setCachedSize(key: string, formattedSize: string): void {
  const entries = sizeCacheStore.get('entries', [])
  const existingIndex = entries.findIndex((e) => e.key === key)

  const newEntry: SizeCacheEntry = { key, formattedSize, cachedAt: Date.now() }

  if (existingIndex >= 0) {
    entries[existingIndex] = newEntry
  } else {
    if (entries.length >= MAX_CACHE_ENTRIES) {
      entries.shift()
    }
    entries.push(newEntry)
  }

  sizeCacheStore.set('entries', entries)
  logInfo(
    [`Size cache updated: ${key} → ${formattedSize}`],
    LogPrefix.DownloadManager
  )
}

export { buildCacheKey, getCachedSize, setCachedSize }
