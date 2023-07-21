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
  defaultWinePrefix,
  flatPakHome,
  isLinux,
  isMac,
  runtimePath,
  userHome
} from './constants'
import {
  constructAndUpdateRPC,
  getSteamRuntime,
  isEpicServiceOffline,
  searchForExecutableOnPath,
  quoteIfNecessary,
  errorHandler,
  removeQuoteIfNecessary,
  memoryLog
} from './utils'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logsDisabled,
  logWarning
} from './logger/logger'
import { GlobalConfig } from './config'
import { GameConfig } from './game_config'
import { DXVK } from './tools'
import setup from './storeManagers/gog/setup'
import nileSetup from './storeManagers/nile/setup'
import {
  CallRunnerOptions,
  GameInfo,
  Runner,
  EnviromentVariable,
  WrapperVariable,
  ExecResult,
  GameSettings,
  LaunchPreperationResult,
  RpcClient,
  WineInstallation,
  WineCommandArgs
} from 'common/types'
import { spawn } from 'child_process'
import shlex from 'shlex'
import { isOnline } from './online_monitor'
import { showDialogBoxModalAuto } from './dialog/dialog'
import { setupUbisoftConnect } from './storeManagers/legendary/setup'
import { gameManagerMap } from 'backend/storeManagers'

async function prepareLaunch(
  gameSettings: GameSettings,
  gameInfo: GameInfo,
  isNative: boolean
): Promise<LaunchPreperationResult> {
  const globalSettings = GlobalConfig.get().getSettings()

  const offlineMode =
    gameSettings.offlineMode || !isOnline() || (await isEpicServiceOffline())

  // Check if the game needs an internet connection
  if (!gameInfo.canRunOffline && offlineMode) {
    return {
      success: false,
      failureReason: 'Offline mode not supported'
    }
  }

  // Update Discord RPC if enabled
  let rpcClient = undefined
  if (globalSettings.discordRPC) {
    rpcClient = constructAndUpdateRPC(gameInfo.title)
  }

  // If we're not on Linux, we can return here
  if (!isLinux) {
    return { success: true, rpcClient }
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
  const shouldUseRuntime =
    gameSettings.useSteamRuntime &&
    (isNative || gameSettings.wineVersion.type === 'proton')
  if (shouldUseRuntime) {
    // for native games lets use scout for now
    const runtimeType = isNative ? 'scout' : 'soldier'
    const { path, args } = await getSteamRuntime(runtimeType)
    if (!path) {
      return {
        success: false,
        failureReason:
          'Steam Runtime is enabled, but no runtimes could be found\n' +
          `Make sure Steam ${
            isNative ? 'is' : 'and the "SteamLinuxRuntime - Soldier" are'
          } installed`
      }
    }

    steamRuntime = [
      path,
      isNative || !gameInfo.install['install_path']
        ? ''
        : `--filesystem=${gameInfo.install['install_path']}`,
      ...args
    ]
  }

  return {
    success: true,
    rpcClient,
    mangoHudCommand,
    gameModeBin,
    steamRuntime,
    offlineMode
  }
}

async function prepareWineLaunch(
  runner: Runner,
  appName: string
): Promise<{
  success: boolean
  failureReason?: string
  envVars?: Record<string, string>
}> {
  const gameSettings =
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())

  if (!(await validWine(gameSettings.wineVersion))) {
    const defaultWine = GlobalConfig.get().getSettings().wineVersion
    // now check if the default wine is valid as well
    if (!(await validWine(defaultWine))) {
      return { success: false }
    }
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
      showDialogBoxModalAuto({
        title: i18next.t(
          'box.error.cx-bottle-not-found.title',
          'CrossOver bottle not found'
        ),
        message: i18next.t(
          'box.error.cx-bottle-not-found.message',
          `The CrossOver bottle "{{bottle_name}}" does not exist, can't launch!`,
          { bottle_name: gameSettings.wineCrossoverBottle }
        ),
        type: 'ERROR'
      })
      return { success: false }
    }
  }

  const { updated: winePrefixUpdated } = await verifyWinePrefix(gameSettings)
  if (winePrefixUpdated) {
    logInfo(
      ['Created/Updated Wineprefix at', gameSettings.winePrefix],
      LogPrefix.Backend
    )
    if (runner === 'gog') {
      await setup(appName)
    }
    if (runner === 'nile') {
      await nileSetup(appName)
    }
    if (runner === 'legendary') {
      await setupUbisoftConnect(appName)
    }
  }

  // If DXVK/VKD3D installation is enabled, install it
  if (gameSettings.wineVersion.type === 'wine') {
    if (gameSettings.autoInstallDxvk) {
      await DXVK.installRemove(gameSettings, 'dxvk', 'backup')
    }
    if (gameSettings.autoInstallVkd3d) {
      await DXVK.installRemove(gameSettings, 'vkd3d', 'backup')
    }
  }

  const { folder_name: installFolderName } =
    gameManagerMap[runner].getGameInfo(appName)
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

  if (isMac && gameSettings.showFps) {
    ret.MTL_HUD_ENABLED = '1'
  }

  if (gameSettings.enviromentOptions) {
    gameSettings.enviromentOptions.forEach((envEntry: EnviromentVariable) => {
      ret[envEntry.key] = removeQuoteIfNecessary(envEntry.value)
    })
  }

  // setup LD_PRELOAD if not defined
  // fixes the std::log_error for Fall Guys
  // thanks to https://github.com/Diyou
  if (!process.env.LD_PRELOAD && !ret.LD_PRELOAD) {
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
    case 'wine': {
      ret.WINEPREFIX = winePrefix

      // Disable Winemenubuilder to not mess with file associations
      const wmbDisableString = 'winemenubuilder.exe=d'
      // If the user already set WINEDLLOVERRIDES, append to the end
      const dllOverridesVar = gameSettings.enviromentOptions.find(
        ({ key }) => key.toLowerCase() === 'winedlloverrides'
      )
      if (dllOverridesVar) {
        ret[dllOverridesVar.key] =
          dllOverridesVar.value + ',' + wmbDisableString
      } else {
        ret.WINEDLLOVERRIDES = wmbDisableString
      }

      break
    }
    case 'proton':
      ret.STEAM_COMPAT_CLIENT_INSTALL_PATH = steamInstallPath
      ret.STEAM_COMPAT_DATA_PATH = winePrefix
      break
    case 'crossover':
      ret.CX_BOTTLE = wineCrossoverBottle
  }
  if (gameSettings.showFps) {
    isMac ? (ret.MTL_HUD_ENABLED = '1') : (ret.DXVK_HUD = 'fps')
  }
  if (gameSettings.enableDXVKFpsLimit) {
    ret.DXVK_FRAME_RATE = gameSettings.DXVKFpsCap
  }
  if (
    gameSettings.showMangohud &&
    !gameSettings.enviromentOptions.find(
      ({ key }) => key === 'MANGOHUD_CONFIGFILE'
    )
  ) {
    if (!process.env.XDG_CONFIG_HOME) {
      ret.MANGOHUD_CONFIGFILE = join(
        flatPakHome,
        '.config/MangoHud/MangoHud.conf'
      )
    } else {
      ret.MANGOHUD_CONFIGFILE = join(
        process.env.XDG_CONFIG_HOME,
        'MangoHud/MangoHud.conf'
      )
    }
  }
  if (gameSettings.enableEsync && wineVersion.type !== 'proton') {
    ret.WINEESYNC = '1'
  }
  if (!gameSettings.enableEsync && wineVersion.type === 'proton') {
    ret.PROTON_NO_ESYNC = '1'
  }
  if (gameSettings.enableFsync && wineVersion.type !== 'proton') {
    ret.WINEFSYNC = '1'
  }
  if (!gameSettings.enableFsync && wineVersion.type === 'proton') {
    ret.PROTON_NO_FSYNC = '1'
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
      gameSettings?.enviromentOptions?.find((env) => env.key === 'PROTON_LOG')
    ) {
      // Stop Proton from overriding WINEDEBUG; this prevents logs growing to a few GB for some games
      ret.WINEDEBUG = 'timestamp'
    }
  }
  if (!gameSettings.preferSystemLibs && wineVersion.type === 'wine') {
    // https://github.com/ValveSoftware/Proton/blob/4221d9ef07cc38209ff93dbbbca9473581a38255/proton#L1091-L1093
    if (!process.env.ORIG_LD_LIBRARY_PATH) {
      ret.ORIG_LD_LIBRARY_PATH = process.env.LD_LIBRARY_PATH ?? ''
    }

    const { lib32, lib } = wineVersion
    if (lib32 && lib) {
      // append wine libs at the beginning
      ret.LD_LIBRARY_PATH = [lib, lib32, process.env.LD_LIBRARY_PATH]
        .filter(Boolean)
        .join(':')

      // https://github.com/ValveSoftware/Proton/blob/4221d9ef07cc38209ff93dbbbca9473581a38255/proton#L1099
      // NOTE: Proton does not make sure that these folders exist first, I believe we should :^)
      const gstp_path_lib64 = join(lib, 'gstreamer-1.0')
      const gstp_path_lib32 = join(lib32, 'gstreamer-1.0')
      if (existsSync(gstp_path_lib64) && existsSync(gstp_path_lib32)) {
        ret.GST_PLUGIN_SYSTEM_PATH_1_0 = gstp_path_lib64 + ':' + gstp_path_lib32
      }

      // https://github.com/ValveSoftware/Proton/blob/4221d9ef07cc38209ff93dbbbca9473581a38255/proton#L1097
      const winedll_path_lib64 = join(lib, 'wine')
      const winedll_path_lib32 = join(lib32, 'wine')
      if (existsSync(winedll_path_lib64) && existsSync(winedll_path_lib32)) {
        ret.WINEDLLPATH = winedll_path_lib64 + ':' + winedll_path_lib32
      }
    } else {
      logError(
        [
          `Couldn't find all library folders of ${wineVersion.name}!`,
          `Missing ${lib32} and/or ${lib}!`,
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
  if (gameSettings.wrapperOptions) {
    gameSettings.wrapperOptions.forEach((wrapperEntry: WrapperVariable) => {
      wrappers.push(wrapperEntry.exe)
      wrappers.push(...shlex.split(wrapperEntry.args ?? ''))
    })
  }
  if (mangoHudCommand) {
    wrappers.push(...mangoHudCommand)
  }
  if (gameModeBin) {
    wrappers.push(gameModeBin)
  }
  if (steamRuntime) {
    wrappers.push(...steamRuntime)
  }
  return wrappers.filter((n) => n)
}

/**
 * Checks if the game's selected Wine version exists
 * @param wineVersion an object of type WineInstallation with binary path and name to check
 * @returns true if the wine version exists, false if it doesn't
 */
export async function validWine(
  wineVersion: WineInstallation
): Promise<boolean> {
  if (!wineVersion) {
    return false
  }

  logInfo(
    `Checking if wine version exists: ${wineVersion.name}`,
    LogPrefix.Backend
  )

  // verify if necessary binaries exist
  const { bin, wineserver, type } = wineVersion
  const necessary = type === 'wine' ? [bin, wineserver] : [bin]
  const haveAll = necessary.every((binary) => existsSync(binary as string))

  // if wine version does not exist, use the default one
  if (!haveAll) {
    return false
  }

  return true
}

/**
 * Verifies that a Wineprefix exists by running 'wineboot --init'
 * @param gameSettings The settings of the game to verify the Wineprefix of
 * @returns stderr & stdout of 'wineboot --init'
 */
export async function verifyWinePrefix(
  settings: GameSettings
): Promise<{ res: ExecResult; updated: boolean }> {
  const { winePrefix = defaultWinePrefix, wineVersion } = settings

  const isValidWine = await validWine(wineVersion)

  if (!isValidWine) {
    return { res: { stdout: '', stderr: '' }, updated: false }
  }

  if (wineVersion.type === 'crossover') {
    return { res: { stdout: '', stderr: '' }, updated: false }
  }

  if (!existsSync(winePrefix)) {
    mkdirSync(winePrefix, { recursive: true })
  }

  // If the registry isn't available yet, things like DXVK installers might fail. So we have to wait on wineboot then
  const systemRegPath =
    wineVersion.type === 'proton'
      ? join(winePrefix, 'pfx', 'system.reg')
      : join(winePrefix, 'system.reg')
  const haveToWait = !existsSync(systemRegPath)

  const command = runWineCommand({
    commandParts: ['wineboot', '--init'],
    wait: haveToWait,
    gameSettings: settings,
    skipPrefixCheckIKnowWhatImDoing: true
  })

  return command
    .then((result) => {
      // This is kinda hacky
      const wasUpdated = result.stderr.includes(
        wineVersion.type === 'proton'
          ? 'Proton: Upgrading prefix from'
          : 'has been updated'
      )
      return { res: result, updated: wasUpdated }
    })
    .catch((error) => {
      logError(['Unable to create Wineprefix: ', error], LogPrefix.Backend)
      throw error
    })
}

function launchCleanup(rpcClient?: RpcClient) {
  if (rpcClient) {
    rpcClient.disconnect()
    logInfo('Stopped Discord Rich Presence', LogPrefix.Backend)
  }
}

async function runWineCommand({
  gameSettings,
  commandParts,
  wait,
  protonVerb = 'run',
  installFolderName,
  options,
  startFolder,
  skipPrefixCheckIKnowWhatImDoing = false
}: WineCommandArgs): Promise<{ stderr: string; stdout: string }> {
  const settings = gameSettings
    ? gameSettings
    : GlobalConfig.get().getSettings()
  const { wineVersion, winePrefix } = settings

  if (!skipPrefixCheckIKnowWhatImDoing && wineVersion.type !== 'crossover') {
    let requiredPrefixFiles = [
      'dosdevices',
      'drive_c',
      'system.reg',
      'user.reg',
      'userdef.reg'
    ]
    if (wineVersion.type === 'proton') {
      requiredPrefixFiles = [
        'pfx.lock',
        'tracked_files',
        'version',
        'config_info',
        ...requiredPrefixFiles.map((path) => join('pfx', path))
      ]
    }
    requiredPrefixFiles = requiredPrefixFiles.map((path) =>
      join(winePrefix, path)
    )
    requiredPrefixFiles.push(winePrefix)

    if (!requiredPrefixFiles.every((path) => existsSync(path))) {
      logWarning(
        'Required prefix files are missing, running `verifyWinePrefix` to create prefix',
        LogPrefix.Backend
      )
      mkdirSync(winePrefix, { recursive: true })
      await verifyWinePrefix(settings)
    }
  }

  if (!(await validWine(wineVersion))) {
    return { stdout: '', stderr: '' }
  }

  const env_vars = {
    ...process.env,
    ...setupEnvVars(settings),
    ...setupWineEnvVars(settings, installFolderName)
  }

  const isProton = wineVersion.type === 'proton'
  if (isProton) {
    commandParts.unshift(protonVerb)
  }

  const wineBin = wineVersion.bin.replaceAll("'", '')

  logDebug(['Running Wine command:', commandParts.join(' ')], LogPrefix.Backend)

  return new Promise<{ stderr: string; stdout: string }>((res) => {
    const wrappers = options?.wrappers || []
    let bin = ''
    if (wrappers.length) {
      bin = wrappers.shift()!
      commandParts.unshift(...wrappers, wineBin)
    } else {
      bin = wineBin
    }

    const child = spawn(bin, commandParts, {
      env: env_vars,
      cwd: startFolder
    })
    child.stdout.setEncoding('utf-8')
    child.stderr.setEncoding('utf-8')

    if (!logsDisabled) {
      if (options?.logFile) {
        logDebug(`Logging to file "${options?.logFile}"`, LogPrefix.Backend)
      }

      if (options?.logFile && existsSync(options.logFile)) {
        writeFileSync(options.logFile, '')
        appendFileSync(
          options.logFile,
          `Wine Command: ${bin} ${commandParts.join(' ')}\n\nGame Log:\n`
        )
      }
    }

    const stdout = memoryLog()
    const stderr = memoryLog()

    child.stdout.on('data', (data: string) => {
      if (!logsDisabled && options?.logFile) {
        appendFileSync(options.logFile, data)
      }

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stdout.push(data.trim())
    })

    child.stderr.on('data', (data: string) => {
      if (!logsDisabled && options?.logFile) {
        appendFileSync(options.logFile, data)
      }

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stderr.push(data.trim())
    })

    child.on('close', async () => {
      const response = { stderr: stderr.join(''), stdout: stdout.join('') }

      if (wait && wineVersion.wineserver) {
        await new Promise<void>((res_wait) => {
          const wait_child = spawn(wineVersion.wineserver!, ['--wait'], {
            env: env_vars,
            cwd: startFolder
          })

          wait_child.on('close', () => {
            res_wait()
          })
        })
      }

      res(response)
    })

    child.on('error', (error) => {
      console.log(error)
    })
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
  abortController: AbortController,
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

  if (!logsDisabled) {
    logInfo(
      [(options?.logMessagePrefix ?? `Running command`) + ':', safeCommand],
      runner.logPrefix
    )

    if (options?.logFile) {
      logDebug(`Logging to file "${options?.logFile}"`, runner.logPrefix)
    }

    if (options?.verboseLogFile) {
      appendFileSync(
        options.verboseLogFile,
        `[${new Date().toLocaleString()}] ${safeCommand}\n`
      )
    }

    if (options?.logFile && existsSync(options.logFile)) {
      writeFileSync(options.logFile, '')
    }
  }

  // If we have wrappers (things we want to run before the command), set bin to the first wrapper
  // and add every other wrapper and the actual bin to the start of filteredArgs
  const wrappers = options?.wrappers || []
  let bin = ''
  if (wrappers.length) {
    bin = wrappers.shift()!
    commandParts.unshift(...wrappers, runner.bin)
  } else {
    bin = runner.bin
  }

  return new Promise<ExecResult>((res, rej) => {
    const child = spawn(bin, commandParts, {
      cwd: runner.dir,
      env: { ...process.env, ...options?.env },
      signal: abortController.signal
    })

    const stdout = memoryLog()
    const stderr = memoryLog()

    child.stdout.setEncoding('utf-8')
    child.stdout.on('data', (data: string) => {
      if (!logsDisabled) {
        if (options?.logFile) {
          appendFileSync(options.logFile, data)
        }

        if (options?.verboseLogFile) {
          appendFileSync(options.verboseLogFile, data)
        }
      }

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stdout.push(data.trim())
    })

    child.stderr.setEncoding('utf-8')
    child.stderr.on('data', (data: string) => {
      if (!logsDisabled) {
        if (options?.logFile) {
          appendFileSync(options.logFile, data)
        }

        if (options?.verboseLogFile) {
          appendFileSync(options.verboseLogFile, data)
        }
      }

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stderr.push(data.trim())
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
      if (abortController.signal.aborted) {
        logInfo(['Abort command', `"${safeCommand}"`], runner.logPrefix)

        return {
          stdout: '',
          stderr: '',
          fullCommand: safeCommand,
          abort: true
        }
      }

      errorHandler({
        error: `${error}`,
        logPath: options?.logFile,
        runner: runner.name,
        appName
      })

      const showDialog =
        !`${error}`.includes('signal') &&
        !`${error}`.includes('appears to be deleted')

      logError(['Error running', 'command', `"${safeCommand}":`, error], {
        prefix: runner.logPrefix,
        showDialog
      })

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
  env: Record<string, string> | NodeJS.ProcessEnv = {},
  wrappers: string[] = [],
  runnerPath: string
): string {
  const modifiedCommandParts = [...commandParts]
  // Redact sensitive arguments (Authorization Code for Legendary, token for GOGDL)
  for (const sensitiveArg of ['--code', '--token']) {
    const sensitiveArgIndex = modifiedCommandParts.indexOf(sensitiveArg)
    if (sensitiveArgIndex === -1) {
      continue
    }
    modifiedCommandParts[sensitiveArgIndex + 1] = '<redacted>'
  }

  const formattedEnvVars: string[] = []
  for (const [key, value] of Object.entries(env)) {
    // Only add variables if they aren't already defined in our own env
    if (key in process.env) {
      if (value === process.env[key]) {
        continue
      }
    }
    formattedEnvVars.push(`${key}=${quoteIfNecessary(value ?? '')}`)
  }

  commandParts = commandParts.filter(Boolean)

  return [
    ...formattedEnvVars,
    ...wrappers.map(quoteIfNecessary),
    quoteIfNecessary(runnerPath),
    ...modifiedCommandParts.map(quoteIfNecessary)
  ].join(' ')
}

/**
 * Converts Unix paths to Windows ones or vice versa
 * @param path The Windows/Unix path you have
 * @param game Required for runWineCommand
 * @param variant The path variant (Windows/Unix) that you'd like to get (passed to `winepath` as -u/-w)
 * @returns The path returned by `winepath`
 */
async function getWinePath({
  path,
  gameSettings,
  variant = 'unix'
}: {
  path: string
  gameSettings: GameSettings
  variant?: 'win' | 'unix'
}): Promise<string> {
  // TODO: Proton has a special verb for getting Unix paths, and another one for Windows ones. Use those instead
  //       Note that this would involve running `proton runinprefix cmd /c echo path` first to expand env vars
  //       https://github.com/ValveSoftware/Proton/blob/4221d9ef07cc38209ff93dbbbca9473581a38255/proton#L1526-L1533
  const { stdout } = await runWineCommand({
    gameSettings,
    commandParts: [
      'cmd',
      '/c',
      'winepath',
      variant === 'unix' ? '-u' : '-w',
      path
    ],
    wait: false,
    protonVerb: 'runinprefix'
  })
  return stdout.trim()
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
  getWinePath
}
