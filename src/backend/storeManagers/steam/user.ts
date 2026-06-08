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
import { SteamAccount, SteamCredentials } from 'common/types/steam'

export class SteamUser {
  static async login(url: string): Promise<{
    status: 'done' | 'error'
  }> {
    logInfo('Logging in using Steam OpenID', LogPrefix.Steam)

    const { searchParams } = new URL(url)

    // Only the OpenID *response* (`openid.mode=id_res`) carries a real SteamID.
    // The outgoing login *request* uses the `identifier_select` placeholder for
    // `openid.claimed_id`, so guard against being called with it.
    if (searchParams.get('openid.mode') !== 'id_res') {
      logError(
        'Steam login callback is not an OpenID response (openid.mode != id_res)',
        LogPrefix.Steam
      )
      return { status: 'error' }
    }

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
      logError(
        ['Could not extract SteamID from claimed_id. Value was:', claimedId],
        LogPrefix.Steam
      )
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

      // Resolve a friendly name now so the account can be shown immediately and
      // works offline later.
      const username = (await this.fetchPersonaName(steamId)) || steamId

      // Stack the account alongside any previously logged-in ones (replacing an
      // existing entry for the same SteamID).
      const accounts = this.getAccounts().filter((a) => a.steamId !== steamId)
      accounts.push({ steamId, username })
      configStore.set('accounts', accounts)

      configStore.set('isLoggedIn', true)
      // Keep the legacy single-account keys pointing at the most recent login.
      configStore.set('steamId', steamId)
      configStore.set('username', username)
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
      const isValid = /is_valid\s*:\s*true/i.test(response.data)
      if (!isValid) {
        logWarning(
          [
            'Steam OpenID assertion was rejected. Response:',
            response.data.trim()
          ],
          LogPrefix.Steam
        )
      }
      return isValid
    } catch (error) {
      logError(
        ['Steam OpenID verification request failed:', error],
        LogPrefix.Steam
      )
      return false
    }
  }

  public static async getUserDetails() {
    const accounts = this.getAccounts()
    if (!accounts.length) {
      logWarning('User is not logged in', LogPrefix.Steam)
      return
    }

    // The most recently logged-in account.
    const account = accounts[accounts.length - 1]
    return { username: account.username }
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
    const accounts = this.getAccounts()
    if (accounts.length) {
      return { steamId: accounts[accounts.length - 1].steamId }
    }
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

  /**
   * Returns every Steam account the user has logged into via OpenID. Migrates a
   * legacy single-account login into the accounts list on first read.
   */
  public static getAccounts(): SteamAccount[] {
    const accounts = configStore.get('accounts', [])
    if (accounts.length) {
      return accounts
    }

    // Migrate a pre-multi-account login (single steamId/username) if present.
    const steamId = configStore.get_nodefault('steamId')
    if (steamId && configStore.get('isLoggedIn', false)) {
      const username = configStore.get_nodefault('username') || steamId
      const migrated: SteamAccount[] = [{ steamId, username }]
      configStore.set('accounts', migrated)
      return migrated
    }

    return []
  }

  /**
   * Logs a single Steam account out, leaving any other logged-in accounts in
   * place. Falls back to a full logout when the last account is removed.
   */
  public static logoutAccount(steamId: string) {
    const accounts = this.getAccounts().filter((a) => a.steamId !== steamId)
    if (!accounts.length) {
      this.logout()
      return
    }
    configStore.set('accounts', accounts)
    const last = accounts[accounts.length - 1]
    configStore.set('steamId', last.steamId)
    configStore.set('username', last.username)
    clearCache('steam')
    logInfo(`Logged Steam account ${steamId} out`, LogPrefix.Steam)
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
    return this.getAccounts().length > 0
  }
}
