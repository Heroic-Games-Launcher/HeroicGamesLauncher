import { LaunchOption } from 'common/types'

export interface SteamLoginData {
  username: string
  password: string
  guard?: string
}

export interface SteamAccount {
  steamId: string
  username: string
}

export interface SteamDLCInfo {
  appId: string
  title: string
  owned: boolean
  installed: boolean
  disabled: boolean
  imageUrl: string
  imageFallbackUrl: string
  storeUrl: string
}

export interface SteamPendingDlcChange {
  appId: string
  enable: boolean
}

export interface SteamInstallLibrary {
  path: string
  free_bytes: number | null
}

interface SteamInstallManifest {
  download_size: number
  disk_size: number
}

interface SteamInstallDlcInfo {
  app_name: string
  title: string
}

interface SteamGameInstallInfo {
  id: string
  version: string
  path: string
  app_name: string
  cloud_saves_supported: boolean
  external_activation: string
  is_dlc: boolean
  launch_options: Array<LaunchOption>
  owned_dlc: Array<SteamInstallDlcInfo>
  platform_versions: Record<string, string>
  title: string
}

export interface SteamInstallInfo {
  manifest: SteamInstallManifest
  game: SteamGameInstallInfo
}
