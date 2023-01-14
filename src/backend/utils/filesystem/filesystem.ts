import { isWindows } from '../../constants'
import { logError, LogPrefix } from '../../logger/logger'
import { shell } from 'electron'
import fileSize from 'filesize'
import { existsSync } from 'graceful-fs'
import { join, normalize } from 'path'
import { execAsync } from '../process/process'

function showItemInFolder(item: string) {
  if (existsSync(item)) {
    try {
      shell.showItemInFolder(item)
    } catch (error) {
      logError(
        ['Failed to show item in folder with:', error],
        LogPrefix.Backend
      )
    }
  }
}

/**
 * Finds an executable on %PATH%/$PATH
 * @param executable The executable to find
 * @returns The full path to the executable, or nothing if it was not found
 */
// This name could use some work
async function searchForExecutableOnPath(executable: string): Promise<string> {
  if (isWindows) {
    // Todo: Respect %PATHEXT% here
    const paths = process.env.PATH?.split(';') || []
    for (const path of paths) {
      const fullPath = join(path, executable)
      if (existsSync(fullPath)) {
        return fullPath
      }
    }
    return ''
  } else {
    return execAsync(`which ${executable}`)
      .then(({ stdout }) => {
        return stdout.split('\n')[0]
      })
      .catch((error) => {
        logError(error, LogPrefix.Backend)
        return ''
      })
  }
}

const getShellPath = async (path: string): Promise<string> =>
  normalize((await execAsync(`echo "${path}"`)).stdout.trim())

function getFirstExistingParentPath(directoryPath: string): string {
  let parentDirectoryPath = directoryPath
  let parentDirectoryFound = existsSync(parentDirectoryPath)

  while (!parentDirectoryFound) {
    parentDirectoryPath = normalize(parentDirectoryPath + '/..')
    parentDirectoryFound = existsSync(parentDirectoryPath)
  }

  return parentDirectoryPath !== '.' ? parentDirectoryPath : ''
}

const getFileSize = fileSize.partial({ base: 2 })

export {
  showItemInFolder,
  searchForExecutableOnPath,
  getShellPath,
  getFirstExistingParentPath,
  getFileSize
}
