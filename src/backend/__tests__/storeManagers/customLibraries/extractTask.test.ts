import { executeExtractTask } from 'backend/storeManagers/customLibraries/tasks/extractTask'
import { ExtractTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { join } from 'path'
import { spawn, spawn as mockSpawn } from 'child_process'
import { EventEmitter } from 'events'
import { existsSync, rmSync } from 'graceful-fs'

jest.mock('graceful-fs', () => ({
  existsSync: jest.fn(),
  rmSync: jest.fn()
}))
jest.mock('child_process', () => ({
  spawn: jest.fn()
}))

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>
const mockRmSync = rmSync as jest.MockedFunction<typeof rmSync>
const mockSpawnFn = mockSpawn as jest.MockedFunction<typeof spawn>

class MockChildProcess extends EventEmitter {
  on = jest.fn((event: string, listener: (...args: any[]) => void) => {
    super.on(event, listener)
    return this
  })
}

describe('ExtractTask - executeExtractTask', () => {
  const gameFolder = '/path/to/game'
  let mockProcess: MockChildProcess

  beforeEach(() => {
    jest.clearAllMocks()
    mockProcess = new MockChildProcess()
    mockSpawnFn.mockReturnValue(mockProcess as any)
  })

  test('extracts zip file successfully', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.zip',
      destination: 'extracted'
    }

    mockExistsSync.mockReturnValue(true)

    const executePromise = executeExtractTask(task, gameFolder)

    // Simulate successful extraction
    setTimeout(() => {
      mockProcess.emit('close', 0)
    }, 0)

    await executePromise

    expect(mockSpawnFn).toHaveBeenCalledWith('unzip', [
      '-o',
      join(gameFolder, 'archive.zip'),
      '-d',
      join(gameFolder, 'extracted')
    ])
    expect(mockRmSync).toHaveBeenCalledWith(join(gameFolder, 'archive.zip'))
  })

  test('extracts tar.gz file successfully', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.tar.gz'
    }

    mockExistsSync.mockReturnValue(true)

    const executePromise = executeExtractTask(task, gameFolder)

    // Simulate successful extraction
    setTimeout(() => {
      mockProcess.emit('close', 0)
    }, 0)

    await executePromise

    expect(mockSpawnFn).toHaveBeenCalledWith('tar', [
      '-xzf',
      join(gameFolder, 'archive.tar.gz'),
      '-C',
      join(gameFolder, '')
    ])
  })

  test('extracts 7z file successfully', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.7z',
      destination: 'output'
    }

    mockExistsSync.mockReturnValue(true)

    const executePromise = executeExtractTask(task, gameFolder)

    // Simulate successful extraction
    setTimeout(() => {
      mockProcess.emit('close', 0)
    }, 0)

    await executePromise

    expect(mockSpawnFn).toHaveBeenCalledWith('7z', [
      'x',
      join(gameFolder, 'archive.7z'),
      `-o${join(gameFolder, 'output')}`,
      '-y'
    ])
  })

  test('handles different tar formats', async () => {
    const formats = [
      { ext: '.tar', args: ['-xf'] },
      { ext: '.tar.bz2', args: ['-xjf'] },
      { ext: '.tar.xz', args: ['-xJf'] }
    ]

    for (const format of formats) {
      jest.clearAllMocks()
      mockProcess = new MockChildProcess()
      mockSpawnFn.mockReturnValue(mockProcess as any)

      const task: ExtractTask = {
        type: 'extract',
        source: `archive${format.ext}`
      }

      mockExistsSync.mockReturnValue(true)

      const executePromise = executeExtractTask(task, gameFolder)

      // Simulate successful extraction
      setTimeout(() => {
        mockProcess.emit('close', 0)
      }, 0)

      await executePromise

      expect(mockSpawnFn).toHaveBeenCalledWith('tar', [
        ...format.args,
        join(gameFolder, `archive${format.ext}`),
        '-C',
        join(gameFolder, '')
      ])
    }
  })

  test('throws error when source file does not exist', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'nonexistent.zip'
    }

    mockExistsSync.mockReturnValue(false)

    await expect(executeExtractTask(task, gameFolder)).rejects.toThrow(
      `Source file not found: ${join(gameFolder, 'nonexistent.zip')}`
    )

    expect(mockSpawnFn).not.toHaveBeenCalled()
    expect(mockRmSync).not.toHaveBeenCalled()
  })

  test('throws error for unsupported archive format', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.unknown'
    }

    mockExistsSync.mockReturnValue(true)

    await expect(executeExtractTask(task, gameFolder)).rejects.toThrow(
      'Unsupported archive format: .unknown'
    )

    expect(mockSpawnFn).not.toHaveBeenCalled()
    expect(mockRmSync).not.toHaveBeenCalled()
  })

  test('handles extraction command error', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.zip'
    }

    mockExistsSync.mockReturnValue(true)

    const executePromise = executeExtractTask(task, gameFolder)

    // Simulate command error
    setTimeout(() => {
      mockProcess.emit('error', new Error('Command not found'))
    }, 0)

    await expect(executePromise).rejects.toThrow(
      'Extraction command failed: Command not found'
    )

    expect(mockRmSync).not.toHaveBeenCalled()
  })

  test('handles extraction failure with non-zero exit code', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.zip'
    }

    mockExistsSync.mockReturnValue(true)

    const executePromise = executeExtractTask(task, gameFolder)

    // Simulate extraction failure
    setTimeout(() => {
      mockProcess.emit('close', 1)
    }, 0)

    await expect(executePromise).rejects.toThrow(
      'Extraction failed with code 1'
    )

    expect(mockRmSync).not.toHaveBeenCalled()
  })

  test('uses empty destination when not provided', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.zip'
    }

    mockExistsSync.mockReturnValue(true)

    const executePromise = executeExtractTask(task, gameFolder)

    // Simulate successful extraction
    setTimeout(() => {
      mockProcess.emit('close', 0)
    }, 0)

    await executePromise

    expect(mockSpawnFn).toHaveBeenCalledWith('unzip', [
      '-o',
      join(gameFolder, 'archive.zip'),
      '-d',
      join(gameFolder, '')
    ])
  })
})
