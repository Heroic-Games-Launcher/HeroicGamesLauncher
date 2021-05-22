import {
  existsSync,
  mkdirSync
} from 'graceful-fs'
import axios from 'axios';

import { DXVK } from './dxvk'
import { ExtraInfo, GameInfo, GameSettings, GameStatus } from './types';
import { GameConfig } from './game_config';
import { GlobalConfig } from './config';
import { Library } from './legendary_utils/library'
import {
  errorHandler,
  execAsync,
  isOnline
} from './utils'
import {
  heroicGamesConfigPath,
  home,
  legendaryBin,
  shell
} from './constants'

type ExecResult = void | {stderr : string, stdout : string}
interface Game {
  appName: string,
  getExtraInfo(namespace : string) : Promise<ExtraInfo>,
  getGameInfo() : Promise<GameInfo>,
  getSettings() : Promise<GameSettings>,
  hasUpdate() : Promise<boolean>,
  import(path : string) : Promise<ExecResult>,
  install(path : string) : Promise<ExecResult>,
  launch() : Promise<ExecResult>
  moveInstall(newInstallPath : string) : Promise<string>,
  repair() : Promise<ExecResult>,
  state: GameStatus,
  syncSaves(arg : string, path : string) : Promise<ExecResult>
  uninstall() : Promise<ExecResult>
  update() : Promise<ExecResult>
}
class LegendaryGame implements Game {
  public appName: string
  public state : GameStatus
  private static instances : Map<string, LegendaryGame> = new Map()

  private constructor(appName: string) {
    this.appName = appName
  }

  public static get(appName: string) {
    if (LegendaryGame.instances.get(appName) === undefined) {
      LegendaryGame.instances.set(appName, new LegendaryGame(appName))
    }
    return LegendaryGame.instances.get(appName)
  }

  /**
   * Alias for `Library.listUpdateableGames`
   */
  public static async checkGameUpdates() {
    return await Library.get().listUpdateableGames()
  }

  /**
   * Alias for `Library.getGameInfo(this.appName)`
   *
   * @returns GameInfo
   */
  public async getGameInfo() {
    return await Library.get().getGameInfo(this.appName)
  }

  private async getProductSlug(namespace: string) {
    const graphql = JSON.stringify({
      query: `{Catalog{catalogOffers( namespace:"${namespace}"){elements {productSlug}}}}`,
      variables: {}
    })
    const result = await axios('https://www.epicgames.com/graphql', {
      data: graphql,
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    })
    const res = result.data.data.Catalog.catalogOffers
    const slug = res.elements.find((e: { productSlug: string }) => e.productSlug)
    if (slug) {
      return slug.productSlug.replace(/(\/.*)/, '')
    } else {
      return this.appName
    }
  }

  /**
   * Get extra info from Epic's API.
   *
   * @param namespace
   * @returns
   */
  public async getExtraInfo(namespace: string | null) : Promise<ExtraInfo> {
    if (!(await isOnline())) {
      return {
        about: {},
        reqs: []
      } as ExtraInfo
    }
    let lang = GlobalConfig.get().config.language
    if (lang === 'pt') {
      lang = 'pt-BR'
    }

    let epicUrl: string
    if (namespace) {
      const productSlug: string = await this.getProductSlug(namespace)
      epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${productSlug}`
    } else {
      epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${this.appName}`
    }
    try {
      const response = await axios({
        method: 'GET',
        url: epicUrl
      })
      delete response.data.pages[0].data.requirements.systems[0].details[0]
      const about = response.data.pages.find(
        (e: { type: string }) => e.type === 'productHome'
      )
      return {
        about: about.data.about,
        reqs: about.data.requirements.systems[0].details
      } as ExtraInfo
    } catch (error) {
      return {
        about: {},
        reqs: []
      } as ExtraInfo
    }
  }

  /**
   * Alias for `GameConfig.get(this.appName).config`
   * If it doesn't exist, uses getSettings() instead.
   *
   * @returns GameConfig
   */
  public async getSettings() {
    return GameConfig.get(this.appName).config || await GameConfig.get(this.appName).getSettings()
  }

  /**
   * Helper for `checkGameUpdates().contains(this.appName)`
   *
   * @returns If game has an update.
   */
  public async hasUpdate() {
    return (await Library.get().listUpdateableGames()).includes(this.appName)
  }

  /**
   * Parent folder to move app to.
   * Amends install path by adding the appropriate folder name.
   *
   * @param newInstallPath
   * @returns The amended install path.
   */
  public async moveInstall(newInstallPath : string) {
    const info = await this.getGameInfo()
    newInstallPath += '/' + info.install.install_path.split('/').slice(-1)[0]
    const installpath = info.install.install_path
    await execAsync(`mv -f ${installpath} ${newInstallPath}`)
      .then(() => {
        Library.get().changeGameInstallPath(this.appName, newInstallPath)
      })
      .catch(console.log)
    return newInstallPath
  }

