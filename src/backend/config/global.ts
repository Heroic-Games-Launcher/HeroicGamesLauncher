import { LegacyGlobalConfigJson } from './schemas/legacy'
import {
  LatestGlobalConfigJson,
  latestGlobalConfigJson,
  GlobalConfig
} from './schemas'
import { writeFileSync } from 'graceful-fs'
import { join } from 'path'
import {
  getSteamCompatFolder,
  isFlatpak,
  isLinux,
  isMac,
  isWindows,
  userHome
} from '../constants'
import { PositiveInteger } from '../schemas'
import { logInfo, LogPrefix } from '../logger/logger'
import { migrateLegacyGlobalConfig } from './legacy'
import { availableWineVersions, getConfigPath, loadConfigFile } from './shared'
import { sendFrontendMessage } from '../main_window'
import type { z } from 'zod'

// User-configured global config keys
let globalConfig: Partial<GlobalConfig> = {}

const pastGlobalConfigVersions = [LegacyGlobalConfigJson]

function getGlobalConfig(): GlobalConfig {
  return {
    ...getDefaultGlobalConfig(),
    ...globalConfig
  }
}

function setGlobalConfig<Key extends keyof GlobalConfig>(
  key: Key,
  value: GlobalConfig[Key]
): void {
  const keyWasUserConfigured = key in globalConfig
  const oldValue = getGlobalConfig()[key]
  logInfo(
    [
      'Changing',
      key,
      'from',
      oldValue,
      keyWasUserConfigured ? 'to' : '(default value) to',
      value
    ],
    LogPrefix.GlobalConfig
  )

  globalConfig[key] = value

  // Write changed config to config file
  const globalConfigFilePath = getConfigPath()
  const fullGlobalConfigObject: LatestGlobalConfigJson = {
    version: 'v1',
    settings: globalConfig
  }
  writeFileSync(
    globalConfigFilePath,
    JSON.stringify(fullGlobalConfigObject, null, 2)
  )

  // Let the Frontend know about the change
  sendFrontendMessage('globalConfigChanged', key, value)
}

function resetGlobalConfigKey(key: keyof GlobalConfig): void {
  const defaultValue = getDefaultGlobalConfig()[key]
  logInfo(
    ['Resetting', key, 'to default value', defaultValue],
    LogPrefix.GlobalConfig
  )

  delete globalConfig[key]

  const globalConfigFilePath = getConfigPath()
  const fullGlobalConfigObject: LatestGlobalConfigJson = {
    version: 'v1',
    settings: globalConfig
  }
  writeFileSync(
    globalConfigFilePath,
    JSON.stringify(fullGlobalConfigObject, null, 2)
  )

  sendFrontendMessage('globalConfigKeyReset', key, defaultValue)
}

function getUserConfiguredGlobalConfigKeys(): Record<
  keyof GlobalConfig,
  boolean
> {
  return Object.fromEntries(
    GlobalConfig.keyof().options.map((key) => [key, key in globalConfig])
  ) as Record<keyof GlobalConfig, boolean>
}

function loadGlobalConfig(): void {
  const globalConfigPath = getConfigPath()
  const parsedGlobalConfig = loadConfigFile(
    globalConfigPath,
    latestGlobalConfigJson,
    pastGlobalConfigVersions,
    updatePastGlobalConfig
  )

  globalConfig = parsedGlobalConfig.settings
}

function getDefaultGlobalConfig(): GlobalConfig {
  return {
    addDesktopShortcuts: false,
    addStartMenuShortcuts: false,
    addSteamShortcuts: false,
    alternativeGogdlBinary: null,
    alternativeLegendaryBinary: null,
    alternativeNileBinary: null,
    autoInstallDxvk: isLinux,
    autoInstallDxvkNvapi: false,
    autoInstallVkd3d: isLinux,
    autoSyncSaves: false,
    autoUpdateGames: false,
    automaticWinetricksFixes: true,
    battlEyeRuntime: isLinux,
    checkForUpdatesOnStartup: true,
    crossoverBottle: 'Heroic',
    customThemesPath: null,
    customWinePaths: [],
    darkTrayIcon: false,
    defaultInstallPath: join(userHome, 'Games', 'Heroic'),
    disableController: false,
    disableLogs: false,
    disablePlaytimeSync: false,
    discordRichPresence: true,
    downloadNoHttps: false,
    dxvkFpsLimit: { enabled: false },
    eSync: !isWindows,
    eacRuntime: isLinux,
    egsLinkedPath: null,
    enableHelp: false,
    enableNewDesign: false,
    environmentVariables: [],
    exitToTray: false,
    fSync: isLinux,
    framelessWindow: false,
    fsr: { enabled: false },
    gameMode: isFlatpak,
    gamescope: {
      windowType: null,
      enableUpscaling: false,
      enableLimiter: false
    },
    hideChangelogsOnStartup: false,
    language: 'en',
    libraryTopSection: 'disabled',
    mSync: isMac,
    maxDownloadWorkers: null,
    maxRecentGames: PositiveInteger.parse(5),
    minimizeOnGameLaunch: false,
    preferSystemLibraries: isFlatpak,
    showFps: false,
    showMangohud: false,
    startMinimizedToTray: false,
    get steamPath() {
      return getSteamCompatFolder()
    },
    steamRuntime: false,
    useDedicatedGpu: false,
    get winePrefix() {
      return join(this.winePrefixBasePath, 'Default')
    },
    get winePrefixBasePath() {
      return join(this.defaultInstallPath, 'Prefixes')
    },
    get wineVersion() {
      return availableWineVersions[0]
    },
    wrappers: []
  }
}

function updatePastGlobalConfig(
  pastVersion: z.infer<(typeof pastGlobalConfigVersions)[number]>
): LatestGlobalConfigJson {
  logInfo(
    [
      'Updating global config object from',
      pastVersion.version,
      'to',
      latestGlobalConfigJson.shape.version.value
    ],
    LogPrefix.Backend
  )

  switch (pastVersion.version) {
    case 'v0':
    case 'v0.1':
    case 'auto':
      return migrateLegacyGlobalConfig(
        pastVersion.defaultSettings,
        getDefaultGlobalConfig()
      )
  }
}

// ts-prune-ignore-next
export const testExports = { globalConfig }

export {
  pastGlobalConfigVersions,
  setGlobalConfig,
  getGlobalConfig,
  resetGlobalConfigKey,
  getUserConfiguredGlobalConfigKeys,
  loadGlobalConfig
}
