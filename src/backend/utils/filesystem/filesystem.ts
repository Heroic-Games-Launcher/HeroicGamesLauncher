import { isWindows } from '../../constants'
import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { shell } from 'electron'
import fileSize from 'filesize'
import { existsSync } from 'graceful-fs'
import { basename, join, normalize } from 'path'
import { execAsync, spawnAsync } from '../process/process'
import { GameInfo } from 'common/types'
import { sendFrontendMessage } from 'backend/main_window'

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

export async function moveOnWindows(
  newInstallPath: string,
  gameInfo: GameInfo
): Promise<
  { status: 'done'; installPath: string } | { status: 'error'; error: string }
> {
  const {
    install: { install_path },
    title
  } = gameInfo

  if (!install_path) {
    return { status: 'error', error: 'No install path found' }
  }

  newInstallPath = join(newInstallPath, basename(install_path))

  let currentFile = ''
  let currentPercent = ''

  // move using robocopy and show progress of the current file being copied
  const { code, stderr } = await spawnAsync(
    'robocopy',
    [install_path, newInstallPath, '/MOVE', '/MIR'],
    { stdio: 'pipe' },
    (data) => {
      data = data.replaceAll(/\s/g, ' ')

      const match = data.split(' ').filter(Boolean)
      // current percentage
      const percent = match.filter((m) => m.includes('%'))[0]
      // current file
      const file = match[match.length - 1]
      if (percent) {
        currentPercent = percent
      }

      if (file && file.includes('.') && !file.includes('%')) {
        currentPercent = '0%'
        currentFile = file
      }

      if (match) {
        sendFrontendMessage(`progressUpdate-${gameInfo.app_name}`, {
          appName: gameInfo.app_name,
          runner: gameInfo.runner,
          status: 'moving',
          progress: {
            percent: currentPercent,
            file: currentFile
          }
        })
      }
    }
  )
  if (code !== 0) {
    logInfo(`Finished Moving ${title}`, LogPrefix.Backend)
  } else {
    logError(`Error: ${stderr}`, LogPrefix.Backend)
  }
  return { status: 'done', installPath: newInstallPath }
}

export async function moveOnUnix(
  newInstallPath: string,
  gameInfo: GameInfo
): Promise<
  { status: 'done'; installPath: string } | { status: 'error'; error: string }
> {
  const {
    install: { install_path },
    title
  } = gameInfo
  if (!install_path) {
    return { status: 'error', error: 'No install path found' }
  }

  const destination = join(newInstallPath, basename(install_path))

  let currentFile = ''
  let currentPercent = ''

  let rsyncExists = false
  try {
    await execAsync('which rsync')
    rsyncExists = true
  } catch (error) {
    logError(error, LogPrefix.Gog)
  }
  if (rsyncExists) {
    const origin = install_path + '/'
    logInfo(
      `moving command: rsync -az --progress ${origin} ${destination} `,
      LogPrefix.Backend
    )
    const { code, stderr } = await spawnAsync(
      'rsync',
      ['-az', '--progress', origin, destination],
      { stdio: 'pipe' },
      (data) => {
        const split =
          data
            .split('\n')
            .find((d) => d.includes('/') && !d.includes('%'))
            ?.split('/') || []
        const file = split.at(-1) || ''

        if (file) {
          currentFile = file
        }

        const percent = data.match(/(\d+)%/)
        if (percent) {
          currentPercent = percent[0]
          sendFrontendMessage(`progressUpdate-${gameInfo.app_name}`, {
            appName: gameInfo.app_name,
            runner: gameInfo.runner,
            status: 'moving',
            progress: {
              percent: currentPercent,
              file: currentFile
            }
          })
        }
      }
    )
    if (code !== 1) {
      logInfo(`Finished Moving ${title}`, LogPrefix.Backend)
      // remove the old install path
      await spawnAsync('rm', ['-rf', install_path])
    } else {
      logError(`Error: ${stderr}`, LogPrefix.Backend)
      return { status: 'error', error: stderr }
    }
  } else {
    const { code, stderr } = await spawnAsync('mv', [
      '-f',
      install_path,
      destination
    ])
    if (code !== 1) {
      return { status: 'done', installPath: destination }
    } else {
      logError(`Error: ${stderr}`, LogPrefix.Backend)
      return { status: 'error', error: stderr }
    }
  }
  return { status: 'done', installPath: destination }
}

export {
  showItemInFolder,
  searchForExecutableOnPath,
  getShellPath,
  getFirstExistingParentPath,
  getFileSize
}
