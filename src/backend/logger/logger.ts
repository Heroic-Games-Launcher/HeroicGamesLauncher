/**
 * @file  Use this module to log things into the console or a file.
 *        Everything will be saved to a file before the app exits.
 *        Note that with console.log and console.warn everything will be saved too.
 *        error equals console.error
 */
import {
  AppSettings,
  GameInfo,
  GameScopeSettings,
  GameSettings,
  Runner
} from 'common/types'
import { showDialogBoxModalAuto } from '../dialog/dialog'
import { appendMessageToLogFile, getLongestPrefix } from './logfile'
import { backendEvents } from 'backend/backend_events'
import { GlobalConfig } from 'backend/config'
import { getGOGdlBin, getLegendaryBin } from 'backend/utils'
import { dirname, join } from 'path'
import {
  formatSystemInfo,
  getSystemInfo,
  SystemInformation
} from '../utils/systeminfo'
import { appendFile, writeFile } from 'fs/promises'
import { gamesConfigPath, isLinux, isMac, isWindows } from 'backend/constants'
import { gameManagerMap } from 'backend/storeManagers'
import { existsSync, mkdirSync, openSync } from 'graceful-fs'
import { Winetricks } from 'backend/tools'
import { gameAnticheatInfo } from 'backend/anticheat/utils'
import { isUmuSupported } from 'backend/utils/compatibility_layers'

export enum LogPrefix {
  General = '',
  Legendary = 'Legendary',
  Gog = 'Gog',
  Nile = 'Nile',
  WineDownloader = 'WineDownloader',
  DXVKInstaller = 'DXVKInstaller',
  GlobalConfig = 'GlobalConfig',
  GameConfig = 'GameConfig',
  ProtocolHandler = 'ProtocolHandler',
  Frontend = 'Frontend',
  Backend = 'Backend',
  Runtime = 'Runtime',
  Shortcuts = 'Shortcuts',
  WineTricks = 'Winetricks',
  Connection = 'Connection',
  DownloadManager = 'DownloadManager',
  ExtraGameInfo = 'ExtraGameInfo',
  Sideload = 'Sideload',
  LogUploader = 'LogUploader'
}

export const RunnerToLogPrefixMap = {
  legendary: LogPrefix.Legendary,
  gog: LogPrefix.Gog,
  sideload: LogPrefix.Sideload
}

type LogInputType = unknown

interface LogOptions {
  prefix?: LogPrefix
  showDialog?: boolean
  skipLogToFile?: boolean
  forceLog?: boolean
}

// global variable to use by logBase
export let logsDisabled = false

export function initLogger() {
  // Add a basic error handler to our stdout/stderr. If we don't do this,
  // the main `process.on('uncaughtException', ...)` handler catches them (and
  // presents an error message to the user, which is hardly necessary for
  // "just" failing to write to the streams)
  for (const channel of ['stdout', 'stderr'] as const) {
    process[channel].once('error', (error: Error) => {
      const prefix = `${getTimeStamp()} ${getLogLevelString(
        'ERROR'
      )} ${getPrefixString(LogPrefix.Backend)}`
      appendMessageToLogFile(
        `${prefix} Error writing to ${channel}: ${error.stack}`
      )
      process[channel].on('error', () => {
        // Silence further write errors
      })
    })
  }

  // check `disableLogs` setting
  const { disableLogs } = GlobalConfig.get().getSettings()

  logsDisabled = disableLogs

  if (logsDisabled) {
    logWarning(
      'IMPORTANT: Logs are disabled. Enable logs before reporting any issue.',
      {
        forceLog: true
      }
    )
  }

  // log important information: binaries, system specs
  getSystemInfo()
    .then(formatSystemInfo)
    .then((systemInfo) => {
      logInfo(`\nSystem Information:\n${systemInfo}\n`, {
        prefix: LogPrefix.Backend,
        forceLog: true
      })
    })
    .catch((error) =>
      logError(['Failed to fetch system information', error], LogPrefix.Backend)
    )

  logInfo(['Legendary location:', join(...Object.values(getLegendaryBin()))], {
    prefix: LogPrefix.Legendary,
    forceLog: true
  })
  logInfo(['GOGDL location:', join(...Object.values(getGOGdlBin()))], {
    prefix: LogPrefix.Gog,
    forceLog: true
  })

  // listen to the settingChanged event, log change and enable/disable logging if needed
  backendEvents.on('settingChanged', ({ key, oldValue, newValue }) => {
    logInfo(
      `Heroic: Setting ${key} to ${JSON.stringify(
        newValue
      )} (previous value: ${JSON.stringify(oldValue)})`,
      { forceLog: true }
    )

    if (key === 'disableLogs') {
      logsDisabled = newValue as boolean
    }
  })
}