  /**
   * Update game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async update() {
    const logPath = `${heroicGamesConfigPath}${this.appName}.log`
    const command = `${legendaryBin} update ${this.appName} -y &> ${logPath}`

    try {
      return await execAsync(command, { shell: '/bin/bash' })
    } catch (error) {
      return await errorHandler(logPath)
    }
  }

  /**
   * Install game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async install(path : string) {
    const { maxWorkers } = (await GlobalConfig.get().getSettings())
    const workers = maxWorkers === 0 ? '' : `--max-workers ${maxWorkers}`

    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const sockPath = `"/tmp/heroic/install-${this.appName}.sock"`
    const command = `${legendaryBin} install ${this.appName} --base-path ${path} ${workers} -y |& tee ${logPath} ${sockPath}`
    console.log(`Installing ${this.appName} with:`, command)
    // TODO(adityaruplaha):Create a socket connection for requestGameProgress
    try {
      Library.get().installState(this.appName, true)
      return await execAsync(command, { shell: shell })
    } catch (error) {
      Library.get().installState(this.appName, false)
      return errorHandler(logPath)
    }
  }

  public async uninstall() {
    const command = `${legendaryBin} uninstall ${this.appName} -y`
    console.log(`Uninstalling ${this.appName} with:`, command)
    Library.get().installState(this.appName, false)
    return await execAsync(command, { shell: shell })
  }

  /**
   * Repair game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async repair() {
    const { maxWorkers } = (await GlobalConfig.get().getSettings())
    const workers = maxWorkers ? `--max-workers ${maxWorkers}` : ''

    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const command = `${legendaryBin} repair ${this.appName} ${workers} -y &> ${logPath}`

    console.log(`Repairing ${this.appName} with:`, command)
    return await execAsync(command, { shell: shell })
  }

  public async import(path : string) {
    const command = `${legendaryBin} import-game ${this.appName} '${path}'`
    const { stderr, stdout } = await execAsync(command, { shell: shell })
    return {stderr, stdout}
  }

  /**
   * Sync saves.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async syncSaves(arg : string, path : string) {
    const fixedPath = path.replaceAll("'", '')
    const command = `${legendaryBin} sync-saves --save-path "${fixedPath}" ${arg} ${this.appName} -y`
    const legendarySavesPath = `${home}/legendary/.saves`

    //workaround error when no .saves folder exists
    if (!existsSync(legendarySavesPath)) {
      mkdirSync(legendarySavesPath, { recursive: true })
    }

    console.log('\n syncing saves for ', this.appName)
    return await execAsync(command)
  }

  public async launch() {
    let envVars = ''
    let gameMode: string

    const {
      winePrefix,
      wineVersion,
      otherOptions,
      useGameMode,
      showFps,
      nvidiaPrime,
      launcherArgs = '',
      showMangohud,
      audioFix,
      autoInstallDxvk
    } = await this.getSettings()

    const fixedWinePrefix = winePrefix.replace('~', home)
    let wineCommand = `--wine ${wineVersion.bin}`

    // We need to keep replacing the ' to keep compatibility with old configs
    let prefix = `--wine-prefix '${fixedWinePrefix.replaceAll("'", '')}'`

    const isProton =
      wineVersion.name.includes('Proton') ||
      wineVersion.name.includes('Steam')
    prefix = isProton ? '' : prefix

    const options = {
      audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
      fps: showFps ? `DXVK_HUD=fps` : '',
      other: otherOptions ? otherOptions : '',
      prime: nvidiaPrime ? '__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia' : '',
      proton: isProton
        ? `STEAM_COMPAT_DATA_PATH='${winePrefix
          .replaceAll("'", '')
          .replace('~', home)}'`
        : '',
      showMangohud: showMangohud ? `MANGOHUD=1` : ''
    }

    envVars = Object.values(options).join(' ')
    if (isProton) {
      console.log(
        `\n You are using Proton, this can lead to some bugs, 
              please do not open issues with bugs related with games`,
        wineVersion.name
      )
    }

    // Proton doesn't create a prefix folder so this is a workaround
    if (isProton && !existsSync(fixedWinePrefix)) {
      const command = `mkdir '${fixedWinePrefix}' -p`
      await execAsync(command)
    }

    // Install DXVK for non Proton Prefixes
    if (!isProton && autoInstallDxvk) {
      await DXVK.install(winePrefix)
    }

    if (wineVersion.name !== 'Wine Default') {
      const { bin } = wineVersion
      wineCommand = isProton
        ? `--no-wine --wrapper "${bin} run"`
        : `--wine ${bin}`
    }

    // check if Gamemode is installed
    await execAsync(`which gamemoderun`)
      .then(({ stdout }) => (gameMode = stdout.split('\n')[0]))
      .catch(() => console.log('GameMode not installed'))

    const runWithGameMode = useGameMode && gameMode ? gameMode : ''

    const command = `${envVars} ${runWithGameMode} ${legendaryBin} launch ${this.appName}  ${wineCommand} ${prefix} ${launcherArgs}`
    console.log('\n Launch Command:', command)

    return await execAsync(command)
  }
}


export {
  LegendaryGame
}
