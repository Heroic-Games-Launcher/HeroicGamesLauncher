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
import {userInfo as user} from 'os'
import Store from 'electron-store';

const configStore = new Store({
  cwd: 'store'
})
export class LegendaryUser {
  public static async login(sid: string) {
    return (await execAsync(`${legendaryBin} auth --sid ${sid}`)).stdout.includes('Successfully logged in')
  }

  public static async logout() {
    await execAsync(`${legendaryBin} auth --delete`)
    // Should we do this?
    configStore.delete('userInfo')
    await execAsync(`${legendaryBin} cleanup`)
  }

  public static async isLoggedIn() {
    return existsSync(userInfo) || await execAsync(`${legendaryBin} status`).then(
      ({stdout}) => !stdout.includes('Epic account: <not logged in>')
    )
  }

  public static async getUserInfo() : Promise<UserInfo> {
    const isLoggedIn = await LegendaryUser.isLoggedIn()
    if (isLoggedIn) {
      const info = {...JSON.parse(readFileSync(userInfo, 'utf-8')), user: user().username}
      configStore.set('userInfo', info)
      return info
    }
    return { account_id: '', displayName: null }
  }
}
