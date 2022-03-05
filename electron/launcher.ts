// This handles launching games, prefix creation etc..

import i18next from 'i18next'
import { existsSync, mkdirSync } from 'graceful-fs'
import { join } from 'path'

import { isLinux, userHome } from './constants'
import {
  constructAndUpdateRPC,
  execAsync,
  getSteamRuntime,
  isEpicServiceOffline,
  isOnline,
  showErrorBoxModalAuto,
  searchForExecutableOnPath
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
import { GameInfo } from './types'
import {
  ExecResult,
  GameSettings,
  LaunchPreperationResult,
  RpcClient,
  WineInstallation
} from './types'

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
      mangoHudCommand = `'${mangoHudBin}' --dlsym`
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
  if (gameSettings.useSteamRuntime) {
    const runtime = getSteamRuntime()
    if (!runtime.path) {
      logWarning(`Couldn't find a valid Steam runtime path`, LogPrefix.Backend)
    } else {
      logInfo(`Using ${runtime.type} Steam runtime`, LogPrefix.Backend)
      steamRuntime = `'${runtime.path}'`
    }
  }

  return {
    success: true,
    rpcClient: rpcClient,
    mangoHudCommand: mangoHudCommand,
    gameModeBin: gameModeBin,
    steamRuntime: steamRuntime
  }
}

