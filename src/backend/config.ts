import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'graceful-fs'

import {
  AppSettings,
  GlobalConfigVersion,
  WineInstallation
} from 'common/types'
import {
  currentGlobalConfigVersion,
  configPath,
  defaultWinePrefix,
  gamesConfigPath,
  heroicInstallPath,
  userHome,
  isFlatpak,
  isMac,
  isWindows,
  getSteamCompatFolder,
  configStore,
  isLinux
} from './constants'

import { logError, logInfo, LogPrefix } from './logger/logger'
import {
  getCrossover,
  getDefaultWine,
  getGamePortingToolkitWine,
  getLinuxWineSet,
  getSystemGamePortingToolkitWine,
  getWhisky,
  getWineOnMac,
  getWineskinWine
} from './utils/compatibility_layers'
import { backendEvents } from './backend_events'

/**
 * This class does config handling.
 * This can't be constructed directly. Use the static method get().
 * It automatically selects the appropriate config loader based on the config version.
 *
 * It also implements all the config features that won't change across versions.
 */
abstract class GlobalConfig {
  protected static globalInstance: GlobalConfig

  public abstract version: GlobalConfigVersion

  protected config: AppSettings | undefined

  public set(config: AppSettings) {
    this.config = config
  }

  /**
   * Get the global configuartion handler.
   * If one doesn't exist, create one.
   *
   * @returns GlobalConfig instance.
   */
  public static get(): GlobalConfig {
    let version: GlobalConfigVersion

    // Config file doesn't already exist, make one with the current version.
    if (!existsSync(configPath)) {
      version = currentGlobalConfigVersion
    }
    // Config file exists, detect its version.
    else {
      // Check version field in the config.
      try {
        version = JSON.parse(readFileSync(configPath, 'utf-8'))['version']
      } catch (error) {
        logError(
          `Config file is corrupted, please check ${configPath}`,
          LogPrefix.Backend
        )
        version = 'v0'
      }
      // Legacy config file without a version field, it's a v0 config.
      if (!version) {
        version = 'v0'
      }
    }

    if (!GlobalConfig.globalInstance) {
      GlobalConfig.reload(version)
    }

    return GlobalConfig.globalInstance
  }

  /**
   * Recreate the global configuration handler.
   *
   * @param version Config version to load file using.
   * @returns void
   */
  private static reload(version: GlobalConfigVersion): void {
    // Select loader to use.
    switch (version) {
      case 'v0':
        GlobalConfig.globalInstance = new GlobalConfigV0()
        break
      default:
        logError(
          `Invalid config version '${version}' requested.`,
          LogPrefix.GlobalConfig
        )
        break
    }
    // Try to upgrade outdated config.
    if (GlobalConfig.globalInstance.upgrade()) {
      // Upgrade done, we need to fully reload config.
      logInfo(
        `Upgraded outdated ${version} config to ${currentGlobalConfigVersion}.`,
        LogPrefix.GlobalConfig
      )
      return GlobalConfig.reload(currentGlobalConfigVersion)
    } else if (version !== currentGlobalConfigVersion) {
      // Upgrade failed.
      logError(
        `Failed to upgrade outdated ${version} config.`,
        LogPrefix.GlobalConfig
      )
    }
  }

  /**
   * Detects Wine on Mac
   * @returns Promise<Set<WineInstallation>>
   * @memberof GlobalConfig
   **/
  public async getMacOsWineSet(): Promise<Set<WineInstallation>> {
    if (!isMac) {
      return new Set<WineInstallation>()
    }

    const getGPTKWine = await getGamePortingToolkitWine()
    const getSystemGPTK = await getSystemGamePortingToolkitWine()
    const crossover = await getCrossover()
    const wineOnMac = await getWineOnMac()
    const wineskinWine = await getWineskinWine()
    const whiskyWine = await getWhisky()

    return new Set([
      ...getGPTKWine,
      ...getSystemGPTK,
      ...crossover,
      ...wineOnMac,
      ...wineskinWine,
      ...whiskyWine
    ])
  }

  /**
   * Detects Wine/Proton on the user's system.
   *
   * @returns An Array of Wine/Proton installations.
   */
  public async getAlternativeWine(
    scanCustom = true
  ): Promise<WineInstallation[]> {
    if (isMac) {
      const macOsWineSet = await this.getMacOsWineSet()
      return [...macOsWineSet]
    }

    const linuxWineSet = await getLinuxWineSet(scanCustom)

    return [...linuxWineSet]
  }

  /**
   * Gets the actual settings from the config file.
   * Does not modify its parent object.
   * Always reads from file regardless of `this.config`.
   *
   * @returns Settings present in config file.
   */
  public abstract getSettings(): AppSettings

  /**
   * Updates this.config, this.version to upgrade the current config file.
   *
   * Writes to file after that.
   * DO NOT call `flush()` afterward.
   *
   * @returns true if upgrade successful if upgrade fails or no upgrade needed.
   */
  public abstract upgrade(): boolean

