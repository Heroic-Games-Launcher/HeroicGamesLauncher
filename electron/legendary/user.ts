import {
  existsSync,
  readFileSync
} from 'graceful-fs'

import { LegendaryLibrary } from './library'
import { UserInfo } from '../types'
import { execAsync } from '../utils'
import {
  legendaryBin,
  userInfo
} from '../constants'
import { logError, logInfo } from '../logger'
import { userInfo as user } from 'os'
import Store from 'electron-store';

const configStore = new Store({
  cwd: 'store'
})
export class LegendaryUser {
  public static async login(sid: string) {
    try {
      await execAsync(`${legendaryBin} auth --sid ${sid}`)
      await this.getUserInfo()
      return logInfo('Successfully logged in')
    } catch (error) {
      logError('Error on Login')
      logError(error)
    }
  }

  public static async logout() {
    await execAsync(`${legendaryBin} auth --delete`)
    configStore.delete('userInfo')
  }

  public static async isLoggedIn() {
    return existsSync(userInfo) || await execAsync(`${legendaryBin} status`).then(
      ({ stdout }) => !stdout.includes('Epic account: <not logged in>')
    )
  }

  public static async getUserInfo(): Promise<UserInfo> {
    logInfo('Trying to get user information')
    let isLoggedIn = false
    try {
      isLoggedIn = await LegendaryUser.isLoggedIn()
    } catch (error) {
      logError(error)
    }
    if (isLoggedIn) {
      const info = { ...JSON.parse(readFileSync(userInfo, 'utf-8')), user: user().username }
      configStore.set('userInfo', info)
      await LegendaryLibrary.get().getGames('info')
      return info
    }
    return { account_id: '', displayName: null }
  }
}
