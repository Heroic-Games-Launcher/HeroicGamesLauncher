import SteamLibraryManager from '../library'
import { runAurelia } from '../aurelia'
import type { GameInfo } from 'common/types'

const mockGetLaunchPlatform = jest.fn()
const mockLibraryGames = jest.fn()

jest.mock('../aurelia', () => ({
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
  libraryStore: { get: () => mockLibraryGames(), set: jest.fn() },
  installedGamesStore: { get: () => [], set: jest.fn() },
  installInfoStore: { get: jest.fn(), set: jest.fn() }
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
  getRunnerLogWriter: jest.fn(),
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarning: jest.fn(),
  LogPrefix: { Steam: 'Steam' }
}))
jest.mock('backend/utils', () => ({ getFileSize: jest.fn() }))
jest.mock('backend/ipc', () => ({ sendFrontendMessage: jest.fn() }))

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
