import { existsSync, readFileSync, writeFileSync } from 'graceful-fs'

import { GameConfigVersion, GameSettings } from 'common/types'
import { GlobalConfig } from './config'
import {
  currentGameConfigVersion,
  configPath,
  gamesConfigPath,
  isMac,
  isWindows,
  userHome,
  defaultWinePrefix
} from './constants'
import { logError, logInfo, LogPrefix } from './logger/logger'
import { join } from 'path'

/**
 * This class does config handling for games.
 * This can't be constructed directly. Use the static method get().
 * It automatically selects the appropriate config loader based on the config version.
 *
 * It also implements all the config features that won't change across versions.
 */
abstract class GameConfig {
  protected static instances: Map<string, GameConfig> = new Map()

  public abstract version: GameConfigVersion

  // @ts-expect-error TODO: Somehow figure out how to synchronously load the config
  public config: GameSettings

  readonly appName: string
  readonly path: string

  protected constructor(appName: string) {
    this.appName = appName
    this.path = join(gamesConfigPath, appName + '.json')
  }

  /**
   * Get the game's configuartion handler.
   * If one doesn't exist, create one.
   *
   * @param appName Game to get handler of.
   * @returns GameConfig instance.
   */
  public static get(appName: string): GameConfig {
    let version: GameConfigVersion
    const path = join(gamesConfigPath, appName + '.json')
    // Config file doesn't already exist, make one with the current version.
    if (!existsSync(path)) {
      version = currentGameConfigVersion
    }
    // Config file exists, detect its version.
    else {
      // Check version field in the config.
      try {
        version = JSON.parse(readFileSync(path, 'utf-8'))['version']
      } catch (error) {
        logError(
          `Config file is corrupted, please check ${path}`,
          LogPrefix.Backend
        )
        version = 'v0'
      }
      // Legacy config file without a version field, it's a v0 config.
      if (!version) {
        version = 'v0'
      }
    }

    if (!GameConfig.instances.get(appName)) {
      GameConfig.reload(appName, version)
    }

    return GameConfig.instances.get(appName)!
  }

  /**
   * Recreate the game's configuration handler.
   *
   * @param appName
   * @param version Config version to load file using.
   * @returns void
   */
  private static reload(appName: string, version: GameConfigVersion): void {
    // Select loader to use.
    switch (version) {
      case 'v0':
        GameConfig.instances.set(appName, new GameConfigV0(appName))
        break
      case 'v0.1':
        GameConfig.instances.set(appName, new GameConfigV0_1(appName))
        break
      default:
        logError(
          `[${appName}]: Invalid config version '${version}' requested.`,
          LogPrefix.GameConfig
        )
        break
    }
    // Try to upgrade outdated config.
    if (GameConfig.instances.get(appName)!.upgrade()) {
      // Upgrade done, we need to fully reload config.
      logInfo(
        `[${appName}]: Upgraded outdated ${version} config to ${currentGameConfigVersion}.`,
        LogPrefix.GameConfig
      )
      return GameConfig.reload(appName, currentGameConfigVersion)
    } else if (version !== currentGameConfigVersion) {
      // Upgrade failed.
      logError(
        `[${appName}]: Failed to upgrade outdated ${version} config.`,
        LogPrefix.GameConfig
      )
    }
  }

  /**
   * Gets the actual settings from the config file.
   * Does not modify its parent object.
   * Always reads from file regardless of `this.config`.
   *
   * @returns Settings present in config file.
   */
  public abstract getSettings(): Promise<GameSettings>

  /** Change a specific setting */
  public abstract setSetting(key: string, value: unknown): void

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
   * Reset `this.config` to global defaults and flush.
   */
  public abstract resetToDefaults(): void

  protected writeToFile(config: Record<string, unknown>) {
    return writeFileSync(this.path, JSON.stringify(config, null, 2))
  }

  /**
   * Write `this.config` to file.
   * Uses the config version defined in `this.version`.
   */
  public abstract flush(): void

  /**
   * Load the config file, upgrade if needed.
   */
  protected async load() {
    // Config file doesn't exist, make one.
    if (!existsSync(configPath)) {
      this.resetToDefaults()
    }
    // Always upgrade before loading to avoid errors.
    // `getSettings` doesn't return an `GameSettings` otherwise.
    if (this.version !== currentGameConfigVersion) {
      // Do not load the config.
      // Wait for `upgrade` to be called by `reload`.
    } else {
      // No upgrades necessary, load config.
      // `this.version` should be `currentGameConfigVersion` at this point.
      this.config = (await this.getSettings()) as GameSettings
    }
  }
}

class GameConfigV0 extends GameConfig {
  public version: GameConfigVersion = 'v0'

  // True for v0 (legacy) configs.
  // Based on legacy behaviour.
  protected isExplicit = true

