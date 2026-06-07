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

// Base URL for Steam's public CDN game art. Appending `/<appId>/<file>` yields
// the various artwork images (header, capsule, hero, logo) for a given game.
export const steamCdnImageBase =
  'https://cdn.cloudflare.steamstatic.com/steam/apps'

// Store page for a given Steam app id.
export const steamStoreAppUrl = 'https://store.steampowered.com/app'

// Public Steam storefront API returning rich metadata (description,
// requirements, release date, genres, ...) for a given app id.
export const steamAppDetailsApiUrl =
  'https://store.steampowered.com/api/appdetails'

// Steam client protocol URL used to launch an installed game. Appending the
// app id (`steam://rungameid/<appId>`) tells the running Steam client to start
// the game, letting Steam handle compatibility (Proton), DRM and cloud saves.
export const steamRunGameUrl = 'steam://rungameid'

// Offset to convert a 64-bit SteamID into the 32-bit account id used as the
// `userdata/<accountId>` folder name on disk.
export const steamId64Offset = BigInt('76561197960265728')

// App ids that show up as `appmanifest_*.acf` files but are not actual games
// (Steam runtimes, redistributables, Proton, server tools, etc.). These are
// filtered out when scanning the local library.
export const ignoredSteamAppIds = [
  '228980', // Steamworks Common Redistributables
  '1070560', // Steam Linux Runtime
  '1391110', // Steam Linux Runtime 2.0 (soldier)
  '1628350', // Steam Linux Runtime 3.0 (sniper)
  '1493710', // Proton Experimental
  '2348590' // Proton 8.0
]

// Games whose name starts with any of these prefixes are treated as Steam
// tooling rather than user games and are skipped during the local scan.
export const ignoredSteamAppNamePrefixes = [
  'Steam Linux Runtime',
  'Proton',
  'Steamworks Common Redistributables'
]
