import {
  CallRunnerOptions,
  GameInfo,
  Runner,
  EnviromentVariable,
  WrapperEnv,
  WrapperVariable,
  ExecResult,
  LaunchPreperationResult,
  RpcClient,
  WineInstallation,
  WineCommandArgs,
  SteamRuntime,
  GameSettings,
  KnowFixesInfo
} from 'common/types'
// This handles launching games, prefix creation etc..

import i18next from 'i18next'
import { existsSync, mkdirSync } from 'graceful-fs'
import { join, dirname } from 'path'

import {
  defaultWinePrefix,
  fixesPath,
  flatPakHome,
  isLinux,
  isMac,
  isWindows,
  isSteamDeckGameMode,
  runtimePath,
  userHome,
  defaultUmuPath,
  publicDir
} from './constants'
import {
  constructAndUpdateRPC,
  getSteamRuntime,
  isEpicServiceOffline,
  quoteIfNecessary,
  errorHandler,
  removeQuoteIfNecessary,
  memoryLog,
  sendGameStatusUpdate
} from './utils'
import {
  appendFileLog,
  appendGameLog,
  appendGamePlayLog,
  appendRunnerLog,
  initFileLog,
  initGameLog,
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logsDisabled,
  logWarning
} from './logger/logger'
import { GlobalConfig } from './config'
import { GameConfig } from './game_config'
import { DXVK, Winetricks } from './tools'
import gogSetup from './storeManagers/gog/setup'
import nileSetup from './storeManagers/nile/setup'
import { spawn, spawnSync } from 'child_process'
import shlex from 'shlex'
import { isOnline } from './online_monitor'
import { showDialogBoxModalAuto } from './dialog/dialog'
import { legendarySetup } from './storeManagers/legendary/setup'
import { gameManagerMap } from 'backend/storeManagers'
import * as VDF from '@node-steam/vdf'
import { readFileSync } from 'fs'
import { LegendaryCommand } from './storeManagers/legendary/commands'
import { commandToArgsArray } from './storeManagers/legendary/library'
import { searchForExecutableOnPath } from './utils/os/path'
import {
  createAbortController,
  deleteAbortController
} from './utils/aborthandler/aborthandler'
import { download, isInstalled } from './wine/runtimes/runtimes'
import { storeMap } from 'common/utils'
import { runWineCommandOnGame } from './storeManagers/legendary/games'
import { sendFrontendMessage } from './main_window'
import { getUmuPath, isUmuSupported } from './utils/compatibility_layers'
import { copyFile } from 'fs/promises'

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
    logWarning(
      'Offline Mode is on but the game does not allow offline mode explicitly.'
    )
  }

  // Update Discord RPC if enabled
  let rpcClient = undefined
  if (globalSettings.discordRPC) {
    rpcClient = constructAndUpdateRPC(gameInfo)
  }

  // If we're not on Linux, we can return here
  if (!isLinux) {
    return { success: true, rpcClient, offlineMode }
  }

  // Figure out where MangoHud/GameMode/Gamescope are located, if they're enabled
  let mangoHudCommand: string[] = []
  let gameModeBin: string | null = null
  const gameScopeCommand: string[] = []
  if (gameSettings.showMangohud) {
    const mangoHudBin = await searchForExecutableOnPath('mangohud')
    if (!mangoHudBin) {
      return {
        success: false,
        failureReason:
          'Mangohud is enabled, but `mangohud` executable could not be found on $PATH'
      }
    }

    mangoHudCommand = [mangoHudBin, '--dlsym']
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

  if (
    (gameSettings.gamescope?.enableLimiter ||
      gameSettings.gamescope?.enableUpscaling) &&
    !isSteamDeckGameMode
  ) {
    const gameScopeBin = await searchForExecutableOnPath('gamescope')
    if (!gameScopeBin) {
      logWarning(
        'Gamescope is enabled, but `gamescope` executable could not be found on $PATH'
      )
    } else {
      // Gamescope does not provide a version option and they changed
      // cli options on version 3.12. So we do what lutris does.
      let oldVersion = true // < 3.12
      const { stderr } = spawnSync(gameScopeBin, ['--help'], {
        encoding: 'utf-8'
      })
      if (stderr && stderr.includes('-F, --filter')) {
        oldVersion = false
      }

      gameScopeCommand.push(gameScopeBin)

      if (gameSettings.gamescope.enableUpscaling) {
        // game res
        if (gameSettings.gamescope.gameWidth) {
          gameScopeCommand.push('-w', gameSettings.gamescope.gameWidth)
        }
        if (gameSettings.gamescope.gameHeight) {
          gameScopeCommand.push('-h', gameSettings.gamescope.gameHeight)
        }

        // gamescope res
        if (gameSettings.gamescope.upscaleWidth) {
          gameScopeCommand.push('-W', gameSettings.gamescope.upscaleWidth)
        }
        if (gameSettings.gamescope.upscaleHeight) {
          gameScopeCommand.push('-H', gameSettings.gamescope.upscaleHeight)
        }

        // upscale method
        if (gameSettings.gamescope.upscaleMethod === 'fsr') {
          oldVersion
            ? gameScopeCommand.push('-U')
            : gameScopeCommand.push('-F', 'fsr')
        }
        if (gameSettings.gamescope.upscaleMethod === 'nis') {
          oldVersion
            ? gameScopeCommand.push('-Y')
            : gameScopeCommand.push('-F', 'nis')
        }
        if (gameSettings.gamescope.upscaleMethod === 'integer') {
          oldVersion
            ? gameScopeCommand.push('-i')
            : gameScopeCommand.push('-S', 'integer')
        }
        // didn't find stretch in old version
        if (gameSettings.gamescope.upscaleMethod === 'stretch' && !oldVersion) {
          gameScopeCommand.push('-S', 'stretch')
        }

        // window type
        if (gameSettings.gamescope.windowType === 'fullscreen') {
          gameScopeCommand.push('-f')
        }
        if (gameSettings.gamescope.windowType === 'borderless') {
          gameScopeCommand.push('-b')
        }
      }

      if (gameSettings.gamescope.enableLimiter) {
        if (gameSettings.gamescope.fpsLimiter) {
          gameScopeCommand.push('-r', gameSettings.gamescope.fpsLimiter)
        }
        if (gameSettings.gamescope.fpsLimiterNoFocus) {
          gameScopeCommand.push('-o', gameSettings.gamescope.fpsLimiterNoFocus)
        }
      }

      if (gameSettings.showMangohud) {
        gameScopeCommand.push('--mangoapp')
      }

      gameScopeCommand.push(
        ...shlex.split(gameSettings.gamescope.additionalOptions ?? '')
      )

      // Note: needs to be the last option
      gameScopeCommand.push('--')
    }
  }

  if (
    (await isUmuSupported(gameSettings.wineVersion.type, false)) &&
    isOnline() &&
    !(await isInstalled('umu')) &&
    (await getUmuPath()) === defaultUmuPath
  ) {
    await download('umu')
  }

  // If the Steam Runtime is enabled, find a valid one
  let steamRuntime: string[] = []
  const shouldUseRuntime =
    gameSettings.useSteamRuntime &&
    (isNative ||
      (!(await isUmuSupported(gameSettings.wineVersion.type)) &&
        gameSettings.wineVersion.type === 'proton'))

  if (shouldUseRuntime) {
    // Determine which runtime to use based on toolmanifest.vdf which is shipped with proton
    let nonNativeRuntime: SteamRuntime['type'] = 'soldier'
    if (!isNative) {
      try {
        const parentPath = dirname(gameSettings.wineVersion.bin)
        const requiredAppId = VDF.parse(
          readFileSync(join(parentPath, 'toolmanifest.vdf'), 'utf-8')
        ).manifest?.require_tool_appid
        if (requiredAppId === 1628350) nonNativeRuntime = 'sniper'
      } catch (error) {
        logError(
          ['Failed to parse toolmanifest.vdf:', error],
          LogPrefix.Backend
        )
      }
    }

    const runtimeType = isNative ? 'scout' : nonNativeRuntime
    const { path, args } = await getSteamRuntime(runtimeType)
    if (!path) {
      return {
        success: false,
        failureReason:
          'Steam Runtime is enabled, but no runtimes could be found\n' +
          `Make sure Steam ${
            isNative
              ? 'is'
              : `and the SteamLinuxRuntime - ${
                  nonNativeRuntime === 'sniper' ? 'Sniper' : 'Soldier'
                } are`
          } installed`
      }
    }

    logInfo(`Using Steam ${runtimeType} Runtime`, LogPrefix.Backend)

    steamRuntime = [path, ...args]
  }

  return {
    success: true,
    rpcClient,
    mangoHudCommand,
    gameModeBin: gameModeBin ?? undefined,
    gameScopeCommand,
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
  const experimentalFeatures =
    GlobalConfig.get().getSettings().experimentalFeatures
  if (winePrefixUpdated) {
    logInfo(
      ['Created/Updated Wineprefix at', gameSettings.winePrefix],
      LogPrefix.Backend
    )
    if (runner === 'gog') {
      await gogSetup(appName)
      sendFrontendMessage('gameStatusUpdate', {
        appName,
        runner: 'gog',
        status: 'launching'
      })
    }
    if (runner === 'nile') {
      await nileSetup(appName)
    }
    if (runner === 'legendary') {
      await legendarySetup(appName)
    }
    if (experimentalFeatures?.automaticWinetricksFixes !== false) {
      await installFixes(appName, runner)
    }
  }

  try {
    if (runner === 'gog' && experimentalFeatures?.cometSupport !== false) {
      const communicationSource = join(
        publicDir,
        'bin/x64/win32/GalaxyCommunication.exe'
      )

      const galaxyCommPath =
        'C:\\ProgramData\\GOG.com\\Galaxy\\redists\\GalaxyCommunication.exe'
      const communicationDest = await getWinePath({
        path: galaxyCommPath,
        gameSettings,
        variant: 'unix'
      })

      if (!existsSync(communicationDest)) {
        mkdirSync(dirname(communicationDest), { recursive: true })
        await copyFile(communicationSource, communicationDest)
        await runWineCommand({
          commandParts: [
            'sc',
            'create',
            'GalaxyCommunication',
            `binpath=${galaxyCommPath}`
          ],
          gameSettings,
          protonVerb: 'runinprefix'
        })
      }
    }
  } catch (err) {
    logError('Failed to install GalaxyCommunication dummy into the prefix')
  }

  // If DXVK/VKD3D installation is enabled, install it
  if (gameSettings.wineVersion.type === 'wine') {
    if (gameSettings.autoInstallDxvk) {
      await DXVK.installRemove(gameSettings, 'dxvk', 'backup')
    }
    if (isLinux && gameSettings.autoInstallDxvkNvapi) {
      await DXVK.installRemove(gameSettings, 'dxvk-nvapi', 'backup')
    }
    if (isLinux && gameSettings.autoInstallVkd3d) {
      await DXVK.installRemove(gameSettings, 'vkd3d', 'backup')
    }
  }

  if (
    gameSettings.eacRuntime &&
    isOnline() &&
    !(await isInstalled('eac_runtime'))
  ) {
    await download('eac_runtime')
  }

  if (
    gameSettings.battlEyeRuntime &&
    isOnline() &&
    !(await isInstalled('battleye_runtime'))
  ) {
    await download('battleye_runtime')
  }

  const { folder_name: installFolderName } =
    gameManagerMap[runner].getGameInfo(appName)
  const envVars = setupWineEnvVars(gameSettings, installFolderName)

  return { success: true, envVars: envVars }
}

async function installFixes(appName: string, runner: Runner) {
  const fixPath = join(fixesPath, `${appName}-${storeMap[runner]}.json`)

  if (!existsSync(fixPath)) return

  try {
    const fixesContent = JSON.parse(
      readFileSync(fixPath).toString()
    ) as KnowFixesInfo

    if (fixesContent.winetricks) {
      sendGameStatusUpdate({
        appName,
        runner: runner,
        status: 'winetricks'
      })

      for (const winetricksPackage of fixesContent.winetricks) {
        await Winetricks.install(runner, appName, winetricksPackage)
      }
    }

    if (fixesContent.runInPrefix) {
      const gameInfo = gameManagerMap[runner].getGameInfo(appName)

      sendGameStatusUpdate({
        appName,
        runner: runner,
        status: 'redist',
        context: 'FIXES'
      })

      for (const filePath of fixesContent.runInPrefix) {
        const fullPath = join(gameInfo.install.install_path!, filePath)
        await runWineCommandOnGame(appName, {
          commandParts: [fullPath],
          wait: true,
          protonVerb: 'run'
        })
      }
    }
  } catch (error) {
    // if we fail to download the json file, it can be malformed causing
    // JSON.parse to throw an exception
    logWarning(`Known fixes could not be applied, ignoring.\n${error}`)
  }
}

/**
 * Maps general settings to environment variables
 * @param gameSettings The GameSettings to get the environment variables for
 * @returns A big string of environment variables, structured key=value
 */
function setupEnvVars(gameSettings: GameSettings, installPath?: string) {
  const ret: Record<string, string> = {}
  if (gameSettings.nvidiaPrime) {
    ret.DRI_PRIME = '1'
    ret.__NV_PRIME_RENDER_OFFLOAD = '1'
    ret.__GLX_VENDOR_LIBRARY_NAME = 'nvidia'
  }

  if (isMac && gameSettings.showFps) {
    ret.MTL_HUD_ENABLED = '1'
  }

  if (isLinux && installPath) {
    // Used by steam runtime to mount the game directory to the container
    ret.STEAM_COMPAT_INSTALL_PATH = installPath
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
 * Maps launcher info to environment variables for consumption by wrappers
 * @param wrapperEnv The info to be added into the environment variables
 * @returns Environment variables
 */
function setupWrapperEnvVars(wrapperEnv: WrapperEnv) {
  const ret: Record<string, string> = {}

  ret.HEROIC_APP_NAME = wrapperEnv.appName
  ret.HEROIC_APP_RUNNER = wrapperEnv.appRunner
  ret.GAMEID = 'umu-0'

  switch (wrapperEnv.appRunner) {
    case 'gog':
      ret.HEROIC_APP_SOURCE = 'gog'
      ret.STORE = 'gog'
      break
    case 'legendary':
      ret.HEROIC_APP_SOURCE = 'epic'
      ret.STORE = 'egs'
      break
    case 'nile':
      ret.HEROIC_APP_SOURCE = 'amazon'
      ret.STORE = 'amazon'
      break
    case 'sideload':
      ret.HEROIC_APP_SOURCE = 'sideload'
      break
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
          dllOverridesVar.value + ';' + wmbDisableString
      } else {
        ret.WINEDLLOVERRIDES = wmbDisableString
      }

      break
    }
    case 'proton':
      ret.STEAM_COMPAT_CLIENT_INSTALL_PATH = steamInstallPath
      ret.WINEPREFIX = winePrefix
      ret.STEAM_COMPAT_DATA_PATH = winePrefix
      ret.PROTONPATH = dirname(gameSettings.wineVersion.bin)
      break
    case 'crossover':
      ret.CX_BOTTLE = wineCrossoverBottle
      break
    case 'toolkit':
      ret.WINEPREFIX = winePrefix
      break
  }

  if (gameSettings.showFps) {
    isMac ? (ret.MTL_HUD_ENABLED = '1') : (ret.DXVK_HUD = 'fps')
  }
  if (gameSettings.enableDXVKFpsLimit) {
    ret.DXVK_FRAME_RATE = gameSettings.DXVKFpsCap
  }
  if (gameSettings.enableFSR) {
    ret.WINE_FULLSCREEN_FSR = '1'
    ret.WINE_FULLSCREEN_FSR_STRENGTH =
      gameSettings.maxSharpness?.toString() || '2'
  } else {
    ret.WINE_FULLSCREEN_FSR = '0'
  }
  if (gameSettings.enableEsync && wineVersion.type !== 'proton') {
    ret.WINEESYNC = '1'
  }
  if (!gameSettings.enableEsync && wineVersion.type === 'proton') {
    ret.PROTON_NO_ESYNC = '1'
  }
  if (gameSettings.enableMsync && isMac) {
    ret.WINEMSYNC = '1'
    // This is to solve a problem with d3dmetal
    if (wineVersion.type === 'toolkit') {
      ret.WINEESYNC = '1'
    }
  }
  if (isLinux && gameSettings.enableFsync && wineVersion.type !== 'proton') {
    ret.WINEFSYNC = '1'
  }
  if (isLinux && !gameSettings.enableFsync && wineVersion.type === 'proton') {
    ret.PROTON_NO_FSYNC = '1'
  }
  if (wineVersion.type === 'proton') {
    if (gameSettings.autoInstallDxvkNvapi) {
      ret.PROTON_ENABLE_NVAPI = '1'
      ret.DXVK_NVAPI_ALLOW_OTHER_DRIVERS = '1'
    }
    // proton 9 enabled NVAPI by default
    else {
      ret.PROTON_DISABLE_NVAPI = '1'
    }
  }
  if (
    isLinux &&
    gameSettings.autoInstallDxvkNvapi &&
    wineVersion.type === 'wine'
  ) {
    ret.DXVK_ENABLE_NVAPI = '1'
    ret.DXVK_NVAPI_ALLOW_OTHER_DRIVERS = '1'
  }
  if (isLinux && gameSettings.eacRuntime) {
    ret.PROTON_EAC_RUNTIME = join(runtimePath, 'eac_runtime')
  }
  if (isLinux && gameSettings.battlEyeRuntime) {
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
  gameScopeCommand?: string[],
  steamRuntime?: string[]
): Array<string> {
  const wrappers: string[] = []

  // let gamescope be first wrapper always
  if (gameScopeCommand) {
    wrappers.push(...gameScopeCommand)
  }

  if (gameSettings.wrapperOptions) {
    gameSettings.wrapperOptions.forEach((wrapperEntry: WrapperVariable) => {
      wrappers.push(wrapperEntry.exe)
      wrappers.push(...shlex.split(wrapperEntry.args ?? ''))
    })
  }
  if (mangoHudCommand && gameScopeCommand?.length === 0) {
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

  if (!existsSync(winePrefix) && !(await isUmuSupported(wineVersion.type))) {
    mkdirSync(winePrefix, { recursive: true })
  }

  // If the registry isn't available yet, things like DXVK installers might fail. So we have to wait on wineboot then
  const systemRegPath =
    wineVersion.type === 'proton'
      ? join(winePrefix, 'pfx', 'system.reg')
      : join(winePrefix, 'system.reg')
  const haveToWait = !existsSync(systemRegPath)

  const command = runWineCommand({
    commandParts: (await isUmuSupported(wineVersion.type))
      ? ['createprefix']
      : ['wineboot', '--init'],
    wait: haveToWait,
    gameSettings: settings,
    protonVerb: 'run',
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
  skipPrefixCheckIKnowWhatImDoing = false,
  ignoreLogging = false
}: WineCommandArgs): Promise<{
  stderr: string
  stdout: string
  code?: number
}> {
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
    GAMEID: 'umu-0',
    ...setupEnvVars(settings),
    ...setupWineEnvVars(settings, installFolderName),
    PROTON_VERB: protonVerb
  }

  if (ignoreLogging) {
    delete env_vars['PROTON_LOG']
  }

  const wineBin = wineVersion.bin.replaceAll("'", '')
  const umuSupported = await isUmuSupported(wineVersion.type)
  const runnerBin = umuSupported ? await getUmuPath() : wineBin

  if (wineVersion.type === 'proton' && !umuSupported) {
    commandParts.unshift(protonVerb)
  }

  logDebug(['Running Wine command:', commandParts.join(' ')], LogPrefix.Backend)

  return new Promise<{ stderr: string; stdout: string }>((res) => {
    const wrappers = options?.wrappers || []
    let bin = runnerBin

    if (wrappers.length) {
      bin = wrappers.shift()!
      commandParts.unshift(...wrappers, runnerBin)
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
        appendFileLog(
          options.logFile,
          `Wine Command: ${bin} ${commandParts.join(' ')}\n\nGame Log:\n`
        )
      }
    }

    const stdout = memoryLog()
    const stderr = memoryLog()

    child.stdout.on('data', (data: string) => {
      if (!logsDisabled && options?.logFile) {
        appendFileLog(options.logFile, data)
      }

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stdout.push(data.trim())
    })

    child.stderr.on('data', (data: string) => {
      if (!logsDisabled && options?.logFile) {
        appendFileLog(options.logFile, data)
      }

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stderr.push(data.trim())
    })

    child.on('close', async (code) => {
      const response = {
        stderr: stderr.join(''),
        stdout: stdout.join(''),
        code
      }

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

const commandsRunning = {}

let shouldUsePowerShell: boolean | null = null

function appNameFromCommandParts(commandParts: string[], runner: Runner) {
  let appNameIndex = -1
  let idx = -1

  switch (runner) {
    case 'gog':
      idx = commandParts.findIndex((value) => value === 'launch')
      if (idx > -1) {
        // for GOGdl, between `launch` and the app name there's another element
        appNameIndex = idx + 2
      } else {
        // for the `download`, `repair` and `update` command it's right after
        idx = commandParts.findIndex((value) =>
          ['download', 'repair', 'update'].includes(value)
        )
        if (idx > -1) {
          appNameIndex = idx + 1
        }
      }
      break
    case 'legendary':
      // for legendary, the appName comes right after the commands
      idx = commandParts.findIndex((value) =>
        ['launch', 'install', 'repair', 'update'].includes(value)
      )
      if (idx > -1) {
        appNameIndex = idx + 1
      }
      break
    case 'nile':
      // for nile, we pass the appName as the last command part
      idx = commandParts.findIndex((value) =>
        ['launch', 'install', 'update', 'verify'].includes(value)
      )
      if (idx > -1) {
        appNameIndex = commandParts.length - 1
      }
      break
  }

  return appNameIndex > -1 ? commandParts[appNameIndex] : ''
}

async function callRunner(
  commandParts: string[],
  runner: RunnerProps,
  options?: CallRunnerOptions
): Promise<ExecResult> {
  const appName = appNameFromCommandParts(commandParts, runner.name)

  // Necessary to get rid of possible undefined or null entries, else
  // TypeError is triggered
  commandParts = commandParts.filter(Boolean)

  let bin = runner.bin
  let fullRunnerPath = join(runner.dir, bin)

  // macOS/Linux: `spawn`ing an executable in the current working directory
  // requires a "./"
  if (!isWindows) bin = './' + bin

  // On Windows: Use PowerShell's `Start-Process` to wait for the process and
  // its children to exit, provided PowerShell is available
  if (shouldUsePowerShell === null)
    shouldUsePowerShell =
      isWindows && !!(await searchForExecutableOnPath('powershell'))

  if (shouldUsePowerShell) {
    const argsAsString = commandParts
      .map((part) => part.replaceAll('\\', '\\\\'))
      .map((part) => `"\`"${part}\`""`)
      .join(',')
    commandParts = [
      'Start-Process',
      `"\`"${fullRunnerPath}\`""`,
      '-Wait',
      '-NoNewWindow'
    ]
    if (argsAsString) commandParts.push('-ArgumentList', argsAsString)

    bin = fullRunnerPath = 'powershell'
  }

  const safeCommand = getRunnerCallWithoutCredentials(
    [...commandParts],
    options?.env,
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
      appendRunnerLog(
        runner.name,
        `[${new Date().toLocaleString()}] ${safeCommand}\n`
      )
    }

    if (options?.logFile) {
      if (appName) {
        initGameLog(appName)
      } else {
        initFileLog(options.logFile)
      }
    }
  }

  // check if the same command is currently running
  // if so, return the same promise instead of running it again
  const key = [runner.name, commandParts].join(' ')
  const currentPromise = commandsRunning[key]

  if (currentPromise) {
    return currentPromise
  }

  const abortId = options?.abortId || appName || Math.random().toString()
  const abortController = createAbortController(abortId)

  let promise = new Promise<ExecResult>((res, rej) => {
    const child = spawn(bin, commandParts, {
      cwd: runner.dir,
      env: { ...process.env, ...options?.env },
      signal: abortController.signal
    })

    const stdout = memoryLog()
    const stderr = memoryLog()

    child.stdout.setEncoding('utf-8')
    child.stdout.on('data', (data: string) => {
      const stringToLog = options?.logSanitizer
        ? options.logSanitizer(data)
        : data

      if (!logsDisabled) {
        if (options?.logFile) {
          if (appName) {
            appendGameLog(appName, stringToLog)
          } else {
            appendFileLog(options.logFile, stringToLog)
          }
        }

        if (options?.verboseLogFile) {
          appendRunnerLog(runner.name, stringToLog)
        }
      }

      if (options?.onOutput) {
        options.onOutput(data, child)
      }

      stdout.push(data.trim())
    })

    child.stderr.setEncoding('utf-8')
    child.stderr.on('data', (data: string) => {
      const stringToLog = options?.logSanitizer
        ? options.logSanitizer(data)
        : data

      if (!logsDisabled) {
        if (options?.logFile) {
          if (appName) {
            appendGameLog(appName, stringToLog)
          } else {
            appendFileLog(options.logFile, stringToLog)
          }
        }

        if (options?.verboseLogFile) {
          appendRunnerLog(runner.name, stringToLog)
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

  promise = promise
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
    .finally(() => {
      // remove from list when done
      delete commandsRunning[key]
      deleteAbortController(abortId)
    })

  // keep track of which commands are running
  commandsRunning[key] = promise

  return promise
}

/**
 * Generates a formatted, safe command that can be logged
 * @param command The runner command that's executed, e.g. install, list, etc.
 * Note that this will be modified, so pass a copy of your actual command parts
 * @param env Enviroment variables to use
 * @param wrappers Wrappers to use (gamemode, steam runtime, etc.)
 * @param runnerPath The full path to the runner executable
 * @returns
 */
function getRunnerCallWithoutCredentials(
  command: string[] | LegendaryCommand,
  env: Record<string, string> | NodeJS.ProcessEnv = {},
  runnerPath: string
): string {
  if (!Array.isArray(command)) command = commandToArgsArray(command)

  const modifiedCommand = [...command]
  // Redact sensitive arguments (Authorization Code for Legendary, token for GOGDL)
  for (const sensitiveArg of ['--code', '--token']) {
    // PowerShell's argument formatting is quite different, instead of having
    // arguments as members of `command`, they're all in one specific member
    // (the one after "-ArgumentList")
    if (runnerPath === 'powershell') {
      const argumentListIndex = modifiedCommand.indexOf('-ArgumentList') + 1
      if (!argumentListIndex) continue
      modifiedCommand[argumentListIndex] = modifiedCommand[
        argumentListIndex
      ].replace(
        new RegExp(`"${sensitiveArg}","(.*?)"`),
        `"${sensitiveArg}","<redacted>"`
      )
    } else {
      const sensitiveArgIndex = modifiedCommand.indexOf(sensitiveArg)
      if (sensitiveArgIndex === -1) {
        continue
      }
      modifiedCommand[sensitiveArgIndex + 1] = '<redacted>'
    }
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

  return [
    ...formattedEnvVars,
    quoteIfNecessary(runnerPath),
    ...modifiedCommand.map(quoteIfNecessary)
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
    protonVerb: 'runinprefix',
    ignoreLogging: true
  })
  return stdout.trim()
}

async function runBeforeLaunchScript(
  gameInfo: GameInfo,
  gameSettings: GameSettings
) {
  if (!gameSettings.beforeLaunchScriptPath) {
    return true
  }

  appendGamePlayLog(
    gameInfo,
    `Running script before ${gameInfo.title} (${gameSettings.beforeLaunchScriptPath})\n`
  )

  return runScriptForGame(gameInfo, gameSettings, 'before')
}

async function runAfterLaunchScript(
  gameInfo: GameInfo,
  gameSettings: GameSettings
) {
  if (!gameSettings.afterLaunchScriptPath) {
    return true
  }

  appendGamePlayLog(
    gameInfo,
    `Running script after ${gameInfo.title} (${gameSettings.afterLaunchScriptPath})\n`
  )
  return runScriptForGame(gameInfo, gameSettings, 'after')
}

/* Execute script before launch/after exit, wait until the script
 * exits to continue
 *
 * The script can start sub-processes with `bash another-command &`
 * if `another-command` should run asynchronously
 *
 * For example:
 *
 * ```
 * #!/bin/bash
 *
 * echo "this runs before/after the game"
 * bash ./another.bash & # this is launched before/after the game but is not waited
 * echo "this also runs before/after the game too" > someoutput.txt
 * ```
 *
 * Notes:
 * - Output and logs are printed in the game's log
 * - Make sure the script is executable
 * - Make sure any async process is not stuck running in the background forever,
 *   use the after script to kill any running process if that's the case
 */
async function runScriptForGame(
  gameInfo: GameInfo,
  gameSettings: GameSettings,
  scriptStage: 'before' | 'after'
): Promise<boolean | string> {
  return new Promise((resolve, reject) => {
    const scriptPath = gameSettings[`${scriptStage}LaunchScriptPath`]
    const scriptEnv = {
      HEROIC_GAME_APP_NAME: gameInfo.app_name,
      HEROIC_GAME_EXEC: gameInfo.install.executable,
      HEROIC_GAME_PREFIX: gameSettings.winePrefix,
      HEROIC_GAME_RUNNER: gameInfo.runner,
      HEROIC_GAME_SCRIPT_STAGE: scriptStage,
      HEROIC_GAME_TITLE: gameInfo.title,
      ...process.env
    }
    const child = spawn(scriptPath, {
      cwd: gameInfo.install.install_path,
      env: scriptEnv
    })

    child.stdout.on('data', (data) => {
      appendGamePlayLog(gameInfo, data.toString())
    })

    child.stderr.on('data', (data) => {
      appendGamePlayLog(gameInfo, data.toString())
    })

    child.on('exit', () => {
      resolve(true)
    })

    child.on('error', (err: Error) => {
      appendGamePlayLog(gameInfo, err.message)
      if (err.stack) appendGamePlayLog(gameInfo, err.stack)
      reject(err.message)
    })
  })
}

export {
  prepareLaunch,
  launchCleanup,
  prepareWineLaunch,
  setupEnvVars,
  setupWrapperEnvVars,
  setupWineEnvVars,
  setupWrappers,
  runWineCommand,
  callRunner,
  getRunnerCallWithoutCredentials,
  getWinePath,
  runAfterLaunchScript,
  runBeforeLaunchScript
}