  constructor(appName: string) {
    super(appName)
    this.load()
  }

  public upgrade() {
    // Here we rewrite the config object to match the latest format and write to file.
    // Not necessary as this version's config structure is identical.

    // TODO(adityaruplaha): Continue treating legacy configs as fully explicit?
    const settings = existsSync(this.path)
      ? JSON.parse(readFileSync(this.path, 'utf-8'))
      : {}
    // settings['explicit'] = true    // Continue treating as explicit.
    // settings['explicit'] = false   // No, convert to ovverides.
    this.writeToFile(settings)
    // Once we decide, change this to true to indicate upgrade successful.
    return false
  }

  public async getSettings(): Promise<GameSettings> {
    // Take defaults, then overwrite if explicitly set values exist.
    // The settings defined work as overrides.

    const {
      autoInstallDxvk,
      autoInstallVkd3d,
      preferSystemLibs,
      autoSyncSaves,
      enableEsync,
      enableFsync,
      maxSharpness,
      launcherArgs,
      nvidiaPrime,
      offlineMode,
      enviromentOptions,
      wrapperOptions,
      savesPath,
      showFps,
      showMangohud,
      targetExe,
      useGameMode,
      winePrefix,
      wineCrossoverBottle,
      wineVersion,
      useSteamRuntime
    } = GlobalConfig.get().getSettings()

    // initialize generic defaults
    // TODO: I know more values can be moved that are not used in windows
    const defaultSettings = {
      autoInstallDxvk,
      autoInstallVkd3d,
      preferSystemLibs,
      autoSyncSaves,
      enableEsync,
      enableFsync,
      maxSharpness,
      launcherArgs,
      nvidiaPrime,
      offlineMode,
      enviromentOptions: [...enviromentOptions],
      wrapperOptions,
      savesPath,
      showFps,
      showMangohud,
      targetExe,
      useGameMode,
      useSteamRuntime,
      language: '' // we want to fallback to '' always here, fallback lang for games should be ''
    } as GameSettings

    let gameSettings = {} as GameSettings

    if (existsSync(this.path)) {
      // read game's settings
      const settings = JSON.parse(readFileSync(this.path, 'utf-8'))
      gameSettings = settings[this.appName] || ({} as GameSettings)
    }

    if (!isWindows) {
      defaultSettings.wineVersion = wineVersion

      // set specific keys depending on the platform
      if (isMac) {
        defaultSettings.wineCrossoverBottle = wineCrossoverBottle
      }

      defaultSettings.winePrefix = winePrefix || defaultWinePrefix

      // fix winePrefix if needed
      if (gameSettings.winePrefix?.includes('~')) {
        gameSettings.winePrefix = gameSettings.winePrefix.replace('~', userHome)
      }
    }

    // return an object with the game's settings, with fallbacks to the defaults
    return {
      ...defaultSettings,
      ...gameSettings
    }
  }

  public setSetting(key: string, value: unknown) {
    this.config[key] = value
    logInfo(`${this.appName}: Setting ${key} to ${JSON.stringify(value)}`)
    return this.flush()
  }

  public resetToDefaults() {
    this.config = {} as GameSettings
    return this.flush()
  }

  public flush() {
    const config = new Map(Object.entries({ ...this.config }))
    if (this.isExplicit) {
      // Explicit mode on. Config is taken as is, missing values are not substituted for defaults.
      // Even if global defaults are changed, this will not be affected.
      return this.writeToFile(
        Object.fromEntries([
          [this.appName, this.config],
          ['version', 'v0'],
          ['explicit', this.isExplicit]
        ])
      )
    }
    // Remove explicitly set values which match the defaults.
    // Thus the defaults are never hard set into any game's config.
    // If the defaults change, they will automatically change.
    // Explicit overrides CANNOT be the same as defaults.
    // TODO(adityaruplaha): fix this
    const globalConfig = new Map(
      Object.entries(GlobalConfig.get().getSettings())
    )
    const defaultedKeys = Object.entries(this.config)
      .filter(([key, value]) => globalConfig.get(key) === value)
      .map(([k]) => k)
    for (const key of defaultedKeys) {
      config.delete(key)
    }
    return this.writeToFile(
      Object.fromEntries([
        [this.appName, Object.fromEntries(config)],
        ['version', 'v0'],
        ['explicit', this.isExplicit]
      ])
    )
  }
}

// Inheriting cuz almost everything stays the same.
class GameConfigV0_1 extends GameConfigV0 {
  public version: GameConfigVersion = 'v0.1'

  // False for v0.1 configs.
  // They are not explicit by default.
  protected isExplicit = false

  constructor(appName: string) {
    super(appName)
  }

  public upgrade() {
    // Here we rewrite the config object to match the latest format and write to file.
    // Not necessary as this is the current version.
    return false
  }
}

export { GameConfig }
