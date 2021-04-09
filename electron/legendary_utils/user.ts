import { exec } from 'child_process'
import {
  existsSync,
  readFileSync
} from 'graceful-fs'

import { UserInfo } from '../types'
import {
  legendaryBin,
  userInfo
} from '../constants'

export class User {
  public static login(sid: string) {
    exec(`${legendaryBin} auth --sid ${sid}`)
  }

  public static logout() {
    exec(`${legendaryBin} auth --delete`)
    exec(`${legendaryBin} cleanup`)
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