// helper to convert LogInputType to string
function convertInputToString(param: LogInputType): string {
  const getString = (value: LogInputType): string => {
    switch (typeof value) {
      case 'string':
        return value
      case 'object':
        // Object.prototype.toString.call(value).includes('Error') will catch all
        // Error types (Error, EvalError, SyntaxError, ...)
        if (Object.prototype.toString.call(value).includes('Error')) {
          return value!['stack'] ? value!['stack'] : value!.toString()
        } else if (Object.prototype.toString.call(value).includes('Object')) {
          return JSON.stringify(value, null, 2)
        } else {
          return `${value}`
        }
      case 'number':
        return String(value)
      case 'boolean':
        return value ? 'true' : 'false'
      default:
        return `${value}`
    }
  }

  if (!Array.isArray(param)) {
    return getString(param)
  }

  const strings: string[] = []
  param.forEach((value) => {
    strings.push(getString(value))
  })
  return strings.join(' ')
}

const padNumberToTwo = (n: number) => {
  return ('0' + n).slice(-2)
}

const repeatString = (n: number, char: string) => {
  return n > 0 ? char.repeat(n) : ''
}

const getTimeStamp = () => {
  const ts = new Date()

  return `(${[
    padNumberToTwo(ts.getHours()),
    padNumberToTwo(ts.getMinutes()),
    padNumberToTwo(ts.getSeconds())
  ].join(':')})`
}

const getLogLevelString = (level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR') => {
  return `${level}:${repeatString(7 - level.length, ' ')}`
}

const getPrefixString = (prefix: LogPrefix) => {
  return prefix !== LogPrefix.General
    ? `[${prefix}]: ${repeatString(getLongestPrefix() - prefix.length, ' ')}`
    : ''
}

function logBase(
  input: LogInputType,
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR',
  options_or_prefix?: LogOptions | LogPrefix
) {
  let options
  if (typeof options_or_prefix === 'string') {
    options = { prefix: options_or_prefix }
  } else {
    options = options_or_prefix
  }

  if (logsDisabled && !options?.forceLog) return

  const text = convertInputToString(input)
  const messagePrefix = `${getTimeStamp()} ${getLogLevelString(
    level
  )} ${getPrefixString(options?.prefix ?? LogPrefix.Backend)}`

  switch (level) {
    case 'ERROR':
      console.error(messagePrefix, ...(Array.isArray(input) ? input : [input]))
      break
    case 'WARNING':
      console.warn(messagePrefix, ...(Array.isArray(input) ? input : [input]))
      break
    case 'INFO':
    case 'DEBUG':
    default:
      console.log(messagePrefix, ...(Array.isArray(input) ? input : [input]))
      break
  }

  if (options?.showDialog) {
    showDialogBoxModalAuto({
      title: options?.prefix ?? LogPrefix.Backend,
      message: text,
      type: 'ERROR'
    })
  }

  if (!options?.skipLogToFile) {
    appendMessageToLogFile(`${messagePrefix} ${text}`)
  }
}

