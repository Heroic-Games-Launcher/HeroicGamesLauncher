import axios, { AxiosError } from 'axios'
import {
  existsSync,
  unlinkSync,
  writeFileSync,
  readFileSync
} from 'graceful-fs'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { configStore } from './electronStores'
import { isOnline } from '../../online_monitor'
import { ZoomCredentials } from 'common/types/zoom'
import { clearCache } from 'backend/utils'
import { tokenPath, embedUrl, apiUrl } from './constants'

export class ZoomUser {
  static async login(url: string): Promise<{
    status: 'done' | 'error'
  }> {
    logInfo('Logging in using Zoom credentials', LogPrefix.Zoom)

    const { searchParams } = new URL(url)
    const token = searchParams.get('li_token')

    if (!token) {
      logError('Login callback URL does not contain "li_token"', LogPrefix.Zoom)
      return { status: 'error' }
    }
    try {
      writeFileSync(tokenPath, token, { encoding: 'utf-8' })
      logInfo('Zoom token saved successfully', LogPrefix.Zoom)
      configStore.set('isLoggedIn', true)
      return { status: 'done' }
    } catch (err) {
      logError(`Failed to save Zoom token: ${err}`, LogPrefix.Zoom)
      return { status: 'error' }
    }
  }

  public static async getUserDetails() {
    if (!isOnline()) {
      logError(
        'Unable to get login information, Heroic offline',
        LogPrefix.Zoom
      )
      return
    }
    logInfo('Checking if login is valid', LogPrefix.Zoom)
    if (!(await this.isLoggedIn())) {
      logWarning('User is not logged in', LogPrefix.Zoom)
      return
    }
    try {
      const response = await this.makeRequest(`${apiUrl}/li/loggedin`)
      logInfo('User is authenticated with Zoom', LogPrefix.Zoom)
      const username = response.name
      configStore.set('username', username)
      return { username }
    } catch (error) {
      logError(['Error verifying Zoom login:', error], LogPrefix.Zoom)
      return
    }
  }

  public static async getCredentials(): Promise<ZoomCredentials | undefined> {
    if (!isOnline()) {
      logWarning('Unable to get credentials - app is offline', {
        prefix: LogPrefix.Zoom
      })
      return
    }
    if (!existsSync(tokenPath)) {
      logError('No Zoom token available', LogPrefix.Zoom)
      return
    }
    try {
      const token = readFileSync(tokenPath, { encoding: 'utf-8' })
      if (!token) {
        logError('Empty Zoom token file', LogPrefix.Zoom)
        return
      }
      return { access_token: token }
    } catch (error) {
      logError(['Error reading Zoom token:', error], LogPrefix.Zoom)
      return
    }
  }

  public static logout() {
    clearCache('zoom')
    configStore.clear()
    if (existsSync(tokenPath)) {
      unlinkSync(tokenPath)
    }
    logInfo('Logging user out from Zoom', LogPrefix.Zoom)
  }

  public static async isLoggedIn(): Promise<boolean> {
    const tokenExists = existsSync(tokenPath)
    const isLoggedInStore = configStore.get('isLoggedIn', false)

    if (!tokenExists) {
      if (isLoggedInStore) {
        configStore.set('isLoggedIn', false)
      }
      return false
    }

    if (!isOnline()) {
      logWarning('App offline, cannot verify Zoom login status', LogPrefix.Zoom)
      return isLoggedInStore
    }

    try {
      await this.makeRequest(`${apiUrl}/li/loggedin`)
      logInfo('User is authenticated with Zoom (API verified)', LogPrefix.Zoom)
      if (!isLoggedInStore) {
        configStore.set('isLoggedIn', true)
      }
      return true
    } catch (error) {
      logError(['Zoom API login verification failed:', error], LogPrefix.Zoom)
      configStore.set('isLoggedIn', false)
      this.logout()
      return false
    }
  }

  public static async makeRequest(url: string) {
    const credentials = await this.getCredentials()
    if (!credentials) {
      throw new Error('Not authenticated with Zoom')
    }
    const headers = {
      Authorization: `Bearer ${credentials.access_token}`,
      Accept: 'application/json'
    }

    const response = await axios
      .get(url, { headers })
      .catch((error: AxiosError) => {
        logError(['Zoom API request failed:', error.message], LogPrefix.Zoom)
        throw error
      })
    return response.data
  }

  public static getLoginUrl(): string {
    return `${embedUrl}/login?li=heroic&return_li_token=true`
  }
}
