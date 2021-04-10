
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

export class User {
  public static async login(sid: string) {
    await execAsync(`${legendaryBin} auth --sid ${sid}`)
  }

  public static async logout() {
    await execAsync(`${legendaryBin} auth --delete`)
    await execAsync(`${legendaryBin} cleanup`)
  }

  public static isLoggedIn() {
    return existsSync(userInfo)
  }

  public static getUserInfo() : UserInfo {
    if (User.isLoggedIn()) {
      return JSON.parse(readFileSync(userInfo, 'utf-8'))
    }
    return { account_id: '', displayName: null }
  }
}