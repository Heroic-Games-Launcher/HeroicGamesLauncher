import { WineInstallation } from './../types'
import { existsSync, mkdirSync, unlink, writeFile } from 'graceful-fs'
import axios from 'axios'

import { app, BrowserWindow, dialog, shell } from 'electron'
import { DXVK } from '../dxvk'
import { ExecResult, ExtraInfo, InstallArgs } from '../types'
import { Game } from '../games'
import { GameConfig } from '../game_config'
import { GlobalConfig } from '../config'
import { LegendaryLibrary } from './library'
import { LegendaryUser } from './user'
import {
  errorHandler,
  execAsync,
  isEpicServiceOffline,
  isOnline,
  removeSpecialcharacters
} from '../utils'
import {
  execOptions,
  heroicGamesConfigPath,
  heroicIconFolder,
  home,
  isMac,
  isWindows,
  legendaryBin
} from '../constants'
import {
  logDebug,
  logError,
  logInfo,
  LogPrefix,
  logWarning
} from '../logger/logger'
import { spawn } from 'child_process'
import Store from 'electron-store'
import makeClient from 'discord-rich-presence-typescript'
import i18next from 'i18next'

const store = new Store({
  cwd: 'lib-cache',
  name: 'gameinfo'
})
class LegendaryGame extends Game {
  public appName: string
  public window = BrowserWindow.getAllWindows()[0]
  private static instances: Map<string, LegendaryGame> = new Map()

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
    const slug = res.elements.find(
      (e: { productSlug: string }) => e.productSlug
    )
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
    if (lang === 'zh_Hans') {
      lang = 'zh-CN'
    }

    let epicUrl: string
    if (namespace) {
      let productSlug: string
      try {
        productSlug = await this.getProductSlug(namespace)
      } catch (error) {
        logError(`${error}`, LogPrefix.Legendary)
        productSlug = this.appName
      }
      epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${productSlug}`
    } else {
      epicUrl = `https://store-content.ak.epicgames.com/api/${lang}/content/products/${this.appName}`
    }
    try {
      const { data } = await axios({
        method: 'GET',
        url: epicUrl
      })
      logInfo('Getting Info from Epic API', LogPrefix.Legendary)

      const about = data.pages.find(
        (e: { type: string }) => e.type === 'productHome'
      )

      store.set(namespace, {
        about: about.data.about,
        reqs: about.data.requirements.systems[0].details
      })
      return {
        about: about.data.about,
        reqs: about.data.requirements.systems[0].details
      } as ExtraInfo
    } catch (error) {
      logError('Error Getting Info from Epic API', LogPrefix.Legendary)

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
    return (
      GameConfig.get(this.appName).config ||
      (await GameConfig.get(this.appName).getSettings())
    )
  }

  /**
   * Helper for `checkGameUpdates().contains(this.appName)`
   *
   * @returns If game has an update.
   */
  public async hasUpdate() {
    return (await LegendaryLibrary.get().listUpdateableGames()).includes(
      this.appName
    )
  }

  /**
   * Parent folder to move app to.
   * Amends install path by adding the appropriate folder name.
   *
   * @param newInstallPath
   * @returns The amended install path.
   */
  public async moveInstall(newInstallPath: string) {
    const {
      install: { install_path },
      title
    } = await this.getGameInfo()

    if (isWindows) {
      newInstallPath += '\\' + install_path.split('\\').slice(-1)[0]
    } else {
      newInstallPath += '/' + install_path.split('/').slice(-1)[0]
    }

    logInfo(`Moving ${title} to ${newInstallPath}`, LogPrefix.Legendary)
    await execAsync(`mv -f '${install_path}' '${newInstallPath}'`, execOptions)
      .then(() => {
        LegendaryLibrary.get().changeGameInstallPath(
          this.appName,
          newInstallPath
        )
        logInfo(`Finished Moving ${title}`, LogPrefix.Legendary)
      })
      .catch((error) => logError(`${error}`, LogPrefix.Legendary))
    return newInstallPath
  }

