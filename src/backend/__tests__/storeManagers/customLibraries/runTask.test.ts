import { join } from 'path'
import { executeRunTask } from 'backend/storeManagers/customLibraries/tasks/runTask'
import { RunTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { spawn } from 'child_process'
import { EventEmitter } from 'events'
import { existsSync } from 'graceful-fs'
import { logInfo, LogPrefix } from 'backend/logger'
import {
  getSettings,
  isNative,
  getGameInfo
} from 'backend/storeManagers/customLibraries/games'
import { runWineCommand } from 'backend/launcher'

jest.mock('child_process')
jest.mock('util')
jest.mock('fs-extra')
jest.mock('graceful-fs')

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  LogPrefix: {
    CustomLibrary: 'CustomLibrary'
  }
}))

jest.mock('backend/constants/environment', () => ({
  isLinux: false,
  isMac: false,
  isWindows: false
}))

jest.mock('backend/storeManagers/customLibraries/games', () => ({
  getSettings: jest.fn(),
  isNative: jest.fn(),
  getGameInfo: jest.fn()
}))

jest.mock('backend/launcher', () => ({
  runWineCommand: jest.fn()
}))

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>
const mockSpawnFn = spawn as jest.MockedFunction<typeof spawn>
const mockLogInfo = logInfo as jest.MockedFunction<typeof logInfo>
const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>
const mockIsNative = isNative as jest.MockedFunction<typeof isNative>
const mockGetGameInfo = getGameInfo as jest.MockedFunction<typeof getGameInfo>
const mockRunWineCommand = runWineCommand as jest.MockedFunction<
  typeof runWineCommand
>

class MockChildProcess extends EventEmitter {
  on = jest.fn((event: string, listener: (...args: any[]) => void) => {
    super.on(event, listener)
    return this
  })
}

describe('RunTask - executeRunTask', () => {
  const appName = 'test-game'
  const gameFolder = '/path/to/game'
  let mockProcess: MockChildProcess

  beforeEach(() => {
    jest.clearAllMocks()
    mockProcess = new MockChildProcess()
    mockSpawnFn.mockReturnValue(mockProcess as any)

    // Default mocks
    mockGetGameInfo.mockReturnValue({
      install: { platform: 'linux' }
    } as any)
    mockIsNative.mockReturnValue(true)
  })

  test('runs native executable successfully', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'installer.exe',
      args: ['--silent', '--accept-license']
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(true)

    const executePromise = executeRunTask(appName, task, gameFolder)

    // Simulate successful execution
    setTimeout(() => {
      mockProcess.emit('close', 0)
    }, 0)

    await executePromise

    expect(mockSpawnFn).toHaveBeenCalledWith(
      join(gameFolder, 'installer.exe'),
      ['--silent', '--accept-license'],
      { cwd: gameFolder }
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'Running: installer.exe (Started)',
      LogPrefix.CustomLibrary
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'Running: installer.exe (Done)',
      LogPrefix.CustomLibrary
    )
  })

  test('runs executable with variable substitution', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'setup.exe',
      args: ['--install-dir', '{gameFolder}/output']
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(true)

    const executePromise = executeRunTask(appName, task, gameFolder)

    // Simulate successful execution
    setTimeout(() => {
      mockProcess.emit('close', 0)
    }, 0)

    await executePromise

    expect(mockSpawnFn).toHaveBeenCalledWith(
      join(gameFolder, 'setup.exe'),
      ['--install-dir', `${gameFolder}/output`],
      { cwd: gameFolder }
    )
  })

  test('runs executable without arguments', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'app.exe'
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(true)

    const executePromise = executeRunTask(appName, task, gameFolder)

    // Simulate successful execution
    setTimeout(() => {
      mockProcess.emit('close', 0)
    }, 0)

    await executePromise

    expect(mockSpawnFn).toHaveBeenCalledWith(join(gameFolder, 'app.exe'), [], {
      cwd: gameFolder
    })
  })

  test('runs Windows executable with Wine', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'installer.exe',
      args: ['--silent']
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(false)
    mockGetGameInfo.mockReturnValue({
      install: { platform: 'windows' }
    } as any)
    mockGetSettings.mockResolvedValue({
      winePrefix: '/wine/prefix',
      wineVersion: { type: 'wine' }
    } as any)
    mockRunWineCommand.mockResolvedValue({ code: 0, stderr: '' } as any)

    await executeRunTask(appName, task, gameFolder)

    expect(mockRunWineCommand).toHaveBeenCalledWith({
      gameSettings: expect.any(Object),
      commandParts: [join(gameFolder, 'installer.exe'), '--silent'],
      wait: true,
      gameInstallPath: gameFolder,
      startFolder: gameFolder
    })
    expect(mockLogInfo).toHaveBeenCalledWith(
      'Running in Wine: /path/to/game/installer.exe --silent',
      LogPrefix.CustomLibrary
    )
  })

  test('handles Wine execution failure', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'installer.exe'
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(false)
    mockGetGameInfo.mockReturnValue({
      install: { platform: 'windows' }
    } as any)
    mockGetSettings.mockResolvedValue({} as any)
    mockRunWineCommand.mockResolvedValue({
      code: 1,
      stderr: 'Wine error'
    } as any)

    await expect(executeRunTask(appName, task, gameFolder)).rejects.toThrow(
      'Wine execution failed with code 1: Wine error'
    )
  })

  test('throws error when executable not found', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'nonexistent.exe'
    }

    mockExistsSync.mockReturnValue(false)

    await expect(executeRunTask(appName, task, gameFolder)).rejects.toThrow(
      `Executable not found: ${join(gameFolder, 'nonexistent.exe')}`
    )

    expect(mockSpawnFn).not.toHaveBeenCalled()
  })

  test('handles process execution error', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'installer.exe'
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(true)

    const executePromise = executeRunTask(appName, task, gameFolder)

    // Simulate process error
    setTimeout(() => {
      mockProcess.emit('error', new Error('Process failed'))
    }, 0)

    await expect(executePromise).rejects.toThrow(
      'Process failed: Process failed'
    )
  })

  test('handles process exit with non-zero code', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'installer.exe'
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(true)

    const executePromise = executeRunTask(appName, task, gameFolder)

    // Simulate process failure
    setTimeout(() => {
      mockProcess.emit('close', 1)
    }, 0)

    await expect(executePromise).rejects.toThrow('Process failed with code 1')
  })
})
