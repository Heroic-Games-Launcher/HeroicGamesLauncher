import { HumbleBundleUserInfo } from 'common/types/humble_bundle'
import { BrowserWindow, session } from 'electron'
import { configStore } from './electronStores'
import { clearCache } from 'backend/utils'

export class HumbleBundleUser {
  static async logout(): Promise<void> {
    if (!(await this.isLoggedIn())) {
      return
    }

    const browser = await this.openBrowser()
    await browser.loadURL('https://www.humblebundle.com/user/settings')
    await browser.webContents.executeJavaScript(`
      document.querySelector('.js-login-form') ||
      document.querySelector('.navbar-item-dropdown-item.js-navbar-logout').click();
    `)
    browser.close()
    configStore.delete('userData')
    configStore.set('isLoggedIn', false)
    const ses = session.fromPartition('persist:humble-bundle')
    await ses.clearStorageData()
    await ses.clearCache()
    await ses.clearAuthCache()
    await ses.clearHostResolverCache()
    clearCache('humble-bundle')
  }
  static async login(): Promise<{
    status: 'done' | 'error'
    data?: HumbleBundleUserInfo
  }> {
    if (await this.isLoggedIn()) {
      const response = await fetch(
        'https://www.humblebundle.com/user/settings',
        {
          redirect: 'manual',
          headers: {
            cookie: await this.getCookies()
          }
        }
      )
      const settings = await response.text()
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
      configStore.delete('userData')

      return {
        status: 'error',
        data: undefined
      }
    }
  }

  public static async isLoggedIn(): Promise<boolean> {
    const response = await fetch('https://www.humblebundle.com/user/settings', {
      redirect: 'manual',
      headers: {
        cookie: await this.getCookies()
      }
    })
    return response.status == 200
  }

  public static async getUserInfo(): Promise<HumbleBundleUserInfo | undefined> {
    const result = await this.login()
    if (result.status == 'done') {
      return result.data
    }
    return undefined
  }

  public static async getCookies() {
    const ses = session.fromPartition('persist:humble-bundle')

    const cookies = await ses.cookies.get({ name: '_simpleauth_sess' })
    const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    return cookieString
  }

  private static async openBrowser() {
    const ses = session.fromPartition('persist:humble-bundle')
    const win = new BrowserWindow({
      width: 1280,
      height: 1024,
      show: false
    })

    const cookies = await ses.cookies.get({})
    cookies.forEach(async (cookie) => {
      try {
        await win.webContents.session.cookies.set({
          ...cookie,
          url: 'www.humblebundle.com'
        })
      } catch (e) {
        // ignore
      }
    })

    return win
  }
}
