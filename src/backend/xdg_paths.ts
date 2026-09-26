import { app } from 'electron'
import { mkdirSync } from 'graceful-fs'
import { join } from 'path'

import { isLinux } from 'backend/constants/environment'
import {
  appFolder,
  heroicCachePath,
  heroicStatePath
} from 'backend/constants/paths'
import { moveSyncIfDestinationMissing } from './migration/migrations/xdg_helpers'

const electronUserDataPath = join(heroicStatePath, 'electron')
const electronSessionPath = join(heroicStatePath, 'session')
const electronCachePath = join(heroicCachePath, 'electron')
const electronDiskCachePath = join(electronCachePath, 'disk-cache')
export const electronCodeCachePath = join(electronCachePath, 'code-cache')
const electronCrashDumpsPath = join(heroicStatePath, 'crashDumps')
const electronLogsPath = join(heroicStatePath, 'logs')

const legacyUserDataEntries = ['Local State', 'Partitions']

const legacySessionEntries = [
  'Network Persistent State',
  'Network',
  'Local Storage',
  'Session Storage',
  'IndexedDB',
  'Service Worker',
  'Shared Dictionary',
  'SharedStorage',
  'WebStorage',
  'blob_storage',
  'databases',
  'Dictionaries',
  'Preferences',
  'Cookies',
  'Cookies-journal',
  'QuotaManager',
  'QuotaManager-journal',
  'TransportSecurity',
  'Trust Tokens',
  'Trust Tokens-journal'
]

export function configureElectronXdgPaths() {
  if (!isLinux || process.env.CI === 'e2e') return

  mkdirSync(electronUserDataPath, { recursive: true })
  mkdirSync(electronSessionPath, { recursive: true })
  mkdirSync(electronCachePath, { recursive: true })
  mkdirSync(electronLogsPath, { recursive: true })

  for (const entry of legacyUserDataEntries) {
    moveSyncIfDestinationMissing(
      join(appFolder, entry),
      join(electronUserDataPath, entry)
    )
  }

  for (const entry of legacySessionEntries) {
    moveSyncIfDestinationMissing(
      join(appFolder, entry),
      join(electronSessionPath, entry)
    )
  }

  moveSyncIfDestinationMissing(join(appFolder, 'Cache'), electronDiskCachePath)
  moveSyncIfDestinationMissing(
    join(appFolder, 'Code Cache'),
    electronCodeCachePath
  )
  moveSyncIfDestinationMissing(
    join(appFolder, 'Crashpad'),
    electronCrashDumpsPath
  )
  mkdirSync(electronCrashDumpsPath, { recursive: true })

  app.setPath('userData', electronUserDataPath)
  app.setPath('sessionData', electronSessionPath)
  app.setPath('cache', electronCachePath)
  app.setPath('crashDumps', electronCrashDumpsPath)
  app.setAppLogsPath(electronLogsPath)

  // Chromium has no Electron Session API for choosing the HTTP disk cache
  // directory separately from sessionData.
  app.commandLine.appendSwitch('disk-cache-dir', electronDiskCachePath)
}
