import { GOGLibrary } from './library'
import axios from 'axios'
import Store from 'electron-store'
import { BrowserWindow } from 'electron'
import { logError, logInfo, LogPrefix } from '../logger'
import { gogLoginUrl } from '../constants'
import { GOGLoginData } from '../types'

const configStore = new Store({
  cwd: 'gog_store'
})

const gogEmbedRegExp = new RegExp('https://embed.gog.com/on_login_success?')
const gogRefreshTokenUrl =
  'https://auth.gog.com/token?client_id=46899977096215655&client_secret=9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9&grant_type=refresh_token'

export class GOGUser {
  public static async handleGOGLogin() {
    const popupWindow = new BrowserWindow({
      width: 450,
      height: 700,
      title: 'GOG'
    })
    popupWindow.loadURL(gogLoginUrl)
    popupWindow.once('ready-to-show', popupWindow.show)

    popupWindow.webContents.on('did-finish-load', () => {
      const pageUrl = popupWindow.webContents.getURL()
      if (pageUrl.match(gogEmbedRegExp)) {
        const parsedURL = new URL(pageUrl)
        const code = parsedURL.searchParams.get('code')
        this.login(code)
        popupWindow.close()
      }
    })
  }

  static async login(code: string) {
    logInfo('Logging using GOG credentials')

    // Gets token from GOG basaed on authorization code
    const response = await axios
      .get(
        `https://auth.gog.com/token?client_id=46899977096215655&client_secret=9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9&grant_type=authorization_code&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&code=${code}`
      )
      .catch((e) => {
        // TODO: Handle fetching error
        logError(['Failed to get access_token', e], LogPrefix.Gog)
        return null
      })
    if (!response?.data) logError('Failed to get access_token', LogPrefix.Gog)

    const data: GOGLoginData = response.data
    data.loginTime = Date.now()
    configStore.set('credentials', data)
    logInfo('Login Successful', LogPrefix.Gog)
    this.getUserDetails()
    GOGLibrary.get().sync()
  }

  public static async getUserDetails() {
    logInfo('Getting data about the user', LogPrefix.Gog)
    if (this.isTokenExpired()) {
      this.refreshToken()
    }
    const user: GOGLoginData = configStore.get('credentials') as GOGLoginData
    const response = await axios
      .get(`https://embed.gog.com/userData.json`, {
        headers: { Authorization: `Bearer ${user.access_token}` }
      })
      .catch(() => {
        logError('Error getting user Data')
        return null
      })

    const data = response.data

    //Exclude email, it won't be needed
    delete data.email

    configStore.set('userData', data)
    logInfo('Saved user data to config', LogPrefix.Gog)
  }

  public static async refreshToken() {
    const user: GOGLoginData = configStore.get('credentials') as GOGLoginData
    logInfo('Refreshing access_token', LogPrefix.Gog)
    if (user) {
      const response = await axios
        .get(`${gogRefreshTokenUrl}&refresh_token=${user.refresh_token}`)
        .catch(() => {
          logError(
            'Error with refreshing token, reauth required',
            LogPrefix.Gog
          )
          this.handleGOGLogin()
          return null
        })

      if (!response) return

      const data: GOGLoginData = response.data
      data.loginTime = Date.now()
      configStore.set('credentials', data)
      logInfo('Token refreshed successfully', LogPrefix.Gog)
    } else {
      logError('No credentials, auth required', LogPrefix.Gog)
      await this.handleGOGLogin()
    }
  }

  public static isTokenExpired() {
    const user: GOGLoginData = configStore.get('credentials') as GOGLoginData
    if (!user) return true
    const isExpired = Date.now() >= user.loginTime + user.expires_in * 1000
    return isExpired
  }
  public static logout() {
    configStore.delete('credentials')
  }

  public static isLoggedIn() {
    return configStore.has('credentials')
  }
}
