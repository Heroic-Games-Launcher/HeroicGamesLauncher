import { executeTasks } from 'backend/storeManagers/customLibraries/taskExecutor'
import {
  CustomLibraryTask,
  DownloadTask,
  ExtractTask,
  RunTask,
  MoveTask
} from 'backend/storeManagers/customLibraries/tasks/types'
import { logInfo, logError, LogPrefix } from 'backend/logger'
import { executeDownloadTask } from 'backend/storeManagers/customLibraries/tasks/downloadTask'
import { executeExtractTask } from 'backend/storeManagers/customLibraries/tasks/extractTask'
import { executeRunTask } from 'backend/storeManagers/customLibraries/tasks/runTask'
import { executeMoveTask } from 'backend/storeManagers/customLibraries/tasks/moveTask'
import { showDialogBoxModalAuto } from 'backend/dialog/dialog'
import i18next from 'i18next'

jest.mock('backend/logger')
jest.mock('backend/storeManagers/customLibraries/tasks/downloadTask')
jest.mock('backend/storeManagers/customLibraries/tasks/extractTask')
jest.mock('backend/storeManagers/customLibraries/tasks/runTask')
jest.mock('backend/storeManagers/customLibraries/tasks/moveTask')
jest.mock('backend/dialog/dialog')
jest.mock('i18next', () => ({
  t: jest.fn()
}))

const mockLogInfo = logInfo as jest.MockedFunction<typeof logInfo>
const mockLogError = logError as jest.MockedFunction<typeof logError>
const mockExecuteDownloadTask = executeDownloadTask as jest.MockedFunction<
  typeof executeDownloadTask
>
const mockExecuteExtractTask = executeExtractTask as jest.MockedFunction<
  typeof executeExtractTask
>
const mockExecuteRunTask = executeRunTask as jest.MockedFunction<
  typeof executeRunTask
>
const mockExecuteMoveTask = executeMoveTask as jest.MockedFunction<
  typeof executeMoveTask
>
const mockShowDialogBoxModalAuto =
  showDialogBoxModalAuto as jest.MockedFunction<typeof showDialogBoxModalAuto>
const mockI18next = i18next as jest.Mocked<typeof i18next>

