import SteamLibraryManager from '../library'
import { runAurelia } from '../aurelia'
import { platformArgs } from '../utils'
import type { GameInfo } from 'common/types'

const mockGetLaunchPlatform = jest.fn()
const mockLibraryGames = jest.fn<GameInfo[], []>()
const mockLoggedIn = jest.fn<boolean, []>()
const mockOnline = jest.fn<boolean, []>()
const mockLibrarySet = jest.fn<void, unknown[]>()
const mockTagRecent = jest.fn<Promise<void>, [string, Set<string>]>()
const mockNotifyRecent = jest.fn<Promise<void>, []>()
const mockInstallInfoDelete = jest.fn<void, [string]>()
const mockInstallInfoGet = jest.fn<unknown, [string]>()
const mockInstallInfoSet = jest.fn<void, [string, unknown]>()

jest.mock('../aurelia', () => ({
  aureliaBinaryStamp: () => 'aurelia:2',
  runAurelia: jest.fn(),
  runAureliaCommand: jest.fn(),
  getSteamLibraryPath: jest.fn(),
  getSteamInstallLibraries: jest.fn()
}))
jest.mock('../games', () => ({
  __esModule: true,
  default: class {
    getLaunchPlatform = mockGetLaunchPlatform
  }
}))
jest.mock('../electronStores', () => ({
  configStore: { get: () => mockLoggedIn() },
  libraryStore: {
    get: () => mockLibraryGames(),
    set: (...args: unknown[]) => mockLibrarySet(...args)
  },
  installedGamesStore: { get: () => [], set: jest.fn() },
  installInfoStore: {
    get: (key: string) => mockInstallInfoGet(key),
    set: (key: string, value: unknown) => mockInstallInfoSet(key, value),
    delete: (key: string) => mockInstallInfoDelete(key)
  }
}))
jest.mock('../utils', () => ({
  aureliaPlatform: (platform: string) => platform,
  currentOsList: 'linux',
  describeError: String,
  installedPlatformFor: jest.fn(),
  isSteamSupported: () => true,
  platformArgs: jest.fn(),
  steamCall: <T>(task: () => Promise<T>) => task(),
  STEAM_UNSUPPORTED: 'disabled'
}))
jest.mock('backend/logger', () => ({
  getRunnerLogWriter: () => ({ logInfo: jest.fn() }),
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Steam: 'Steam' }
}))
jest.mock('backend/utils', () => ({
  getFileSize: (bytes: number) => `${bytes} B`
}))
jest.mock('backend/online_monitor', () => ({
  isOnline: () => mockOnline(),
  runOnceWhenOnline: jest.fn()
}))
jest.mock('backend/ipc', () => ({ sendFrontendMessage: jest.fn() }))
jest.mock('backend/recent_games/recent_games', () => ({
  tagRecentGames: (runner: string, ids: Set<string>) =>
    mockTagRecent(runner, ids),
  notifyRecentGamesChanged: () => mockNotifyRecent()
}))

// Trimmed from aurelia v0.1.41 for Chasm.
const chasmOptions = {
  app_id: 312200,
  launch_options: [
    {
      id: '0',
      description: 'Default (Vulkan)',
      executable: 'Chasm.exe',
      oslist: 'windows'
    },
    { id: '2', description: 'Launch', executable: 'Chasm', oslist: 'linux' },
    {
      id: '3',
      description: 'D3D11 (Use if problems with Vulkan)',
      executable: 'Chasm.exe',
      arguments: '/gldevice:D3D11',
      oslist: 'windows'
    }
  ]
}

function storeGame(is_installed: boolean) {
  mockLibraryGames.mockReturnValue([
    { app_name: '312200', is_installed, install: {} } as GameInfo
  ])
}

describe('SteamLibraryManager.getLaunchOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(runAurelia).mockResolvedValue(chasmOptions)
  })

  it('offers nothing before the game is installed', async () => {
    storeGame(false)
    const options = await new SteamLibraryManager().getLaunchOptions('312200')
    expect(options).toEqual([])
    expect(runAurelia).not.toHaveBeenCalled()
  })

  it('offers the Windows options of a Windows build', async () => {
    storeGame(true)
    mockGetLaunchPlatform.mockResolvedValue('windows')
    const options = await new SteamLibraryManager().getLaunchOptions('312200')
    expect(options).toEqual([
      {
        type: 'basic',
        name: 'Default (Vulkan)',
        parameters: '',
        steamLaunchId: '0'
      },
      {
        type: 'basic',
        name: 'D3D11 (Use if problems with Vulkan)',
        parameters: '/gldevice:D3D11',
        steamLaunchId: '3'
      }
    ])
  })

  it('offers the Linux option of a native build', async () => {
    storeGame(true)
    mockGetLaunchPlatform.mockResolvedValue('linux')
    const options = await new SteamLibraryManager().getLaunchOptions('312200')
    expect(options).toEqual([
      { type: 'basic', name: 'Launch', parameters: '', steamLaunchId: '2' }
    ])
  })
})

