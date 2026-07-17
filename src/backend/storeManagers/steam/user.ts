import type { ChildProcess } from 'child_process'
import { logError, logInfo, LogPrefix, logWarning } from 'backend/logger'
import { clearCache } from 'backend/utils'
import { sendFrontendMessage } from 'backend/ipc'
import { callAbortController } from 'backend/utils/aborthandler/aborthandler'
import { SteamAccount, SteamLoginData } from 'common/types/steam'
import {
  runAurelia,
  runAureliaCommand,
  parseAureliaJson,
  makeAureliaQrHandler,
  makeAureliaLoginHandler,
  AureliaError
} from './aurelia'
import type { AureliaAccount } from './aurelia_types'

const QR_LOGIN_ABORT_ID = 'steam-qr-login'
const LOGIN_ABORT_ID = 'steam-login'

function isCancellationError(message: string): boolean {
  return /\b(cancelled|canceled|FileNotFound|Expired)\b/i.test(message)
}

export class SteamUser {
  /**
   * login process
   */
  private static loginProcess: ChildProcess | null = null

  /**
   * Signs in with a username and password {@link submitGuardCode}
   */
  static async login(
    credentials: SteamLoginData
  ): Promise<{ status: 'done' | 'error'; error?: string }> {
    logInfo('Logging in to Steam through Aurelia', LogPrefix.Steam)

    const { username, password } = credentials
    if (!username || !password) {
      return {
        status: 'error',
        error: 'A username and password are required'
      }
    }

    const onLoginEvent = makeAureliaLoginHandler((event) => {
      if (event.event === 'awaiting_confirmation') {
        sendFrontendMessage('steamLoginStatus', {
          state: 'awaiting_confirmation',
          message: event.message
        })
      } else if (event.event === 'guard_required') {
        sendFrontendMessage('steamGuardRequired', event.type ?? 'device')
      }
    })

    this.loginProcess = null
    try {
      const res = await runAureliaCommand(
        ['login', '-u', username, '-p', password, '--json'],
        {
          abortId: LOGIN_ABORT_ID,
          onOutput: (data, child) => {
            this.loginProcess = child
            onLoginEvent(data)
          }
        }
      )
      const result = parseAureliaJson<{
        logged_in?: boolean
        account?: string
      }>(res)
      if (!result.logged_in) {
        logError('Steam login did not succeed', LogPrefix.Steam)
        return { status: 'error', error: 'Login was not successful' }
      }
      logInfo('Steam login successful', LogPrefix.Steam)
      return { status: 'done' }
    } catch (error) {
      if (error instanceof AureliaError && error.aborted) {
        logInfo('Steam login cancelled', LogPrefix.Steam)
        return { status: 'error', error: 'cancelled' }
      }
      const message =
        error instanceof AureliaError ? error.message : String(error)
      if (isCancellationError(message)) {
        logInfo('Steam login cancelled', LogPrefix.Steam)
        return { status: 'error', error: 'cancelled' }
      }
      logError(['Steam login failed', message], LogPrefix.Steam)
      return { status: 'error', error: message }
    } finally {
      this.loginProcess = null
    }
  }

  /**
   * Feeds a Steam Guard code to the login
   */
  static submitGuardCode(code: string): void {
    const child = this.loginProcess
    if (!child?.stdin?.writable) {
      logWarning(
        'No pending Steam login to receive the Steam Guard code',
        LogPrefix.Steam
      )
      return
    }
    child.stdin.write(`${code.trim()}\n`)
  }

  static cancelLogin(): void {
    callAbortController(LOGIN_ABORT_ID)
  }

  static async loginQr(): Promise<{
    status: 'done' | 'error'
    error?: string
  }> {
    logInfo('Logging in to Steam through Aurelia (QR code)', LogPrefix.Steam)

    try {
      const res = await runAureliaCommand(['login', '--qr', '--json'], {
        abortId: QR_LOGIN_ABORT_ID,
        onOutput: makeAureliaQrHandler(
          (url) => sendFrontendMessage('steamQrChallenge', url),
          () => sendFrontendMessage('steamQrScanned')
        )
      })
      const result = parseAureliaJson<{
        logged_in?: boolean
        account?: string
      }>(res)
      if (!result.logged_in) {
        logError('Steam QR login did not succeed', LogPrefix.Steam)
        return { status: 'error', error: 'Login was not successful' }
      }
      logInfo('Steam QR login successful', LogPrefix.Steam)
      return { status: 'done' }
    } catch (error) {
      if (error instanceof AureliaError && error.aborted) {
        logInfo('Steam QR login cancelled', LogPrefix.Steam)
        return { status: 'error', error: 'cancelled' }
      }
      const message =
        error instanceof AureliaError ? error.message : String(error)
      if (isCancellationError(message)) {
        logInfo('Steam QR login cancelled', LogPrefix.Steam)
        return { status: 'error', error: 'cancelled' }
      }
      logError(['Steam QR login failed', message], LogPrefix.Steam)
      return { status: 'error', error: message }
    }
  }

  static cancelQrLogin(): void {
    callAbortController(QR_LOGIN_ABORT_ID)
  }

  private static async getAccount(): Promise<AureliaAccount | undefined> {
    try {
      return await runAurelia<AureliaAccount>(['account'])
    } catch {
      // `account` needs a live client session
      try {
        const health = await runAurelia<{
          logged_in?: boolean
          account?: string | null
          steam_id?: string | number | null
        }>(['login', '--health'])
        if (health.account) {
          return {
            steam_id: health.steam_id ?? '',
            account_name: health.account
          }
        }
      } catch {
        // No session information at all.
      }
      return undefined
    }
  }

  public static async getUserDetails(): Promise<
    { username: string } | undefined
  > {
    const account = await this.getAccount()
    if (!account) {
      logWarning('User is not logged in', LogPrefix.Steam)
      return
    }
    // Prefer the public persona
    return { username: account.persona_name || account.account_name }
  }

  public static async getAccounts(): Promise<SteamAccount[]> {
    const account = await this.getAccount()
    if (!account) {
      return []
    }
    return [
      {
        steamId: String(account.steam_id),
        username: account.persona_name || account.account_name
      }
    ]
  }

  // Aurelia is single-session, so the specific account id is irrelevant.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public static async logoutAccount(steamId: string): Promise<void> {
    await this.logout()
  }

  public static async logout(): Promise<void> {
    try {
      await runAurelia(['logout'])
    } catch (error) {
      logWarning(
        [
          'Steam logout failed',
          error instanceof AureliaError ? error.message : String(error)
        ],
        LogPrefix.Steam
      )
    }
    clearCache('steam')
    logInfo('Logging user out from Steam', LogPrefix.Steam)
  }

  public static async isLoggedIn(): Promise<boolean> {
    return (await this.getAccount()) !== undefined
  }
}
