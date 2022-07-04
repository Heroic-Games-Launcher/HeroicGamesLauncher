// This handles launching games, prefix creation etc..

import i18next from 'i18next'
import {
  existsSync,
  mkdirSync,
  appendFileSync,
  writeFileSync
} from 'graceful-fs'
import { join } from 'path'

import { flatPakHome, isLinux, isMac, userHome } from './constants'
import {
  constructAndUpdateRPC,
  execAsync,
  getSteamRuntime,
  isEpicServiceOffline,
  isOnline,
  showErrorBoxModalAuto,
  searchForExecutableOnPath,
  quoteIfNecessary,
  errorHandler
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
import { CallRunnerOptions, GameInfo, Runner } from './types'
import {
  ExecResult,
  GameSettings,
  LaunchPreperationResult,
  RpcClient,
  WineInstallation
} from './types'
import { spawn } from 'child_process'

async function prepareLaunch(
  game: LegendaryGame | GOGGame,
  gameInfo: GameInfo
): Promise<LaunchPreperationResult> {
  const gameSettings =
    GameConfig.get(game.appName).config ||
    (await GameConfig.get(game.appName).getSettings())
  const globalSettings = await GlobalConfig.get().getSettings()

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
  let mangoHudCommand = ''
  let gameModeBin = ''
  if (gameSettings.showMangohud) {
    const mangoHudBin = await searchForExecutableOnPath('mangohud')
    if (!mangoHudBin) {
      logWarning('MangoHud enabled but not installed', LogPrefix.Backend)
      // Should we display an error box and return { success: false } here?
    } else {
      mangoHudCommand = `${mangoHudBin} --dlsym`
    }
  }
  if (gameSettings.useGameMode) {
    gameModeBin = await searchForExecutableOnPath('gamemoderun')
    if (!gameModeBin) {
      logWarning('GameMode enabled but not installed', LogPrefix.Backend)
    }
  }

  // If the Steam Runtime is enabled, find a valid one
  let steamRuntime = ''
  const isLinuxNative =
    gameInfo?.install?.platform &&
    gameInfo?.install?.platform.toLowerCase() === 'linux'

  if (gameSettings.useSteamRuntime && isLinuxNative) {
    // for native games lets use scout for now
    const runtime = getSteamRuntime('scout')
    if (!runtime.path) {
      logWarning(`Couldn't find a valid Steam runtime path`, LogPrefix.Backend)
    } else {
      logInfo(`Using ${runtime.type} Steam runtime`, LogPrefix.Backend)
      steamRuntime =
        runtime.version === 'soldier' ? `${runtime.path} -- ` : runtime.path
    }
  }

  return {
    success: true,
    rpcClient,
    mangoHudCommand,
    gameModeBin,
    steamRuntime
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
    return { success: false }
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
      return { success: false }
    }
  }

  const { updated: winePrefixUpdated } = await verifyWinePrefix(game)
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
        'backup'
      )
    }
    if (gameSettings.autoInstallVkd3d) {
      await DXVK.installRemove(
        gameSettings.winePrefix,
        gameSettings.wineVersion.bin,
        'vkd3d',
        'backup'
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
  if (gameSettings.otherOptions) {
    gameSettings.otherOptions
      .split(' ')
      .filter((val) => val.indexOf('=') !== -1)
      .forEach((envKeyAndVar) => {
        const keyAndValueSplit = envKeyAndVar.split('=')
        const key = keyAndValueSplit.shift()
        const value = keyAndValueSplit.join('=')
        ret[key] = value
      })
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
  const { wineVersion } = gameSettings

  // Add WINEPREFIX / STEAM_COMPAT_DATA_PATH / CX_BOTTLE
  const ret: Record<string, string> = {
    ...getWineEnvSetup(
      wineVersion,
      gameSettings.winePrefix,
      gameSettings.wineCrossoverBottle
    )
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
  if (wineVersion.type === 'proton') {
    // If we don't set this, GE-Proton tries to guess the AppID from the prefix path, which doesn't work in our case
    ret.STEAM_COMPAT_APP_ID = '0'
    ret.SteamAppId = ret.STEAM_COMPAT_APP_ID
    // This sets the name of the log file given when setting PROTON_LOG=1
    ret.SteamGameId = `heroic-${gameId}`
    ret.PROTON_LOG_DIR = flatPakHome

    // Only set WINEDEBUG if PROTON_LOG is set since Proton will also log if just WINEDEBUG is set
    if (gameSettings.otherOptions.includes('PROTON_LOG=')) {
      // Stop Proton from overriding WINEDEBUG; this prevents logs growing to a few GB for some games
      ret.WINEDEBUG = 'timestamp'
    }
  }
  return ret
}

function setupWrappers(
  gameSettings: GameSettings,
  mangoHudBin: string,
  gameModeBin: string,
  steamRuntime: string
): Array<string> {
  const wrappers = Array<string>()
  // Wrappers could be specified in the environment variable section as well
  if (gameSettings.otherOptions) {
    gameSettings.otherOptions
      .split(' ')
      .filter((val) => val.indexOf('=') === -1)
      .forEach((val) => {
        wrappers.push(val)
      })
  }
  if (gameSettings.showMangohud) {
    // Mangohud needs some arguments in addition to the command, so we have to split here
    wrappers.push(...mangoHudBin.split(' '))
  }
  if (gameSettings.useGameMode) {
    wrappers.push(gameModeBin)
  }
  if (gameSettings.useSteamRuntime) {
    wrappers.push(steamRuntime)
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
    .runWineCommand('wineboot --init', '', haveToWait)
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
      return { res: { stderr: `${error}`, stdout: '' }, updated: false }
    })
}

/**
 * Returns appropriate environment variables for running a Wine/Proton/CX command
 * @returns The required environment variables
 */
function getWineEnvSetup(
  wineVersion: WineInstallation,
  winePrefix: string,
  cx_bottle?: string
): Record<string, string> {
  const ret: Record<string, string> = {}
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
      ret.CX_BOTTLE = cx_bottle
  }
  return ret
}

function launchCleanup(rpcClient: RpcClient) {
  if (rpcClient) {
    rpcClient.disconnect()
    logInfo('Stopped Discord Rich Presence', LogPrefix.Backend)
  }
}

async function runWineCommand(
  gameSettings: GameSettings,
  command: string,
  altWineBin: string,
  wait: boolean
) {
  const { wineVersion, winePrefix } = gameSettings

  const env_vars = {
    ...process.env,
    ...getWineEnvSetup(wineVersion, winePrefix)
  }

  let additional_command = ''
  let wineBin = wineVersion.bin.replaceAll("'", '')
  if (wineVersion.type === 'proton') {
    command = 'run ' + command
    // TODO: Respect 'wait' here. Not sure if Proton can even do that
    // TODO: Use Steamruntime here in the future
  } else {
    // This is only allowed for Wine since Proton only has one binary (the 'proton' script)
    if (altWineBin) {
      wineBin = altWineBin.replaceAll("'", '')
    }
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
      return { stderr: `${error}`, stdout: '' }
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
    [options?.logMessagePrefix ?? `Running command`, ':', safeCommand],
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
        options.onOutput(data.toString())
      }

      stdout.push(data.toString().trim())
    })

    child.stderr.on('data', (data: Buffer) => {
      if (options?.logFile) {
        appendFileSync(options.logFile, data.toString())
      }

      if (options?.onOutput) {
        options.onOutput(data.toString())
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

      if (signal) {
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
  // Redact sensitive arguments (SID for Legendary, token for GOGDL)
  for (const sensitiveArg of ['--sid', '--token']) {
    const sensitiveArgIndex = commandParts.indexOf(sensitiveArg)
    if (sensitiveArgIndex === -1) {
      continue
    }
    commandParts[sensitiveArgIndex + 1] = '<redacted>'
  }

  const formattedEnvVars: string[] = []
  for (const [key, value] of Object.entries(env)) {
    // Only add variables if they aren't already defined in our own env
    if (key in process.env) {
      if (value === process.env[key]) {
        continue
      }
    }
    formattedEnvVars.push(`${key}=${value}`)
  }

  return [
    ...formattedEnvVars,
    ...wrappers.map(quoteIfNecessary),
    quoteIfNecessary(runnerPath),
    ...commandParts.map(quoteIfNecessary)
  ].join(' ')
}

export {
  prepareLaunch,
  launchCleanup,
  getWineEnvSetup,
  prepareWineLaunch,
  setupEnvVars,
  setupWineEnvVars,
  setupWrappers,
  runWineCommand,
  callRunner
}
