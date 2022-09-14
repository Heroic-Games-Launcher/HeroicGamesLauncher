import { VersionInfo } from 'heroic-wine-downloader'

export interface WineVersionInfo extends VersionInfo {
  isInstalled: boolean
  hasUpdate: boolean
  installDir: string
}
