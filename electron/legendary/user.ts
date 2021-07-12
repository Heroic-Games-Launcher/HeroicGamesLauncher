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
import { spawn } from 'child_process'
import {userInfo as user} from 'os'

export class LegendaryUser {
  public static async login(sid: string) {
    const command = `auth --sid ${sid}`.split(' ')
    return new Promise((res) => {
      const child = spawn(legendaryBin, command)
      child.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`)
        if (`${data}`.includes('ERROR:')) {
          return res('error')
        }
      })
      child.stdout.on('data', (data) => console.log(`stdout: ${data}`))
      child.on('close', () => {
        console.log('finished login');
        res('finished')
      })
    })
    // return (await execAsync(`${legendaryBin})).stdout.includes('Successfully logged in')
  }

  public static async logout() {
    await execAsync(`${legendaryBin} auth --delete`)
    // Should we do this?
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
      return {...JSON.parse(readFileSync(userInfo, 'utf-8')), user: user().username}
    }
    return { account_id: '', displayName: null }
  }
}
