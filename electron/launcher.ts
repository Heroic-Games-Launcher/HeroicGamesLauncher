import { app, BrowserWindow } from 'electron'
// This handles launching games, prefix creation etc..

import i18next from 'i18next'
import {
  existsSync,
  mkdirSync,
  appendFileSync,
  writeFileSync
} from 'graceful-fs'
import { join } from 'path'

import {
  configStore,
  flatPakHome,
  isLinux,
  isMac,
  isWindows,
  runtimePath,
  tsStore,
  userHome
} from './constants'
import {
  constructAndUpdateRPC,
  execAsync,
  getSteamRuntime,
  isEpicServiceOffline,
  isOnline,
  showErrorBoxModalAuto,
  searchForExecutableOnPath,
  quoteIfNecessary,
  errorHandler,
  removeQuoteIfNecessary,
  getSystemInfo
} from './utils'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from './logger/logger'
import { GlobalConfig } from './config'
import { GameConfig } from './game_config'
import { DXVK } from './tools'
import setup from './gog/setup'
import { GOGGame } from 'gog/games'
import { LegendaryGame } from 'legendary/games'
import {
  CallRunnerOptions,
  Runner,
  EnviromentVariable,
  WrapperVariable,
  ExecResult,
  GameSettings,
  LaunchPreperationResult,
  RpcClient,
  RecentGame
} from './types'
import { spawn } from 'child_process'
import shlex from 'shlex'
import { Game } from './games'

/**
 * Runs `Game.launch` and catches errors
 * @returns True on success, False on failure
 */
async function wrappedLaunch(
  appName: string,
  runner: Runner,
  launchArguments: string,
  mainWindow: BrowserWindow
) {
  const game = Game.get(appName, runner)
  return game.launch(launchArguments, mainWindow).catch((exception: Error) => {
    logError(exception.stack, LogPrefix.Backend)
    appendFileSync(
      game.logFileLocation,
      `An exception occurred when launching the game:\n${exception.stack}`
    )
    mainWindow.webContents.send('setGameStatus', {
      appName: game.appName,
      runner,
      status: 'done'
    })
    return false
  })
}

/**
 * Takes care of a lot of pre-launch tasks
 * @param game The game that is about to be launched
 * @param mainWindow Our main window. Gets obtained from BrowserWindow if not specified
 * @returns
 */
