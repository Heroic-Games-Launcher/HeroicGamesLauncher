import {
  existsSync,
  readFileSync
} from 'graceful-fs'
import axios from 'axios';

import { DXVK } from './dxvk'
import { GameStatus } from 'types';
import { GlobalConfig } from './new_config';
import { Library } from './legendary_utils/library'
import {
  errorHandler,
  execAsync,
  isOnline
} from './utils'
import { getSettings } from './config'
import {
  heroicConfigPath,
  heroicGamesConfigPath,
  home,
  legendaryBin,
  shell
} from './constants'


class LegendaryGame {
  public appName: string
  public state : GameStatus
  private static instances : Map<string, LegendaryGame>

  private constructor(appName: string) {
    this.appName = appName
  }

  public static get(appName: string) {
    if (LegendaryGame.instances.get(appName) === undefined) {
      LegendaryGame.instances.set(appName, new LegendaryGame(appName))
    }
    return LegendaryGame.instances.get(appName)
  }

  public getGameInfo() {
    return Library.get().getGameInfo(this.appName)
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

  public async getExtraInfo(namespace: string | null) {
    if (!(await isOnline())) {
      return {}
    }
    let lang = JSON.parse(readFileSync(heroicConfigPath, 'utf-8')).defaultSettings
      .language
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
      }
    } catch (error) {
      return {}
    }
  }

  public async getSettings() {
    return await getSettings(this.appName)
  }

  public async hasUpdate() {
    return (await Library.get().listUpdateableGames()).find((app_name) => {
      return app_name == this.appName
    }) !== undefined
  }

  public async update() {
    const logPath = `${heroicGamesConfigPath}${this.appName}.log`
    const command = `${legendaryBin} update ${this.appName} -y &> ${logPath}`

    try {
      return await execAsync(command, { shell: '/bin/bash' })
    } catch (error) {
      return errorHandler(logPath)
    }
  }

  public async install(path : string) {
    const { defaultInstallPath, maxWorkers } = (await GlobalConfig.get().getSettings())
    const workers = maxWorkers === 0 ? '' : `--max-workers ${maxWorkers}`

    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const sockPath = `"/tmp/heroic/install-${this.appName}.sock"`
    let command = `${legendaryBin} install ${this.appName} --base-path '${path}' ${workers} -y |& tee ${logPath} ${sockPath}`
    if (path === 'default') {
      command = `${legendaryBin} install ${this.appName} --base-path ${defaultInstallPath} ${workers} -y |& tee ${logPath} ${sockPath}`
    }
    console.log(`Installing ${this.appName} with:`, command)
    // TODO(adityaruplaha):Create a socket connection for requestGameProgress
    try {
      return await execAsync(command, { shell: shell })
    } catch (error) {
      return errorHandler(logPath)
    }
  }

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

  public static async checkGameUpdates() {
    return await Library.get().listUpdateableGames()
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
      wineVersion.name.startsWith('Proton') ||
      wineVersion.name.startsWith('Steam')
    prefix = isProton ? '' : prefix

    const options = {
      audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
      fps: showFps ? `DXVK_HUD=fps` : '',
      other: otherOptions ? otherOptions : '',
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