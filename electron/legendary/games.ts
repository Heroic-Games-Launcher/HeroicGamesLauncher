import {
  existsSync,
  mkdirSync,
  unlink,
  writeFile
} from 'graceful-fs'
import axios from 'axios';

import { app, shell } from 'electron';
import { DXVK } from '../dxvk'
import { ExtraInfo, GameStatus, InstallArgs } from '../types';
import { Game } from '../games';
import { GameConfig } from '../game_config';
import { GlobalConfig } from '../config';
import { LegendaryLibrary } from './library'
import { LegendaryUser } from './user';
import {
  errorHandler,
  execAsync,
  isOnline
} from '../utils'
import {
  execOptions,
  heroicGamesConfigPath,
  heroicIconFolder,
  home,
  isWindows,
  legendaryBin
} from '../constants'
import { logError, logInfo, logWarning } from '../logger';
import { spawn } from 'child_process';
import Store from 'electron-store'
import makeClient from 'discord-rich-presence-typescript';

const store = new Store({
  cwd: 'store',
  name: 'gameinfo'
})
class LegendaryGame extends Game {
  public appName: string
  public state: GameStatus
  private static instances: Map<string, LegendaryGame> = new Map()

  private constructor(appName: string) {
    super()
    this.appName = appName
    this.state = {
      appName: appName,
      status: 'done'
    }
  }

  public static get(appName: string) {
    if (LegendaryGame.instances.get(appName) === undefined) {
      LegendaryGame.instances.set(appName, new LegendaryGame(appName))
    }
    return LegendaryGame.instances.get(appName)
  }

  /**
   * Alias for `LegendaryLibrary.listUpdateableGames`
   */
  public static async checkGameUpdates() {
    const isLoggedIn = await LegendaryUser.isLoggedIn()
    if (!isLoggedIn) {
      return []
    }
    return await LegendaryLibrary.get().listUpdateableGames()
  }

  /**
   * Alias for `LegendaryLibrary.getGameInfo(this.appName)`
   *
   * @returns GameInfo
   */
  public async getGameInfo() {
    return await LegendaryLibrary.get().getGameInfo(this.appName)
  }


