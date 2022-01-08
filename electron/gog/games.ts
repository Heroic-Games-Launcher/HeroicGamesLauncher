/* eslint-disable @typescript-eslint/no-unused-vars */
import { GOGLibrary } from './library'
import { BrowserWindow } from 'electron'
import { Game } from '../games'
import {
  ExtraInfo,
  GameInfo,
  InstallInfo,
  GameSettings,
  ExecResult,
  InstallArgs,
  LaunchResult
} from 'types'

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

  public static getGameInfo(appName: string) {
    return GOGLibrary.getGameInfo(appName)
  }
  getExtraInfo(namespace: string): Promise<ExtraInfo> {
    throw new Error('Method not implemented.')
  }
  public async getGameInfo(): Promise<GameInfo> {
    return GOGLibrary.getGameInfo(this.appName)
  }
  getInstallInfo(): Promise<InstallInfo> {
    throw new Error('Method not implemented.')
  }
  getSettings(): Promise<GameSettings> {
    throw new Error('Method not implemented.')
  }
  hasUpdate(): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  import(path: string): Promise<ExecResult> {
    throw new Error('Method not implemented.')
  }
  install(args: InstallArgs): Promise<{ status: string }> {
    throw new Error('Method not implemented.')
  }
  addShortcuts(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  removeShortcuts(): Promise<void> {
    throw new Error('Method not implemented')
  }
  launch(launchArguments?: string): Promise<ExecResult | LaunchResult> {
    throw new Error('Method not implemented.')
  }
  moveInstall(newInstallPath: string): Promise<string> {
    throw new Error('Method not implemented.')
  }
  repair(): Promise<ExecResult> {
    throw new Error('Method not implemented.')
  }
  stop(): Promise<void> {
    throw new Error('Method not implemencted.')
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
