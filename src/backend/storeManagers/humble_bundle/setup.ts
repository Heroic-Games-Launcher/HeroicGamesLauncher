import { GameConfig } from 'backend/game_config'
import {
  getAppDataDirectory,
  getProgramfilesDirectory,
  verifyWinePrefix
} from 'backend/launcher'
import {
  getRunnerLogWriter,
  logError,
  logInfo,
  LogPrefix
} from 'backend/logger'
import { Winetricks } from 'backend/tools'
import {
  checkWineBeforeLaunch,
  getInfo,
  getPathDiskSize,
  sendProgressUpdate
} from 'backend/utils'
import { GameInfo } from 'common/types'
import { readFile } from 'fs/promises'
import { readdir, stat } from 'fs/promises'
import path from 'path'
import { findAllFiles, findMainGameExecutable } from './downloader'
import { getGameInfo, getSettings } from './games'
import { launchGame, runSetupCommand } from '../storeManagerCommon/games'
import * as fs from 'fs'
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

  await verifyWinePrefix(gameSettings)

  logInfo('Setup: Finished', LogPrefix.HumbleBundle)
}

export async function getGameExecutableFromShortcuts(gameInfo: GameInfo) {
  const appData = await getAppDataDirectory(gameInfo.app_name)
  //  const userProfile = path.join(gameInfo.install.install_path!, 'Desktop');

  return await findMainGameExecutable(
    gameInfo,
    [
      appData,
      `${(await getSettings(gameInfo.app_name)).winePrefix}/drive_c/ProgramData/Microsoft/Windows/Start Menu/`
    ],
    '.lnk'
  )
}

export async function getGameExecutableFromProgramFiles(gameInfo: GameInfo) {
  const programFiles = await getProgramfilesDirectory(gameInfo.app_name)

  return await findMainGameExecutable(gameInfo, programFiles, '.exe')
}

export async function checkIfInstaller(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
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

      for (const sig of signatures) {
        if (combined.includes(sig)) {
          stream.destroy() // Stop reading early
          return resolve(true)
        }
      }

      prevChunk = chunk.slice(-maxSigLen + 1) // keep tail for overlap
    })

    stream.on('error', (err) => reject(err))
    stream.on('close', () => resolve(false))
  })
}

export async function installAllMSIFiles(
  gameInfo: GameInfo,
  directory: string
) {
  const files = await findAllFiles(directory, '.msi')
  for (let file of files) {
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
