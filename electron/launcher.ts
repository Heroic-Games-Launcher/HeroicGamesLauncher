// This handles launching games, prefix creation etc..

import { dialog } from 'electron'
import makeClient from 'discord-rich-presence-typescript'
import i18next from 'i18next'
import { existsSync, mkdirSync } from 'graceful-fs'
import {
  isWindows,
  isMac,
  isLinux,
  home,
  execOptions,
  legendaryBin,
  gogdlBin,
  steamCompatFolder
} from './constants'
import { execAsync, isEpicServiceOffline, isOnline } from './utils'
import { logError, logInfo, LogPrefix, logWarning } from './logger/logger'
import { GlobalConfig } from './config'
import { GameConfig } from './game_config'
import { DXVK } from './dxvk'
import { Runner } from './types'
import { GOGLibrary } from './gog/library'
import { LegendaryLibrary } from './legendary/library'
import setup from './gog/setup'

function getGameInfo(appName: string, runner: Runner) {
  switch (runner) {
    case 'legendary':
      return LegendaryLibrary.get().getGameInfo(appName)
    case 'gog':
      return GOGLibrary.get().getGameInfo(appName)
    default:
      throw Error(`Launching ${runner} is not implemented`)
  }
}

async function launch(
  appName: string,
  launchArguments?: string,
  runner: Runner = 'legendary'
) {
  const isLegendary = runner == 'legendary'
  const isGOG = runner == 'gog'
  //   const isExternal = runner == 'heroic'
  const epicOffline = isLegendary && (await isEpicServiceOffline())
  const isOffline = isLegendary && (!(await isOnline()) || epicOffline)
  let envVars = ''
  let gameMode: string
  const gameSettings =
    GameConfig.get(appName).config ||
    (await GameConfig.get(appName).getSettings())
  const gameInfo = await getGameInfo(appName, runner)

  const {
    winePrefix,
    wineVersion,
    wineCrossoverBottle,
    otherOptions,
    useGameMode,
    showFps,
    nvidiaPrime,
    launcherArgs = '',
    showMangohud,
    audioFix,
    autoInstallDxvk,
    offlineMode,
    enableFSR,
    maxSharpness,
    enableResizableBar,
    enableEsync,
    enableFsync,
    targetExe,
    useSteamRuntime
  } = gameSettings

  const { discordRPC } = await GlobalConfig.get().getSettings()
  const DiscordRPC = discordRPC ? makeClient('852942976564723722') : null
  let runOffline = ''
  if (isOffline || offlineMode) {
    if (gameInfo.canRunOffline) {
      runOffline = '--offline'
    } else {
      dialog.showErrorBox(
        i18next.t(
          'box.error.no-offline-mode.title',
          'Offline mode not supported.'
        ),
        i18next.t(
          'box.error.no-offline-mode.message',
          'Launch aborted! The game requires a internet connection to run it.'
        )
      )
      return
    }
  }
  const exe = targetExe && isLegendary ? `--override-exe ${targetExe}` : ''
  const isMacNative = gameInfo.is_mac_native
  // const isLinuxNative = gameInfo.is_linux_native
  const mangohud = showMangohud ? 'mangohud --dlsym' : ''
  let runWithGameMode = ''
  if (discordRPC) {
    // Show DiscordRPC
    // This seems to run when a game is updated, even though the game doesn't start after updating.
    let os: string

    switch (process.platform) {
      case 'linux':
        os = 'Linux'
        break
      case 'win32':
        os = 'Windows'
        break
      case 'darwin':
        os = 'macOS'
        break
      default:
        os = 'Unknown OS'
        break
    }

    logInfo('Updating Discord Rich Presence information...', LogPrefix.Backend)
    DiscordRPC.updatePresence({
      details: gameInfo.title,
      instance: true,
      largeImageKey: 'icon',
      large_text: gameInfo.title,
      startTimestamp: Date.now(),
      state: 'via Heroic on ' + os
    })
  }
  if (isLinux) {
    // check if Gamemode is installed
    await execAsync(`which gamemoderun`)
      .then(({ stdout }) => (gameMode = stdout.split('\n')[0]))
      .catch(() => logWarning('GameMode not installed', LogPrefix.Backend))

    runWithGameMode = useGameMode && gameMode ? gameMode : ''
  }
  if (
    isWindows ||
    (isMac && isMacNative) ||
    (isLinux && gameInfo.install.platform == 'linux')
  ) {
    let command = ''
    if (runner == 'legendary') {
      command = `${legendaryBin} launch ${appName} ${exe} ${runOffline} ${
        launchArguments ?? ''
      } ${launcherArgs}`
      logInfo(['Launch Command:', command], LogPrefix.Legendary)
    } else if (runner == 'gog') {
      // MangoHud,Gamemode, nvidia prime, audio fix can be used in Linux native titles
      if (isLinux) {
        let steamRuntime: string
        // Finds a existing runtime path wether it's flatpak or not and set's a variable
        if (useSteamRuntime) {
          const nonFlatpakPath =
            '~/.local/share/Steam/ubuntu12_32/steam-runtime/run.sh'.replace(
              '~',
              home
            )
          const FlatpakPath =
            '~/.var/app/com.valvesoftware.Steam/data/Steam/ubuntu12_32/steam-runtime/run.sh'.replace(
              '~',
              home
            )

          if (existsSync(nonFlatpakPath)) {
            // Escape path in quotes to avoid issues with spaces
            steamRuntime = `"${nonFlatpakPath}"`
            logInfo(
              ['Using non flatpak Steam runtime', steamRuntime],
              LogPrefix.Backend
            )
          } else if (existsSync(FlatpakPath)) {
            steamRuntime = `"${FlatpakPath}"`
            logInfo(
              ['Using flatpak Steam runtime', steamRuntime],
              LogPrefix.Backend
            )
          } else {
            logWarning("Couldn't find a valid runtime path", LogPrefix.Backend)
          }
        }
        const options = [
          mangohud,
          runWithGameMode,
          nvidiaPrime
            ? 'DRI_PRIME=1 __NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia'
            : '',
          audioFix ? `PULSE_LATENCY_MSEC=60` : '',
          // This must be always last
          steamRuntime
        ].filter((n) => n)
        envVars = options.join(' ')
      }
      command = `${envVars} ${gogdlBin} launch "${
        gameInfo.install.install_path
      }" ${gameInfo.app_name} --platform=${gameInfo.install.platform} ${
        launchArguments ?? ''
      } ${launcherArgs}`
      logInfo(['Launch Command:', command], LogPrefix.Gog)
    }

    return await execAsync(command, execOptions).then(({ stderr }) => {
      if (discordRPC) {
        logInfo(
          'Stopping Discord Rich Presence if running...',
          LogPrefix.Backend
        )
        DiscordRPC.disconnect()
        logInfo('Stopped Discord Rich Presence.', LogPrefix.Backend)
      }

      return { stderr, command, gameSettings }
    })
  }

  if (!wineVersion.bin) {
    dialog.showErrorBox(
      i18next.t('box.error.wine-not-found.title', 'Wine Not Found'),
      i18next.t(
        'box.error.wine-not-found.message',
        'No Wine Version Selected. Check Game Settings!'
      )
    )
  }

  const fixedWinePrefix = winePrefix.replace('~', home)
  let wineCommand = `--wine ${wineVersion.bin}`

  // We need to keep replacing the ' to keep compatibility with old configs
  let prefix = `--wine-prefix '${fixedWinePrefix.replaceAll("'", '')}'`

  const isProton =
    wineVersion.name.includes('Proton') || wineVersion.name.includes('Steam')
  const isCrossover = wineVersion.name.includes('CrossOver')
  prefix = isProton || isCrossover ? '' : prefix
  const x = wineVersion.bin.split('/')
  x.pop()
  const winePath = x.join('/').replaceAll("'", '')
  const options = {
    audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
    crossoverBottle:
      isCrossover && wineCrossoverBottle != ''
        ? `CX_BOTTLE=${wineCrossoverBottle}`
        : '',
    fps: showFps ? `DXVK_HUD=fps` : '',
    fsr: enableFSR ? 'WINE_FULLSCREEN_FSR=1' : '',
    esync: enableEsync ? 'WINEESYNC=1' : '',
    fsync: enableFsync ? 'WINEFSYNC=1' : '',
    sharpness: enableFSR ? `WINE_FULLSCREEN_FSR_STRENGTH=${maxSharpness}` : '',
    resizableBar: enableResizableBar ? `VKD3D_CONFIG=upload_hvv` : '',
    other: otherOptions ? otherOptions : '',
    prime: nvidiaPrime
      ? 'DRI_PRIME=1 __NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia'
      : '',
    proton: isProton
      ? `STEAM_COMPAT_CLIENT_INSTALL_PATH=${steamCompatFolder} STEAM_COMPAT_DATA_PATH='${winePrefix
          .replaceAll("'", '')
          .replace('~', home)}'`
      : ''
  }

  envVars = Object.values(options)
    .filter((n) => n)
    .join(' ')
  if (isProton) {
    logWarning(
      [
        `You are using Proton, this can lead to some bugs,
          please do not open issues with bugs related with games`,
        wineVersion.name
      ],
      LogPrefix.Backend
    )
  }

  await createNewPrefix(isProton, fixedWinePrefix, winePath, appName)

  // Install DXVK for non Proton/CrossOver Prefixes
  if (!isProton && !isCrossover && autoInstallDxvk) {
    await DXVK.installRemove(winePrefix, wineVersion.bin, 'dxvk', 'backup')
  }

  if (wineVersion.name !== 'Wine Default') {
    const { bin } = wineVersion
    wineCommand = isProton
      ? `--no-wine --wrapper "${bin} run"`
      : `--wine ${bin}`
  }

  let command = ''
  if (isLegendary) {
    command = [
      envVars,
      runWithGameMode,
      mangohud,
      legendaryBin,
      'launch',
      appName,
      exe,
      runOffline,
      wineCommand,
      prefix,
      launchArguments,
      launcherArgs
    ]
      .filter((n) => n)
      .join(' ')
    logInfo(['Launch Command:', command], LogPrefix.Legendary)
  } else if (isGOG) {
    command = [
      envVars,
      runWithGameMode,
      mangohud,
      gogdlBin,
      'launch',
      `"${gameInfo.install.install_path}"`,
      exe,
      appName,
      wineCommand,
      prefix,
      '--os',
      gameInfo.install.platform.toLowerCase(),
      launchArguments,
      launcherArgs
    ]
      .filter((n) => n)
      .join(' ')
    logInfo(['Launch Command:', command], LogPrefix.Gog)
  }

  const startLaunch = await execAsync(command, execOptions)
    .then(({ stderr }) => {
      if (discordRPC) {
        logInfo(
          'Stopping Discord Rich Presence if running...',
          LogPrefix.Backend
        )
        DiscordRPC.disconnect()
        logInfo('Stopped Discord Rich Presence.', LogPrefix.Backend)
      }
      return { stderr, command, gameSettings }
    })
    .catch((error) => {
      logError(`${error}`, LogPrefix.Legendary)
      const { stderr } = error
      return { stderr, command, gameSettings }
    })
  return startLaunch
}

async function createNewPrefix(
  isProton: boolean,
  fixedWinePrefix: string,
  winePath: string,
  appName: string
) {
  if (isMac) {
    return
  }

  if (isProton && !existsSync(fixedWinePrefix)) {
    mkdirSync(fixedWinePrefix, { recursive: true })
    await setup(appName)
  }

  if (!existsSync(fixedWinePrefix)) {
    mkdirSync(fixedWinePrefix, { recursive: true })
    const initPrefixCommand = `WINEPREFIX='${fixedWinePrefix}' '${winePath}/wineboot' -i &&  '${winePath}/wineserver' --wait`
    logInfo(['creating new prefix', fixedWinePrefix], LogPrefix.Backend)
    return execAsync(initPrefixCommand)
      .then(async () => {
        logInfo('Prefix created succesfuly!', LogPrefix.Backend)
        await setup(appName)
      })
      .catch((error) => logError(`${error}`, LogPrefix.Backend))
  }
}

export { launch }
