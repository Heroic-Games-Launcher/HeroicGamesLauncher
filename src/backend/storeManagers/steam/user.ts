import axios from 'axios'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from 'graceful-fs'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { configStore } from './electronStores'
import { isOnline } from '../../online_monitor'
import { clearCache } from 'backend/utils'
import {
  credentialsPath,
  openIdLoginUrl,
  profileApiUrl,
  steamSupportFolder
} from './constants'
import { SteamCredentials } from 'common/types/steam'

export class SteamUser {
  static async login(url: string): Promise<{
    status: 'done' | 'error'
  }> {
    logInfo('Logging in using Steam OpenID', LogPrefix.Steam)

    const { searchParams } = new URL(url)
    const claimedId = searchParams.get('openid.claimed_id')

    if (!claimedId) {
      logError(
        'Steam login callback URL does not contain "openid.claimed_id"',
        LogPrefix.Steam
      )
      return { status: 'error' }
    }

    const steamId = claimedId.match(/\/openid\/id\/(\d+)/)?.[1]
    if (!steamId) {
      logError('Could not extract SteamID from claimed_id', LogPrefix.Steam)
      return { status: 'error' }
    }

    // Verify the OpenID assertion with Steam to make sure the callback was not
    // forged before we trust the SteamID.
    const isValid = await this.verifyOpenIdResponse(searchParams)
    if (!isValid) {
      logError('Steam OpenID verification failed', LogPrefix.Steam)
      return { status: 'error' }
    }

    try {
      if (!existsSync(steamSupportFolder)) {
        mkdirSync(steamSupportFolder, { recursive: true })
      }
      const credentials: SteamCredentials = { steamId }
      writeFileSync(credentialsPath, JSON.stringify(credentials), {
        encoding: 'utf-8'
      })
      configStore.set('isLoggedIn', true)
      configStore.set('steamId', steamId)
      logInfo('Steam credentials saved successfully', LogPrefix.Steam)
      return { status: 'done' }
    } catch (err) {
      logError(`Failed to save Steam credentials: ${err}`, LogPrefix.Steam)
      return { status: 'error' }
    }
  }

  private static async verifyOpenIdResponse(
    params: URLSearchParams
  ): Promise<boolean> {
    if (!isOnline()) {
      logWarning('Cannot verify Steam login while offline', LogPrefix.Steam)
      return false
    }

    try {
      const body = new URLSearchParams()
      params.forEach((value, key) => {
        if (key.startsWith('openid.')) {
          body.append(key, value)
        }
      })
      body.set('openid.mode', 'check_authentication')

      const response = await axios.post<string>(
        openIdLoginUrl,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      )
      return /is_valid\s*:\s*true/i.test(response.data)
    } catch (error) {
      logError(
        ['Steam OpenID verification request failed:', error],
        LogPrefix.Steam
      )
      return false
    }
  }

  public static async getUserDetails() {
    if (!isOnline()) {
      logError(
        'Unable to get login information, Heroic offline',
        LogPrefix.Steam
      )
      return
    }

    logInfo('Checking if login is valid', LogPrefix.Steam)
    if (!(await this.isLoggedIn())) {
      logWarning('User is not logged in', LogPrefix.Steam)
      return
    }

    const credentials = await this.getCredentials()
    if (!credentials) {
      return
    }

    let username = configStore.get_nodefault('username')
    if (!username) {
      username = await this.fetchPersonaName(credentials.steamId)
      if (username) {
        configStore.set('username', username)
      }
    }

    return { username: username || credentials.steamId }
  }

  private static async fetchPersonaName(
    steamId: string
  ): Promise<string | undefined> {
    try {
      const response = await axios.get<string>(
        `${profileApiUrl}/${steamId}?xml=1`
      )
      return response.data.match(
        /<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/
      )?.[1]
    } catch (error) {
      logError(['Error fetching Steam persona name:', error], LogPrefix.Steam)
      return
    }
  }

  public static async getCredentials(): Promise<SteamCredentials | undefined> {
    if (!existsSync(credentialsPath)) {
      logWarning('No Steam credentials available', LogPrefix.Steam)
      return
    }
    try {
      const data = readFileSync(credentialsPath, { encoding: 'utf-8' })
      const parsed = JSON.parse(data) as SteamCredentials
      if (!parsed.steamId) {
        logError('Empty Steam credentials file', LogPrefix.Steam)
        return
      }
      return parsed
    } catch (error) {
      logError(['Error reading Steam credentials:', error], LogPrefix.Steam)
      return
    }
  }

  public static logout() {
    clearCache('steam')
    configStore.clear()
    if (existsSync(credentialsPath)) {
      unlinkSync(credentialsPath)
    }
    logInfo('Logging user out from Steam', LogPrefix.Steam)
  }

  public static async isLoggedIn(): Promise<boolean> {
    return existsSync(credentialsPath) && !!configStore.get('isLoggedIn', false)
  }
}
