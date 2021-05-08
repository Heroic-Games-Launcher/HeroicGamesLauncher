import {
  existsSync,
  mkdirSync
} from 'graceful-fs'
import axios from 'axios';

import { DXVK } from '../dxvk'
import { ExtraInfo, GameStatus } from '../types';
import { Game } from '../games';
import { GameConfig } from '../game_config';
import { GlobalConfig } from '../config';
import { Library } from './library'
import {
  errorHandler,
  execAsync,
  isOnline
} from '../utils'
import {
  execOptions,
  heroicGamesConfigPath,
  home,
  isWindows,
  legendaryBin
} from '../constants'
import { User } from './user';
class LegendaryGame extends Game {
  public appName: string
  public state : GameStatus
  private static instances : Map<string, LegendaryGame> = new Map()

  private constructor(appName: string) {
    super()
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
    if (!User.isLoggedIn()){
      return []
    }
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
    this.state.status = 'moving'
    const info = await this.getGameInfo()
    newInstallPath += '/' + info.install.install_path.split('/').slice(-1)[0]
    const installpath = info.install.install_path
    await execAsync(`mv -f ${installpath} ${newInstallPath}`)
      .then(() => {
        Library.get().changeGameInstallPath(this.appName, newInstallPath)
      })
      .catch(console.log)
    this.state.status = 'done'
    return newInstallPath
  }

  /**
   * Update game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async update() {
    this.state.status = 'updating'
    const { maxWorkers } = (await GlobalConfig.get().getSettings())
    const workers = maxWorkers === 0 ? '' : `--max-workers ${maxWorkers}`
    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`
    const command = `${legendaryBin} update ${this.appName} ${workers} -y ${writeLog}`

    try {
      return await execAsync(command, { shell: '/bin/bash' }).then((v) => {
        this.state.status = 'done'
        return v
      })
    } catch (error) {
      return await errorHandler({error}).then((v) => {
        this.state.status = 'done'
        return v
      })
    }
  }

  /**
   * Install game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async install(path : string) {
    this.state.status = 'installing'
    const { maxWorkers } = (await GlobalConfig.get().getSettings())
    const workers = maxWorkers === 0 ? '' : `--max-workers ${maxWorkers}`

    //TODO(flavioislima):
    // Need to fix convertion from utf8 to win1252 or vice-versa
    // const selectiveDownloads = sdl ? `echo ${sdl.join(' ')}` : `echo 'hd_textures'`
    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`

    const command = `${legendaryBin} install ${this.appName} --base-path ${path} ${workers} -y ${writeLog}`
    console.log(`Installing ${this.appName} with:`, command)
    try {
      Library.get().installState(this.appName, true)
      return await execAsync(command, execOptions).then((v) => {
        this.state.status = 'done'
        return v
      })
    } catch (error) {
      Library.get().installState(this.appName, false)
      return errorHandler({error, logPath}).then((v) => {
        this.state.status = 'done'
        return v
      })
    }
  }

  public async uninstall() {
    this.state.status = 'uninstalling'
    const command = `${legendaryBin} uninstall ${this.appName} -y`
    console.log(`Uninstalling ${this.appName} with:`, command)
    Library.get().installState(this.appName, false)
    return await execAsync(command, execOptions).then((v) => {
      this.state.status = 'done'
      return v
    })
  }

  /**
   * Repair game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async repair() {
    this.state.status = 'repairing'
    const { maxWorkers } = (await GlobalConfig.get().getSettings())
    const workers = maxWorkers ? `--max-workers ${maxWorkers}` : ''

    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`

    const command = `${legendaryBin} repair ${this.appName} ${workers} -y ${writeLog}`

    console.log(`Repairing ${this.appName} with:`, command)
    return await execAsync(command, execOptions).then((v) => {
      this.state.status = 'done'
      return v
    })
  }

  public async import(path : string) {
    this.state.status = 'installing'
    const command = `${legendaryBin} import-game ${this.appName} '${path}'`
    return await execAsync(command, execOptions).then((v) => {
      this.state.status = 'done'
      return v
    })
  }

  /**
   * Sync saves.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async syncSaves(arg : string, path : string) {
    const fixedPath = isWindows ? path.replaceAll("'", '').slice(0, -1) : path.replaceAll("'", '')
    const command = `${legendaryBin} sync-saves ${arg} --save-path "${fixedPath}" ${this.appName} -y`
    const legendarySavesPath = `${home}/legendary/.saves`

    //workaround error when no .saves folder exists
    if (!existsSync(legendarySavesPath)) {
      mkdirSync(legendarySavesPath, { recursive: true })
    }

    console.log('\n syncing saves for ', this.appName)
    return await execAsync(command)
  }

  public async launch() {
    this.state.status = 'launching'

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

    if (isWindows) {
      const command = `${legendaryBin} launch ${this.appName} ${launcherArgs}`
      console.log('\n Launch Command:', command)
      return await execAsync(command)
    }

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

    return await execAsync(command).then((v) => {
      this.state.status = 'playing'
      return v
    })
  }

  public async stop() {
    // until the legendary bug gets fixed, kill legendary on mac
    // not a perfect solution but it's the only choice for now

    // @adityaruplaha: this is kinda arbitary and I don't understand it.
    //const pattern = process.platform === 'darwin' ? 'legendary' : this.appName

    const { install : { install_path, executable} } = await this.getGameInfo()
    const exe = install_path + '/' + executable
    console.log('killing', this.appName)
    return await execAsync(`pkill -ef ${exe}`).then((v) => {
      this.state.status = 'done'
      return v
    })
  }
}

export {
  LegendaryGame
}