/**
 * Log debug messages
 * @param input debug messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logDebug(input: LogInputType, options?: LogOptions): void
export function logDebug(input: LogInputType, prefix?: LogPrefix): void
export function logDebug(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'DEBUG', options_or_prefix)
}

/**
 * Log error messages
 * @param input error messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logError(input: LogInputType, options?: LogOptions): void
export function logError(input: LogInputType, prefix?: LogPrefix): void
export function logError(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'ERROR', options_or_prefix)
}

/**
 * Log info messages
 * @param input info messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logInfo(input: LogInputType, options?: LogOptions): void
export function logInfo(input: LogInputType, prefix?: LogPrefix): void
export function logInfo(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'INFO', options_or_prefix)
}

/**
 * Log warning messages
 * @param input warning messages to log
 * @param prefix added before the message {@link LogPrefix}
 * @param skipLogToFile set true to not log to file
 * @param showDialog set true to show in frontend
 * @defaultvalue {@link LogPrefix.General}
 */
export function logWarning(input: LogInputType, options?: LogOptions): void
export function logWarning(input: LogInputType, prefix?: LogPrefix): void
export function logWarning(
  input: LogInputType,
  options_or_prefix?: LogOptions | LogPrefix
) {
  logBase(input, 'WARNING', options_or_prefix)
}

export function logChangedSetting(
  config: Partial<AppSettings>,
  oldConfig: GameSettings
) {
  const changedSettings = Object.keys(config).filter(
    (key) => config[key] !== oldConfig[key]
  )

  changedSettings.forEach((changedSetting) => {
    // check if both are empty arrays
    if (
      Array.isArray(config[changedSetting]) &&
      Array.isArray(oldConfig[changedSetting]) &&
      config[changedSetting].length === 0 &&
      oldConfig[changedSetting].length === 0
    ) {
      return
    }

    // check if both are objects and have different values
    if (
      typeof config[changedSetting] === 'object' &&
      typeof oldConfig[changedSetting] === 'object' &&
      JSON.stringify(config[changedSetting]) ===
        JSON.stringify(oldConfig[changedSetting])
    ) {
      return
    }

    const oldSetting =
      typeof oldConfig[changedSetting] === 'object'
        ? JSON.stringify(oldConfig[changedSetting])
        : oldConfig[changedSetting]
    const newSetting =
      typeof config[changedSetting] === 'object'
        ? JSON.stringify(config[changedSetting])
        : config[changedSetting]

    logInfo(
      `Changed config: ${changedSetting} from ${oldSetting} to ${newSetting}`,
      LogPrefix.Backend
    )
  })
}

export function lastPlayLogFileLocation(appName: string) {
  return join(gamesConfigPath, `${appName}-lastPlay.log`)
}

export function logFileLocation(appName: string) {
  return join(gamesConfigPath, `${appName}.log`)
}

const logsWriters: Record<string, LogWriter> = {}

// Base abstract class for all LogWriters
class LogWriter {
  queue: (string | Promise<string | string[]>)[]
  initialized: boolean
  filePath: string
  timeoutId: NodeJS.Timeout | undefined
  processing: boolean

  constructor() {
    this.initialized = false
    this.queue = []
    this.filePath = ''
    this.processing = false

    if (new.target === LogWriter) {
      throw new Error('LogWriter is an abstract class')
    }
  }

  /**
   * Append a message to the queue
   * @param message string or promise that returns a string or string[]
   */
  logMessage(message: string | Promise<string | string[]>) {
    // push messages to append to the log
    this.queue.push(message)

    // if the logger is initialized and we don't have a timeout
    // and we are not proccesing the previous batch, write a new batch
    //
    // otherwise it means there's a timeout already running that will
    // write the elements in the queue in a second or that we are processing
    // promises
    if (this.initialized && !this.processing && !this.timeoutId)
      this.appendMessages()
  }

  async appendMessages() {
    const itemsInQueue = this.queue

    // clear pending message if any
    this.queue = []

    // clear timeout if any
    delete this.timeoutId

    if (!itemsInQueue?.length) return

    this.processing = true

    // process items in queue, if they are promises we wait
    // for them so we can write them in the right order
    let messagesToWrite: string[] = []
    for (const item of itemsInQueue) {
      try {
        let result = await item

        // support promises returning a string or an array of strings
        result = Array.isArray(result) ? result : [result]

        messagesToWrite = messagesToWrite.concat(result)
      } catch (error) {
        logError(error, LogPrefix.Backend)
      }
    }

    this.processing = false

    // if we have messages, write them and check again in 1 second
    // we start the timeout before writing so we don't wait until
    // the disk write
    this.timeoutId = setTimeout(async () => this.appendMessages(), 1000)

    try {
      await appendFile(this.filePath, messagesToWrite.join(''))
    } catch (error) {
      // ignore failures if messages could not be written
    }
  }

