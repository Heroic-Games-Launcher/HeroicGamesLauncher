import { LogPrefix, logDebug, logError, logInfo } from 'backend/logger/logger'
import {
  createAbortController,
  deleteAbortController
} from 'backend/utils/aborthandler/aborthandler'
import {
  NileLoginData,
  NileRegisterData,
  NileUserData
} from 'common/types/nile'
import { runRunnerCommand } from './library'
import { existsSync, readFileSync } from 'graceful-fs'
import { nileUserData } from 'backend/constants'
import { configStore } from './electronStores'
import { clearCache } from 'backend/utils'

export class NileUser {
  static async getLoginData(): Promise<NileLoginData> {
    logDebug('Getting login data from Nile', LogPrefix.Nile)
    const { stdout } = await runRunnerCommand(
      ['auth', '--login', '--non-interactive'],
      createAbortController('nile-auth')
    )
    deleteAbortController('nile-auth')
    const output: NileLoginData = JSON.parse(stdout)

    logInfo(['Register data is:', output], LogPrefix.Nile)
    return output
  }

  static async login(
    data: NileRegisterData
  ): Promise<{ status: 'done' | 'failed'; user: NileUserData | undefined }> {
    logDebug(['Got register data:', data], LogPrefix.Nile)
    const { code, code_verifier, serial, client_id } = data
    // Nile prints output to stderr
    const { stderr: output } = await runRunnerCommand(
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
      createAbortController('nile-login')
    )
    deleteAbortController('nile-login')

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

    const abortID = 'nile-logout'
    const res = await runRunnerCommand(
      commandParts,
      createAbortController(abortID)
    )
    deleteAbortController(abortID)

    if (res.abort) {
      logError('Failed to logout: abort by user'), LogPrefix.Nile
      return
    }

    configStore.delete('userData')
    clearCache('nile')
  }

  static async getUserData(): Promise<NileUserData | undefined> {
    if (!existsSync(nileUserData)) {
      logError('user.json does not exist', LogPrefix.Nile)
      configStore.delete('userData')
      return
    }

    const user: { extensions: { customer_info: NileUserData } } = JSON.parse(
      readFileSync(nileUserData, 'utf-8')
    )
    if (!Object.keys(user).length) {
      logInfo('user.json is empty', LogPrefix.Nile)
      configStore.delete('userData')
      return
    }

    configStore.set('userData', user.extensions.customer_info)
    logInfo('Saved user data to config file', LogPrefix.Nile)

    return user.extensions.customer_info
  }

  public static isLoggedIn() {
    return configStore.get_nodefault('userData') || false
  }
}
