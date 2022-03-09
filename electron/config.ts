import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'graceful-fs'
import { userInfo as user } from 'os'
import { parse as plistParse, PlistObject } from 'plist'

import { AppSettings, GlobalConfigVersion, WineInstallation } from './types'
import { LegendaryUser } from './legendary/user'
import {
  currentGlobalConfigVersion,
  heroicConfigPath,
  heroicGamesConfigPath,
  heroicInstallPath,
  heroicToolsPath,
  home,
  isFlatpak,
  isMac,
  isWindows
} from './constants'
import { execAsync } from './utils'
import { logError, logInfo, LogPrefix } from './logger/logger'
import { dirname, join } from 'path'

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

  public config: AppSettings

  /**
   * Get the global configuartion handler.
   * If one doesn't exist, create one.
   *
   * @returns GlobalConfig instance.
   */
  public static get(): GlobalConfig {
    let version: GlobalConfigVersion

    // Config file doesn't already exist, make one with the current version.
    if (!existsSync(heroicConfigPath)) {
      version = currentGlobalConfigVersion
    }
    // Config file exists, detect its version.
    else {
      // Check version field in the config.
      version = JSON.parse(readFileSync(heroicConfigPath, 'utf-8'))['version']
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
   * Loads the default wine installation path and version.
   *
   * @returns Promise<WineInstallation>
   */
  public async getDefaultWine(): Promise<WineInstallation> {
    const defaultWine: WineInstallation = {
      bin: '',
      name: 'Default Wine - Not Found',
      type: 'wine'
    }
    return execAsync(`which wine`)
      .then(async ({ stdout }) => {
        const wineBin = stdout.split('\n')[0]
        defaultWine.bin = `'${wineBin}'`

        const { stdout: out } = await execAsync(`wine --version`)
        const version = out.split('\n')[0]
        defaultWine.name = `Wine Default - ${version}`

        return {
          ...defaultWine,
          ...this.getWineExecs(wineBin)
        }
      })
      .catch(() => {
        return defaultWine
      })
  }

  /**
   * Detects CrossOver installs on Mac and Linux
   *
   * @returns Promise<Set<WineInstallation>>
   */
  public async getCrossover(): Promise<Set<WineInstallation>> {
    const crossover = new Set<WineInstallation>()

    if (isMac) {
      await execAsync(
        'mdfind kMDItemCFBundleIdentifier = "com.codeweavers.CrossOver"'
      ).then(async ({ stdout }) => {
        stdout.split('\n').forEach((crossoverMacPath) => {
          const infoFilePath = join(crossoverMacPath, 'Contents', 'Info.plist')
          if (crossoverMacPath && existsSync(infoFilePath)) {
            const info = plistParse(
              readFileSync(infoFilePath, 'utf-8')
            ) as PlistObject
            const version = info['CFBundleShortVersionString'] || ''
            const crossoverWineBin = join(
              crossoverMacPath,
              'Contents',
              'SharedSupport',
              'CrossOver',
              'bin',
              'wine'
            )
            crossover.add({
              bin: `'${crossoverWineBin}'`,
              name: `CrossOver - ${version}`,
              type: 'crossover',
              ...this.getWineExecs(crossoverWineBin)
            })
          }
        })
      })
    } else if (!isWindows) {
      // Linux
      const crossoverWineBin = '/opt/cxoffice/bin/wine'
      if (!existsSync(crossoverWineBin)) {
        return crossover
      }
      const crossoverVersion = (
        await execAsync(crossoverWineBin + ' --version')
      ).stdout
        .toString()
        .split('\n')[2]
        .split(':')[1]
        .trim()
      crossover.add({
        bin: `'${crossoverWineBin}'`,
        name: `CrossOver - ${crossoverVersion}`,
        type: 'crossover',
        ...this.getWineExecs(crossoverWineBin)
      })
    }

    return crossover
  }

  /**
   * Detects Wine/Proton on the user's system.
   *
   * @returns An Array of Wine/Proton installations.
   */
  public async getAlternativeWine(
    scanCustom = true
  ): Promise<WineInstallation[]> {
    if (!existsSync(`${heroicToolsPath}/wine`)) {
      mkdirSync(`${heroicToolsPath}/wine`, { recursive: true })
    }

    if (!existsSync(`${heroicToolsPath}/proton`)) {
      mkdirSync(`${heroicToolsPath}/proton`, { recursive: true })
    }

    const altWine = new Set<WineInstallation>()

    readdirSync(`${heroicToolsPath}/wine/`).forEach((version) => {
      const wineBin = join(heroicToolsPath, 'wine', version, 'bin', 'wine')
      altWine.add({
        bin: `'${wineBin}'`,
        name: `Wine - ${version}`,
        type: 'wine',
        ...this.getWineExecs(wineBin)
      })
    })

    const lutrisPath = `${home}/.local/share/lutris`
    const lutrisCompatPath = `${lutrisPath}/runners/wine/`

    if (existsSync(lutrisCompatPath)) {
      readdirSync(lutrisCompatPath).forEach((version) => {
        const wineBin = join(lutrisCompatPath, version, 'bin', 'wine')
        altWine.add({
          bin: `'${wineBin}'`,
          name: `Wine - ${version}`,
          type: 'wine',
          ...this.getWineExecs(wineBin)
        })
      })
    }

    const protonPaths = [`${heroicToolsPath}/proton/`]

    // Known places where Steam might be found.
    // Just add a new string here in case another path is found on another distro.
    const steamPaths = [
      join(home, '.steam'),
      join(home, '.var/app/com.valvesoftware.Steam/.local/share/Steam'),
      '/usr/share/steam'
    ].filter((path) => existsSync(path))

    steamPaths.forEach((path) => {
      protonPaths.push(`${path}/steam/steamapps/common`)
      protonPaths.push(`${path}/steamapps/common`)
      protonPaths.push(`${path}/root/compatibilitytools.d`)
      protonPaths.push(`${path}/compatibilitytools.d`)
      return
    })

    const proton = new Set<WineInstallation>()

    protonPaths.forEach((path) => {
      if (existsSync(path)) {
        readdirSync(path).forEach((version) => {
          const name = version.toLowerCase()
          if (name.startsWith('proton') && !name.includes('runtime')) {
            const protonBin = join(path, version, 'proton')
            proton.add({
              bin: `'${protonBin}'`,
              name: `Proton - ${version}`,
              type: 'proton'
              // No need to run this.getWineExecs here since Proton ships neither Wineboot nor Wineserver
            })
          }
        })
      }
    })

    const crossover = await this.getCrossover()

    const defaultWineSet = new Set<WineInstallation>()
    const defaultWine = await this.getDefaultWine()
    if (!defaultWine.name.includes('Not Found')) {
      defaultWineSet.add(defaultWine)
    }

    let customWineSet = new Set<WineInstallation>()
    if (scanCustom) {
      customWineSet = await this.getCustomWinePaths()
    }

    // On Mac, prioritise CX installations since Wine/Proton does not work
    if (isMac && crossover.size) {
      return [...crossover, ...customWineSet]
    }
    return [
      ...defaultWineSet,
      ...altWine,
      ...proton,
      ...crossover,
      ...customWineSet
    ]
  }

  /**
   * Checks if a Wine version has Wineboot/Wineserver executables and returns the path to those if they're present
   * @param wineBin The unquoted path to the Wine binary ('wine')
   * @returns The quoted paths to wineboot and wineserver, if present
   */
  public getWineExecs(wineBin: string): {
    wineboot: string
    wineserver: string
  } {
    const wineDir = dirname(wineBin)
    const ret = { wineserver: '', wineboot: '' }
    const potWineserverPath = join(wineDir, 'wineserver')
    if (existsSync(potWineserverPath)) {
      ret.wineserver = `'${potWineserverPath}'`
    }
    const potWinebootPath = join(wineDir, 'wineboot')
    if (existsSync(potWinebootPath)) {
      ret.wineboot = `'${potWinebootPath}'`
    } else {
      /**
       * NOTE: This will only work as long as no function removes and then re-adds the quotes
       *       Although then again no (default) Wine version should ship without wineboot so
       *       this most likely isn't an issue
       */
      ret.wineboot = `'${wineBin}' wineboot`
    }
    return ret
  }

  /**
   * Gets the actual settings from the config file.
   * Does not modify its parent object.
   * Always reads from file regardless of `this.config`.
   *
   * @returns Settings present in config file.
   */
  public abstract getSettings(): Promise<AppSettings>

  /**
   * Updates this.config, this.version to upgrade the current config file.
   *
   * Writes to file after that.
   * DO NOT call `flush()` afterward.
   *
   * @returns true if upgrade successful, false if upgrade fails or no upgrade needed.
   */
  public abstract upgrade(): boolean

  /**
   * Get custom Wine installations as defined in the config file.
   *
   * @returns Set of Wine installations.
   */
  public abstract getCustomWinePaths(): Promise<Set<WineInstallation>>

  /**
   * Get default settings as if the user's config file doesn't exist.
   * Doesn't modify the parent object.
   * Doesn't access config files.
   *
   * @returns AppSettings
   */
  public abstract getFactoryDefaults(): Promise<AppSettings>

  /**
   * Reset `this.config` to `getFactoryDefaults()` and flush.
   */
  public abstract resetToDefaults(): void

  protected writeToFile(config: Record<string, unknown>) {
    return writeFileSync(heroicConfigPath, JSON.stringify(config, null, 2))
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
    if (!existsSync(heroicConfigPath)) {
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
      this.config = (await this.getSettings()) as AppSettings
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

  public async getSettings(): Promise<AppSettings> {
    if (!existsSync(heroicGamesConfigPath)) {
      mkdirSync(heroicGamesConfigPath, { recursive: true })
    }

    if (!existsSync(heroicConfigPath)) {
      return await this.getFactoryDefaults()
    }

    let settings = JSON.parse(readFileSync(heroicConfigPath, 'utf-8'))
    settings = {
      ...(await this.getFactoryDefaults()),
      ...settings.defaultSettings
    } as AppSettings
    return settings
  }

  public async getCustomWinePaths(): Promise<Set<WineInstallation>> {
    const customPaths = new Set<WineInstallation>()
    // skips this on new installations to avoid infinite loops
    if (existsSync(heroicConfigPath)) {
      const { customWinePaths = [] } = await this.getSettings()
      customWinePaths.forEach((path: string) => {
        if (path.endsWith('proton')) {
          return customPaths.add({
            bin: `'${path}'`,
            name: `Custom Proton - ${path}`,
            type: 'proton'
          })
        }
        return customPaths.add({
          bin: `'${path}'`,
          name: `Custom Wine - ${path}`,
          type: 'wine',
          ...this.getWineExecs(path)
        })
      })
    }
    return customPaths
  }

  public async getFactoryDefaults(): Promise<AppSettings> {
    const { account_id } = await LegendaryUser.getUserInfo()
    const userName = user().username
    const defaultWine = isWindows ? {} : await this.getDefaultWine()

    return {
      checkUpdatesInterval: 10,
      enableUpdates: false,
      addDesktopShortcuts: false,
      addStartMenuShortcuts: false,
      autoInstallDxvk: false,
      autoInstallVkd3d: false,
      checkForUpdatesOnStartup: !isFlatpak,
      customWinePaths: isWindows ? null : [],
      defaultInstallPath: heroicInstallPath,
      defaultWinePrefix: `${home}/Games/Heroic/Prefixes`,
      language: 'en',
      maxWorkers: 0,
      minimizeOnLaunch: false,
      nvidiaPrime: false,
      otherOptions: '',
      showUnrealMarket: false,
      showFps: false,
      useGameMode: false,
      userInfo: {
        epicId: account_id,
        name: userName
      },
      wineCrossoverBottle: 'Heroic',
      winePrefix: isWindows ? defaultWine : `${home}/.wine`,
      wineVersion: isWindows ? {} : defaultWine
    } as AppSettings
  }

  public async resetToDefaults() {
    this.config = await this.getFactoryDefaults()
    return await this.flush()
  }

  public async flush() {
    return this.writeToFile({
      defaultSettings: this.config,
      version: 'v0'
    })
  }
}

export { GlobalConfig }
