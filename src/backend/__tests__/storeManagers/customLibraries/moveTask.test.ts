const mockEnvironment = { isWindows: false }
jest.mock('backend/constants/environment', () => mockEnvironment)

// Mock child_process spawn
const mockSpawn = {
  on: jest.fn(),
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() }
}
jest.mock('child_process', () => ({
  spawn: jest.fn(() => mockSpawn)
}))

import {
  getSettings,
  isNative,
  getGameInfo
} from 'backend/storeManagers/customLibraries/games'
import { MoveTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { join, dirname, isAbsolute } from 'path'
import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { executeMoveTask } from 'backend/storeManagers/customLibraries/tasks/moveTask'
import { spawn } from 'child_process'

jest.mock('fs-extra')
jest.mock('graceful-fs')
jest.mock('path')

jest.mock('backend/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  LogPrefix: {
    CustomLibrary: 'CustomLibrary'
  }
}))

jest.mock('backend/storeManagers/customLibraries/games', () => ({
  getSettings: jest.fn(),
  isNative: jest.fn(),
  getGameInfo: jest.fn()
}))

const mockJoin = join as jest.MockedFunction<typeof join>
const mockDirname = dirname as jest.MockedFunction<typeof dirname>
const mockIsAbsolute = isAbsolute as jest.MockedFunction<typeof isAbsolute>
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>
const mockRmSync = rmSync as jest.MockedFunction<typeof rmSync>
const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>
const mockIsNative = isNative as jest.MockedFunction<typeof isNative>
const mockGetGameInfo = getGameInfo as jest.MockedFunction<typeof getGameInfo>
const mockSpawnFn = spawn as jest.MockedFunction<typeof spawn>

// Helper function to mock successful spawnAsync calls
const mockSuccessfulSpawn = (
  expectedCommand?: string,
  expectedArgs?: string[]
) => {
  mockSpawnFn.mockImplementation((command, args) => {
    if (expectedCommand && command !== expectedCommand) {
      throw new Error(`Expected command ${expectedCommand}, got ${command}`)
    }
    if (expectedArgs && JSON.stringify(args) !== JSON.stringify(expectedArgs)) {
      throw new Error(
        `Expected args ${JSON.stringify(expectedArgs)}, got ${JSON.stringify(args)}`
      )
    }

    const mockProcess = {
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          // Simulate successful exit
          setTimeout(() => callback(0), 0)
        }
      }),
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() }
    }
    return mockProcess as any
  })
}

// Helper function to mock failed spawnAsync calls
const mockFailedSpawn = (exitCode = 1, stderr = 'Mock error') => {
  mockSpawnFn.mockImplementation(() => {
    const mockProcess = {
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(exitCode), 0)
        }
      }),
      stdout: {
        on: jest.fn((event) => {
          if (event === 'data') {
            // Don't emit data for failures
          }
        })
      },
      stderr: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(stderr), 0)
          }
        })
      }
    }
    return mockProcess as any
  })
}

