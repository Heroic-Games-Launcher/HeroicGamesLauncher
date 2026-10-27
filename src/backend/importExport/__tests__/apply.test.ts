import AdmZip from 'adm-zip'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const tmpRoot = mkdtempSync(join(tmpdir(), 'heroic-apply-test-'))
const appFolder = join(tmpRoot, 'heroic')
const userData = join(tmpRoot, 'userData')

jest.mock('electron-store')
jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn(),
  LogPrefix: { ImportExport: 'ImportExport' }
}))
jest.mock('backend/ipc', () => ({
  addHandler: jest.fn(),
  sendFrontendMessage: jest.fn()
}))
jest.mock('backend/constants/paths', () => ({
  appFolder,
  userDataPath: userData,
  configPath: join(appFolder, 'config.json'),
  gamesConfigPath: join(appFolder, 'GamesConfig'),
  fixesPath: join(appFolder, 'fixes'),
  toolsPath: join(appFolder, 'tools')
}))
jest.mock('backend/constants/environment', () => ({ isSnap: false }))
jest.mock('electron', () => ({
  app: {
    getPath: () => userData,
    getVersion: () => '9.9.9-test',
    relaunch: jest.fn(),
    exit: jest.fn()
  }
}))
jest.mock('backend/config', () => ({
  GlobalConfig: {
    get: () => ({ getSettings: () => ({ customThemesPath: '' }) })
  }
}))
jest.mock('backend/storeManagers/legendary/user', () => ({
  LegendaryUser: { getUserInfo: jest.fn() }
}))
jest.mock('backend/storeManagers/nile/user', () => ({
  NileUser: { getUserData: jest.fn().mockResolvedValue(undefined) }
}))

const mockWineStore = {
  get: jest.fn().mockReturnValue([]),
  set: jest.fn(),
  delete: jest.fn(),
  get_nodefault: jest.fn()
}
jest.mock('backend/wine/manager/utils', () => ({
  wineDownloaderInfoStore: mockWineStore,
  updateWineVersionInfos: jest.fn().mockResolvedValue([]),
  installWineVersion: jest.fn().mockResolvedValue('success'),
  removeWineVersion: jest.fn().mockResolvedValue(true)
}))

const backupFile = (source: string, destInZip: string) => ({
  source: () => source,
  destInZip
})
const emptyBackupPaths = { credentials: [], libraryCache: [] }
const mockLegendaryLibrary = {
  getGameInfo: jest.fn(),
  refresh: jest.fn(),
  getBackupPaths: () => ({
    credentials: [
      backupFile(
        join(appFolder, 'legendaryConfig', 'legendary', 'user.json'),
        'credentials/legendary/user.json'
      )
    ],
    libraryCache: [],
    installedGames: {
      ...backupFile(
        join(appFolder, 'legendaryConfig', 'legendary', 'installed.json'),
        'libraryCache/legendary/installed.json'
      ),
      countGames: () => 0
    }
  })
}
jest.mock('backend/storeManagers', () => ({
  libraryManagerMap: {
    legendary: mockLegendaryLibrary,
    gog: { getBackupPaths: () => emptyBackupPaths },
    nile: { getBackupPaths: () => emptyBackupPaths },
    zoom: { getBackupPaths: () => emptyBackupPaths },
    sideload: { getBackupPaths: () => emptyBackupPaths }
  }
}))
const mockAddToQueue = jest.fn<Promise<void>, [DMQueueElement]>()
jest.mock('backend/downloadmanager/downloadqueue', () => ({
  addToQueue: mockAddToQueue
}))

const mockRollbackStore = {
  get_nodefault: jest.fn(),
  set: jest.fn(),
  delete: jest.fn()
}
const mockConfigStore = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn()
}
const mockTsStore = {
  raw_store: {} as Record<string, unknown>,
  replace(data: Record<string, unknown>) {
    mockTsStore.raw_store = data
  }
}
jest.mock('backend/constants/key_value_stores', () => ({
  importExportRollbackStore: mockRollbackStore,
  configStore: mockConfigStore,
  tsStore: mockTsStore
}))

import type { DMQueueElement } from 'common/types'

import { applyHeroicBackup, rollbackLastImport } from '../apply'
import { BACKUP_FORMAT_VERSION, BACKUP_PATHS } from '../constants'

const addJson = (zip: AdmZip, path: string, data: unknown) => {
  zip.addFile(path, Buffer.from(JSON.stringify(data, null, 2), 'utf-8'))
}

