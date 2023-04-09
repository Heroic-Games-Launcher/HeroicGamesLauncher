import {
  createAbortController,
  deleteAbortController
} from '../../utils/aborthandler/aborthandler'
import { existsSync, readFileSync } from 'graceful-fs'

import { UserInfo } from 'common/types'
import { clearCache } from '../../utils'
import { userInfo, configStore } from '../../constants'
import { logError, LogPrefix } from '../../logger/logger'
import { userInfo as user } from 'os'
import { session } from 'electron'
import { runRunnerCommand as runLegendaryCommand } from './library'

export class LegendaryUser {
  public static async login(
    authorizationCode: string
  ): Promise<{ status: 'done' | 'failed'; data: UserInfo | undefined }> {
    const commandParts = ['auth', '--code', authorizationCode]

    const abortID = 'legendary-login'
    const errorMessage = (
      error: string
    ): { status: 'failed'; data: undefined } => {
      logError(['Failed to login with Legendary:', error], LogPrefix.Legendary)

      return { status: 'failed', data: undefined }
    }

    try {
      const res = await runLegendaryCommand(
        commandParts,
        createAbortController(abortID),
        {
          logMessagePrefix: 'Logging in'
        }
      )

      deleteAbortController(abortID)

      if (res.error || res.abort) {
        return errorMessage(res.error ?? 'abort by user')
      }

      const userInfo = await this.getUserInfo()
      return { status: 'done', data: userInfo }
    } catch (error) {
      deleteAbortController(abortID)
      return errorMessage(`${error}`)
    }
  }

  public static async logout() {
    const commandParts = ['auth', '--delete']

    const abortID = 'legendary-logout'
    const res = await runLegendaryCommand(
      commandParts,
      createAbortController(abortID),
      {
        logMessagePrefix: 'Logging out'
      }
    )

    deleteAbortController(abortID)

    if (res.error || res.abort) {
      logError(
        ['Failed to logout:', res.error ?? 'abort by user'],
        LogPrefix.Legendary
      )
      return
    }

    const ses = session.fromPartition('persist:epicstore')
    await ses.clearStorageData()
    await ses.clearCache()
    await ses.clearAuthCache()
    await ses.clearHostResolverCache()
    configStore.delete('userInfo')
    clearCache()
  }

  public static isLoggedIn() {
    return existsSync(userInfo)
  }

  public static getUserInfo(): UserInfo | undefined {
    if (!LegendaryUser.isLoggedIn()) {
      configStore.delete('userInfo')
      return
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
      logError(
        `User info file corrupted, check ${userInfo}`,
        LogPrefix.Legendary
      )
      return
    }
  }
}
