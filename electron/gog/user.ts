import axios from 'axios'
import Store from 'electron-store'
import { logError, logInfo, LogPrefix } from '../logger/logger'
import { GOGLoginData } from '../types'

const configStore = new Store({
  cwd: 'gog_store'
})

const gogAuthenticateUrl =
  'https://auth.gog.com/token?client_id=46899977096215655&client_secret=9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9&grant_type=authorization_code&redirect_uri=https%3A%2F%2Fembed.gog.com%2Fon_login_success%3Forigin%3Dclient&code='
const gogRefreshTokenUrl =
  'https://auth.gog.com/token?client_id=46899977096215655&client_secret=9d85c43b1482497dbbce61f6e4aa173a433796eeae2ca8c5f6129f2dc4de46d9&grant_type=refresh_token'

export class GOGUser {
  static async login(code: string) {
    logInfo('Logging using GOG credentials', LogPrefix.Gog)

    // Gets token from GOG basaed on authorization code
    const response = await axios
      .get(gogAuthenticateUrl + code)
      .catch((error) => {
        // Handle fetching error
        logError(['Failed to get access_token', `${error}`], LogPrefix.Gog)
        return null
      })
    if (!response?.data) {
      logError('Failed to get access_token', LogPrefix.Gog)
      return { status: 'error' }
    }

    const data: GOGLoginData = response.data
    data.loginTime = Date.now()
    configStore.set('credentials', data)
    logInfo('Login Successful', LogPrefix.Gog)
    await this.getUserDetails()
    return { status: 'done' }
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
          return null
        })

      if (!response) {
        return
      }

      const data: GOGLoginData = response.data
      data.loginTime = Date.now()
      configStore.set('credentials', data)
      logInfo('Token refreshed successfully', LogPrefix.Gog)
    } else {
      logError('No credentials, auth required', LogPrefix.Gog)
    }
  }

  public static isTokenExpired() {
    const user: GOGLoginData = configStore.get('credentials') as GOGLoginData
    if (!user) {
      return true
    }
    const isExpired = Date.now() >= user.loginTime + user.expires_in * 1000
    return isExpired
  }
  public static logout() {
    const libraryStore = new Store({ cwd: 'gog_store', name: 'library' })
    configStore.clear()
    libraryStore.clear()
    logInfo('Logging user out', LogPrefix.Gog)
  }

  public static isLoggedIn() {
    return configStore.has('credentials')
  }
}