  /**
   * Alias for `LegendaryLibrary.getInstallInfo(this.appName)`
   *
   * @returns InstallInfo
   */
  public async getInstallInfo() {
    return await LegendaryLibrary.get().getInstallInfo(this.appName)
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
  public async getExtraInfo(namespace: string | null): Promise<ExtraInfo> {
    if (store.has(namespace)) {
      return store.get(namespace) as ExtraInfo
    }
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

      const about = response.data.pages.find(
        (e: { type: string }) => e.type === 'productHome'
      )

      store.set(namespace, { about: about.data.about, reqs: about.data.requirements.systems[0].details })
      return {
        about: about.data.about,
        reqs: about.data.requirements.systems[0].details
      } as ExtraInfo
    } catch (error) {
      store.set(namespace, { about: {}, reqs: [] })
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
    return (await LegendaryLibrary.get().listUpdateableGames()).includes(this.appName)
  }

  /**
   * Parent folder to move app to.
   * Amends install path by adding the appropriate folder name.
   *
   * @param newInstallPath
   * @returns The amended install path.
   */
  public async moveInstall(newInstallPath: string) {
    this.state.status = 'moving'
    const info = await this.getGameInfo()
    newInstallPath += '/' + info.install.install_path.split('/').slice(-1)[0]
    const installpath = info.install.install_path
    await execAsync(`mv -f '${installpath}' '${newInstallPath}'`)
      .then(() => {
        LegendaryLibrary.get().changeGameInstallPath(this.appName, newInstallPath)
      })
      .catch(logError)
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
    const workers = maxWorkers === 0 ? '' : ` --max-workers ${maxWorkers}`
    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`
    const command = `${legendaryBin} update ${this.appName}${workers} -y ${writeLog}`

    try {
      return await execAsync(command, execOptions).then((v) => {
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

  public async getIcon(appName: string) {
    if (!existsSync(heroicIconFolder)) {
      mkdirSync(heroicIconFolder)
    }

    const gameInfo = await this.getGameInfo()
    const image = gameInfo.art_square.replaceAll(' ', '%20')
    let ext = image.split('.').reverse()[0]
    if (ext !== 'jpg' && ext !== 'png') {
      ext = 'jpg'
    }
    const icon = `${heroicIconFolder}/${appName}.${ext}`
    if (!existsSync(icon)) {
      await execAsync(`curl '${image}' --output ${icon}`)
    }
    return icon
  }

  private shortcutFiles(gameTitle: string) {
    let desktopFile
    let menuFile

    switch (process.platform) {
    case 'linux': {
      desktopFile = `${app.getPath('desktop')}/${gameTitle}.desktop`
      menuFile = `${home}/.local/share/applications/${gameTitle}.desktop`
      break
    }
    case 'win32': {
      desktopFile = `${app.getPath('desktop')}\\${gameTitle}.lnk`
      menuFile = `${app.getPath('appData')}\\Microsoft\\Windows\\Start Menu\\Programs\\${gameTitle}.lnk`
      break
    }
    default:
      logError("Shortcuts haven't been implemented in the current platform.")
    }

    return [desktopFile, menuFile]
  }

  /**
   * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
   * so that the game can be opened from the start menu and the desktop folder.
   * Both can be disabled with enableDesktopShortcutsOnDesktop and enableDesktopShortcutsOnStartMenu
   * @async
   * @public
   */
  public async addDesktopShortcut(fromMenu?: boolean) {
    if (process.platform === 'darwin') {
      return
    }

    const gameInfo = await this.getGameInfo()
    const launchWithProtocol = `heroic://launch/${gameInfo.app_name}`
    const [ desktopFile, menuFile ] = this.shortcutFiles(gameInfo.title)
    const { addDesktopShortcuts, addStartMenuShortcuts } = await GlobalConfig.get().getSettings()

    switch (process.platform) {
    case 'linux': {
      const icon = await this.getIcon(gameInfo.app_name)
      const shortcut = `[Desktop Entry]
Name=${gameInfo.title}
Exec=xdg-open ${launchWithProtocol}
Terminal=false
Type=Application
MimeType=x-scheme-handler/heroic;
Icon=${icon}
Categories=Game;
`

      if (addDesktopShortcuts || fromMenu) {
        writeFile(desktopFile, shortcut, () => {
          logInfo('Shortcut saved on ' + desktopFile)
        })
      }
      if (addStartMenuShortcuts || fromMenu) {
        writeFile(menuFile, shortcut, () => {
          logInfo('Shortcut saved on ' + menuFile)
        })
      }
      break
    }
    case 'win32': {
      const shortcutOptions = {
        target: launchWithProtocol,
        icon: `${gameInfo.install.install_path}\\${gameInfo.install.executable}`,
        iconIndex: 0
      }

      if (addDesktopShortcuts || fromMenu) {
        shell.writeShortcutLink(desktopFile, shortcutOptions)
      }

      if (addStartMenuShortcuts || fromMenu) {
        shell.writeShortcutLink(menuFile, shortcutOptions)
      }
      break
    }
    default:
      logError("Shortcuts haven't been implemented in the current platform.")
    }
  }

  /**
   * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
   * @async
   * @public
   */
  public async removeDesktopShortcut() {
    const gameInfo = await this.getGameInfo()
    const [ desktopFile, menuFile ] = this.shortcutFiles(gameInfo.title)

    if (desktopFile) {
      unlink(desktopFile, () => logInfo('Desktop shortcut removed'))
    }
    if (menuFile) {
      unlink(menuFile, () => logInfo('Applications shortcut removed'))
    }
  }

  private getSdlList(sdlList: Array<string>){
    // Legendary needs an empty tag for it to download the other needed files
    const defaultTag = ' --install-tag ""'
    return sdlList.map(tag => `--install-tag ${tag}`).join(' ').replaceAll("'", '').concat(defaultTag)
  }

  /**
   * Install game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async install({path, installDlcs, sdlList}: InstallArgs) {
    this.state.status = 'installing'
    const { maxWorkers } = (await GlobalConfig.get().getSettings())
    const workers = maxWorkers === 0 ? '' : `--max-workers ${maxWorkers}`
    const withDlcs = installDlcs ? '--with-dlcs' : '--skip-dlcs'
    const installSdl = sdlList.length ? this.getSdlList(sdlList) : '--skip-sdl'

    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`
    const command = `${legendaryBin} install ${this.appName} --base-path ${path} ${withDlcs} ${installSdl} ${workers} -y ${writeLog}`
    logInfo(`Installing ${this.appName} with:`, command)
    return execAsync(command, execOptions)
      .then(async ({stdout, stderr}) => {
        if (stdout.includes('ERROR')){
          errorHandler({error: {stdout, stderr}, logPath})
          logError(stdout)
          return {status: 'error'}
        }
        this.addDesktopShortcut()
        return {status: 'done'}
      })
  }

  public async uninstall() {
    this.state.status = 'uninstalling'

    const command = `${legendaryBin} uninstall ${this.appName} -y`
    logInfo(`Uninstalling ${this.appName} with:`, command)
    LegendaryLibrary.get().installState(this.appName, false)
    return await execAsync(command, execOptions).then((v) => {
      this.state.status = 'done'
      this.removeDesktopShortcut()
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

    logInfo(`Repairing ${this.appName} with:`, command)
    return await execAsync(command, execOptions).then((v) => {
      this.state.status = 'done'
      return v
    })
  }

  public async import(path: string) {
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
  public async syncSaves(arg: string, path: string) {
    const fixedPath = isWindows ? path.replaceAll("'", '').slice(0, -1) : path.replaceAll("'", '')

    const command = `${legendaryBin} sync-saves ${arg} --save-path "${fixedPath}" ${this.appName} -y`
    const legendarySavesPath = `${home}/legendary/.saves`

    //workaround error when no .saves folder exists
    if (!existsSync(legendarySavesPath)) {
      mkdirSync(legendarySavesPath, { recursive: true })
    }

    logInfo('\n syncing saves for ', this.appName)
    return await execAsync(command, execOptions)
  }

  public async launch(launchArguments?: string) {
    const isOffline = !(await isOnline())
    let envVars = ''
    let gameMode: string

    const {
      winePrefix,
      wineVersion,
      wineCrossoverBottle,
      otherOptions,
      useGameMode,
      showFps,
      nvidiaPrime,
      launcherArgs = '',
      showMangohud,
      audioFix,
      autoInstallDxvk,
      offlineMode,
      enableFSR,
      maxSharpness,
      enableResizableBar,
      enableEsync,
      enableFsync,
      targetExe
    } = await this.getSettings()

    const { discordRPC } = (await GlobalConfig.get().getSettings())
    const DiscordRPC = discordRPC ? makeClient('852942976564723722') : null
    const runOffline = isOffline || offlineMode ? '--offline' : ''
    const exe = targetExe ? `--override-exe ${targetExe}` : ''

    if (discordRPC) {
      // Show DiscordRPC
      // This seems to run when a game is updated, even though the game doesn't start after updating.
      const gameInfo = await this.getGameInfo()
      let os: string

      switch (process.platform) {
      case 'linux':
        os = 'Linux'
        break
      case 'win32':
        os = 'Windows'
        break
      case 'darwin':
        os = 'MacOS'
        break
      default:
        os = 'Unknown OS'
        break
      }

      logInfo('Updating Discord Rich Presence information...')
      DiscordRPC.updatePresence({
        details: gameInfo.title,
        instance: true,
        largeImageKey: 'icon',
        large_text: gameInfo.title,
        startTimestamp: Date.now(),
        state: 'via Heroic on ' + os
      })
    }

    if (isWindows) {
      const command = `${legendaryBin} launch ${this.appName} ${exe} ${runOffline} ${launchArguments ?? ''} ${launcherArgs}`
      logInfo('\n Launch Command:', command)
      const v = await execAsync(command, execOptions)

      logInfo('Stopping Discord Rich Presence if running...')
      discordRPC && DiscordRPC.disconnect()
      logInfo('Stopped Discord Rich Presence.')

      return v
    }

    const fixedWinePrefix = winePrefix.replace('~', home)
    let wineCommand = `--wine ${wineVersion.bin}`

    // We need to keep replacing the ' to keep compatibility with old configs
    let prefix = `--wine-prefix '${fixedWinePrefix.replaceAll("'", '')}'`

    const isProton =
      wineVersion.name.includes('Proton') ||
      wineVersion.name.includes('Steam')
    const isCrossover =
      wineVersion.name.includes('CrossOver')
    prefix = (isProton || isCrossover) ? '' : prefix
    const x = wineVersion.bin.split('/')
    x.pop()
    const winePath = x.join('/').replaceAll("'", '')
    const options = {
      audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
      crossoverBottle: (isCrossover && wineCrossoverBottle != '') ? `CX_BOTTLE=${wineCrossoverBottle}` : '' ,
      fps: showFps ? `DXVK_HUD=fps` : '',
      fsr: enableFSR ? 'WINE_FULLSCREEN_FSR=1' : '',
      esync: enableEsync ? 'WINEESYNC=1' : '',
      fsync: enableFsync ? 'WINEFSYNC=1' : '',
      sharpness: enableFSR ? `WINE_FULLSCREEN_FSR_STRENGTH=${maxSharpness}` : '',
      resizableBar: enableResizableBar ? `VKD3D_CONFIG=upload_hvv` : '',
      other: otherOptions ? otherOptions : '',
      prime: nvidiaPrime ? '__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia' : '',
      proton: isProton
        ? `STEAM_COMPAT_CLIENT_INSTALL_PATH=${home}/.steam/steam STEAM_COMPAT_DATA_PATH='${winePrefix
          .replaceAll("'", '')
          .replace('~', home)}'`
        : '',
      showMangohud: showMangohud ? `MANGOHUD=1` : ''
    }


    envVars = Object.values(options).join(' ')
    if (isProton) {
      logWarning(
        `\n You are using Proton, this can lead to some bugs,
              please do not open issues with bugs related with games`,
        wineVersion.name
      )
    }

    await this.createNewPrefix(isProton, fixedWinePrefix, winePath);

    // Install DXVK for non Proton/CrossOver Prefixes
    if (!isProton && !isCrossover && autoInstallDxvk) {
      await DXVK.installRemove(winePrefix, 'dxvk', 'backup')
      await DXVK.installRemove(winePrefix, 'vkd3d', 'backup')
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
      .catch(() => logWarning('GameMode not installed'))

    const runWithGameMode = useGameMode && gameMode ? gameMode : ''

    const command = `${envVars} ${runWithGameMode} ${legendaryBin} launch ${this.appName} ${exe} ${runOffline} ${wineCommand} ${prefix} ${launchArguments ?? ''} ${launcherArgs}`
    logInfo('\n Launch Command:', command)
    const v = await execAsync(command, execOptions).then((v) => {
      this.state.status = 'playing'
      return v
    })

    logInfo('Stopping Discord Rich Presence if running...')
    discordRPC && DiscordRPC.disconnect()
    logInfo('Stopped Discord Rich Presence.')

    return v
  }

  private async createNewPrefix(isProton: boolean, fixedWinePrefix: string, winePath: string) {
    if (isProton && !existsSync(fixedWinePrefix)) {
      const command = `mkdir '${fixedWinePrefix}' -p`;
      await execAsync(command, execOptions);
    }

    if (!existsSync(fixedWinePrefix)) {
      const initPrefixCommand = `WINEPREFIX='${fixedWinePrefix}' '${winePath}/wineboot' -i &&  '${winePath}/wineserver' --wait`;
      logInfo('creating new prefix', fixedWinePrefix)
      return execAsync(initPrefixCommand)
        .then(() => logInfo('Prefix created succesfuly!'))
        .catch((error) => logError(error))
    }
  }

  public async stop() {
    // until the legendary bug gets fixed, kill legendary on mac
    // not a perfect solution but it's the only choice for now

    // @adityaruplaha: this is kinda arbitary and I don't understand it.
    const pattern = process.platform === 'linux' ? this.appName : 'legendary'
    logInfo('killing', pattern)

    if (process.platform === 'win32') {
      try {
        await execAsync(`Stop-Process -name  ${pattern}`, execOptions)
        return logInfo(`${pattern} killed`);
      } catch (error) {
        return logError(`not possible to kill ${pattern}`, error);
      }
    }

    const child = spawn('pkill', ['-f', pattern])
    child.on('exit', () => {
      return logInfo(`${pattern} killed`);
    })
  }
}

export {
  LegendaryGame
}
