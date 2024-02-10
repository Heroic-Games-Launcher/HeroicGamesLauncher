import { LogPrefix, logDebug, logError, logInfo } from 'backend/logger/logger'
import {
  createAbortController,
  deleteAbortController
} from 'backend/utils/aborthandler/aborthandler'
import {
  CarnivalLoginData,
  CarnivalRegisterData,
  CarnivalUserData,
  CarnivalUserDataFile
} from 'common/types/carnival'
import { runRunnerCommand } from './library'
import { existsSync, readFileSync } from 'graceful-fs'
import { carnivalUserData } from 'backend/constants'
import { configStore } from './electronStores'
import { clearCache } from 'backend/utils'
import { load } from 'js-yaml'
import  { session } from 'electron'

export class CarnivalUser {
  static async getLoginData(): Promise<CarnivalLoginData> {
    logDebug('Getting login data from Carnival', LogPrefix.Carnival)
    const { stdout } = await runRunnerCommand(
      ['auth', '--login', '--non-interactive'],
      createAbortController('carnival-auth')
    )
    deleteAbortController('carnival-auth')
    const output: CarnivalLoginData = JSON.parse(stdout)

    logInfo(['Register data is:', output], LogPrefix.Carnival)
    return output
  }

  static async login(
    data: CarnivalRegisterData
  ): Promise<{ status: 'done' | 'failed'; user: CarnivalUserData | undefined }> {
    logDebug(['Got register data:', data], LogPrefix.Carnival)
    const { code, code_verifier, serial, client_id } = data
    // Carnival prints output to stderr
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
      createAbortController('carnival-login')
    )
    deleteAbortController('carnival-login')

    const successRegex = /\[AUTH_MANAGER]:.*Succesfully registered a device/
    if (!successRegex.test(output)) {
      // Authentication failed
      logError(['Authentication failed:', output], LogPrefix.Carnival)
      return {
        status: 'failed',
        user: undefined
      }
    }

    logInfo('Authentication successful', LogPrefix.Carnival)
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
    const commandParts = ['logout']

    const abortID = 'carnival-logout'
    const res = await runRunnerCommand(
      commandParts,
      createAbortController(abortID)
    )
    deleteAbortController(abortID)

    if (res.abort) {
      logError('Failed to logout: abort by user'), LogPrefix.Carnival
      return
    }

    configStore.delete('userData')
    clearCache('carnival')
  }

  static async getUserData(): Promise<CarnivalUserData | undefined> {
    logInfo('Getting user data', LogPrefix.Carnival)
    if (!existsSync(carnivalUserData)) {
      logError('user.yml does not exist', LogPrefix.Carnival)
      configStore.delete('userData')
      return
    }
    try {
      const user: CarnivalUserDataFile = load(
        readFileSync(carnivalUserData, 'utf-8')
      ) as CarnivalUserDataFile
  
      configStore.set('userData', user.user_info)
      logInfo('Saved user data to global config', LogPrefix.Carnival)
      logDebug(["username: ",user.user_info.username], LogPrefix.Carnival)

      const mySession = session.fromPartition('persist:epicstore')
      mySession.cookies.get({domain: '.indiegala.com'})
        .then((cookies) => {
          logDebug(cookies, LogPrefix.Carnival)
      }).catch((error) => {
        logError(error, LogPrefix.Carnival)
      })
      return user.user_info
    } catch (error) {
      logInfo('user.json is empty', LogPrefix.Carnival)
      configStore.delete('userData')
      return
    }
  }

  public static isLoggedIn() {
    return configStore.get_nodefault('userData') || false
  }
}
