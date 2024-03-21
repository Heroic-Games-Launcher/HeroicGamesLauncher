import { LogPrefix, logDebug, logError, logInfo } from 'backend/logger/logger'
import {
  createAbortController,
  deleteAbortController
} from 'backend/utils/aborthandler/aborthandler'
import {
  CarnivalLoginData,
  CarnivalCookieData,
  CarnivalUserData,
  CarnivalUserDataFile
} from 'common/types/carnival'
import { runRunnerCommand, refresh } from './library'
import { existsSync, readFileSync, mkdirSync } from 'graceful-fs'
import {
  carnivalUserData,
  carnivalCookieData,
  carnivalConfigPath
} from 'backend/constants'
import { configStore } from './electronStores'
import { clearCache } from 'backend/utils'
import { load, dump } from 'js-yaml'
import { session } from 'electron'
import { writeFileSync } from 'fs'

export class CarnivalUser {
  static async getLoginData(): Promise<CarnivalLoginData> {
    logDebug('Getting login data from Carnival', LogPrefix.Carnival)
    const { stdout } = await runRunnerCommand(
      ['auth', '--login', '--non-interactive'],
      createAbortController('carnival-auth')
    )
    deleteAbortController('carnival-auth')
    const output: CarnivalLoginData = JSON.parse(stdout)

    logInfo(['Register data is:', output], LogPrefix.Carnival)
    return output
  }

  static async login(): Promise<{
    status: 'done' | 'failed'
    user: CarnivalUserData | undefined
  }> {
    const mySession = session.fromPartition('persist:epicstore')
    if (CarnivalUser.isLoggedIn()) {
      logDebug('Getting user data', LogPrefix.Carnival)
      const user = await this.getUserData()
      if (user) {
        return {
          status: 'done',
          user
        }
      }
    }
    try {
      logDebug('Using cookie', LogPrefix.Carnival)
      const auth_cookie = await mySession.cookies.get({
        domain: '.indiegala.com',
        name: 'auth'
      })
      if (auth_cookie.length !== 1) {
        throw new Error(
          "Too many auth cookies or none, this doesn't make sense"
        )
      }
      if (!existsSync(carnivalConfigPath)) {
        mkdirSync(carnivalConfigPath, { recursive: true })
      }

      const replaceRegEx = /^\./
      const expiry_date = new Date(Number(auth_cookie[0].expirationDate) * 1000)
      const cookie: CarnivalCookieData = {
        raw_cookie: `${auth_cookie[0].name}=${auth_cookie[0].value}; Path=${
          auth_cookie[0].path
        }; Domain=${
          auth_cookie[0].domain
        }; Expires=${expiry_date.toUTCString()}`,
        domain: {
          Suffix: auth_cookie[0].domain
            ? auth_cookie[0].domain.replace(replaceRegEx, '')
            : ''
        },
        path: [auth_cookie[0].path ? auth_cookie[0].path : '', true],
        expires: { AtUtc: expiry_date.toISOString() }
      }
      logDebug(`Cookies: ${JSON.stringify(cookie)}`)
      writeFileSync(carnivalCookieData, dump([cookie]))
      logInfo('Authentication successful', LogPrefix.Carnival)
    } catch (error) {
      logError(`Error getting cookies: ${error}`, LogPrefix.Carnival)
    }

    try {
      logDebug('Refreshing', LogPrefix.Carnival)
      await refresh(true)

      const user = await CarnivalUser.getUserData()
      if (!user) {
        return {
          status: 'failed',
          user: undefined
        }
      }
      return {
        status: 'done',
        user
      }
    } catch (error) {
      return {
        status: 'failed',
        user: undefined
      }
    }
  }

  static async logout() {
    const commandParts = ['logout']

    const abortID = 'carnival-logout'
    const res = await runRunnerCommand(
      commandParts,
      createAbortController(abortID)
    )
    deleteAbortController(abortID)

    if (res.abort) {
      logError('Failed to logout: abort by user'), LogPrefix.Carnival
      return
    }

    configStore.delete('userData')
    clearCache('carnival')
  }

  static async getUserData(): Promise<CarnivalUserData | undefined> {
    logInfo('Getting user data', LogPrefix.Carnival)
    if (!existsSync(carnivalUserData)) {
      logError('user.yml does not exist', LogPrefix.Carnival)
      configStore.delete('userData')
      return
    }
    try {
      const user: CarnivalUserDataFile = load(
        readFileSync(carnivalUserData, 'utf-8')
      ) as CarnivalUserDataFile

      configStore.set('userData', user.user_info)
      logInfo('Saved user data to global config', LogPrefix.Carnival)
      logDebug(['username: ', user.user_info.username], LogPrefix.Carnival)

      return user.user_info
    } catch (error) {
      logInfo('user.json is empty', LogPrefix.Carnival)
      configStore.delete('userData')
      return
    }
  }

  public static isLoggedIn() {
    const userData = configStore.get_nodefault('userData')
    logDebug(['userData:', userData], LogPrefix.Carnival)
    return userData ? userData.user_id : false
  }
}
