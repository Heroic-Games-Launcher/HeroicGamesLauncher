import { User } from 'legendary_utils/user';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'graceful-fs';
import { userInfo as user } from 'os';

import {
  AppSettings,
  GlobalConfigVersion,
  WineInstallation
} from './types';
import {
  currentGlobalConfigVersion,
  heroicConfigPath,
  heroicGamesConfigPath,
  heroicInstallPath,
  heroicToolsPath,
  home,
  isWindows
} from './constants';
import { execAsync } from './utils';

/**
 * This class does config handling.
 * This can't be constructed directly. Use the static method get().
 * It automatically selects the appropriate config loader based on the config version.
 *
 * It also implements all the config features that won't change across versions.
 */
abstract class GlobalConfig {
  protected static globalInstance : GlobalConfig

  public abstract version : GlobalConfigVersion

  public config : AppSettings

  /**
   * Get the global configuartion handler.
   * If one doesn't exist, create one.
   *
   * @returns GlobalConfig instance.
   */
  public static get() : GlobalConfig {
    let version : GlobalConfigVersion

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
  private static reload(version : GlobalConfigVersion) : void {
    // Select loader to use.
    switch (version) {
    case 'v0':
      GlobalConfig.globalInstance = new GlobalConfigV0()
      break;
    default:
      console.log(`GlobalConfig: Invalid config version '${version}' requested.`)
      break;
    }
    // Try to upgrade outdated config.
    if (GlobalConfig.globalInstance.upgrade()) {
      // Upgrade done, we need to fully reload config.
      console.log(`GlobalConfig: Upgraded outdated ${version} config to ${currentGlobalConfigVersion}.`)
      return GlobalConfig.reload(currentGlobalConfigVersion)
    }
    else if (version !== currentGlobalConfigVersion) {
      // Upgrade failed.
      console.log(`GlobalConfig: Failed to upgrade outdated ${version} config.`)
    }
  }

  /**
   * Detects Wine/Proton on the user's system.
   *
   * @returns An Array of Wine/Proton installations.
   */
  public async getAlternativeWine(scanCustom = true): Promise<WineInstallation[]> {
    let defaultWine = { bin: '', name: '' }
    if (isWindows) {
      return [defaultWine]
    }

    if (!existsSync(`${heroicToolsPath}/wine`)) {
      mkdirSync(`${heroicToolsPath}/wine`, {recursive: true})
    }

    if (!existsSync(`${heroicToolsPath}/proton`)) {
      mkdirSync(`${heroicToolsPath}/proton`, {recursive: true})
    }


    defaultWine = { bin: '', name: 'Default Wine - Not Found' }
    await execAsync(`which wine`)
      .then(async ({ stdout }) => {
        defaultWine.bin = stdout.split('\n')[0]
        const { stdout: out } = await execAsync(`wine --version`)
        const version = out.split('\n')[0]
        defaultWine.name = `Wine - ${version}`
      })
      .catch(() => console.log('Default Wine not installed'))

    const altWine: Set<WineInstallation> = new Set()

    readdirSync(`${heroicToolsPath}/wine/`).forEach((version) => {
      altWine.add({
        bin: `'${heroicToolsPath}/wine/${version}/bin/wine64'`,
        name: `Wine - ${version}`
      })
    })

    const lutrisPath = `${home}/.local/share/lutris`
    const lutrisCompatPath = `${lutrisPath}/runners/wine/`

    if (existsSync(lutrisCompatPath)) {
      readdirSync(lutrisCompatPath).forEach((version) => {
        altWine.add({
          bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
          name: `Wine - ${version}`
        })
      })
    }

    const protonPaths: string[] = [`${heroicToolsPath}/proton/`]

    // Known places where Steam might be found.
    // Just add a new string here in case another path is found on another distro.
    const steamPaths: string[] = [
      `${home}/.steam`,
      `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
      '/usr/share/steam'
    ].filter((path) => existsSync(path))

    steamPaths.forEach((path) => {
      protonPaths.push(`${path}/steam/steamapps/common/`)
      protonPaths.push(`${path}/root/compatibilitytools.d/`)
      return
    })

    const proton: Set<WineInstallation> = new Set()

    protonPaths.forEach((path) => {
      if (existsSync(path)) {
        readdirSync(path).forEach((version) => {
          if (version.toLowerCase().startsWith('proton')) {
            proton.add({
              bin: `'${path}${version}/proton'`,
              name: `Proton - ${version}`
            })
          }
        })
      }
    })

    if(!scanCustom) {
      return [defaultWine, ...altWine, ...proton]
    }
    return [defaultWine, ...altWine, ...proton, ...(await this.getCustomWinePaths())]
  }

  /**
   * Gets the actual settings from the config file.
   * Does not modify its parent object.
   * Always reads from file regardless of `this.config`.
   *
   * @returns Settings present in config file.
   */
  public abstract getSettings() : Promise<AppSettings>

  /**
   * Updates this.config, this.version to upgrade the current config file.
   *
   * Writes to file after that.
   * DO NOT call `flush()` afterward.
   *
   * @returns true if upgrade successful, false if upgrade fails or no upgrade needed.
   */
  public abstract upgrade() : boolean

  /**
   * Get custom Wine installations as defined in the config file.
   *
   * @returns Set of Wine installations.
   */
  public abstract getCustomWinePaths() : Promise<Set<WineInstallation>>

  /**
   * Get default settings as if the user's config file doesn't exist.
   * Doesn't modify the parent object.
   * Doesn't access config files.
   *
   * @returns AppSettings
   */
  public abstract getFactoryDefaults() : Promise<AppSettings>

  /**
   * Reset `this.config` to `getFactoryDefaults()` and flush.
   */
  public abstract resetToDefaults() : void

  protected writeToFile(config : Record<string, unknown>) {
    return writeFileSync(heroicConfigPath, JSON.stringify(config, null, 2))
  }

  /**
   * Write `this.config` to file.
   * Uses the config version defined in `this.version`.
   */
  public abstract flush() : void

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
    }
    else {
      // No upgrades necessary, load config.
      // `this.version` should be `currentGlobalConfigVersion` at this point.
      this.config = await this.getSettings() as AppSettings
    }
  }
}

class GlobalConfigV0 extends GlobalConfig {
  public version : GlobalConfigVersion = 'v0'

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
    if(!existsSync(heroicGamesConfigPath)){
      mkdirSync(heroicGamesConfigPath, {recursive: true})
    }

    if (!existsSync(heroicConfigPath)) {
      return await this.getFactoryDefaults()
    }

    let settings = JSON.parse(readFileSync(heroicConfigPath, 'utf-8'))
    settings = {...(await this.getFactoryDefaults()), ...settings.defaultSettings} as AppSettings
    return settings
  }

  public async getCustomWinePaths(): Promise<Set<WineInstallation>> {
    const customPaths : Set<WineInstallation> = new Set()
    // skips this on new installations to avoid infinite loops
    if (existsSync(heroicConfigPath)) {
      const { customWinePaths = [] } = await this.getSettings()
      customWinePaths.forEach((path: string) => {
        if (path.endsWith('proton')) {
          return customPaths.add({
            bin: `'${path}'`,
            name: `Custom Proton - ${path}`
          })
        }
        return customPaths.add({
          bin: `'${path}'`,
          name: `Custom Wine - ${path}`
        })
      })
    }
    return customPaths
  }

  public async getFactoryDefaults(): Promise<AppSettings> {
    const { account_id } = User.getUserInfo()
    const userName = user().username
    const [defaultWine] = await this.getAlternativeWine(false)

    return {
      customWinePaths: isWindows ? null : [],
      defaultInstallPath: heroicInstallPath,
      language: 'en',
      maxWorkers: 0,
      nvidiaPrime: false,
      otherOptions: '',
      showFps: false,
      useGameMode: false,
      userInfo: {
        epicId: account_id,
        name: userName
      },
      winePrefix: isWindows ? defaultWine : `${home}/.wine`,
      wineVersion: isWindows ? defaultWine : {}
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

export { GlobalConfig };
