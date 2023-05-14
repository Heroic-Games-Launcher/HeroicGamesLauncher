import axios from 'axios'
import { writeFileSync, existsSync, unlinkSync } from 'graceful-fs'
import { logError, logInfo, LogPrefix, logWarning } from '../../logger/logger'
import { GOGLoginData } from 'common/types'
import { configStore } from './electronStores'
import { isOnline } from '../../online_monitor'
import { UserData } from 'common/types/gog'
import { runRunnerCommand } from './library'
import {
  createAbortController,
  deleteAbortController
} from 'backend/utils/aborthandler/aborthandler'
import { gogdlAuthConfig } from 'backend/constants'
import { clearCache } from 'backend/utils'

export class GOGUser {
  static async login(
    code: string
    // TODO: Write types for this
  ): Promise<{
    status: 'done' | 'error'
    data?: UserData
  }> {
    logInfo('Logging using GOG credentials', LogPrefix.Gog)

    // Gets token from GOG basaed on authorization code
    const { stdout } = await runRunnerCommand(
      ['auth', '--code', code],
      createAbortController('gogdl-auth')
    )

    try {
      const data: GOGLoginData = JSON.parse(stdout.trim())
      if (data?.error) {
        return { status: 'error' }
      }
    } catch (err) {
      logError(
        `GOG login failed to parse std output from gogdl. stdout: ${stdout.trim()}`,
        LogPrefix.Gog
      )
      return { status: 'error' }
    }
    deleteAbortController('gogdl-auth')
    logInfo('Login Successful', LogPrefix.Gog)
    configStore.set('isLoggedIn', true)
    const userDetails = await this.getUserDetails()
    return { status: 'done', data: userDetails }
  }

  public static async getUserDetails() {
    if (!isOnline()) {
      logError('Unable to login information, Heroic offline', LogPrefix.Gog)
      return
    }
    logInfo('Checking if login is valid', LogPrefix.Gog)
    if (!this.isLoggedIn()) {
      logWarning('User is not logged in', LogPrefix.Gog)
      return
    }
    const user = await this.getCredentials()
    if (!user) {
      logError("No credentials, can't get login information", LogPrefix.Gog)
      return
    }
    const response = await axios
      .get(`https://embed.gog.com/userData.json`, {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
          'User-Agent': 'GOGGalaxyClient/2.0.45.61 (GOG Galaxy)'
        }
      })
      .catch((error) => {
        logError(['Error getting login information', error], LogPrefix.Gog)
      })

    if (!response) {
      return
    }

    const data: UserData = response.data

    //Exclude email, it won't be needed
    delete data.email

    configStore.set('userData', data)
    logInfo('Saved username to config file', LogPrefix.Gog)

    return data
  }
  /**
   * Loads user credentials from config
   * if needed refreshes token and returns new credentials
   * @returns user credentials
   */
  public static async getCredentials() {
    if (!isOnline()) {
      logWarning('Unable to get credentials - app is offline', {
        prefix: LogPrefix.Gog
      })
      return
    }
    const { stdout } = await runRunnerCommand(
      ['auth'],
      createAbortController('gogdl-get-credentials')
    )

    deleteAbortController('gogdl-get-credentials')
    return JSON.parse(stdout)
  }

  /**
   * Migrates existing authorization config to one supported by gogdl
   */
  public static migrateCredentialsConfig() {
    if (!configStore.has('credentials')) {
      return
    }

    const credentials = configStore.get_nodefault('credentials')
    if (credentials?.loginTime)
      credentials.loginTime = credentials?.loginTime / 1000

    writeFileSync(
      gogdlAuthConfig,
      JSON.stringify({ '46899977096215655': credentials })
    )
    configStore.delete('credentials')
    configStore.set('isLoggedIn', true)
  }

  public static logout() {
    clearCache('gog')
    configStore.clear()
    if (existsSync(gogdlAuthConfig)) {
      unlinkSync(gogdlAuthConfig)
    }
    logInfo('Logging user out', LogPrefix.Gog)
  }

  public static isLoggedIn() {
    return configStore.get_nodefault('isLoggedIn') || false
  }
}
