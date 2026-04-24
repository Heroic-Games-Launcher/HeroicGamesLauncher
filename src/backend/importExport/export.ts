import { app } from 'electron'
import { existsSync, readdirSync, readFileSync, statSync } from 'graceful-fs'
import AdmZip from 'adm-zip'

import { logError, logInfo, LogPrefix } from 'backend/logger'
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

function countInstalledLegendary(): number {
  const data = safeParseJson<Record<string, unknown>>(
    sourcePaths.legendary.installed()
  )
  return data ? Object.keys(data).length : 0
}

function countInstalledGog(): number {
  const data = safeParseJson<{ installed?: unknown[] }>(
    sourcePaths.gog.installedFile()
  )
  return Array.isArray(data?.installed) ? data.installed.length : 0
}

function countInstalledNile(): number {
  const data = safeParseJson<unknown[]>(sourcePaths.nile.installed())
  return Array.isArray(data) ? data.length : 0
}

function countSideloadGames(): number {
  const data = safeParseJson<{ games?: unknown[] }>(
    sourcePaths.sideload.library()
  )
  return Array.isArray(data?.games) ? data.games.length : 0
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
      sideloadGames: 0
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

    if (stages.includes('credentials')) {
      manifest.counts.credentials.legendary = addFileIfExists(
        zip,
        sourcePaths.legendary.user(),
        BACKUP_PATHS.credentials.legendaryUser
      )
      manifest.counts.credentials.nile = addFileIfExists(
        zip,
        sourcePaths.nile.user(),
        BACKUP_PATHS.credentials.nileUser
      )
      manifest.counts.credentials.gog = addFileIfExists(
        zip,
        sourcePaths.gog.configFile(),
        BACKUP_PATHS.credentials.gogConfig
      )
      manifest.counts.credentials.zoom = addFileIfExists(
        zip,
        sourcePaths.zoom.configFile(),
        BACKUP_PATHS.credentials.zoomConfig
      )
    }

    if (stages.includes('libraryCache')) {
      addFileIfExists(
        zip,
        sourcePaths.libraryCache.legendary(),
        BACKUP_PATHS.libraryCache.legendaryLibrary
      )
      addFileIfExists(
        zip,
        sourcePaths.libraryCache.gog(),
        BACKUP_PATHS.libraryCache.gogLibrary
      )
      addFileIfExists(
        zip,
        sourcePaths.libraryCache.nile(),
        BACKUP_PATHS.libraryCache.nileLibrary
      )
      addFileIfExists(
        zip,
        sourcePaths.libraryCache.zoom(),
        BACKUP_PATHS.libraryCache.zoomLibrary
      )

      if (
        addFileIfExists(
          zip,
          sourcePaths.legendary.installed(),
          BACKUP_PATHS.libraryCache.legendaryInstalled
        )
      ) {
        manifest.counts.installedGames.legendary = countInstalledLegendary()
      }
      addFileIfExists(
        zip,
        sourcePaths.legendary.thirdPartyInstalled(),
        BACKUP_PATHS.libraryCache.legendaryThirdParty
      )
      addFolderIfExists(
        zip,
        sourcePaths.legendary.metadataDir(),
        BACKUP_PATHS.libraryCache.legendaryMetadataDir
      )
      if (
        addFileIfExists(
          zip,
          sourcePaths.gog.installedFile(),
          BACKUP_PATHS.libraryCache.gogInstalled
        )
      ) {
        manifest.counts.installedGames.gog = countInstalledGog()
      }
      if (
        addFileIfExists(
          zip,
          sourcePaths.nile.installed(),
          BACKUP_PATHS.libraryCache.nileInstalled
        )
      ) {
        manifest.counts.installedGames.nile = countInstalledNile()
      }
      addFileIfExists(
        zip,
        sourcePaths.nile.library(),
        BACKUP_PATHS.libraryCache.nileLibraryFile
      )
    }

    if (stages.includes('sideloadLibrary')) {
      if (
        addFileIfExists(
          zip,
          sourcePaths.sideload.library(),
          BACKUP_PATHS.sideloadLibrary.library
        )
      ) {
        manifest.counts.sideloadGames = countSideloadGames()
        manifest.counts.installedGames.sideload = manifest.counts.sideloadGames
      }
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
