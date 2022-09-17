import { logError, LogPrefix } from '../logger/logger'
import { GameInfo, InstalledInfo } from 'common/types'
import { libraryStore } from './electronStores'

export class SideLoadLibrary {
  private static globalInstance: SideLoadLibrary

  private library: Map<string, GameInfo> = new Map()

  public static get() {
    if (!this.globalInstance) {
      SideLoadLibrary.globalInstance = new SideLoadLibrary()
    }
    return this.globalInstance
  }

  public changeGameInstallPath(appName: string, newInstallPath: string) {
    const cachedGameData = this.library.get(appName)

    if (!cachedGameData) {
      logError(
        "Changing game install path failed: Game data couldn't be found",
        { prefix: LogPrefix.Backend }
      )
      return
    }

    const installedArray =
      (libraryStore.get('installed', []) as Array<InstalledInfo>) || []

    const gameIndex = installedArray.findIndex(
      (value) => value.appName === appName
    )

    installedArray[gameIndex].install_path = newInstallPath
    cachedGameData.install.install_path = newInstallPath
    libraryStore.set('installed', installedArray)
  }
}
