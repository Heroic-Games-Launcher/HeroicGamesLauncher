import { Runner } from 'common/types'

import { getAppSettings } from 'backend/sideload/games'
import { getGame } from 'backend/utils'

import { Workarounds } from './spec'
import {
  InstallParams,
  IsInstalledParams,
  RemoveParams,
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
  }
}

export default WorkaroundsManager