describe('SteamLibraryManager.refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(runAurelia).mockResolvedValue([])
    mockLibraryGames.mockReturnValue([])
  })

  it('lists nothing while logged out', async () => {
    mockLoggedIn.mockReturnValue(false)
    mockOnline.mockReturnValue(true)
    await new SteamLibraryManager().refresh()
    expect(runAurelia).not.toHaveBeenCalled()
    expect(mockLibrarySet).toHaveBeenCalledWith('games', [])
    expect(mockNotifyRecent).toHaveBeenCalled()
  })

  it('tags cached Steam recents before clearing', async () => {
    mockLoggedIn.mockReturnValue(false)
    mockOnline.mockReturnValue(true)
    mockLibraryGames.mockReturnValue([{ app_name: '312200' } as GameInfo])
    await new SteamLibraryManager().refresh()
    expect(mockTagRecent).toHaveBeenCalledWith('steam', new Set(['312200']))
  })

  it('keeps the cached list while offline', async () => {
    mockLoggedIn.mockReturnValue(true)
    mockOnline.mockReturnValue(false)
    await new SteamLibraryManager().refresh()
    expect(runAurelia).not.toHaveBeenCalled()
    expect(mockLibrarySet).not.toHaveBeenCalled()
  })

  it('lists games while logged in and online', async () => {
    mockLoggedIn.mockReturnValue(true)
    mockOnline.mockReturnValue(true)
    jest
      .mocked(runAurelia)
      .mockResolvedValue([
        { app_id: 312200, name: 'Chasm', platform: 'windows' }
      ])
    await new SteamLibraryManager().refresh()
    expect(runAurelia).toHaveBeenCalledWith(['list'])
    const [, games] = mockLibrarySet.mock.calls[0] as [string, GameInfo[]]
    expect(games.map((g) => [g.app_name, g.canRunOffline])).toEqual([
      ['312200', false]
    ])
    expect(mockTagRecent).toHaveBeenLastCalledWith('steam', new Set(['312200']))
    expect(mockNotifyRecent).toHaveBeenCalled()
  })

  it('shows the installed size Aurelia reports', async () => {
    mockLoggedIn.mockReturnValue(true)
    mockOnline.mockReturnValue(true)
    jest.mocked(runAurelia).mockResolvedValue([
      {
        app_id: 312200,
        name: 'Chasm',
        is_installed: true,
        install_path: '/lib/steamapps/common/Chasm',
        size_on_disk: 1024
      }
    ])
    await new SteamLibraryManager().refresh()
    const [, games] = mockLibrarySet.mock.calls[0] as [string, GameInfo[]]
    expect(games[0].install).toMatchObject({ install_size: '1024 B' })
  })
})

describe('SteamLibraryManager.getInstallInfo', () => {
  const dryRun = {
    app_id: 312200,
    download_size: 10,
    disk_size: 20,
    depot_count: 2,
    platform: 'windows'
  }

  function mockDryRun(extra: object) {
    jest
      .mocked(runAurelia)
      .mockImplementation((args: string[]) =>
        Promise.resolve(
          args[0] === 'install' ? { ...dryRun, ...extra } : chasmOptions
        )
      )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(platformArgs).mockReturnValue([])
    storeGame(false)
  })

  it('lists the languages Aurelia reports', async () => {
    mockDryRun({
      languages: ['german', 'english'],
      default_language: 'english',
      installed_language: null
    })
    const info = await new SteamLibraryManager().getInstallInfo(
      '312200',
      'windows'
    )
    expect(info?.manifest).toEqual({
      download_size: 10,
      disk_size: 20,
      languages: ['english', 'german'],
      default_language: 'english',
      installed_language: undefined,
      language_locales: { english: 'en', german: 'de' }
    })
  })

  it('has no languages from older Aurelia', async () => {
    mockDryRun({})
    const info = await new SteamLibraryManager().getInstallInfo(
      '312200',
      'windows'
    )
    expect(info?.manifest).toEqual({ download_size: 10, disk_size: 20 })
  })

  it('reuses info from the same Aurelia', async () => {
    const cached = { manifest: { download_size: 1 }, aurelia: 'aurelia:2' }
    mockInstallInfoGet.mockReturnValueOnce(cached)
    const info = await new SteamLibraryManager().getInstallInfo(
      '312200',
      'windows'
    )
    expect(info).toBe(cached)
    expect(runAurelia).not.toHaveBeenCalled()
  })

  it.each([undefined, 'aurelia:1'])(
    'refetches info from Aurelia %s',
    async (aurelia) => {
      mockDryRun({})
      mockInstallInfoGet.mockReturnValueOnce({
        manifest: { download_size: 1 },
        aurelia
      })
      const info = await new SteamLibraryManager().getInstallInfo(
        '312200',
        'windows'
      )
      expect(info?.manifest).toEqual({ download_size: 10, disk_size: 20 })
      expect(mockInstallInfoSet).toHaveBeenCalledWith(
        '312200_windows',
        expect.objectContaining({ aurelia: 'aurelia:2' })
      )
    }
  )
})

describe('SteamLibraryManager.forgetInstallInfo', () => {
  it('drops the dry-run of every platform', () => {
    new SteamLibraryManager().forgetInstallInfo('312200')
    expect(mockInstallInfoDelete.mock.calls.map(([key]) => key)).toEqual([
      '312200_windows',
      '312200_linux',
      '312200_mac',
      '312200_osx'
    ])
  })
})
