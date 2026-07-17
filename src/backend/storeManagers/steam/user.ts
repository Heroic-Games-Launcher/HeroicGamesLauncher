import { session } from 'electron'
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
  makeAureliaUrlEventHandler,
  AureliaError
} from './aurelia'
import type { AureliaAccount } from './aurelia_types'
import type { ExecResult } from 'common/types'

const QR_LOGIN_ABORT_ID = 'steam-qr-login'
const WEB_LOGIN_ABORT_ID = 'steam-web-login'

/** Webview partition the browser sign-in runs in (matches `/store/steam`). */
export const STEAM_LOGIN_PARTITION = 'persist:steam'

/** Steam returns the signed-in browser's web token JSON on this page. */
const CLIENTJSTOKEN_URL = 'https://steamcommunity.com/chat/clientjstoken'

let webLoginProcess: Promise<ExecResult> | null = null

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

  static async loginQr(): Promise<{
    status: 'done' | 'error'
    error?: string
  }> {
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

  static cancelQrLogin(): void {
    callAbortController(QR_LOGIN_ABORT_ID)
  }

  /**
   * webview sign-in
   */
  static async startWebLogin(): Promise<{ url?: string; error?: string }> {
    logInfo(
      'Starting Steam browser sign-in through Aurelia (OpenID)',
      LogPrefix.Steam
    )

    let sendUrl: (url: string) => void
    const urlPromise = new Promise<string>((resolve) => {
      sendUrl = resolve
    })

    const process = runAureliaCommand(['login', '--openid', '--json'], {
      abortId: WEB_LOGIN_ABORT_ID,
      onOutput: makeAureliaUrlEventHandler('openid_challenge', (url) =>
        sendUrl(url)
      )
    })
    webLoginProcess = process

    return Promise.race([
      urlPromise.then((url) => ({ url })),
      process.then((res) => {
        webLoginProcess = null
        try {
          parseAureliaJson(res)
          return { error: 'sign-in ended before Steam issued a login URL' }
        } catch (error) {
          const message =
            error instanceof AureliaError ? error.message : String(error)
          logError(['Steam browser sign-in failed', message], LogPrefix.Steam)
          return { error: message }
        }
      })
    ])
  }

  /**
   * Complete the browser sign-in
   */
  static async finishWebLogin(): Promise<{
    status: 'done' | 'error'
    error?: string
  }> {
    const process = webLoginProcess
    webLoginProcess = null
    if (!process) {
      return { status: 'error', error: 'no browser sign-in is in progress' }
    }

    try {
      const openidRes = await process
      parseAureliaJson<{ openid_verified?: boolean }>(openidRes)
      // Read the SteamID as a string
      const verifiedSteamId = openidRes.stdout.match(
        /"steam_id"\s*:\s*(\d+)/
      )?.[1]
      logInfo(
        `Steam identity verified via OpenID (SteamID ${verifiedSteamId})`,
        LogPrefix.Steam
      )

      // fetch web token
      const response = await session
        .fromPartition(STEAM_LOGIN_PARTITION)
        .fetch(CLIENTJSTOKEN_URL, { credentials: 'include' })
      if (!response.ok) {
        throw new Error(`clientjstoken returned HTTP ${response.status}`)
      }
      const tokenJson = await response.text()

      // The token's own account must be the one OpenID just verified.
      const tokenSteamId = tokenJson.match(/"steamid"\s*:\s*"(\d+)"/)?.[1]
      if (verifiedSteamId && tokenSteamId && verifiedSteamId !== tokenSteamId) {
        throw new Error(
          `the browser session (SteamID ${tokenSteamId}) does not match the verified identity (${verifiedSteamId})`
        )
      }

      const saved = await runAurelia<{
        web_token_saved?: boolean
        account?: string
      }>(['login', '--web-token'], {
        env: { AURELIA_WEB_TOKEN: tokenJson }
      })
      if (!saved.web_token_saved) {
        return { status: 'error', error: 'the web token was not accepted' }
      }
      logInfo(
        ['Steam browser sign-in successful', saved.account ?? ''],
        LogPrefix.Steam
      )
      return { status: 'done' }
    } catch (error) {
      if (error instanceof AureliaError && error.aborted) {
        logInfo('Steam browser sign-in cancelled', LogPrefix.Steam)
        return { status: 'error', error: 'cancelled' }
      }
      const message =
        error instanceof AureliaError ? error.message : String(error)
      logError(['Steam browser sign-in failed', message], LogPrefix.Steam)
      return { status: 'error', error: message }
    }
  }

  static cancelWebLogin(): void {
    webLoginProcess = null
    callAbortController(WEB_LOGIN_ABORT_ID)
  }

  private static async getAccount(): Promise<AureliaAccount | undefined> {
    try {
      return await runAurelia<AureliaAccount>(['account'])
    } catch {
      // `account` needs a full client session
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
    return { username: account.account_name }
  }

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