describe('TaskExecutor - executeTasks', () => {
  const appName = 'test-game'
  const gameFolder = '/path/to/game'

  beforeEach(() => {
    jest.clearAllMocks()
    ;(mockI18next.t as jest.MockedFunction<typeof i18next.t>).mockReturnValue(
      'Uncaught Exception occured!'
    )
  })

  test('executes download task successfully', async () => {
    const downloadTask: DownloadTask = {
      type: 'download',
      url: 'https://example.com/file.zip',
      filename: 'file.zip'
    }
    const tasks: CustomLibraryTask[] = [downloadTask]

    mockExecuteDownloadTask.mockResolvedValue()

    await executeTasks(appName, tasks, gameFolder, 'install')

    expect(mockLogInfo).toHaveBeenCalledWith(
      'Starting install tasks for test-game',
      LogPrefix.CustomLibrary
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'Executing download task (1/1)',
      LogPrefix.CustomLibrary
    )
    expect(mockExecuteDownloadTask).toHaveBeenCalledWith(
      appName,
      downloadTask,
      gameFolder
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'Completed download task',
      LogPrefix.CustomLibrary
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'Completed all install tasks for test-game',
      LogPrefix.CustomLibrary
    )
  })

  test('executes extract task successfully', async () => {
    const extractTask: ExtractTask = {
      type: 'extract',
      source: 'file.zip',
      destination: 'extracted/'
    }
    const tasks: CustomLibraryTask[] = [extractTask]

    mockExecuteExtractTask.mockResolvedValue()

    await executeTasks(appName, tasks, gameFolder, 'install')

    expect(mockExecuteExtractTask).toHaveBeenCalledWith(extractTask, gameFolder)
  })

  test('executes run task successfully', async () => {
    const runTask: RunTask = {
      type: 'run',
      executable: 'installer.exe',
      args: ['--silent']
    }
    const tasks: CustomLibraryTask[] = [runTask]

    mockExecuteRunTask.mockResolvedValue()

    await executeTasks(appName, tasks, gameFolder, 'install')

    expect(mockExecuteRunTask).toHaveBeenCalledWith(
      appName,
      runTask,
      gameFolder
    )
  })

  test('executes move task successfully', async () => {
    const moveTask: MoveTask = {
      type: 'move',
      source: 'temp/file.txt',
      destination: 'final/file.txt'
    }
    const tasks: CustomLibraryTask[] = [moveTask]

    mockExecuteMoveTask.mockResolvedValue()

    await executeTasks(appName, tasks, gameFolder, 'install')

    expect(mockExecuteMoveTask).toHaveBeenCalledWith(
      moveTask,
      gameFolder,
      appName
    )
  })

  test('executes multiple tasks in order', async () => {
    const tasks: CustomLibraryTask[] = [
      { type: 'download', url: 'https://example.com/file.zip' },
      { type: 'extract', source: 'file.zip' },
      { type: 'run', executable: 'installer.exe' }
    ]

    mockExecuteDownloadTask.mockResolvedValue()
    mockExecuteExtractTask.mockResolvedValue()
    mockExecuteRunTask.mockResolvedValue()

    await executeTasks(appName, tasks, gameFolder, 'install')

    expect(mockLogInfo).toHaveBeenCalledWith(
      'Executing download task (1/3)',
      LogPrefix.CustomLibrary
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'Executing extract task (2/3)',
      LogPrefix.CustomLibrary
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'Executing run task (3/3)',
      LogPrefix.CustomLibrary
    )
  })

  test('handles unknown task type', async () => {
    const unknownTask = { type: 'unknown' } as any
    const tasks: CustomLibraryTask[] = [unknownTask]

    await expect(
      executeTasks(appName, tasks, gameFolder, 'install')
    ).rejects.toThrow('Unknown task type: unknown')

    expect(mockLogError).toHaveBeenCalledWith(
      'Failed to execute unknown task: Unknown task type: unknown',
      LogPrefix.CustomLibrary
    )
    expect(mockShowDialogBoxModalAuto).toHaveBeenCalledWith({
      title: 'Uncaught Exception occured!',
      message: 'Failed to execute unknown task: Unknown task type: unknown',
      type: 'ERROR'
    })
  })

  test('handles task execution failure', async () => {
    const downloadTask: DownloadTask = {
      type: 'download',
      url: 'https://example.com/file.zip'
    }
    const tasks: CustomLibraryTask[] = [downloadTask]
    const errorMessage = 'Network error'

    mockExecuteDownloadTask.mockRejectedValue(new Error(errorMessage))

    await expect(
      executeTasks(appName, tasks, gameFolder, 'install')
    ).rejects.toThrow(errorMessage)

    expect(mockLogError).toHaveBeenCalledWith(
      `Failed to execute download task: ${errorMessage}`,
      LogPrefix.CustomLibrary
    )
    expect(mockShowDialogBoxModalAuto).toHaveBeenCalledWith({
      title: 'Uncaught Exception occured!',
      message: `Failed to execute download task: ${errorMessage}`,
      type: 'ERROR'
    })
  })

  test('executes uninstall tasks with correct context', async () => {
    const moveTask: MoveTask = {
      type: 'move',
      source: 'game/save.dat',
      destination: 'backup/save.dat'
    }
    const tasks: CustomLibraryTask[] = [moveTask]

    mockExecuteMoveTask.mockResolvedValue()

    await executeTasks(appName, tasks, gameFolder, 'uninstall')

    expect(mockLogInfo).toHaveBeenCalledWith(
      'Starting uninstall tasks for test-game',
      LogPrefix.CustomLibrary
    )
    expect(mockLogInfo).toHaveBeenCalledWith(
      'Completed all uninstall tasks for test-game',
      LogPrefix.CustomLibrary
    )
  })

  test('stops execution on first task failure', async () => {
    const tasks: CustomLibraryTask[] = [
      { type: 'download', url: 'https://example.com/file.zip' },
      { type: 'extract', source: 'file.zip' }
    ]

    mockExecuteDownloadTask.mockRejectedValue(new Error('Download failed'))

    await expect(
      executeTasks(appName, tasks, gameFolder, 'install')
    ).rejects.toThrow('Download failed')

    expect(mockExecuteDownloadTask).toHaveBeenCalled()
    expect(mockExecuteExtractTask).not.toHaveBeenCalled()
  })
})
