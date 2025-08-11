import { join, isAbsolute, dirname } from 'path'
import { existsSync, mkdirSync, renameSync, rmSync } from 'graceful-fs'
import { logInfo, LogPrefix } from 'backend/logger'
import { MoveTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { isWindows } from 'backend/constants/environment'
import { getSettings, isNative, getGameInfo } from '../games'

export async function executeMoveTask(
  task: MoveTask,
  gameFolder: string,
  appName?: string
): Promise<void> {
  const source = await substituteVariables(task.source, gameFolder, appName)
  const destination = await substituteVariables(
    task.destination,
    gameFolder,
    appName
  )

  // Handle absolute vs relative paths
  const sourcePath = isAbsolute(source) ? source : join(gameFolder, source)
  const destinationPath = isAbsolute(destination)
    ? destination
    : join(gameFolder, destination)

  if (!existsSync(sourcePath)) {
    throw new Error(`Source path not found: ${sourcePath}`)
  }

  logInfo(
    `Moving: ${sourcePath} to ${destinationPath} (Started)`,
    LogPrefix.CustomLibrary
  )

  try {
    // Create destination directory if it doesn't exist
    const destinationDir = dirname(destinationPath)
    if (destinationDir && !existsSync(destinationDir)) {
      mkdirSync(destinationDir, { recursive: true })
    }

    // Check if destination already exists
    if (existsSync(destinationPath)) {
      logInfo(
        `Destination already exists, removing: ${destinationPath}`,
        LogPrefix.CustomLibrary
      )
      rmSync(destinationPath, { recursive: true, force: true })
    }

    // Move the folder/file
    renameSync(sourcePath, destinationPath)

    logInfo(
      `Moving: ${sourcePath} to ${destinationPath} (Done)`,
      LogPrefix.CustomLibrary
    )
  } catch (error) {
    throw new Error(
      `Failed to move ${sourcePath} to ${destinationPath}: ${error.message}`
    )
  }
}

async function substituteVariables(
  path: string,
  gameFolder: string,
  appName?: string
): Promise<string> {
  let result = path.replace(/{gameFolder}/g, gameFolder)

  // Handle {C} variable for C: drive
  if (result.includes('{C}') && appName) {
    const cDrivePath = await getCDrivePath(appName)
    result = result.replace(/{C}/g, cDrivePath)
  }

  return result
}

async function getCDrivePath(appName: string): Promise<string> {
  // On Windows, C: is just C:/
  if (isWindows) {
    return 'C:'
  }

  // On Linux/Mac, check if we need wine
  const gameInfo = getGameInfo(appName)
  const requiresWine =
    !isNative(appName) && gameInfo.install.platform === 'windows'

  if (!requiresWine) {
    // If not using wine, just return C: (though this might not make sense)
    logInfo(
      'Game does not require wine, but {C} variable used. Using C:',
      LogPrefix.CustomLibrary
    )
    return 'C:'
  }

  // Get wine prefix path
  const gameSettings = await getSettings(appName)
  const { winePrefix, wineVersion } = gameSettings

  // For Proton, the actual prefix is in the 'pfx' subdirectory
  const actualPrefix =
    wineVersion.type === 'proton' ? join(winePrefix, 'pfx') : winePrefix

  // C: drive is in drive_c folder
  return join(actualPrefix, 'drive_c')
}
