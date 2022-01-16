import { existsSync, readFileSync } from 'graceful-fs'

import { UserInfo } from '../types'
import { clearCache, execAsync } from '../utils'
import { legendaryBin, userInfo } from '../constants'
import { logError, logInfo, LogPrefix } from '../logger'
import { spawn } from 'child_process'
import { userInfo as user } from 'os'
import Store from 'electron-store'
import { dialog, session } from 'electron'
import i18next from 'i18next'

const configStore = new Store({
  cwd: 'store'
})
export class LegendaryUser {
  public static async login(sid: string) {
    logInfo('Logging with Legendary...')

    const command = `auth --sid ${sid}`.split(' ')
    return new Promise((res) => {
      const child = spawn(legendaryBin, command)
      child.stderr.on('data', (data) => {
        if (`${data}`.includes('ERROR')) {
          logError(`${data}`, LogPrefix.Legendary)
          dialog.showErrorBox(
            i18next.t('box.error.login.tittle', 'Cannot Login!'),
            `${data}`
          )
          return res('error')
        } else {
          logInfo(`stderr: ${data}`, LogPrefix.Legendary)
        }
      })
      child.stdout.on('data', (data) => {
        if (`${data}`.includes('ERROR')) {
          logError(`${data}`, LogPrefix.Legendary)
          dialog.showErrorBox(
            i18next.t('box.error.login.tittle', 'Cannot Login!'),
            `${data}`
          )
          return res('error')
        } else {
          logInfo(`stdout: ${data}`, LogPrefix.Legendary)
        }
      })
      child.on('close', () => {
        logInfo('finished login', LogPrefix.Legendary)
        res('finished')
      })
    })
  }

  public static async logout() {
    await execAsync(`${legendaryBin} auth --delete`)
    const ses = session.fromPartition('persist:epicstore')
    await ses.clearStorageData()
    await ses.clearCache()
    await ses.clearAuthCache()
    await ses.clearHostResolverCache()
    configStore.clear()
    clearCache()
  }

  public static async isLoggedIn() {
    return existsSync(userInfo)
  }

  public static async getUserInfo(): Promise<UserInfo> {
    let isLoggedIn = false
    try {
      isLoggedIn = await LegendaryUser.isLoggedIn()
    } catch (error) {
      logError(error)
      configStore.delete('userInfo')
    }
    if (isLoggedIn) {
      const info = {
        ...JSON.parse(readFileSync(userInfo, 'utf-8')),
        user: user().username
      }
      configStore.set('userInfo', info)
      return info
    }
    configStore.delete('userInfo')
    return { account_id: '', displayName: null }
  }
}
