import { LaunchOption } from 'common/types'

export type ZoomInstallPlatform = 'windows' | 'linux'

export interface ZoomCredentials {
  access_token: string
}

export interface ZoomGameInfo {
  id: number
  slug: string
  name: string
  poster_url: string
  operating_systems: string[]
  developer?: string
  publisher?: string
  rating?: number
}

export interface ZoomInstalledInfo {
  manifest?: {
    disk_size: number
    download_size: number
    app_name: string
    languages: string[]
    versionEtag: string
    dependencies: string[]
    perLangSize: {
      [key: string]: {
        download_size: number
        disk_size: number
      }
    }
  }
  appName: string
  install_path: string
  executable: string
  install_size: string
  is_dlc: boolean
  version: string
  platform: ZoomInstallPlatform
  buildId?: string
  language?: string
  installedDLCs?: string[]
  installedWithDLCs?: boolean
  pinnedVersion?: boolean
}

export interface ZoomDownloadFile {
  id: string
  name: string
  size: string
  url?: string // This will be fetched later
  filename: string
  total_size: number
}

export interface ZoomLibraryResponse {
  current_page: number
  total_pages: number
  games: ZoomGameInfo[]
}

export interface ZoomFilesResponse {
  manual: ZoomDownloadFile[]
  misc: ZoomDownloadFile[]
  soundtrack: ZoomDownloadFile[]
  windows?: ZoomDownloadFile[]
  linux?: ZoomDownloadFile[]
}

interface DLCInfo {
  app_name: string
  title: string
}

interface GameInstallInfo {
  app_name: string
  launch_options: Array<LaunchOption>
  owned_dlc: Array<DLCInfo>
  title: string
  version: string
  branches: Array<string | null>
  buildId: string
}

interface GameManifest {
  app_name: string
  disk_size: number
  download_size: number
  languages: string[]
  versionEtag: string
  dependencies: string[]
  perLangSize: {
    [key: string]: {
      download_size: number
      disk_size: number
    }
  }
}
export interface ZoomInstallInfo {
  game: GameInstallInfo
  manifest: GameManifest
}
