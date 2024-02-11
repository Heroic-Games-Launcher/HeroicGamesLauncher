import { LaunchOption } from 'common/types'

interface GameManifest {
  download_size: number
  disk_size: number
}

interface DLCInfo {
  app_name: string
  title: string
}

interface GameInstallInfo {
  id: string
  version: string
  path: string
  app_name: string
  cloud_save_folder?: string
  cloud_save_folder_mac?: string
  cloud_saves_supported: boolean
  external_activation: string
  is_dlc: boolean
  launch_options: Array<LaunchOption>
  owned_dlc: Array<DLCInfo>
  platform_versions: Record<CarnivalInstallPlatform, string>
  title: string
}

export interface CarnivalInstallMetadataInfo {
  version: string
  install_path: string
  os: string
}

export interface CarnivalInstallInfo {
  manifest: GameManifest
  game: GameInstallInfo
}

// Amazon Games only supports Windows games
export type CarnivalInstallPlatform = 'Windows'

export interface CarnivalGameInfo {
  id: string
  namespace: string
  slugged_name: string
  name: string
  id_key_name: string
  version: CarnivalGameVersion
}

interface CarnivalGameVersion {
  status: number
  enabled: number
  version: string
  os: string
  date: string
  text: string
}

interface CarnivalGameProductDetails {
  iconUrl: string
  details: {
    backgroundUrl1: string
    backgroundUrl2: string
    developer: string
    esrbRatins: string
    gameModes: string[]
    genres: string[]
    keywords: string[]
    legacyProductIds: string[]
    logoUrl: string
    otherDevelopers: string[]
    pegiRating: string
    pgCrownImageUrl: string
    publisher: string
    releaseDate: string
    screenshots: string[]
    shortDescription: string
    trailerImageUrl: string
    uskRating: string
    videos: string[]
    websites: {
      official: string | null
      steam: string | null
      support: string | null
      gog: string | null
    }
  }
}

interface FuelPostInstall {
  Command: string
  Args: string[]
  ValidReturns?: number[]
  AlwaysRun?: boolean
  HideWindow?: boolean
}

export interface FuelSchema {
  SchemaVersion: string
  PostInstall: FuelPostInstall[]
  Main: {
    Command: string
    Args: string[]
  }
}

export interface CarnivalUserData {
  status: string
  user_id: string
  user_found: boolean
  username: string
  email: string
}

export interface CarnivalUserDataFile {
  user_info: CarnivalUserData
}

export interface CarnivalLoginData {
  url: string
  code_verifier: string
  serial: string
  client_id: string
}

export interface CarnivalCookieData {
  raw_cookie: string
  path: [string, boolean]
  domain: {
    Suffix: string
  }
  expires: {
    AtUtc: string
  }
}

export interface CarnivalGameDownloadInfo {
  download_size: number
}