  async initLog() {
    if (this.filePath) {
      try {
        const dir = dirname(this.filePath)
        if (dir && !existsSync(dir)) {
          mkdirSync(dir)
        }
        openSync(this.filePath, 'w')
        this.initialized = true
      } catch (error) {
        logError([`Open ${this.filePath} failed with`, error], {
          prefix: LogPrefix?.Backend,
          skipLogToFile: true
        })
      }
    }
  }
}

/*
 * If we are running on a SteamDeck's gaming mode and the game is configured to use umu,
 * we can check the availability of the env variables added by Steam's Shared Pre-cache
 * that are required by umu to work properly
 *
 * More details: https://github.com/Open-Wine-Components/umu-launcher/wiki/Frequently-asked-questions-(FAQ)#why-am-i-not-able-to-see-my-game-when-using-my-launcher-from-steam-mode-gaming-mode
 */
const shouldToggleShaderPreCacheOn = async (
  info: SystemInformation | null,
  gameSettings: GameSettings
) => {
  if (!info) return false
  if (!info.steamDeckInfo.isDeck) return false
  if (info.steamDeckInfo.mode !== 'game') return false
  if (!(await isUmuSupported(gameSettings))) return false

  // check if all of the following env variables are undefined
  return [
    'STEAM_COMPAT_TRANSCODED_MEDIA_PATH',
    'STEAM_COMPAT_MEDIA_PATH',
    'STEAM_FOSSILIZE_DUMP_PATH',
    'DXVK_STATE_CACHE_PATH'
  ].every((envVar) => !process.env[envVar])
}

class GameLogWriter extends LogWriter {
  gameInfo: GameInfo

  constructor(gameInfo: GameInfo) {
    super()
    this.gameInfo = gameInfo
    this.filePath = lastPlayLogFileLocation(gameInfo.app_name)
  }

