import { executeExtractTask } from 'backend/storeManagers/customLibraries/tasks/extractTask'
import { ExtractTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { join } from 'path'
import { existsSync, rmSync } from 'graceful-fs'
import { extractFiles } from 'backend/utils'

jest.mock('graceful-fs', () => ({
  existsSync: jest.fn(),
  rmSync: jest.fn()
}))

jest.mock('backend/utils', () => ({
  extractFiles: jest.fn()
}))

const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>
const mockRmSync = rmSync as jest.MockedFunction<typeof rmSync>
const mockExtractFiles = extractFiles as jest.MockedFunction<
  typeof extractFiles
>

describe('ExtractTask - executeExtractTask', () => {
  const gameFolder = '/path/to/game'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('extracts file successfully with destination', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.zip',
      destination: 'extracted'
    }

    mockExistsSync.mockReturnValue(true)
    mockExtractFiles.mockResolvedValue({
      status: 'done',
      installPath: '/path/to/destination'
    })

    await executeExtractTask(task, gameFolder)

    expect(mockExistsSync).toHaveBeenCalledWith(join(gameFolder, 'archive.zip'))
    expect(mockExtractFiles).toHaveBeenCalledWith({
      path: join(gameFolder, 'archive.zip'),
      destination: join(gameFolder, 'extracted'),
      strip: 0
    })
    expect(mockRmSync).toHaveBeenCalledWith(join(gameFolder, 'archive.zip'))
  })

  test('extracts file successfully without destination', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.tar.gz'
    }

    mockExistsSync.mockReturnValue(true)
    mockExtractFiles.mockResolvedValue({
      status: 'done',
      installPath: '/path/to/destination'
    })

    await executeExtractTask(task, gameFolder)

    expect(mockExistsSync).toHaveBeenCalledWith(
      join(gameFolder, 'archive.tar.gz')
    )
    expect(mockExtractFiles).toHaveBeenCalledWith({
      path: join(gameFolder, 'archive.tar.gz'),
      destination: join(gameFolder, ''),
      strip: 0
    })
    expect(mockRmSync).toHaveBeenCalledWith(join(gameFolder, 'archive.tar.gz'))
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

    expect(mockExtractFiles).not.toHaveBeenCalled()
    expect(mockRmSync).not.toHaveBeenCalled()
  })

  test('throws error when extractFiles returns error status', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.zip'
    }

    mockExistsSync.mockReturnValue(true)
    mockExtractFiles.mockResolvedValue({
      status: 'error',
      error: 'Unsupported archive format'
    })

    await expect(executeExtractTask(task, gameFolder)).rejects.toThrow(
      'Extraction failed: Unsupported archive format'
    )

    expect(mockExtractFiles).toHaveBeenCalled()
    expect(mockRmSync).not.toHaveBeenCalled()
  })

  test('handles extractFiles throwing an error', async () => {
    const task: ExtractTask = {
      type: 'extract',
      source: 'archive.zip'
    }

    mockExistsSync.mockReturnValue(true)
    mockExtractFiles.mockRejectedValue(new Error('Extraction command failed'))

    await expect(executeExtractTask(task, gameFolder)).rejects.toThrow(
      'Extraction command failed'
    )

    expect(mockExtractFiles).toHaveBeenCalled()
    expect(mockRmSync).not.toHaveBeenCalled()
  })

  test('uses correct paths for different archive types', async () => {
    const testCases = [
      { source: 'file.zip', destination: 'output' },
      { source: 'file.tar.gz', destination: undefined },
      { source: 'file.7z', destination: 'extracted' }
    ]

    for (const testCase of testCases) {
      jest.clearAllMocks()

      const task: ExtractTask = {
        type: 'extract',
        source: testCase.source,
        ...(testCase.destination && { destination: testCase.destination })
      }

      mockExistsSync.mockReturnValue(true)
      mockExtractFiles.mockResolvedValue({
        status: 'done',
        installPath: '/some/path'
      })

      await executeExtractTask(task, gameFolder)

      const expectedDestination = testCase.destination || ''
      expect(mockExtractFiles).toHaveBeenCalledWith({
        path: join(gameFolder, testCase.source),
        destination: join(gameFolder, expectedDestination),
        strip: 0
      })
    }
  })
})
