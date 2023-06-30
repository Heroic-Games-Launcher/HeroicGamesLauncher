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
  platform_versions: Record<NileInstallPlatform, string>
  title: string
}

export interface NileInstallMetadataInfo {
  id: string
  version: string
  path: string
}

export interface NileInstallInfo {
  manifest: GameManifest
  game: GameInstallInfo
}

// Amazon Games only supports Windows games
export type NileInstallPlatform = 'Windows'

export interface NileGameInfo {
  id: string
  product: NileGameProduct
}

export interface NileGameProduct {
  id: string
  title: string
  productDetail: NileGameProductDetails
}

export interface NileGameProductDetails {
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