describe('MoveTask - executeMoveTask', () => {
  const gameFolder = '/path/to/game'
  const appName = 'test-game'

  beforeEach(() => {
    jest.clearAllMocks()

    // Set up path mocks to work like real path module
    mockJoin.mockImplementation((...args: string[]) =>
      args.filter(Boolean).join('/')
    )
    mockDirname.mockImplementation((path: string) => {
      const parts = path.split('/')
      parts.pop()
      return parts.join('/') || '/'
    })

    // Set up isAbsolute mock
    mockIsAbsolute.mockImplementation((path: string) => {
      return (
        path.startsWith('/') ||
        path.startsWith('C:') ||
        path.includes('drive_c') ||
        path.includes('/.wine/') ||
        path.includes('/steam/proton/')
      )
    })

    mockGetGameInfo.mockReturnValue({
      install: { platform: 'linux' }
    } as any)
    mockIsNative.mockReturnValue(true)

    // Default to Unix environment
    mockEnvironment.isWindows = false
  })

  test('moves file successfully with relative paths', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'temp/file.txt',
      destination: 'final/file.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    // Mock successful rsync for Unix
    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    // Should call spawn with rsync (since we're on Unix and rsync exists)
    expect(mockSpawnFn).toHaveBeenCalled()
  })

  test('moves file with absolute paths', async () => {
    const task: MoveTask = {
      type: 'move',
      source: '/absolute/source/file.txt',
      destination: '/absolute/dest/file.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    expect(mockSpawnFn).toHaveBeenCalled()
  })

  test('creates destination directory if it does not exist', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'file.txt',
      destination: 'new/folder/file.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(false) // destination dir doesn't exist
      .mockReturnValueOnce(false) // destination file

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    expect(mockMkdirSync).toHaveBeenCalledWith('/path/to/game/new/folder', {
      recursive: true
    })
    expect(mockSpawnFn).toHaveBeenCalled()
  })

  test('removes existing destination before moving', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'source.txt',
      destination: 'dest.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(true) // destination file exists

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    expect(mockRmSync).toHaveBeenCalledWith('/path/to/game/dest.txt', {
      recursive: true,
      force: true
    })
    expect(mockSpawnFn).toHaveBeenCalled()
  })

  test('substitutes {gameFolder} variable', async () => {
    const task: MoveTask = {
      type: 'move',
      source: '{gameFolder}/temp/file.txt',
      destination: '{gameFolder}/final/file.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    expect(mockSpawnFn).toHaveBeenCalled()
  })

  test('substitutes {C} variable on Windows', async () => {
    mockEnvironment.isWindows = true

    const task: MoveTask = {
      type: 'move',
      source: 'temp/save.dat',
      destination: '{C}/Users/Player/Documents/save.dat'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    // Should use robocopy on Windows
    expect(mockSpawnFn).toHaveBeenCalledWith(
      'robocopy',
      [
        '/path/to/game/temp/save.dat',
        'C:/Users/Player/Documents/save.dat',
        '/MOVE',
        '/MIR',
        '/NJH',
        '/NJS',
        '/NDL',
        '/R:3',
        '/W:10'
      ],
      {} // Empty options object
    )
  })

  test('substitutes {C} variable with Wine prefix on Linux', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'save.dat',
      destination: '{C}/users/player/Documents/save.dat'
    }

    mockGetGameInfo.mockReturnValue({
      install: { platform: 'windows' }
    } as any)
    mockIsNative.mockReturnValue(false)
    mockGetSettings.mockResolvedValue({
      winePrefix: '/home/user/.wine',
      wineVersion: { type: 'wine' }
    } as any)

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    expect(mockSpawnFn).toHaveBeenCalled()
  })

  test('substitutes {C} variable with Proton prefix', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'save.dat',
      destination: '{C}/users/player/save.dat'
    }

    mockGetGameInfo.mockReturnValue({
      install: { platform: 'windows' }
    } as any)
    mockIsNative.mockReturnValue(false)
    mockGetSettings.mockResolvedValue({
      winePrefix: '/steam/proton/prefix',
      wineVersion: { type: 'proton' }
    } as any)

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    expect(mockSpawnFn).toHaveBeenCalled()
  })

  test('throws error when source does not exist', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'nonexistent.txt',
      destination: 'dest.txt'
    }

    mockExistsSync.mockReturnValue(false) // source doesn't exist

    await expect(executeMoveTask(task, gameFolder, appName)).rejects.toThrow(
      'Source path not found: /path/to/game/nonexistent.txt'
    )

    expect(mockSpawnFn).not.toHaveBeenCalled()
  })

  test('handles move operation failure', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'source.txt',
      destination: 'dest.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    // Mock failed spawn
    mockFailedSpawn(1, 'Permission denied')

    await expect(executeMoveTask(task, gameFolder, appName)).rejects.toThrow(
      'Failed to move /path/to/game/source.txt to /path/to/game/dest.txt:'
    )
  })

  test('works without appName parameter', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'file.txt',
      destination: 'moved.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder)

    expect(mockSpawnFn).toHaveBeenCalled()
  })
})