async function prepareLaunch(
  game: LegendaryGame | GOGGame,
  mainWindow?: BrowserWindow
): Promise<LaunchPreperationResult> {
  const gameSettings = await game.getSettings()
  const gameInfo = game.getGameInfo()
  const globalSettings = await GlobalConfig.get().getSettings()
  mainWindow = mainWindow ?? BrowserWindow.getAllWindows()[0]

  logInfo(`Launching ${gameInfo.title} (${game.appName})`, LogPrefix.Backend)

  mainWindow.webContents.send('setGameStatus', {
    appName: game.appName,
    runner: gameInfo.runner,
    status: 'playing'
  })

  // Update recently played games
  const recentGames =
    (configStore.get('games.recent') as Array<RecentGame>) || []
  const newRecentGames = recentGames.filter(
    (a) => a.appName && a.appName !== game.appName
  )
  newRecentGames.unshift({ appName: game.appName, title: gameInfo.title })
  const maxRecentGames = globalSettings.maxRecentGames || 5
  newRecentGames.length = Math.min(maxRecentGames, newRecentGames.length)
  configStore.set('games.recent', newRecentGames)

  if (globalSettings.minimizeOnLaunch) {
    mainWindow.hide()
  }

  const startPlayingDate = new Date()
  if (!tsStore.has(game.appName)) {
    tsStore.set(`${game.appName}.firstPlayed`, startPlayingDate)
  }

  // Write initial log file
  const systemInfo = await getSystemInfo()
  const gameSettingsString = JSON.stringify(
    await game.getSettings(),
    null,
    '\t'
  )
  writeFileSync(
    game.logFileLocation,
    'System Info:\n' +
      `${systemInfo}\n` +
      '\n' +
      `Game Settings: ${gameSettingsString}\n` +
      '\n' +
      `Game launched at: ${startPlayingDate}\n` +
      '\n'
  )

  // Check if the game needs an internet connection
  // If the game can run offline just fine, we don't have to check anything
  if (!gameInfo.canRunOffline) {
    // If either we or Epic's servers are offline, we can't reach Epic
    const epicNonReachable = !isOnline() || (await isEpicServiceOffline())
    // If the game is configured to use offline mode or Epic isn't reachable, but the game can't run offline, we can't launch
    if (gameSettings.offlineMode || epicNonReachable) {
      showErrorBoxModalAuto(
        i18next.t(
          'box.error.no-offline-mode.title',
          'Offline mode not supported.'
        ),
        i18next.t(
          'box.error.no-offline-mode.message',
          'Launch aborted! The game requires a internet connection to run it.'
        )
      )
      return {
        success: false,
        failureReason: 'Offline mode not supported'
      }
    }
  }

  // Update Discord RPC if enabled
  let rpcClient = null
  if (globalSettings.discordRPC) {
    rpcClient = constructAndUpdateRPC(gameInfo.title)
  }

  // If we're not on Linux, we can return here
  if (!isLinux) {
    return { success: true, rpcClient: rpcClient }
  }

  // Figure out where MangoHud/GameMode are located, if they're enabled
  let mangoHudCommand: string[] = []
  let gameModeBin = ''
  if (gameSettings.showMangohud) {
    const mangoHudBin = await searchForExecutableOnPath('mangohud')
    if (!mangoHudBin) {
      return {
        success: false,
        failureReason:
          'Mangohud is enabled, but `mangohud` executable could not be found on $PATH'
      }
    } else {
      mangoHudCommand = [mangoHudBin, '--dlsym']
    }
  }
  if (gameSettings.useGameMode) {
    gameModeBin = await searchForExecutableOnPath('gamemoderun')
    if (!gameModeBin) {
      return {
        success: false,
        failureReason:
          'GameMode is enabled, but `gamemoderun` executable could not be found on $PATH'
      }
    }
  }

  // If the Steam Runtime is enabled, find a valid one
  let steamRuntime: string[] = []
  // Don't enable the runtime for non-native games when not using Proton
  // NOTE: This limitation is a little arbitrary, I don't think anything prevents
  //       Wine from running in the Steam Runtime
  const shouldUseRuntime =
    gameSettings.useSteamRuntime &&
    (game.isNative() || gameSettings.wineVersion.type === 'proton')
  if (shouldUseRuntime) {
    // for native games lets use scout for now
    const runtimeType = game.isNative() ? 'scout' : 'soldier'
    const { path, args } = await getSteamRuntime(runtimeType)
    if (!path) {
      return {
        success: false,
        failureReason:
          'Steam Runtime is enabled, but no runtimes could be found'
      }
    }
    steamRuntime = [path, ...args]
  }

  return {
    success: true,
    rpcClient,
    mangoHudCommand,
    gameModeBin,
    steamRuntime,
    startPlayingDate
  }
}

