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
  AureliaError,
  type AureliaAccount
} from './aurelia'

/** Abort id for the in-flight `aurelia login --qr` process (single session). */
const QR_LOGIN_ABORT_ID = 'steam-qr-login'

/**
 * Steam authentication, delegated to the bundled `aurelia` CLI. Aurelia owns the
 * Steam session, so Heroic logs in with credentials (`aurelia login`), reads the
 * signed-in account from `aurelia account`, and clears it with `aurelia logout`
 * instead of running its own Steam OpenID web flow.
 */
export class SteamUser {
  static async login(
    credentials: SteamLoginData
  ): Promise<{ status: 'done' | 'error'; error?: string }> {
    logInfo('Logging in to Steam through Aurelia', LogPrefix.Steam)

    const { username, password, guard } = credentials
    try {
      const result = await runAurelia<{
        logged_in?: boolean
        account?: string
      }>([
        'login',
        ...(username ? ['-u', username] : []),
        ...(password ? ['-p', password] : []),
        ...(guard ? ['--guard', guard] : [])
      ])
      if (!result.logged_in) {
        logError('Steam login did not succeed', LogPrefix.Steam)
        return { status: 'error', error: 'Login was not successful' }
      }
      logInfo('Steam login successful', LogPrefix.Steam)
      return { status: 'done' }
    } catch (error) {
      const message =
        error instanceof AureliaError ? error.message : String(error)
      logError(['Steam login failed', message], LogPrefix.Steam)
      return { status: 'error', error: message }
    }
  }

  /**
   * Logs in by QR code (`aurelia login --qr`). Aurelia emits a `qr_challenge`
   * URL up front, which we forward to the frontend (`steamQrChallenge`) to draw
   * as a QR code, then blocks until the user approves the sign-in in the Steam
   * Mobile app. {@link cancelQrLogin} aborts the wait if the user closes the
   * dialog first.
   */
  static async loginQr(): Promise<{ status: 'done' | 'error'; error?: string }> {
    logInfo('Logging in to Steam through Aurelia (QR code)', LogPrefix.Steam)

    try {
      const res = await runAureliaCommand(['login', '--qr', '--json'], {
        abortId: QR_LOGIN_ABORT_ID,
        onOutput: makeAureliaQrHandler((url) =>
          sendFrontendMessage('steamQrChallenge', url)
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
      logError(['Steam QR login failed', message], LogPrefix.Steam)
      return { status: 'error', error: message }
    }
  }

  /** Aborts an in-flight {@link loginQr} (e.g. the user closed the dialog). */
  static cancelQrLogin(): void {
    callAbortController(QR_LOGIN_ABORT_ID)
  }

  /** Reads the currently signed-in account, or undefined when logged out. */
  private static async getAccount(): Promise<AureliaAccount | undefined> {
    try {
      return await runAurelia<AureliaAccount>(['account'])
    } catch {
      // `account` errors when no session exists; treat that as "logged out".
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
    return { username: account.account_name }
  }

  /**
   * Returns the signed-in Steam account. Aurelia is single-session, so this is
   * either one account or none (kept as an array to match the multi-account
   * shape the rest of Heroic expects).
   */
  public static async getAccounts(): Promise<SteamAccount[]> {
    const account = await this.getAccount()
    if (!account) {
      return []
    }
    return [
      { steamId: String(account.steam_id), username: account.account_name }
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
