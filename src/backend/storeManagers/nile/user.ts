import {
  LogPrefix,
  logDebug,
  logError,
  logInfo,
  logWarning
} from 'backend/logger'
import {
  NileLoginData,
  NileRegisterData,
  NileUserData
} from 'common/types/nile'
import { libraryManagerMap } from '..'
import { existsSync, readFileSync, unlinkSync } from 'graceful-fs'
import { configStore } from './electronStores'
import { clearCache } from 'backend/utils'
import { nileUserData } from './constants'
import { session } from 'electron'

function authLogSanitizer(line: string) {
  try {
    const output = JSON.parse(line)
    output.url = '<redacted>'
    output.code_verifier = '<redacted>'
    output.serial = '<redacted>'
    output.client_id = '<redacted>'
    return JSON.stringify(output) + '\n'
  } catch {
    return line
  }
}

export class NileUser {
  private static requestLoginData() {
    return libraryManagerMap['nile'].runRunnerCommand(
      ['auth', '--login', '--non-interactive'],
      {
        abortId: 'nile-auth',
        logSanitizer: authLogSanitizer
      }
    )
  }

  static async getLoginData(): Promise<NileLoginData> {
    logDebug('Getting login data from Nile', LogPrefix.Nile)
    let result = await this.requestLoginData()

    // Nile refuses to start a login while a local session exists. Only reset it
    // when Heroic has no cached account for that session, so a redundant login
    // attempt never discards an active login.
    if (
      !result.stdout &&
      result.stderr.includes('already logged in') &&
      !this.isLoggedIn()
    ) {
      logWarning('Resetting stale Nile session', LogPrefix.Nile)
      await this.logout()
      if (existsSync(nileUserData)) {
        unlinkSync(nileUserData)
      }
      result = await this.requestLoginData()
    }

    if (!result.stdout) {
      throw new Error(`Nile did not return login data: ${result.stderr}`)
    }

    const output: NileLoginData = JSON.parse(result.stdout)

    logInfo(['Register data is:', output], LogPrefix.Nile)
    return output
  }

  static async login(
    data: NileRegisterData
  ): Promise<{ status: 'done' | 'failed'; user: NileUserData | undefined }> {
    logDebug(['Got register data:', data], LogPrefix.Nile)
    const { code, code_verifier, serial, client_id } = data
    // Nile prints output to stderr
    const { stderr: output } = await libraryManagerMap['nile'].runRunnerCommand(
      [
        'register',
        '--code',
        code,
        '--code-verifier',
        code_verifier,
        '--serial',
        serial,
        '--client-id',
        client_id
      ],
      { abortId: 'nile-login' }
    )

    const successRegex = /\[AUTH_MANAGER]:.*Succesfully registered a device/
    if (!successRegex.test(output)) {
      // Authentication failed
      logError(['Authentication failed:', output], LogPrefix.Nile)
      return {
        status: 'failed',
        user: undefined
      }
    }

    logInfo('Authentication successful', LogPrefix.Nile)
    const user = await this.getUserData()
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
  }

  static async logout() {
    const commandParts = ['auth', '--logout']

    const res = await libraryManagerMap['nile'].runRunnerCommand(commandParts, {
      abortId: 'nile-logout'
    })

    if (res.abort) {
      logError('Failed to logout: abort by user', LogPrefix.Nile)
      return
    }

    configStore.delete('userData')
    clearCache('nile')
    const ses = session.fromPartition('persist:amazon')
    ses.clearStorageData().catch(() => {})
    ses.clearCache().catch(() => {})
    ses.clearAuthCache().catch(() => {})
  }

  static async getUserData(): Promise<NileUserData | undefined> {
    if (!existsSync(nileUserData)) {
      logError('user.json does not exist', LogPrefix.Nile)
      configStore.delete('userData')
      return
    }

    const user: NileUserData = JSON.parse(readFileSync(nileUserData, 'utf-8'))
    if (!Object.keys(user).length) {
      logInfo('user.json is empty', LogPrefix.Nile)
      configStore.delete('userData')
      return
    }

    configStore.set('userData', user)
    logInfo('Saved user data to config file', LogPrefix.Nile)

    return user
  }

  public static isLoggedIn() {
    return configStore.get_nodefault('userData') || false
  }
}