async function prepareWineLaunch(game: LegendaryGame | GOGGame): Promise<{
  success: boolean
  failureReason?: string
  envVars?: Record<string, string>
}> {
  const gameSettings =
    GameConfig.get(game.appName).config ||
    (await GameConfig.get(game.appName).getSettings())

  // Verify that a Wine binary is set
  // This happens when there aren't any Wine versions installed
  if (!gameSettings.wineVersion.bin) {
    showErrorBoxModalAuto(
      i18next.t('box.error.wine-not-found.title', 'Wine Not Found'),
      i18next.t(
        'box.error.wine-not-found.message',
        'No Wine Version Selected. Check Game Settings!'
      )
    )
    return { success: false, failureReason: 'No Wine version selected' }
  }

  // Log warning about Proton
  if (gameSettings.wineVersion.type === 'proton') {
    logWarning(
      'You are using Proton, this can lead to some bugs. Please do not open issues with bugs related to games',
      LogPrefix.Backend
    )
  }

  // Verify that the CrossOver bottle exists
  if (isMac && gameSettings.wineVersion.type === 'crossover') {
    const bottleExists = existsSync(
      join(
        userHome,
        'Library/Application Support/CrossOver/Bottles',
        gameSettings.wineCrossoverBottle,
        'cxbottle.conf'
      )
    )
    if (!bottleExists) {
      showErrorBoxModalAuto(
        i18next.t(
          'box.error.cx-bottle-not-found.title',
          'CrossOver bottle not found'
        ),
        i18next.t(
          'box.error.cx-bottle-not-found.message',
          `The CrossOver bottle "{{bottle_name}}" does not exist, can't launch!`,
          { bottle_name: gameSettings.wineCrossoverBottle }
        )
      )
      return { success: false, failureReason: "CrossOver bottle doesn't exist" }
    }
  }

  let winePrefixUpdated = false
  try {
    winePrefixUpdated = (await verifyWinePrefix(game)).updated
  } catch (error) {
    const reason = error instanceof Error ? error.message : `${error}`
    return { success: false, failureReason: reason }
  }
  if (winePrefixUpdated) {
    logInfo(
      ['Created/Updated Wineprefix at', gameSettings.winePrefix],
      LogPrefix.Backend
    )
    await setup(game.appName)
  }

  // If DXVK/VKD3D installation is enabled, install it
  if (gameSettings.wineVersion.type === 'wine') {
    if (gameSettings.autoInstallDxvk) {
      await DXVK.installRemove(
        gameSettings.winePrefix,
        gameSettings.wineVersion.bin,
        'dxvk',
        'install'
      )
    }
    if (gameSettings.autoInstallVkd3d) {
      await DXVK.installRemove(
        gameSettings.winePrefix,
        gameSettings.wineVersion.bin,
        'vkd3d',
        'install'
      )
    }
  }

  const { folder_name: installFolderName } = game.getGameInfo()
  const envVars = setupWineEnvVars(gameSettings, installFolderName)

  return { success: true, envVars: envVars }
}

/**
 * Maps general settings to environment variables
 * @param gameSettings The GameSettings to get the environment variables for
 * @returns A big string of environment variables, structured key=value
 */
function setupEnvVars(gameSettings: GameSettings) {
  const ret: Record<string, string> = {}
  if (gameSettings.nvidiaPrime) {
    ret.DRI_PRIME = '1'
    ret.__NV_PRIME_RENDER_OFFLOAD = '1'
    ret.__GLX_VENDOR_LIBRARY_NAME = 'nvidia'
  }
  if (gameSettings.audioFix) {
    ret.PULSE_LATENCY_MSEC = '60'
  }
  if (gameSettings.enviromentOptions) {
    gameSettings.enviromentOptions.forEach((envEntry: EnviromentVariable) => {
      ret[envEntry.key] = removeQuoteIfNecessary(envEntry.value)
    })
  }

  // setup LD_PRELOAD if not defined
  // fixes the std::log_error for Fall Guys
  // thanks to https://github.com/Diyou
  if (!process.env.LD_PRELOAD) {
    ret.LD_PRELOAD = ''
  }

  return ret
}

/**
 * Maps Wine-related settings to environment variables
 * @param gameSettings The GameSettings to get the environment variables for
 * @param gameId If Proton and the Steam Runtime are used, the SteamGameId variable will be set to `heroic-gameId`
 * @returns A Record that can be passed to execAsync/spawn
 */