  // cleanup settings for logs to avoid confusions during support requests
  filterGameSettingsForLog(
    gameSettings: Partial<GameSettings>,
    notNative: boolean
  ): Partial<GameSettings> {
    // remove gamescope settings if it's disabled
    const gscope: Partial<GameScopeSettings> | undefined =
      gameSettings.gamescope
    if (gscope) {
      if (!gscope.enableLimiter) {
        delete gscope.fpsLimiter
        delete gscope.fpsLimiterNoFocus
      }
      if (!gscope.enableUpscaling) {
        delete gscope.upscaleMethod
        delete gscope.upscaleHeight
        delete gscope.upscaleWidth
        delete gscope.gameHeight
        delete gscope.gameWidth
        delete gscope.windowType
      }
    }

    // remove settings that are not used on Linux
    if (isLinux) {
      delete gameSettings.enableMsync
      delete gameSettings.wineCrossoverBottle

      if (notNative) {
        const wineVersion = gameSettings.wineVersion
        if (wineVersion) {
          if (wineVersion.type === 'proton') {
            delete gameSettings.autoInstallDxvk
            delete gameSettings.autoInstallVkd3d
          }
        }
      } else {
        // remove settings that are not used on native Linux games
        delete gameSettings.wineVersion
        delete gameSettings.winePrefix
        delete gameSettings.autoInstallDxvk
        delete gameSettings.autoInstallDxvkNvapi
        delete gameSettings.autoInstallVkd3d
        delete gameSettings.enableFsync
        delete gameSettings.enableEsync
        delete gameSettings.enableFSR
        delete gameSettings.showFps
        delete gameSettings.enableDXVKFpsLimit
        delete gameSettings.eacRuntime
        delete gameSettings.battlEyeRuntime
        delete gameSettings.useGameMode
      }
    }

    // remove settings that are not used on Mac
    if (isMac) {
      delete gameSettings.useGameMode
      delete gameSettings.gamescope
      delete gameSettings.nvidiaPrime
      delete gameSettings.battlEyeRuntime
      delete gameSettings.eacRuntime
      delete gameSettings.enableFSR
      delete gameSettings.showMangohud
      delete gameSettings.showFps
      delete gameSettings.disableUMU

      if (notNative) {
        const wineType = gameSettings.wineVersion
        if (wineType) {
          if (wineType.type === 'wine') {
            delete gameSettings.wineCrossoverBottle
          }

          if (wineType.type === 'toolkit') {
            delete gameSettings.autoInstallDxvk
            delete gameSettings.autoInstallDxvkNvapi
            delete gameSettings.autoInstallVkd3d
          }

          if (wineType.type === 'crossover') {
            delete gameSettings.autoInstallDxvk
            delete gameSettings.autoInstallDxvkNvapi
            delete gameSettings.autoInstallVkd3d
          }
        }

        delete gameSettings.wineVersion
        delete gameSettings.winePrefix
      } else {
        // remove settings that are not used on native Mac games
        delete gameSettings.enableDXVKFpsLimit
        delete gameSettings.wineVersion
        delete gameSettings.winePrefix
        delete gameSettings.wineCrossoverBottle
      }
    }

    // remove settings that are not used on Windows
    if (isWindows) {
      delete gameSettings.enableMsync
      delete gameSettings.enableFSR
      delete gameSettings.enableEsync
      delete gameSettings.enableFsync
      delete gameSettings.enableDXVKFpsLimit
      delete gameSettings.DXVKFpsCap
      delete gameSettings.autoInstallDxvk
      delete gameSettings.autoInstallDxvkNvapi
      delete gameSettings.autoInstallVkd3d
      delete gameSettings.gamescope
      delete gameSettings.useGameMode
      delete gameSettings.showMangohud
      delete gameSettings.showFps
      delete gameSettings.preferSystemLibs
      delete gameSettings.wineCrossoverBottle
      delete gameSettings.winePrefix
      delete gameSettings.wineVersion
      delete gameSettings.battlEyeRuntime
      delete gameSettings.eacRuntime
      delete gameSettings.nvidiaPrime
      delete gameSettings.disableUMU
    }

    return gameSettings
  }

  async initLog() {
    const { app_name, runner } = this.gameInfo

    const notNative =
      ['windows', 'Windows', 'Win32'].includes(
        this.gameInfo.install.platform || ''
      ) && !isWindows

    // init log file and then append message if any
    try {
      // log game title and install directory

      const installPath =
        this.gameInfo.runner === 'sideload'
          ? this.gameInfo.folder_name
          : this.gameInfo.install.install_path

      await writeFile(
        this.filePath,
        `Launching "${this.gameInfo.title}" (${runner})\n` +
          `Native? ${notNative ? 'No' : 'Yes'}\n` +
          `Installed in: ${installPath}\n\n`
      )

      let info: SystemInformation | null = null
      try {
        // log system information
        info = await getSystemInfo()
        const systemInfo = await formatSystemInfo(info)

        await appendFile(this.filePath, `System Info:\n${systemInfo}\n\n`)
      } catch (error) {
        logError(
          ['Failed to fetch system information', error],
          LogPrefix.Backend
        )
      }

      // log game settings
      const gameSettings = await gameManagerMap[runner].getSettings(app_name)
      const gameSettingsString = JSON.stringify(
        this.filterGameSettingsForLog(structuredClone(gameSettings), notNative),
        null,
        '\t'
      )
      const startPlayingDate = new Date()
      // log anticheat info
      const antiCheatInfo = gameAnticheatInfo(this.gameInfo.namespace)

      await appendFile(
        this.filePath,
        `Game Settings: ${gameSettingsString}\n\n`
      )

      if (antiCheatInfo != null) {
        await appendFile(
          this.filePath,
          `Anticheat Status: ${antiCheatInfo.status}\n` +
            `Anticheats: ${JSON.stringify(antiCheatInfo.anticheats)}\n\n`
        )
      }

      if (await shouldToggleShaderPreCacheOn(info, gameSettings)) {
        await appendFile(
          this.filePath,
          `Warning: Steam's Shader Pre-Caching is disabled and umu is enabled. Steam's Shader Pre-cache is required by umu to work properly on the SteamDeck's Gaming mode.\n\n`
        )
      }

      await appendFile(
        this.filePath,
        `Game launched at: ${startPlayingDate}\n\n`
      )

      this.initialized = true
    } catch (error) {
      logError(
        [`Failed to initialize log ${this.filePath}:`, error],
        LogPrefix.Backend
      )
    }
  }
}