  /**
   * Get default settings as if the user's config file doesn't exist.
   * Doesn't modify the parent object.
   * Doesn't access config files.
   *
   * @returns AppSettings
   */
  public abstract getFactoryDefaults(): AppSettings

  /**
   * Reset `this.config` to `getFactoryDefaults()` and flush.
   */
  public abstract resetToDefaults(): void

  protected writeToFile(config: Record<string, unknown>) {
    return writeFileSync(configPath, JSON.stringify(config, null, 2))
  }

  /**
   * Write `this.config` to file.
   * Uses the config version defined in `this.version`.
   */
  public abstract flush(): void

  /** change a specific setting */
  public abstract setSetting(key: string, value: unknown): void

  /**
   * Load the config file, upgrade if needed.
   */
  protected load() {
    // Config file doesn't exist, make one.
    if (!existsSync(configPath)) {
      this.resetToDefaults()
    }
    // Always upgrade before loading to avoid errors.
    // `getSettings` doesn't return an `AppSettings` otherwise.
    if (this.version !== currentGlobalConfigVersion) {
      // Do not load the config.
      // Wait for `upgrade` to be called by `reload`.
    } else {
      // No upgrades necessary, load config.
      // `this.version` should be `currentGlobalConfigVersion` at this point.
      this.config = this.getSettings()
    }
  }
}

class GlobalConfigV0 extends GlobalConfig {
  public version: GlobalConfigVersion = 'v0'

  constructor() {
    super()
    this.load()
  }

  public upgrade() {
    // Here we rewrite the config object to match the latest format and write to file.
    // Not necessary as this is the current version.
    return false
  }

  public getSettings(): AppSettings {
    if (this.config) {
      return this.config
    }

    if (!existsSync(gamesConfigPath)) {
      mkdirSync(gamesConfigPath, { recursive: true })
    }

    if (!existsSync(configPath)) {
      return this.getFactoryDefaults()
    }

    let settings = JSON.parse(readFileSync(configPath, 'utf-8'))
    const defaultSettings = settings.defaultSettings as AppSettings

    // fix relative paths
    const winePrefix = !isWindows
      ? defaultSettings?.winePrefix?.replace('~', userHome)
      : ''

    settings = {
      ...this.getFactoryDefaults(),
      ...settings.defaultSettings,
      winePrefix
    } as AppSettings

    return settings
  }

  public getFactoryDefaults(): AppSettings {
    // @ts-expect-error FIXME: Settings values don't work like this in other parts of the codebase
    const defaultWine: WineInstallation = isWindows ? {} : getDefaultWine()

    const settings: Partial<AppSettings> = {
      checkUpdatesInterval: 10,
      enableUpdates: false,
      addDesktopShortcuts: false,
      addStartMenuShortcuts: false,
      autoInstallDxvk: isLinux,
      autoInstallVkd3d: isLinux,
      autoInstallDxvkNvapi: false,
      addSteamShortcuts: false,
      preferSystemLibs: false,
      checkForUpdatesOnStartup: !isFlatpak,
      autoUpdateGames: false,
      customWinePaths: [],
      defaultInstallPath: heroicInstallPath,
      libraryTopSection: 'disabled',
      defaultSteamPath: getSteamCompatFolder(),
      defaultWinePrefix: defaultWinePrefix,
      hideChangelogsOnStartup: false,
      language: 'en',
      maxWorkers: 0,
      minimizeOnLaunch: false,
      nvidiaPrime: false,
      enviromentOptions: [],
      wrapperOptions: [],
      showFps: false,
      useGameMode: isFlatpak,
      wineCrossoverBottle: 'Heroic',
      winePrefix: isWindows ? '' : defaultWinePrefix,
      wineVersion: defaultWine,
      enableEsync: true,
      enableFsync: isLinux,
      enableMsync: isMac,
      eacRuntime: isLinux,
      battlEyeRuntime: isLinux,
      framelessWindow: false,
      beforeLaunchScriptPath: '',
      afterLaunchScriptPath: ''
    }
    // @ts-expect-error TODO: We need to settle on *one* place to define settings defaults
    return settings
  }

  public setSetting(key: keyof AppSettings, value: unknown) {
    const config = this.getSettings()
    const configStoreSettings = configStore.get_nodefault('settings') || config
    configStore.set('settings', { ...configStoreSettings, [key]: value })

    const oldValue = config[key]
    // @ts-expect-error FIXME Properly typecheck this
    config[key] = value
    this.config = config

    backendEvents.emit('settingChanged', { key, oldValue, newValue: value })

    return this.flush()
  }

  public resetToDefaults() {
    this.config = this.getFactoryDefaults()
    return this.flush()
  }

  public flush() {
    return this.writeToFile({
      defaultSettings: this.config,
      version: 'v0'
    })
  }
}

export { GlobalConfig }
