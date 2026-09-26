import { app } from 'electron'
import { moveSync } from 'fs-extra'
import { existsSync, mkdirSync } from 'graceful-fs'
import { dirname, join } from 'path'

import { isLinux } from 'backend/constants/environment'
import {
  appFolder,
  heroicCachePath,
  heroicStatePath
} from 'backend/constants/paths'

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

function moveIfDestinationMissing(source: string, destination: string) {
  if (!existsSync(source) || existsSync(destination)) return
  mkdirSync(dirname(destination), { recursive: true })
  moveSync(source, destination)
}

export function configureElectronXdgPaths() {
  if (!isLinux || process.env.CI === 'e2e') return

  mkdirSync(electronUserDataPath, { recursive: true })
  mkdirSync(electronSessionPath, { recursive: true })
  mkdirSync(electronCachePath, { recursive: true })
  mkdirSync(electronLogsPath, { recursive: true })

  for (const entry of legacyUserDataEntries) {
    moveIfDestinationMissing(
      join(appFolder, entry),
      join(electronUserDataPath, entry)
    )
  }

  for (const entry of legacySessionEntries) {
    moveIfDestinationMissing(
      join(appFolder, entry),
      join(electronSessionPath, entry)
    )
  }

  moveIfDestinationMissing(join(appFolder, 'Cache'), electronDiskCachePath)
  moveIfDestinationMissing(join(appFolder, 'Code Cache'), electronCodeCachePath)
  moveIfDestinationMissing(join(appFolder, 'Crashpad'), electronCrashDumpsPath)
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
