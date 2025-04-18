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
  KnowFixesInfo,
  LaunchParams,
  StatusPromise
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
  publicDir,
  tsStore,
  isCLINoGui,
  isIntelMac
} from './constants'
import {
  constructAndUpdateRPC,
  getSteamRuntime,
  isEpicServiceOffline,
  quoteIfNecessary,
  errorHandler,
  removeQuoteIfNecessary,
  memoryLog,
  sendGameStatusUpdate,
  checkWineBeforeLaunch,
  isMacSonomaOrHigher
} from './utils'
import {
  appendFileLog,
  appendGameLog,
  appendGamePlayLog,
  appendRunnerLog,
  initFileLog,
  initGameLog,
  initGamePlayLog,
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logsDisabled,
  logWarning,
  stopLogger
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
import { readFileSync, writeFileSync } from 'fs'
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
import { getMainWindow, sendFrontendMessage } from './main_window'
import { getUmuPath, isUmuSupported } from './utils/compatibility_layers'
import { copyFile } from 'fs/promises'
import { app, powerSaveBlocker } from 'electron'
import gogPresence from './storeManagers/gog/presence'
import { updateGOGPlaytime } from './storeManagers/gog/games'
import { addRecentGame } from './recent_games/recent_games'

let powerDisplayId: number | null

const launchEventCallback: (args: LaunchParams) => StatusPromise = async ({
  appName,
  launchArguments,
  runner,
  skipVersionCheck,
  args
}) => {
  const game = gameManagerMap[runner].getGameInfo(appName)
  const gameSettings = await gameManagerMap[runner].getSettings(appName)
  const { autoSyncSaves, savesPath, gogSaves = [] } = gameSettings

  const { title } = game

  const { minimizeOnLaunch } = GlobalConfig.get().getSettings()

  const startPlayingDate = new Date()

  if (!tsStore.has(game.app_name)) {
    tsStore.set(`${game.app_name}.firstPlayed`, startPlayingDate.toISOString())
  }

  logInfo(`Launching ${title} (${game.app_name})`, LogPrefix.Backend)

  if (autoSyncSaves && isOnline()) {
    sendGameStatusUpdate({
      appName,
      runner,
      status: 'syncing-saves'
    })
    logInfo(`Downloading saves for ${title}`, LogPrefix.Backend)
    try {
      await gameManagerMap[runner].syncSaves(
        appName,
        '--skip-upload',
        savesPath,
        gogSaves
      )
      logInfo(`Saves for ${title} downloaded`, LogPrefix.Backend)
    } catch (error) {
      logError(
        `Error while downloading saves for ${title}. ${error}`,
        LogPrefix.Backend
      )
    }
  }

  sendGameStatusUpdate({
    appName,
    runner,
    status: 'launching'
  })

  const mainWindow = getMainWindow()
  if (minimizeOnLaunch) {
    mainWindow?.hide()
  }

  // Prevent display from sleep
  if (!powerDisplayId) {
    logInfo('Preventing display from sleep', LogPrefix.Backend)
    powerDisplayId = powerSaveBlocker.start('prevent-display-sleep')
  }

  initGamePlayLog(game)

  const isNative = gameManagerMap[runner].isNative(appName)

  // check if isNative, if not, check if wine is valid
  if (!isNative) {
    const isWineOkToLaunch = await checkWineBeforeLaunch(game, gameSettings)

    if (!isWineOkToLaunch) {
      logError(
        `Was not possible to launch using ${gameSettings.wineVersion.name}`,
        LogPrefix.Backend
      )

      sendGameStatusUpdate({
        appName,
        runner,
        status: 'done'
      })

      stopLogger(appName)

      return { status: 'error' }
    }
  }

  await runBeforeLaunchScript(game, gameSettings)

  sendGameStatusUpdate({
    appName,
    runner,
    status: 'launching'
  })

  const command = gameManagerMap[runner].launch(
    appName,
    launchArguments,
    args,
    skipVersionCheck
  )

  if (runner === 'gog') {
    gogPresence.setCurrentGame(appName)
    await gogPresence.setPresence()
  }

  const launchResult = await command
    .catch((exception) => {
      logError(exception, LogPrefix.Backend)
      appendGamePlayLog(
        game,
        `An exception occurred when launching the game:\n${exception.stack}`
      )

      return false
    })
    .finally(async () => {
      await runAfterLaunchScript(game, gameSettings)
      stopLogger(appName)
    })

  if (runner === 'gog') {
    gogPresence.setCurrentGame('')
    await gogPresence.setPresence()
  }
  // Stop display sleep blocker
  if (powerDisplayId !== null) {
    logInfo('Stopping Display Power Saver Blocker', LogPrefix.Backend)
    powerSaveBlocker.stop(powerDisplayId)
  }

  // Update playtime and last played date
  const finishedPlayingDate = new Date()
  tsStore.set(`${appName}.lastPlayed`, finishedPlayingDate.toISOString())
  // Playtime of this session in minutes
  const sessionPlaytime =
    (finishedPlayingDate.getTime() - startPlayingDate.getTime()) / 1000 / 60
  const totalPlaytime =
    sessionPlaytime + tsStore.get(`${appName}.totalPlayed`, 0)
  tsStore.set(`${appName}.totalPlayed`, Math.floor(totalPlaytime))

  const { disablePlaytimeSync } = GlobalConfig.get().getSettings()
  if (runner === 'gog') {
    if (!disablePlaytimeSync) {
      await updateGOGPlaytime(appName, startPlayingDate, finishedPlayingDate)
    } else {
      logWarning(
        'Posting playtime session to server skipped - playtime sync disabled',
        { prefix: LogPrefix.Backend }
      )
    }
  }
  await addRecentGame(game)

  if (autoSyncSaves && isOnline()) {
    sendGameStatusUpdate({
      appName,
      runner,
      status: 'done'
    })

    sendGameStatusUpdate({
      appName,
      runner,
      status: 'syncing-saves'
    })

    logInfo(`Uploading saves for ${title}`, LogPrefix.Backend)
    try {
      await gameManagerMap[runner].syncSaves(
        appName,
        '--skip-download',
        savesPath,
        gogSaves
      )
      logInfo(`Saves uploaded for ${title}`, LogPrefix.Backend)
    } catch (error) {
      logError(
        `Error uploading saves for ${title}. Error: ${error}`,
        LogPrefix.Backend
      )
    }
  }

  sendGameStatusUpdate({
    appName,
    runner,
    status: 'done'
  })

  // Exit if we've been launched without UI
  if (isCLINoGui) {
    app.exit()
  }

  return { status: launchResult ? 'done' : 'error' }
}

async function prepareLaunch(
  gameSettings: GameSettings,
  gameInfo: GameInfo,
  isNative: boolean
): Promise<LaunchPreperationResult> {
  const globalSettings = GlobalConfig.get().getSettings()

  let offlineMode = gameSettings.offlineMode || !isOnline()

  if (!offlineMode && gameInfo.runner === 'legendary') {
    offlineMode = await isEpicServiceOffline()
  }

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
  if (gameSettings.showMangohud && !isSteamDeckGameMode) {
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

      if (gameSettings.gamescope.enableForceGrabCursor) {
        gameScopeCommand.push('--force-grab-cursor')
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
    (await isUmuSupported(gameSettings, false)) &&
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
      (!(await isUmuSupported(gameSettings)) &&
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

// Use Crossover's verbose output to extract the path of the game's configured bottle
async function getCrossoverBottleFolder(gameSettings: GameSettings) {
  const command = runWineCommand({
    commandParts: [
      '--bottle',
      gameSettings.wineCrossoverBottle,
      '--verbose', // so it prints the WINEPREFIX env value
      'whoami' // using whoami because we have to call a command
    ],
    gameSettings,
    skipPrefixCheckIKnowWhatImDoing: true
  })

  return command
    .then((result) => {
      // match the `WINEPREFIX = .....` line to extract the bottle folder
      const match = result.stderr.match(/WINEPREFIX = "(.*)"\n/)
      if (match) return match[1]

      return null
    })
    .catch(() => {
      return null
    })
}

async function prepareWineLaunch(
  runner: Runner,
  appName: string
): Promise<{
  success: boolean
  failureReason?: string
  envVars?: Record<string, string>
}> {
  const extendedEnv: Record<string, string> = {}
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

  await verifyWinePrefix(gameSettings)
  const experimentalFeatures =
    GlobalConfig.get().getSettings().experimentalFeatures

  let hasUpdated = false

  let prefixOrBottleFolder: string | null = gameSettings.winePrefix
  if (isMac && gameSettings.wineVersion.type === 'crossover') {
    prefixOrBottleFolder = await getCrossoverBottleFolder(gameSettings)
  }

  // we check this because if the Crossover's bottle is not configured
  // properly, this path will be null
  if (prefixOrBottleFolder) {
    const appsNamesPath = join(prefixOrBottleFolder, 'installed_games')
    if (!existsSync(appsNamesPath)) {
      writeFileSync(appsNamesPath, JSON.stringify([appName]), 'utf-8')
      hasUpdated = true
    } else {
      const installedGames: string[] = JSON.parse(
        readFileSync(appsNamesPath, 'utf-8')
      )
      if (!installedGames.includes(appName)) {
        installedGames.push(appName)
        writeFileSync(appsNamesPath, JSON.stringify(installedGames), 'utf-8')
        hasUpdated = true
      }
    }
  }

  if (hasUpdated) {
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

    await installFixes(appName, runner)
  }

  try {
    if (runner === 'gog' && experimentalFeatures?.cometSupport !== false) {
      const communicationSource = join(
        publicDir,
        'bin/x64/win32/GalaxyCommunication.exe'
      )
      const galaxyWrapper = join(publicDir, 'bin/galaxy.exe')
      const galaxyUnixLib = join(publicDir, 'bin/libgalaxyunixlib.dll.so')

      const galaxyCommPath = 'C:\\ProgramData\\GOG.com\\Galaxy'
      const communicationDest = await getWinePath({
        path: galaxyCommPath,
        gameSettings,
        variant: 'unix'
      })

      const communicationExe = join(
        communicationDest,
        'redists/GalaxyCommunication.exe'
      )
      const galaxyOverlay = join(communicationDest, 'overlay-heroic')

      if (!existsSync(communicationExe)) {
        mkdirSync(dirname(communicationExe), { recursive: true })
        await copyFile(communicationSource, communicationExe)
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
      if (!existsSync(galaxyOverlay)) {
        mkdirSync(galaxyOverlay, { recursive: true })
        await copyFile(galaxyWrapper, join(galaxyOverlay, 'galaxy.exe'))
        await copyFile(
          galaxyUnixLib,
          join(galaxyOverlay, 'libgalaxyunixlib.dll.so')
        )
      }
      extendedEnv['HEROIC_GOGDL_WRAPPER_EXE'] = join(
        galaxyOverlay,
        'galaxy.exe'
      )
    }
  } catch (err) {
    logError(`Failed to install galaxy components into the prefix ${err}`)
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

  return { success: true, envVars: { ...envVars, ...extendedEnv } }
}

export function readKnownFixes(appName: string, runner: Runner) {
  const fixPath = join(fixesPath, `${appName}-${storeMap[runner]}.json`)

  if (!existsSync(fixPath)) return null

  try {
    const fixesContent = JSON.parse(
      readFileSync(fixPath).toString()
    ) as KnowFixesInfo

    return fixesContent
  } catch (error) {
    // if we fail to download the json file, it can be malformed causing
    // JSON.parse to throw an exception
    logWarning(`Known fixes could not be applied, ignoring.\n${error}`)
    return null
  }
}

async function installFixes(appName: string, runner: Runner) {
  const knownFixes = readKnownFixes(appName, runner)

  if (!knownFixes) return

  if (knownFixes.winetricks) {
    sendGameStatusUpdate({
      appName,
      runner: runner,
      status: 'winetricks'
    })

    for (const winetricksPackage of knownFixes.winetricks) {
      await Winetricks.install(runner, appName, winetricksPackage)
    }
  }

  if (knownFixes.runInPrefix) {
    const gameInfo = gameManagerMap[runner].getGameInfo(appName)

    sendGameStatusUpdate({
      appName,
      runner: runner,
      status: 'redist',
      context: 'FIXES'
    })

    for (const filePath of knownFixes.runInPrefix) {
      const fullPath = join(gameInfo.install.install_path!, filePath)
      await runWineCommandOnGame(appName, {
        commandParts: [fullPath],
        wait: true,
        protonVerb: 'run'
      })
    }
  }
}

function getKnownFixesEnvVariables(appName: string, runner: Runner) {
  const knownFixes = readKnownFixes(appName, runner)

  return knownFixes?.envVariables || {}
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
    // add back default wine/dxvk debug logging
    if (gameSettings?.verboseLogs) {
      if (
        !gameSettings?.enviromentOptions.find((env) => env.key === 'WINEDEBUG')
      )
        ret.WINEDEBUG = '+fixme'
      if (
        !gameSettings?.enviromentOptions.find(
          (env) => env.key === 'DXVK_LOG_LEVEL'
        )
      )
        ret.DXVK_LOG_LEVEL = 'info'
      if (
        !gameSettings?.enviromentOptions.find(
          (env) => env.key === 'VKD3D_DEBUG'
        )
      )
        ret.VKD3D_DEBUG = 'fixme'
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

  if (isMac && type === 'toolkit') {
    const isMacOSUpToDate = await isMacSonomaOrHigher()
    const isGPTKCompatible: boolean = isMacOSUpToDate && !isIntelMac
    if (!isGPTKCompatible) {
      return false
    }
  }

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
): Promise<{ res: ExecResult }> {
  const { winePrefix = defaultWinePrefix, wineVersion } = settings

  const isValidWine = await validWine(wineVersion)

  if (!isValidWine) {
    return { res: { stdout: '', stderr: '' } }
  }

  if (wineVersion.type === 'crossover') {
    return { res: { stdout: '', stderr: '' } }
  }

  if (!existsSync(winePrefix) && !(await isUmuSupported(settings))) {
    mkdirSync(winePrefix, { recursive: true })
  }

  // If the registry isn't available yet, things like DXVK installers might fail. So we have to wait on wineboot then
  const systemRegPath =
    wineVersion.type === 'proton'
      ? join(winePrefix, 'pfx', 'system.reg')
      : join(winePrefix, 'system.reg')
  const haveToWait = !existsSync(systemRegPath)

  const command = runWineCommand({
    commandParts: (await isUmuSupported(settings))
      ? ['createprefix']
      : ['wineboot', '--init'],
    wait: haveToWait,
    gameSettings: settings,
    protonVerb: 'run',
    skipPrefixCheckIKnowWhatImDoing: true
  })

  return command
    .then((result) => {
      return { res: result }
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
  gameInstallPath,
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

  const env_vars: Record<string, string> = {
    ...process.env,
    GAMEID: 'umu-0',
    ...setupEnvVars(settings, gameInstallPath),
    ...setupWineEnvVars(settings, installFolderName),
    PROTON_VERB: protonVerb
  }

  if (ignoreLogging) {
    delete env_vars['PROTON_LOG']
  }

  const wineBin = wineVersion.bin.replaceAll("'", '')
  const umuSupported = await isUmuSupported(settings)
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
      '-NoProfile',
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

    if (gameSettings.verboseLogs) {
      child.stdout.on('data', (data) => {
        appendGamePlayLog(gameInfo, data.toString())
      })

      child.stderr.on('data', (data) => {
        appendGamePlayLog(gameInfo, data.toString())
      })
    }

    child.on('error', (err: Error) => {
      if (gameSettings.verboseLogs) {
        appendGamePlayLog(gameInfo, err.message)
        if (err.stack) appendGamePlayLog(gameInfo, err.stack)
      }
      reject(err.message)
    })

    child.on('exit', () => {
      resolve(true)
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
  launchEventCallback,
  getKnownFixesEnvVariables
}
