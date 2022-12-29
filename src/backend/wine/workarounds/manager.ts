import { Runner } from 'common/types'

import { getAppSettings } from 'backend/sideload/games'
import { getGame } from 'backend/utils'
import { logInfo } from 'backend/logger/logger'

import { Workarounds } from './spec'
import {
  InstallParams,
  IsInstalledParams,
  RemoveParams,
  UpdateParams,
  Workaround
} from './types'

/**
 * Wrapper object around the actual `Workarounds`
 * Allows managing workarounds in a more class-like style
 */
const WorkaroundsManager = {
  async install<T extends Workaround>(
    workaround: T,
    appName: string,
    runner: Runner,
    ...args: InstallParams<T>
  ): Promise<boolean> {
    const gameSettings =
      runner === 'sideload'
        ? await getAppSettings(appName)
        : await getGame(appName, runner).getSettings()
    logInfo(['Installing workaround', workaround])
    return Workarounds[workaround].install(gameSettings, ...(args as [never]))
  },

  async remove<T extends Workaround>(
    workaround: T,
    appName: string,
    runner: Runner,
    ...args: RemoveParams<T>
  ): Promise<boolean> {
    const gameSettings =
      runner === 'sideload'
        ? await getAppSettings(appName)
        : await getGame(appName, runner).getSettings()
    logInfo(['Removing workaround', workaround])
    return Workarounds[workaround].remove(gameSettings, ...(args as []))
  },

  async isInstalled<T extends Workaround>(
    workaround: T,
    appName: string,
    runner: Runner,
    ...args: IsInstalledParams<T>
  ): Promise<boolean> {
    const gameSettings =
      runner === 'sideload'
        ? await getAppSettings(appName)
        : await getGame(appName, runner).getSettings()
    return Workarounds[workaround].isInstalled(gameSettings, ...(args as []))
  },

  async update<T extends Workaround>(
    workaround: T,
    appName: string,
    runner: Runner,
    ...args: UpdateParams<T>
  ): Promise<boolean> {
    const gameSettings =
      runner === 'sideload'
        ? await getAppSettings(appName)
        : await getGame(appName, runner).getSettings()
    logInfo(['Updating Workaround', workaround])
    return Workarounds[workaround].update(gameSettings, ...(args as [never]))
  }
}

export default WorkaroundsManager
