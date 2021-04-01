import { exec } from 'child_process'
import {
  existsSync,
  mkdir,
  readFileSync,
  readdirSync,
  writeFileSync
} from 'graceful-fs'
import { userInfo as user } from 'os'

import { AppSettings, ConfigVersion, WineProps } from './types'
import {
  currentConfigVersion,
  heroicConfigPath,
  heroicGamesConfigPath,
  heroicInstallPath,
  heroicToolsPath,
  home,
  userInfo
} from './constants'
import {
  execAsync
} from './utils'

/**
 * This class does config handling.
 * This can't be constructed directly. Use the static method get().
 * It automatically selects the appropriate config loader based on the config version.
 *
 * It also implements all the config features that won't change across versions.
 */
abstract class GlobalConfig {
  protected static globalInstance : GlobalConfig

  public abstract version : ConfigVersion

  public config : AppSettings

  /**
   * Get the global configuartion handler.
   *
   * @param version ConfigVersion to use for parsing config file. Default: 'auto'
   * @returns GlobalConfig instance or undefined.
   */
  public static get(version : ConfigVersion = 'auto') : GlobalConfig {
    let configVersion : ConfigVersion = undefined

    // Config file doesn't already exist, make one with the current version.
    if (!existsSync(heroicConfigPath)) {
      configVersion = currentConfigVersion

      // For autodetect.
      if (version === 'auto') {
        version = currentConfigVersion
      }
    }
    // Config file exists, detect its version.
    else {
      // Check version field in the config.
      configVersion = JSON.parse(readFileSync(heroicConfigPath, 'utf-8'))['version']
      // Legacy config file without a version field, it's a v0 config.
      if (configVersion === undefined) {
        configVersion = 'v0'
      }

      // For autodetect.
      if (version === 'auto') {
        version = configVersion
      }
    }

    // Check for version mismatches.
    // Should never happen for 'auto'.
    if (version !== configVersion) {
      console.log(`Config version mismatch! Requested: ${version}. Found: ${configVersion}.`)
    }

    // Select loader to use.
    switch (version) {
    case 'v0':
      if (GlobalConfig.globalInstance === undefined) {
        GlobalConfig.globalInstance = new GlobalConfigV0()
      }
      break;
    default:
      console.log(`Invalid config version '${version}' requested.`)
      break;
    }

    return GlobalConfig.globalInstance
  }

  /**
   * Detects Wine on the user's system.
   *
   * @returns An Array of wine installations.
   */
  public async getAlternativeWine(): Promise<WineProps[]> {
    // Just add a new string here in case another path is found on another distro
    const steamPaths: string[] = [
      `${home}/.local/share/Steam`,
      `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
      '/usr/share/steam'
    ]

    if (!existsSync(`${heroicToolsPath}/wine`)) {
      exec(`mkdir '${heroicToolsPath}/wine' -p`, () => {
        return 'done'
      })
    }

    if (!existsSync(`${heroicToolsPath}/proton`)) {
      exec(`mkdir '${heroicToolsPath}/proton' -p`, () => {
        return 'done'
      })
    }

    const protonPaths: string[] = [`${heroicToolsPath}/proton/`]
    const foundPaths = steamPaths.filter((path) => existsSync(path))

    const defaultWine = { bin: '', name: '' }
    await execAsync(`which wine`)
      .then(async ({ stdout }) => {
        defaultWine.bin = stdout.split('\n')[0]
        const { stdout: out } = await execAsync(`wine --version`)
        defaultWine.name = `Wine - ${out.split('\n')[0]}`
      })
      .catch(() => console.log('Wine not installed'))

    foundPaths.forEach((path) => {
      protonPaths.push(`${path}/steamapps/common/`)
      protonPaths.push(`${path}/compatibilitytools.d/`)
      return
    })

    const lutrisPath = `${home}/.local/share/lutris`
    const lutrisCompatPath = `${lutrisPath}/runners/wine/`
    const proton: Set<{ bin: string; name: string }> = new Set()
    const altWine: Set<{ bin: string; name: string }> = new Set()
    const customPaths: Set<{ bin: string; name: string }> = new Set()

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

    if (existsSync(lutrisCompatPath)) {
      readdirSync(lutrisCompatPath).forEach((version) => {
        altWine.add({
          bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
          name: `Wine - ${version}`
        })
      })
    }

    readdirSync(`${heroicToolsPath}/wine/`).forEach((version) => {
      altWine.add({
        bin: `'${lutrisCompatPath}${version}/bin/wine64'`,
        name: `Wine - ${version}`
      })
    })

    // skips this on new installations to avoid infinite loops
    if (existsSync(heroicConfigPath)) {
      const { customWinePaths } = await this.getSettings()
      if (customWinePaths.length) {
        customWinePaths.forEach((path: string) => {
          if (path.endsWith('proton')) {
            return customPaths.add({
              bin: `'${path}'`,
              name: `Proton Custom - ${path}`
            })
          }
          return customPaths.add({
            bin: `'${path}'`,
            name: `Wine Custom - ${path}`
          })
        })
      }
    }

    return [defaultWine, ...altWine, ...proton, ...customPaths]
  }

  public isLoggedIn() {
    return existsSync(userInfo)
  }

  public getUserInfo() {
    if (this.isLoggedIn()) {
      return JSON.parse(readFileSync(userInfo, 'utf-8'))
    }
    return { account_id: '', displayName: null }
  }

  protected abstract getSettings() : Promise<AppSettings>

  public abstract makeLatest() : void

  public abstract resetToDefaults() : void

  protected writeToFile(config : Record<string, unknown>) {
    return writeFileSync(heroicConfigPath, JSON.stringify(config, null, 2))
  }

  public abstract flush() : void

  protected async load() {
    if (!existsSync(heroicGamesConfigPath)) {
      mkdir(heroicGamesConfigPath, () => {
        return 'done'
      })
    }
    if (!existsSync(heroicConfigPath)) {
      this.resetToDefaults()
    }
    // always convert before loading to avoid errors.
    // getSettings doesn't return an AppSettings otherwise.
    if (this.version !== currentConfigVersion) {
      this.makeLatest()
      this.load()
    }
    else {
      this.version = currentConfigVersion
      this.config = await this.getSettings()
    }
  }
}

class GlobalConfigV0 extends GlobalConfig {
  public version : ConfigVersion = 'v0'

  constructor() {
    super()
    this.load()
  }

  public makeLatest() {
    // Here we rewrite the config object to match the latest format and write to file.
    // Not necessary as this is the current version.
  }

  protected async getSettings(): Promise<AppSettings> {
    if (!existsSync(heroicConfigPath)) {
      await this.resetToDefaults()
      return this.config
    }

    const settings = JSON.parse(readFileSync(heroicConfigPath, 'utf-8'))
    return settings.defaultSettings
  }

  public async resetToDefaults() {
    const { account_id } = this.getUserInfo()
    const userName = user().username
    const [defaultWine] = await this.getAlternativeWine()

    this.config = {
      defaultInstallPath: heroicInstallPath,
      language: 'en',
      maxWorkers: 0,
      otherOptions: '',
      showFps: false,
      useGameMode: false,
      userInfo: {
        epicId: account_id,
        name: userName
      },
      winePrefix: `${home}/.wine`,
      wineVersion: defaultWine
    } as AppSettings

    return await this.flush()
  }

  public async flush() {
    return this.writeToFile({
      defaultSettings: this.config,
      version: 'v0'
    })
  }
}

export {
  GlobalConfig
}