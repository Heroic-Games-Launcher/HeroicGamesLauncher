import { InstallPlatform, GameInfo, InstalledInfo } from 'common/types'

export interface RestPluginManifest {
  id: string
  name: string
  version: string
  baseUrl: string
  endpoints: {
    library: string // e.g., "/library"
    game: string // e.g., "/game/:id"
    downloads: string // e.g., "/game/:id/downloads"
    login?: string // e.g., "/login"
    logout?: string // e.g., "/logout"
    user?: string // e.g., "/user"
  }
  auth?: {
    type: 'none' | 'bearer' | 'basic' | 'oauth'
    tokenHeader?: string
  }
}

export interface RestGameInfo {
  id: string
  title: string
  art_cover: string
  art_square: string
  art_logo?: string
  art_background?: string
  developer?: string
  description?: string
  platform: InstallPlatform
  version?: string
  installable: boolean
  is_installed: boolean
  canRunOffline: boolean
  store_url?: string
  releaseDate?: string
  genres?: string[]
}

export interface RestLibraryResponse {
  games: RestGameInfo[]
}

export interface RestGameDetailsResponse extends RestGameInfo {
  install: {
    platform: InstallPlatform
    install_path?: string
    executable?: string
    size?: number
  }
  extra?: {
    about?: { description: string; shortDescription: string }
    reqs?: Array<{ name: string; minimum?: string; recommended?: string }>
    changelog?: string
  }
  dlcList?: Array<{ id: string; title: string }>
}

export interface RestDownloadInfo {
  url: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: Record<string, unknown>
  size: number
  checksum?: {
    type: 'md5' | 'sha256'
    value: string
  }
  steps?: Array<{
    type: 'download' | 'extract' | 'execute' | 'copy'
    url?: string
    command?: string
    args?: string[]
    source?: string
    destination?: string
    optional?: boolean // If true, failure of this step is non-fatal
  }>
}

export interface RestUserInfo {
  username?: string
  email?: string
  avatar?: string
}