  /**
   * Update game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async update() {
    this.window.webContents.send('setGameStatus', {
      appName: this.appName,
      status: 'updating'
    })
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const workers = maxWorkers === 0 ? '' : ` --max-workers ${maxWorkers}`
    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`
    const command = `${legendaryBin} update ${this.appName}${workers} -y ${writeLog}`
    return execAsync(command, execOptions)
      .then(() => {
        this.window.webContents.send('setGameStatus', {
          appName: this.appName,
          status: 'done'
        })
        return { status: 'done' }
      })
      .catch((error) => {
        logError(`${error}`, LogPrefix.Legendary)
        this.window.webContents.send('setGameStatus', {
          appName: this.appName,
          status: 'done'
        })
        return { status: 'error' }
      })
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
        menuFile = `${app.getPath(
          'appData'
        )}\\Microsoft\\Windows\\Start Menu\\Programs\\${gameTitle}.lnk`
        break
      }
      default:
        logError(
          "Shortcuts haven't been implemented in the current platform.",
          LogPrefix.Backend
        )
    }

    return [desktopFile, menuFile]
  }

  /**
   * Adds a desktop shortcut to $HOME/Desktop and to /usr/share/applications
   * so that the game can be opened from the start menu and the desktop folder.
   * Both can be disabled with addDesktopShortcuts and addStartMenuShortcuts
   * @async
   * @public
   */
  public async addShortcuts(fromMenu?: boolean) {
    if (process.platform === 'darwin') {
      return
    }

    const gameInfo = await this.getGameInfo()
    const launchWithProtocol = `heroic://launch/${gameInfo.app_name}`
    const [desktopFile, menuFile] = this.shortcutFiles(gameInfo.title)
    const { addDesktopShortcuts, addStartMenuShortcuts } =
      await GlobalConfig.get().getSettings()

    switch (process.platform) {
      case 'linux': {
        const icon = await this.getIcon(gameInfo.app_name)
        const shortcut = `[Desktop Entry]
Name=${removeSpecialcharacters(gameInfo.title)}
Exec=xdg-open ${launchWithProtocol}
Terminal=false
Type=Application
MimeType=x-scheme-handler/heroic;
Icon=${icon}
Categories=Game;
`

        if (addDesktopShortcuts || fromMenu) {
          writeFile(desktopFile, shortcut, () => {
            logInfo('Shortcut saved on ' + desktopFile, LogPrefix.Backend)
          })
        }
        if (addStartMenuShortcuts || fromMenu) {
          writeFile(menuFile, shortcut, () => {
            logInfo('Shortcut saved on ' + menuFile, LogPrefix.Backend)
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
        logError(
          "Shortcuts haven't been implemented in the current platform.",
          LogPrefix.Backend
        )
    }
  }

  /**
   * Removes a desktop shortcut from $HOME/Desktop and to $HOME/.local/share/applications
   * @async
   * @public
   */
  public async removeShortcuts() {
    const gameInfo = await this.getGameInfo()
    const [desktopFile, menuFile] = this.shortcutFiles(gameInfo.title)

    if (desktopFile) {
      unlink(desktopFile, () =>
        logInfo('Desktop shortcut removed', LogPrefix.Backend)
      )
    }
    if (menuFile) {
      unlink(menuFile, () =>
        logInfo('Applications shortcut removed', LogPrefix.Backend)
      )
    }
  }

  private getSdlList(sdlList: Array<string>) {
    // Legendary needs an empty tag for it to download the other needed files
    const defaultTag = ' --install-tag=""'
    return sdlList
      .map((tag) => `--install-tag ${tag}`)
      .join(' ')
      .replaceAll("'", '')
      .concat(defaultTag)
  }

  /**
   * Install game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async install({
    path,
    installDlcs,
    sdlList,
    platformToInstall
  }: InstallArgs) {
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const workers = maxWorkers === 0 ? '' : `--max-workers ${maxWorkers}`
    const withDlcs = installDlcs ? '--with-dlcs' : '--skip-dlcs'
    const installSdl = sdlList.length ? this.getSdlList(sdlList) : '--skip-sdl'

    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`
    const command = `${legendaryBin} install ${this.appName} --platform ${platformToInstall} --base-path ${path} ${withDlcs} ${installSdl} ${workers} -y ${writeLog}`
    logInfo([`Installing ${this.appName} with:`, command], LogPrefix.Legendary)
    return execAsync(command, execOptions)
      .then(async ({ stdout, stderr }) => {
        if (stdout.includes('ERROR')) {
          errorHandler({ error: { stdout, stderr }, logPath })

          return { status: 'error' }
        }
        return { status: 'done' }
      })
      .catch(() => {
        logInfo('Installaton canceled', LogPrefix.Legendary)
        return { status: 'error' }
      })
  }

  public async uninstall() {
    const command = `${legendaryBin} uninstall ${this.appName} -y`
    logInfo(
      [`Uninstalling ${this.appName} with:`, command],
      LogPrefix.Legendary
    )
    LegendaryLibrary.get().installState(this.appName, false)
    return await execAsync(command, execOptions)
      .then((v) => {
        return v
      })
      .catch((error) => logError(`${error}`, LogPrefix.Legendary))
  }

  /**
   * Repair game.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async repair() {
    // this.state.status = 'repairing'
    const { maxWorkers } = await GlobalConfig.get().getSettings()
    const workers = maxWorkers ? `--max-workers ${maxWorkers}` : ''

    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`

    const command = `${legendaryBin} repair ${this.appName} ${workers} -y ${writeLog}`

    logInfo([`Repairing ${this.appName} with:`, command], LogPrefix.Legendary)
    return await execAsync(command, execOptions)
      .then((v) => {
        // this.state.status = 'done'
        return v
      })
      .catch((error) => logError(`${error}`, LogPrefix.Legendary))
  }

  public async import(path: string) {
    const command = `${legendaryBin} import-game ${this.appName} '${path}'`

    logInfo(
      [`Importing ${this.appName} from ${path} with:`, command],
      LogPrefix.Legendary
    )
    return await execAsync(command, execOptions)
      .then((v) => {
        return v
      })
      .catch((error) => logError(`${error}`, LogPrefix.Legendary))
  }

  /**
   * Sync saves.
   * Does NOT check for online connectivity.
   *
   * @returns Result of execAsync.
   */
  public async syncSaves(arg: string, path: string) {
    const fixedPath = isWindows
      ? path.replaceAll("'", '').slice(0, -1)
      : path.replaceAll("'", '')

    const command = `${legendaryBin} sync-saves ${arg} --save-path "${fixedPath}" ${this.appName} -y`
    const legendarySavesPath = `${home}/legendary/.saves`

    //workaround error when no .saves folder exists
    if (!existsSync(legendarySavesPath)) {
      mkdirSync(legendarySavesPath, { recursive: true })
    }

    logInfo(['Syncing saves for ', this.appName], LogPrefix.Legendary)
    return await execAsync(command, execOptions)
  }

  public async launch(launchArguments?: string) {
    const epicOffline = await isEpicServiceOffline()
    const isOffline = !(await isOnline()) || epicOffline
    let envVars = ''
    let gameModeBin: string
    const gameSettings = await this.getSettings()
    const gameInfo = await this.getGameInfo()

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
      autoInstallVkd3d,
      offlineMode,
      enableFSR,
      maxSharpness,
      enableResizableBar,
      enableEsync,
      enableFsync,
      targetExe
    } = gameSettings

    const { discordRPC } = await GlobalConfig.get().getSettings()
    const DiscordRPC = discordRPC ? makeClient('852942976564723722') : null

    let runOffline = ''
    if (isOffline || offlineMode) {
      if (gameInfo.canRunOffline) {
        runOffline = '--offline'
      } else {
        return dialog.showErrorBox(
          i18next.t(
            'box.error.no-offline-mode.title',
            'Offline mode not supported.'
          ),
          i18next.t(
            'box.error.no-offline-mode.message',
            'Launch aborted! The game requires a internet connection to run it.'
          )
        )
      }
    }

    const exe = targetExe ? `--override-exe ${targetExe}` : ''
    const isMacNative = gameInfo.is_mac_native
    const mangohud = showMangohud ? 'mangohud --dlsym' : ''

    if (discordRPC) {
      // Show DiscordRPC
      // This seems to run when a game is updated, even though the game doesn't start after updating.
      let os: string

      switch (process.platform) {
        case 'linux':
          os = 'Linux'
          break
        case 'win32':
          os = 'Windows'
          break
        case 'darwin':
          os = 'macOS'
          break
        default:
          os = 'Unknown OS'
          break
      }

      logInfo(
        'Updating Discord Rich Presence information...',
        LogPrefix.Backend
      )
      DiscordRPC.updatePresence({
        details: gameInfo.title,
        instance: true,
        largeImageKey: 'icon',
        large_text: gameInfo.title,
        startTimestamp: Date.now(),
        state: 'via Heroic on ' + os
      })
    }

    if (isWindows || (isMac && isMacNative)) {
      const command = `${legendaryBin} launch ${
        this.appName
      } ${exe} ${runOffline} ${launchArguments ?? ''} ${launcherArgs}`
      logInfo(['Launch Command:', command], LogPrefix.Legendary)
      const v = await execAsync(command, execOptions)
      if (discordRPC) {
        logInfo(
          'Stopping Discord Rich Presence if running...',
          LogPrefix.Backend
        )
        DiscordRPC.disconnect()
        logInfo('Stopped Discord Rich Presence.', LogPrefix.Backend)
      }

      return v
    }

    if (!existsSync(wineVersion.bin.replaceAll("'", ''))) {
      return dialog.showErrorBox(
        i18next.t('box.error.wine-not-found.title', 'Wine Not Found'),
        i18next.t(
          'box.error.wine-not-found.message',
          'No Wine Version Selected. Check Game Settings!'
        )
      )
    }

    const fixedWinePrefix = winePrefix.replace('~', home)
    let wineCommand = `--wine ${wineVersion.bin}`

    // We need to keep replacing the ' to keep compatibility with old configs
    let prefix = `--wine-prefix '${fixedWinePrefix.replaceAll("'", '')}'`
    prefix = wineVersion.type == 'wine' ? prefix : ''

    const x = wineVersion.bin.split('/')
    x.pop()
    const winePath = x.join('/').replaceAll("'", '')
    const options = {
      audio: audioFix ? `PULSE_LATENCY_MSEC=60` : '',
      crossoverBottle:
        wineVersion.type == 'crossover' && wineCrossoverBottle != ''
          ? `CX_BOTTLE=${wineCrossoverBottle}`
          : '',
      fps: showFps ? `DXVK_HUD=fps` : '',
      fsr: enableFSR ? 'WINE_FULLSCREEN_FSR=1' : '',
      esync: enableEsync ? 'WINEESYNC=1' : '',
      fsync: enableFsync ? 'WINEFSYNC=1' : '',
      sharpness: enableFSR
        ? `WINE_FULLSCREEN_FSR_STRENGTH=${maxSharpness}`
        : '',
      resizableBar: enableResizableBar ? `VKD3D_CONFIG=upload_hvv` : '',
      other: otherOptions ? otherOptions : '',
      prime: nvidiaPrime
        ? 'DRI_PRIME=1 __NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia'
        : '',
      proton: wineVersion.type == 'proton' ? this.getEnvSetup() : ''
    }

    envVars = Object.values(options)
      .filter((n) => n)
      .join(' ')
    if (wineVersion.type == 'proton') {
      logWarning(
        [
          `You are using Proton, this can lead to some bugs. Please do not open issues with bugs related with games`,
          wineVersion.name
        ],
        LogPrefix.Backend
      )
    }

    await this.verifyPrefix(fixedWinePrefix)

    // Install DXVK for non Proton/CrossOver Prefixes
    if (!isProton && !isCrossover && autoInstallDxvk) {
      await DXVK.installRemove(winePrefix, wineVersion.bin, 'dxvk', 'backup')
    }

    // Install VKD3D for non Proton/CrossOver Prefixes
    if (!isProton && !isCrossover && autoInstallVkd3d) {
      await DXVK.installRemove(winePrefix, winePath, 'vkd3d', 'backup')
    }

    if (wineVersion.name !== 'Wine Default') {
      const { bin } = wineVersion
      wineCommand =
        wineVersion.type == 'proton'
          ? `--no-wine --wrapper "${bin} run"`
          : `--wine ${bin}`
    }

    // check if Gamemode is installed
    await execAsync(`which gamemoderun`)
      .then(({ stdout }) => (gameModeBin = stdout.split('\n')[0]))
      .catch(() => logWarning('GameMode not installed', LogPrefix.Backend))

    const runWithGameMode = useGameMode && gameModeBin ? gameModeBin : ''

    const command = [
      envVars,
      runWithGameMode,
      mangohud,
      legendaryBin,
      'launch',
      this.appName,
      exe,
      runOffline,
      wineCommand,
      prefix,
      launchArguments,
      launcherArgs
    ]
      .filter((n) => n)
      .join(' ')

    logInfo(['Launch Command:', command], LogPrefix.Legendary)

    const startLaunch = await execAsync(command, execOptions)
      .then(({ stderr }) => {
        if (discordRPC) {
          logInfo(
            'Stopping Discord Rich Presence if running...',
            LogPrefix.Backend
          )
          DiscordRPC.disconnect()
          logInfo('Stopped Discord Rich Presence.', LogPrefix.Backend)
        }
        return { stderr, command, gameSettings }
      })
      .catch((error) => {
        logError(`${error}`, LogPrefix.Legendary)
        const { stderr } = error
        return { stderr, command, gameSettings }
      })
    return startLaunch
  }

  private async verifyPrefix(winePrefix: string) {
    if (isMac) {
      return
    }

    if (!existsSync(winePrefix)) {
      mkdirSync(winePrefix, { recursive: true })
    }

    return this.runWineCommand('wineboot --init', true)
  }

  public async runWineCommand(
    command: string,
    wait = true
  ): Promise<ExecResult> {
    const wineVersion = (await this.getSettings()).wineVersion
    const winePrefix = (await this.getSettings()).winePrefix.replace('~', home)

    const env_vars = this.getEnvSetup(wineVersion, winePrefix)

    let additional_command = ''
    if (wineVersion.type == 'proton') {
      command = 'run ' + command
      // TODO: Respect 'wait' here. Not sure if Proton can even do that
    } else {
      // Can't wait if we don't have a Wineserver
      if (wait && wineVersion.wineserver) {
        additional_command = `${env_vars} ${wineVersion.wineserver} --wait`
      }
    }

    let finalCommand = `${env_vars} ${wineVersion.bin} ${command}`
    if (additional_command) {
      finalCommand += ` && ${additional_command}`
    }

    logDebug(['Running Wine command: ', finalCommand], LogPrefix.Backend)
    return execAsync(finalCommand)
      .then(() => logDebug('Ran Wine command'))
      .catch((error) => logError(error, LogPrefix.Backend))
  }

  private async getEnvSetup(
    wineVersion?: WineInstallation,
    winePrefix?: string
  ): Promise<string> {
    if (!wineVersion) {
      wineVersion = (await this.getSettings()).wineVersion
    }
    if (!winePrefix) {
      winePrefix = (await this.getSettings()).winePrefix.replace('~', home)
    }

    if (wineVersion.type == 'proton') {
      return `STEAM_COMPAT_CLIENT_INSTALL_PATH=${home}/.steam/steam STEAM_COMPAT_DATA_PATH='${winePrefix}'`
    } else {
      return `WINEPREFIX=${winePrefix}`
    }
  }

  public async stop() {
    // until the legendary bug gets fixed, kill legendary on mac
    // not a perfect solution but it's the only choice for now

    // @adityaruplaha: this is kinda arbitary and I don't understand it.
    const pattern = process.platform === 'linux' ? this.appName : 'legendary'
    logInfo(['killing', pattern], LogPrefix.Legendary)

    if (process.platform === 'win32') {
      try {
        await execAsync(`Stop-Process -name  ${pattern}`, execOptions)
        return logInfo(`${pattern} killed`, LogPrefix.Legendary)
      } catch (error) {
        return logError(
          [`not possible to kill ${pattern}`, error],
          LogPrefix.Legendary
        )
      }
    }

    const child = spawn('pkill', ['-f', pattern])
    child.on('exit', () => {
      return logInfo(`${pattern} killed`, LogPrefix.Legendary)
    })
  }
}

export { LegendaryGame }