function setupWineEnvVars(gameSettings: GameSettings, gameId = '0') {
  const { wineVersion, winePrefix, wineCrossoverBottle } = gameSettings

  const ret: Record<string, string> = {}

  // Add WINEPREFIX / STEAM_COMPAT_DATA_PATH / CX_BOTTLE
  const steamInstallPath = join(flatPakHome, '.steam', 'steam')
  switch (wineVersion.type) {
    case 'wine':
      ret.WINEPREFIX = winePrefix
      break
    case 'proton':
      ret.STEAM_COMPAT_CLIENT_INSTALL_PATH = steamInstallPath
      ret.STEAM_COMPAT_DATA_PATH = winePrefix
      break
    case 'crossover':
      ret.CX_BOTTLE = wineCrossoverBottle
  }

  if (gameSettings.showFps) {
    ret.DXVK_HUD = 'fps'
  }
  if (gameSettings.enableFSR) {
    ret.WINE_FULLSCREEN_FSR = '1'
    ret.WINE_FULLSCREEN_FSR_STRENGTH = gameSettings.maxSharpness.toString()
  }
  if (gameSettings.enableEsync) {
    ret.WINEESYNC = '1'
  }
  if (gameSettings.enableFsync) {
    ret.WINEFSYNC = '1'
  }
  if (gameSettings.enableResizableBar) {
    ret.VKD3D_CONFIG = 'upload_hvv'
  }
  if (gameSettings.eacRuntime) {
    ret.PROTON_EAC_RUNTIME = join(runtimePath, 'eac_runtime')
  }
  if (gameSettings.battlEyeRuntime) {
    ret.PROTON_BATTLEYE_RUNTIME = join(runtimePath, 'battleye_runtime')
  }
  if (wineVersion.type === 'proton') {
    // If we don't set this, GE-Proton tries to guess the AppID from the prefix path, which doesn't work in our case
    ret.STEAM_COMPAT_APP_ID = '0'
    ret.SteamAppId = ret.STEAM_COMPAT_APP_ID
    // This sets the name of the log file given when setting PROTON_LOG=1
    ret.SteamGameId = `heroic-${gameId}`
    ret.PROTON_LOG_DIR = flatPakHome

    // Only set WINEDEBUG if PROTON_LOG is set since Proton will also log if just WINEDEBUG is set
    if (
      gameSettings.enviromentOptions.find((env) => env.key === 'PROTON_LOG')
    ) {
      // Stop Proton from overriding WINEDEBUG; this prevents logs growing to a few GB for some games
      ret.WINEDEBUG = 'timestamp'
    }
  }
  if (!gameSettings.preferSystemLibs && wineVersion.type === 'wine') {
    if (wineVersion.lib32 && wineVersion.lib) {
      // append wine libs at the beginning
      ret.LD_LIBRARY_PATH = [
        wineVersion.lib32,
        wineVersion.lib,
        process.env.LD_LIBRARY_PATH
      ].join(':')
    } else {
      logError(
        [
          `Couldn't find all library folders of ${wineVersion.name}!`,
          `Missing ${wineVersion.lib32} or ${wineVersion.lib}!`,
          `Falling back to system libraries!`
        ].join('\n')
      )
    }
  }
  return ret
}

function setupWrappers(
  gameSettings: GameSettings,
  mangoHudCommand?: string[],
  gameModeBin?: string,
  steamRuntime?: string[]
): Array<string> {
  const wrappers: string[] = []

  const wrapperOptions = gameSettings.wrapperOptions || []
  wrapperOptions.forEach((wrapperEntry: WrapperVariable) => {
    wrappers.push(wrapperEntry.exe)
    wrappers.push(...shlex.split(wrapperEntry.args ?? ''))
  })

  if (!isWindows) {
    // We don't need to check game settings here since
    // the strings will be '' / arrays will be empty if the
    // respective option is disabled
    wrappers.push(...mangoHudCommand)
    wrappers.push(gameModeBin)
    wrappers.push(...steamRuntime)
  }

  return wrappers.filter((n) => n)
}

/**
 * Verifies that a Wineprefix exists by running 'wineboot --init'
 * @param game The game to verify the Wineprefix of
 * @returns stderr & stdout of 'wineboot --init'
 */
export async function verifyWinePrefix(
  game: LegendaryGame | GOGGame
): Promise<{ res: ExecResult; updated: boolean }> {
  const { winePrefix, wineVersion } = await game.getSettings()

  if (wineVersion.type === 'crossover') {
    return { res: { stdout: '', stderr: '' }, updated: false }
  }

  if (!existsSync(winePrefix)) {
    mkdirSync(winePrefix, { recursive: true })
  }

  if (wineVersion.type === 'proton' && existsSync(join(winePrefix, 'pfx'))) {
    return { res: { stdout: '', stderr: '' }, updated: false }
  }

  // If the registry isn't available yet, things like DXVK installers might fail. So we have to wait on wineboot then
  const systemRegPath =
    wineVersion.type === 'proton'
      ? join(winePrefix, 'pfx', 'system.reg')
      : join(winePrefix, 'system.reg')
  const haveToWait = !existsSync(systemRegPath)

  return game
    .runWineCommand('wineboot --init', haveToWait)
    .then((result) => {
      if (wineVersion.type === 'proton') {
        return { res: result, updated: true }
      }
      // This is kinda hacky
      const wasUpdated = result.stderr.includes('has been updated')
      return { res: result, updated: wasUpdated }
    })
    .catch((error) => {
      logError(['Unable to create Wineprefix: ', `${error}`], LogPrefix.Backend)
      throw error
    })
}

