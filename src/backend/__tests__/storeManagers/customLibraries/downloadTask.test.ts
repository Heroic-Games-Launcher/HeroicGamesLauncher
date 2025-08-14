import { executeDownloadTask } from 'backend/storeManagers/customLibraries/tasks/downloadTask'
import { DownloadTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { join } from 'path'
import { downloadFile, sendProgressUpdate } from 'backend/utils'

jest.mock('backend/utils')

const mockDownloadFile = downloadFile as jest.MockedFunction<
  typeof downloadFile
>
const mockSendProgressUpdate = sendProgressUpdate as jest.MockedFunction<
  typeof sendProgressUpdate
>

describe('DownloadTask - executeDownloadTask', () => {
  const appName = 'test-game'
  const gameFolder = '/path/to/game'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('downloads file with provided filename', async () => {
    const task: DownloadTask = {
      type: 'download',
      url: 'https://example.com/file.zip',
      filename: 'custom-file.zip',
      destination: 'downloads'
    }

    mockDownloadFile.mockResolvedValue()

    await executeDownloadTask(appName, task, gameFolder)

    expect(mockDownloadFile).toHaveBeenCalledWith({
      url: 'https://example.com/file.zip',
      dest: join(gameFolder, 'downloads', 'custom-file.zip'),
      progressCallback: expect.any(Function)
    })
  })

  test('downloads file without destination (uses game folder)', async () => {
    const task: DownloadTask = {
      type: 'download',
      url: 'https://example.com/file.zip',
      filename: 'file.zip'
    }

    mockDownloadFile.mockResolvedValue()

    await executeDownloadTask(appName, task, gameFolder)

    expect(mockDownloadFile).toHaveBeenCalledWith({
      url: 'https://example.com/file.zip',
      dest: join(gameFolder, 'file.zip'),
      progressCallback: expect.any(Function)
    })
  })

  test('determines filename from URL when not provided', async () => {
    const task: DownloadTask = {
      type: 'download',
      url: 'https://example.com/path/to/installer.exe'
    }

    mockDownloadFile.mockResolvedValue()

    await executeDownloadTask(appName, task, gameFolder)

    expect(mockDownloadFile).toHaveBeenCalledWith({
      url: 'https://example.com/path/to/installer.exe',
      dest: join(gameFolder, 'installer.exe'),
      progressCallback: expect.any(Function)
    })
  })

  test('extracts filename from URL parameters when path filename is a script', async () => {
    const task: DownloadTask = {
      type: 'download',
      url: 'https://example.com/download.php?url=https%3A//cdn.example.com/game.zip'
    }

    mockDownloadFile.mockResolvedValue()

    await executeDownloadTask(appName, task, gameFolder)

    expect(mockDownloadFile).toHaveBeenCalledWith({
      url: 'https://example.com/download.php?url=https%3A//cdn.example.com/game.zip',
      dest: join(gameFolder, 'game.zip'),
      progressCallback: expect.any(Function)
    })
  })

  test('uses path filename when available and not a script', async () => {
    const task: DownloadTask = {
      type: 'download',
      url: 'https://example.com/redirect?url=https%3A//cdn.example.com/game.zip'
    }

    mockDownloadFile.mockResolvedValue()

    await executeDownloadTask(appName, task, gameFolder)

    expect(mockDownloadFile).toHaveBeenCalledWith({
      url: 'https://example.com/redirect?url=https%3A//cdn.example.com/game.zip',
      dest: join(gameFolder, 'redirect'),
      progressCallback: expect.any(Function)
    })
  })

  test('progress callback sends updates correctly', async () => {
    const task: DownloadTask = {
      type: 'download',
      url: 'https://example.com/file.zip',
      filename: 'file.zip'
    }

    let progressCallback:
      | ((
          bytes: number,
          speed: number,
          percentage: number,
          diskWriteSpeed: number
        ) => void)
      | undefined

    mockDownloadFile.mockImplementation(({ progressCallback: cb }) => {
      progressCallback = cb
      return Promise.resolve()
    })

    await executeDownloadTask(appName, task, gameFolder)

    // Simulate progress update
    progressCallback!(50 * 1024 * 1024, 1000, 75, 500) // 50MB, 75%, 500 bytes/s write speed

    expect(mockSendProgressUpdate).toHaveBeenCalledWith({
      appName: 'test-game',
      runner: 'customLibrary',
      status: 'installing',
      progress: {
        bytes: '50MB',
        eta: '',
        percent: 75
      }
    })
  })

  test('handles download failure', async () => {
    const task: DownloadTask = {
      type: 'download',
      url: 'https://example.com/file.zip',
      filename: 'file.zip'
    }

    const downloadError = new Error('Network error')
    mockDownloadFile.mockRejectedValue(downloadError)

    await expect(
      executeDownloadTask(appName, task, gameFolder)
    ).rejects.toThrow('Network error')
  })

  test('handles invalid URL gracefully when determining filename', async () => {
    const task: DownloadTask = {
      type: 'download',
      url: 'invalid-url'
    }

    mockDownloadFile.mockResolvedValue()

    await expect(
      executeDownloadTask(appName, task, gameFolder)
    ).rejects.toThrow('Could not determine filename for download')
  })
})
