import { join, isAbsolute, dirname } from 'path'
import { existsSync, mkdirSync, rmSync } from 'graceful-fs'
import { logInfo, logError, LogPrefix } from 'backend/logger'
import { MoveTask } from 'backend/storeManagers/customLibraries/tasks/types'
import { isWindows } from 'backend/constants/environment'
import { getSettings, isNative, getGameInfo } from '../games'
import { spawn, SpawnOptions } from 'child_process'

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

    // Use robust move operation based on platform
    if (isWindows) {
      await moveOnWindowsSimple(sourcePath, destinationPath)
    } else {
      await moveOnUnixSimple(sourcePath, destinationPath)
    }

    logInfo(
      `Moving: ${sourcePath} to ${destinationPath} (Done)`,
      LogPrefix.CustomLibrary
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Failed to move ${sourcePath} to ${destinationPath}: ${errorMessage}`
    )
  }
}

async function moveOnWindowsSimple(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  // Use robocopy like the existing moveOnWindows function
  const { code, stderr } = await spawnAsync('robocopy', [
    sourcePath,
    destinationPath,
    '/MOVE',
    '/MIR',
    '/NJH',
    '/NJS',
    '/NDL',
    '/R:3', // Retry 3 times
    '/W:10' // Wait 10 seconds between retries
  ])

  // Robocopy exit codes: 0-7 are success, 8+ are errors
  if (code !== null && code >= 8) {
    throw new Error(`Move operation failed: ${stderr}`)
  }
}

async function moveOnUnixSimple(
  sourcePath: string,
  destinationPath: string
): Promise<void> {
  // Try rsync first (like moveOnUnix), fall back to mv
  let rsyncExists = false
  try {
    await execAsync('which rsync')
    rsyncExists = true
  } catch {
    // rsync not available, will fall back to mv
  }

  if (rsyncExists) {
    const origin = sourcePath + '/'
    const { code, stderr } = await spawnAsync('rsync', [
      '--archive',
      '--remove-source-files',
      origin,
      destinationPath
    ])

    if (code !== 0) {
      throw new Error(`rsync failed: ${stderr}`)
    }

    // Remove the empty source directory
    try {
      await spawnAsync('rm', ['-rf', sourcePath])
    } catch (error) {
      logError(
        `Failed to remove source directory ${sourcePath}: ${error}`,
        LogPrefix.CustomLibrary
      )
    }
  } else {
    // Fall back to mv
    const { code, stderr } = await spawnAsync('mv', [
      sourcePath,
      destinationPath
    ])

    if (code !== 0) {
      throw new Error(`mv failed: ${stderr}`)
    }
  }
}

// Simplified spawnAsync (reused from utils.ts pattern)
const spawnAsync = async (
  command: string,
  args: string[],
  options: SpawnOptions = {}
): Promise<{ code: number | null; stdout: string; stderr: string }> => {
  const child = spawn(command, args, options)
  const stdout: string[] = []
  const stderr: string[] = []

  if (child.stdout) {
    child.stdout.on('data', (data) => {
      stdout.push(data.toString())
    })
  }

  if (child.stderr) {
    child.stderr.on('data', (data) => {
      stderr.push(data.toString())
    })
  }

  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', (code) => {
      resolve({
        code,
        stdout: stdout.join(''),
        stderr: stderr.join('')
      })
    })
  })
}

// Simplified execAsync
const execAsync = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command])
    let stdout = ''
    let stderr = ''

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim())
      } else {
        reject(new Error(stderr || `Command failed with exit code ${code}`))
      }
    })

    child.on('error', reject)
  })
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
