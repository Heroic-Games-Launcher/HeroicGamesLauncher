import { HumbleBundleUserInfo } from 'common/types/humble_bundle'
import { BrowserWindow, session } from 'electron'
import { configStore } from './electronStores'

export class HumbleBundleUser {
  static async login(): Promise<{
    status: 'done' | 'error'
    data?: HumbleBundleUserInfo
  }> {
    if (await this.isLoggedIn()) {
      var response = await fetch('https://www.humblebundle.com/user/settings', {
        redirect: 'manual',
        headers: {
          cookie: await this.getCookies()
        }
      })
      const settings = await response.text()
      console.log(settings)
      const emailMatch = settings.match(
        /<input[^>]*id=["']email["'][^>]*value=["']([^"']+)["']/
      )

      if (!emailMatch) {
        return {
          status: 'error',
          data: undefined
        }
      }

      const userData = { email: emailMatch[1] }

      configStore.set('userData', userData)
      configStore.set('isLoggedIn', true)

      return {
        status: 'done',
        data: userData
      }
    } else {
      configStore.set('isLoggedIn', false)

      return {
        status: 'error',
        data: undefined
      }
    }
  }

  public static async isLoggedIn(): Promise<boolean> {
    var response = await fetch('https://www.humblebundle.com/user/settings', {
      redirect: 'manual',
      headers: {
        cookie: await this.getCookies()
      }
    })

    console.log('.>>>', response.status)
    return response.status == 200
  }

  public static async getUserInfo(): Promise<HumbleBundleUserInfo | undefined> {
    const result = await this.login()
    if (result.status == 'done') {
      return result.data
    }
    return undefined
  }

  private static async getCookies() {
    const ses = session.fromPartition('persist:epicstore')

    const cookies = await ses.cookies.get({ name: '_simpleauth_sess' })
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    console.log(cookieString)
    return cookieString
  }
}
