import { existsSync, readFileSync } from 'graceful-fs'

import { UserInfo } from 'common/types'
import { clearCache } from '../utils'
import { userInfo, configStore } from '../constants'
import { logError, LogPrefix } from '../logger/logger'
import { userInfo as user } from 'os'
import { session } from 'electron'
import { runLegendaryCommand } from './library'

export class LegendaryUser {
  public static async login(authorizationCode: string) {
    const commandParts = ['auth', '--code', authorizationCode]

    try {
      await runLegendaryCommand(commandParts, {
        logMessagePrefix: 'Logging in'
      })
      const userInfo = await this.getUserInfo()
      return { status: 'done', data: userInfo }
    } catch (error) {
      logError(['Failed to login with Legendary:', error], {
        prefix: LogPrefix.Legendary
      })

      return { status: 'failed' }
    }
  }

  public static async logout() {
    const commandParts = ['auth', '--delete']

    const res = await runLegendaryCommand(commandParts, {
      logMessagePrefix: 'Logging out'
    })

    if (res.error) {
      logError(['Failed to logout:', res.error], {
        prefix: LogPrefix.Legendary
      })
    }

    const ses = session.fromPartition('persist:epicstore')
    await ses.clearStorageData()
    await ses.clearCache()
    await ses.clearAuthCache()
    await ses.clearHostResolverCache()
    configStore.clear()
    clearCache()
  }

  public static isLoggedIn() {
    return existsSync(userInfo)
  }

  public static async getUserInfo(): Promise<UserInfo> {
    if (!LegendaryUser.isLoggedIn()) {
      configStore.delete('userInfo')
      return {}
    }
    try {
      const userInfoContent = readFileSync(userInfo).toString()
      const userInfoObject = JSON.parse(userInfoContent)
      const info: UserInfo = {
        account_id: userInfoObject.account_id,
        displayName: userInfoObject.displayName,
        user: user().username
      }
      configStore.set('userInfo', info)
      return info
    } catch (error) {
      logError(`User info file corrupted, check ${userInfo}`, {
        prefix: LogPrefix.Legendary
      })
      return {}
    }
  }
}