async function launchCleanup(
  game: Game,
  rpcClient: RpcClient,
  startPlayingDate: Date,
  mainWindow?: BrowserWindow
) {
  if (rpcClient) {
    rpcClient.disconnect()
    logInfo('Stopped Discord Rich Presence', LogPrefix.Backend)
  }

  // Update playtime and last played date
  const finishedPlayingDate = new Date()
  tsStore.set(`${game.appName}.lastPlayed`, finishedPlayingDate)
  // Playtime of this session in minutes
  const sessionPlaytime =
    (finishedPlayingDate.getTime() - startPlayingDate.getTime()) / 1000 / 60
  let totalPlaytime = sessionPlaytime
  if (tsStore.has(`${game.appName}.totalPlayed`)) {
    totalPlaytime += tsStore.get(`${game.appName}.totalPlayed`) as number
  }
  tsStore.set(`${game.appName}.totalPlayed`, Math.floor(totalPlaytime))

  mainWindow = mainWindow ?? BrowserWindow.getAllWindows()[0]
  const { minimizeOnLaunch } = await GlobalConfig.get().getSettings()
  if (minimizeOnLaunch) {
    mainWindow.show()
  }

  const { runner } = game.getGameInfo()
  mainWindow.webContents.send('setGameStatus', {
    appName: game.appName,
    runner,
    status: 'done'
  })

  // Exit if we've been launched without UI
  if (process.argv.includes('--no-gui')) {
    app.exit()
  }
}
async function runWineCommand(
  game: Game,
  command: string,
  wait: boolean,
  forceRunInPrefixVerb = false
) {
  const gameSettings = await game.getSettings()
  const { folder_name: installFolderName } = game.getGameInfo()

  const { wineVersion } = gameSettings

  const env_vars = {
    ...process.env,
    ...setupEnvVars(gameSettings),
    ...setupWineEnvVars(gameSettings, installFolderName)
  }

  let additional_command = ''
  if (wineVersion.type === 'proton') {
    if (forceRunInPrefixVerb) {
      command = 'runinprefix ' + command
    } else if (wait) {
      command = 'waitforexitandrun ' + command
    } else {
      command = 'run ' + command
    }
    // TODO: Use Steamruntime here in the future
  } else {
    // Can't wait if we don't have a Wineserver
    if (wait) {
      if (wineVersion.wineserver) {
        additional_command = `"${wineVersion.wineserver}" --wait`
      } else {
        logWarning(
          'Unable to wait on Wine command, no Wineserver!',
          LogPrefix.Backend
        )
      }
    }
  }

  const wineBin = wineVersion.bin.replaceAll("'", '')
  let finalCommand = `"${wineBin}" ${command}`
  if (additional_command) {
    finalCommand += ` && ${additional_command}`
  }

  logDebug(['Running Wine command:', finalCommand], LogPrefix.Legendary)
  return execAsync(finalCommand, { env: env_vars })
    .then((response) => {
      logDebug(['Ran Wine command:', finalCommand], LogPrefix.Legendary)
      return response
    })
    .catch((error) => {
      // error might not always be a string
      logError(['Error running Wine command:', `${error}`], LogPrefix.Backend)
      throw error
    })
}

interface RunnerProps {
  name: Runner
  logPrefix: LogPrefix
  bin: string
  dir: string
}

