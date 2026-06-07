export interface SteamCredentials {
  steamId: string
}

/**
 * A single Steam account parsed from the local `config/loginusers.vdf`. Used to
 * let the user pick which of the accounts known to the local Steam client
 * should have their owned library imported into Heroic.
 */
export interface SteamLoginUser {
  id: string
  PersonaName: string
  AccountName: string
  RememberPassword: string
  WantsOfflineMode: string
  AllowAutoLogin: string
  MostRecent: string
  Timestamp: string
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
