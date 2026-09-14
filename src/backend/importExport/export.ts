import { app } from 'electron'
import { existsSync, readdirSync, readFileSync, statSync } from 'graceful-fs'
import AdmZip from 'adm-zip'

import { logError, logInfo, LogPrefix } from 'backend/logger'
import { configStore } from 'backend/constants/key_value_stores'
import { libraryManagerMap } from 'backend/storeManagers'
import type { Runner } from 'common/types'
import type {
  HeroicBackupManifest,
  HeroicBackupPlatform,
  HeroicExportOptions,
  HeroicExportResult
} from 'common/types/importExport'

import { BACKUP_FORMAT_VERSION, BACKUP_PATHS } from './constants'
import { sourcePaths } from './paths'

function addFileIfExists(
  zip: AdmZip,
  sourceFile: string,
  destInZip: string
): boolean {
  if (!existsSync(sourceFile)) return false
  try {
    if (!statSync(sourceFile).isFile()) return false
  } catch {
    return false
  }
  const lastSlash = destInZip.lastIndexOf('/')
  const dir = lastSlash >= 0 ? destInZip.slice(0, lastSlash + 1) : ''
  const fileName = lastSlash >= 0 ? destInZip.slice(lastSlash + 1) : destInZip
  zip.addLocalFile(sourceFile, dir, fileName)
  return true
}

function addFolderIfExists(
  zip: AdmZip,
  sourceDir: string,
  destInZip: string
): number {
  if (!existsSync(sourceDir)) return 0
  try {
    if (!statSync(sourceDir).isDirectory()) return 0
  } catch {
    return 0
  }
  const before = zip.getEntries().length
  zip.addLocalFolder(sourceDir, destInZip.replace(/\/$/, ''))
  return zip.getEntries().length - before
}

function safeParseJson<T>(path: string): T | null {
  try {
    if (!existsSync(path)) return null
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch {
    return null
  }
}

function countJsonFiles(dir: string): number {
  if (!existsSync(dir)) return 0
  try {
    return readdirSync(dir).filter((f) => f.endsWith('.json')).length
  } catch {
    return 0
  }
}

function countInstalledWineVersions(): number {
  const data = safeParseJson<{ 'wine-releases'?: unknown[] }>(
    sourcePaths.wine.infoStore()
  )
  const list = data?.['wine-releases']
  if (!Array.isArray(list)) return 0
  return list.filter(
    (v) =>
      !!v &&
      typeof v === 'object' &&
      (v as Record<string, unknown>)['isInstalled'] === true
  ).length
}

function toBackupPlatform(): HeroicBackupPlatform {
  if (process.platform === 'darwin') return 'darwin'
  if (process.platform === 'win32') return 'win32'
  return 'linux'
}

export async function exportHeroicBackup(
  options: HeroicExportOptions
): Promise<HeroicExportResult> {
  const { outputPath, stages } = options
  const zip = new AdmZip()

  const manifest: HeroicBackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    heroicVersion: app.getVersion(),
    platform: toBackupPlatform(),
    stages: [...stages],
    counts: {
      perGameSettings: 0,
      installedGames: {},
      credentials: {
        legendary: false,
        gog: false,
        nile: false,
        zoom: false
      },
      fixesIncluded: false,
      themesIncluded: false,
      wineVersions: 0,
      sideloadGames: 0,
      categories: 0
    }
  }

  try {
    if (stages.includes('globalSettings')) {
      addFileIfExists(
        zip,
        sourcePaths.globalConfig(),
        BACKUP_PATHS.globalSettings.config
      )
      manifest.counts.fixesIncluded =
        addFolderIfExists(
          zip,
          sourcePaths.fixesDir(),
          BACKUP_PATHS.globalSettings.fixesDir
        ) > 0
      const themesDir = sourcePaths.customThemesDir()
      if (themesDir) {
        manifest.counts.themesIncluded =
          addFolderIfExists(
            zip,
            themesDir,
            BACKUP_PATHS.globalSettings.themesDir
          ) > 0
      }
    }

    if (stages.includes('perGameSettings')) {
      addFolderIfExists(
        zip,
        sourcePaths.gamesConfigDir(),
        BACKUP_PATHS.perGameSettings.dir
      )
      manifest.counts.perGameSettings = countJsonFiles(
        sourcePaths.gamesConfigDir()
      )
    }

    const runners = Object.keys(libraryManagerMap) as Runner[]

    if (stages.includes('credentials')) {
      for (const runner of runners) {
        const { credentials } = libraryManagerMap[runner].getBackupPaths()
        if (credentials.length === 0) continue
        let loggedIn = false
        for (const file of credentials) {
          const added = addFileIfExists(zip, file.source(), file.destInZip)
          if (added && file.indicatesLogin !== false) loggedIn = true
        }
        manifest.counts.credentials[runner] = loggedIn
      }
    }

    if (stages.includes('libraryCache')) {
      for (const runner of runners) {
        const { libraryCache, installedGames } =
          libraryManagerMap[runner].getBackupPaths()
        for (const file of libraryCache) {
          if (file.kind === 'dir') {
            addFolderIfExists(zip, file.source(), file.destInZip)
          } else {
            addFileIfExists(zip, file.source(), file.destInZip)
          }
        }
        if (
          installedGames &&
          addFileIfExists(
            zip,
            installedGames.source(),
            installedGames.destInZip
          )
        ) {
          manifest.counts.installedGames[runner] = installedGames.countGames()
        }
      }
    }

    if (stages.includes('sideloadLibrary')) {
      for (const runner of runners) {
        const { sideloadLibrary } = libraryManagerMap[runner].getBackupPaths()
        if (!sideloadLibrary) continue
        if (
          addFileIfExists(
            zip,
            sideloadLibrary.source(),
            sideloadLibrary.destInZip
          )
        ) {
          manifest.counts.sideloadGames = sideloadLibrary.countGames()
          manifest.counts.installedGames[runner] = manifest.counts.sideloadGames
        }
      }
    }

    if (stages.includes('categories')) {
      const categories = configStore.get('games.customCategories', {})
      zip.addFile(
        BACKUP_PATHS.categories.file,
        Buffer.from(JSON.stringify(categories, null, 2), 'utf-8')
      )
      manifest.counts.categories = Object.keys(categories).length
    }

    if (stages.includes('wineMetadata')) {
      if (
        addFileIfExists(
          zip,
          sourcePaths.wine.infoStore(),
          BACKUP_PATHS.wineMetadata.store
        )
      ) {
        manifest.counts.wineVersions = countInstalledWineVersions()
      }
    }

    zip.addFile(
      BACKUP_PATHS.manifest,
      Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8')
    )

    await zip.writeZipPromise(outputPath)

    logInfo(['Exported Heroic backup to', outputPath], LogPrefix.ImportExport)
    return { success: true, path: outputPath, manifest }
  } catch (error) {
    logError(['Failed to export Heroic backup:', error], LogPrefix.ImportExport)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
