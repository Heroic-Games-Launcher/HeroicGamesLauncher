import LegendaryGame from '../games'
import { libraryManagerMap } from 'backend/storeManagers'
import { GlobalConfig } from 'backend/config'
import { createGameLogWriter, logError } from 'backend/logger'
import { sendGameStatusUpdate } from 'backend/utils'
import { getMemoryInfo } from 'backend/utils/systeminfo/memory'
import { LegendaryAppName } from '../commands/base'

jest.mock('electron')
jest.mock('backend/logger')
jest.mock('backend/dialog/dialog')
jest.mock('backend/config')
jest.mock('backend/utils/systeminfo/memory', () => ({
  getMemoryInfo: jest.fn()
}))
jest.mock('backend/utils', () => ({
  ...jest.requireActual('backend/utils'),
  sendGameStatusUpdate: jest.fn(),
  sendProgressUpdate: jest.fn()
}))
jest.mock('backend/shortcuts/shortcuts/shortcuts', () => ({
  addShortcuts: jest.fn(),
  removeShortcuts: jest.fn()
}))

const MiB = 1024 * 1024

describe('LegendaryGame shared memory retry', () => {
  const appName = '20f01ab5e0fa4e798c6d58eeb8d86989' as LegendaryAppName
  const runRunnerCommandMock = jest.fn()
  const getInstallInfoMock = jest.fn()
  const getGameInfoMock = jest.fn()
  const refreshInstalledMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    jest.spyOn(GlobalConfig, 'get').mockReturnValue({
      getSettings: () => ({
        maxWorkers: 0,
        downloadNoHttps: false
      })
    } as unknown as GlobalConfig)
    ;(createGameLogWriter as jest.Mock).mockResolvedValue({
      writeString: jest.fn(),
      logInfo: jest.fn(),
      logError: jest.fn()
    })
    ;(getMemoryInfo as jest.Mock).mockResolvedValue({
      total: 16384 * MiB,
      used: 8192 * MiB
    })

    getGameInfoMock.mockReturnValue({
      app_name: appName,
      runner: 'legendary',
      title: 'ARC Raiders',
      install: {
        platform: 'Windows'
      },
      is_installed: true
    })

    getInstallInfoMock.mockResolvedValue({
      manifest: {
        download_size: 100 * MiB
      }
    })

    libraryManagerMap['legendary'] = {
      ...libraryManagerMap['legendary'],
      getGameInfo: getGameInfoMock,
      getInstallInfo: getInstallInfoMock,
      runRunnerCommand: runRunnerCommandMock,
      refreshInstalled: refreshInstalledMock
    }
  })

  it('retries update with required --max-shared-memory when available RAM is sufficient', async () => {
    runRunnerCommandMock
      .mockResolvedValueOnce({
        stdout: '',
        stderr:
          'MemoryError: Current shared memory cache is smaller than required: 2048.0 MiB < 3821.0 MiB. Try running legendary with "--enable-reordering" to reduce memory usage, or use "--max-shared-memory 3853" to increase the limit.'
      })
      .mockResolvedValueOnce({
        stdout: 'Update complete',
        stderr: ''
      })

    const game = new LegendaryGame(appName)
    const result = await game.update()

    expect(result).toEqual({ status: 'done' })
    expect(runRunnerCommandMock).toHaveBeenCalledTimes(2)
    expect(runRunnerCommandMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        subcommand: 'update',
        appName,
        '--max-shared-memory': 3853
      }),
      expect.any(Object)
    )
    expect(sendGameStatusUpdate).toHaveBeenLastCalledWith({
      appName,
      runner: 'legendary',
      status: 'done'
    })
  })

  it('enables reordering and caps --max-shared-memory to available RAM when required memory exceeds available RAM', async () => {
    ;(getMemoryInfo as jest.Mock).mockResolvedValue({
      total: 8192 * MiB,
      used: 5120 * MiB // 3072 MiB available
    })

    runRunnerCommandMock
      .mockResolvedValueOnce({
        stdout: '',
        stderr:
          'MemoryError: Current shared memory cache is smaller than required: 2048.0 MiB < 5906.0 MiB. Try running legendary with "--enable-reordering" to reduce memory usage, or use "--max-shared-memory 5938" to increase the limit.'
      })
      .mockResolvedValueOnce({
        stdout: 'Update complete',
        stderr: ''
      })

    const game = new LegendaryGame(appName)
    const result = await game.update()

    expect(result).toEqual({ status: 'done' })
    expect(runRunnerCommandMock).toHaveBeenCalledTimes(2)
    expect(runRunnerCommandMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        subcommand: 'update',
        appName,
        '--enable-reordering': true,
        '--max-shared-memory': 3072
      }),
      expect.any(Object)
    )
  })

  it('enables reordering without raising --max-shared-memory when available RAM is <= 2048 MiB', async () => {
    ;(getMemoryInfo as jest.Mock).mockResolvedValue({
      total: 8192 * MiB,
      used: 6692 * MiB // 1500 MiB available
    })

    runRunnerCommandMock
      .mockResolvedValueOnce({
        stdout: '',
        stderr:
          'MemoryError: Current shared memory cache is smaller than required: 2048.0 MiB < 3821.0 MiB. Try running legendary with "--enable-reordering" to reduce memory usage, or use "--max-shared-memory 3853" to increase the limit.'
      })
      .mockResolvedValueOnce({
        stdout: 'Update complete',
        stderr: ''
      })

    const game = new LegendaryGame(appName)
    const result = await game.update()

    expect(result).toEqual({ status: 'done' })
    expect(runRunnerCommandMock).toHaveBeenCalledTimes(2)
    const secondCallCommand = runRunnerCommandMock.mock.calls[1][0]
    expect(secondCallCommand['--enable-reordering']).toBe(true)
    expect(secondCallCommand['--max-shared-memory']).toBeUndefined()
  })

  it('returns status error if MemoryError persists after retry during update', async () => {
    const memoryErrorStderr =
      'MemoryError: Current shared memory cache is smaller than required: 2048.0 MiB < 3821.0 MiB. Try running legendary with "--enable-reordering" to reduce memory usage, or use "--max-shared-memory 3853" to increase the limit.'

    runRunnerCommandMock.mockResolvedValue({
      stdout: '',
      stderr: memoryErrorStderr
    })

    const game = new LegendaryGame(appName)
    const result = await game.update()

    expect(result).toEqual({ status: 'error' })
    expect(runRunnerCommandMock).toHaveBeenCalledTimes(2)
    expect(logError).toHaveBeenCalled()
  })

  it('retries repair with --max-shared-memory when Legendary fails with MemoryError', async () => {
    runRunnerCommandMock
      .mockResolvedValueOnce({
        stdout: '',
        stderr:
          'MemoryError: Current shared memory cache is smaller than required: 2048.0 MiB < 3821.0 MiB. Try running legendary with "--enable-reordering" to reduce memory usage, or use "--max-shared-memory 3853" to increase the limit.'
      })
      .mockResolvedValueOnce({
        stdout: 'Repair complete',
        stderr: ''
      })

    const game = new LegendaryGame(appName)
    const result = await game.repair()

    expect(result.error).toBeUndefined()
    expect(runRunnerCommandMock).toHaveBeenCalledTimes(2)
    expect(runRunnerCommandMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        subcommand: 'repair',
        appName,
        '--max-shared-memory': 3853
      }),
      expect.any(Object)
    )
  })
})
