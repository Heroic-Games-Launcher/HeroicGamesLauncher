import { existsSync } from 'fs'
import path from 'path'

import { logError, logInfo, LogPrefix } from '../logger'
import { sendFrontendMessage } from '../ipc'
import { runWineCommandOnGame } from '../tools'
import { getGame } from '../utils'
import { isAccessibleWithinFlatpakSandbox } from '../utils/filesystem'
import { Path } from '../schemas'
import { sendGameStatusUpdate } from '../utils'
import { createGameLogWriter } from '../logger'
import { addRecentGame } from '../recent_games/recent_games'
import { tsStore } from '../constants/key_value_stores'
import {
  launchCleanup,
  runBeforeLaunchScript,
  runAfterLaunchScript
} from '../launcher'

import type { Runner } from 'common/types'

async function launchExe(
  exePath: string,
  appName: string,
  runner: Runner
): Promise<void> {
  const game = getGame(appName, runner)
  if (game.isNative()) {
    logError(
      ['Attempted to run an executable on native game', game],
      LogPrefix.Backend
    )
    return
  }

  logInfo(
    ['Launching', exePath, 'in prefix of', game.getGameInfo().title],
    LogPrefix.Backend
  )

  const gameInfo = game.getGameInfo()
  const gameSettings = await game.getSettings()

  sendGameStatusUpdate({ appName, runner, status: 'launching' })

  const logWriter = await createGameLogWriter(appName, runner)
  const startPlayingDate = new Date()

  if (!tsStore.has(appName)) {
    tsStore.set(`${appName}.firstPlayed`, startPlayingDate.toISOString())
  }

  await runBeforeLaunchScript(gameInfo, gameSettings, logWriter)

  try {
    await runWineCommandOnGame(runner, appName, {
      commandParts: [exePath],
      protonVerb: 'waitforexitandrun',
      startFolder: path.dirname(exePath),
      options: { logWriters: [logWriter] }
    })
  } finally {
    await runAfterLaunchScript(gameInfo, gameSettings, logWriter)

    const finishedPlayingDate = new Date()
    tsStore.set(`${appName}.lastPlayed`, finishedPlayingDate.toISOString())
    const sessionPlaytime =
      (finishedPlayingDate.getTime() - startPlayingDate.getTime()) / 1000 / 60
    const totalPlaytime =
      sessionPlaytime + tsStore.get(`${appName}.totalPlayed`, 0)
    tsStore.set(`${appName}.totalPlayed`, Math.floor(totalPlaytime))

    await addRecentGame(gameInfo)
    await logWriter.close()

    sendGameStatusUpdate({ appName, runner, status: 'done' })
    launchCleanup()
  }
}

function findExeInArgs(args: string[], workingDirectory?: string): Path | null {
  workingDirectory ??= process.cwd()

  for (const arg of args) {
    let exePath: string | null = null

    try {
      // Try resolving file: URI first
      const url = new URL(decodeURIComponent(arg))
      if (url.protocol === 'file:') exePath = url.pathname
    } catch {
      exePath = arg
    }

    // Resolve relative path
    if (exePath)
      exePath = path.isAbsolute(exePath)
        ? exePath
        : path.join(workingDirectory, exePath)

    const windowsExecutableExtensions = ['.exe', '.msi', '.bat']
    const parsed = Path.safeParse(exePath)
    const isValid =
      parsed.success &&
      existsSync(parsed.data) &&
      windowsExecutableExtensions.includes(
        path.parse(parsed.data).ext.toLowerCase()
      )

    if (isValid) {
      logInfo(['Detected executable in args:', parsed.data], LogPrefix.Backend)
      return parsed.data
    }
  }
  return null
}

function handleExeFile(exePath: Path): boolean {
  if (process.platform === 'win32') return false
  return sendFrontendMessage(
    'exe_handler.showExeFilePicker',
    exePath,
    !isAccessibleWithinFlatpakSandbox(exePath)
  )
}

export { launchExe, findExeInArgs, handleExeFile }
