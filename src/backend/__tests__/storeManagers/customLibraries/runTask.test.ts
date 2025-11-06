import { join } from 'path'
import { executeRunTask } from 'backend/storeManagers/customLibraries/tasks/runTask'
import { RunTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { existsSync } from 'graceful-fs'
import { logInfo, LogPrefix } from 'backend/logger'
import {
  getSettings,
  isNative,
  getGameInfo
} from 'backend/storeManagers/customLibraries/games'
import { runWineCommand } from 'backend/launcher'
import { spawnAsync } from 'backend/utils'

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

jest.mock('backend/utils', () => ({
  spawnAsync: jest.fn()
}))

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>
const mockSpawnAsync = spawnAsync as jest.MockedFunction<typeof spawnAsync>
const mockLogInfo = logInfo as jest.MockedFunction<typeof logInfo>
const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>
const mockIsNative = isNative as jest.MockedFunction<typeof isNative>
const mockGetGameInfo = getGameInfo as jest.MockedFunction<typeof getGameInfo>
const mockRunWineCommand = runWineCommand as jest.MockedFunction<
  typeof runWineCommand
>

describe('RunTask - executeRunTask', () => {
  const appName = 'test-game'
  const gameFolder = '/path/to/game'

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mocks
    mockGetGameInfo.mockReturnValue({
      install: { platform: 'linux' }
    } as any)
    mockIsNative.mockReturnValue(true)

    // Default successful spawnAsync mock
    mockSpawnAsync.mockResolvedValue({
      code: 0,
      stdout: '',
      stderr: ''
    })
  })

  test('runs native executable successfully', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'installer.exe',
      args: ['--silent', '--accept-license']
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(true)

    await executeRunTask(appName, task, gameFolder)

    expect(mockSpawnAsync).toHaveBeenCalledWith(
      'powershell',
      [
        '-Command',
        `Start-Process -Wait "${join(gameFolder, 'installer.exe')}" -ArgumentList '--silent','--accept-license' -WorkingDirectory "${gameFolder}" -Verb RunAs`
      ],
      { stdio: 'inherit' }
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

    await executeRunTask(appName, task, gameFolder)

    expect(mockSpawnAsync).toHaveBeenCalledWith(
      'powershell',
      [
        '-Command',
        `Start-Process -Wait "${join(gameFolder, 'setup.exe')}" -ArgumentList '--install-dir','${gameFolder}/output' -WorkingDirectory "${gameFolder}" -Verb RunAs`
      ],
      { stdio: 'inherit' }
    )
  })

  test('runs executable without arguments', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'app.exe'
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(true)

    await executeRunTask(appName, task, gameFolder)

    expect(mockSpawnAsync).toHaveBeenCalledWith(
      'powershell',
      [
        '-Command',
        `Start-Process -Wait "${join(gameFolder, 'app.exe')}" -WorkingDirectory "${gameFolder}" -Verb RunAs`
      ],
      { stdio: 'inherit' }
    )
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

    expect(mockSpawnAsync).not.toHaveBeenCalled()
  })

  test('handles process execution error', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'installer.exe'
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(true)

    // Mock spawnAsync to reject with an error
    mockSpawnAsync.mockRejectedValue(new Error('Process failed'))

    await expect(executeRunTask(appName, task, gameFolder)).rejects.toThrow(
      'Process failed'
    )
  })

  test('handles process exit with non-zero code', async () => {
    const task: RunTask = {
      type: 'run',
      executable: 'installer.exe'
    }

    mockExistsSync.mockReturnValue(true)
    mockIsNative.mockReturnValue(true)

    // Mock spawnAsync to return non-zero exit code
    mockSpawnAsync.mockResolvedValue({
      code: 1,
      stdout: '',
      stderr: 'Process error output'
    })

    await expect(executeRunTask(appName, task, gameFolder)).rejects.toThrow(
      'Process failed with code 1: Process error output'
    )
  })
})
