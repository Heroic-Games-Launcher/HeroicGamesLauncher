import axios from 'axios'
import { existsSync, unlinkSync } from 'graceful-fs'
import { logError, logInfo, LogPrefix, logWarning } from '../../logger/logger'
import { GOGLoginData } from 'common/types'
import { configStore } from './electronStores'
import { isOnline } from '../../online_monitor'
import { GOGCredentials, UserData } from 'common/types/gog'
import { runRunnerCommand } from './library'
import { gogdlAuthConfig } from 'backend/constants'
import { clearCache } from 'backend/utils'
import { app } from 'electron'

function authLogSanitizer(line: string) {
  try {
    const output = JSON.parse(line)
    output.access_token = '<redacted>'
    output.session_id = '<redacted>'
    output.refresh_token = '<redacted>'
    output.user_id = '<redacted>'
    return JSON.stringify(output) + '\n'
  } catch {
    return line
  }
}

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
    const { stdout } = await runRunnerCommand(['auth', '--code', code], {
      abortId: 'gogdl-auth',
      logSanitizer: authLogSanitizer
    })

    try {
      const data: GOGLoginData = JSON.parse(stdout.trim())
      if (data?.error) {
        return { status: 'error' }
      }
    } catch (err) {
      logError(
        [
          `GOG login failed to parse std output from gogdl. stdout: ${stdout.trim()}\nerror:`,
          err
        ],
        LogPrefix.Gog
      )
      return { status: 'error' }
    }
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
          'User-Agent': `HeroicGamesLauncher/${app.getVersion()}`
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
  public static async getCredentials(): Promise<GOGCredentials | undefined> {
    if (!isOnline()) {
      logWarning('Unable to get credentials - app is offline', {
        prefix: LogPrefix.Gog
      })
      return
    }
    const { stdout } = await runRunnerCommand(['auth'], {
      abortId: 'gogdl-get-credentials',
      logSanitizer: authLogSanitizer
    })
    return JSON.parse(stdout)
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