async function callRunner(
  commandParts: string[],
  runner: RunnerProps,
  options?: CallRunnerOptions
): Promise<ExecResult> {
  const fullRunnerPath = join(runner.dir, runner.bin)
  const appName = commandParts[commandParts.findIndex(() => 'launch') + 1]

  // Necessary to get rid of possible undefined or null entries, else
  // TypeError is triggered
  commandParts = commandParts.filter(Boolean)

  const safeCommand = getRunnerCallWithoutCredentials(
    [...commandParts],
    options?.env,
    options?.wrappers,
    fullRunnerPath
  )

  logInfo(
    [(options?.logMessagePrefix ?? `Running command`) + ':', safeCommand],
    runner.logPrefix
  )

  if (options?.logFile) {
    logDebug(`Logging to file "${options?.logFile}"`, runner.logPrefix)
  }

  if (existsSync(options?.logFile)) {
    writeFileSync(options.logFile, '')
  }

  // If we have wrappers (things we want to run before the command), set bin to the first wrapper
  // and add every other wrapper and the actual bin to the start of filteredArgs
  const wrappers = options?.wrappers || []
  let bin = ''
  if (wrappers.length) {
    bin = wrappers.shift()
    commandParts.unshift(...wrappers, runner.bin)
  } else {
    bin = runner.bin
  }

  return new Promise((res, rej) => {
    const child = spawn(bin, commandParts, {
      cwd: runner.dir,
      env: { ...process.env, ...options?.env }
    })

    const stdout: string[] = []
    const stderr: string[] = []

    child.stdout.on('data', (data: Buffer) => {
      if (options?.logFile) {
        appendFileSync(options.logFile, data.toString())
      }

      if (options?.onOutput) {
        options.onOutput(data.toString(), child)
      }

      stdout.push(data.toString().trim())
    })

    child.stderr.on('data', (data: Buffer) => {
      if (options?.logFile) {
        appendFileSync(options.logFile, data.toString())
      }

      if (options?.onOutput) {
        options.onOutput(data.toString(), child)
      }

      stderr.push(data.toString().trim())
    })

    child.on('close', (code, signal) => {
      errorHandler({
        error: `${stdout.join().concat(stderr.join())}`,
        logPath: options?.logFile,
        runner: runner.name,
        appName
      })

      if (signal && !child.killed) {
        rej('Process terminated with signal ' + signal)
      }

      res({
        stdout: stdout.join('\n'),
        stderr: stderr.join('\n')
      })
    })

    child.on('error', (error) => {
      rej(error)
    })
  })
    .then(({ stdout, stderr }) => {
      return { stdout, stderr, fullCommand: safeCommand }
    })
    .catch((error) => {
      errorHandler({
        error: `${error}`,
        logPath: options?.logFile,
        runner: runner.name,
        appName
      })

      const showDialog =
        !`${error}`.includes('signal') &&
        !`${error}`.includes('appears to be deleted')

      logError(
        ['Error running', 'command', `"${safeCommand}": ${error}`],
        runner.logPrefix,
        showDialog
      )

      return { stdout: '', stderr: `${error}`, fullCommand: safeCommand, error }
    })
}

/**
 * Generates a formatted, safe command that can be logged
 * @param commandParts The runner command that's executed, e. g. install, list, etc.
 * Note that this will be modified, so pass a copy of your actual command parts
 * @param env Enviroment variables to use
 * @param wrappers Wrappers to use (gamemode, steam runtime, etc.)
 * @param runnerPath The full path to the runner executable
 * @returns
 */
function getRunnerCallWithoutCredentials(
  commandParts: string[],
  env: Record<string, string> = {},
  wrappers: string[] = [],
  runnerPath: string
): string {
  const commandArguments = Object.assign([], commandParts)
  // Redact sensitive arguments (SID for Legendary, token for GOGDL)
  for (const sensitiveArg of ['--sid', '--token']) {
    const sensitiveArgIndex = commandArguments.indexOf(sensitiveArg)
    if (sensitiveArgIndex === -1) {
      continue
    }
    commandArguments[sensitiveArgIndex + 1] = '<redacted>'
  }

  const formattedEnvVars: string[] = []
  for (const [key, value] of Object.entries(env)) {
    // Only add variables if they aren't already defined in our own env
    if (key in process.env) {
      if (value === process.env[key]) {
        continue
      }
    }
    formattedEnvVars.push(`${key}=${quoteIfNecessary(value)}`)
  }

  commandParts = commandParts.filter(Boolean)

  return [
    ...formattedEnvVars,
    ...wrappers.map(quoteIfNecessary),
    quoteIfNecessary(runnerPath),
    ...commandArguments.map(quoteIfNecessary)
  ].join(' ')
}

export {
  prepareLaunch,
  launchCleanup,
  prepareWineLaunch,
  setupEnvVars,
  setupWineEnvVars,
  setupWrappers,
  runWineCommand,
  callRunner,
  getRunnerCallWithoutCredentials,
  wrappedLaunch
}
