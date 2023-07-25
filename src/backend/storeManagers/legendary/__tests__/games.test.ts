import * as library from '../library'
import * as launcher from '../../../launcher'
import graceful_fs from 'graceful-fs'
import { launch, syncSaves } from '../games'
import { GameConfig } from '../../../game_config'
import { WineInstallation } from 'common/types'

// Mock functions that the actual implementation depends on
jest.mock('../../../logger/logger')
jest.mock('../../../logger/logfile')
jest.mock('../../../game_config')
jest.mock('../../../config')

describe('syncSaves', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  test("returns 'No path provided.' if path parameter is falsy", async () => {
    const appName = 'test'
    const arg = ''
    const path = ''

    const result = await syncSaves(appName, arg, path)

    expect(result).toBe('No path provided.')
  })

  test('Save-sync uses correct path', async () => {
    const appName = 'SomeAppName'

    const spy = jest
      .spyOn(library, 'runRunnerCommand')
      .mockImplementation(async () => {
        return { stderr: '', stdout: '' }
      })

    const paths = ['C:\\my\\path', '/home/someone/saves/path']
    for (const path of paths) {
      await syncSaves(appName, '', path)
      expect(spy.mock.lastCall?.[0]).toEqual([
        'sync-saves',
        '',
        '--save-path',
        path,
        'SomeAppName',
        '-y'
      ])
    }
  })

  test('Save-sync fails with empty path', async () => {
    jest.spyOn(library, 'runRunnerCommand')
    expect(await syncSaves('SomeAppName', '', '')).toBe('No path provided.')
  })
})

describe('launch', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  test('check that empty wrapper args are ignored', async () => {
    jest.spyOn(graceful_fs, 'appendFileSync').mockReturnValue()
    jest.spyOn(launcher, 'prepareLaunch').mockResolvedValue({
      success: true,
      failureReason: '',
      rpcClient: undefined,
      mangoHudCommand: undefined,
      gameModeBin: undefined,
      steamRuntime: undefined,
      offlineMode: undefined
    })
    jest.spyOn(launcher, 'prepareWineLaunch').mockResolvedValue({
      success: true
    })

    GameConfig['set']({
      wineVersion: {
        bin: '',
        name: '',
        type: 'wine'
      } as WineInstallation
    })
    const command = jest.spyOn(library, 'runRunnerCommand')

    await expect(launch('test')).resolves.toBeTruthy()
    expect(command).toBeCalledWith(
      ['launch', 'test', '--wine', '', ''],
      new AbortController(),
      expect.objectContaining({
        wrappers: []
      })
    )
  })
})
