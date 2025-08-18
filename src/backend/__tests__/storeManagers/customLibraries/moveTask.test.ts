const mockEnvironment = { isWindows: false }
jest.mock('backend/constants/environment', () => mockEnvironment)

import {
  getSettings,
  isNative,
  getGameInfo
} from 'backend/storeManagers/customLibraries/games'
import { MoveTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { join, dirname, isAbsolute } from 'path'
import { existsSync, mkdirSync, rmSync, renameSync } from 'graceful-fs'
import { executeMoveTask } from 'backend/storeManagers/customLibraries/tasks/moveTask'
import { spawnAsync } from 'backend/utils'

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

jest.mock('backend/utils', () => ({
  spawnAsync: jest.fn()
}))

const mockJoin = join as jest.MockedFunction<typeof join>
const mockDirname = dirname as jest.MockedFunction<typeof dirname>
const mockIsAbsolute = isAbsolute as jest.MockedFunction<typeof isAbsolute>
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>
const mockMkdirSync = mkdirSync as jest.MockedFunction<typeof mkdirSync>
const mockRmSync = rmSync as jest.MockedFunction<typeof rmSync>
const mockRenameSync = renameSync as jest.MockedFunction<typeof renameSync>
const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>
const mockIsNative = isNative as jest.MockedFunction<typeof isNative>
const mockGetGameInfo = getGameInfo as jest.MockedFunction<typeof getGameInfo>
const mockSpawnAsync = spawnAsync as jest.MockedFunction<typeof spawnAsync>

// Helper function to mock successful spawnAsync calls
const mockSuccessfulSpawn = () => {
  mockSpawnAsync.mockResolvedValue({
    code: 0,
    stdout: '',
    stderr: ''
  })
}

// Helper function to mock failed spawnAsync calls
const mockFailedSpawn = (exitCode = 1, stderr = 'Mock error') => {
  mockSpawnAsync.mockResolvedValue({
    code: exitCode,
    stdout: '',
    stderr
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

  test('moves file successfully with relative paths on Unix', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'temp/file.txt',
      destination: 'final/file.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    await executeMoveTask(task, gameFolder, appName)

    // On Unix, should use renameSync, not spawnAsync
    expect(mockRenameSync).toHaveBeenCalledWith(
      '/path/to/game/temp/file.txt',
      '/path/to/game/final/file.txt'
    )
    expect(mockSpawnAsync).not.toHaveBeenCalled()
  })

  test('moves file with absolute paths on Unix', async () => {
    const task: MoveTask = {
      type: 'move',
      source: '/absolute/source/file.txt',
      destination: '/absolute/dest/file.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    await executeMoveTask(task, gameFolder, appName)

    expect(mockRenameSync).toHaveBeenCalledWith(
      '/absolute/source/file.txt',
      '/absolute/dest/file.txt'
    )
    expect(mockSpawnAsync).not.toHaveBeenCalled()
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

    await executeMoveTask(task, gameFolder, appName)

    expect(mockMkdirSync).toHaveBeenCalledWith('/path/to/game/new/folder', {
      recursive: true
    })
    expect(mockRenameSync).toHaveBeenCalled()
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

    await executeMoveTask(task, gameFolder, appName)

    expect(mockRmSync).toHaveBeenCalledWith('/path/to/game/dest.txt', {
      recursive: true,
      force: true
    })
    expect(mockRenameSync).toHaveBeenCalled()
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

    await executeMoveTask(task, gameFolder, appName)

    expect(mockRenameSync).toHaveBeenCalledWith(
      '/path/to/game/temp/file.txt',
      '/path/to/game/final/file.txt'
    )
  })

  test('uses robocopy on Windows', async () => {
    mockEnvironment.isWindows = true

    const task: MoveTask = {
      type: 'move',
      source: 'temp/save.dat',
      destination: 'final/save.dat'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file
      .mockReturnValueOnce(false) // source doesn't exist after robocopy (cleanup check)

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    // Should use robocopy on Windows
    expect(mockSpawnAsync).toHaveBeenCalledWith('robocopy', [
      '/path/to/game/temp/save.dat',
      '/path/to/game/final/save.dat',
      '/MOVE',
      '/MIR',
      '/NJH',
      '/NJS',
      '/NDL',
      '/R:3',
      '/W:10'
    ])
    expect(mockRenameSync).not.toHaveBeenCalled()
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
      .mockReturnValueOnce(false) // source cleanup check

    mockSuccessfulSpawn()

    await executeMoveTask(task, gameFolder, appName)

    // Should use robocopy on Windows with C: substitution
    expect(mockSpawnAsync).toHaveBeenCalledWith('robocopy', [
      '/path/to/game/temp/save.dat',
      'C:/Users/Player/Documents/save.dat',
      '/MOVE',
      '/MIR',
      '/NJH',
      '/NJS',
      '/NDL',
      '/R:3',
      '/W:10'
    ])
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

    await executeMoveTask(task, gameFolder, appName)

    expect(mockRenameSync).toHaveBeenCalledWith(
      '/path/to/game/save.dat',
      '/home/user/.wine/drive_c/users/player/Documents/save.dat'
    )
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

    await executeMoveTask(task, gameFolder, appName)

    expect(mockRenameSync).toHaveBeenCalledWith(
      '/path/to/game/save.dat',
      '/steam/proton/prefix/pfx/drive_c/users/player/save.dat'
    )
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

    expect(mockRenameSync).not.toHaveBeenCalled()
    expect(mockSpawnAsync).not.toHaveBeenCalled()
  })

  test('handles Unix move operation failure', async () => {
    const task: MoveTask = {
      type: 'move',
      source: 'source.txt',
      destination: 'dest.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    // Mock renameSync to throw an error
    mockRenameSync.mockImplementation(() => {
      throw new Error('Permission denied')
    })

    await expect(executeMoveTask(task, gameFolder, appName)).rejects.toThrow(
      'Failed to move /path/to/game/source.txt to /path/to/game/dest.txt: Permission denied'
    )
  })

  test('handles Windows robocopy failure', async () => {
    mockEnvironment.isWindows = true

    const task: MoveTask = {
      type: 'move',
      source: 'source.txt',
      destination: 'dest.txt'
    }

    mockExistsSync
      .mockReturnValueOnce(true) // source exists
      .mockReturnValueOnce(true) // destination dir
      .mockReturnValueOnce(false) // destination file

    // Mock robocopy failure (exit code >= 8)
    mockFailedSpawn(8, 'Access denied')

    await expect(executeMoveTask(task, gameFolder, appName)).rejects.toThrow(
      'Failed to move /path/to/game/source.txt to /path/to/game/dest.txt: Move operation failed: Access denied'
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

    await executeMoveTask(task, gameFolder)

    expect(mockRenameSync).toHaveBeenCalledWith(
      '/path/to/game/file.txt',
      '/path/to/game/moved.txt'
    )
  })
})
