import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import AdmZip from 'adm-zip'

jest.mock('electron-store')
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn(),
  LogPrefix: { ImportExport: 'ImportExport' }
}))
jest.mock('backend/config', () => ({
  GlobalConfig: {
    get: () => ({
      getSettings: () => ({ customThemesPath: '' })
    })
  }
}))

const tmpRoot = mkdtempSync(join(tmpdir(), 'heroic-export-test-'))
const appFolder = join(tmpRoot, 'heroic')
const userData = join(tmpRoot, 'userData')

jest.mock('backend/constants/paths', () => ({
  appFolder,
  configPath: join(appFolder, 'config.json'),
  gamesConfigPath: join(appFolder, 'GamesConfig'),
  fixesPath: join(appFolder, 'fixes'),
  toolsPath: join(appFolder, 'tools')
}))

jest.mock('backend/constants/environment', () => ({
  isSnap: false
}))

jest.mock('electron', () => ({
  app: {
    getPath: () => userData,
    getVersion: () => '9.9.9-test'
  }
}))

// Import after mocks so paths.ts picks them up
import { exportHeroicBackup } from '../export'
import { BACKUP_PATHS } from '../constants'

const writeJson = (path: string, data: unknown) => {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

describe('exportHeroicBackup', () => {
  beforeAll(() => {
    // Heroic global config
    mkdirSync(appFolder, { recursive: true })
    writeJson(join(appFolder, 'config.json'), {
      version: 'v0',
      defaultSettings: { winePrefix: '/prefix' }
    })

    // Per-game settings
    mkdirSync(join(appFolder, 'GamesConfig'), { recursive: true })
    writeJson(join(appFolder, 'GamesConfig', 'game1.json'), {
      game1: { winePrefix: '/custom' },
      version: 'v0.1',
      explicit: ['winePrefix']
    })
    writeJson(join(appFolder, 'GamesConfig', 'game2.json'), {
      game2: {},
      version: 'v0.1'
    })

    // Fixes
    mkdirSync(join(appFolder, 'fixes'), { recursive: true })
    writeJson(join(appFolder, 'fixes', 'game1-epic.json'), { fix: 'data' })

    // Legendary
    const legendaryDir = join(appFolder, 'legendaryConfig', 'legendary')
    mkdirSync(legendaryDir, { recursive: true })
    writeJson(join(legendaryDir, 'user.json'), { account_id: 'abc' })
    writeJson(join(legendaryDir, 'installed.json'), {
      game1: { app_name: 'game1', install_path: '/games/1' }
    })
    mkdirSync(join(legendaryDir, 'metadata'), { recursive: true })
    writeJson(join(legendaryDir, 'metadata', 'game1.json'), { title: 'Game 1' })

    // Nile
    const nileDir = join(appFolder, 'nile_config', 'nile')
    mkdirSync(nileDir, { recursive: true })
    writeJson(join(nileDir, 'user.json'), { tokens: {} })
    writeJson(join(nileDir, 'installed.json'), [
      { id: 'nile1', version: '1', path: '/n/1', size: 0 }
    ])

    // GOG store
    mkdirSync(join(userData, 'gog_store'), { recursive: true })
    writeJson(join(userData, 'gog_store', 'config.json'), {
      credentials: { access_token: 'x' },
      isLoggedIn: true
    })
    writeJson(join(userData, 'gog_store', 'installed.json'), {
      installed: [{ appName: 'gog1' }, { appName: 'gog2' }]
    })

    // Sideload library
    mkdirSync(join(userData, 'sideload_apps'), { recursive: true })
    writeJson(join(userData, 'sideload_apps', 'library.json'), {
      games: [{ app_name: 'side1' }]
    })

    // Library caches
    mkdirSync(join(userData, 'store_cache'), { recursive: true })
    writeJson(join(userData, 'store_cache', 'legendary_library.json'), {
      library: [{ app_name: 'game1', title: 'Game 1' }]
    })
    writeJson(join(userData, 'store_cache', 'gog_library.json'), {
      games: [{ app_name: 'gog1', title: 'GOG 1' }]
    })

    // Wine downloader store
    mkdirSync(join(userData, 'store'), { recursive: true })
    writeJson(join(userData, 'store', 'wine-downloader-info.json'), {
      'wine-releases': [
        { version: 'Wine-GE-1', isInstalled: true },
        { version: 'Wine-GE-2', isInstalled: false }
      ]
    })
  })

  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('writes a zip with verbatim file copies and a manifest', async () => {
    const outputPath = join(tmpRoot, 'backup.zip')
    const result = await exportHeroicBackup({
      outputPath,
      stages: [
        'globalSettings',
        'perGameSettings',
        'credentials',
        'libraryCache',
        'sideloadLibrary',
        'wineMetadata'
      ]
    })

    expect(result.success).toBe(true)
    expect(result.path).toBe(outputPath)

    const zip = new AdmZip(outputPath)

    // Global config verbatim
    const onDiskConfig = readFileSync(join(appFolder, 'config.json'))
    const inZipConfig = zip.getEntry(BACKUP_PATHS.globalSettings.config)
    expect(inZipConfig).toBeTruthy()
    expect(inZipConfig!.getData().equals(onDiskConfig)).toBe(true)

    // Per-game verbatim (not mapped through Object.entries)
    const onDiskGame1 = readFileSync(
      join(appFolder, 'GamesConfig', 'game1.json')
    )
    const inZipGame1 = zip.getEntry(
      `${BACKUP_PATHS.perGameSettings.dir}game1.json`
    )
    expect(inZipGame1).toBeTruthy()
    expect(inZipGame1!.getData().equals(onDiskGame1)).toBe(true)

    // Credentials
    expect(zip.getEntry(BACKUP_PATHS.credentials.legendaryUser)).toBeTruthy()
    expect(zip.getEntry(BACKUP_PATHS.credentials.nileUser)).toBeTruthy()
    expect(zip.getEntry(BACKUP_PATHS.credentials.gogConfig)).toBeTruthy()

    // Library cache
    expect(
      zip.getEntry(BACKUP_PATHS.libraryCache.legendaryLibrary)
    ).toBeTruthy()
    expect(
      zip.getEntry(BACKUP_PATHS.libraryCache.legendaryInstalled)
    ).toBeTruthy()
    expect(zip.getEntry(BACKUP_PATHS.libraryCache.gogInstalled)).toBeTruthy()

    // Sideload
    expect(zip.getEntry(BACKUP_PATHS.sideloadLibrary.library)).toBeTruthy()

    // Wine
    expect(zip.getEntry(BACKUP_PATHS.wineMetadata.store)).toBeTruthy()

    // Manifest
    const manifestEntry = zip.getEntry(BACKUP_PATHS.manifest)
    expect(manifestEntry).toBeTruthy()
    const manifest = JSON.parse(manifestEntry!.getData().toString('utf-8')) as {
      formatVersion: number
      heroicVersion: string
      counts: {
        perGameSettings: number
        installedGames: Record<string, number>
        credentials: Record<string, boolean>
        fixesIncluded: boolean
        wineVersions: number
        sideloadGames: number
      }
    }
    expect(manifest.formatVersion).toBe(1)
    expect(manifest.heroicVersion).toBe('9.9.9-test')
    expect(manifest.counts.perGameSettings).toBe(2)
    expect(manifest.counts.installedGames.legendary).toBe(1)
    expect(manifest.counts.installedGames.gog).toBe(2)
    expect(manifest.counts.installedGames.nile).toBe(1)
    expect(manifest.counts.sideloadGames).toBe(1)
    expect(manifest.counts.credentials).toEqual({
      legendary: true,
      nile: true,
      gog: true,
      zoom: false
    })
    expect(manifest.counts.fixesIncluded).toBe(true)
    expect(manifest.counts.wineVersions).toBe(1)
  })

  it('skips stages that are not selected', async () => {
    const outputPath = join(tmpRoot, 'partial.zip')
    const result = await exportHeroicBackup({
      outputPath,
      stages: ['globalSettings']
    })

    expect(result.success).toBe(true)
    const zip = new AdmZip(outputPath)
    expect(zip.getEntry(BACKUP_PATHS.globalSettings.config)).toBeTruthy()
    expect(zip.getEntry(BACKUP_PATHS.credentials.legendaryUser)).toBeFalsy()
    expect(zip.getEntry(BACKUP_PATHS.libraryCache.legendaryLibrary)).toBeFalsy()
  })
})
