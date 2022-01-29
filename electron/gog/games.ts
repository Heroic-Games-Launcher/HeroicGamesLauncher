/* eslint-disable @typescript-eslint/no-unused-vars */
import { GOGLibrary } from './library'
import { BrowserWindow } from 'electron'
import Store from 'electron-store'
import { spawn } from 'child_process'
import { join } from 'path'
import prettyBytes from 'pretty-bytes'
import { Game } from '../games'
import { GameConfig } from '../game_config'
import { GlobalConfig } from '../config'
import {
  ExtraInfo,
  GameInfo,
  InstallInfo,
  GameSettings,
  ExecResult,
  InstallArgs,
  LaunchResult,
  GOGLoginData,
  InstalledInfo
} from 'types'
import {
  gogdlBin,
  heroicGamesConfigPath,
  isWindows,
  execOptions
} from '../constants'
import { logError, logInfo, LogPrefix } from '../logger'
import { errorHandler, execAsync } from '../utils'
import { GOGUser } from './user'
import { launch } from '../launcher'

const configStore = new Store({
  cwd: 'gog_store'
})

const installedGamesStore = new Store({
  cwd: 'gog_store',
  name: 'installed'
})

class GOGGame extends Game {
  public appName: string
  public window = BrowserWindow.getAllWindows()[0]
  private static instances = new Map<string, GOGGame>()
  private constructor(appName: string) {
    super()
    this.appName = appName
  }
  public static get(appName: string) {
    if (!this.instances.get(appName)) {
      this.instances.set(appName, new GOGGame(appName))
    }
    return this.instances.get(appName)
  }
  getExtraInfo(namespace: string): Promise<ExtraInfo> {
    throw new Error('Method not implemented.')
  }
  public async getGameInfo(): Promise<GameInfo> {
    return GOGLibrary.get().getGameInfo(this.appName)
  }
  async getInstallInfo(): Promise<InstallInfo> {
    return await GOGLibrary.get().getInstallInfo(this.appName)
  }
  async getSettings(): Promise<GameSettings> {
    return (
      GameConfig.get(this.appName).config ||
      (await GameConfig.get(this.appName).getSettings())
    )
  }
  hasUpdate(): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  import(path: string): Promise<ExecResult> {
    throw new Error('Method not implemented.')
  }
  public async install({
    path,
    installDlcs,
    platformToInstall
  }: InstallArgs): Promise<{ status: string }> {
    // In the future we need to add Language select option
    // const { maxWorkers } = await GlobalConfig.get().getSettings()
    // const workers = maxWorkers === 0 ? '' : `--max-workers ${maxWorkers}`
    const withDlcs = installDlcs ? '--with-dlcs' : '--skip-dlcs'
    if (GOGUser.isTokenExpired()) await GOGUser.refreshToken()
    const credentials = configStore.get('credentials') as GOGLoginData

    const logPath = `"${heroicGamesConfigPath}${this.appName}.log"`
    const writeLog = isWindows ? `2>&1 > ${logPath}` : `|& tee ${logPath}`
    const command = `${gogdlBin} download ${
      this.appName
    } --platform ${platformToInstall.toLowerCase()} --path="${path}" --token="${
      credentials.access_token
    }" ${withDlcs} --lang="en-US" ${writeLog}`
    logInfo([`Installing ${this.appName} with:`, command], LogPrefix.Gog)
    return execAsync(command, execOptions)
      .then(async ({ stdout, stderr }) => {
        if (
          stdout.includes('ERROR') ||
          stdout.includes('Failed to execute script')
        ) {
          errorHandler({ error: { stdout, stderr }, logPath })
          return { status: 'error' }
        }
        // Installation succeded
        // Save new game info to installed games store
        const installInfo = await this.getInstallInfo()
        const gameInfo = GOGLibrary.get().getGameInfo(this.appName)
        const installedData: InstalledInfo = {
          platform: platformToInstall,
          executable: '',
          install_path: join(path, gameInfo.folder_name),
          install_size: prettyBytes(installInfo.manifest.disk_size),
          is_dlc: false,
          version: installInfo.game.version,
          appName: this.appName
        }
        const array: Array<InstalledInfo> =
          (installedGamesStore.get('installed') as Array<InstalledInfo>) || []
        array.push(installedData)
        installedGamesStore.set('installed', array)
        GOGLibrary.get().refreshInstalled()
        return { status: 'done' }
      })
      .catch(() => {
        logInfo('Installaton canceled', LogPrefix.Gog)
        return { status: 'error' }
      })
  }
  addShortcuts(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  removeShortcuts(): Promise<void> {
    throw new Error('Method not implemented')
  }
  launch(launchArguments?: string): Promise<ExecResult | LaunchResult> {
    return launch(this.appName, launchArguments, 'gog')
  }
  moveInstall(newInstallPath: string): Promise<string> {
    throw new Error('Method not implemented.')
  }
  repair(): Promise<ExecResult> {
    throw new Error('Method not implemented.')
  }
  public async stop(): Promise<void> {
    const pattern = process.platform === 'linux' ? this.appName : 'gogdl'
    logInfo(['killing', pattern], LogPrefix.Gog)

    if (process.platform === 'win32') {
      try {
        await execAsync(`Stop-Process -name  ${pattern}`, execOptions)
        return logInfo(`${pattern} killed`)
      } catch (error) {
        return logError(`not possible to kill ${pattern}`, error)
      }
    }

    const child = spawn('pkill', ['-f', pattern])
    child.on('exit', () => {
      return logInfo(`${pattern} killed`)
    })
  }
  syncSaves(arg: string, path: string): Promise<ExecResult> {
    throw new Error('Method not implemencted.')
  }
  uninstall(): Promise<ExecResult> {
    throw new Error('Method not implemented.')
  }
  update(): Promise<unknown> {
    throw new Error('Method not implemented.')
  }
}

export { GOGGame }
