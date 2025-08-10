import { CustomLibraryTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { logInfo, LogPrefix, logError } from 'backend/logger'
import { showDialogBoxModalAuto } from 'backend/dialog/dialog'
import i18next from 'i18next'

/**
 * Executes a list of tasks in array order for custom library games
 */
export async function executeTasks(
  appName: string,
  tasks: CustomLibraryTask[],
  gameFolder: string,
  context: 'install' | 'uninstall'
): Promise<void> {
  logInfo(`Starting ${context} tasks for ${appName}`, LogPrefix.CustomLibrary)

  for (const [index, task] of tasks.entries()) {
    logInfo(
      `Executing ${task.type} task (${index + 1}/${tasks.length})`,
      LogPrefix.CustomLibrary
    )

    try {
      // TODO: Implement task execution

      logInfo(`Completed ${task.type} task`, LogPrefix.CustomLibrary)
    } catch (error) {
      logError(
        `Failed to execute ${task.type} task: ${error.message}`,
        LogPrefix.CustomLibrary
      )

      showDialogBoxModalAuto({
        title: i18next.t(
          'box.error.uncaught-exception.title',
          'Uncaught Exception occured!'
        ),
        message: `Failed to execute ${task.type} task: ${error.message}`,
        type: 'ERROR'
      })
      throw error
    }
  }

  logInfo(
    `Completed all ${context} tasks for ${appName}`,
    LogPrefix.CustomLibrary
  )
}
