import { getAppDataDirectory, getProgramfilesDirectory } from 'backend/launcher'
import {
  getRunnerLogWriter,
  logError,
  logInfo,
  LogPrefix
} from 'backend/logger'
import { checkWineBeforeLaunch, sendProgressUpdate } from 'backend/utils'
import { GameInfo } from 'common/types'
import path from 'path'
import { findAllFiles, findMainGameExecutable } from './downloader'
import { getSettings } from './games'
import { runSetupCommand } from '../storeManagerCommon/games'
import * as fs from 'fs'
import { isWindows } from 'backend/constants/environment'
/**
 * Handles setup instructions like create folders, move files, run exe, create registry entry etc...
 * For Galaxy games only (Windows)
 * As long as wine menu builder is disabled we shouldn't have trash application
 * menu entries
 * @param appName
 * @param installInfo Allows passing install instructions directly
 */
export async function setup(gameInfo: GameInfo): Promise<void> {
  const gameSettings = await getSettings(gameInfo.app_name)
  const isWineOkToLaunch = await checkWineBeforeLaunch(
    gameInfo,
    gameSettings,
    getRunnerLogWriter('humble-bundle')
  )

  if (!isWineOkToLaunch) {
    logError(
      `Was not possible to run setup using ${gameSettings.wineVersion.name}`,
      LogPrefix.Backend
    )
    return
  }

  logInfo('Setup: Finished', LogPrefix.HumbleBundle)
}

export async function getGameExecutableFromShortcuts(gameInfo: GameInfo) {
  const appData = await getAppDataDirectory(gameInfo.app_name)
  const startIconMenuDirectory = isWindows ? 'C:\ProgramData\Microsoft\Windows\Start Menu': `${(await getSettings(gameInfo.app_name)).winePrefix}/drive_c/ProgramData/Microsoft/Windows/Start Menu/`

  return await findMainGameExecutable(
    gameInfo,
    [
      appData,
      startIconMenuDirectory
    ],
    '.lnk'
  )
}

export async function getGameExecutableFromProgramFiles(gameInfo: GameInfo) {
  const programFiles = await getProgramfilesDirectory(gameInfo.app_name)

  return await findMainGameExecutable(gameInfo, programFiles, '.exe')
}

type InstallerType =
  | 'InnoSetup'
  | 'InstallShield'
  | 'Nullsoft'
  | 'UnknownInstaller'

export const silentInstallOption = {
  InnoSetup: ['/silent'],
  InstallShield: ['/s'],
  Nullsoft: ['/S'],
  UnknownInstaller: ['/s']
}

export async function checkIfInstaller(
  filePath: string | null
): Promise<InstallerType | null> {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      return resolve(null)
    }
    const signatures = ['Inno Setup', 'InstallShield', 'Nullsoft'].map((s) =>
      Buffer.from(s, 'ascii')
    )
    const maxSigLen = Math.max(...signatures.map((s) => s.length))

    const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 })
    let prevChunk = Buffer.alloc(0)

    stream.on('data', (chunk: string | Buffer<ArrayBufferLike>) => {
      if (typeof chunk == 'string') {
        chunk = Buffer.from(chunk, 'utf-8')
      }
      const combined = Buffer.concat([prevChunk, chunk])

      if (combined.includes('Inno Setup')) {
        stream.destroy()
        return resolve('InnoSetup')
      } else if (combined.includes('InstallShield')) {
        stream.destroy()
        return resolve('InstallShield')
      } else if (combined.includes('Nullsoft')) {
        stream.destroy()
        return resolve('Nullsoft')
      }

      prevChunk = chunk.slice(-maxSigLen + 1) // keep tail for overlap
    })

    stream.on('error', (err) => reject(err))
    stream.on('close', () => {
      const filename = path.basename(filePath)
      if (filename.includes('setup') || filename.includes('install')) {
        return resolve('UnknownInstaller')
      }
      resolve(null)
    })
  })
}

export async function installAllMSIFiles(
  gameInfo: GameInfo,
  directory: string
) {
  const files = await findAllFiles(directory, '.msi')
  for (const file of files) {
    sendProgressUpdate({
      appName: gameInfo.app_name,
      runner: 'humble-bundle',
      status: 'installing'
    })
    await runSetupCommand({
      commandParts: ['msiexec', '/i', file, '/passive', '/norestart'],
      gameSettings: await getSettings(gameInfo.app_name),
      wait: true,
      protonVerb: 'run',
      gameInstallPath: gameInfo.install.install_path,
      startFolder: gameInfo.install.install_path
    })
  }

  return files
}
