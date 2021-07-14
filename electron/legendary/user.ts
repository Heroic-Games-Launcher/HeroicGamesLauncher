import {
  existsSync,
  readFileSync
} from 'graceful-fs'

import { UserInfo } from '../types'
import { execAsync } from '../utils'
import {
  legendaryBin,
  userInfo
} from '../constants'
import { logError, logInfo } from '../logger'
import { spawn } from 'child_process'
import { userInfo as user } from 'os'
import Store from 'electron-store';

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
        console.log(`stderr: ${data}`)
        if (`${data}`.includes('ERROR')) {
          return res('error')
        }
      })
      child.stdout.on('data', (data) => {
        console.log(`stderr: ${data}`)
        if (`${data}`.includes('ERROR')) {
          return res('error')
        }
      })
      child.on('close', () => {
        console.log('finished login');
        res('finished')
      })
    })
  }

  public static async logout() {
    await execAsync(`${legendaryBin} auth --delete`)
    configStore.delete('userInfo')
  }

  public static async isLoggedIn() {
    return existsSync(userInfo) || await execAsync(`${legendaryBin} status`).then(
      ({ stdout }) => !stdout.includes('Epic account: <not logged in>')
    )
  }

  public static async getUserInfo(): Promise<UserInfo> {
    logInfo('Trying to get user information')
    configStore.delete('userInfo')

    let isLoggedIn = false
    try {
      isLoggedIn = await LegendaryUser.isLoggedIn()
    } catch (error) {
      logError(error)
    }
    if (isLoggedIn) {
      const info = { ...JSON.parse(readFileSync(userInfo, 'utf-8')), user: user().username }
      configStore.set('userInfo', info)
      return info
    }
    return { account_id: '', displayName: null }
  }
}
