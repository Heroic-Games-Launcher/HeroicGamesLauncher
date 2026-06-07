import { join } from 'path'
import { app } from 'electron'

export const steamSupportFolder = join(app.getPath('userData'), 'steam_store')
export const credentialsPath = join(steamSupportFolder, '.steam.credentials')

// Steam OpenID 2.0 endpoints
export const openIdLoginUrl = 'https://steamcommunity.com/openid/login'
export const profileApiUrl = 'https://steamcommunity.com/profiles'

// The realm/return URL Steam redirects back to after a successful login.
// `realm` must be a prefix of `returnUrl`. We point at the Steam store so the
// page loads normally inside the embedded webview and we can read the
// `openid.claimed_id` parameter from the resulting URL.
export const steamRealm = 'https://store.steampowered.com'
export const steamReturnUrl =
  'https://store.steampowered.com/?heroic_steam_login=1'
