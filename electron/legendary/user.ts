import { existsSync, readFile } from 'graceful-fs'

import { UserInfo } from '../types'
import { clearCache } from '../utils'
import { userInfo, configStore } from '../constants'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { userInfo as user } from 'os'
import { session } from 'electron'
import { runLegendaryCommand } from './library'

export class LegendaryUser {
  public static async login(sid: string) {
    const commandParts = ['auth', '--sid', sid]

    logInfo('Logging in with Legendary.', LogPrefix.Legendary)

    try {
      await runLegendaryCommand(commandParts)
      const userInfo = await this.getUserInfo()
      return { status: 'done', data: userInfo }
    } catch (error) {
      logError(
        ['Failed to login with Legendary:', `${error}`],
        LogPrefix.Legendary
      )

      return { status: 'failed' }
    }
  }

  public static async logout() {
    const commandParts = ['auth', '--delete']

    logInfo('Logging out.', LogPrefix.Legendary)

    const res = await runLegendaryCommand(commandParts)

    if (res.error) {
      logError(['Failed to logout:', res.error], LogPrefix.Legendary)
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
    if (LegendaryUser.isLoggedIn()) {
      const userInfoContent = await new Promise<string>((resolve, reject) => {
        readFile(userInfo, 'utf-8', (err, content) => {
          if (err) {
            reject(err)
          } else {
            resolve(content)
          }
        })
      })
      try {
        const userInfoObject = JSON.parse(userInfoContent)
        const info: UserInfo = {
          account_id: userInfoObject.account_id,
          displayName: userInfoObject.displayName,
          user: user().username
        }
        configStore.set('userInfo', info)
        return info
      } catch (error) {
        logError(
          `User info file corrupted, check ${userInfo}`,
          LogPrefix.Legendary
        )
        const info: UserInfo = {
          account_id: '',
          displayName: '',
          user: ''
        }
        return info
      }
    }
    configStore.delete('userInfo')
    return { account_id: '', displayName: null }
  }
}
