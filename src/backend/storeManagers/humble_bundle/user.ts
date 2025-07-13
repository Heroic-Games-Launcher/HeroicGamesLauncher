import { HumbleBundleUserInfo } from 'common/types/humble_bundle'
import { BrowserWindow, session } from 'electron'
import { configStore } from './electronStores'

export class HumbleBundleUser {
  static async login(): Promise<{
    status: 'done' | 'error'
    data?: HumbleBundleUserInfo
  }> {
    if (await this.isLoggedIn()) {
      const win = await this.openBrowser()
      await win.loadURL('https://www.humblebundle.com/user/settings')

      const email = await win.webContents.executeJavaScript(
        "document.getElementById('email').value"
      )

      await win.close()

      const userData = { email }

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
    const win = await this.openBrowser()
    await win.loadURL('https://www.humblebundle.com/user/settings')
    const logged = !win.webContents.getURL().match('/login')
    await win.close()
    return logged
  }

  public static getUserInfo(): HumbleBundleUserInfo | undefined {
    console.log('encule')
    return { email: 'hello@hello.hello' }
  }

  private static async openBrowser() {
    const ses = session.fromPartition('persist:epicstore')

    const win = new BrowserWindow({
      width: 1280,
      height: 1024,
      show: true
    })

    const cookies = await ses.cookies.get({})
    cookies.forEach(async (cookie) => {
      try {
        await win.webContents.session.cookies.set({
          ...cookie,
          url: 'www.humblebundle.com'
        })
      } catch (e) {}
    })

    return win
  }
}