export function appendGamePlayLog(gameInfo: GameInfo, message: string) {
  logsWriters[`${gameInfo.app_name}-lastPlay`]?.logMessage(message)
}

export async function initGamePlayLog(gameInfo: GameInfo) {
  logsWriters[`${gameInfo.app_name}-lastPlay`] ??= new GameLogWriter(gameInfo)
  return logsWriters[`${gameInfo.app_name}-lastPlay`].initLog()
}

export async function appendWinetricksGamePlayLog(gameInfo: GameInfo) {
  const logWriter = logsWriters[`${gameInfo.app_name}-lastPlay`]
  if (logWriter) {
    // append a promise to the queue
    logWriter.logMessage(
      new Promise((resolve, reject) => {
        Winetricks.listInstalled(gameInfo.runner, gameInfo.app_name)
          .then((installedPackages) => {
            const packagesString = installedPackages
              ? installedPackages.join(', ')
              : 'none'

            resolve(`Winetricks packages: ${packagesString}\n\n`)
          })
          .catch((error) => {
            reject(error)
          })
      })
    )
  }
}

export function stopLogger(appName: string) {
  logsWriters[`${appName}-lastPlay`]?.logMessage(
    '============= End of log ============='
  )
  delete logsWriters[`${appName}-lastPlay`]
}

// LogWriter subclass to log to latest runner logs
class RunnerLogWriter extends LogWriter {
  runner: Runner

  constructor(runner: Runner, filePath: string) {
    super()
    this.filePath = filePath
    this.runner = runner
  }
}

export function appendRunnerLog(runner: Runner, message: string) {
  logsWriters[runner]?.logMessage(message)
}

export async function initRunnerLog(runner: Runner, filePath: string) {
  logsWriters[runner] ??= new RunnerLogWriter(runner, filePath)
  return logsWriters[runner].initLog()
}

// LogWriter subclass to write general Heroic logs
class HeroicLogWriter extends LogWriter {
  constructor(filePath: string) {
    super()
    this.filePath = filePath
  }
}

export function appendHeroicLog(message: string) {
  logsWriters['heroic']?.logMessage(message)
}

export async function initHeroicLog(filePath: string) {
  logsWriters['heroic'] ??= new HeroicLogWriter(filePath)
  return logsWriters['heroic'].initLog()
}

// LogWriter subclass to log install/update for a given game
class GameInstallLogWriter extends LogWriter {
  constructor(appName: string) {
    super()
    this.filePath = logFileLocation(appName)
  }
}

export function appendGameLog(appName: string, message: string) {
  logsWriters[appName]?.logMessage(message)
}

export async function initGameLog(appName: string) {
  logsWriters[appName] ??= new GameInstallLogWriter(appName)
  return logsWriters[appName].initLog()
}

// LogWriter subclass to log to an explicit logFile
// Useful to log anything that is not specific
class FileLogWriter extends LogWriter {
  constructor(filePath: string) {
    super()
    this.filePath = filePath
  }
}

export function appendFileLog(filePath: string, message: string) {
  logsWriters[filePath]?.logMessage(message)
}

export async function initFileLog(filePath: string) {
  logsWriters[filePath] ??= new FileLogWriter(filePath)
  return logsWriters[filePath].initLog()
}