const manifest = {
  formatVersion: BACKUP_FORMAT_VERSION,
  createdAt: '2026-04-24T10:00:00.000Z',
  heroicVersion: '9.9.9',
  platform: 'linux' as const,
  stages: ['perGameSettings', 'libraryCache'] as const,
  counts: {
    perGameSettings: 1,
    installedGames: { legendary: 1 },
    credentials: { legendary: false, gog: false, nile: false, zoom: false },
    fixesIncluded: false,
    themesIncluded: false,
    wineVersions: 0,
    sideloadGames: 0
  }
}

describe('applyHeroicBackup patch semantics', () => {
  beforeAll(() => {
    mkdirSync(appFolder, { recursive: true })
    mkdirSync(userData, { recursive: true })
  })
  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  it('preserves non-appName keys in per-game settings (never Object.entries().map())', async () => {
    const src = join(tmpRoot, 'pergame.zip')
    const zip = new AdmZip()
    addJson(zip, BACKUP_PATHS.manifest, manifest)

    // Per-game file structured as { [appName]: settings, version, explicit }
    addJson(zip, `${BACKUP_PATHS.perGameSettings.dir}game1.json`, {
      game1: { winePrefix: '/original/prefix', autoInstallDxvk: true },
      version: 'v0.1',
      explicit: ['winePrefix']
    })
    zip.writeZip(src)

    const result = await applyHeroicBackup({
      sourcePath: src,
      stages: ['perGameSettings'],
      overwriteGlobalSettings: false,
      includedAppNames: ['game1'],
      includedCredentials: {},
      perGameOverrides: [{ appName: 'game1', prefixPath: '/new/prefix' }],
      includedWineVersions: []
    })

    expect(result.ok).toBe(true)

    const written = JSON.parse(
      readFileSync(join(appFolder, 'GamesConfig', 'game1.json'), 'utf-8')
    ) as Record<string, unknown>

    // version + explicit must remain intact (not turned into indexed objects)
    expect(written.version).toBe('v0.1')
    expect(written.explicit).toEqual(['winePrefix'])

    // winePrefix was patched; autoInstallDxvk was preserved
    const game1 = written.game1 as Record<string, unknown>
    expect(game1.winePrefix).toBe('/new/prefix')
    expect(game1.autoInstallDxvk).toBe(true)
  })

  it('useDefaultPrefix deletes winePrefix but keeps everything else', async () => {
    const src = join(tmpRoot, 'default-prefix.zip')
    const zip = new AdmZip()
    addJson(zip, BACKUP_PATHS.manifest, manifest)
    addJson(zip, `${BACKUP_PATHS.perGameSettings.dir}game2.json`, {
      game2: { winePrefix: '/custom', otherSetting: 42 },
      version: 'v0.1'
    })
    zip.writeZip(src)

    const result = await applyHeroicBackup({
      sourcePath: src,
      stages: ['perGameSettings'],
      overwriteGlobalSettings: false,
      includedAppNames: ['game2'],
      includedCredentials: {},
      perGameOverrides: [{ appName: 'game2', useDefaultPrefix: true }],
      includedWineVersions: []
    })

    expect(result.ok).toBe(true)
    const written = JSON.parse(
      readFileSync(join(appFolder, 'GamesConfig', 'game2.json'), 'utf-8')
    ) as Record<string, Record<string, unknown>>
    expect(written.game2.winePrefix).toBeUndefined()
    expect(written.game2.otherSetting).toBe(42)
    expect(written.version).toBe('v0.1')
  })

  it('legendary installed: skipInstallPath removes the game; installAfterImport queues it', async () => {
    const src = join(tmpRoot, 'installed.zip')
    const zip = new AdmZip()
    addJson(zip, BACKUP_PATHS.manifest, manifest)
    addJson(zip, BACKUP_PATHS.libraryCache.legendaryInstalled, {
      keepMe: { app_name: 'keepMe', install_path: '/games/keep' },
      skipMe: { app_name: 'skipMe', install_path: '/games/skip' },
      queueMe: { app_name: 'queueMe', install_path: '/games/queue' },
      patchMe: { app_name: 'patchMe', install_path: '/games/old' }
    })
    zip.writeZip(src)

    const result = await applyHeroicBackup({
      sourcePath: src,
      stages: ['libraryCache'],
      overwriteGlobalSettings: false,
      includedAppNames: [],
      includedCredentials: {},
      perGameOverrides: [
        { appName: 'skipMe', skipInstallPath: true },
        { appName: 'queueMe', installAfterImport: true },
        { appName: 'patchMe', installPath: '/games/new' }
      ],
      includedWineVersions: []
    })

    expect(result.ok).toBe(true)
    expect(result.gamesQueuedForDownload).toContain('queueMe')
    const installedJsonPath = join(
      appFolder,
      'legendaryConfig',
      'legendary',
      'installed.json'
    )
    const written = JSON.parse(
      readFileSync(installedJsonPath, 'utf-8')
    ) as Record<string, { install_path?: string }>
    expect(written.keepMe?.install_path).toBe('/games/keep')
    expect(written.skipMe).toBeUndefined()
    expect(written.queueMe).toBeUndefined()
    expect(written.patchMe?.install_path).toBe('/games/new')
  })

  it('records a rollback snapshot on successful apply', async () => {
    const src = join(tmpRoot, 'snapshot.zip')
    const zip = new AdmZip()
    addJson(zip, BACKUP_PATHS.manifest, manifest)
    addJson(zip, `${BACKUP_PATHS.perGameSettings.dir}game3.json`, {
      game3: {},
      version: 'v0.1'
    })
    zip.writeZip(src)

    mockRollbackStore.set.mockClear()
    // Pre-create the gamesConfig file so the export snapshot has something to
    // pick up (the snapshot uses exportHeroicBackup under the hood).
    mkdirSync(join(appFolder, 'GamesConfig'), { recursive: true })
    writeFileSync(
      join(appFolder, 'GamesConfig', 'game3.json'),
      JSON.stringify({ game3: {}, version: 'v0.1' }),
      'utf-8'
    )

    const result = await applyHeroicBackup({
      sourcePath: src,
      stages: ['perGameSettings'],
      overwriteGlobalSettings: false,
      includedAppNames: ['game3'],
      includedCredentials: {},
      perGameOverrides: [],
      includedWineVersions: []
    })

    expect(result.ok).toBe(true)
    expect(mockRollbackStore.set).toHaveBeenCalled()
    const [key, value] = mockRollbackStore.set.mock.calls[0] as [
      string,
      { archivePath: string }
    ]
    expect(key).toBe('lastSnapshot')
    expect(typeof value.archivePath).toBe('string')
  })

  it('adds games marked installAfterImport to the download manager queue', async () => {
    const src = join(tmpRoot, 'queue.zip')
    const zip = new AdmZip()
    addJson(zip, BACKUP_PATHS.manifest, manifest)
    addJson(zip, BACKUP_PATHS.libraryCache.legendaryInstalled, {
      queueMe: {
        app_name: 'queueMe',
        install_path: '/games/queue',
        platform: 'Windows'
      }
    })
    zip.writeZip(src)

    const gameInfo = { app_name: 'queueMe', title: 'Queue Me' }
    mockLegendaryLibrary.getGameInfo.mockReturnValue(gameInfo)

    const result = await applyHeroicBackup({
      sourcePath: src,
      stages: ['libraryCache'],
      overwriteGlobalSettings: false,
      includedAppNames: [],
      includedCredentials: {},
      perGameOverrides: [{ appName: 'queueMe', installAfterImport: true }],
      includedWineVersions: []
    })

    expect(result.ok).toBe(true)
    expect(result.gamesQueuedForDownload).toEqual(['queueMe'])
    expect(mockAddToQueue).toHaveBeenCalledTimes(1)
    const element = mockAddToQueue.mock.calls[0][0]
    expect(element.type).toBe('install')
    expect(element.params.appName).toBe('queueMe')
    expect(element.params.runner).toBe('legendary')
    expect(element.params.platformToInstall).toBe('Windows')
    expect(element.params.gameInfo).toBe(gameInfo)
  })

  it('applies custom categories, dropping malformed entries', async () => {
    const src = join(tmpRoot, 'categories.zip')
    const zip = new AdmZip()
    addJson(zip, BACKUP_PATHS.manifest, { ...manifest, stages: ['categories'] })
    addJson(zip, BACKUP_PATHS.categories.file, {
      Favorites: ['game1', 42, 'game2'],
      Broken: 'not-an-array'
    })
    zip.writeZip(src)

    mockConfigStore.get.mockReturnValue({})
    const result = await applyHeroicBackup({
      sourcePath: src,
      stages: ['categories'],
      overwriteGlobalSettings: false,
      includedAppNames: [],
      includedCredentials: {},
      perGameOverrides: [],
      includedWineVersions: []
    })

    expect(result.ok).toBe(true)
    expect(mockConfigStore.set).toHaveBeenCalledWith('games.customCategories', {
      Favorites: ['game1', 'game2']
    })
  })

  it('imports play history, preserves other games, and rolls back exactly', async () => {
    const src = join(tmpRoot, 'playtime.zip')
    const zip = new AdmZip()
    addJson(zip, BACKUP_PATHS.manifest, { ...manifest, stages: ['playtime'] })
    const imported = {
      game1: {
        firstPlayed: '2020-01-01',
        lastPlayed: '2021-01-01',
        totalPlayed: 120
      },
      game2: { totalPlayed: 45 },
      namespace: { imported: { totalPlayed: 20 } }
    }
    addJson(zip, BACKUP_PATHS.playtime.file, imported)
    zip.writeZip(src)

    const previous = {
      game1: { firstPlayed: '2022-01-01', totalPlayed: 10 },
      localOnly: { lastPlayed: '2023-01-01', totalPlayed: 15 },
      namespace: { existing: { totalPlayed: 30 } }
    }
    mockTsStore.raw_store = previous
    mockRollbackStore.set.mockClear()

    const result = await applyHeroicBackup({
      sourcePath: src,
      stages: ['playtime'],
      overwriteGlobalSettings: false,
      includedAppNames: [],
      includedCredentials: {},
      perGameOverrides: [],
      includedWineVersions: []
    })
    expect(result.ok).toBe(true)
    expect(mockTsStore.raw_store).toEqual({
      ...previous,
      ...imported,
      namespace: { ...previous.namespace, ...imported.namespace }
    })

    const snapshot = mockRollbackStore.set.mock.calls[0][1]
    mockRollbackStore.get_nodefault.mockReturnValue(snapshot)
    expect((await rollbackLastImport()).ok).toBe(true)
    expect(mockTsStore.raw_store).toEqual(previous)
  })

  it('leaves playtime untouched when the entry is missing or invalid', async () => {
    const previous = { local: { totalPlayed: 10 } }
    const options = {
      stages: ['playtime'] as const,
      overwriteGlobalSettings: false,
      includedAppNames: [],
      includedCredentials: {},
      perGameOverrides: [],
      includedWineVersions: []
    }
    for (const [name, data] of [
      ['missing', undefined],
      ['invalid', { game: { totalPlayed: 'not a number' } }]
    ] as const) {
      const src = join(tmpRoot, `${name}-playtime.zip`)
      const zip = new AdmZip()
      addJson(zip, BACKUP_PATHS.manifest, { ...manifest, stages: ['playtime'] })
      if (data) addJson(zip, BACKUP_PATHS.playtime.file, data)
      zip.writeZip(src)
      mockTsStore.raw_store = previous
      const result = await applyHeroicBackup({
        ...options,
        stages: [...options.stages],
        sourcePath: src
      })
      expect(result.ok).toBe(name === 'missing')
      expect(mockTsStore.raw_store).toEqual(previous)
    }
  })

  it('rolls back an import when the original playtime store was empty', async () => {
    const src = join(tmpRoot, 'playtime-empty-snapshot.zip')
    const zip = new AdmZip()
    addJson(zip, BACKUP_PATHS.manifest, { ...manifest, stages: ['playtime'] })
    addJson(zip, BACKUP_PATHS.playtime.file, { game: { totalPlayed: 50 } })
    zip.writeZip(src)
    mockTsStore.raw_store = {}
    mockRollbackStore.set.mockClear()

    const result = await applyHeroicBackup({
      sourcePath: src,
      stages: ['playtime'],
      overwriteGlobalSettings: false,
      includedAppNames: [],
      includedCredentials: {},
      perGameOverrides: [],
      includedWineVersions: []
    })
    expect(result.ok).toBe(true)
    expect(mockTsStore.raw_store).toEqual({ game: { totalPlayed: 50 } })
    mockRollbackStore.get_nodefault.mockReturnValue(
      mockRollbackStore.set.mock.calls[0][1]
    )
    expect((await rollbackLastImport()).ok).toBe(true)
    expect(mockTsStore.raw_store).toEqual({})
  })

  it('rejects zip entries that traverse outside the destination (zip-slip)', async () => {
    const src = join(tmpRoot, 'zipslip.zip')
    const zip = new AdmZip()
    addJson(zip, BACKUP_PATHS.manifest, {
      ...manifest,
      stages: ['globalSettings', 'perGameSettings']
    })
    const evil = Buffer.from('{"owned": true}', 'utf-8')
    zip.addFile(
      `${BACKUP_PATHS.globalSettings.fixesDir}../../evil-fix.json`,
      evil
    )
    zip.addFile(`${BACKUP_PATHS.perGameSettings.dir}../evil-game.json`, evil)
    zip.writeZip(src)

    const result = await applyHeroicBackup({
      sourcePath: src,
      stages: ['globalSettings', 'perGameSettings'],
      overwriteGlobalSettings: true,
      includedAppNames: [],
      includedCredentials: {},
      perGameOverrides: [],
      includedWineVersions: []
    })

    expect(result.ok).toBe(true)
    expect(existsSync(join(appFolder, 'evil-fix.json'))).toBe(false)
    expect(existsSync(join(tmpRoot, 'evil-fix.json'))).toBe(false)
    expect(existsSync(join(appFolder, 'evil-game.json'))).toBe(false)
    expect(
      existsSync(join(appFolder, 'GamesConfig', '..', 'evil-game.json'))
    ).toBe(false)
  })
})
