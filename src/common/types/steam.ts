export interface SteamCredentials {
  steamId: string
}

/**
 * Credentials collected by Heroic's Steam login form and handed to
 * `aurelia login`. `guard` is an optional Steam Guard code.
 */
export interface SteamLoginData {
  username: string
  password: string
  guard?: string
}

/**
 * A Steam account the user is signed into via Aurelia. Kept as an array
 * elsewhere to match Heroic's multi-account shape, though Aurelia is
 * single-session.
 */
export interface SteamAccount {
  steamId: string
  username: string
}

/**
 * A single entry parsed from Steam's binary `appcache/appinfo.vdf`. `data`
 * holds the nested key-value tree (typically `data.appinfo.common.{name,type}`)
 * and is left untyped since its shape varies by app and Steam version.
 */
export interface SteamAppInfo {
  appid: number
  infoState: number
  updateTime: number
  token: bigint
  changeNumber: number
  data: unknown
}

/**
 * A DLC for a Steam game, with whether the user owns it and whether its files
 * are currently installed. License-only DLC (no downloadable depot) is reported
 * as installed once owned, since there is nothing separate to download.
 */
export interface SteamDLCInfo {
  appId: string
  title: string
  owned: boolean
  installed: boolean
}
