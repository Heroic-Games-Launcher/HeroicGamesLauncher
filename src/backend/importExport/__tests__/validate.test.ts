import AdmZip from 'adm-zip'
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const tmpRoot = mkdtempSync(join(tmpdir(), 'heroic-validate-test-'))

jest.mock('electron-store')
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn(),
  LogPrefix: { ImportExport: 'ImportExport' }
}))
const mockWineStore = {
  get: jest.fn()
}
jest.mock('backend/wine/manager/utils', () => ({
  wineDownloaderInfoStore: mockWineStore
}))

import { validateHeroicBackup } from '../validate'
import { BACKUP_FORMAT_VERSION, BACKUP_PATHS } from '../constants'

const addJson = (zip: AdmZip, path: string, data: unknown) => {
  zip.addFile(path, Buffer.from(JSON.stringify(data, null, 2), 'utf-8'))
}

const writeBackupZip = (outputPath: string, overrides?: Partial<Record<string, unknown>>) => {
  const zip = new AdmZip()
  addJson(zip, BACKUP_PATHS.manifest, {
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: '2026-04-24T10:00:00.000Z',
    heroicVersion: '9.9.9',
    platform: process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux',
    stages: ['globalSettings', 'perGameSettings', 'credentials', 'libraryCache', 'wineMetadata'],
    counts: {
      perGameSettings: 1,
      installedGames: { legendary: 1 },
      credentials: { legendary: true, gog: false, nile: false, zoom: false },
      fixesIncluded: false,
      themesIncluded: false,
      wineVersions: 2,
      sideloadGames: 0
    },
    ...overrides
  })

  addJson(zip, BACKUP_PATHS.globalSettings.config, {
    version: 'v0',
    defaultSettings: { winePrefix: '/does/not/exist' }
  })

  addJson(zip, `${BACKUP_PATHS.perGameSettings.dir}game1.json`, {
    game1: { winePrefix: '/does/not/exist/prefix' },
    version: 'v0.1',
    explicit: ['winePrefix']
  })

  addJson(zip, BACKUP_PATHS.libraryCache.legendaryLibrary, {
    library: [{ app_name: 'game1', title: 'Game One' }]
  })

  addJson(zip, BACKUP_PATHS.libraryCache.legendaryInstalled, {
    game1: { app_name: 'game1', install_path: '/does/not/exist/game1' }
  })

  addJson(zip, BACKUP_PATHS.credentials.legendaryUser, {
    account_id: 'abc',
    displayName: 'Test User'
  })

  addJson(zip, BACKUP_PATHS.wineMetadata.store, {
    'wine-releases': [
      { version: 'Wine-GE-1', isInstalled: true },
      { version: 'Wine-GE-2', isInstalled: true }
    ]
  })

  zip.writeZip(outputPath)
}

describe('validateHeroicBackup', () => {
  beforeAll(() => {
    mkdirSync(tmpRoot, { recursive: true })
  })
  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  beforeEach(() => {
    mockWineStore.get.mockReturnValue([
      { version: 'Wine-GE-1', isInstalled: false },
      { version: 'Wine-GE-3', isInstalled: true }
    ])
  })

  it('surfaces broken install/prefix paths, credential details and wine version issues', () => {
    const path = join(tmpRoot, 'valid.zip')
    writeBackupZip(path)
    expect(existsSync(path)).toBe(true)

    const report = validateHeroicBackup(path)

    expect(report.ok).toBe(true)
    expect(report.formatSupported).toBe(true)
    expect(report.manifest.heroicVersion).toBe('9.9.9')
    expect(report.perGameAppNames).toContain('game1')
    expect(report.gameTitles['game1'].title).toBe('Game One')
    expect(report.gameTitles['game1'].runner).toBe('legendary')

    const game1 = report.pathIssues.find((i) => i.appName === 'game1')
    expect(game1).toBeDefined()
    expect(game1!.installPathIssue).toBe('broken')
    expect(game1!.prefixPathIssue).toBe('broken')

    const legendaryCred = report.credentials.find(
      (c) => c.runner === 'legendary'
    )
    expect(legendaryCred?.present).toBe(true)
    expect(legendaryCred?.displayName).toBe('Test User')

    // Wine-GE-1 missing locally but downloadable (available in local info store, not installed)
    const wineIssue = report.missingWineVersions.find(
      (v) => v.version === 'Wine-GE-1'
    )
    expect(wineIssue?.downloadable).toBe(true)
    // Wine-GE-2 missing entirely locally → not downloadable
    const wine2 = report.missingWineVersions.find(
      (v) => v.version === 'Wine-GE-2'
    )
    expect(wine2?.downloadable).toBe(false)
  })

  it('fails when the manifest is missing', () => {
    const path = join(tmpRoot, 'bad.zip')
    const zip = new AdmZip()
    zip.addFile('nothing.json', Buffer.from('{}', 'utf-8'))
    zip.writeZip(path)

    const report = validateHeroicBackup(path)
    expect(report.ok).toBe(false)
    expect(report.errors.length).toBeGreaterThan(0)
  })

  it('rejects a future format version', () => {
    const path = join(tmpRoot, 'future.zip')
    writeBackupZip(path, { formatVersion: BACKUP_FORMAT_VERSION + 99 })

    const report = validateHeroicBackup(path)
    expect(report.ok).toBe(false)
    expect(report.formatSupported).toBe(false)
  })

  it('lists games whose install paths exist on disk under installedOK', () => {
    const path = join(tmpRoot, 'mixed.zip')
    const existingDir = mkdtempSync(join(tmpRoot, 'games-'))

    const zip = new AdmZip()
    const addJson = (p: string, data: unknown) =>
      zip.addFile(p, Buffer.from(JSON.stringify(data, null, 2), 'utf-8'))

    addJson(BACKUP_PATHS.manifest, {
      formatVersion: BACKUP_FORMAT_VERSION,
      createdAt: '2026-04-24T10:00:00.000Z',
      heroicVersion: '9.9.9',
      platform:
        process.platform === 'win32'
          ? 'win32'
          : process.platform === 'darwin'
            ? 'darwin'
            : 'linux',
      stages: ['libraryCache'],
      counts: {
        perGameSettings: 0,
        installedGames: { legendary: 2 },
        credentials: { legendary: false, gog: false, nile: false, zoom: false },
        fixesIncluded: false,
        themesIncluded: false,
        wineVersions: 0,
        sideloadGames: 0
      }
    })
    addJson(BACKUP_PATHS.libraryCache.legendaryLibrary, {
      library: [
        { app_name: 'alive', title: 'Alive Game' },
        { app_name: 'dead', title: 'Dead Game' }
      ]
    })
    addJson(BACKUP_PATHS.libraryCache.legendaryInstalled, {
      alive: { app_name: 'alive', install_path: existingDir },
      dead: { app_name: 'dead', install_path: '/does/not/exist/gone' }
    })
    zip.writeZip(path)

    const report = validateHeroicBackup(path)
    expect(report.installedOK.map((g) => g.appName)).toEqual(['alive'])
    expect(report.pathIssues.map((i) => i.appName)).toEqual(['dead'])
  })
})
