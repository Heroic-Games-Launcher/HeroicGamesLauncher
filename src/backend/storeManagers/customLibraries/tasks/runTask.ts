import { join } from 'path'
import { existsSync } from 'graceful-fs'
import { logInfo, LogPrefix } from 'backend/logger'
import { spawn } from 'child_process'
import { isLinux, isMac } from 'backend/constants/environment'
import { getSettings, isNative, getGameInfo } from '../games'
import { runWineCommand } from 'backend/launcher'
import { RunTask } from 'backend/storeManagers/customLibraries/tasks/types'

export async function executeRunTask(
  appName: string,
  task: RunTask,
  gameFolder: string
): Promise<void> {
  const executablePath = join(gameFolder, task.executable)

  if (!existsSync(executablePath)) {
    throw new Error(`Executable not found: ${executablePath}`)
  }

  const gameInfo = getGameInfo(appName)
  const requiresWine =
    !isNative(appName) && gameInfo.install.platform === 'windows'
  const args = substituteVariables(task.args || [], gameFolder)

  logInfo(`Running: ${task.executable} (Started)`, LogPrefix.CustomLibrary)

  if (requiresWine) {
    logInfo(
      `Running in Wine: ${[executablePath, ...args].join(' ')}`,
      LogPrefix.CustomLibrary
    )

    const gameSettings = await getSettings(appName)
    const result = await runWineCommand({
      gameSettings,
      commandParts: [executablePath, ...args],
      wait: true,
      gameInstallPath: gameFolder,
      startFolder: gameFolder
    })

    if (result.code !== 0) {
      throw new Error(
        `Wine execution failed with code ${result.code}: ${result.stderr}`
      )
    }
  } else {
    // Make executable on Unix systems
    if (isLinux || isMac) {
      await makeExecutable(executablePath)
    }

    await new Promise<void>((resolve, reject) => {
      const powershellArgs = [
        '-Command',
        [
          'Start-Process',
          '-Wait',
          `"${executablePath}"`,
          args.length ? `-ArgumentList '${args.join("','")}'` : '',
          '-WorkingDirectory',
          `"${gameFolder}"`,
          '-Verb',
          'RunAs'
        ]
          .filter(Boolean)
          .join(' ')
      ]
      const process = spawn('powershell', powershellArgs, { stdio: 'inherit' })

      process.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Process failed with code ${code}`))
        }
      })

      process.on('error', (error) => {
        reject(new Error(`Process failed: ${error.message}`))
      })
    })
  }

  logInfo(`Running: ${task.executable} (Done)`, LogPrefix.CustomLibrary)
}

function substituteVariables(args: string[], gameFolder: string): string[] {
  return args.map((arg) => arg.replace(/{gameFolder}/g, gameFolder))
}

async function makeExecutable(executablePath: string): Promise<void> {
  if (isLinux || isMac) {
    await new Promise<void>((resolve, reject) => {
      const chmod = spawn('chmod', ['+x', executablePath])
      chmod.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`chmod failed with code ${code}`))
      })
      chmod.on('error', reject)
    })
  }
}