async function prepareWineLaunch(
  game: LegendaryGame | GOGGame
): Promise<{ success: boolean; failureReason?: string; envVars?: string }> {
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

  const { updated: winePrefixUpdated } = await verifyWinePrefix(game)
  if (winePrefixUpdated) {
    logInfo(
      ['Created/Updated Wineprefix at', gameSettings.winePrefix],
      LogPrefix.Backend
    )
    setup(game.appName)
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

  const envVars = setupWineEnvVars(gameSettings)

  return { success: true, envVars: envVars }
}

/**
 * Maps general settings to environment variables
 * @param gameSettings The GameSettings to get the environment variables for
 * @returns A big string of environment variables, structured key=value
 */
function setupEnvVars(
  gameSettings: GameSettings,
  mangoHudCommand: string,
  gameModeBin: string,
  steamRuntime: string
): string {
  const appliedEnvVars = new Array<string>()
  const envVarsList: Array<{ toggle: boolean; value: string }> = [
    { toggle: gameSettings.showMangohud, value: mangoHudCommand },
    { toggle: gameSettings.useGameMode, value: gameModeBin },
    {
      toggle: gameSettings.nvidiaPrime,
      value:
        'DRI_PRIME=1 __NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia'
    },
    { toggle: gameSettings.audioFix, value: 'PULSE_LATENCY_MSEC=60' },
    { toggle: gameSettings.useSteamRuntime, value: steamRuntime }
  ]

  envVarsList.forEach(({ toggle, value }) => {
    if (toggle) {
      appliedEnvVars.push(value)
    }
  })

  return appliedEnvVars.filter((n) => n).join(' ')
}

/**
 * Maps Wine-related settings to environment variables
 * @param gameSettings The GameSettings to get the environment variables for
 * @returns A big string of environment variables, structured key=value
 */
function setupWineEnvVars(gameSettings: GameSettings): string {
  const { wineVersion } = gameSettings
  const appliedEnvVars = new Array<string>()
  // toggle -> Env var is "enabled"; value -> What gets inserted when it's enabled
  const envVarsList: Array<{ toggle: boolean; value: string }> = [
    {
      toggle:
        gameSettings.wineCrossoverBottle && wineVersion.type === 'crossover',
      value: `CX_BOTTLE=${gameSettings.wineCrossoverBottle}`
    },
    { toggle: gameSettings.showFps, value: 'DXVK_HUD=fps' },
    {
      toggle: gameSettings.enableFSR,
      value: `WINE_FULLSCREEN_FSR=1 WINE_FULLSCREEN_FSR_STRENGTH=${gameSettings.maxSharpness}`
    },
    { toggle: gameSettings.enableEsync, value: 'WINEESYNC=1' },
    { toggle: gameSettings.enableFsync, value: 'WINEFSYNC=1' },
    {
      toggle: gameSettings.enableResizableBar,
      value: 'VKD3D_CONFIG=upload_hvv'
    },
    {
      toggle: wineVersion.type === 'proton',
      value: getWineEnvSetup(wineVersion, gameSettings.winePrefix)
    },
    {
      toggle: Boolean(gameSettings.otherOptions),
      value: gameSettings.otherOptions
    }
  ]
  // Go through all possible settings, check if they're set, and store them if they are
  envVarsList.forEach(({ toggle, value }) => {
    if (toggle) {
      appliedEnvVars.push(value)
    }
  })
  // Join all applied settings together and return them
  return appliedEnvVars.filter((n) => n).join(' ')
}

/**
 * Verifies that a Wineprefix exists by running 'wineboot --init'
 * @param game The game to verify the Wineprefix of
 * @returns stderr & stdout of 'wineboot --init'
 */
async function verifyWinePrefix(
  game: LegendaryGame | GOGGame
): Promise<{ res: ExecResult; updated: boolean }> {
  const { winePrefix } = await game.getSettings()

  if (!existsSync(winePrefix)) {
    mkdirSync(winePrefix, { recursive: true })
  }

  return game
    .runWineCommand('wineboot --init', '', true)
    .then((result) => {
      // This is kinda hacky
      const wasUpdated = result.stderr.includes('has been updated')
      return { res: result, updated: wasUpdated }
    })
    .catch((error) => {
      logError(['Unable to create Wineprefix: ', error], LogPrefix.Backend)
      return { res: { stderr: error, stdout: '' }, updated: false }
    })
}

/**
 * Returns appropriate environment variables for running either a Wine or Proton command
 * @returns The required environment variables (WINEPREFIX=... or STEAM_COMPAT_DATA_PATH=...)
 */
function getWineEnvSetup(wineVersion: WineInstallation, winePrefix: string) {
  if (wineVersion.type === 'proton') {
    const steamInstallPath = join(userHome, '.steam', 'steam')
    return `STEAM_COMPAT_CLIENT_INSTALL_PATH=${steamInstallPath} STEAM_COMPAT_DATA_PATH='${winePrefix}'`
  }
  return `WINEPREFIX=${winePrefix}`
}

/**
 * @param command The command to run, will be joined together with spaces
 * @param rpcClient A Discord Rich Presence Client, gets disconnected after the command exits
 * @returns Success, Stderr: Self-explanatory, commandString: Formatted command as it was executed
 */
async function wrappedLaunch(
  command: string[],
  rpcClient: RpcClient
): Promise<{ success: boolean; stderr: string; commandString: string }> {
  const commandString = command.filter((n) => n).join(' ')
  logInfo(['Launching game! Launch command:', commandString], LogPrefix.Backend)
  return execAsync(commandString)
    .then(({ stderr }) => {
      if (rpcClient) {
        rpcClient.disconnect()
        logInfo('Stopped Discord Rich Presence', LogPrefix.Backend)
      }
      return {
        success: true,
        stderr: stderr,
        commandString: commandString
      }
    })
    .catch((error) => {
      logError(error, LogPrefix.Backend)
      return {
        success: false,
        stderr: error,
        commandString: commandString
      }
    })
}

async function runWineCommand(
  gameSettings: GameSettings,
  command: string,
  altWineBin: string,
  wait: boolean
) {
  const { wineVersion, winePrefix } = gameSettings

  const env_vars = getWineEnvSetup(wineVersion, winePrefix)

  let additional_command = ''
  let wineBin = wineVersion.bin
  if (wineVersion.type === 'proton') {
    command = 'run ' + command
    // TODO: Respect 'wait' here. Not sure if Proton can even do that
  } else {
    // This is only allowed for Wine since Proton only has one binary (the 'proton' script)
    if (altWineBin) {
      wineBin = altWineBin
    }
    // Can't wait if we don't have a Wineserver
    if (wait) {
      if (wineVersion.wineserver) {
        additional_command = `${env_vars} ${wineVersion.wineserver} --wait`
      } else {
        logWarning(
          'Unable to wait on Wine command, no Wineserver!',
          LogPrefix.Backend
        )
      }
    }
  }

  let finalCommand = `${env_vars} ${wineBin} ${command}`
  if (additional_command) {
    finalCommand += ` && ${additional_command}`
  }

  logDebug(['Running Wine command:', finalCommand], LogPrefix.Legendary)
  return execAsync(finalCommand)
    .then((response) => {
      logDebug(['Ran Wine command:', finalCommand], LogPrefix.Legendary)
      return response
    })
    .catch((error) => {
      logError(['Error running Wine command:', error], LogPrefix.Legendary)
      return { stderr: error, stdout: '' }
    })
}

export {
  prepareLaunch,
  wrappedLaunch,
  getWineEnvSetup,
  prepareWineLaunch,
  setupEnvVars,
  setupWineEnvVars,
  runWineCommand
}
